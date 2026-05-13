import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper: generate a random token
function generateToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// Helper: get current user from explicit clerkId argument
async function requireUser(ctx: any, clerkId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
    .first();
  if (!user) throw new ConvexError("User not found");
  return user;
}

// Create a new workspace
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);
    const inviteToken = generateToken();

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name.trim(),
      description: args.description?.trim(),
      ownerId: user._id,
      inviteToken,
    });

    // Add creator as owner member
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: user._id,
      role: "owner",
    });

    return workspaceId;
  },
});

// Get all workspaces the current user belongs to
export const getMyWorkspaces = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.clerkId) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId!))
      .first();
    if (!user) return [];

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const ws = await ctx.db.get(m.workspaceId);
        return ws ? { ...ws, role: m.role } : null;
      })
    );

    return workspaces.filter(Boolean);
  },
});

// Get a single workspace by ID (only if member)
export const getWorkspaceById = query({
  args: { workspaceId: v.id("workspaces"), clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.clerkId) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId!))
      .first();
    if (!user) return null;

    // Check membership
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", user._id)
      )
      .first();
    if (!membership) return null;

    const ws = await ctx.db.get(args.workspaceId);
    return ws ? { ...ws, role: membership.role } : null;
  },
});

// Get workspace info by invite token (public — for join page preview)
export const getWorkspaceByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const ws = await ctx.db
      .query("workspaces")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.token))
      .first();
    if (!ws) return null;
    // Return limited info (no sensitive fields)
    return { _id: ws._id, name: ws.name, description: ws.description };
  },
});

// Join a workspace via invite token
export const joinByToken = mutation({
  args: { token: v.string(), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);

    const ws = await ctx.db
      .query("workspaces")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.token))
      .first();
    if (!ws) throw new ConvexError("Invalid invite link");

    // Check if already a member
    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", ws._id).eq("userId", user._id)
      )
      .first();
    if (existing) return ws._id; // Already a member, just return id

    await ctx.db.insert("workspaceMembers", {
      workspaceId: ws._id,
      userId: user._id,
      role: "member",
    });

    return ws._id;
  },
});

// Regenerate invite token (owner only)
export const regenerateInviteToken = mutation({
  args: { workspaceId: v.id("workspaces"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);

    const ws = await ctx.db.get(args.workspaceId);
    if (!ws) throw new ConvexError("Workspace not found");
    if (ws.ownerId !== user._id) throw new ConvexError("Only the owner can regenerate the invite token");

    const newToken = generateToken();
    await ctx.db.patch(args.workspaceId, { inviteToken: newToken });
    return newToken;
  },
});

// Invite a user by email (stores invite record)
export const inviteByEmail = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);

    // Check if inviter is a member
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", user._id)
      )
      .first();
    if (!membership) throw new ConvexError("You are not a member of this workspace");

    // Check for existing pending invite
    const existing = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .first();
    if (existing && existing.status === "pending" && existing.workspaceId === args.workspaceId) {
      return existing.token; // Return existing invite token
    }

    const token = generateToken();
    await ctx.db.insert("workspaceInvites", {
      workspaceId: args.workspaceId,
      email: args.email.toLowerCase().trim(),
      token,
      status: "pending",
      invitedBy: user._id,
      createdAt: Date.now(),
    });

    return token;
  },
});

// Get workspace members list
export const getWorkspaceMembers = query({
  args: { workspaceId: v.id("workspaces"), clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.clerkId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId!))
      .first();
    if (!currentUser) return [];

    // Only members can list members
    const myMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", currentUser._id)
      )
      .first();
    if (!myMembership) return [];

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return u ? { ...u, role: m.role, memberId: m._id } : null;
      })
    );

    return members.filter(Boolean);
  },
});

// Get pending invites for a workspace
export const getPendingInvites = query({
  args: { workspaceId: v.id("workspaces"), clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.clerkId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId!))
      .first();
    if (!currentUser) return [];

    const myMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", currentUser._id)
      )
      .first();
    if (!myMembership) return [];

    return await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .take(50);
  },
});

// Remove a member from workspace (owner only, or self-leave)
export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireUser(ctx, args.clerkId);
    const ws = await ctx.db.get(args.workspaceId);
    if (!ws) throw new ConvexError("Workspace not found");

    const isOwner = ws.ownerId === currentUser._id;
    const isSelf = currentUser._id === args.userId;
    if (!isOwner && !isSelf) throw new ConvexError("Not authorized");
    if (isOwner && isSelf) throw new ConvexError("Owner cannot leave workspace");

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();
    if (membership) await ctx.db.delete(membership._id);
  },
});
