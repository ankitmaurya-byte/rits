"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUp,
  BrainCircuit,
  CheckSquare,
  ChevronDown,
  FileText,
  Lightbulb,
  Link2,
  Loader2,
  Lock,
  MessageSquarePlus,
} from "lucide-react";
import { toast } from "sonner";

import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceStore } from "@/store/workspace-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type AgentKey = "workspace-strategist" | "researcher" | "planner" | "writer";
type ScopeMode = "private" | "current" | "all";

type Citation = {
  refId: string;
  itemType: "idea" | "todo" | "note" | "resource";
  itemId: string;
  title: string;
  scope: "private" | "workspace";
  href: string;
  workspaceId?: Id<"workspaces">;
  workspaceName?: string;
};

type ChatConversation = {
  _id: Id<"chatConversations">;
  title: string;
  updatedAt: number;
  lastMessagePreview?: string;
  agentKey?: AgentKey;
  scopeMode?: ScopeMode;
  focusWorkspaceId?: Id<"workspaces">;
};

type ChatMessage = {
  _id: Id<"chatMessages">;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  citations?: Citation[];
};

type ChatRouteState = {
  conversations: ChatConversation[];
  activeConversationId: Id<"chatConversations"> | null;
  messages: ChatMessage[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const agents: Array<{ key: AgentKey; label: string; description: string }> = [
  {
    key: "workspace-strategist",
    label: "Strategist",
    description: "Connect work across notes, ideas, todos, and resources.",
  },
  {
    key: "researcher",
    label: "Researcher",
    description: "Spot evidence, contradictions, and missing information.",
  },
  {
    key: "planner",
    label: "Planner",
    description: "Turn messy context into concrete next steps.",
  },
  {
    key: "writer",
    label: "Writer",
    description: "Draft summaries, updates, and decision-ready briefs.",
  },
];

const scopeOptions: Array<{
  key: ScopeMode;
  label: string;
  description: string;
}> = [
  {
    key: "all",
    label: "All workspaces",
    description: "Private items plus every workspace you can access.",
  },
  {
    key: "current",
    label: "Current workspace",
    description: "Private items plus only the selected workspace.",
  },
  {
    key: "private",
    label: "Private only",
    description: "Use only your private notes, todos, ideas, and resources.",
  },
];

const promptSuggestions = [
  {
    label: "Summarize recent notes",
    prompt:
      "Summarize the most important themes from my recent notes across private and workspace content.",
    icon: FileText,
  },
  {
    label: "Find promising ideas",
    prompt:
      "Review my ideas and resources and tell me which ideas look strongest and why.",
    icon: Lightbulb,
  },
  {
    label: "Spot stalled work",
    prompt:
      "Look through my todos and tell me what seems blocked, stale, or at risk of slipping.",
    icon: CheckSquare,
  },
  {
    label: "Connect resources to action",
    prompt:
      "Connect my saved resources to concrete next actions, notes, or ideas I should create.",
    icon: Link2,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessageTime(timestamp: number) {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

function getCitationScopeLabel(citation: Citation) {
  if (citation.scope === "private") return "Private";
  return citation.workspaceName ?? "Workspace";
}

async function parseChatResponse(
  response: Response,
): Promise<ChatRouteState & { error?: string }> {
  const rawPayload = await response.text();
  if (!rawPayload.trim()) {
    throw new Error(
      response.ok
        ? "Chat returned an empty response."
        : "Chat request failed with an empty response.",
    );
  }
  try {
    return JSON.parse(rawPayload) as ChatRouteState & { error?: string };
  } catch {
    throw new Error(
      response.ok
        ? "Chat returned invalid JSON."
        : "Chat request failed before returning valid JSON.",
    );
  }
}

async function requestChatState(
  conversationId: Id<"chatConversations"> | null,
  options?: {
    message?: string;
    agentKey?: AgentKey;
    scopeMode?: ScopeMode;
    workspaceId?: Id<"workspaces"> | null;
  },
): Promise<ChatRouteState> {
  const url = conversationId
    ? `/api/ai/chat?conversationId=${conversationId}`
    : "/api/ai/chat";
  const response = await fetch(url, {
    method: options?.message ? "POST" : "GET",
    headers: options?.message
      ? { "Content-Type": "application/json" }
      : undefined,
    body: options?.message
      ? JSON.stringify({
          conversationId,
          message: options.message,
          agentKey: options.agentKey,
          scopeMode: options.scopeMode,
          workspaceId: options.workspaceId,
        })
      : undefined,
    cache: "no-store",
  });
  const payload = await parseChatResponse(response);
  if (!response.ok) throw new Error(payload.error || "Chat request failed.");
  return payload;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Minimal native-style select with a custom chevron overlay */
function MinimalSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ key: T; label: string }>;
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="appearance-none rounded-full border pl-3 pr-7 py-1 text-[11px] font-medium uppercase tracking-[0.16em] cursor-pointer transition-colors focus:outline-none"
        style={{
          borderColor: "var(--hairline-strong)",
          backgroundColor: "var(--surface-elevated)",
          color: "var(--ink)",
        }}
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={10}
        className="pointer-events-none absolute right-2"
        style={{ color: "var(--mute)" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatSheet({ open, onOpenChange }: ChatSheetProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const selectedWorkspaceId = useWorkspaceStore(
    (state) => state.selectedWorkspaceId,
  );
  const setSelectedWorkspace = useWorkspaceStore(
    (state) => state.setSelectedWorkspace,
  );
  const workspaces =
    useQuery(
      api.workspaces.getMyWorkspaces,
      user ? { clerkId: user.id } : "skip",
    ) ?? [];

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"chatConversations"> | null>(null);
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [agentKey, setAgentKey] = useState<AgentKey>("workspace-strategist");
  const [scopeMode, setScopeMode] = useState<ScopeMode>("all");
  const [draft, setDraft] = useState("");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const activeRequestId = useRef(0);

  const activeConversationId =
    selectedConversationId ??
    (!isStartingNew ? (conversations[0]?._id ?? null) : null);
  const activeConversation =
    conversations.find((c) => c._id === activeConversationId) ?? null;
  const activeAgent = agents.find((a) => a.key === agentKey) ?? agents[0];
  const activeScope =
    scopeOptions.find((s) => s.key === scopeMode) ?? scopeOptions[0];
  const currentWorkspace =
    workspaces.find((w) => w?._id === selectedWorkspaceId) ?? null;

  const applyChatState = useCallback(
    (state: ChatRouteState) => {
      setConversations(state.conversations);
      setMessages(state.messages);
      setSelectedConversationId(state.activeConversationId);
      setIsStartingNew(state.activeConversationId === null);
      const activeStateConversation = state.activeConversationId
        ? (state.conversations.find(
            (c) => c._id === state.activeConversationId,
          ) ?? null)
        : null;
      if (activeStateConversation) {
        setAgentKey(activeStateConversation.agentKey ?? "workspace-strategist");
        setScopeMode(activeStateConversation.scopeMode ?? "all");
        if (activeStateConversation.focusWorkspaceId) {
          setSelectedWorkspace(activeStateConversation.focusWorkspaceId);
        }
      }
    },
    [setSelectedWorkspace],
  );

  const loadChat = useCallback(
    async (conversationId: Id<"chatConversations"> | null) => {
      const requestId = ++activeRequestId.current;
      setIsLoadingChat(true);
      setLoadError(null);
      try {
        const state = await requestChatState(conversationId);
        if (requestId !== activeRequestId.current) return;
        applyChatState(state);
      } catch (error) {
        if (requestId !== activeRequestId.current) return;
        setLoadError(
          error instanceof Error ? error.message : "Failed to load chat.",
        );
      } finally {
        if (requestId === activeRequestId.current) setIsLoadingChat(false);
      }
    },
    [applyChatState],
  );

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, open, pendingMessage, isSending]);

  useEffect(() => {
    if (!open || !isLoaded || !user || isStartingNew) return;
    const timeoutId = window.setTimeout(() => {
      void loadChat(selectedConversationId);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isLoaded, isStartingNew, loadChat, open, selectedConversationId, user]);

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || isSending || !isLoaded || !user) return;
    if (scopeMode === "current" && !selectedWorkspaceId) {
      toast.error(
        "Choose a workspace first, or switch scope to all workspaces/private only.",
      );
      return;
    }
    setIsSending(true);
    setPendingMessage(message);
    try {
      const state = await requestChatState(activeConversationId, {
        message,
        agentKey,
        scopeMode,
        workspaceId: scopeMode === "current" ? selectedWorkspaceId : null,
      });
      setDraft("");
      applyChatState(state);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Rits AI could not answer right now.",
      );
    } finally {
      setPendingMessage(null);
      setIsSending(false);
    }
  };

  const handleCitationClick = (citation: Citation) => {
    if (citation.workspaceId) setSelectedWorkspace(citation.workspaceId);
    router.push(citation.href);
    onOpenChange(false);
  };

  const startNewConversation = () => {
    setIsLoadingChat(false);
    setSelectedConversationId(null);
    setIsStartingNew(true);
    setAgentKey("workspace-strategist");
    setScopeMode(selectedWorkspaceId ? "current" : "all");
    setMessages([]);
    setDraft("");
    setLoadError(null);
  };

  const openConversation = async (conversationId: Id<"chatConversations">) => {
    setIsStartingNew(false);
    await loadChat(conversationId);
  };

  const hasMessages = messages.length > 0 || pendingMessage !== null;
  const conversationCount = conversations.length;
  const visibleLoadError =
    !user && isLoaded ? "Sign in to use Rits AI." : loadError;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:w-[min(960px,96vw)] data-[side=right]:sm:max-w-[960px] gap-0 overflow-hidden border-l p-0"
        style={{
          backgroundColor: "var(--canvas)",
          borderColor: "var(--hairline-strong)",
        }}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ---------------------------------------------------------------- */}
        <SheetHeader
          className="shrink-0 border-b px-5 py-3 sm:px-6"
          style={{
            borderColor: "var(--hairline-strong)",
            backgroundColor: "var(--surface-card)",
          }}
        >
          <div className="flex items-center justify-between gap-4 pr-10">
            {/* Left: identity */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                style={{
                  borderColor: "var(--hairline-strong)",
                  backgroundColor: "var(--surface-elevated)",
                  color: "var(--ink)",
                }}
              >
                <BrainCircuit size={15} />
              </div>
              <div>
                <SheetTitle
                  className="text-[15px] font-semibold leading-tight tracking-tight"
                  style={{ color: "var(--ink)" }}
                >
                  Rits AI
                </SheetTitle>
                <p className="text-[11px] leading-tight" style={{ color: "var(--mute)" }}>
                  Workspace-aware assistant
                </p>
              </div>
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-2">
              {/* Agent dropdown */}
              <MinimalSelect<AgentKey>
                value={agentKey}
                onChange={setAgentKey}
                options={agents.map((a) => ({ key: a.key, label: a.label }))}
              />

              {/* Scope dropdown */}
              <MinimalSelect<ScopeMode>
                value={scopeMode}
                onChange={setScopeMode}
                options={scopeOptions.map((s) => ({ key: s.key, label: s.label }))}
              />

              {/* Scope badge */}
              <div
                className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] sm:inline-flex"
                style={{
                  borderColor: "var(--hairline-strong)",
                  backgroundColor: "var(--surface-elevated)",
                  color: "var(--mute)",
                }}
              >
                <Lock size={10} />
                {scopeMode === "current" && currentWorkspace
                  ? currentWorkspace.name
                  : activeScope.label}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={startNewConversation}
                className="rounded-full px-3 text-[11px]"
              >
                <MessageSquarePlus size={13} />
                New chat
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* ---------------------------------------------------------------- */}
        {/* Body: sidebar + thread                                            */}
        {/* ---------------------------------------------------------------- */}
        <div className="relative grid min-h-0 flex-1 xl:grid-cols-[240px_minmax(0,1fr)]">
          {/* Conversation list */}
          <aside
            className="flex min-h-0 flex-col border-b xl:border-b-0 xl:border-r"
            style={{
              borderColor: "var(--hairline-strong)",
              backgroundColor: "var(--surface-card)",
            }}
          >
            {/* Summary chip */}
            <div
              className="border-b px-4 py-3"
              style={{ borderColor: "var(--hairline)" }}
            >
              <div
                className="rounded-xl border px-3 py-3"
                style={{
                  borderColor: "var(--hairline-strong)",
                  backgroundColor: "var(--surface-elevated)",
                }}
              >
                <p
                  className="text-[10px] font-medium uppercase tracking-[0.18em]"
                  style={{ color: "var(--mute)" }}
                >
                  Saved chats
                </p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                    {conversationCount}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--charcoal)" }}>
                    {activeAgent.label}
                  </p>
                </div>
                <p className="mt-1.5 text-[11px] leading-[1.6]" style={{ color: "var(--charcoal)" }}>
                  {activeScope.description}
                </p>
              </div>
            </div>

            {/* List */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {isLoadingChat && conversationCount === 0 ? (
                <div
                  className="flex items-center gap-2 rounded-xl border px-3 py-3 text-xs"
                  style={{
                    borderColor: "var(--hairline-strong)",
                    color: "var(--charcoal)",
                  }}
                >
                  <Loader2 size={13} className="animate-spin" />
                  Loading conversations…
                </div>
              ) : null}

              {visibleLoadError ? (
                <div
                  className="rounded-xl border px-3 py-3 text-xs leading-6"
                  style={{
                    borderColor: "var(--hairline-strong)",
                    color: "var(--charcoal)",
                  }}
                >
                  {visibleLoadError}
                </div>
              ) : null}

              {!isLoadingChat && !visibleLoadError && conversationCount === 0 ? (
                <div
                  className="rounded-xl border px-3 py-3 text-xs leading-6"
                  style={{
                    borderColor: "var(--hairline-strong)",
                    color: "var(--charcoal)",
                  }}
                >
                  Conversations appear here after your first prompt.
                </div>
              ) : null}

              <div className="mt-2 flex flex-col gap-1.5">
                {conversations.map((conversation) => {
                  const isActive =
                    conversation._id === activeConversationId && !isStartingNew;
                  return (
                    <button
                      key={conversation._id}
                      type="button"
                      onClick={() => void openConversation(conversation._id)}
                      className="group rounded-xl border px-3 py-2.5 text-left transition-all"
                      style={{
                        borderColor: isActive
                          ? "var(--ink)"
                          : "var(--hairline-strong)",
                        backgroundColor: isActive
                          ? "var(--surface-elevated)"
                          : "transparent",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: isActive
                                  ? "var(--accent-blue)"
                                  : "var(--stone)",
                              }}
                            />
                            <span
                              className="truncate text-[13px] font-medium"
                              style={{ color: "var(--ink)" }}
                            >
                              {conversation.title}
                            </span>
                          </div>
                          <p
                            className="mt-1 line-clamp-2 text-[11px] leading-[1.55]"
                            style={{ color: "var(--charcoal)" }}
                          >
                            {conversation.lastMessagePreview ?? "No messages yet"}
                          </p>
                          <div
                            className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.14em]"
                            style={{ color: "var(--mute)" }}
                          >
                            <span>
                              {agents.find(
                                (a) =>
                                  a.key ===
                                  (conversation.agentKey ??
                                    "workspace-strategist"),
                              )?.label ?? "Strategist"}
                            </span>
                            <span>·</span>
                            <span>
                              {scopeOptions.find(
                                (s) =>
                                  s.key === (conversation.scopeMode ?? "all"),
                              )?.label ?? "All workspaces"}
                            </span>
                          </div>
                        </div>
                        <span
                          className="shrink-0 text-[10px] uppercase tracking-[0.14em]"
                          style={{ color: "var(--mute)" }}
                        >
                          {formatMessageTime(conversation.updatedAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Thread pane */}
          <div className="flex min-h-0 min-w-0 flex-col">
            {/* Conversation meta bar */}
            <div
              className="shrink-0 border-b px-5 py-3 sm:px-6"
              style={{ borderColor: "var(--hairline)" }}
            >
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                  <p
                    className="text-[10px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "var(--mute)" }}
                  >
                    {activeConversation ? "Open conversation" : "Fresh conversation"}
                  </p>
                  <h3
                    className="mt-1 truncate text-[16px] font-semibold tracking-tight"
                    style={{ color: "var(--ink)" }}
                  >
                    {activeConversation?.title ?? "Start a new Rits AI thread"}
                  </h3>
                  <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--charcoal)" }}>
                    {activeConversation
                      ? `${formatMessageTime(activeConversation.updatedAt)} · ${activeScope.description.toLowerCase()}`
                      : "Ask for synthesis, prioritization, or links across the work you already captured in Rits."}
                  </p>
                </div>

                {/* Compact agent + scope pills (read-only in thread) */}
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <span
                    className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]"
                    style={{
                      borderColor: "var(--hairline-strong)",
                      backgroundColor: "var(--surface-elevated)",
                      color: "var(--charcoal)",
                    }}
                  >
                    {activeAgent.label}
                  </span>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]"
                    style={{
                      borderColor: "var(--hairline-strong)",
                      backgroundColor: "var(--surface-elevated)",
                      color: "var(--charcoal)",
                    }}
                  >
                    {activeScope.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={threadRef}
              className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {/* Empty state / suggestions */}
                {!hasMessages ? (
                  <div
                    className="rounded-2xl border p-5"
                    style={{
                      borderColor: "var(--hairline-strong)",
                      backgroundColor: "var(--surface-card)",
                    }}
                  >
                    <h3
                      className="text-[18px] font-semibold tracking-tight"
                      style={{ color: "var(--ink)" }}
                    >
                      Ask Rits AI about your work.
                    </h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6" style={{ color: "var(--charcoal)" }}>
                      Compare notes, summarize recent work, or find the next
                      best action across your private and shared workspace
                      memory.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {promptSuggestions.map((suggestion) => {
                        const Icon = suggestion.icon;
                        return (
                          <button
                            key={suggestion.label}
                            type="button"
                            onClick={() => {
                              setDraft(suggestion.prompt);
                              if (!activeConversation) setIsStartingNew(true);
                            }}
                            className="rounded-xl border px-3.5 py-3 text-left transition-colors"
                            style={{
                              borderColor: "var(--hairline-strong)",
                              backgroundColor: "var(--surface-elevated)",
                            }}
                          >
                            <div
                              className="flex items-center gap-2 text-[13px] font-medium"
                              style={{ color: "var(--ink)" }}
                            >
                              <Icon size={13} />
                              {suggestion.label}
                            </div>
                            <p
                              className="mt-1.5 text-[11px] leading-5"
                              style={{ color: "var(--charcoal)" }}
                            >
                              {suggestion.prompt}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Message bubbles */}
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  const citations = message.citations ?? [];
                  return (
                    <div
                      key={message._id}
                      className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}
                    >
                      {/* Role label */}
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]"
                        style={{
                          borderColor: "var(--hairline)",
                          backgroundColor: isUser
                            ? "rgba(255,255,255,0.04)"
                            : "var(--surface-elevated)",
                          color: isUser ? "var(--charcoal)" : "var(--mute)",
                        }}
                      >
                        {isUser ? (
                          "You"
                        ) : (
                          <>
                            <BrainCircuit size={10} /> Rits AI
                          </>
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`w-full max-w-[88%] rounded-[22px] border px-4 py-3.5 sm:max-w-[80%] ${isUser ? "ml-auto" : "mr-auto"}`}
                        style={{
                          borderColor: isUser
                            ? "rgba(255,255,255,0.08)"
                            : "var(--hairline-strong)",
                          background: isUser
                            ? "linear-gradient(180deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.02) 100%)"
                            : "linear-gradient(180deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%)",
                          color: isUser ? "var(--ink)" : "var(--body)",
                          boxShadow: isUser
                            ? "none"
                            : "0 0 0 1px var(--hairline) inset",
                        }}
                      >
                        <div className="whitespace-pre-wrap break-words text-[13.5px] leading-7">
                          {message.content}
                        </div>

                        {/* Citations */}
                        {citations.length > 0 ? (
                          <div
                            className="mt-3 border-t pt-3"
                            style={{ borderColor: "var(--hairline)" }}
                          >
                            <div
                              className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em]"
                              style={{ color: "var(--mute)" }}
                            >
                              Sources used
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {citations.map((citation) => (
                                <button
                                  key={`${message._id}-${citation.refId}`}
                                  type="button"
                                  onClick={() => handleCitationClick(citation)}
                                  className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors"
                                  style={{
                                    borderColor: "var(--hairline-strong)",
                                    backgroundColor: "var(--surface-elevated)",
                                    color: "var(--body)",
                                  }}
                                >
                                  <Link2 size={11} />
                                  <span className="shrink-0 font-medium">
                                    {citation.refId}
                                  </span>
                                  <span className="truncate">{citation.title}</span>
                                  <span
                                    className="shrink-0"
                                    style={{ color: "var(--mute)" }}
                                  >
                                    {getCitationScopeLabel(citation)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {/* Optimistic user + AI loading */}
                {pendingMessage ? (
                  <>
                    <div className="flex flex-col items-end gap-1.5">
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]"
                        style={{
                          borderColor: "var(--hairline)",
                          backgroundColor: "rgba(255,255,255,0.04)",
                          color: "var(--charcoal)",
                        }}
                      >
                        You
                      </div>
                      <div
                        className="w-full max-w-[88%] rounded-[22px] border px-4 py-3.5 sm:max-w-[80%]"
                        style={{
                          borderColor: "rgba(255,255,255,0.08)",
                          background:
                            "linear-gradient(180deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.02) 100%)",
                          color: "var(--ink)",
                        }}
                      >
                        <div className="whitespace-pre-wrap break-words text-[13.5px] leading-7">
                          {pendingMessage}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-1.5">
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]"
                        style={{
                          borderColor: "var(--hairline)",
                          backgroundColor: "var(--surface-elevated)",
                          color: "var(--mute)",
                        }}
                      >
                        <BrainCircuit size={10} />
                        Rits AI
                      </div>
                      <div
                        className="w-full max-w-[88%] rounded-[22px] border px-4 py-3.5 sm:max-w-[80%]"
                        style={{
                          borderColor: "var(--hairline-strong)",
                          background:
                            "linear-gradient(180deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%)",
                          boxShadow: "0 0 0 1px var(--hairline) inset",
                        }}
                      >
                        <div
                          className="flex items-center gap-2 text-sm"
                          style={{ color: "var(--charcoal)" }}
                        >
                          <Loader2 size={13} className="animate-spin" />
                          Thinking through your workspace…
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Composer                                                       */}
            {/* ------------------------------------------------------------ */}
            <div
              className="shrink-0 border-t px-5 py-3 sm:px-6"
              style={{
                borderColor: "var(--hairline-strong)",
                backgroundColor: "var(--surface-card)",
              }}
            >
              <div className="mx-auto max-w-3xl">
                <div
                  className="rounded-2xl border p-3.5"
                  style={{
                    borderColor: "var(--hairline-strong)",
                    backgroundColor: "var(--surface-elevated)",
                  }}
                >
                  {/* Top meta row */}
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]"
                        style={{
                          borderColor: "var(--hairline)",
                          backgroundColor: "var(--surface-card)",
                          color: "var(--mute)",
                        }}
                      >
                        <Lock size={9} />
                        {scopeMode === "current" && currentWorkspace
                          ? currentWorkspace.name
                          : activeScope.label}
                      </div>
                      <span
                        className="text-[10px] uppercase tracking-[0.14em]"
                        style={{ color: "var(--mute)" }}
                      >
                        {activeAgent.label}
                      </span>
                    </div>
                    <p
                      className="text-[10px] uppercase tracking-[0.14em]"
                      style={{ color: "var(--mute)" }}
                    >
                      ⌘ Enter to send
                    </p>
                  </div>

                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Ask for synthesis, priorities, contradictions, open questions, or action items across your Rits workspace memory…"
                    className="min-h-[110px] resize-none border-0 bg-transparent px-0 py-0 text-[13.5px] leading-7 shadow-none focus-visible:ring-0"
                    style={{ color: "var(--ink)" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    disabled={!isLoaded || !user || isSending}
                  />

                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <p className="max-w-sm text-[11px] leading-5" style={{ color: "var(--charcoal)" }}>
                      Comparative questions yield better summaries, priorities, and next steps.
                    </p>
                    <Button
                      onClick={() => void handleSend()}
                      disabled={!isLoaded || !user || isSending || !draft.trim()}
                      className="h-9 rounded-full px-4 text-[13px]"
                    >
                      {isSending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ArrowUp size={14} />
                      )}
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
