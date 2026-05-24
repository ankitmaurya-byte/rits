import { ConvexError, v } from "convex/values";

import { Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { requireCurrentUser } from "./authHelpers";

type DbCtx = QueryCtx | MutationCtx;

const nodeValidator = v.object({
  id: v.string(),
  label: v.string(),
  description: v.string(),
  topic: v.string(),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  tone: v.union(v.literal("core"), v.literal("skill"), v.literal("optional")),
});

const edgeValidator = v.object({
  id: v.string(),
  from: v.string(),
  to: v.string(),
  dashed: v.optional(v.boolean()),
  sourceHandle: v.optional(v.string()),
  targetHandle: v.optional(v.string()),
});

function sanitizeTopics(topics: string[]) {
  const next = Array.from(new Set(topics.map((topic) => topic.trim()).filter(Boolean)));
  return next.length > 0 ? next : ["General"];
}

function createShareToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function requireRoadmapAccess(ctx: DbCtx, roadmapId: Id<"roadmaps">) {
  const { user } = await requireCurrentUser(ctx);
  const roadmap = await ctx.db.get(roadmapId);

  if (!roadmap) {
    throw new ConvexError("Roadmap not found");
  }

  if (roadmap.createdBy !== user._id) {
    throw new ConvexError("You do not have access to this roadmap");
  }

  return { user, roadmap };
}

export const listRoadmaps = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);

    return await ctx.db
      .query("roadmaps")
      .withIndex("by_user_private", (q) => q.eq("createdBy", user._id).eq("scope", "private"))
      .order("desc")
      .take(50);
  },
});

export const getRoadmap = query({
  args: { roadmapId: v.id("roadmaps") },
  handler: async (ctx, args) => {
    const { roadmap } = await requireRoadmapAccess(ctx, args.roadmapId);
    return roadmap;
  },
});

export const createRoadmap = mutation({
  args: {
    title: v.string(),
    topic: v.string(),
    topics: v.array(v.string()),
    nodes: v.array(nodeValidator),
    edges: v.array(edgeValidator),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    const now = Date.now();
    return await ctx.db.insert("roadmaps", {
      scope: "private",
      title: args.title.trim() || "Untitled roadmap",
      topic: args.topic.trim() || "General",
      topics: sanitizeTopics(args.topics),
      nodes: args.nodes,
      edges: args.edges,
      published: false,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateRoadmap = mutation({
  args: {
    roadmapId: v.id("roadmaps"),
    title: v.string(),
    topic: v.string(),
    topics: v.array(v.string()),
    nodes: v.array(nodeValidator),
    edges: v.array(edgeValidator),
  },
  handler: async (ctx, args) => {
    const { roadmap } = await requireRoadmapAccess(ctx, args.roadmapId);
    await ctx.db.patch(roadmap._id, {
      title: args.title.trim() || roadmap.title,
      topic: args.topic.trim() || roadmap.topic,
      topics: sanitizeTopics(args.topics),
      nodes: args.nodes,
      edges: args.edges,
      updatedAt: Date.now(),
    });
  },
});

export const addTopic = mutation({
  args: {
    roadmapId: v.id("roadmaps"),
    topic: v.string(),
  },
  handler: async (ctx, args) => {
    const { roadmap } = await requireRoadmapAccess(ctx, args.roadmapId);
    const topic = args.topic.trim();
    if (!topic) {
      throw new ConvexError("Topic is required");
    }
    const topics = sanitizeTopics([...roadmap.topics, topic]);
    await ctx.db.patch(roadmap._id, { topics, updatedAt: Date.now() });
  },
});

export const removeTopic = mutation({
  args: {
    roadmapId: v.id("roadmaps"),
    topic: v.string(),
  },
  handler: async (ctx, args) => {
    const { roadmap } = await requireRoadmapAccess(ctx, args.roadmapId);
    const topic = args.topic.trim();
    const nextTopics = roadmap.topics.filter((item) => item !== topic);
    const topics = sanitizeTopics(nextTopics);
    const fallbackTopic = topics[0] ?? "General";
    const nodes = roadmap.nodes.map((node) =>
      node.topic === topic ? { ...node, topic: fallbackTopic } : node
    );
    await ctx.db.patch(roadmap._id, { topics, nodes, updatedAt: Date.now() });
  },
});

export const deleteRoadmap = mutation({
  args: { roadmapId: v.id("roadmaps") },
  handler: async (ctx, args) => {
    const { roadmap } = await requireRoadmapAccess(ctx, args.roadmapId);
    await ctx.db.delete(roadmap._id);
  },
});

export const createShareLink = mutation({
  args: { roadmapId: v.id("roadmaps") },
  handler: async (ctx, args) => {
    const { roadmap } = await requireRoadmapAccess(ctx, args.roadmapId);
    const shareToken = roadmap.shareToken ?? createShareToken();

    if (!roadmap.shareToken) {
      await ctx.db.patch(roadmap._id, { shareToken, updatedAt: Date.now() });
    }

    return shareToken;
  },
});

export const setPublished = mutation({
  args: {
    roadmapId: v.id("roadmaps"),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { roadmap } = await requireRoadmapAccess(ctx, args.roadmapId);
    const shareToken = roadmap.shareToken ?? createShareToken();
    const now = Date.now();

    await ctx.db.patch(roadmap._id, {
      published: args.published,
      publishedAt: args.published ? now : roadmap.publishedAt,
      shareToken,
      updatedAt: now,
    });

    return shareToken;
  },
});

export const listPublishedRoadmaps = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roadmaps")
      .withIndex("by_published_and_updated_at", (q) => q.eq("published", true))
      .order("desc")
      .take(Math.max(1, Math.min(args.limit ?? 24, 100)));
  },
});

export const getPublicRoadmap = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const roadmap = await ctx.db
      .query("roadmaps")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .unique();

    if (!roadmap) {
      throw new ConvexError("Roadmap not found");
    }

    return roadmap;
  },
});
