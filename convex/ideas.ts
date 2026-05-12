import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createIdea = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ideas", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getIdeas = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ideas")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .order("desc")
      .collect();
  },
});

export const updateIdea = mutation({
  args: {
    id: v.id("ideas"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    return await ctx.db.patch(id, fields);
  },
});

export const deleteIdea = mutation({
  args: { id: v.id("ideas") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});