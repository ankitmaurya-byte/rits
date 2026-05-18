/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { ADMIN_PERMISSION_PRESETS, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, createAdminSessionToken, logAdminAction, requireAdminPermission, requireAdminSession } from "./adminHelpers";

const adminRoleValidator = v.union(
  v.literal("super_admin"),
  v.literal("content_admin"),
  v.literal("data_admin"),
  v.literal("support_admin"),
  v.literal("read_only_admin")
);

const adminStatusValidator = v.union(v.literal("active"), v.literal("disabled"));

type ContentEntity = "ideas" | "todos" | "notes" | "resources" | "roadmaps" | "aiReports" | "resourceFolderShares" | "githubTools" | "ycStartupsAdmin" | "sharkTankPitchesAdmin";

const contentEntityValidator = v.union(
  v.literal("ideas"),
  v.literal("todos"),
  v.literal("notes"),
  v.literal("resources"),
  v.literal("roadmaps"),
  v.literal("aiReports"),
  v.literal("resourceFolderShares"),
  v.literal("githubTools"),
  v.literal("ycStartupsAdmin"),
  v.literal("sharkTankPitchesAdmin")
);

const moderationStatusValidator = v.union(v.literal("open"), v.literal("reviewed"), v.literal("resolved"), v.literal("dismissed"));

const exploreDatasetValidator = v.union(
  v.literal("yc"),
  v.literal("shark_tank"),
  v.literal("startup_hunt"),
  v.literal("ai_startups"),
  v.literal("github_tools")
);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function trimOptional(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function summarizeRecord(record: Record<string, unknown>) {
  if (typeof record.title === "string") return record.title;
  if (typeof record.name === "string") return record.name;
  if (typeof record.email === "string") return record.email;
  if (typeof record.url === "string") return record.url;
  return "Untitled";
}

async function fetchContentRecords(ctx: any, entityType: ContentEntity) {
  return await ctx.db.query(entityType).order("desc").take(100);
}

export const bootstrapDefaultAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", DEFAULT_ADMIN_EMAIL))
      .unique();

    const now = Date.now();
    if (existing) {
      if (existing.status !== "active" || existing.password !== DEFAULT_ADMIN_PASSWORD) {
        await ctx.db.patch(existing._id, {
          password: DEFAULT_ADMIN_PASSWORD,
          status: "active",
          role: "super_admin",
          permissions: ["*"],
          updatedAt: now,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("adminUsers", {
      email: DEFAULT_ADMIN_EMAIL,
      name: "Ankit",
      password: DEFAULT_ADMIN_PASSWORD,
      role: "super_admin",
      permissions: ["*"],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const admin = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!admin || admin.status !== "active" || admin.password !== args.password) {
      throw new ConvexError("Invalid admin credentials");
    }

    const now = Date.now();
    const sessionToken = createAdminSessionToken();
    await ctx.db.insert("adminSessions", {
      adminUserId: admin._id,
      sessionToken,
      expiresAt: now + 1000 * 60 * 60 * 24 * 14,
      createdAt: now,
      lastSeenAt: now,
    });
    await ctx.db.patch(admin._id, { lastLoginAt: now, updatedAt: now });

    return {
      sessionToken,
      adminUser: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
      },
    };
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken.trim()))
      .unique();
    if (session) {
      await ctx.db.delete(session._id);
    }
    return null;
  },
});

export const getSession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { session, adminUser } = await requireAdminSession(ctx, args.sessionToken);
    return {
      session: {
        _id: session._id,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
      },
      adminUser: {
        _id: adminUser._id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        permissions: adminUser.permissions,
        status: adminUser.status,
        lastLoginAt: adminUser.lastLoginAt,
      },
    };
  },
});

export const getDashboardStats = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "audit.read");

    const [users, workspaces, notes, todos, resources, aiReports, githubTools, moderationReports, shares, admins, auditLogs, workspaceMembers] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("workspaces").collect(),
      ctx.db.query("notes").collect(),
      ctx.db.query("todos").collect(),
      ctx.db.query("resources").collect(),
      ctx.db.query("aiReports").collect(),
      ctx.db.query("githubTools").collect(),
      ctx.db.query("moderationReports").collect(),
      ctx.db.query("resourceFolderShares").collect(),
      ctx.db.query("adminUsers").collect(),
      ctx.db.query("adminAuditLogs").collect(),
      ctx.db.query("workspaceMembers").collect(),
    ]);

    return {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.status !== "suspended").length,
      totalWorkspaces: workspaces.length,
      totalNotes: notes.length,
      totalTodos: todos.length,
      totalResources: resources.length,
      totalExploreRecords: githubTools.length,
      totalReports: aiReports.length,
      latestUsers: users
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, 8)
        .map((user) => ({
          ...user,
          workspaceCount: workspaceMembers.filter((member) => member.userId === user._id).length,
        })),
      flaggedContentCount: moderationReports.filter((report) => report.status === "open").length,
      pendingModerationReports: moderationReports.filter((report) => report.status === "open").length,
      publicShares: shares.length,
      activeAdmins: admins.filter((admin) => admin.status === "active").length,
      recentAuditLogs: auditLogs
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map((log) => ({
          ...log,
          actorEmail: admins.find((admin) => admin._id === log.adminUserId)?.email ?? "Unknown",
        })),
    };
  },
});

export const getDashboardSummary = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "dashboard.read");

    const [latestUsers, openReports, latestAudit, disabledWorkspaces] = await Promise.all([
      ctx.db.query("users").order("desc").take(8),
      ctx.db.query("moderationReports").withIndex("by_status", (q) => q.eq("status", "open")).collect(),
      ctx.db.query("adminAuditLogs").collect(),
      ctx.db.query("workspaces").collect(),
    ]);

    return {
      latestUsers,
      flaggedItems: openReports.slice(0, 10),
      recentAdminActions: latestAudit.sort((a, b) => b.createdAt - a.createdAt).slice(0, 12),
      disabledWorkspaceCount: disabledWorkspaces.filter((workspace) => workspace.status === "disabled" || workspace.status === "archived").length,
    };
  },
});

export const listAdminMembers = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "admins.manage");
    return await ctx.db.query("adminUsers").collect();
  },
});

export const createAdminMember = mutation({
  args: {
    sessionToken: v.string(),
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: adminRoleValidator,
    permissions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "admins.manage");
    const email = args.email.trim().toLowerCase();
    const now = Date.now();
    const existing = await ctx.db.query("adminUsers").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (existing) {
      throw new ConvexError("Admin member already exists");
    }

    const createdId = await ctx.db.insert("adminUsers", {
      email,
      name: args.name.trim() || email,
      password: args.password,
      role: args.role,
      permissions: args.permissions?.length ? args.permissions : ADMIN_PERMISSION_PRESETS[args.role],
      status: "active",
      createdBy: adminUser._id,
      createdAt: now,
      updatedAt: now,
    });

    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "create_admin_member",
      entityType: "adminUsers",
      entityId: createdId,
      summary: `Created admin member ${email}`,
    });

    return createdId;
  },
});

export const updateAdminMember = mutation({
  args: {
    sessionToken: v.string(),
    adminUserId: v.id("adminUsers"),
    name: v.optional(v.string()),
    password: v.optional(v.string()),
    role: v.optional(adminRoleValidator),
    permissions: v.optional(v.array(v.string())),
    status: v.optional(adminStatusValidator),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "admins.manage");
    const target = await ctx.db.get(args.adminUserId);
    if (!target) throw new ConvexError("Admin member not found");

    const patch: Partial<Doc<"adminUsers">> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim() || target.name;
    if (args.password !== undefined) patch.password = args.password;
    if (args.role !== undefined) patch.role = args.role;
    if (args.permissions !== undefined) patch.permissions = args.permissions;
    if (args.status !== undefined) patch.status = args.status;

    await ctx.db.patch(target._id, patch);
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "update_admin_member",
      entityType: "adminUsers",
      entityId: target._id,
      summary: `Updated admin member ${target.email}`,
      before: JSON.stringify(target),
      after: JSON.stringify({ ...target, ...patch }),
    });
    return target._id;
  },
});

export const listUsers = query({
  args: { sessionToken: v.string(), search: v.optional(v.string()), query: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "users.read");
    const search = args.query?.trim().toLowerCase() ?? args.search?.trim().toLowerCase() ?? "";
    const [users, workspaceMembers, ideas, todos, notes] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("workspaceMembers").collect(),
      ctx.db.query("ideas").collect(),
      ctx.db.query("todos").collect(),
      ctx.db.query("notes").collect(),
    ]);

    return users
      .filter((user) => !search || `${user.name} ${user.email} ${user.currentCompany ?? ""}`.toLowerCase().includes(search))
      .map((user) => {
        const userTodos = todos.filter((item) => item.createdBy === user._id);
        const userNotes = notes.filter((item) => item.createdBy === user._id);
        return {
          ...user,
          workspaceCount: workspaceMembers.filter((member) => member.userId === user._id).length,
          ideaCount: ideas.filter((item) => item.createdBy === user._id).length,
          todoCount: userTodos.length,
          noteCount: userNotes.length,
          lastActivityAt: Math.max(
            user._creationTime,
            ...userTodos.map((item) => item.updatedAt ?? item.createdAt),
            ...userNotes.map((item) => item.updatedAt)
          ),
        };
      });
  },
});

export const getUserDetail = query({
  args: { sessionToken: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "users.read");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");

    const [workspaceMemberships, ideas, todos, notes, resources, conversations] = await Promise.all([
      ctx.db.query("workspaceMembers").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
      (await ctx.db.query("ideas").collect()).filter((item) => item.createdBy === args.userId),
      (await ctx.db.query("todos").collect()).filter((item) => item.createdBy === args.userId),
      (await ctx.db.query("notes").collect()).filter((item) => item.createdBy === args.userId),
      (await ctx.db.query("resources").collect()).filter((item) => item.createdBy === args.userId),
      (await ctx.db.query("chatConversations").collect()).filter((item) => item.ownerId === args.userId),
    ]);

    return {
      user,
      workspaceMemberships,
      counts: {
        ideas: ideas.length,
        todos: todos.length,
        notes: notes.length,
        resources: resources.length,
        conversations: conversations.length,
      },
    };
  },
});

export const listWorkspaces = query({
  args: { sessionToken: v.string(), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "workspaces.read");
    const query = args.search?.trim().toLowerCase() ?? "";
    const [workspaces, users, workspaceMembers, todos, notes, resources] = await Promise.all([
      ctx.db.query("workspaces").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("workspaceMembers").collect(),
      ctx.db.query("todos").collect(),
      ctx.db.query("notes").collect(),
      ctx.db.query("resources").collect(),
    ]);

    return workspaces
      .filter((workspace) => !query || `${workspace.name} ${workspace.description ?? ""}`.toLowerCase().includes(query))
      .map((workspace) => ({
        ...workspace,
        ownerEmail: users.find((user) => user._id === workspace.ownerId)?.email ?? "Unknown",
        memberCount: workspaceMembers.filter((item) => item.workspaceId === workspace._id).length,
        todoCount: todos.filter((item) => item.workspaceId === workspace._id).length,
        noteCount: notes.filter((item) => item.workspaceId === workspace._id).length,
        resourceCount: resources.filter((item) => item.workspaceId === workspace._id).length,
      }));
  },
});

export const getWorkspaceDetail = query({
  args: { sessionToken: v.string(), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "workspaces.read");
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new ConvexError("Workspace not found");

    const [members, invites, ideas, todos, notes, resources, roadmaps, rooms] = await Promise.all([
      ctx.db.query("workspaceMembers").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect(),
      ctx.db.query("workspaceInvites").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect(),
      (await ctx.db.query("ideas").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect()),
      (await ctx.db.query("todos").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect()),
      (await ctx.db.query("notes").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect()),
      (await ctx.db.query("resources").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect()),
      (await ctx.db.query("roadmaps").withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId)).collect()),
      (await ctx.db.query("socialChatRooms").withIndex("by_workspace_and_updated_at", (q) => q.eq("workspaceId", args.workspaceId)).collect()),
    ]);

    return {
      workspace,
      members,
      invites,
      counts: {
        ideas: ideas.length,
        todos: todos.length,
        notes: notes.length,
        resources: resources.length,
        roadmaps: roadmaps.length,
        rooms: rooms.length,
      },
    };
  },
});

export const listContent = query({
  args: {
    sessionToken: v.string(),
    entityType: v.string(),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "content.manage");
    const query = args.search?.trim().toLowerCase() ?? "";
    const entityTypes = args.entityType === "all"
      ? (["ideas", "todos", "notes", "resources", "roadmaps", "aiReports"] as ContentEntity[])
      : [args.entityType as ContentEntity];
    const users = await ctx.db.query("users").collect();
    const rows: Record<string, unknown>[] = [];

    for (const entityType of entityTypes) {
      const records = await fetchContentRecords(ctx, entityType);
      for (const record of records) {
        if (query && !JSON.stringify(record).toLowerCase().includes(query)) {
          continue;
        }
        const ownerId = (record as any).createdBy ?? (record as any).senderId;
        rows.push({
          ...record,
          entityType,
          title: (record as any).title ?? (record as any).name ?? summarizeRecord(record as Record<string, unknown>),
          preview: (record as any).description ?? (record as any).content?.slice?.(0, 96) ?? (record as any).url ?? "",
          ownerEmail: users.find((user) => user._id === ownerId)?.email ?? "Unknown",
          scope: (record as any).scope ?? ((record as any).workspaceId ? "workspace" : "private"),
        });
      }
    }

    return rows.sort((a: any, b: any) => (b.updatedAt ?? b.createdAt ?? b._creationTime ?? 0) - (a.updatedAt ?? a.createdAt ?? a._creationTime ?? 0));
  },
});

export const deleteContent = mutation({
  args: {
    sessionToken: v.string(),
    entityType: contentEntityValidator,
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "content.delete");
    await ctx.db.delete(args.entityId as Id<any>);
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "delete_content",
      entityType: args.entityType,
      entityId: args.entityId,
      summary: `Deleted ${args.entityType} ${args.entityId}`,
    });
    return null;
  },
});

export const listImportJobs = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "imports.manage");
    return await ctx.db.query("importJobs").collect();
  },
});

export const listModerationQueue = query({
  args: { sessionToken: v.string(), status: v.optional(moderationStatusValidator) },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "moderation.manage");
    const [reports, users] = await Promise.all([
      args.status
      ? await ctx.db.query("moderationReports").withIndex("by_status", (q) => q.eq("status", args.status!)).collect()
      : await ctx.db.query("moderationReports").collect(),
      ctx.db.query("users").collect(),
    ]);
    return {
      reports: reports
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((report) => ({
          ...report,
          targetLabel:
            users.find((user) => user._id === (report as any).reportedByUserId)?.email ??
            report.entityId ??
            report.entityType,
        })),
    };
  },
});

export const resolveModerationReport = mutation({
  args: {
    sessionToken: v.string(),
    reportId: v.id("moderationReports"),
    status: v.union(v.literal("reviewed"), v.literal("resolved"), v.literal("dismissed")),
    notes: v.optional(v.string()),
    action: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "moderation.manage");
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Moderation report not found");

    const now = Date.now();
    await ctx.db.patch(report._id, {
      status: args.status,
      notes: args.notes?.trim(),
      updatedAt: now,
    });

    const actionId = await ctx.db.insert("moderationActions", {
      reportId: report._id,
      adminUserId: adminUser._id,
      entityType: report.entityType,
      entityId: report.entityId,
      action: args.action?.trim() || `report_${args.status}`,
      notes: args.notes?.trim(),
      createdAt: now,
    });

    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "resolve_moderation_report",
      entityType: "moderationReports",
      entityId: report._id,
      summary: `Moderation report ${report._id} -> ${args.status}`,
      before: JSON.stringify(report),
      after: JSON.stringify({ ...report, status: args.status, notes: args.notes?.trim(), updatedAt: now }),
    });

    return actionId;
  },
});

export const listModerationActions = query({
  args: { sessionToken: v.string(), reportId: v.optional(v.id("moderationReports")) },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "moderation.manage");
    if (args.reportId) {
      return await ctx.db.query("moderationActions").withIndex("by_report", (q) => q.eq("reportId", args.reportId!)).collect();
    }
    return await ctx.db.query("moderationActions").collect();
  },
});

export const listYcStartups = query({
  args: { sessionToken: v.string(), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "yc.manage");
    const query = args.search?.trim().toLowerCase() ?? "";
    const rows = await ctx.db.query("ycStartupsAdmin").collect();
    return rows.filter((row) => !query || `${row.name} ${row.batch} ${row.industry} ${row.description}`.toLowerCase().includes(query));
  },
});

export const upsertYcStartup = mutation({
  args: {
    sessionToken: v.string(),
    ycStartupId: v.optional(v.id("ycStartupsAdmin")),
    sourceId: v.string(),
    name: v.string(),
    slug: v.string(),
    batch: v.string(),
    industry: v.string(),
    description: v.string(),
    founders: v.array(v.string()),
    website: v.string(),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "yc.manage");
    const now = Date.now();
    if (args.ycStartupId) {
      const existing = await ctx.db.get(args.ycStartupId);
      if (!existing) throw new ConvexError("YC startup not found");
      await ctx.db.patch(existing._id, { ...args, ycStartupId: undefined, sessionToken: undefined, createdAt: existing.createdAt, updatedAt: now } as any);
      await logAdminAction(ctx, { adminUserId: adminUser._id, action: "update_yc_startup", entityType: "ycStartupsAdmin", entityId: existing._id, summary: `Updated YC startup ${args.name}` });
      return existing._id;
    }
    const createdId = await ctx.db.insert("ycStartupsAdmin", { sourceId: args.sourceId, name: args.name, slug: args.slug, batch: args.batch, industry: args.industry, description: args.description, founders: args.founders, website: args.website, createdAt: now, updatedAt: now });
    await logAdminAction(ctx, { adminUserId: adminUser._id, action: "create_yc_startup", entityType: "ycStartupsAdmin", entityId: createdId, summary: `Created YC startup ${args.name}` });
    return createdId;
  },
});

export const deleteYcStartup = mutation({
  args: { sessionToken: v.string(), ycStartupId: v.id("ycStartupsAdmin") },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "yc.manage");
    const existing = await ctx.db.get(args.ycStartupId);
    if (!existing) throw new ConvexError("YC startup not found");
    await ctx.db.delete(existing._id);
    await logAdminAction(ctx, { adminUserId: adminUser._id, action: "delete_yc_startup", entityType: "ycStartupsAdmin", entityId: existing._id, summary: `Deleted YC startup ${existing.name}` });
    return null;
  },
});

export const listSharkTankPitches = query({
  args: { sessionToken: v.string(), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "sharktank.manage");
    const query = args.search?.trim().toLowerCase() ?? "";
    const rows = await ctx.db.query("sharkTankPitchesAdmin").collect();
    return rows.filter((row) => !query || `${row.companyName ?? ""} ${row.episodeTitle ?? ""} ${row.pitchSummary ?? ""}`.toLowerCase().includes(query));
  },
});

export const upsertSharkTankPitch = mutation({
  args: {
    sessionToken: v.string(),
    sharkTankPitchId: v.optional(v.id("sharkTankPitchesAdmin")),
    sourceId: v.string(),
    slug: v.string(),
    season: v.number(),
    episodeNumber: v.optional(v.number()),
    episodeTitle: v.optional(v.string()),
    airDate: v.optional(v.string()),
    companyName: v.optional(v.string()),
    founders: v.array(v.string()),
    askAmountValue: v.optional(v.number()),
    askAmountUnit: v.optional(v.string()),
    askAmountInInr: v.optional(v.number()),
    askEquityPercent: v.optional(v.number()),
    askText: v.optional(v.string()),
    pitchSummary: v.optional(v.string()),
    introExcerpt: v.optional(v.string()),
    sourceFile: v.string(),
    pitchIndexInEpisode: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "sharktank.manage");
    const now = Date.now();
    if (args.sharkTankPitchId) {
      const existing = await ctx.db.get(args.sharkTankPitchId);
      if (!existing) throw new ConvexError("Shark Tank pitch not found");
      await ctx.db.patch(existing._id, { ...args, sharkTankPitchId: undefined, sessionToken: undefined, createdAt: existing.createdAt, updatedAt: now } as any);
      await logAdminAction(ctx, { adminUserId: adminUser._id, action: "update_sharktank_pitch", entityType: "sharkTankPitchesAdmin", entityId: existing._id, summary: `Updated Shark Tank pitch ${args.companyName ?? args.slug}` });
      return existing._id;
    }
    const createdId = await ctx.db.insert("sharkTankPitchesAdmin", { sourceId: args.sourceId, slug: args.slug, season: args.season, episodeNumber: args.episodeNumber, episodeTitle: args.episodeTitle, airDate: args.airDate, companyName: args.companyName, founders: args.founders, askAmountValue: args.askAmountValue, askAmountUnit: args.askAmountUnit, askAmountInInr: args.askAmountInInr, askEquityPercent: args.askEquityPercent, askText: args.askText, pitchSummary: args.pitchSummary, introExcerpt: args.introExcerpt, sourceFile: args.sourceFile, pitchIndexInEpisode: args.pitchIndexInEpisode, createdAt: now, updatedAt: now });
    await logAdminAction(ctx, { adminUserId: adminUser._id, action: "create_sharktank_pitch", entityType: "sharkTankPitchesAdmin", entityId: createdId, summary: `Created Shark Tank pitch ${args.companyName ?? args.slug}` });
    return createdId;
  },
});

export const deleteSharkTankPitch = mutation({
  args: { sessionToken: v.string(), sharkTankPitchId: v.id("sharkTankPitchesAdmin") },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "sharktank.manage");
    const existing = await ctx.db.get(args.sharkTankPitchId);
    if (!existing) throw new ConvexError("Shark Tank pitch not found");
    await ctx.db.delete(existing._id);
    await logAdminAction(ctx, { adminUserId: adminUser._id, action: "delete_sharktank_pitch", entityType: "sharkTankPitchesAdmin", entityId: existing._id, summary: `Deleted Shark Tank pitch ${existing.companyName ?? existing.slug}` });
    return null;
  },
});

export const createImportJob = mutation({
  args: {
    sessionToken: v.string(),
    sourceType: v.string(),
    fileName: v.string(),
    payload: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "imports.manage");
    const now = Date.now();
    const jobId = await ctx.db.insert("importJobs", {
      sourceType: args.sourceType,
      fileName: args.fileName,
      payload: args.payload,
      status: "queued",
      createdBy: adminUser._id,
      createdAt: now,
      updatedAt: now,
    });
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "create_import_job",
      entityType: "importJobs",
      entityId: jobId,
      summary: `Queued import job ${args.fileName} for ${args.sourceType}`,
    });
    return jobId;
  },
});

export const listAuditLogs = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "audit.read");
    const [logs, admins] = await Promise.all([
      ctx.db.query("adminAuditLogs").collect(),
      ctx.db.query("adminUsers").collect(),
    ]);
    return logs
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((log) => ({
        ...log,
        actorEmail: admins.find((admin) => admin._id === log.adminUserId)?.email ?? "Unknown",
      }));
  },
});

export const suspendUser = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    suspended: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "users.suspend");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");

    const patch = {
      status: args.suspended ? "suspended" : undefined,
      suspendedAt: args.suspended ? Date.now() : undefined,
    };

    await ctx.db.patch(user._id, patch);
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: args.suspended ? "suspend_user" : "unsuspend_user",
      entityType: "users",
      entityId: user._id,
      summary: `${args.suspended ? "Suspended" : "Unsuspended"} ${user.email}${args.reason ? `: ${args.reason}` : ""}`,
      before: JSON.stringify(user),
      after: JSON.stringify({ ...user, ...patch }),
    });
    return user._id;
  },
});

export const updateWorkspaceStatus = mutation({
  args: {
    sessionToken: v.string(),
    workspaceId: v.id("workspaces"),
    status: v.union(v.literal("active"), v.literal("disabled"), v.literal("archived")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "workspaces.edit");
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new ConvexError("Workspace not found");

    const patch = {
      status: args.status,
      disabledAt: args.status === "active" ? undefined : Date.now(),
    };

    await ctx.db.patch(workspace._id, patch);
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "update_workspace_status",
      entityType: "workspaces",
      entityId: workspace._id,
      summary: `Workspace ${workspace.name} -> ${args.status}${args.reason ? `: ${args.reason}` : ""}`,
      before: JSON.stringify(workspace),
      after: JSON.stringify({ ...workspace, ...patch }),
    });
    return workspace._id;
  },
});

export const listFeatureFlags = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "admins.manage");
    return await ctx.db.query("adminFeatureFlags").collect();
  },
});

export const upsertFeatureFlag = mutation({
  args: {
    sessionToken: v.string(),
    key: v.string(),
    label: v.string(),
    enabled: v.boolean(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "admins.manage");
    const existing = await ctx.db.query("adminFeatureFlags").withIndex("by_key", (q) => q.eq("key", args.key.trim())).unique();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label.trim(),
        enabled: args.enabled,
        description: args.description?.trim(),
        updatedBy: adminUser._id,
        updatedAt: now,
      });
      await logAdminAction(ctx, {
        adminUserId: adminUser._id,
        action: "update_feature_flag",
        entityType: "adminFeatureFlags",
        entityId: existing._id,
        summary: `Updated feature flag ${args.key}`,
      });
      return existing._id;
    }

    const createdId = await ctx.db.insert("adminFeatureFlags", {
      key: args.key.trim(),
      label: args.label.trim(),
      enabled: args.enabled,
      description: args.description?.trim(),
      updatedBy: adminUser._id,
      updatedAt: now,
    });
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "create_feature_flag",
      entityType: "adminFeatureFlags",
      entityId: createdId,
      summary: `Created feature flag ${args.key}`,
    });
    return createdId;
  },
});

export const deleteFeatureFlag = mutation({
  args: { sessionToken: v.string(), featureFlagId: v.id("adminFeatureFlags") },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "integrations.manage");
    const flag = await ctx.db.get(args.featureFlagId);
    if (!flag) throw new ConvexError("Feature flag not found");
    await ctx.db.delete(flag._id);
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "delete_feature_flag",
      entityType: "adminFeatureFlags",
      entityId: flag._id,
      summary: `Deleted feature flag ${flag.key}`,
    });
    return null;
  },
});

export const importYcDataset = mutation({
  args: { sessionToken: v.string(), fileName: v.string(), payload: v.string() },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "yc.manage");
    const now = Date.now();
    const jobId = await ctx.db.insert("importJobs", {
      sourceType: "yc",
      fileName: args.fileName,
      payload: args.payload,
      status: "queued",
      stats: JSON.stringify({ mode: "stub" }),
      createdBy: adminUser._id,
      createdAt: now,
      updatedAt: now,
    });
    await logAdminAction(ctx, { adminUserId: adminUser._id, action: "import_yc_dataset", entityType: "importJobs", entityId: jobId, summary: `Queued YC import ${args.fileName}` });
    return { jobId, status: "queued", mode: "stub" as const };
  },
});

export const importSharkTankDataset = mutation({
  args: { sessionToken: v.string(), fileName: v.string(), payload: v.string() },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "sharktank.manage");
    const now = Date.now();
    const jobId = await ctx.db.insert("importJobs", {
      sourceType: "sharktank",
      fileName: args.fileName,
      payload: args.payload,
      status: "queued",
      stats: JSON.stringify({ mode: "stub" }),
      createdBy: adminUser._id,
      createdAt: now,
      updatedAt: now,
    });
    await logAdminAction(ctx, { adminUserId: adminUser._id, action: "import_sharktank_dataset", entityType: "importJobs", entityId: jobId, summary: `Queued Shark Tank import ${args.fileName}` });
    return { jobId, status: "queued", mode: "stub" as const };
  },
});

export const importStartupDataset = mutation({
  args: { sessionToken: v.string(), fileName: v.string(), payload: v.string() },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "startups.manage");
    const now = Date.now();
    const jobId = await ctx.db.insert("importJobs", {
      sourceType: "startup_hunt",
      fileName: args.fileName,
      payload: args.payload,
      status: "queued",
      stats: JSON.stringify({ mode: "stub" }),
      createdBy: adminUser._id,
      createdAt: now,
      updatedAt: now,
    });
    await logAdminAction(ctx, { adminUserId: adminUser._id, action: "import_startup_dataset", entityType: "importJobs", entityId: jobId, summary: `Queued startup import ${args.fileName}` });
    return { jobId, status: "queued", mode: "stub" as const };
  },
});

export const getDailyStats = query({
  args: { sessionToken: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "dashboard.read");
    const days = Math.max(1, Math.min(args.days ?? 30, 90));
    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;
    const start = now - days * dayMs;

    const [users, workspaces, ideas, todos, notes, resources, reports] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("workspaces").collect(),
      ctx.db.query("ideas").collect(),
      ctx.db.query("todos").collect(),
      ctx.db.query("notes").collect(),
      ctx.db.query("resources").collect(),
      ctx.db.query("aiReports").collect(),
    ]);

    return Array.from({ length: days }, (_, index) => {
      const bucketStart = start + index * dayMs;
      const bucketEnd = bucketStart + dayMs;
      const inBucket = (value: number | undefined) => value !== undefined && value >= bucketStart && value < bucketEnd;
      return {
        dayStart: bucketStart,
        users: users.filter((item) => inBucket(item._creationTime)).length,
        workspaces: workspaces.filter((item) => inBucket(item._creationTime)).length,
        ideas: ideas.filter((item) => inBucket(item.createdAt)).length,
        todos: todos.filter((item) => inBucket(item.createdAt)).length,
        notes: notes.filter((item) => inBucket(item.updatedAt)).length,
        resources: resources.filter((item) => inBucket(item.createdAt)).length,
        reports: reports.filter((item) => inBucket(item.createdAt)).length,
      };
    });
  },
});

export const deleteContentItem = mutation({
  args: {
    sessionToken: v.string(),
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "content.manage");
    const before = await ctx.db.get(args.entityId as Id<any>);
    if (before) {
      await ctx.db.delete(args.entityId as Id<any>);
    }
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "delete_content_item",
      entityType: args.entityType,
      entityId: args.entityId,
      summary: `Deleted ${args.entityType} ${args.entityId}`,
      before: before ? JSON.stringify(before) : undefined,
    });
    return null;
  },
});

export const revokeFolderShare = mutation({
  args: { sessionToken: v.string(), shareId: v.id("resourceFolderShares") },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "resources.manage");
    const share = await ctx.db.get(args.shareId);
    if (!share) {
      throw new ConvexError("Folder share not found");
    }
    await ctx.db.delete(args.shareId);
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "revoke_folder_share",
      entityType: "resourceFolderShares",
      entityId: args.shareId,
      summary: `Revoked resource share ${share.title}`,
      before: JSON.stringify(share),
    });
    return null;
  },
});

export const listResourcesAdmin = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "resources.manage");
    const [shares, users, resources] = await Promise.all([
      ctx.db.query("resourceFolderShares").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("resources").collect(),
    ]);
    return {
      resourceCount: resources.length,
      shares: shares.map((share) => ({
        ...share,
        ownerEmail: users.find((user) => user._id === share.createdBy)?.email ?? "Unknown",
      })),
    };
  },
});

export const listAdmins = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "admins.manage");
    return (await ctx.db.query("adminUsers").collect()).map((admin) => ({
      ...admin,
      status: admin.status === "disabled" ? "deactivated" : admin.status,
    }));
  },
});

export const upsertAdminMember = mutation({
  args: {
    sessionToken: v.string(),
    adminUserId: v.optional(v.id("adminUsers")),
    name: v.string(),
    email: v.string(),
    password: v.optional(v.string()),
    role: adminRoleValidator,
    permissions: v.array(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "admins.manage");
    const email = args.email.trim().toLowerCase();
    const now = Date.now();
    const nextStatus = args.status === "deactivated" ? "disabled" : "active";
    const existing = args.adminUserId
      ? await ctx.db.get(args.adminUserId)
      : await ctx.db.query("adminUsers").withIndex("by_email", (q) => q.eq("email", email)).unique();

    const patch = {
      email,
      name: args.name.trim() || email,
      role: args.role,
      permissions: args.permissions.length ? args.permissions : ADMIN_PERMISSION_PRESETS[args.role],
      status: nextStatus as "active" | "disabled",
      updatedAt: now,
      ...(args.password ? { password: args.password } : {}),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      await logAdminAction(ctx, {
        adminUserId: adminUser._id,
        action: "update_admin_member",
        entityType: "adminUsers",
        entityId: existing._id,
        summary: `Updated admin member ${email}`,
        before: JSON.stringify(existing),
        after: JSON.stringify({ ...existing, ...patch }),
      });
      return existing._id;
    }

    const createdId = await ctx.db.insert("adminUsers", {
      ...patch,
      password: args.password ?? DEFAULT_ADMIN_PASSWORD,
      createdAt: now,
    });
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "create_admin_member",
      entityType: "adminUsers",
      entityId: createdId,
      summary: `Created admin member ${email}`,
    });
    return createdId;
  },
});

export const createModerationAction = mutation({
  args: {
    sessionToken: v.string(),
    targetUserId: v.optional(v.id("users")),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    actionType: v.string(),
    reason: v.string(),
    strikeDelta: v.number(),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "moderation.manage");
    const now = Date.now();
    const actionId = await ctx.db.insert("moderationActions", {
      adminUserId: adminUser._id,
      entityType: args.entityType,
      entityId: args.entityId ?? args.targetUserId ?? "unknown",
      action: args.actionType,
      notes: args.reason,
      createdAt: now,
    });

    if (args.targetUserId) {
      const user = await ctx.db.get(args.targetUserId);
      if (user) {
        await ctx.db.patch(user._id, {
          strikeCount: (user.strikeCount ?? 0) + args.strikeDelta,
          cooldownUntil: args.actionType === "cooldown" ? now + 1000 * 60 * 60 * 24 : user.cooldownUntil,
        });
      }
    }

    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "create_moderation_action",
      entityType: "moderationActions",
      entityId: actionId,
      summary: `Created moderation action ${args.actionType}`,
      after: JSON.stringify(args),
    });
    return actionId;
  },
});

export const listExploreData = query({
  args: { sessionToken: v.string(), datasetKind: exploreDatasetValidator },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "explore.manage");
    if (args.datasetKind === "github_tools") {
      const records = await ctx.db.query("githubTools").withIndex("by_created_at").order("desc").take(100);
      return { records };
    }
    if (args.datasetKind === "yc") {
      const records = await ctx.db.query("ycStartupsAdmin").collect();
      return {
        records: records.map((item) => ({
          ...item,
          category: item.industry,
        })),
      };
    }
    if (args.datasetKind === "shark_tank") {
      const records = await ctx.db.query("sharkTankPitchesAdmin").collect();
      return {
        records: records.map((item) => ({
          ...item,
          name: item.companyName ?? item.slug,
          website: undefined,
          category: `Season ${item.season}`,
        })),
      };
    }
    const records = await ctx.db
      .query("exploreEntries")
      .withIndex("by_dataset_kind", (q) => q.eq("datasetKind", args.datasetKind as any))
      .collect();
    return { records };
  },
});

export const importExploreRecords = mutation({
  args: {
    sessionToken: v.string(),
    datasetKind: exploreDatasetValidator,
    records: v.array(
      v.object({
        name: v.optional(v.string()),
        website: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
        tags: v.optional(v.string()),
        slug: v.optional(v.string()),
        metadata: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "imports.manage");
    const now = Date.now();
    let inserted = 0;
    let updated = 0;
    let errorRows = 0;

    if (args.datasetKind === "github_tools") {
      throw new ConvexError("Use the existing GitHub tools ingestion flow for github_tools");
    }

    for (const row of args.records) {
      const name = row.name?.trim();
      if (!name) {
        errorRows += 1;
        continue;
      }

      if (args.datasetKind === "yc") {
        const slug = row.slug?.trim() || slugify(name);
        const existing = await ctx.db.query("ycStartupsAdmin").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
        const payload = {
          sourceId: row.slug?.trim() || slug,
          name,
          slug,
          batch: trimOptional(row.metadata) || "Unknown",
          industry: trimOptional(row.category) || "General",
          description: trimOptional(row.description) || "",
          founders: trimOptional(row.tags)?.split("|").map((item) => item.trim()).filter(Boolean) || [],
          website: trimOptional(row.website) || "",
          updatedAt: now,
        };
        if (existing) {
          await ctx.db.patch(existing._id, payload);
          updated += 1;
        } else {
          await ctx.db.insert("ycStartupsAdmin", { ...payload, createdAt: now });
          inserted += 1;
        }
        continue;
      }

      if (args.datasetKind === "shark_tank") {
        const slug = row.slug?.trim() || slugify(name);
        const existing = await ctx.db.query("sharkTankPitchesAdmin").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
        const payload = {
          sourceId: row.slug?.trim() || slug,
          slug,
          season: Number(trimOptional(row.category)?.replace(/[^0-9]/g, "") || 0),
          companyName: name,
          founders: trimOptional(row.tags)?.split("|").map((item) => item.trim()).filter(Boolean) || [],
          pitchSummary: trimOptional(row.description),
          sourceFile: "admin_import",
          updatedAt: now,
        };
        if (existing) {
          await ctx.db.patch(existing._id, payload as any);
          updated += 1;
        } else {
          await ctx.db.insert("sharkTankPitchesAdmin", { ...payload, createdAt: now } as any);
          inserted += 1;
        }
        continue;
      }

      const slug = row.slug?.trim() || slugify(name);
      const existing = await ctx.db
        .query("exploreEntries")
        .withIndex("by_dataset_kind_and_slug", (q) => q.eq("datasetKind", args.datasetKind as any).eq("slug", slug))
        .unique();
      const payload = {
        datasetKind: args.datasetKind as any,
        slug,
        name,
        website: trimOptional(row.website),
        description: trimOptional(row.description),
        category: trimOptional(row.category),
        logoUrl: trimOptional(row.logoUrl),
        tags: trimOptional(row.tags)?.split("|").map((item) => item.trim()).filter(Boolean) || [],
        metadata: trimOptional(row.metadata),
        createdBy: adminUser._id,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
        updated += 1;
      } else {
        await ctx.db.insert("exploreEntries", { ...payload, createdAt: now });
        inserted += 1;
      }
    }

    await ctx.db.insert("importJobs", {
      sourceType: args.datasetKind,
      fileName: `${args.datasetKind}-admin-import`,
      status: errorRows > 0 ? "failed" : "completed",
      stats: JSON.stringify({ inserted, updated, errorRows }),
      createdBy: adminUser._id,
      createdAt: now,
      updatedAt: now,
    });

    return { inserted, updated };
  },
});

export const listIntegrationConfigs = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "integrations.manage");
    return await ctx.db.query("integrationConfigs").collect();
  },
});

export const upsertIntegrationConfig = mutation({
  args: {
    sessionToken: v.string(),
    slug: v.string(),
    label: v.string(),
    enabled: v.boolean(),
    healthStatus: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "integrations.manage");
    const existing = await ctx.db.query("integrationConfigs").withIndex("by_slug", (q) => q.eq("slug", args.slug.trim())).unique();
    const payload = {
      slug: args.slug.trim(),
      label: args.label.trim(),
      enabled: args.enabled,
      healthStatus: args.healthStatus.trim(),
      notes: trimOptional(args.notes),
      updatedAt: Date.now(),
      updatedBy: adminUser._id,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("integrationConfigs", payload);
  },
});

export const listNewsletterIssues = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "reports.manage");
    return await ctx.db.query("newsletterIssues").withIndex("by_created_at").order("desc").take(100);
  },
});

export const upsertNewsletterIssue = mutation({
  args: {
    sessionToken: v.string(),
    issueId: v.optional(v.id("newsletterIssues")),
    title: v.string(),
    source: v.string(),
    sender: v.string(),
    accessScope: v.string(),
    status: v.string(),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminPermission(ctx, args.sessionToken, "reports.manage");
    const payload = {
      title: args.title.trim(),
      source: args.source.trim(),
      sender: args.sender.trim(),
      accessScope: args.accessScope.trim(),
      status: args.status.trim(),
      summary: trimOptional(args.summary),
      updatedAt: Date.now(),
      updatedBy: adminUser._id,
    };
    if (args.issueId) {
      await ctx.db.patch(args.issueId, payload);
      return args.issueId;
    }
    return await ctx.db.insert("newsletterIssues", { ...payload, createdAt: Date.now() });
  },
});

export const searchEntities = query({
  args: { sessionToken: v.string(), query: v.string() },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    const needle = args.query.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    const [users, workspaces, ideas, notes, exploreEntries, githubTools] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("workspaces").collect(),
      ctx.db.query("ideas").collect(),
      ctx.db.query("notes").collect(),
      ctx.db.query("exploreEntries").collect(),
      ctx.db.query("githubTools").collect(),
    ]);
    return [
      ...users
        .filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(needle))
        .map((item) => ({ entityType: "user", title: item.name, meta: item.email })),
      ...workspaces
        .filter((item) => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(needle))
        .map((item) => ({ entityType: "workspace", title: item.name, meta: item.description ?? "" })),
      ...ideas
        .filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(needle))
        .map((item) => ({ entityType: "idea", title: item.title, meta: item.description.slice(0, 72) })),
      ...notes
        .filter((item) => `${item.title} ${item.content}`.toLowerCase().includes(needle))
        .map((item) => ({ entityType: "note", title: item.title, meta: item.content.slice(0, 72) })),
      ...exploreEntries
        .filter((item) => `${item.name} ${item.website ?? ""}`.toLowerCase().includes(needle))
        .map((item) => ({ entityType: item.datasetKind, title: item.name, meta: item.website ?? item.category ?? "" })),
      ...githubTools
        .filter((item) => `${item.repoFullName} ${item.description}`.toLowerCase().includes(needle))
        .map((item) => ({ entityType: "github_tool", title: item.repoFullName, meta: item.description })),
    ].slice(0, 100);
  },
});
