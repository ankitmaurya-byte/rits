import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { findCurrentUser, requireCurrentUser } from "./authHelpers";

const notePermissionValidator = v.union(v.literal("read"), v.literal("comment"), v.literal("edit"));

type NotePermission = "read" | "comment" | "edit";
type DbCtx = QueryCtx | MutationCtx;

function createShareToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function permissionRank(permission: NotePermission) {
  if (permission === "edit") return 3;
  if (permission === "comment") return 2;
  return 1;
}

async function isWorkspaceMember(ctx: DbCtx, workspaceId: Id<"workspaces"> | undefined, userId: Id<"users">) {
  if (!workspaceId) return false;
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
    .first();
  return Boolean(membership);
}

async function canManageNote(ctx: DbCtx, note: Doc<"notes">, userId: Id<"users">) {
  if (note.createdBy === userId) return true;
  if (note.workspaceId) return await isWorkspaceMember(ctx, note.workspaceId, userId);
  return false;
}

async function requireManageNote(ctx: DbCtx, noteId: Id<"notes">) {
  const { user } = await requireCurrentUser(ctx);
  const note = await ctx.db.get(noteId);
  if (!note) throw new ConvexError("Note not found");
  if (!(await canManageNote(ctx, note, user._id))) throw new ConvexError("You do not have access to share this note");
  return { user, note };
}

async function findPublicShare(ctx: DbCtx, noteId: Id<"notes">) {
  const shares = await ctx.db
    .query("noteShares")
    .withIndex("by_note", (q) => q.eq("noteId", noteId))
    .collect();
  return shares.find((share) => !share.targetUserId && !share.targetEmail) ?? null;
}

async function getShareAccessByToken(ctx: DbCtx, shareToken: string) {
  const share = await ctx.db
    .query("noteShares")
    .withIndex("by_share_token", (q) => q.eq("shareToken", shareToken))
    .first();
  if (!share) throw new ConvexError("Share link not found");

  const note = await ctx.db.get(share.noteId);
  if (!note) throw new ConvexError("Note not found");

  const current = await findCurrentUser(ctx).catch(() => null);
  const currentUser = current?.user ?? null;
  const isManager = currentUser ? await canManageNote(ctx, note, currentUser._id) : false;
  const isPublicLink = share.linkAccess === "public" && !share.targetUserId && !share.targetEmail;
  const isInvitedUser = Boolean(
    currentUser && (
      share.targetUserId === currentUser._id ||
      (share.targetEmail && currentUser.email.toLowerCase() === share.targetEmail)
    )
  );

  if (!isPublicLink && !isInvitedUser && !isManager) {
    throw new ConvexError("This share is restricted");
  }

  return { share, note, currentUser, isManager };
}

// Get notes for a workspace
export const getNotes = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .order("desc")
      .take(100);
  },
});

// Get private notes for a user
export const getPrivateNotes = query({
  args: {
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_user_private", (q) =>
        q.eq("createdBy", args.createdBy).eq("scope", "private")
      )
      .order("desc")
      .take(100);
  },
});

export const createNote = mutation({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    content: v.string(),
    kind: v.optional(v.union(v.literal("folder"), v.literal("file"))),
    fileType: v.optional(v.union(v.literal("text"), v.literal("database"), v.literal("hierarchy"))),
    parentId: v.optional(v.id("notes")),
    sortOrder: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notes", {
      ...args,
      sortOrder: args.sortOrder ?? Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("folder"), v.literal("file"))),
    fileType: v.optional(v.union(v.literal("text"), v.literal("database"), v.literal("hierarchy"))),
    parentId: v.optional(v.union(v.id("notes"), v.null())),
    sortOrder: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, parentId, ...fields } = args;
    const patchObj: {
      title?: string;
      content?: string;
      kind?: "folder" | "file";
      fileType?: "text" | "database" | "hierarchy";
      sortOrder?: number;
      isPinned?: boolean;
      parentId?: Id<"notes"> | undefined;
      updatedAt: number;
    } = {
      ...fields,
      updatedAt: Date.now(),
    };
    if (parentId !== undefined) patchObj.parentId = parentId === null ? undefined : parentId;
    return await ctx.db.patch(id, patchObj);
  },
});

export const deleteNote = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const queue = [args.id];
    while (queue.length > 0) {
      const currentId = queue.pop()!;
      // Find children
      const children = await ctx.db
        .query("notes")
        .withIndex("by_parent", (q) => q.eq("parentId", currentId))
        .collect();
      
      for (const child of children) {
        queue.push(child._id);
      }
      
      // Delete current
      await ctx.db.delete(currentId);
    }
  },
});

export const getNoteShareSettings = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const { note } = await requireManageNote(ctx, args.noteId);
    const shares = await ctx.db
      .query("noteShares")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .collect();
    const publicShare = shares.find((share) => !share.targetUserId && !share.targetEmail) ?? null;
    const invitedShares = shares.filter((share) => share.targetUserId || share.targetEmail);

    const invited = await Promise.all(invitedShares.map(async (share) => {
      const user = share.targetUserId ? await ctx.db.get(share.targetUserId) : null;
      return {
        _id: share._id,
        shareToken: share.shareToken,
        email: user?.email ?? share.targetEmail ?? "",
        name: user?.name ?? share.targetEmail ?? "Invited user",
        image: user?.image ?? null,
        permission: share.permission,
      };
    }));

    return {
      noteId: note._id,
      publicShare: publicShare ? {
        _id: publicShare._id,
        shareToken: publicShare.shareToken,
        linkAccess: publicShare.linkAccess,
        permission: publicShare.permission,
      } : null,
      invited,
    };
  },
});

export const setNotePublicShare = mutation({
  args: {
    noteId: v.id("notes"),
    linkAccess: v.union(v.literal("restricted"), v.literal("public")),
    permission: notePermissionValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireManageNote(ctx, args.noteId);
    const now = Date.now();
    const existing = await findPublicShare(ctx, args.noteId);

    if (existing) {
      await ctx.db.patch(existing._id, {
        linkAccess: args.linkAccess,
        permission: args.permission,
        updatedAt: now,
      });
      return { shareToken: existing.shareToken };
    }

    const shareToken = createShareToken();
    await ctx.db.insert("noteShares", {
      noteId: args.noteId,
      ownerId: user._id,
      shareToken,
      linkAccess: args.linkAccess,
      permission: args.permission,
      createdAt: now,
      updatedAt: now,
    });
    return { shareToken };
  },
});

export const inviteNoteUser = mutation({
  args: {
    noteId: v.id("notes"),
    email: v.string(),
    permission: notePermissionValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireManageNote(ctx, args.noteId);
    const email = normalizeEmail(args.email);
    if (!email || !email.includes("@")) throw new ConvexError("Enter a valid email address");

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const shares = await ctx.db
      .query("noteShares")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .collect();
    const existing = shares.find((share) =>
      (targetUser && share.targetUserId === targetUser._id) ||
      share.targetEmail === email
    );
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        targetUserId: targetUser?._id,
        targetEmail: email,
        permission: args.permission,
        updatedAt: now,
      });
      return { shareToken: existing.shareToken };
    }

    const shareToken = createShareToken();
    await ctx.db.insert("noteShares", {
      noteId: args.noteId,
      ownerId: user._id,
      shareToken,
      targetUserId: targetUser?._id,
      targetEmail: email,
      linkAccess: "restricted",
      permission: args.permission,
      createdAt: now,
      updatedAt: now,
    });
    return { shareToken };
  },
});

export const removeNoteInvite = mutation({
  args: {
    noteId: v.id("notes"),
    shareId: v.id("noteShares"),
  },
  handler: async (ctx, args) => {
    await requireManageNote(ctx, args.noteId);
    const share = await ctx.db.get(args.shareId);
    if (!share || share.noteId !== args.noteId || (!share.targetUserId && !share.targetEmail)) {
      throw new ConvexError("Invite not found");
    }
    await ctx.db.delete(args.shareId);
    return true;
  },
});

export const getSharedNoteByToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const { share, note, currentUser, isManager } = await getShareAccessByToken(ctx, args.shareToken);
    return {
      note,
      permission: isManager ? "edit" : share.permission,
      viewerName: currentUser?.name ?? null,
      canComment: permissionRank(isManager ? "edit" : share.permission) >= permissionRank("comment"),
      canEdit: permissionRank(isManager ? "edit" : share.permission) >= permissionRank("edit"),
    };
  },
});

export const updateSharedNoteByToken = mutation({
  args: {
    shareToken: v.string(),
    content: v.string(),
    fileType: v.optional(v.union(v.literal("text"), v.literal("database"), v.literal("hierarchy"))),
  },
  handler: async (ctx, args) => {
    const { share, note, isManager } = await getShareAccessByToken(ctx, args.shareToken);
    const permission = isManager ? "edit" : share.permission;
    if (permissionRank(permission) < permissionRank("edit")) {
      throw new ConvexError("This link does not allow edits");
    }

    await ctx.db.patch(note._id, {
      content: args.content,
      fileType: args.fileType ?? note.fileType,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const listSharedNoteComments = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const { note } = await getShareAccessByToken(ctx, args.shareToken);
    return await ctx.db
      .query("noteComments")
      .withIndex("by_note", (q) => q.eq("noteId", note._id))
      .order("desc")
      .take(100);
  },
});

export const addSharedNoteComment = mutation({
  args: {
    shareToken: v.string(),
    body: v.string(),
    authorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { share, note, currentUser, isManager } = await getShareAccessByToken(ctx, args.shareToken);
    const permission = isManager ? "edit" : share.permission;
    if (permissionRank(permission) < permissionRank("comment")) {
      throw new ConvexError("This link does not allow comments");
    }

    const body = args.body.trim();
    if (!body) throw new ConvexError("Comment cannot be empty");

    return await ctx.db.insert("noteComments", {
      noteId: note._id,
      shareToken: args.shareToken,
      authorUserId: currentUser?._id,
      authorName: currentUser?.name ?? args.authorName?.trim() ?? "Guest",
      body,
      createdAt: Date.now(),
    });
  },
});
