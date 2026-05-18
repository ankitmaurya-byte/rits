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

type ContentEntity = "ideas" | "todos" | "notes" | "resources" | "roadmaps" | "aiReports" | "resourceFolderShares" | "githubTools";

const contentEntityValidator = v.union(
  v.literal("ideas"),
  v.literal("todos"),
  v.literal("notes"),
  v.literal("resources"),
  v.literal("roadmaps"),
  v.literal("aiReports"),
  v.literal("resourceFolderShares"),
  v.literal("githubTools")
);

function summarizeRecord(record: Record<string, unknown>) {
  if (typeof record.title === "string") return record.title;
  if (typeof record.name === "string") return record.name;
  if (typeof record.email === "string") return record.email;
  if (typeof record.url === "string") return record.url;
  return "Untitled";
}

async function countAll(ctx: any, table: string) {
  return (await ctx.db.query(table).collect()).length;
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
    await requireAdminPermission(ctx, args.sessionToken, "dashboard.read");
    const [users, workspaces, ideas, todos, notes, resources, roadmaps, reports, githubTools, moderationOpen] = await Promise.all([
      countAll(ctx, "users"),
      countAll(ctx, "workspaces"),
      countAll(ctx, "ideas"),
      countAll(ctx, "todos"),
      countAll(ctx, "notes"),
      countAll(ctx, "resources"),
      countAll(ctx, "roadmaps"),
      countAll(ctx, "aiReports"),
      countAll(ctx, "githubTools"),
      (await ctx.db.query("moderationReports").withIndex("by_status", (q) => q.eq("status", "open")).collect()).length,
    ]);

    const latestUsers = await ctx.db.query("users").order("desc").take(10);

    return {
      totals: { users, workspaces, ideas, todos, notes, resources, roadmaps, reports, githubTools, moderationOpen },
      latestUsers,
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
  args: { sessionToken: v.string(), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "users.read");
    const query = args.search?.trim().toLowerCase() ?? "";
    const users = await ctx.db.query("users").collect();
    return users.filter((user) => !query || `${user.name} ${user.email} ${user.currentCompany ?? ""}`.toLowerCase().includes(query));
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
    const workspaces = await ctx.db.query("workspaces").collect();
    return workspaces.filter((workspace) => !query || `${workspace.name} ${workspace.description ?? ""}`.toLowerCase().includes(query));
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
    entityType: contentEntityValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminPermission(ctx, args.sessionToken, "content.read");
    const records = await fetchContentRecords(ctx, args.entityType);
    const query = args.search?.trim().toLowerCase() ?? "";
    return records.filter((record: Record<string, unknown>) => !query || JSON.stringify(record).toLowerCase().includes(query)).map((record: Record<string, unknown>) => ({
      ...record,
      _adminSummary: summarizeRecord(record),
    }));
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
    return await ctx.db.query("adminAuditLogs").collect();
  },
});
