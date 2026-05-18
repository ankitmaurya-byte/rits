import { ConvexError } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

export const DEFAULT_ADMIN_EMAIL = "ankit@rits.fun";
export const DEFAULT_ADMIN_PASSWORD = "ankitisme";

export const ADMIN_PERMISSION_PRESETS: Record<string, string[]> = {
  super_admin: ["*"],
  content_admin: ["content.read", "content.edit", "content.delete", "resources.manage", "reports.manage", "roadmaps.manage"],
  data_admin: ["imports.manage", "exports.manage", "yc.manage", "sharktank.manage", "explore.manage", "startups.manage"],
  support_admin: ["users.read", "workspaces.read", "moderation.manage", "support.manage"],
  read_only_admin: ["dashboard.read", "users.read", "workspaces.read", "content.read", "audit.read"],
};

export function createAdminSessionToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function requireAdminSession(ctx: Ctx, sessionToken: string) {
  const token = sessionToken.trim();
  if (!token) {
    throw new ConvexError("Admin session token is required");
  }

  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_session_token", (q) => q.eq("sessionToken", token))
    .unique();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Admin session expired");
  }

  const adminUser = await ctx.db.get(session.adminUserId);
  if (!adminUser || adminUser.status !== "active") {
    throw new ConvexError("Admin account disabled");
  }

  return { session, adminUser } as { session: Doc<"adminSessions">; adminUser: Doc<"adminUsers"> };
}

export function hasPermission(adminUser: Doc<"adminUsers">, permission: string) {
  return adminUser.permissions.includes("*") || adminUser.permissions.includes(permission);
}

export async function requireAdminPermission(ctx: Ctx, sessionToken: string, permission: string) {
  const result = await requireAdminSession(ctx, sessionToken);
  if (!hasPermission(result.adminUser, permission)) {
    throw new ConvexError(`Missing admin permission: ${permission}`);
  }
  return result;
}

export async function logAdminAction(ctx: MutationCtx, args: {
  adminUserId: Id<"adminUsers">;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  before?: string;
  after?: string;
}) {
  await ctx.db.insert("adminAuditLogs", {
    adminUserId: args.adminUserId,
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId,
    summary: args.summary,
    before: args.before,
    after: args.after,
    createdAt: Date.now(),
  });
}
