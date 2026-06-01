import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getNotifications = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_user_and_created_at", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isRead: true });
  },
});

export const markAllAsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_is_read", (q) => q.eq("userId", args.userId).eq("isRead", false))
      .collect();
    
    for (const notif of unread) {
      await ctx.db.patch(notif._id, { isRead: true });
    }
  },
});
