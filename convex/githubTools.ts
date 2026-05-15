import { v } from "convex/values";

import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { requireCurrentUser, requireIdentity } from "./authHelpers";

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const MAX_FETCH_LIMIT = 8;
const MAX_README_LENGTH = 12000;
const MAX_TEXT_LENGTH = 5000;

const fetchedRepoValidator = v.object({
  fetchMode: v.union(v.literal("trending"), v.literal("stars")),
  searchQuery: v.optional(v.string()),
  repoFullName: v.string(),
  owner: v.string(),
  name: v.string(),
  htmlUrl: v.string(),
  description: v.string(),
  homepageUrl: v.optional(v.string()),
  language: v.optional(v.string()),
  stars: v.number(),
  forks: v.number(),
  openIssues: v.number(),
  topics: v.array(v.string()),
  license: v.optional(v.string()),
  defaultBranch: v.optional(v.string()),
  isArchived: v.boolean(),
  readme: v.optional(v.string()),
});

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as { [K in keyof T as T[K] extends undefined ? never : K]: Exclude<T[K], undefined> };
}

function trimOptional(value: string | null | undefined, maxLength = MAX_TEXT_LENGTH) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function trimRequired(value: string, maxLength = MAX_TEXT_LENGTH) {
  return value.trim().slice(0, maxLength);
}

function sanitizeTopics(topics: string[]) {
  return topics.map((topic) => topic.trim()).filter(Boolean).slice(0, 12);
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "rits-github-tools",
    ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
  };
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { headers: githubHeaders() });

  if (!response.ok) {
    const text = (await response.text()).trim();
    throw new Error(text || `GitHub request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchReadme(repoFullName: string) {
  const response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/readme`, {
    headers: {
      ...githubHeaders(),
      Accept: "application/vnd.github.raw+json",
    },
  });

  if (!response.ok) {
    return undefined;
  }

  const text = (await response.text()).trim();
  return text ? text.slice(0, MAX_README_LENGTH) : undefined;
}

export const listFeed = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("githubTools")
      .withIndex("by_created_at")
      .order("desc")
      .take(60);
  },
});

export const createManual = mutation({
  args: {
    owner: v.string(),
    name: v.string(),
    htmlUrl: v.string(),
    description: v.string(),
    homepageUrl: v.optional(v.string()),
    language: v.optional(v.string()),
    stars: v.optional(v.number()),
    forks: v.optional(v.number()),
    openIssues: v.optional(v.number()),
    topics: v.array(v.string()),
    license: v.optional(v.string()),
    defaultBranch: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
    readme: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    aiUseCases: v.optional(v.string()),
    aiOpportunity: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"githubTools">> => {
    const { user } = await requireCurrentUser(ctx);
    const owner = trimRequired(args.owner, 120);
    const name = trimRequired(args.name, 120);
    const repoFullName = `${owner}/${name}`;
    const now = Date.now();
    const existing = await ctx.db
      .query("githubTools")
      .withIndex("by_repo_full_name", (q) => q.eq("repoFullName", repoFullName))
      .unique();

    const patch = {
      ...compact({
        homepageUrl: trimOptional(args.homepageUrl, 500),
        language: trimOptional(args.language, 80),
        license: trimOptional(args.license, 120),
        defaultBranch: trimOptional(args.defaultBranch, 120),
        readme: trimOptional(args.readme, MAX_README_LENGTH),
        readmeFetchedAt: args.readme ? now : undefined,
        aiSummary: trimOptional(args.aiSummary, 3000),
        aiUseCases: trimOptional(args.aiUseCases, 3000),
        aiOpportunity: trimOptional(args.aiOpportunity, 3000),
      }),
      sourceType: "manual" as const,
      repoFullName,
      owner,
      name,
      htmlUrl: trimRequired(args.htmlUrl, 500),
      description: trimRequired(args.description, 2000),
      stars: args.stars ?? 0,
      forks: args.forks ?? 0,
      openIssues: args.openIssues ?? 0,
      topics: sanitizeTopics(args.topics),
      isArchived: args.isArchived ?? false,
      updatedAt: now,
      lastSyncedAt: now,
      createdBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("githubTools", {
      ...patch,
      createdAt: now,
    });
  },
});

export const updateAiFields = mutation({
  args: {
    id: v.id("githubTools"),
    aiSummary: v.optional(v.string()),
    aiUseCases: v.optional(v.string()),
    aiOpportunity: v.optional(v.string()),
    aiAnalysis: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    await ctx.db.patch(args.id, compact({
      aiSummary: trimOptional(args.aiSummary, 3000),
      aiUseCases: trimOptional(args.aiUseCases, 3000),
      aiOpportunity: trimOptional(args.aiOpportunity, 3000),
      aiAnalysis: trimOptional(args.aiAnalysis, 8000),
      updatedAt: Date.now(),
    }));
  },
});

export const upsertFetchedBatch = internalMutation({
  args: {
    createdBy: v.id("users"),
    repos: v.array(fetchedRepoValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const repo of args.repos) {
      const existing = await ctx.db
        .query("githubTools")
        .withIndex("by_repo_full_name", (q) => q.eq("repoFullName", repo.repoFullName))
        .unique();

      const payload = {
        ...compact({
          homepageUrl: trimOptional(repo.homepageUrl, 500),
          language: trimOptional(repo.language, 80),
          license: trimOptional(repo.license, 120),
          defaultBranch: trimOptional(repo.defaultBranch, 120),
          readme: trimOptional(repo.readme, MAX_README_LENGTH),
          readmeFetchedAt: repo.readme ? now : undefined,
          searchQuery: trimOptional(repo.searchQuery, 200),
        }),
        sourceType: "github_fetch" as const,
        repoFullName: repo.repoFullName,
        owner: trimRequired(repo.owner, 120),
        name: trimRequired(repo.name, 120),
        htmlUrl: trimRequired(repo.htmlUrl, 500),
        description: trimRequired(repo.description, 2000),
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        topics: sanitizeTopics(repo.topics),
        isArchived: repo.isArchived,
        fetchMode: repo.fetchMode,
        createdBy: args.createdBy,
        updatedAt: now,
        lastSyncedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
        updated += 1;
      } else {
        await ctx.db.insert("githubTools", {
          ...payload,
          createdAt: now,
        });
        inserted += 1;
      }
    }

    return { inserted, updated };
  },
});

export const fetchRepos = action({
  args: {
    mode: v.union(v.literal("trending"), v.literal("stars")),
    queryText: v.optional(v.string()),
    language: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<{ inserted: number; updated: number }> => {
    await requireIdentity(ctx);
    const createdBy: Id<"users"> = await ctx.runMutation(internal.users.ensureCurrentUserFromIdentity, {});

    const limit = Math.max(1, Math.min(MAX_FETCH_LIMIT, Math.floor(args.limit)));
    const queryText = trimOptional(args.queryText, 120) ?? "ai tools developer tools agent framework";
    const language = trimOptional(args.language, 40);
    const recentDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString().slice(0, 10);
    const languageClause = language ? ` language:${language}` : "";
    const searchQuery =
      args.mode === "trending"
        ? `${queryText} stars:>80 pushed:>=${recentDate}${languageClause}`
        : `${queryText} stars:>500${languageClause}`;

    const searchUrl = `${GITHUB_API_URL}/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=${args.mode === "trending" ? "updated" : "stars"}&order=desc&per_page=${limit}`;
    const payload = await fetchJson<{
      items: Array<{
        full_name: string;
        name: string;
        owner: { login: string };
        html_url: string;
        description: string | null;
        homepage: string | null;
        language: string | null;
        stargazers_count: number;
        forks_count: number;
        open_issues_count: number;
        topics?: string[];
        license?: { spdx_id?: string | null; name?: string | null } | null;
        default_branch?: string | null;
        archived: boolean;
      }>;
    }>(searchUrl);

    const repos = await Promise.all(
      payload.items.slice(0, limit).map(async (item) => ({
        fetchMode: args.mode,
        searchQuery: queryText,
        repoFullName: item.full_name,
        owner: item.owner.login,
        name: item.name,
        htmlUrl: item.html_url,
        description: item.description?.trim() || `${item.full_name} repository`,
        homepageUrl: trimOptional(item.homepage, 500),
        language: trimOptional(item.language, 80),
        stars: item.stargazers_count,
        forks: item.forks_count,
        openIssues: item.open_issues_count,
        topics: sanitizeTopics(item.topics ?? []),
        license: trimOptional(item.license?.spdx_id ?? item.license?.name, 120),
        defaultBranch: trimOptional(item.default_branch, 120),
        isArchived: item.archived,
        readme: await fetchReadme(item.full_name),
      }))
    );

    return await ctx.runMutation(internal.githubTools.upsertFetchedBatch, {
      createdBy,
      repos,
    });
  },
});
