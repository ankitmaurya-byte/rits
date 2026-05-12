import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Called from the client after Clerk sign-in to ensure user + workspace exists
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
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();

    if (existing) {
      // Return the existing user's default workspace
      const workspace = await ctx.db
        .query("workspaces")
        .filter((q) => q.eq(q.field("ownerId"), existing._id))
        .first();
      return { userId: existing._id, workspaceId: workspace?._id };
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      image: args.image,
    });

    // Auto-create a default workspace for them
    const workspaceId = await ctx.db.insert("workspaces", {
      name: "My Workspace",
      ownerId: userId,
    });

    return { userId, workspaceId };
  },
});

// Get user by Clerk ID
export const getUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();
  },
});

// Get user's default workspace
export const getWorkspace = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("ownerId"), user._id))
      .first();
  },
});
