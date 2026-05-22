import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

async function getUserByClerkId(ctx: Parameters<typeof mutation>[0] extends never ? never : any, clerkId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
    .first();
  if (!user) throw new ConvexError("User not found");
  return user;
}

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

export const getPrivateGroups = query({
  args: { createdBy: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todoGroups")
      .withIndex("by_user", (q) => q.eq("createdBy", args.createdBy))
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
      statusLabels: {
        todo: "To-do",
        "in-progress": "In progress",
        completed: "Complete",
      },
      createdAt: Date.now(),
    });
  },
});

export const createPrivateGroup = mutation({
  args: {
    name: v.string(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("todoGroups", {
      createdBy: args.createdBy,
      name: args.name,
      statusLabels: {
        todo: "To-do",
        "in-progress": "In progress",
        completed: "Complete",
      },
      createdAt: Date.now(),
    });
  },
});

export const updatePrivateGroup = mutation({
  args: {
    groupId: v.id("todoGroups"),
    createdBy: v.id("users"),
    name: v.optional(v.string()),
    statusLabels: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group || group.createdBy !== args.createdBy || group.workspaceId) {
      throw new ConvexError("Private group not found");
    }
    await ctx.db.patch(args.groupId, {
      name: args.name?.trim() || group.name,
      statusLabels: args.statusLabels ?? group.statusLabels,
    });
  },
});

export const updateWorkspaceGroup = mutation({
  args: {
    groupId: v.id("todoGroups"),
    clerkId: v.string(),
    name: v.optional(v.string()),
    statusLabels: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    const group = await ctx.db.get(args.groupId);
    if (!group || !group.workspaceId) {
      throw new ConvexError("Workspace group not found");
    }
    const workspace = await ctx.db.get(group.workspaceId);
    if (!workspace || workspace.ownerId !== user._id) {
      throw new ConvexError("Only the workspace owner can update this group");
    }
    await ctx.db.patch(args.groupId, {
      name: args.name?.trim() || group.name,
      statusLabels: args.statusLabels ?? group.statusLabels,
    });
  },
});
