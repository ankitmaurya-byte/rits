import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCurrentUser } from "./authHelpers";

function createShareToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export const getResources = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("resources")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(200);
  },
});

export const getPrivateResources = query({
  args: {
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("resources")
      .withIndex("by_user_private", (q) =>
        q.eq("createdBy", args.createdBy).eq("scope", "private")
      )
      .order("desc")
      .take(200);
  },
});

export const createResource = mutation({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    url: v.string(),
    description: v.string(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("resources", {
      ...args,
      url: args.url.trim(),
      description: args.description.trim(),
      createdAt: Date.now(),
    });
  },
});

export const deleteResource = mutation({
  args: { id: v.id("resources") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

export const createFolderShare = mutation({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const shareToken = createShareToken();
    const createdAt = Date.now();

    await ctx.db.insert("resourceFolderShares", {
      scope: args.scope,
      workspaceId: args.scope === "workspace" ? args.workspaceId : undefined,
      title: args.title.trim() || "Shared resources",
      shareToken,
      payload: args.payload,
      createdBy: user._id,
      createdAt,
    });

    return shareToken;
  },
});

export const getPublicFolderShare = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("resourceFolderShares")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .unique();

    if (!share) {
      throw new Error("Shared folder not found");
    }

    return share;
  },
});
