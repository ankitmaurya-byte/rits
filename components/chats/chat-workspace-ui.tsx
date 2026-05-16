"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Bot,
  CheckCheck,
  Folder,
  Image as ImageIcon,
  Lock,
  Menu,
  MessageCirclePlus,
  MoreVertical,
  Phone,
  Pin,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceStore } from "@/store/workspace-store";

type Mode = "private" | "workspace";
type ShareKind = "resource" | "idea" | "note";

type RoomSummary = {
  _id: Id<"socialChatRooms">;
  title: string;
  displayName?: string;
  objective?: string;
  updatedAt: number;
  lastMessagePreview?: string;
  unreadCount?: number;
  otherUser?: { _id: Id<"users">; name: string; email: string } | null;
};

type FriendRequestItem = {
  _id: Id<"friendRequests">;
  fromUser: { _id: Id<"users">; name: string } | null;
};

type DirectoryPerson = {
  _id: Id<"users">;
  name: string;
  email: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
};

type RecommendedPerson = {
  _id: Id<"users">;
  name: string;
  mutualCount: number;
  hasPendingRequest: boolean;
};

type RoomMessage = {
  _id: Id<"socialChatMessages">;
  senderId?: Id<"users">;
  senderKind: "user" | "ai" | "system";
  body: string;
  messageType: "text" | "share" | "analysis";
  shareType?: ShareKind;
  shareTitle?: string;
  shareDescription?: string;
  shareMeta?: string;
  createdAt: number;
  sender?: { _id: Id<"users">; name: string } | null;
};

function strictPanelStyle(active?: boolean) {
  return {
    backgroundColor: active ? "var(--surface-elevated)" : "var(--surface-card)",
    borderColor: active ? "var(--hairline-strong)" : "var(--hairline)",
  } as const;
}

function StatusDot() {
  return <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--accent-green)" }} />;
}

function Avatar({ label, color = "var(--surface-elevated)", size = 44 }: { label: string; color?: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full text-sm font-semibold"
      style={{ width: size, height: size, backgroundColor: color, color: "var(--ink)" }}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

function LeftRail({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
  return (
    <div className="hidden md:flex w-[72px] shrink-0 flex-col items-center justify-between border-r px-3 py-4" style={{ backgroundColor: "var(--surface-deep)", borderColor: "var(--hairline)" }}>
      <div className="flex flex-col gap-3">
        {[
          { key: "private" as const, icon: <Lock size={18} /> },
          { key: "workspace" as const, icon: <Users size={18} /> },
          { key: "private" as const, icon: <Bot size={18} /> },
          { key: "workspace" as const, icon: <Folder size={18} /> },
          { key: "private" as const, icon: <Settings size={18} /> },
        ].map((item, index) => {
          const active = index < 2 && mode === item.key;
          return (
            <button
              key={`${item.key}-${index}`}
              type="button"
              onClick={() => index < 2 && onModeChange(item.key)}
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors"
              style={{
                backgroundColor: active ? "var(--surface-elevated)" : "transparent",
                borderColor: active ? "var(--hairline-strong)" : "transparent",
                color: active ? "var(--ink)" : "var(--mute)",
              }}
            >
              {active ? <span className="absolute -left-2 h-2 w-2 rounded-full" style={{ backgroundColor: "var(--accent-green)" }} /> : null}
              {item.icon}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-3">
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ borderColor: "var(--hairline)", color: "var(--mute)", backgroundColor: "var(--surface-card)" }}>
          <ImageIcon size={18} />
        </button>
        <Avatar label="AS" size={44} color="var(--surface-card)" />
      </div>
    </div>
  );
}

function CreateWorkspaceChatModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, objective: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-[20px] border" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--hairline-strong)" }} onClick={(event) => event.stopPropagation()}>
        <div className="border-b px-6 py-5" style={{ borderColor: "var(--hairline)" }}>
          <h3 className="text-xl font-medium" style={{ color: "var(--ink)" }}>Create workspace chat</h3>
        </div>
        <div className="space-y-5 p-6">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Chat title" className="input-field" />
          <textarea value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Objective for this workspace chat" rows={5} className="input-field resize-none" />
        </div>
        <div className="flex justify-end gap-3 border-t px-6 py-4" style={{ borderColor: "var(--hairline)" }}>
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onCreate(title, objective);
                setTitle("");
                setObjective("");
                onClose();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Creating..." : "Create chat"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PeopleDrawer({
  open,
  onClose,
  searchValue,
  onSearchChange,
  directory,
  requests,
  recommended,
  onRequest,
  onAccept,
  onStartChat,
}: {
  open: boolean;
  onClose: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  directory: Array<{ _id: Id<"users">; name: string; email: string; isFriend: boolean; hasPendingRequest: boolean }>;
  requests: Array<{ _id: Id<"friendRequests">; fromUser: { _id: Id<"users">; name: string } | null }>;
  recommended: Array<{ _id: Id<"users">; name: string; mutualCount: number; hasPendingRequest: boolean }>;
  onRequest: (userId: Id<"users">) => void;
  onAccept: (requestId: Id<"friendRequests">) => void;
  onStartChat: (friendUserId: Id<"users">) => void;
}) {
  if (!open) return null;

  return (
    <div className="absolute inset-y-0 right-0 z-[70] flex w-full max-w-[420px] flex-col border-l" style={{ backgroundColor: "#050507", borderColor: "var(--hairline-strong)" }}>
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} style={{ color: "var(--ink)" }}><X size={18} /></button>
          <h3 className="text-sm font-medium" style={{ color: "var(--ink)" }}>People</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-6 relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search people in this app"
            className="h-11 w-full rounded-full border pl-11 pr-4 text-sm outline-none"
            style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--hairline)", color: "var(--ink)" }}
          />
        </div>

        <section className="mb-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Friend requests</p>
          <div className="space-y-2">
            {requests.length === 0 ? <p className="text-sm" style={{ color: "var(--mute)" }}>No pending requests.</p> : requests.map((request) => request.fromUser ? (
              <div key={request._id} className="rounded-2xl border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{request.fromUser.name}</p>
                    <p className="text-xs" style={{ color: "var(--mute)" }}>Wants to connect privately</p>
                  </div>
                  <button type="button" onClick={() => onAccept(request._id)} className="btn-primary">Accept</button>
                </div>
              </div>
            ) : null)}
          </div>
        </section>

        <section className="mb-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Recommended</p>
          <div className="space-y-2">
            {recommended.map((person) => (
              <div key={person._id} className="rounded-2xl border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{person.name}</p>
                    <p className="text-xs" style={{ color: "var(--mute)" }}>{person.mutualCount} mutual connection{person.mutualCount > 1 ? "s" : ""}</p>
                  </div>
                  <button type="button" onClick={() => onRequest(person._id)} className="btn-outline" disabled={person.hasPendingRequest}>{person.hasPendingRequest ? "Pending" : "Add"}</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Directory</p>
          <div className="space-y-2">
            {directory.map((person) => (
              <div key={person._id} className="rounded-2xl border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{person.name}</p>
                    <p className="truncate text-xs" style={{ color: "var(--mute)" }}>{person.email}</p>
                  </div>
                  {person.isFriend ? (
                    <button type="button" onClick={() => onStartChat(person._id)} className="btn-primary">Chat</button>
                  ) : (
                    <button type="button" onClick={() => onRequest(person._id)} className="btn-outline" disabled={person.hasPendingRequest}>{person.hasPendingRequest ? "Pending" : "Request"}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ShareMenu({
  kind,
  items,
  onShare,
}: {
  kind: ShareKind;
  items: Array<{ title: string; description: string; meta: string }>;
  onShare: (item: { title: string; description: string; meta: string }) => void;
}) {
  return (
    <div className="mb-3 rounded-2xl border p-3" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Share {kind}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <button key={item.title} type="button" onClick={() => onShare(item)} className="flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}>
            <Sparkles size={14} className="mt-0.5" style={{ color: "var(--accent-green)" }} />
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--mute)" }}>{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SharedMessageCard({
  message,
  onImport,
}: {
  message: {
    shareType?: ShareKind;
    shareTitle?: string;
    shareDescription?: string;
    shareMeta?: string;
  };
  onImport: () => void;
}) {
  return (
    <div className="min-w-[250px] max-w-[320px] rounded-2xl border p-3" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "rgba(255,255,255,0.04)" }}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--mute)" }}>
        {message.shareType}
      </p>
      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{message.shareTitle}</p>
      <p className="mt-1 text-xs leading-5" style={{ color: "var(--charcoal)" }}>{message.shareDescription}</p>
      <p className="mt-2 text-[11px]" style={{ color: "var(--mute)" }}>{message.shareMeta}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onImport} className="rounded-full border px-3 py-1.5 text-[11px] font-medium" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--ink)" }}>Import</button>
        <button type="button" className="rounded-full border px-3 py-1.5 text-[11px] font-medium" style={{ borderColor: "rgba(17,255,153,0.22)", backgroundColor: "rgba(17,255,153,0.12)", color: "var(--accent-green)" }}>Ask AI</button>
      </div>
    </div>
  );
}

export function ChatWorkspaceUI({ initialMode = "private" }: { initialMode?: Mode }) {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [searchValue, setSearchValue] = useState("");
  const [peopleSearchValue, setPeopleSearchValue] = useState("");
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [composer, setComposer] = useState("");
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [selectedPrivateRoomId, setSelectedPrivateRoomId] = useState<Id<"socialChatRooms"> | null>(null);
  const [selectedWorkspaceRoomId, setSelectedWorkspaceRoomId] = useState<Id<"socialChatRooms"> | null>(null);

  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const currentUserId = convexUser?._id ?? null;
  const workspace = useQuery(api.workspaces.getWorkspaceById, selectedWorkspaceId && user ? { workspaceId: selectedWorkspaceId, clerkId: user.id } : "skip");
  const privateRooms = (useQuery(api.socialChats.listPrivateRooms, user ? {} : "skip") ?? []) as RoomSummary[];
  const workspaceRooms = (useQuery(api.socialChats.listWorkspaceRooms, mode === "workspace" && selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip") ?? []) as RoomSummary[];
  const friendRequests = (useQuery(api.social.listFriendRequests, user ? {} : "skip") ?? []) as FriendRequestItem[];
  const recommended = (useQuery(api.social.recommendedFriends, user ? {} : "skip") ?? []) as RecommendedPerson[];
  const directory = (useQuery(api.social.searchPeople, user ? { search: peopleSearchValue } : "skip") ?? []) as DirectoryPerson[];

  const activeRooms = mode === "private" ? privateRooms : workspaceRooms;
  const activeSelectedId = mode === "private" ? selectedPrivateRoomId ?? privateRooms[0]?._id ?? null : selectedWorkspaceRoomId ?? workspaceRooms[0]?._id ?? null;
  const activeRoom = activeRooms.find((room) => room._id === activeSelectedId) ?? activeRooms[0] ?? null;
  const messages = (useQuery(api.socialChats.listRoomMessages, activeRoom ? { roomId: activeRoom._id } : "skip") ?? []) as RoomMessage[];

  const privateNotesQuery = useQuery(api.notes.getPrivateNotes, mode === "private" && convexUser ? { createdBy: convexUser._id } : "skip");
  const privateIdeasQuery = useQuery(api.ideas.getPrivateIdeas, mode === "private" && convexUser ? { createdBy: convexUser._id } : "skip");
  const privateResourcesQuery = useQuery(api.resources.getPrivateResources, mode === "private" && convexUser ? { createdBy: convexUser._id } : "skip");
  const workspaceNotesQuery = useQuery(api.notes.getNotes, mode === "workspace" && selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip");
  const workspaceResourcesQuery = useQuery(api.resources.getResources, mode === "workspace" && selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip");

  const privateNotes = privateNotesQuery ?? [];
  const privateIdeas = privateIdeasQuery ?? [];
  const privateResources = privateResourcesQuery ?? [];
  const workspaceNotes = workspaceNotesQuery ?? [];
  const workspaceResources = workspaceResourcesQuery ?? [];

  const startDirectRoom = useMutation(api.socialChats.createDirectRoom);
  const createWorkspaceRoom = useMutation(api.socialChats.createWorkspaceRoom);
  const sendMessage = useMutation(api.socialChats.sendMessage);
  const sendSharedMessage = useMutation(api.socialChats.sendSharedMessage);
  const sendAiAnalysisMessage = useMutation(api.socialChats.sendAiAnalysisMessage);
  const markRoomRead = useMutation(api.socialChats.markRoomRead);
  const sendFriendRequest = useMutation(api.social.sendFriendRequest);
  const respondToFriendRequest = useMutation(api.social.respondToFriendRequest);
  const createNote = useMutation(api.notes.createNote);
  const createIdea = useMutation(api.ideas.createIdea);
  const createResource = useMutation(api.resources.createResource);

  const shareKind = composer.startsWith("/link")
    ? "resource"
    : mode === "private" && composer.startsWith("/ideas")
      ? "idea"
      : mode === "workspace" && composer.startsWith("/confluence")
        ? "note"
        : mode === "private" && composer.startsWith("/notes")
          ? "note"
          : null;

  const shareItems = (() => {
    if (shareKind === "resource") {
      const source = mode === "private" ? privateResources : workspaceResources;
      return source.slice(0, 8).map((item) => ({ title: item.url, description: item.description, meta: item.url }));
    }
    if (shareKind === "idea") {
      const source = privateIdeas;
      return source.slice(0, 8).map((item) => ({ title: item.title, description: item.description, meta: item.tags.join(", ") || "Idea" }));
    }
    if (shareKind === "note") {
      const source = mode === "private" ? privateNotes : workspaceNotes;
      return source.slice(0, 8).map((item) => ({ title: item.title, description: item.content.replace(/<[^>]+>/g, " ").trim().slice(0, 140) || "Shared note", meta: "Note" }));
    }
    return [];
  })();

  const filteredRooms = activeRooms.filter((room) => `${room.title} ${room.lastMessagePreview ?? ""} ${room.objective ?? ""}`.toLowerCase().includes(searchValue.toLowerCase()));

  const handleOpenPrivateChat = async (friendUserId: Id<"users">) => {
    try {
      const roomId = await startDirectRoom({ friendUserId });
      setMode("private");
      setSelectedPrivateRoomId(roomId);
      setPeopleOpen(false);
      setMobileView("chat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open chat.");
    }
  };

  const handleSend = async () => {
    if (!activeRoom || !composer.trim()) return;
    try {
      await sendMessage({ roomId: activeRoom._id, body: composer });
      setComposer("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message.");
    }
  };

  const handleShare = async (item: { title: string; description: string; meta: string }) => {
    if (!activeRoom || !shareKind) return;
    try {
      await sendSharedMessage({
        roomId: activeRoom._id,
        shareType: shareKind,
        shareTitle: item.title,
        shareDescription: item.description,
        shareMeta: item.meta,
      });
      setComposer("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share item.");
    }
  };

  const handleAnalyzeUnread = async () => {
    if (!activeRoom) return;
    try {
      const unreadMessages = messages.filter((message) => message.senderKind === "user").slice(-20);
      const context = unreadMessages.map((message) => `${message.sender?.name ?? message.senderKind}: ${message.body}`).join("\n");
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Summarize unread chat context, extract tasks, mention shared files/resources, and suggest a concise reply.",
          context,
          contextType: "note",
        }),
      });
      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok || data.error || !data.result) {
        throw new Error(data.error ?? "AI analysis failed.");
      }
      await sendAiAnalysisMessage({ roomId: activeRoom._id, body: data.result });
      toast.success("AI summary posted to chat.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI analysis failed.");
    }
  };

  const handleImportShared = async (message: (typeof messages)[number]) => {
    if (!convexUser || !message.shareType || !message.shareTitle) return;
    try {
      if (message.shareType === "note") {
        await createNote({
          scope: mode,
          workspaceId: mode === "workspace" ? selectedWorkspaceId ?? undefined : undefined,
          title: message.shareTitle,
          content: message.shareDescription ?? "",
          createdBy: convexUser._id,
        });
      } else if (message.shareType === "idea") {
        await createIdea({
          scope: "private",
          workspaceId: undefined,
          title: message.shareTitle,
          description: message.shareDescription ?? "",
          tags: [],
          createdBy: convexUser._id,
        });
      } else if (message.shareType === "resource") {
        await createResource({
          scope: mode,
          workspaceId: mode === "workspace" ? selectedWorkspaceId ?? undefined : undefined,
          url: message.shareMeta ?? "https://example.com",
          description: message.shareDescription ?? message.shareTitle,
          createdBy: convexUser._id,
        });
      }
      toast.success("Imported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    }
  };

  if (!user || convexUser === undefined) {
    return <div className="flex h-full items-center justify-center" style={{ backgroundColor: "var(--canvas)", color: "var(--mute)" }}>Loading chats...</div>;
  }

  return (
    <div className="h-full overflow-hidden" style={{ backgroundColor: "var(--canvas)" }}>
      <div className="flex h-full overflow-hidden border" style={{ borderColor: "var(--hairline)" }}>
        <LeftRail mode={mode} onModeChange={setMode} />

        <div className={`${mobileView === "chat" ? "hidden md:flex" : "flex"} relative h-full w-full md:w-[440px] xl:w-[520px] shrink-0 flex-col border-r`} style={{ backgroundColor: "#050507", borderColor: "var(--hairline)" }}>
          <div className="border-b px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[28px] font-medium tracking-tight" style={{ color: "var(--ink)" }}>{mode === "private" ? "Private Chats" : workspace?.name ?? "Workspace Chats"}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{mode === "private" ? "Friends only direct messaging" : "Objective-specific rooms for workspace members"}</p>
              </div>
              <div className="flex items-center gap-2">
                {mode === "private" ? (
                  <button type="button" onClick={() => setPeopleOpen(true)} className="rounded-full p-2 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--mute)" }}><UserPlus size={18} /></button>
                ) : (
                  <button type="button" onClick={() => setWorkspaceModalOpen(true)} className="rounded-full p-2 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--mute)" }}><MessageCirclePlus size={18} /></button>
                )}
                <button type="button" className="rounded-full p-2 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--mute)" }}><Menu size={18} /></button>
              </div>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
              <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder={mode === "private" ? "Search friends or start a chat" : "Search workspace chats"} className="h-11 w-full rounded-full border pl-11 pr-4 text-sm outline-none" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--hairline)", color: "var(--ink)" }} />
            </div>
          </div>

          <div className="border-b px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
            <div className="flex gap-2 overflow-x-auto">
              <button type="button" onClick={() => setMode("private")} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: mode === "private" ? "rgba(17,255,153,0.12)" : "var(--surface-card)", borderColor: mode === "private" ? "rgba(17,255,153,0.22)" : "var(--hairline)", color: mode === "private" ? "var(--accent-green)" : "var(--body)" }}>Private</button>
              <button type="button" onClick={() => setMode("workspace")} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: mode === "workspace" ? "rgba(17,255,153,0.12)" : "var(--surface-card)", borderColor: mode === "workspace" ? "rgba(17,255,153,0.22)" : "var(--hairline)", color: mode === "workspace" ? "var(--accent-green)" : "var(--body)" }}>Workspace</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {filteredRooms.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Folder size={36} className="mb-4" style={{ color: "var(--stone)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>No chats yet</p>
                <p className="mt-2 max-w-xs text-sm" style={{ color: "var(--mute)" }}>{mode === "private" ? "Add friends to start private chats." : "Create a workspace room for a specific objective."}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredRooms.map((room) => {
                  const selected = activeRoom?._id === room._id;
                  return (
                    <button
                      key={room._id}
                      type="button"
                      onClick={() => {
                        if (mode === "private") setSelectedPrivateRoomId(room._id);
                        else setSelectedWorkspaceRoomId(room._id);
                        setMobileView("chat");
                        void markRoomRead({ roomId: room._id });
                      }}
                      className="group flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors"
                      style={strictPanelStyle(selected)}
                    >
                      <Avatar label={(room.displayName ?? room.title).slice(0, 2)} color={selected ? "rgba(17,255,153,0.12)" : "var(--surface-elevated)"} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{room.displayName ?? room.title}</p>
                              {mode === "workspace" ? <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: "rgba(17,255,153,0.22)", backgroundColor: "rgba(17,255,153,0.1)", color: "var(--accent-green)" }}><StatusDot /> AI</span> : null}
                            </div>
                            <p className="mt-0.5 truncate text-xs" style={{ color: "var(--mute)" }}>{room.objective ?? (mode === "private" ? room.otherUser?.email ?? "Friend chat" : "Workspace room")}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-[11px]" style={{ color: "var(--mute)" }}>{new Date(room.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {room.unreadCount ? <span className="inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "rgba(17,255,153,0.16)", color: "var(--accent-green)" }}>{room.unreadCount}</span> : room.lastMessagePreview ? <CheckCheck size={14} style={{ color: "#7ec8ff" }} /> : null}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm" style={{ color: "var(--charcoal)" }}>{room.lastMessagePreview ?? "No messages yet"}</p>
                          {mode === "private" ? <Pin size={12} style={{ color: "var(--mute)" }} /> : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={`${mobileView === "list" ? "hidden md:flex" : "flex"} relative min-w-0 flex-1 flex-col`} style={{ backgroundColor: "var(--canvas)" }}>
          {activeRoom ? (
            <>
              <div className="flex items-center justify-between border-b px-4 py-3 md:px-6" style={{ borderColor: "var(--hairline)", backgroundColor: "rgba(5,5,7,0.96)" }}>
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={() => setMobileView("list")} className="md:hidden" style={{ color: "var(--ink)" }}><ArrowLeft size={18} /></button>
                  <Avatar label={(activeRoom.displayName ?? activeRoom.title).slice(0, 2)} color="var(--surface-elevated)" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{activeRoom.displayName ?? activeRoom.title}</p>
                      <StatusDot />
                    </div>
                    <p className="truncate text-xs" style={{ color: "var(--mute)" }}>{mode === "private" ? "friend chat" : activeRoom.objective ?? "workspace objective thread"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2" style={{ color: "var(--mute)" }}>
                  <button type="button" onClick={() => void handleAnalyzeUnread()} className="rounded-full p-2 hover:bg-[var(--surface-elevated)]"><Sparkles size={17} /></button>
                  <button type="button" className="rounded-full p-2 hover:bg-[var(--surface-elevated)]"><Search size={17} /></button>
                  <button type="button" className="rounded-full p-2 hover:bg-[var(--surface-elevated)]"><Phone size={17} /></button>
                  <button type="button" className="rounded-full p-2 hover:bg-[var(--surface-elevated)]"><MoreVertical size={17} /></button>
                </div>
              </div>

              <div className="border-b px-4 py-3 md:px-6" style={{ borderColor: "var(--hairline)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border px-3 py-1 text-[11px]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--body)" }}>
                    {mode === "private" ? "Private friend chat" : workspace?.name ?? "Workspace"}
                  </span>
                  {activeRoom.unreadCount && activeRoom.unreadCount > 5 ? <span className="rounded-full border px-3 py-1 text-[11px]" style={{ borderColor: "rgba(17,255,153,0.22)", backgroundColor: "rgba(17,255,153,0.1)", color: "var(--accent-green)" }}>AI can analyze {activeRoom.unreadCount} unread messages</span> : null}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6" style={{ background: "radial-gradient(circle at top, rgba(255,255,255,0.04), transparent 36%), var(--canvas)" }}>
                <div className="flex justify-center py-2">
                  <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]" style={{ borderColor: "var(--hairline)", backgroundColor: "rgba(255,255,255,0.04)", color: "var(--mute)" }}>Today</span>
                </div>
                <div className="space-y-2">
                  {messages.map((message: RoomMessage) => {
                    const isOutgoing = currentUserId ? message.senderId === currentUserId : false;
                    return (
                      <div key={message._id} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[78%] rounded-[18px] px-4 py-2.5" style={{ backgroundColor: isOutgoing ? "rgba(17,255,153,0.16)" : "var(--surface-elevated)", color: "var(--ink)", borderTopRightRadius: isOutgoing ? 6 : 18, borderTopLeftRadius: isOutgoing ? 18 : 6 }}>
                          {!isOutgoing && message.sender && mode === "workspace" ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--mute)" }}>{message.sender.name}</p> : null}
                          {message.messageType === "share" ? (
                            <SharedMessageCard message={message} onImport={() => void handleImportShared(message)} />
                          ) : (
                            <p className="text-sm leading-7" style={{ color: message.senderKind === "ai" ? "var(--body)" : "var(--ink)" }}>{message.body}</p>
                          )}
                          <div className={`mt-1 flex items-center gap-1 ${isOutgoing ? "justify-end" : "justify-start"}`}>
                            <span className="text-[11px]" style={{ color: "var(--mute)" }}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {isOutgoing ? <CheckCheck size={12} style={{ color: "#7ec8ff" }} /> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t px-4 py-3 md:px-6" style={{ borderColor: "var(--hairline)", backgroundColor: "#050507" }}>
                <div className="mb-3 flex gap-2 overflow-x-auto">
                  {["Reply casually", "Make it professional", "Summarize", "Create task"].map((item) => (
                    <button key={item} type="button" className="rounded-full border px-3 py-1.5 text-[11px] font-medium whitespace-nowrap" style={{ borderColor: "var(--hairline)", backgroundColor: "rgba(255,255,255,0.04)", color: "var(--body)" }}>{item}</button>
                  ))}
                </div>
                {shareKind ? <ShareMenu kind={shareKind} items={shareItems} onShare={(item) => void handleShare(item)} /> : null}
                <div className="flex items-end gap-3 rounded-[20px] border px-3 py-2" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
                  <button type="button" className="rounded-full p-2 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--mute)" }}><Plus size={18} /></button>
                  <button type="button" className="rounded-full p-2 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--mute)" }}><UserRound size={18} /></button>
                  <textarea value={composer} onChange={(event) => setComposer(event.target.value)} rows={1} placeholder={mode === "private" ? "Type a message or use /link, /ideas, /notes" : "Type a message or use /link, /confluence"} className="max-h-28 min-h-[24px] flex-1 resize-none bg-transparent py-2 text-sm outline-none" style={{ color: "var(--ink)" }} />
                  <button type="button" onClick={() => setAiMenuOpen((current) => !current)} className="rounded-full p-2 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--accent-green)" }}><WandSparkles size={18} /></button>
                  <button type="button" onClick={() => void handleSend()} className="rounded-full px-4 py-2 text-sm font-medium" style={{ backgroundColor: "var(--accent-green)", color: "#02160e" }}>Send</button>
                </div>
                {aiMenuOpen ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl border p-3 md:grid-cols-2" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
                    {["Rewrite message", "Summarize chat", "Generate reply", "Translate", "Extract tasks", "Ask AI about this chat"].map((item) => (
                      <button key={item} type="button" className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)" }}>
                        <Sparkles size={14} style={{ color: "var(--accent-green)" }} />
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center" style={{ color: "var(--mute)" }}>
              Select or create a chat.
            </div>
          )}

          <PeopleDrawer
            open={peopleOpen}
            onClose={() => setPeopleOpen(false)}
            searchValue={peopleSearchValue}
            onSearchChange={setPeopleSearchValue}
            directory={directory}
            requests={friendRequests}
            recommended={recommended}
            onRequest={(userId) => void sendFriendRequest({ toUserId: userId }).then(() => toast.success("Friend request sent.")).catch((error) => toast.error(error instanceof Error ? error.message : "Request failed."))}
            onAccept={(requestId) => void respondToFriendRequest({ requestId, accept: true }).then(() => toast.success("Friend request accepted.")).catch((error) => toast.error(error instanceof Error ? error.message : "Accept failed."))}
            onStartChat={(friendUserId) => void handleOpenPrivateChat(friendUserId)}
          />
        </div>
      </div>

      <CreateWorkspaceChatModal
        open={workspaceModalOpen}
        onClose={() => setWorkspaceModalOpen(false)}
        onCreate={async (title, objective) => {
          if (!selectedWorkspaceId) {
            toast.error("Select a workspace first.");
            return;
          }
          const roomId = await createWorkspaceRoom({ workspaceId: selectedWorkspaceId, title, objective });
          setMode("workspace");
          setSelectedWorkspaceRoomId(roomId);
          toast.success("Workspace chat created.");
        }}
      />
    </div>
  );
}
