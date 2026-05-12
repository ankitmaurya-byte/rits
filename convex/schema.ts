import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
  }),

  workspaces: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
  }),

  ideas: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  todos: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    completed: v.boolean(),
    status: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    priority: v.string(),
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  notes: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),
});