import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

import { requireIdentity } from "./authHelpers";

// Called from the client after Clerk sign-in to ensure user record exists
export const ensureUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        image: args.image,
      });
      return { userId: existing._id };
    }

    // Create new user (no auto-workspace; users create/join workspaces explicitly)
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      image: args.image,
    });

    return { userId };
  },
});

// Get user by Clerk ID
export const getUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const ensureCurrentUserFromIdentity = internalMutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const email = identity.email ?? "";
    const name = identity.name ?? email ?? "User";
    const image = identity.pictureUrl;

    const userByToken = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (userByToken) {
      await ctx.db.patch(userByToken._id, {
        clerkId: identity.subject,
        name,
        email,
        image,
      });
      return userByToken._id;
    }

    const userByClerkId = identity.subject
      ? await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
          .first()
      : null;

    if (userByClerkId) {
      await ctx.db.patch(userByClerkId._id, {
        tokenIdentifier: identity.tokenIdentifier,
        name,
        email,
        image,
      });
      return userByClerkId._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      name,
      email,
      image,
    });
  },
});
