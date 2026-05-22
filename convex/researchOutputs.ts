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
    summary: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceFilters: v.optional(v.array(v.string())),
    contextOrigin: v.optional(v.string()),
    contextAttachmentName: v.optional(v.string()),
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
      summary: args.summary?.trim(),
      sourceType: args.sourceType?.trim(),
      sourceFilters: args.sourceFilters,
      contextOrigin: args.contextOrigin?.trim(),
      contextAttachmentName: args.contextAttachmentName?.trim(),
      published: false,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const publishReport = mutation({
  args: { reportId: v.id("aiReports"), publish: v.boolean() },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Analysis not found");
    if (report.createdBy !== user._id) throw new ConvexError("Only the author can publish this analysis");
    await ctx.db.patch(args.reportId, {
      published: args.publish,
      shareToken: args.publish ? report.shareToken ?? createShareToken() : report.shareToken,
      updatedAt: Date.now(),
    });
  },
});

export const listPublishedReports = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiReports")
      .withIndex("by_published_and_updated_at", (q) => q.eq("published", true))
      .order("desc")
      .take(Math.max(1, Math.min(args.limit ?? 24, 100)));
  },
});

export const getPublicReport = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("aiReports")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .unique();

    if (!report || !report.published) {
      throw new ConvexError("Analysis not found");
    }

    return report;
  },
});

export const getContextMap = query({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    const ideas = args.scope === "workspace" && args.workspaceId
      ? await ctx.db.query("ideas").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!)).collect()
      : await ctx.db.query("ideas").withIndex("by_user_private", (q) => q.eq("createdBy", user._id).eq("scope", "private")).collect();
    const todos = args.scope === "workspace" && args.workspaceId
      ? await ctx.db.query("todos").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!)).collect()
      : await ctx.db.query("todos").withIndex("by_user_private", (q) => q.eq("createdBy", user._id).eq("scope", "private")).collect();
    const notes = args.scope === "workspace" && args.workspaceId
      ? await ctx.db.query("notes").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!)).collect()
      : await ctx.db.query("notes").withIndex("by_user_private", (q) => q.eq("createdBy", user._id).eq("scope", "private")).collect();
    const resources = args.scope === "workspace" && args.workspaceId
      ? await ctx.db.query("resources").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!)).collect()
      : await ctx.db.query("resources").withIndex("by_user_private", (q) => q.eq("createdBy", user._id).eq("scope", "private")).collect();

    const summary = [
      `Scope: ${args.scope}`,
      `Ideas: ${ideas.length}`,
      `Todos: ${todos.length}`,
      `Notes: ${notes.length}`,
      `Resources: ${resources.length}`,
      "",
      "Top ideas:",
      ...ideas.slice(0, 8).map((idea) => `- ${idea.title}: ${idea.description.slice(0, 180)}`),
      "",
      "Top todos:",
      ...todos.slice(0, 8).map((todo) => `- ${todo.title} [${todo.status ?? (todo.completed ? "completed" : "todo")}]`),
      "",
      "Top notes:",
      ...notes.slice(0, 6).map((note) => `- ${note.title}: ${note.content.slice(0, 180)}`),
      "",
      "Top resources:",
      ...resources.slice(0, 6).map((resource) => `- ${resource.url}`),
    ].join("\n");

    return {
      counts: {
        ideas: ideas.length,
        todos: todos.length,
        notes: notes.length,
        resources: resources.length,
      },
      summary,
    };
  },
});

const TECH_FEED_IMPORTS = [
  {
    id: "tech-feed-1",
    title: "Inference cost visibility beats model novelty",
    sourceType: "tech_feed",
    content: "Teams are prioritizing products that explain model cost, reliability, and fallback behavior over products that only claim better prompting.",
    meta: "Tech Feed",
  },
  {
    id: "tech-feed-2",
    title: "Infra wedge is still the easiest enterprise sell",
    sourceType: "tech_feed",
    content: "Enterprise buyers still convert faster on observability, evals, workflow controls, and governance than on generic assistant positioning.",
    meta: "Tech Feed",
  },
];

export const listAnalysisImportRecords = query({
  args: {
    sourceType: v.union(
      v.literal("yc"),
      v.literal("sharktank"),
      v.literal("github"),
      v.literal("tech_feed"),
      v.literal("startup")
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const search = args.search?.trim().toLowerCase();
    let items: Array<{ id: string; title: string; sourceType: string; content: string; meta: string }> = [];

    if (args.sourceType === "yc") {
      const rows = await ctx.db.query("ycStartupsAdmin").collect();
      items = rows.map((row) => ({
        id: row._id,
        title: row.name,
        sourceType: "yc",
        content: `${row.description ?? ""}\nFounders: ${row.founders ?? "n/a"}\nIndustry: ${row.industry ?? "n/a"}`,
        meta: `YC ${row.batch ?? ""}`.trim(),
      }));
    }

    if (args.sourceType === "sharktank") {
      const rows = await ctx.db.query("sharkTankPitchesAdmin").collect();
      items = rows.map((row) => ({
        id: row._id,
        title: row.companyName ?? row.slug,
        sourceType: "sharktank",
        content: `${row.pitchSummary ?? ""}\nAsk: ${row.askText ?? "n/a"}\nFounders: ${row.founders ?? "n/a"}`,
        meta: `Season ${row.season} Episode ${row.episodeNumber}`,
      }));
    }

    if (args.sourceType === "github") {
      const rows = await ctx.db.query("githubTools").collect();
      items = rows.map((row) => ({
        id: row._id,
        title: row.repoFullName,
        sourceType: "github",
        content: `${row.description ?? ""}\nStars: ${row.stars ?? 0}\nPrimary language: ${row.language ?? "n/a"}`,
        meta: row.sourceType,
      }));
    }

    if (args.sourceType === "startup") {
      const rows = await ctx.db.query("exploreEntries").collect();
      items = rows.map((row) => ({
        id: row._id,
        title: row.name,
        sourceType: "startup",
        content: `${row.description ?? ""}\nCategory: ${row.category ?? "n/a"}\nTags: ${row.tags.join(", ")}`,
        meta: row.datasetKind,
      }));
    }

    if (args.sourceType === "tech_feed") {
      items = TECH_FEED_IMPORTS;
    }

    const filtered = search
      ? items.filter((item) => `${item.title} ${item.content} ${item.meta}`.toLowerCase().includes(search))
      : items;

    return filtered.slice(0, 60);
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
