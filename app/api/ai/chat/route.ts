import { auth } from "@clerk/nextjs/server";
import { fetchAction, fetchQuery } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

type ChatRouteState = {
  conversations: Awaited<ReturnType<typeof fetchQuery<typeof api.chat.listConversations>>>;
  activeConversationId: Id<"chatConversations"> | null;
  messages: Awaited<ReturnType<typeof fetchQuery<typeof api.chat.listMessages>>>;
};

type ChatPostBody = {
  conversationId?: string | null;
  message?: string;
  agentKey?: string;
  scopeMode?: "private" | "current" | "all";
  workspaceId?: string | null;
};

async function getClerkToken() {
  const authObject = await auth();

  if (!authObject.userId) {
    return null;
  }

  const audience = authObject.sessionClaims?.aud;
  const hasConvexAudience =
    audience === "convex" || (Array.isArray(audience) && audience.includes("convex"));

  try {
    const token = hasConvexAudience
      ? await authObject.getToken()
      : await authObject.getToken({ template: "convex" });

    if (!token) {
      throw new Error("Clerk did not return a Convex session token.");
    }

    return token;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "clerkError" in error &&
      "errors" in error &&
      Array.isArray(error.errors) &&
      error.errors.some(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          "code" in entry &&
          entry.code === "resource_not_found"
      )
    ) {
      throw new Error(
        "Clerk is not configured to issue Convex tokens. Activate the Clerk Convex integration or create a JWT template named 'convex', then sign out and sign back in."
      );
    }

    throw error;
  }
}

async function loadChatState(
  token: string,
  requestedConversationId: Id<"chatConversations"> | null
): Promise<ChatRouteState> {
  const conversations = await fetchQuery(api.chat.listConversations, {}, { token });
  const activeConversationId =
    requestedConversationId ?? conversations[0]?._id ?? null;
  const messages = activeConversationId
    ? await fetchQuery(
        api.chat.listMessages,
        { conversationId: activeConversationId },
        { token }
      )
    : [];

  return {
    conversations,
    activeConversationId,
    messages,
  };
}

function getConversationId(value: unknown) {
  return typeof value === "string"
    ? (value as Id<"chatConversations">)
    : null;
}

function getWorkspaceId(value: unknown) {
  return typeof value === "string" ? (value as Id<"workspaces">) : null;
}

async function parseChatRequestBody(request: NextRequest): Promise<ChatPostBody> {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as ChatPostBody;
  } catch {
    throw new Error("Chat request body must be valid JSON.");
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = await getClerkToken();

    if (!token) {
      return NextResponse.json(
        { error: "Unable to access a secure Clerk session token for chat." },
        { status: 401 }
      );
    }

    const requestedConversationId = getConversationId(
      request.nextUrl.searchParams.get("conversationId")
    );
    const state = await loadChatState(token, requestedConversationId);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getClerkToken();

    if (!token) {
      return NextResponse.json(
        { error: "Unable to access a secure Clerk session token for chat." },
        { status: 401 }
      );
    }

    let body: ChatPostBody;

    try {
      body = await parseChatRequestBody(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chat request body must be valid JSON.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const result = await fetchAction(
      api.chatActions.ask,
        {
          conversationId: getConversationId(body.conversationId),
          message,
          agentKey: body.agentKey ?? "workspace-strategist",
          scopeMode: body.scopeMode ?? "all",
          workspaceId: getWorkspaceId(body.workspaceId),
        },
        { token }
      );

    const state = await loadChatState(token, result.conversationId);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
