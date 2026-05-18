/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  ADMIN_PERMISSION_PRESETS,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  createAdminSessionToken,
  logAdminAction,
  requireAdminSession,
} from "./adminHelpers";

async function ensureBootstrapAdmin(ctx: any) {
  const existing = await ctx.db.query("adminUsers").first();
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const adminId = await ctx.db.insert("adminUsers", {
    email: DEFAULT_ADMIN_EMAIL,
    name: "Ankit",
    password: DEFAULT_ADMIN_PASSWORD,
    role: "super_admin",
    permissions: ADMIN_PERMISSION_PRESETS.super_admin,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  const admin = await ctx.db.get(adminId);
  if (!admin) {
    throw new ConvexError("Failed to bootstrap admin");
  }
  return admin;
}

export const loginWithPassword = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    await ensureBootstrapAdmin(ctx);

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
    const expiresAt = now + 1000 * 60 * 60 * 24 * 7;
    await ctx.db.insert("adminSessions", {
      adminUserId: admin._id,
      sessionToken,
      expiresAt,
      createdAt: now,
      lastSeenAt: now,
    });
    await ctx.db.patch(admin._id, { lastLoginAt: now, updatedAt: now });
    await logAdminAction(ctx, {
      adminUserId: admin._id,
      action: "login",
      entityType: "adminSessions",
      entityId: sessionToken,
      summary: `Admin login for ${admin.email}`,
    });

    return { sessionToken, expiresAt };
  },
});

export const getSession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { session, adminUser } = await requireAdminSession(ctx, args.sessionToken);
    return {
      admin: {
        _id: adminUser._id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        permissions: adminUser.permissions,
        status: adminUser.status === "disabled" ? "deactivated" : adminUser.status,
        lastLoginAt: adminUser.lastLoginAt,
      },
      expiresAt: session.expiresAt,
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

    if (!session) {
      return null;
    }

    const admin = await ctx.db.get(session.adminUserId);
    await ctx.db.delete(session._id);

    if (admin) {
      await logAdminAction(ctx, {
        adminUserId: admin._id,
        action: "logout",
        entityType: "adminSessions",
        entityId: args.sessionToken,
        summary: `Admin logout for ${admin.email}`,
      });
    }

    return null;
  },
});

export const rotateOwnPassword = mutation({
  args: {
    sessionToken: v.string(),
    currentPassword: v.string(),
    nextPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const { adminUser } = await requireAdminSession(ctx, args.sessionToken);

    if (adminUser.password !== args.currentPassword) {
      throw new ConvexError("Current password is incorrect");
    }

    await ctx.db.patch(adminUser._id, {
      password: args.nextPassword,
      updatedAt: Date.now(),
    });
    await logAdminAction(ctx, {
      adminUserId: adminUser._id,
      action: "rotate_password",
      entityType: "adminUsers",
      entityId: adminUser._id,
      summary: `Rotated password for ${adminUser.email}`,
    });

    return true;
  },
});
