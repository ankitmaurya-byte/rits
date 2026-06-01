import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { findCurrentUser, requireCurrentUser, requireIdentity } from "./authHelpers";

function normalizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

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

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await findCurrentUser(ctx);
    return user;
  },
});

export const updateCurrentUserProfile = mutation({
  args: {
    name: v.string(),
    status: v.optional(v.string()),
    bio: v.optional(v.string()),
    description: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const name = args.name.trim();

    if (!name) {
      throw new ConvexError("Name is required");
    }

    await ctx.db.patch(user._id, {
      name,
      status: normalizeOptionalString(args.status),
      bio: normalizeOptionalString(args.bio),
      description: normalizeOptionalString(args.description),
      currentCompany: normalizeOptionalString(args.currentCompany),
    });

    return await ctx.db.get(user._id);
  },
});

export const updateHierarchyEditorSettings = mutation({
  args: {
    themeName: v.union(
      v.literal("Solarized Dark"),
      v.literal("Solarized Light"),
      v.literal("Nord"),
      v.literal("Dracula"),
      v.literal("Monokai"),
      v.literal("Clean Light")
    ),
    textSize: v.union(v.literal(11), v.literal(12), v.literal(13), v.literal(15)),
    fontFamily: v.union(
      v.literal("monospace"),
      v.literal("sans-serif"),
      v.literal("Georgia, serif")
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    await ctx.db.patch(user._id, {
      hierarchyEditorSettings: args,
    });

    return args;
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
