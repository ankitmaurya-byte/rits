import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

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
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    if (fields.status) {
      Object.assign(fields, { completed: fields.status === "completed" });
    }
    return await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const deleteTodo = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});
