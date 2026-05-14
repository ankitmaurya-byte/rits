import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    tokenIdentifier: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    status: v.optional(v.string()),
    bio: v.optional(v.string()),
    description: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_token_identifier", ["tokenIdentifier"]),

  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    inviteToken: v.optional(v.string()), // optional for existing records; always set on create
  }).index("by_invite_token", ["inviteToken"]),

  // Many-to-many: users <-> workspaces
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  // Email invites (pending)
  workspaceInvites: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    token: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    invitedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"]),

  ideas: defineTable({
    // scope: "private" = personal only, "workspace" = belongs to a workspace
    // Optional for backward compat with existing records; defaults to "workspace" if missing
    scope: v.optional(v.union(v.literal("private"), v.literal("workspace"))),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user_private", ["createdBy", "scope"]),

  todos: defineTable({
    scope: v.optional(v.union(v.literal("private"), v.literal("workspace"))),
    workspaceId: v.optional(v.id("workspaces")),
    groupId: v.optional(v.union(v.id("todoGroups"), v.null())),
    title: v.string(),
    sourceUrl: v.optional(v.string()),
    sourceDescription: v.optional(v.string()),
    completed: v.boolean(),
    status: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    priority: v.string(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user_private", ["createdBy", "scope"]),

  notes: defineTable({
    scope: v.optional(v.union(v.literal("private"), v.literal("workspace"))),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    content: v.string(),
    createdBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user_private", ["createdBy", "scope"]),

  todoGroups: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  resources: defineTable({
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    url: v.string(),
    description: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user_private", ["createdBy", "scope"]),

  chatConversations: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    agentKey: v.optional(v.string()),
    scopeMode: v.optional(
      v.union(v.literal("private"), v.literal("current"), v.literal("all"))
    ),
    focusWorkspaceId: v.optional(v.id("workspaces")),
    lastMessagePreview: v.optional(v.string()),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner_and_updated_at", ["ownerId", "updatedAt"]),

  chatMessages: defineTable({
    conversationId: v.id("chatConversations"),
    ownerId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    model: v.optional(v.string()),
    citations: v.optional(
      v.array(
        v.object({
          refId: v.string(),
          itemType: v.union(
            v.literal("idea"),
            v.literal("todo"),
            v.literal("note"),
            v.literal("resource")
          ),
          itemId: v.string(),
          title: v.string(),
          scope: v.union(v.literal("private"), v.literal("workspace")),
          href: v.string(),
          workspaceId: v.optional(v.id("workspaces")),
          workspaceName: v.optional(v.string()),
        })
      )
    ),
    createdAt: v.number(),
  }).index("by_conversation_and_created_at", ["conversationId", "createdAt"]),
});
