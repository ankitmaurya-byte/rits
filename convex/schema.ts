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
    suspendedAt: v.optional(v.number()),
    strikeCount: v.optional(v.number()),
    cooldownUntil: v.optional(v.number()),
    bio: v.optional(v.string()),
    description: v.optional(v.string()),
    currentCompany: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_token_identifier", ["tokenIdentifier"]),

  adminUsers: defineTable({
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: v.union(
      v.literal("super_admin"),
      v.literal("content_admin"),
      v.literal("data_admin"),
      v.literal("support_admin"),
      v.literal("read_only_admin")
    ),
    permissions: v.array(v.string()),
    status: v.union(v.literal("active"), v.literal("disabled")),
    linkedUserId: v.optional(v.id("users")),
    createdBy: v.optional(v.id("adminUsers")),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  adminSessions: defineTable({
    adminUserId: v.id("adminUsers"),
    sessionToken: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_session_token", ["sessionToken"])
    .index("by_admin_user", ["adminUserId"]),

  adminAuditLogs: defineTable({
    adminUserId: v.id("adminUsers"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    summary: v.string(),
    before: v.optional(v.string()),
    after: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_admin_user", ["adminUserId"])
    .index("by_entity_type", ["entityType"])
    .index("by_created_at", ["createdAt"]),

  adminFeatureFlags: defineTable({
    key: v.string(),
    label: v.string(),
    enabled: v.boolean(),
    description: v.optional(v.string()),
    updatedBy: v.optional(v.id("adminUsers")),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  moderationReports: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    reportedByUserId: v.optional(v.id("users")),
    reason: v.string(),
    status: v.union(v.literal("open"), v.literal("reviewed"), v.literal("resolved"), v.literal("dismissed")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_entity_type_and_entity_id", ["entityType", "entityId"]),

  moderationActions: defineTable({
    reportId: v.optional(v.id("moderationReports")),
    adminUserId: v.id("adminUsers"),
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_admin_user", ["adminUserId"]),

  importJobs: defineTable({
    sourceType: v.string(),
    fileName: v.string(),
    status: v.union(v.literal("queued"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    stats: v.optional(v.string()),
    errors: v.optional(v.string()),
    payload: v.optional(v.string()),
    createdBy: v.id("adminUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_source_type", ["sourceType"])
    .index("by_status", ["status"])
    .index("by_created_by", ["createdBy"]),

  exploreEntries: defineTable({
    datasetKind: v.union(
      v.literal("yc"),
      v.literal("shark_tank"),
      v.literal("startup_hunt"),
      v.literal("ai_startups")
    ),
    slug: v.string(),
    name: v.string(),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    tags: v.array(v.string()),
    metadata: v.optional(v.string()),
    createdBy: v.id("adminUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dataset_kind", ["datasetKind"])
    .index("by_dataset_kind_and_slug", ["datasetKind", "slug"]),

  marketplaceProducts: defineTable({
    sellerId: v.id("users"),
    title: v.string(),
    slug: v.string(),
    shortDescription: v.optional(v.string()),
    description: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    priceInPaise: v.number(),
    currency: v.string(),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    condition: v.union(v.literal("new"), v.literal("refurbished"), v.literal("used")),
    inventoryCount: v.number(),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    videoUrls: v.array(v.string()),
    demoUrl: v.optional(v.string()),
    quickCommerceEnabled: v.boolean(),
    quickCommerceEtaMinutes: v.optional(v.number()),
    quickCommerceServiceAreas: v.array(v.string()),
    quickCommerceInventoryReserve: v.optional(v.number()),
    shippingCity: v.optional(v.string()),
    shippingNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_seller_and_updated_at", ["sellerId", "updatedAt"])
    .index("by_status_and_updated_at", ["status", "updatedAt"])
    .index("by_quick_commerce_and_updated_at", ["quickCommerceEnabled", "updatedAt"]),

  marketplaceCartItems: defineTable({
    userId: v.id("users"),
    productId: v.id("marketplaceProducts"),
    quantity: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_updated_at", ["userId", "updatedAt"])
    .index("by_user_and_product", ["userId", "productId"]),

  marketplaceOrders: defineTable({
    buyerId: v.id("users"),
    sellerId: v.id("users"),
    totalAmountInPaise: v.number(),
    currency: v.string(),
    paymentStatus: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed"), v.literal("cancelled")),
    fulfillmentStatus: v.union(v.literal("pending"), v.literal("processing"), v.literal("shipped"), v.literal("delivered"), v.literal("cancelled")),
    settlementStatus: v.union(v.literal("pending"), v.literal("available"), v.literal("processing"), v.literal("paid")),
    checkoutProvider: v.optional(v.string()),
    checkoutSessionId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    shippingName: v.string(),
    shippingPhone: v.optional(v.string()),
    shippingAddress: v.string(),
    shippingCity: v.string(),
    quickCommerce: v.boolean(),
    paidAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_buyer_and_created_at", ["buyerId", "createdAt"])
    .index("by_seller_and_created_at", ["sellerId", "createdAt"])
    .index("by_checkout_session_id", ["checkoutSessionId"])
    .index("by_seller_and_settlement_status", ["sellerId", "settlementStatus"]),

  marketplaceOrderItems: defineTable({
    orderId: v.id("marketplaceOrders"),
    buyerId: v.id("users"),
    sellerId: v.id("users"),
    productId: v.id("marketplaceProducts"),
    titleSnapshot: v.string(),
    quantity: v.number(),
    priceInPaise: v.number(),
    coverImageUrl: v.optional(v.string()),
    quickCommerceEnabled: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_seller_and_created_at", ["sellerId", "createdAt"]),

  marketplacePayouts: defineTable({
    sellerId: v.id("users"),
    orderIds: v.array(v.id("marketplaceOrders")),
    amountInPaise: v.number(),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("paid")),
    reference: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_seller_and_created_at", ["sellerId", "createdAt"])
    .index("by_seller_and_status", ["sellerId", "status"]),

  integrationConfigs: defineTable({
    slug: v.string(),
    label: v.string(),
    enabled: v.boolean(),
    healthStatus: v.string(),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.id("adminUsers"),
  }).index("by_slug", ["slug"]),

  newsletterIssues: defineTable({
    title: v.string(),
    source: v.string(),
    sender: v.string(),
    accessScope: v.string(),
    status: v.string(),
    summary: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.id("adminUsers"),
  }).index("by_created_at", ["createdAt"]),

  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    inviteToken: v.optional(v.string()), // optional for existing records; always set on create
    status: v.optional(v.union(v.literal("active"), v.literal("disabled"), v.literal("archived"))),
    disabledAt: v.optional(v.number()),
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
    kind: v.optional(v.union(v.literal("folder"), v.literal("file"))),
    fileType: v.optional(v.union(v.literal("text"), v.literal("database"))),
    parentId: v.optional(v.id("notes")),
    sortOrder: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user_private", ["createdBy", "scope"])
    .index("by_parent", ["parentId"]),

  todoGroups: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    name: v.string(),
    statusLabels: v.optional(v.record(v.string(), v.string())),
    columns: v.optional(v.array(v.object({
      id: v.string(),
      label: v.string(),
      color: v.optional(v.string()),
      icon: v.optional(v.string()),
    }))),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["createdBy"]),

  todoExcelSheets: defineTable({
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    name: v.string(),
    order: v.number(),
    rowCount: v.number(),
    columnCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace_and_order", ["workspaceId", "order"])
    .index("by_user_and_order", ["createdBy", "order"]),

  todoExcelRows: defineTable({
    sheetId: v.id("todoExcelSheets"),
    rowIndex: v.number(),
    cells: v.record(v.string(), v.string()),
    updatedAt: v.number(),
  }).index("by_sheet_and_row_index", ["sheetId", "rowIndex"]),

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
    // Social-feed attachment fields
    postCaption: v.optional(v.string()),
    videoUrls: v.optional(v.array(v.string())),
    imageUrls: v.optional(v.array(v.string())),
    attachedLinks: v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncedAt: v.optional(v.number()),
  })
    .index("by_repo_full_name", ["repoFullName"])
    .index("by_created_at", ["createdAt"]),

  ycStartupsAdmin: defineTable({
    sourceId: v.string(),
    name: v.string(),
    slug: v.string(),
    batch: v.string(),
    industry: v.string(),
    description: v.string(),
    founders: v.array(v.string()),
    website: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_source_id", ["sourceId"])
    .index("by_slug", ["slug"])
    .index("by_batch", ["batch"]),

  sharkTankPitchesAdmin: defineTable({
    sourceId: v.string(),
    slug: v.string(),
    season: v.number(),
    originalTitle: v.optional(v.string()),
    episodeNumber: v.optional(v.number()),
    episodeTitle: v.optional(v.string()),
    airDate: v.optional(v.string()),
    companyName: v.optional(v.string()),
    founders: v.array(v.string()),
    askAmountValue: v.optional(v.number()),
    askAmountUnit: v.optional(v.string()),
    askAmountInInr: v.optional(v.number()),
    askEquityPercent: v.optional(v.number()),
    askText: v.optional(v.string()),
    pitchSummary: v.optional(v.string()),
    introExcerpt: v.optional(v.string()),
    youtubeLink: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    productImages: v.optional(v.array(v.string())),
    websiteLinks: v.optional(v.array(v.string())),
    team: v.optional(v.array(v.string())),
    transcript: v.optional(v.string()),
    isTranslatedEnglish: v.optional(v.boolean()),
    companyDetailsJson: v.optional(v.string()),
    playlistTitle: v.optional(v.string()),
    playlistLink: v.optional(v.string()),
    generatedAt: v.optional(v.string()),
    sourceFile: v.string(),
    pitchIndexInEpisode: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_source_id", ["sourceId"])
    .index("by_slug", ["slug"])
    .index("by_season", ["season"]),

  sharkTankComments: defineTable({
    pitchId: v.string(),
    body: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_pitch_id_and_created_at", ["pitchId", "createdAt"]),

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

  resourceFolderShares: defineTable({
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    shareToken: v.string(),
    payload: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user_private", ["createdBy", "scope"])
    .index("by_share_token", ["shareToken"]),

  aiReports: defineTable({
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    prompt: v.string(),
    context: v.string(),
    content: v.string(),
    summary: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    sourceFilters: v.optional(v.array(v.string())),
    contextOrigin: v.optional(v.string()),
    contextAttachmentName: v.optional(v.string()),
    published: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user_private", ["createdBy", "scope"])
    .index("by_published_and_updated_at", ["published", "updatedAt"])
    .index("by_share_token", ["shareToken"]),

  mvpPages: defineTable({
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    prompt: v.string(),
    shareToken: v.string(),
    payload: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user_private", ["createdBy", "scope"])
    .index("by_share_token", ["shareToken"]),

  roadmaps: defineTable({
    scope: v.union(v.literal("private"), v.literal("workspace")),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    topic: v.string(),
    topics: v.array(v.string()),
    nodes: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        description: v.string(),
        topic: v.string(),
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
        tone: v.union(v.literal("core"), v.literal("skill"), v.literal("optional")),
      })
    ),
    edges: v.array(
      v.object({
        id: v.string(),
        from: v.string(),
        to: v.string(),
        dashed: v.optional(v.boolean()),
      })
    ),
    aiMessages: v.optional(v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        scope: v.optional(v.string()),
      })
    )),
    history: v.optional(v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        createdAt: v.number(),
        draft: v.object({
          title: v.string(),
          topic: v.string(),
          topics: v.array(v.string()),
          nodes: v.array(v.any()),
          edges: v.array(v.any()),
        }),
      })
    )),
    shareToken: v.optional(v.string()),
    published: v.optional(v.boolean()),
    publishedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user_private", ["createdBy", "scope"])
    .index("by_share_token", ["shareToken"])
    .index("by_published_and_updated_at", ["published", "updatedAt"]),

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

  marketplaceReviews: defineTable({
    productId: v.id("marketplaceProducts"),
    userId: v.id("users"),
    parentId: v.optional(v.id("marketplaceReviews")),
    comment: v.string(),
    createdAt: v.number(),
  })
    .index("by_product_and_created_at", ["productId", "createdAt"])
    .index("by_parent_id", ["parentId"])
    .index("by_user", ["userId"]),

  marketplaceSellers: defineTable({
    userId: v.id("users"),
    companyName: v.string(),
    storeDescription: v.string(),
    kycStatus: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    registrationDetails: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  marketplaceContacts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    phone: v.optional(v.string()),
    address: v.string(),
    city: v.string(),
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
