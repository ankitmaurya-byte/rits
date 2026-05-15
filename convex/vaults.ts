import { ConvexError, v } from "convex/values";

import { Doc, Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { requireCurrentUser } from "./authHelpers";

type DbCtx = QueryCtx | MutationCtx;

async function requireVaultAccess(ctx: DbCtx, vaultId: Id<"vaults">) {
  const { user } = await requireCurrentUser(ctx);
  const vault = await ctx.db.get(vaultId);

  if (!vault) {
    throw new ConvexError("Vault not found");
  }

  if (vault.scope === "private") {
    if (vault.createdBy !== user._id) {
      throw new ConvexError("You do not have access to this vault");
    }

    return { user, vault };
  }

  if (!vault.workspaceId) {
    throw new ConvexError("Workspace vault is missing a workspace");
  }

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) =>
      q.eq("workspaceId", vault.workspaceId!).eq("userId", user._id)
    )
    .first();

  if (!membership) {
    throw new ConvexError("Only workspace members can access this vault");
  }

  return { user, vault };
}

function folderAncestors(
  entries: Doc<"vaultEntries">[],
  parentEntryId: Id<"vaultEntries"> | null
) {
  if (!parentEntryId) {
    return [] as Doc<"vaultEntries">[];
  }

  const entryById = new Map(entries.map((entry) => [entry._id, entry]));
  const chain: Doc<"vaultEntries">[] = [];
  let currentId: Id<"vaultEntries"> | null = parentEntryId;

  while (currentId) {
    const current = entryById.get(currentId);
    if (!current) {
      break;
    }

    chain.unshift(current);
    currentId = current.parentEntryId ?? null;
  }

  return chain;
}

export const getPrivateVaults = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);

    return await ctx.db
      .query("vaults")
      .withIndex("by_created_by_and_scope", (q) =>
        q.eq("createdBy", user._id).eq("scope", "private")
      )
      .order("desc")
      .take(50);
  },
});

export const getWorkspaceVaults = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", user._id)
      )
      .first();

    if (!membership) {
      return [];
    }

    return await ctx.db
      .query("vaults")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(50);
  },
});

export const getVault = query({
  args: { vaultId: v.id("vaults") },
  handler: async (ctx, args) => {
    const { vault } = await requireVaultAccess(ctx, args.vaultId);
    return vault;
  },
});

export const getVaultEntries = query({
  args: {
    vaultId: v.id("vaults"),
    parentEntryId: v.union(v.id("vaultEntries"), v.null()),
  },
  handler: async (ctx, args) => {
    await requireVaultAccess(ctx, args.vaultId);

    const allEntries = await ctx.db
      .query("vaultEntries")
      .withIndex("by_vault", (q) => q.eq("vaultId", args.vaultId))
      .order("asc")
      .take(500);

    const currentEntries = allEntries.filter((entry) => (entry.parentEntryId ?? null) === args.parentEntryId);
    const breadcrumbs = folderAncestors(allEntries, args.parentEntryId);

    return {
      breadcrumbs,
      folders: allEntries.filter((entry) => entry.kind === "folder"),
      entries: currentEntries.sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === "folder" ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      }),
    };
  },
});

export const createVault = mutation({
  args: {
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const name = args.name.trim();

    if (!name) {
      throw new ConvexError("Vault name is required");
    }

    if (args.scope === "workspace") {
      if (!args.workspaceId) {
        throw new ConvexError("Workspace vaults require a workspace");
      }

      const membership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId!).eq("userId", user._id)
        )
        .first();

      if (!membership) {
        throw new ConvexError("Only workspace members can create workspace vaults");
      }
    }

    const now = Date.now();

    return await ctx.db.insert("vaults", {
      scope: args.scope,
      workspaceId: args.scope === "workspace" ? args.workspaceId : undefined,
      name,
      description: args.description?.trim() || undefined,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createFolder = mutation({
  args: {
    vaultId: v.id("vaults"),
    parentEntryId: v.union(v.id("vaultEntries"), v.null()),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, vault } = await requireVaultAccess(ctx, args.vaultId);
    const name = args.name.trim();

    if (!name) {
      throw new ConvexError("Folder name is required");
    }

    if (args.parentEntryId) {
      const parent = await ctx.db.get(args.parentEntryId);
      if (!parent || parent.vaultId !== args.vaultId || parent.kind !== "folder") {
        throw new ConvexError("Parent folder not found");
      }
    }

    const now = Date.now();
    const entryId = await ctx.db.insert("vaultEntries", {
      vaultId: args.vaultId,
      kind: "folder",
      parentEntryId: args.parentEntryId ?? undefined,
      name,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(vault._id, { updatedAt: now });
    return entryId;
  },
});

export const createFile = mutation({
  args: {
    vaultId: v.id("vaults"),
    parentEntryId: v.union(v.id("vaultEntries"), v.null()),
    name: v.string(),
    fileUrl: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const { user, vault } = await requireVaultAccess(ctx, args.vaultId);
    const name = args.name.trim();

    if (!name) {
      throw new ConvexError("File name is required");
    }

    if (args.sizeBytes > 1024 * 1024) {
      throw new ConvexError("Files must be 1MB or smaller");
    }

    if (args.parentEntryId) {
      const parent = await ctx.db.get(args.parentEntryId);
      if (!parent || parent.vaultId !== args.vaultId || parent.kind !== "folder") {
        throw new ConvexError("Parent folder not found");
      }
    }

    const now = Date.now();
    const entryId = await ctx.db.insert("vaultEntries", {
      vaultId: args.vaultId,
      kind: "file",
      parentEntryId: args.parentEntryId ?? undefined,
      name,
      fileUrl: args.fileUrl.trim(),
      mimeType: args.mimeType.trim(),
      sizeBytes: args.sizeBytes,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(vault._id, { updatedAt: now });
    return entryId;
  },
});

export const deleteEntry = mutation({
  args: { entryId: v.id("vaultEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Entry not found");
    }

    const { vault } = await requireVaultAccess(ctx, entry.vaultId);

    if (entry.kind === "folder") {
      const children = await ctx.db
        .query("vaultEntries")
        .withIndex("by_vault_and_parent_entry_id", (q) =>
          q.eq("vaultId", entry.vaultId).eq("parentEntryId", entry._id)
        )
        .take(1);

      if (children.length > 0) {
        throw new ConvexError("Delete child items before removing this folder");
      }
    }

    await ctx.db.delete(entry._id);
    await ctx.db.patch(vault._id, { updatedAt: Date.now() });
  },
});
