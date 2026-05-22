import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";

async function getUserByClerkId(ctx: MutationCtx, clerkId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .first();
  if (!user) throw new ConvexError("User not found");
  return user;
}

async function requireWorkspaceAccess(ctx: MutationCtx, workspaceId: Id<"workspaces">, clerkId: string) {
  const user = await getUserByClerkId(ctx, clerkId);
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) throw new ConvexError("Workspace not found");
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) => q.eq("workspaceId", workspaceId).eq("userId", user._id))
    .first();
  if (!membership && workspace.ownerId !== user._id) {
    throw new ConvexError("Workspace access required");
  }
  return user;
}

async function createSheetRecord(ctx: MutationCtx, args: {
  scope: "private" | "workspace";
  workspaceId?: Id<"workspaces">;
  createdBy?: Id<"users">;
  name: string;
}) {
  const existing = args.scope === "workspace"
    ? await ctx.db
        .query("todoExcelSheets")
        .withIndex("by_workspace_and_order", (q) => q.eq("workspaceId", args.workspaceId))
        .collect()
    : await ctx.db
        .query("todoExcelSheets")
        .withIndex("by_user_and_order", (q) => q.eq("createdBy", args.createdBy))
        .collect();
  const now = Date.now();
  return await ctx.db.insert("todoExcelSheets", {
    scope: args.scope,
    workspaceId: args.workspaceId,
    createdBy: args.createdBy,
    name: args.name.trim() || `Sheet ${existing.length + 1}`,
    order: existing.length,
    rowCount: 30,
    columnCount: 12,
    createdAt: now,
    updatedAt: now,
  });
}

export const getWorkspaceSheets = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todoExcelSheets")
      .withIndex("by_workspace_and_order", (q) => q.eq("workspaceId", args.workspaceId))
      .order("asc")
      .collect();
  },
});

export const getPrivateSheets = query({
  args: { createdBy: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todoExcelSheets")
      .withIndex("by_user_and_order", (q) => q.eq("createdBy", args.createdBy))
      .order("asc")
      .collect();
  },
});

export const getSheetRows = query({
  args: { sheetId: v.id("todoExcelSheets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todoExcelRows")
      .withIndex("by_sheet_and_row_index", (q) => q.eq("sheetId", args.sheetId))
      .order("asc")
      .collect();
  },
});

export const createWorkspaceSheet = mutation({
  args: { workspaceId: v.id("workspaces"), clerkId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, args.clerkId);
    return await createSheetRecord(ctx, { scope: "workspace", workspaceId: args.workspaceId, name: args.name });
  },
});

export const createPrivateSheet = mutation({
  args: { createdBy: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    return await createSheetRecord(ctx, { scope: "private", createdBy: args.createdBy, name: args.name });
  },
});

export const renameSheet = mutation({
  args: { sheetId: v.id("todoExcelSheets"), name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sheetId, { name: args.name.trim() || "Untitled Sheet", updatedAt: Date.now() });
  },
});

export const addRow = mutation({
  args: { sheetId: v.id("todoExcelSheets"), count: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.sheetId);
    if (!sheet) throw new ConvexError("Sheet not found");
    const count = Math.max(1, Math.min(1000, Math.floor(args.count ?? 1)));
    await ctx.db.patch(args.sheetId, { rowCount: sheet.rowCount + count, updatedAt: Date.now() });
  },
});

export const addColumn = mutation({
  args: { sheetId: v.id("todoExcelSheets"), count: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.sheetId);
    if (!sheet) throw new ConvexError("Sheet not found");
    const count = Math.max(1, Math.min(200, Math.floor(args.count ?? 1)));
    await ctx.db.patch(args.sheetId, { columnCount: sheet.columnCount + count, updatedAt: Date.now() });
  },
});

export const updateCell = mutation({
  args: {
    sheetId: v.id("todoExcelSheets"),
    rowIndex: v.number(),
    columnKey: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("todoExcelRows")
      .withIndex("by_sheet_and_row_index", (q) => q.eq("sheetId", args.sheetId).eq("rowIndex", args.rowIndex))
      .unique();
    const now = Date.now();
    if (!existing) {
      if (!args.value) return;
      await ctx.db.insert("todoExcelRows", {
        sheetId: args.sheetId,
        rowIndex: args.rowIndex,
        cells: { [args.columnKey]: args.value },
        updatedAt: now,
      });
      return;
    }
    const nextCells = { ...existing.cells };
    if (args.value) nextCells[args.columnKey] = args.value;
    else delete nextCells[args.columnKey];
    await ctx.db.patch(existing._id, { cells: nextCells, updatedAt: now });
  },
});

export const batchUpdateCells = mutation({
  args: {
    sheetId: v.id("todoExcelSheets"),
    updates: v.array(v.object({ rowIndex: v.number(), columnKey: v.string(), value: v.string() })),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      const existing = await ctx.db
        .query("todoExcelRows")
        .withIndex("by_sheet_and_row_index", (q) => q.eq("sheetId", args.sheetId).eq("rowIndex", update.rowIndex))
        .unique();
      const now = Date.now();
      if (!existing) {
        if (!update.value) continue;
        await ctx.db.insert("todoExcelRows", {
          sheetId: args.sheetId,
          rowIndex: update.rowIndex,
          cells: { [update.columnKey]: update.value },
          updatedAt: now,
        });
        continue;
      }
      const nextCells = { ...existing.cells };
      if (update.value) nextCells[update.columnKey] = update.value;
      else delete nextCells[update.columnKey];
      await ctx.db.patch(existing._id, { cells: nextCells, updatedAt: now });
    }
  },
});
