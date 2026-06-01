import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const togglePublish = mutation({
  args: {
    boardId: v.union(v.id("kanbanBoards"), v.id("todoGroups")),
    type: v.union(v.literal("kanbanBoards"), v.literal("todoGroups")),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.boardId as any, {
      isPublished: args.isPublished,
    });
  },
});

export const addMember = mutation({
  args: {
    boardId: v.union(v.id("kanbanBoards"), v.id("todoGroups")),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("kanbanMembers")
      .withIndex("by_board_user", (q) => q.eq("boardId", args.boardId).eq("userId", args.userId))
      .first();
    if (existing) return existing._id;
    
    return await ctx.db.insert("kanbanMembers", {
      boardId: args.boardId,
      userId: args.userId,
      role: args.role,
      joinedAt: Date.now(),
    });
  },
});

export const inviteByEmail = mutation({
  args: {
    boardId: v.union(v.id("kanbanBoards"), v.id("todoGroups")),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
      
    if (!user) throw new ConvexError("User not found");
    
    const existing = await ctx.db
      .query("kanbanMembers")
      .withIndex("by_board_user", (q) => q.eq("boardId", args.boardId).eq("userId", user._id))
      .first();
      
    if (existing) throw new ConvexError("User already a member");
    
    return await ctx.db.insert("kanbanMembers", {
      boardId: args.boardId,
      userId: user._id,
      role: args.role,
      joinedAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: {
    boardId: v.union(v.id("kanbanBoards"), v.id("todoGroups")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("kanbanMembers")
      .withIndex("by_board_user", (q) => q.eq("boardId", args.boardId).eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getMembers = query({
  args: {
    boardId: v.union(v.id("kanbanBoards"), v.id("todoGroups")),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("kanbanMembers")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
      
    const users = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return { ...user, role: m.role, memberId: m._id };
      })
    );
    
    return users.filter(u => u !== null);
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});
