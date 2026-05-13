import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const getGroups = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todoGroups")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("asc")
      .collect();
  },
});

export const createGroup = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new ConvexError("User not found");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new ConvexError("Workspace not found");
    
    // Check if owner
    if (workspace.ownerId !== user._id) {
      throw new ConvexError("Only the workspace owner can create a new group");
    }

    return await ctx.db.insert("todoGroups", {
      workspaceId: args.workspaceId,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});
