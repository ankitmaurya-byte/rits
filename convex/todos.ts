import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createTodo = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    priority: v.string(),
    status: v.optional(v.string()), // 'todo', 'in-progress', 'completed'
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("todos", {
      workspaceId: args.workspaceId,
      title: args.title,
      priority: args.priority,
      status: args.status || "todo",
      completed: args.status === "completed", // Legacy compat
      createdAt: Date.now(),
    });
  },
});

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
      .collect();
  },
});

export const toggleTodo = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) throw new Error("Todo not found");
    const newCompleted = !todo.completed;
    return await ctx.db.patch(args.id, { 
      completed: newCompleted,
      status: newCompleted ? "completed" : "todo" 
    });
  },
});

export const updateTodo = mutation({
  args: {
    id: v.id("todos"),
    title: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    if (fields.status) {
      (fields as any).completed = fields.status === "completed";
    }
    return await ctx.db.patch(id, fields);
  },
});

export const deleteTodo = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});