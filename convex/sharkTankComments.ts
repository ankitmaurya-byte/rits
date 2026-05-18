import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const listByPitch = query({
  args: { pitchId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("sharkTankComments")
      .withIndex("by_pitch_id_and_created_at", (q) => q.eq("pitchId", args.pitchId))
      .order("desc")
      .take(100);

    const comments = rows.reverse();
    const users = await Promise.all(comments.map((comment) => ctx.db.get(comment.createdBy)));

    return comments.map((comment, index) => ({
      ...comment,
      authorName: users[index]?.name ?? "Unknown",
      authorImage: users[index]?.image,
    }));
  },
});

export const create = mutation({
  args: {
    pitchId: v.string(),
    body: v.string(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const body = args.body.trim();
    if (!body) {
      throw new ConvexError("Comment cannot be empty.");
    }

    return await ctx.db.insert("sharkTankComments", {
      pitchId: args.pitchId,
      body,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});
