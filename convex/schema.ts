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
    description: v.optional(v.string()),
    customFields: v.optional(
      v.array(
        v.object({
          key: v.string(),
          value: v.string(),
        })
      )
    ),
    sourceUrl: v.optional(v.string()),
    sourceDescription: v.optional(v.string()),
    completed: v.boolean(),
    status: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    priority: v.string(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
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
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    name: v.string(),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["createdBy"]),

  vaults: defineTable({
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_created_by_and_scope", ["createdBy", "scope"]),

  vaultEntries: defineTable({
    vaultId: v.id("vaults"),
    kind: v.union(v.literal("folder"), v.literal("file")),
    parentEntryId: v.optional(v.id("vaultEntries")),
    name: v.string(),
    fileUrl: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_vault", ["vaultId"])
    .index("by_vault_and_parent_entry_id", ["vaultId", "parentEntryId"]),

  githubTools: defineTable({
    sourceType: v.union(v.literal("github_fetch"), v.literal("manual")),
    repoFullName: v.string(),
    owner: v.string(),
    name: v.string(),
    htmlUrl: v.string(),
    description: v.string(),
    homepageUrl: v.optional(v.string()),
    language: v.optional(v.string()),
    stars: v.number(),
    forks: v.number(),
    openIssues: v.number(),
    topics: v.array(v.string()),
    license: v.optional(v.string()),
    defaultBranch: v.optional(v.string()),
    isArchived: v.boolean(),
    readme: v.optional(v.string()),
    readmeFetchedAt: v.optional(v.number()),
    aiSummary: v.optional(v.string()),
    aiUseCases: v.optional(v.string()),
    aiOpportunity: v.optional(v.string()),
    aiAnalysis: v.optional(v.string()),
    fetchMode: v.optional(v.union(v.literal("trending"), v.literal("stars"))),
    searchQuery: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncedAt: v.optional(v.number()),
  })
    .index("by_repo_full_name", ["repoFullName"])
    .index("by_created_at", ["createdAt"]),

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

  friendRequests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    pairKey: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_to_user_and_status", ["toUserId", "status"])
    .index("by_from_user_and_status", ["fromUserId", "status"])
    .index("by_pair_key", ["pairKey"]),

  friendships: defineTable({
    userAId: v.id("users"),
    userBId: v.id("users"),
    pairKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_user_a", ["userAId"])
    .index("by_user_b", ["userBId"])
    .index("by_pair_key", ["pairKey"]),

  socialChatRooms: defineTable({
    scope: v.union(v.literal("private"), v.literal("workspace")),
    roomType: v.union(v.literal("direct"), v.literal("workspace"), v.literal("ai")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    objective: v.optional(v.string()),
    pairKey: v.optional(v.string()),
    createdBy: v.id("users"),
    lastMessagePreview: v.optional(v.string()),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace_and_updated_at", ["workspaceId", "updatedAt"])
    .index("by_pair_key", ["pairKey"]),

  socialChatParticipants: defineTable({
    roomId: v.id("socialChatRooms"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member"), v.literal("ai")),
    lastReadAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_room_and_user", ["roomId", "userId"]),

  socialChatMessages: defineTable({
    roomId: v.id("socialChatRooms"),
    senderId: v.optional(v.id("users")),
    senderKind: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
    body: v.string(),
    messageType: v.union(v.literal("text"), v.literal("share"), v.literal("analysis")),
    shareType: v.optional(v.union(v.literal("idea"), v.literal("note"), v.literal("resource"))),
    shareTitle: v.optional(v.string()),
    shareDescription: v.optional(v.string()),
    shareMeta: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_room_and_created_at", ["roomId", "createdAt"]),

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
