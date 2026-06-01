import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const getBoards = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    scope: v.union(v.literal("private"), v.literal("workspace")),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.scope === "private") {
      if (!args.createdBy) throw new ConvexError("User required for private scope");
      return await ctx.db
        .query("kanbanBoards")
        .withIndex("by_user_private", (q) => q.eq("createdBy", args.createdBy!).eq("scope", "private"))
        .order("desc")
        .collect();
    } else {
      if (!args.workspaceId) throw new ConvexError("Workspace required for workspace scope");
      return await ctx.db
        .query("kanbanBoards")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .filter(q => q.eq(q.field("scope"), "workspace"))
        .order("desc")
        .collect();
    }
  },
});

export const createBoard = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    scope: v.union(v.literal("private"), v.literal("workspace")),
    createdBy: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("kanbanBoards", {
      workspaceId: args.workspaceId,
      scope: args.scope,
      createdBy: args.createdBy,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});

export const updateBoard = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.boardId, {
      name: args.name,
    });
  },
});

export const deleteBoard = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .filter(q => q.eq(q.field("boardId"), args.boardId))
      .collect();
      
    for (const todo of todos) {
      await ctx.db.patch(todo._id, { boardId: undefined });
    }

    const groups = await ctx.db
      .query("todoGroups")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
      
    for (const group of groups) {
      await ctx.db.delete(group._id);
    }

    return await ctx.db.delete(args.boardId);
  },
});
