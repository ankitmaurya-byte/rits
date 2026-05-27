import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// Get notes for a workspace
export const getNotes = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .order("desc")
      .take(100);
  },
});

// Get private notes for a user
export const getPrivateNotes = query({
  args: {
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_user_private", (q) =>
        q.eq("createdBy", args.createdBy).eq("scope", "private")
      )
      .order("desc")
      .take(100);
  },
});

export const createNote = mutation({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    content: v.string(),
    kind: v.optional(v.union(v.literal("folder"), v.literal("file"))),
    fileType: v.optional(v.union(v.literal("text"), v.literal("database"))),
    parentId: v.optional(v.id("notes")),
    sortOrder: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notes", {
      ...args,
      sortOrder: args.sortOrder ?? Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("folder"), v.literal("file"))),
    fileType: v.optional(v.union(v.literal("text"), v.literal("database"))),
    parentId: v.optional(v.union(v.id("notes"), v.null())),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, parentId, ...fields } = args;
    const patchObj: {
      title?: string;
      content?: string;
      kind?: "folder" | "file";
      fileType?: "text" | "database";
      sortOrder?: number;
      parentId?: Id<"notes"> | undefined;
      updatedAt: number;
    } = {
      ...fields,
      updatedAt: Date.now(),
    };
    if (parentId !== undefined) patchObj.parentId = parentId === null ? undefined : parentId;
    return await ctx.db.patch(id, patchObj);
  },
});

export const deleteNote = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const queue = [args.id];
    while (queue.length > 0) {
      const currentId = queue.pop()!;
      // Find children
      const children = await ctx.db
        .query("notes")
        .withIndex("by_parent", (q) => q.eq("parentId", currentId))
        .collect();
      
      for (const child of children) {
        queue.push(child._id);
      }
      
      // Delete current
      await ctx.db.delete(currentId);
    }
  },
});
