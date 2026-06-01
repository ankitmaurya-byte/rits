import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v, ConvexError } from "convex/values";

async function getUserByClerkId(ctx: MutationCtx, clerkId: string): Promise<Doc<"users">> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .first();

  if (!user) {
    throw new ConvexError("User not found");
  }

  return user;
}

async function requireWorkspaceMember(ctx: MutationCtx, workspaceId: Id<"workspaces">, userId: Id<"users">) {
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
    .first();

  if (!membership) {
    throw new ConvexError("Workspace access required");
  }

  return membership;
}

export const createTodo = mutation({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    description: v.optional(v.string()),
    customFields: v.optional(
      v.array(
        v.object({
          key: v.string(),
          value: v.string(),
        })
      )
    ),
    priority: v.string(),
    status: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    groupId: v.optional(v.union(v.id("todoGroups"), v.null())),
    sourceUrl: v.optional(v.string()),
    sourceDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("todos", {
      scope: args.scope,
      workspaceId: args.workspaceId,
      title: args.title,
      description: args.description,
      customFields: args.customFields,
      sourceUrl: args.sourceUrl,
      sourceDescription: args.sourceDescription,
      priority: args.priority,
      status: args.status || "todo",
      completed: args.status === "completed",
      createdBy: args.createdBy,
      groupId: args.groupId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get todos for a workspace
export const getTodos = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todos")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .order("desc")
      .take(200);
  },
});

// Get private todos for a user
export const getPrivateTodos = query({
  args: {
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todos")
      .withIndex("by_user_private", (q) =>
        q.eq("createdBy", args.createdBy).eq("scope", "private")
      )
      .order("desc")
      .take(200);
  },
});

export const toggleTodo = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) throw new ConvexError("Todo not found");
    const newCompleted = !todo.completed;
    return await ctx.db.patch(args.id, {
      completed: newCompleted,
      status: newCompleted ? "completed" : "todo",
    });
  },
});

export const updateTodo = mutation({
  args: {
    id: v.id("todos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    customFields: v.optional(
      v.array(
        v.object({
          key: v.string(),
          value: v.string(),
        })
      )
    ),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    groupId: v.optional(v.union(v.id("todoGroups"), v.null())),
    assignedTo: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const existingTodo = await ctx.db.get(id);
    if (!existingTodo) throw new ConvexError("Todo not found");

    if (fields.status) {
      Object.assign(fields, { completed: fields.status === "completed" });
    }

    if (
      fields.assignedTo !== undefined &&
      fields.assignedTo !== null &&
      fields.assignedTo !== existingTodo.assignedTo
    ) {
      await ctx.db.insert("notifications", {
        userId: fields.assignedTo,
        title: "New Task Assigned",
        message: `You have been assigned to task: "${fields.title ?? existingTodo.title}"`,
        type: "task_assigned",
        isRead: false,
        link: `/todos`,
        createdAt: Date.now(),
      });
    }

    const patchedFields: any = { ...fields, updatedAt: Date.now() };
    if (patchedFields.assignedTo === null) {
      patchedFields.assignedTo = undefined;
    }

    return await ctx.db.patch(id, patchedFields);
  },
});

export const deleteTodo = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

export const moveTodo = mutation({
  args: {
    id: v.id("todos"),
    clerkId: v.string(),
    targetScope: v.union(v.literal("private"), v.literal("workspace")),
    targetWorkspaceId: v.optional(v.id("workspaces")),
    targetStatus: v.optional(v.string()),
    targetPriority: v.optional(v.string()),
    targetGroupId: v.optional(v.union(v.id("todoGroups"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    const todo = await ctx.db.get(args.id);

    if (!todo) throw new ConvexError("Todo not found");

    if (todo.scope === "private") {
      if (todo.createdBy !== user._id) {
        throw new ConvexError("Only the task owner can move this private task");
      }
    } else if (todo.workspaceId) {
      await requireWorkspaceMember(ctx, todo.workspaceId, user._id);
    }

    if (args.targetScope === "private") {
      let targetGroupId: Id<"todoGroups"> | null | undefined = null;
      if (args.targetGroupId) {
        const group = await ctx.db.get(args.targetGroupId);
        if (!group || group.createdBy !== user._id || group.workspaceId) {
          throw new ConvexError("Invalid private group");
        }
        targetGroupId = group._id;
      }

      await ctx.db.patch(args.id, {
        scope: "private",
        workspaceId: undefined,
        groupId: targetGroupId,
        createdBy: todo.createdBy ?? user._id,
        status: args.targetStatus ?? todo.status,
        completed: (args.targetStatus ?? todo.status) === "completed",
        priority: args.targetPriority ?? todo.priority,
        updatedAt: Date.now(),
      });
      return args.id;
    }

    if (!args.targetWorkspaceId) {
      throw new ConvexError("Target workspace is required");
    }

    await requireWorkspaceMember(ctx, args.targetWorkspaceId, user._id);

    let targetGroupId: Id<"todoGroups"> | null | undefined = null;
    if (args.targetGroupId) {
      const group = await ctx.db.get(args.targetGroupId);
      if (!group || group.workspaceId !== args.targetWorkspaceId) {
        throw new ConvexError("Invalid workspace group");
      }
      targetGroupId = group._id;
    }

    await ctx.db.patch(args.id, {
      scope: "workspace",
      workspaceId: args.targetWorkspaceId,
      groupId: targetGroupId,
      status: args.targetStatus ?? todo.status,
      completed: (args.targetStatus ?? todo.status) === "completed",
      priority: args.targetPriority ?? todo.priority,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
