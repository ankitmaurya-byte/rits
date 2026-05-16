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
});

function sanitizeTopics(topics: string[]) {
  const next = Array.from(new Set(topics.map((topic) => topic.trim()).filter(Boolean)));
  return next.length > 0 ? next : ["General"];
}

async function requireWorkspaceMember(ctx: DbCtx, workspaceId: Id<"workspaces">, userId: Id<"users">) {
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
    .first();

  if (!membership) {
    throw new ConvexError("Workspace access required");
  }
}

async function requireRoadmapAccess(ctx: DbCtx, roadmapId: Id<"roadmaps">) {
  const { user } = await requireCurrentUser(ctx);
  const roadmap = await ctx.db.get(roadmapId);

  if (!roadmap) {
    throw new ConvexError("Roadmap not found");
  }

  if (roadmap.scope === "private") {
    if (roadmap.createdBy !== user._id) {
      throw new ConvexError("You do not have access to this roadmap");
    }
  } else if (roadmap.workspaceId) {
    await requireWorkspaceMember(ctx, roadmap.workspaceId, user._id);
  }

  return { user, roadmap };
}

export const listRoadmaps = query({
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
      await requireWorkspaceMember(ctx, args.workspaceId, user._id);
      return await ctx.db
        .query("roadmaps")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .order("desc")
        .take(50);
    }

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
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    topic: v.string(),
    topics: v.array(v.string()),
    nodes: v.array(nodeValidator),
    edges: v.array(edgeValidator),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (args.scope === "workspace") {
      if (!args.workspaceId) {
        throw new ConvexError("Workspace roadmaps require a workspace");
      }
      await requireWorkspaceMember(ctx, args.workspaceId, user._id);
    }

    const now = Date.now();
    return await ctx.db.insert("roadmaps", {
      scope: args.scope,
      workspaceId: args.scope === "workspace" ? args.workspaceId : undefined,
      title: args.title.trim() || "Untitled roadmap",
      topic: args.topic.trim() || "General",
      topics: sanitizeTopics(args.topics),
      nodes: args.nodes,
      edges: args.edges,
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
