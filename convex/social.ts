import { ConvexError, v } from "convex/values";

import { Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { requireCurrentUser } from "./authHelpers";

type DbCtx = QueryCtx | MutationCtx;

function pairKey(a: Id<"users">, b: Id<"users">) {
  return [a, b].sort().join(":");
}

async function listFriendIds(ctx: DbCtx, userId: Id<"users">) {
  const [aSide, bSide] = await Promise.all([
    ctx.db.query("friendships").withIndex("by_user_a", (q) => q.eq("userAId", userId)).take(100),
    ctx.db.query("friendships").withIndex("by_user_b", (q) => q.eq("userBId", userId)).take(100),
  ]);

  return [
    ...aSide.map((item: { userBId: Id<"users"> }) => item.userBId),
    ...bSide.map((item: { userAId: Id<"users"> }) => item.userAId),
  ];
}

export const listFriends = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const friendIds = await listFriendIds(ctx, user._id);
    const friends = await Promise.all(friendIds.map((friendId) => ctx.db.get(friendId)));
    return friends.filter(Boolean);
  },
});

export const listFriendRequests = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user_and_status", (q) => q.eq("toUserId", user._id).eq("status", "pending"))
      .take(50);

    return await Promise.all(
      requests.map(async (request) => ({
        ...request,
        fromUser: await ctx.db.get(request.fromUserId),
      }))
    );
  },
});

export const searchPeople = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const search = args.search?.trim().toLowerCase() ?? "";
    const friendIds = new Set(await listFriendIds(ctx, user._id));
    const pendingIncoming = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user_and_status", (q) => q.eq("toUserId", user._id).eq("status", "pending"))
      .take(50);
    const pendingOutgoing = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user_and_status", (q) => q.eq("fromUserId", user._id).eq("status", "pending"))
      .take(50);
    const pendingPairs = new Set([...pendingIncoming, ...pendingOutgoing].map((request) => request.pairKey));

    const users = await ctx.db.query("users").take(100);
    return users
      .filter((candidate) => candidate._id !== user._id)
      .filter((candidate) => !search || `${candidate.name} ${candidate.email}`.toLowerCase().includes(search))
      .slice(0, 30)
      .map((candidate) => ({
        ...candidate,
        isFriend: friendIds.has(candidate._id),
        hasPendingRequest: pendingPairs.has(pairKey(user._id, candidate._id)),
      }));
  },
});

export const recommendedFriends = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const directFriendIds = new Set(await listFriendIds(ctx, user._id));
    const counts = new Map<Id<"users">, number>();

    for (const friendId of directFriendIds) {
      const secondDegreeIds = await listFriendIds(ctx, friendId);
      for (const candidateId of secondDegreeIds) {
        if (candidateId === user._id || directFriendIds.has(candidateId)) {
          continue;
        }

        counts.set(candidateId, (counts.get(candidateId) ?? 0) + 1);
      }
    }

    const ranked = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const pendingOutgoing = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user_and_status", (q) => q.eq("fromUserId", user._id).eq("status", "pending"))
      .take(50);
    const pendingPairs = new Set(pendingOutgoing.map((request) => request.pairKey));

    const users = await Promise.all(
      ranked.map(async ([candidateId, score]) => {
        const candidate = await ctx.db.get(candidateId);
        return candidate
          ? {
              ...candidate,
              mutualCount: score,
              hasPendingRequest: pendingPairs.has(pairKey(user._id, candidate._id)),
            }
          : null;
      })
    );

    return users.filter(Boolean);
  },
});

export const sendFriendRequest = mutation({
  args: { toUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (args.toUserId === user._id) {
      throw new ConvexError("You cannot friend yourself");
    }

    const key = pairKey(user._id, args.toUserId);
    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_pair_key", (q) => q.eq("pairKey", key))
      .unique();
    if (existingFriendship) {
      throw new ConvexError("You are already friends");
    }

    const existingRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair_key", (q) => q.eq("pairKey", key))
      .unique();

    const now = Date.now();
    if (existingRequest) {
      await ctx.db.patch(existingRequest._id, {
        fromUserId: user._id,
        toUserId: args.toUserId,
        status: "pending",
        updatedAt: now,
      });
      return existingRequest._id;
    }

    return await ctx.db.insert("friendRequests", {
      fromUserId: user._id,
      toUserId: args.toUserId,
      pairKey: key,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const respondToFriendRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.toUserId !== user._id) {
      throw new ConvexError("Friend request not found");
    }

    const now = Date.now();
    if (!args.accept) {
      await ctx.db.patch(request._id, { status: "rejected", updatedAt: now });
      return;
    }

    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_pair_key", (q) => q.eq("pairKey", request.pairKey))
      .unique();

    if (!existingFriendship) {
      await ctx.db.insert("friendships", {
        userAId: request.fromUserId,
        userBId: request.toUserId,
        pairKey: request.pairKey,
        createdAt: now,
      });
    }

    await ctx.db.patch(request._id, { status: "accepted", updatedAt: now });
  },
});
