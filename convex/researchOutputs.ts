import { ConvexError, v } from "convex/values";

import { query, mutation } from "./_generated/server";
import { requireCurrentUser } from "./authHelpers";

function createShareToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export const listReports = query({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    if (args.scope === "workspace") {
      if (!args.workspaceId) {
        return [];
      }

      return await ctx.db
        .query("aiReports")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .order("desc")
        .take(50);
    }

    return await ctx.db
      .query("aiReports")
      .withIndex("by_user_private", (q) => q.eq("createdBy", user._id).eq("scope", "private"))
      .order("desc")
      .take(50);
  },
});

export const createReport = mutation({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    prompt: v.string(),
    context: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const now = Date.now();

    return await ctx.db.insert("aiReports", {
      scope: args.scope,
      workspaceId: args.scope === "workspace" ? args.workspaceId : undefined,
      title: args.title.trim(),
      prompt: args.prompt.trim(),
      context: args.context.trim(),
      content: args.content.trim(),
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listMvpPages = query({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    if (args.scope === "workspace") {
      if (!args.workspaceId) {
        return [];
      }

      return await ctx.db
        .query("mvpPages")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .order("desc")
        .take(50);
    }

    return await ctx.db
      .query("mvpPages")
      .withIndex("by_user_private", (q) => q.eq("createdBy", user._id).eq("scope", "private"))
      .order("desc")
      .take(50);
  },
});

export const createMvpPage = mutation({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    prompt: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const shareToken = createShareToken();
    const now = Date.now();

    return await ctx.db.insert("mvpPages", {
      scope: args.scope,
      workspaceId: args.scope === "workspace" ? args.workspaceId : undefined,
      title: args.title.trim(),
      prompt: args.prompt.trim(),
      payload: args.payload,
      shareToken,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getPublicMvpPage = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("mvpPages")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .unique();

    if (!page) {
      throw new ConvexError("Page not found");
    }

    return page;
  },
});
