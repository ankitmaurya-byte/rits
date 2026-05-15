import { ConvexError, v } from "convex/values";

import { Doc, Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { requireCurrentUser } from "./authHelpers";

type DbCtx = QueryCtx | MutationCtx;

function previewText(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 100 ? `${compact.slice(0, 97)}...` : compact;
}

function pairKey(a: Id<"users">, b: Id<"users">) {
  return [a, b].sort().join(":");
}

async function requireFriendship(ctx: DbCtx, userId: Id<"users">, otherUserId: Id<"users">) {
  const friendship = await ctx.db
    .query("friendships")
    .withIndex("by_pair_key", (q) => q.eq("pairKey", pairKey(userId, otherUserId)))
    .unique();

  if (!friendship) {
    throw new ConvexError("Private chats require friendship first");
  }

  return friendship;
}

async function requireWorkspaceMembership(ctx: DbCtx, workspaceId: Id<"workspaces">, userId: Id<"users">) {
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
    .first();

  if (!membership) {
    throw new ConvexError("Workspace access required");
  }

  return membership;
}

async function requireRoomAccess(ctx: DbCtx, roomId: Id<"socialChatRooms">, userId: Id<"users">) {
  const room = await ctx.db.get(roomId);
  if (!room) {
    throw new ConvexError("Chat room not found");
  }

  if (room.scope === "workspace") {
    if (!room.workspaceId) {
      throw new ConvexError("Workspace room missing workspace");
    }
    await requireWorkspaceMembership(ctx, room.workspaceId, userId);
    return room;
  }

  const participant = await ctx.db
    .query("socialChatParticipants")
    .withIndex("by_room_and_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
    .first();

  if (!participant) {
    throw new ConvexError("You do not have access to this private chat");
  }

  return room;
}

async function getUnreadCount(ctx: QueryCtx, roomId: Id<"socialChatRooms">, userId: Id<"users">) {
  const participant = await ctx.db
    .query("socialChatParticipants")
    .withIndex("by_room_and_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
    .first();

  if (!participant) {
    return 0;
  }

  const messages = await ctx.db
    .query("socialChatMessages")
    .withIndex("by_room_and_created_at", (q) => q.eq("roomId", roomId))
    .order("desc")
    .take(100);

  return messages.filter((message) => message.createdAt > participant.lastReadAt && message.senderId !== userId).length;
}

async function shapePrivateRoom(ctx: QueryCtx, room: Doc<"socialChatRooms">, userId: Id<"users">) {
  const participants = await ctx.db
    .query("socialChatParticipants")
    .withIndex("by_room", (q) => q.eq("roomId", room._id))
    .take(10);
  const otherParticipant = participants.find((participant) => participant.userId !== userId && participant.role !== "ai");
  const otherUser = otherParticipant ? await ctx.db.get(otherParticipant.userId) : null;
  return {
    ...room,
    displayName: otherUser?.name ?? room.title,
    otherUser,
    unreadCount: await getUnreadCount(ctx, room._id, userId),
  };
}

export const listPrivateRooms = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const participations = await ctx.db
      .query("socialChatParticipants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(100);

    const rooms = await Promise.all(
      participations.map(async (participant) => {
        const room = await ctx.db.get(participant.roomId);
        if (!room || room.scope !== "private") {
          return null;
        }

        return await shapePrivateRoom(ctx, room, user._id);
      })
    );

    return rooms
      .filter((room): room is NonNullable<typeof room> => room !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const listWorkspaceRooms = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    await requireWorkspaceMembership(ctx, args.workspaceId, user._id);

    const rooms = await ctx.db
      .query("socialChatRooms")
      .withIndex("by_workspace_and_updated_at", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(100);

    return await Promise.all(
      rooms.map(async (room) => ({
        ...room,
        unreadCount: await getUnreadCount(ctx, room._id, user._id),
      }))
    );
  },
});

export const listRoomMessages = query({
  args: { roomId: v.id("socialChatRooms") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    await requireRoomAccess(ctx, args.roomId, user._id);

    const messages = await ctx.db
      .query("socialChatMessages")
      .withIndex("by_room_and_created_at", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(300);

    const senderIds = Array.from(new Set(messages.map((message) => message.senderId).filter(Boolean) as Id<"users">[]));
    const senderMap = new Map<Id<"users">, Doc<"users"> | null>();
    for (const senderId of senderIds) {
      senderMap.set(senderId, await ctx.db.get(senderId));
    }

    return messages.reverse().map((message) => ({
      ...message,
      sender: message.senderId ? senderMap.get(message.senderId) ?? null : null,
    }));
  },
});

export const createDirectRoom = mutation({
  args: { friendUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    await requireFriendship(ctx, user._id, args.friendUserId);
    const otherUser = await ctx.db.get(args.friendUserId);
    if (!otherUser) {
      throw new ConvexError("Friend not found");
    }

    const key = pairKey(user._id, args.friendUserId);
    const existing = await ctx.db
      .query("socialChatRooms")
      .withIndex("by_pair_key", (q) => q.eq("pairKey", key))
      .unique();
    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    const roomId = await ctx.db.insert("socialChatRooms", {
      scope: "private",
      roomType: "direct",
      title: otherUser.name,
      pairKey: key,
      createdBy: user._id,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("socialChatParticipants", {
      roomId,
      userId: user._id,
      role: "owner",
      lastReadAt: now,
      createdAt: now,
    });
    await ctx.db.insert("socialChatParticipants", {
      roomId,
      userId: args.friendUserId,
      role: "member",
      lastReadAt: 0,
      createdAt: now,
    });

    return roomId;
  },
});

export const createWorkspaceRoom = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    objective: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    await requireWorkspaceMembership(ctx, args.workspaceId, user._id);

    const title = args.title.trim();
    if (!title) {
      throw new ConvexError("Chat title is required");
    }

    const now = Date.now();
    const roomId = await ctx.db.insert("socialChatRooms", {
      scope: "workspace",
      roomType: "workspace",
      workspaceId: args.workspaceId,
      title,
      objective: args.objective?.trim() || undefined,
      createdBy: user._id,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .take(100);
    for (const member of members) {
      await ctx.db.insert("socialChatParticipants", {
        roomId,
        userId: member.userId,
        role: member.userId === user._id ? "owner" : "member",
        lastReadAt: member.userId === user._id ? now : 0,
        createdAt: now,
      });
    }

    return roomId;
  },
});

export const sendMessage = mutation({
  args: {
    roomId: v.id("socialChatRooms"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const room = await requireRoomAccess(ctx, args.roomId, user._id);
    const body = args.body.trim();
    if (!body) {
      throw new ConvexError("Message cannot be empty");
    }

    const now = Date.now();
    await ctx.db.insert("socialChatMessages", {
      roomId: args.roomId,
      senderId: user._id,
      senderKind: "user",
      body,
      messageType: "text",
      createdAt: now,
    });
    await ctx.db.patch(room._id, {
      updatedAt: now,
      lastMessageAt: now,
      lastMessagePreview: previewText(body),
    });
    await ctx.db.patch(
      (await ctx.db.query("socialChatParticipants").withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId).eq("userId", user._id)).unique())!._id,
      { lastReadAt: now }
    );
  },
});

export const sendSharedMessage = mutation({
  args: {
    roomId: v.id("socialChatRooms"),
    shareType: v.union(v.literal("idea"), v.literal("note"), v.literal("resource")),
    shareTitle: v.string(),
    shareDescription: v.string(),
    shareMeta: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const room = await requireRoomAccess(ctx, args.roomId, user._id);
    const now = Date.now();
    await ctx.db.insert("socialChatMessages", {
      roomId: args.roomId,
      senderId: user._id,
      senderKind: "user",
      body: `${args.shareType}: ${args.shareTitle}`,
      messageType: "share",
      shareType: args.shareType,
      shareTitle: args.shareTitle,
      shareDescription: args.shareDescription,
      shareMeta: args.shareMeta,
      createdAt: now,
    });
    await ctx.db.patch(room._id, {
      updatedAt: now,
      lastMessageAt: now,
      lastMessagePreview: previewText(args.shareTitle),
    });
  },
});

export const sendAiAnalysisMessage = mutation({
  args: {
    roomId: v.id("socialChatRooms"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const room = await requireRoomAccess(ctx, args.roomId, user._id);
    const now = Date.now();
    await ctx.db.insert("socialChatMessages", {
      roomId: args.roomId,
      senderKind: "ai",
      body: args.body.trim(),
      messageType: "analysis",
      createdAt: now,
    });
    await ctx.db.patch(room._id, {
      updatedAt: now,
      lastMessageAt: now,
      lastMessagePreview: previewText(args.body),
    });
  },
});

export const markRoomRead = mutation({
  args: { roomId: v.id("socialChatRooms") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    await requireRoomAccess(ctx, args.roomId, user._id);
    const participant = await ctx.db
      .query("socialChatParticipants")
      .withIndex("by_room_and_user", (q) => q.eq("roomId", args.roomId).eq("userId", user._id))
      .unique();
    if (participant) {
      await ctx.db.patch(participant._id, { lastReadAt: Date.now() });
    }
  },
});
