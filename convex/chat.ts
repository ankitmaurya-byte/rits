import { ConvexError, v } from "convex/values";

import { Id } from "./_generated/dataModel";
import {
  MutationCtx,
  QueryCtx,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { findCurrentUser, requireCurrentUser } from "./authHelpers";

const citationValidator = v.object({
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
});

const chatScopeModeValidator = v.union(
  v.literal("private"),
  v.literal("current"),
  v.literal("all")
);

function buildConversationTitle(content: string) {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "New chat";
  }

  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}

function buildPreview(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length > 140 ? `${compact.slice(0, 137)}...` : compact;
}

async function requireOwnedConversation(
  ctx: QueryCtx | MutationCtx,
  ownerId: Id<"users">,
  conversationId: Id<"chatConversations">
) {
  const conversation = await ctx.db.get(conversationId);

  if (!conversation || conversation.ownerId !== ownerId) {
    throw new ConvexError("Conversation not found");
  }

  return conversation;
}

export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await findCurrentUser(ctx);

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("chatConversations")
      .withIndex("by_owner_and_updated_at", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .take(50);
  },
});

export const listMessages = query({
  args: { conversationId: v.id("chatConversations") },
  handler: async (ctx, args) => {
    const { user } = await findCurrentUser(ctx);

    if (!user) {
      return [];
    }

    await requireOwnedConversation(ctx, user._id, args.conversationId);

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation_and_created_at", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(200);

    return messages.reverse();
  },
});

export const getConversationStateForAction = internalQuery({
  args: {
    conversationId: v.union(v.id("chatConversations"), v.null()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const conversationId = args.conversationId;

    if (!conversationId) {
      return {
        ownerId: user._id,
        viewerName: user.name,
        conversationTitle: null,
        agentKey: "workspace-strategist",
        scopeMode: "all" as const,
        focusWorkspaceId: null,
        history: [] as { role: "user" | "assistant" | "system"; content: string }[],
      };
    }

    const conversation = await requireOwnedConversation(ctx, user._id, conversationId);
    const history = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation_and_created_at", (q) =>
        q.eq("conversationId", conversationId)
      )
      .order("desc")
      .take(12);

    return {
      ownerId: user._id,
      viewerName: user.name,
      conversationTitle: conversation.title,
      agentKey: conversation.agentKey ?? "workspace-strategist",
      scopeMode: conversation.scopeMode ?? "all",
      focusWorkspaceId: conversation.focusWorkspaceId ?? null,
      history: history
        .reverse()
        .map((message) => ({ role: message.role, content: message.content })),
    };
  },
});

export const appendUserMessage = internalMutation({
  args: {
    conversationId: v.union(v.id("chatConversations"), v.null()),
    ownerId: v.id("users"),
    content: v.string(),
    agentKey: v.string(),
    scopeMode: chatScopeModeValidator,
    focusWorkspaceId: v.union(v.id("workspaces"), v.null()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let conversationId = args.conversationId;

    if (conversationId) {
      await requireOwnedConversation(ctx, args.ownerId, conversationId);
      await ctx.db.patch(conversationId, {
        agentKey: args.agentKey,
        scopeMode: args.scopeMode,
        focusWorkspaceId: args.focusWorkspaceId ?? undefined,
        updatedAt: now,
        lastMessageAt: now,
        lastMessagePreview: buildPreview(args.content),
      });
    } else {
        conversationId = await ctx.db.insert("chatConversations", {
          ownerId: args.ownerId,
          title: buildConversationTitle(args.content),
          agentKey: args.agentKey,
          scopeMode: args.scopeMode,
          focusWorkspaceId: args.focusWorkspaceId ?? undefined,
          lastMessagePreview: buildPreview(args.content),
          lastMessageAt: now,
          createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("chatMessages", {
      conversationId,
      ownerId: args.ownerId,
      role: "user",
      content: args.content,
      createdAt: now,
    });

    return conversationId;
  },
});

export const appendAssistantMessage = internalMutation({
  args: {
    conversationId: v.id("chatConversations"),
    ownerId: v.id("users"),
    content: v.string(),
    model: v.string(),
    citations: v.array(citationValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await requireOwnedConversation(ctx, args.ownerId, args.conversationId);

    const messageId = await ctx.db.insert("chatMessages", {
      conversationId: args.conversationId,
      ownerId: args.ownerId,
      role: "assistant",
      content: args.content,
      model: args.model,
      citations: args.citations,
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: now,
      lastMessageAt: now,
      lastMessagePreview: buildPreview(args.content),
    });

    return messageId;
  },
});
