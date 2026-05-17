"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronRight,
  Copy,
  Folder,
  FolderPlus,
  Link2,
  MoreVertical,
  Plus,
  Search,
  Share2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ResourceScope = "private" | "workspace";
type DialogMode = "folder" | "link" | "rename";

type ResourceDoc = {
  _id: Id<"resources">;
  url: string;
  description: string;
  createdAt: number;
};

type ResourceItem = {
  id: string;
  type: "folder" | "link";
  title: string;
  url?: string;
  parentId: string | null;
  createdAt: string;
  resourceId?: Id<"resources">;
  description?: string;
};

type FolderDraft = {
  id: string;
  title: string;
  parentId: string | null;
  createdAt: string;
};

type LinkMeta = {
  parentId: string | null;
  title?: string;
};

type ExplorerState = {
  folders: FolderDraft[];
  linkMeta: Record<string, LinkMeta>;
};

type SharePayload = {
  title: string;
  items: Array<{
    id: string;
    type: "folder" | "link";
    title: string;
    url?: string;
    parentId: string | null;
    createdAt: string;
    description?: string;
  }>;
};

function getColumnLayout(folders: ResourceItem[], links: ResourceItem[]) {
  const total = folders.length + links.length;

  if (total <= 10) {
    return {
      mode: "single" as const,
      folderHeight: null,
      linkHeight: null,
    };
  }

  if (folders.length <= 5 && links.length > 10) {
    return {
      mode: "split" as const,
      folderHeight: "20%",
      linkHeight: "80%",
    };
  }

  return {
    mode: "split" as const,
    folderHeight: "50%",
    linkHeight: "50%",
  };
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Link is required");
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return new URL(withProtocol).toString();
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

function getHostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFirstLine(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? "";
}

function getBaseTitle(url: string, description: string) {
  return truncate(getFirstLine(description) || getHostLabel(url), 80);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildNoteContent(url: string, description: string) {
  const paragraphs = description
    .split(/\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${escapeHtml(chunk)}</p>`);

  paragraphs.push(`<p>${escapeHtml(url)}</p>`);
  return paragraphs.join("");
}

function getStorageKey(scope: ResourceScope, workspaceId?: string | null) {
  return scope === "workspace" ? `rits-resource-explorer:workspace:${workspaceId ?? "none"}` : "rits-resource-explorer:private";
}

function loadExplorerState(key: string): ExplorerState {
  if (typeof window === "undefined") return { folders: [], linkMeta: {} };

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { folders: [], linkMeta: {} };
    const parsed = JSON.parse(raw) as ExplorerState;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      linkMeta: parsed.linkMeta && typeof parsed.linkMeta === "object" ? parsed.linkMeta : {},
    };
  } catch {
    return { folders: [], linkMeta: {} };
  }
}

function saveExplorerState(key: string, value: ExplorerState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function buildFolderSharePayload(folder: ResourceItem, items: ResourceItem[]): SharePayload {
  const folderIds = new Set<string>([folder.id]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.type === "folder" && item.parentId && folderIds.has(item.parentId) && !folderIds.has(item.id)) {
        folderIds.add(item.id);
        changed = true;
      }
    }
  }

  const sharedItems = items
    .filter((item) => item.parentId === folder.id || (item.parentId && folderIds.has(item.parentId)))
    .map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      url: item.url,
      parentId: item.parentId === folder.id ? null : item.parentId,
      createdAt: item.createdAt,
      description: item.description,
    }));

  return {
    title: folder.title,
    items: sharedItems,
  };
}

function ResourceToolbar({
  searchQuery,
  onSearchChange,
  onAddFolder,
  onAddLink,
  breadcrumb,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddFolder: () => void;
  onAddLink: () => void;
  breadcrumb: string[];
}) {
  return (
    <div className="border-b px-4 py-3" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Resources</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--charcoal)" }}>
            {breadcrumb.map((item, index) => (
              <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
                {index > 0 ? <ChevronRight size={14} style={{ color: "var(--mute)" }} /> : null}
                <span className="truncate">{item}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 lg:w-[320px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
            <input value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search folders and links" className="input-field pl-9" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onAddFolder} className="btn-outline"><FolderPlus size={15} /> Add Folder</button>
            <button type="button" onClick={onAddLink} className="btn-primary"><Plus size={15} /> Add Link</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceItemCard({
  item,
  selected,
  onClick,
  onRename,
  onDelete,
  onCreateTodo,
  onCreateNote,
  onCreateIdea,
  onCopyShare,
  onShareChats,
  draggable,
  dragging,
  dropActive,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDrop,
  onDragItemStart,
  onDragItemEnd,
}: {
  item: ResourceItem;
  selected: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCreateTodo: () => void;
  onCreateNote: () => void;
  onCreateIdea: () => void;
  onCopyShare?: () => void;
  onShareChats?: () => void;
  draggable?: boolean;
  dragging?: boolean;
  dropActive?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragEnter?: () => void;
  onDrop?: () => void;
  onDragItemStart?: () => void;
  onDragItemEnd?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        onDragItemStart?.();
        onDragStart?.();
      }}
      onDragEnd={() => {
        onDragEnd?.();
        onDragItemEnd?.();
      }}
      onDragEnter={() => onDragEnter?.()}
      onDragOver={(event) => {
        if (!onDrop) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!onDrop) return;
        event.preventDefault();
        onDrop();
      }}
      className="group flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors"
      style={{
        borderColor: dropActive ? "rgba(255,128,31,0.46)" : selected ? "rgba(59,158,255,0.4)" : "var(--hairline)",
        backgroundColor: dropActive ? "rgba(255,128,31,0.12)" : selected ? "rgba(59,158,255,0.12)" : "var(--surface-card)",
        opacity: dragging ? 0.45 : 1,
        cursor: draggable ? "grab" : undefined,
      }}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <div className="mt-0.5 shrink-0" style={{ color: item.type === "folder" ? "var(--accent-orange)" : "var(--accent-blue)" }}>
          {item.type === "folder" ? <Folder size={16} /> : <Link2 size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{item.title}</p>
          <p className="mt-1 truncate text-xs" style={{ color: "var(--mute)" }}>
            {item.type === "folder" ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : truncate(item.url ?? "", 42)}
          </p>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--mute)" }}>
            <MoreVertical size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
          {item.type === "folder" ? (
            <>
              <DropdownMenuItem onSelect={onCopyShare}><Copy size={14} /> Copy public link</DropdownMenuItem>
              <DropdownMenuItem onSelect={onShareChats}><Share2 size={14} /> Share to chats</DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {item.type === "link" ? (
            <>
              <DropdownMenuItem onSelect={onCreateTodo}>Turn into todo</DropdownMenuItem>
              <DropdownMenuItem onSelect={onCreateNote}>Turn into note</DropdownMenuItem>
              <DropdownMenuItem onSelect={onCreateIdea}>Turn into idea</DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ResourceColumn({
  title,
  items,
  selectedFolderId,
  onSelectFolder,
  onOpenLink,
  onRename,
  onDelete,
  onCreateTodo,
  onCreateNote,
  onCreateIdea,
  onCopyShare,
  onShareChats,
  draggingItemId,
  dropParentId,
  onDropToParent,
  onHoverFolder,
  onDragItemStart,
  parentId,
  columnIndex,
  onDragItemEnd,
}: {
  title: string;
  items: ResourceItem[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onOpenLink: (url: string) => void;
  onRename: (item: ResourceItem) => void;
  onDelete: (item: ResourceItem) => void;
  onCreateTodo: (item: ResourceItem) => void;
  onCreateNote: (item: ResourceItem) => void;
  onCreateIdea: (item: ResourceItem) => void;
  onCopyShare: (item: ResourceItem) => void;
  onShareChats: (item: ResourceItem) => void;
  draggingItemId: string | null;
  dropParentId: string | null;
  onDropToParent: (parentId: string | null) => void;
  onHoverFolder: (folderId: string, columnIndex: number) => void;
  onDragItemStart: (itemId: string) => void;
  parentId: string | null;
  columnIndex: number;
  onDragItemEnd: () => void;
}) {
  const folders = items.filter((item) => item.type === "folder");
  const links = items.filter((item) => item.type === "link");
  const layout = getColumnLayout(folders, links);

  const renderCard = (item: ResourceItem) => (
    <ResourceItemCard
      key={item.id}
      item={item}
      selected={item.type === "folder" && selectedFolderId === item.id}
      onClick={() => item.type === "folder" ? onSelectFolder(item.id) : onOpenLink(item.url ?? "")}
      onRename={() => onRename(item)}
      onDelete={() => onDelete(item)}
      onCreateTodo={() => onCreateTodo(item)}
      onCreateNote={() => onCreateNote(item)}
      onCreateIdea={() => onCreateIdea(item)}
      onCopyShare={item.type === "folder" ? () => onCopyShare(item) : undefined}
      onShareChats={item.type === "folder" ? () => onShareChats(item) : undefined}
      draggable
      dragging={draggingItemId === item.id}
      dropActive={item.type === "folder" && dropParentId === item.id}
      onDragItemStart={() => onDragItemStart(item.id)}
      onDragEnter={item.type === "folder" ? () => onHoverFolder(item.id, columnIndex) : undefined}
      onDrop={item.type === "folder" ? () => onDropToParent(item.id) : undefined}
      onDragItemEnd={onDragItemEnd}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-220px)] min-h-[520px] w-[300px] shrink-0 flex-col rounded-[18px] border" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
        <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{title}</p>
      </div>
      <div
        className="min-h-0 flex-1 p-3"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onDropToParent(parentId);
        }}
      >
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border text-center text-sm" style={{ borderColor: dropParentId === parentId ? "rgba(255,128,31,0.46)" : "var(--hairline)", backgroundColor: dropParentId === parentId ? "rgba(255,128,31,0.1)" : "var(--surface-deep)", color: "var(--charcoal)" }}>
            No resources here
          </div>
        ) : layout.mode === "single" ? (
          <div className="h-full space-y-2 overflow-y-auto pr-1">
            {[...folders, ...links].map(renderCard)}
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden rounded-xl border" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <div className="min-h-0 px-2 py-2" style={{ height: layout.folderHeight ?? undefined }}>
              <div className="h-full space-y-2 overflow-y-auto pr-1">
                {folders.length === 0 ? <p className="px-2 py-2 text-xs" style={{ color: "var(--mute)" }}>No folders</p> : folders.map(renderCard)}
              </div>
            </div>
            <div className="mx-3 h-px" style={{ backgroundColor: "rgba(255,128,31,0.4)" }} />
            <div className="min-h-0 px-2 py-2" style={{ height: layout.linkHeight ?? undefined }}>
              <div className="h-full space-y-2 overflow-y-auto pr-1">
                {links.length === 0 ? <p className="px-2 py-2 text-xs" style={{ color: "var(--mute)" }}>No links</p> : links.map(renderCard)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddResourceDialog({
  mode,
  initialTitle,
  onClose,
  onSubmit,
}: {
  mode: DialogMode | null;
  initialTitle: string;
  onClose: () => void;
  onSubmit: (values: { title: string; url: string; description: string }) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Dialog open={mode !== null} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "folder" ? "Add Folder" : mode === "link" ? "Add Link" : "Rename Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-field" placeholder={mode === "folder" ? "Folder title" : "Title"} />
          {mode === "link" ? (
            <>
              <input value={url} onChange={(event) => setUrl(event.target.value)} className="input-field" placeholder="https://example.com" />
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="input-field resize-none" placeholder="Optional context or note" />
            </>
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="button" onClick={() => onSubmit({ title, url, description })} className="btn-primary">Save</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareFolderDialog({
  folder,
  rooms,
  onClose,
  onShare,
}: {
  folder: ResourceItem | null;
  rooms: Array<{ id: string; label: string; meta: string }>;
  onClose: () => void;
  onShare: (roomId: string) => void;
}) {
  return (
    <Dialog open={Boolean(folder)} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share folder to chats</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "var(--charcoal)" }}>Send <span style={{ color: "var(--ink)", fontWeight: 600 }}>{folder?.title}</span> into a private or workspace chat.</p>
          <div className="max-h-[320px] space-y-2 overflow-y-auto">
            {rooms.length === 0 ? (
              <div className="rounded-xl border px-3 py-4 text-sm" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--charcoal)" }}>
                No chat rooms available.
              </div>
            ) : rooms.map((room) => (
              <button key={room.id} type="button" onClick={() => onShare(room.id)} className="w-full rounded-xl border px-3 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{room.label}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{room.meta}</p>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResourcesExplorer({
  scope,
  isWorkspace,
  selectedWorkspaceId,
  convexUser,
  titlePrefix,
  routeBase,
  resourceList,
  storageKey,
  createResource,
  deleteResource,
  createTodo,
  createNote,
  createIdea,
}: {
  scope: ResourceScope;
  isWorkspace: boolean;
  selectedWorkspaceId: Id<"workspaces"> | null;
  convexUser: { _id: Id<"users"> };
  titlePrefix: string;
  routeBase: string;
  resourceList: ResourceDoc[];
  storageKey: string;
  createResource: ReturnType<typeof useMutation<typeof api.resources.createResource>>;
  deleteResource: ReturnType<typeof useMutation<typeof api.resources.deleteResource>>;
  createTodo: ReturnType<typeof useMutation<typeof api.todos.createTodo>>;
  createNote: ReturnType<typeof useMutation<typeof api.notes.createNote>>;
  createIdea: ReturnType<typeof useMutation<typeof api.ideas.createIdea>>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const initialState = useMemo(() => loadExplorerState(storageKey), [storageKey]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [renameTarget, setRenameTarget] = useState<ResourceItem | null>(null);
  const [shareFolder, setShareFolder] = useState<ResourceItem | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropParentId, setDropParentId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderDraft[]>(initialState.folders);
  const [linkMeta, setLinkMeta] = useState<Record<string, LinkMeta>>(initialState.linkMeta);
  const privateRoomsQuery = useQuery(api.socialChats.listPrivateRooms, {});
  const workspaceRoomsQuery = useQuery(api.socialChats.listWorkspaceRooms, isWorkspace && selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip");
  const privateRooms = useMemo(
    () => (privateRoomsQuery ?? []) as Array<{ _id: Id<"socialChatRooms">; displayName?: string; title: string; scope: "private" | "workspace" }>,
    [privateRoomsQuery]
  );
  const workspaceRooms = useMemo(
    () => (workspaceRoomsQuery ?? []) as Array<{ _id: Id<"socialChatRooms">; title: string; scope: "private" | "workspace" }>,
    [workspaceRoomsQuery]
  );
  const createFolderShare = useMutation(api.resources.createFolderShare);
  const sendSharedMessage = useMutation(api.socialChats.sendSharedMessage);

  useEffect(() => {
    saveExplorerState(storageKey, { folders, linkMeta });
  }, [folders, linkMeta, storageKey]);

  const mergedItems = useMemo(() => {
    const folderItems: ResourceItem[] = folders.map((folder) => ({ id: folder.id, type: "folder", title: folder.title, parentId: folder.parentId, createdAt: folder.createdAt }));
    const linkItems: ResourceItem[] = resourceList.map((resource) => {
      const meta = linkMeta[resource._id] ?? { parentId: null };
      return {
        id: resource._id,
        type: "link",
        title: meta.title?.trim() || getBaseTitle(resource.url, resource.description),
        url: resource.url,
        parentId: meta.parentId ?? null,
        createdAt: new Date(resource.createdAt).toISOString(),
        resourceId: resource._id,
        description: resource.description,
      };
    });
    return [...folderItems, ...linkItems];
  }, [folders, linkMeta, resourceList]);

  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const breadcrumb = useMemo(() => [titlePrefix, ...selectedPath.map((folderId) => folderById.get(folderId)?.title ?? "Folder")], [folderById, selectedPath, titlePrefix]);
  const columns = useMemo(() => {
    const parentIds = [null, ...selectedPath];
    return parentIds.map((parentId, index) => ({
      title: index === 0 ? titlePrefix : folderById.get(parentId ?? "")?.title ?? "Folder",
      selectedFolderId: selectedPath[index] ?? null,
      columnIndex: index,
      items: mergedItems
        .filter((item) => item.parentId === parentId)
        .filter((item) => {
          const query = searchQuery.trim().toLowerCase();
          if (!query) return true;
          return `${item.title} ${item.url ?? ""} ${item.description ?? ""}`.toLowerCase().includes(query);
        })
        .sort((left, right) => {
          if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
          return left.title.localeCompare(right.title);
        }),
    }));
  }, [folderById, mergedItems, searchQuery, selectedPath, titlePrefix]);

  const availableRooms = useMemo(
    () => [
      ...privateRooms.map((room) => ({ id: room._id, label: room.displayName ?? room.title, meta: "Private chat" })),
      ...workspaceRooms.map((room) => ({ id: room._id, label: room.title, meta: "Workspace chat" })),
    ],
    [privateRooms, workspaceRooms]
  );

  const currentParentId = selectedPath[selectedPath.length - 1] ?? null;

  const isDescendantFolder = (folderId: string, candidateParentId: string | null) => {
    if (!candidateParentId) return false;
    if (candidateParentId === folderId) return true;
    let cursor: string | null = candidateParentId;
    while (cursor) {
      const parent = folderById.get(cursor);
      if (!parent) return false;
      if (parent.parentId === folderId) return true;
      cursor = parent.parentId;
    }
    return false;
  };

  const hoverTimerRef = useRef<number | null>(null);

  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleHoverFolder = (folderId: string, columnIndex: number) => {
    if (!draggingItemId) return;
    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => {
      setSelectedPath((current) => [...current.slice(0, columnIndex), folderId]);
    }, 450);
    setDropParentId(folderId);
  };

  const moveItemToParent = (itemId: string, parentId: string | null) => {
    const item = mergedItems.find((entry) => entry.id === itemId);
    if (!item) return;
    if (item.type === "folder") {
      if (isDescendantFolder(item.id, parentId)) {
        toast.error("A folder cannot be moved into itself or its children.");
        return;
      }
      setFolders((current) => current.map((folder) => folder.id === item.id ? { ...folder, parentId } : folder));
      return;
    }
    if (item.resourceId) {
      setLinkMeta((current) => ({
        ...current,
        [item.resourceId!]: {
          parentId,
          title: current[item.resourceId!]?.title ?? item.title,
        },
      }));
    }
  };

  const handleDropToParent = (parentId: string | null) => {
    if (!draggingItemId) return;
    clearHoverTimer();
    moveItemToParent(draggingItemId, parentId);
    setDraggingItemId(null);
    setDropParentId(null);
    toast.success("Item moved.");
  };

  const handleCreateLink = async (values: { title: string; url: string; description: string }) => {
    try {
      const normalizedUrl = normalizeUrl(values.url);
      const description = values.description.trim() ? `${values.title.trim()}\n${values.description.trim()}` : values.title.trim();
      const resourceId = await createResource({
        scope,
        workspaceId: isWorkspace ? selectedWorkspaceId ?? undefined : undefined,
        url: normalizedUrl,
        description,
        createdBy: convexUser._id,
      });
      setLinkMeta((current) => ({ ...current, [resourceId]: { parentId: currentParentId, title: values.title.trim() || getHostLabel(normalizedUrl) } }));
      setDialogMode(null);
      toast.success("Link saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save link.");
    }
  };

  const handleCreateFolder = (values: { title: string }) => {
    const title = values.title.trim();
    if (!title) {
      toast.error("Folder title is required.");
      return;
    }
    setFolders((current) => [...current, { id: `folder-${Date.now()}`, title, parentId: currentParentId, createdAt: new Date().toISOString() }]);
    setDialogMode(null);
    toast.success("Folder created.");
  };

  const handleRename = (values: { title: string }) => {
    const title = values.title.trim();
    if (!renameTarget || !title) return;
    if (renameTarget.type === "folder") {
      setFolders((current) => current.map((folder) => folder.id === renameTarget.id ? { ...folder, title } : folder));
    } else if (renameTarget.resourceId) {
      setLinkMeta((current) => ({ ...current, [renameTarget.resourceId!]: { parentId: current[renameTarget.resourceId!]?.parentId ?? null, title } }));
    }
    setDialogMode(null);
    setRenameTarget(null);
    toast.success("Renamed.");
  };

  const handleDelete = async (item: ResourceItem) => {
    const confirmed = await confirm({
      title: `Delete ${item.type}?`,
      description: item.type === "folder" ? "Child folders and links will move up one level." : "This saved link will be removed.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    if (item.type === "folder") {
      setFolders((current) => current.filter((folder) => folder.id !== item.id).map((folder) => folder.parentId === item.id ? { ...folder, parentId: item.parentId } : folder));
      setLinkMeta((current) => Object.fromEntries(Object.entries(current).map(([resourceId, meta]) => [resourceId, meta.parentId === item.id ? { ...meta, parentId: item.parentId } : meta])));
      setSelectedPath((current) => {
        const index = current.indexOf(item.id);
        return index === -1 ? current : current.slice(0, index);
      });
      toast.success("Folder deleted.");
      return;
    }
    if (item.resourceId) {
      await deleteResource({ id: item.resourceId });
      setLinkMeta((current) => {
        const next = { ...current };
        delete next[item.resourceId!];
        return next;
      });
      toast.success("Link deleted.");
    }
  };

  const handleCreateTodo = async (item: ResourceItem) => {
    if (item.type !== "link") return;
    try {
      await createTodo({
        scope,
        workspaceId: isWorkspace ? selectedWorkspaceId ?? undefined : undefined,
        title: truncate(`Review ${item.title}`, 120),
        priority: "medium",
        status: "todo",
        createdBy: convexUser._id,
        groupId: isWorkspace ? null : undefined,
        sourceUrl: item.url,
        sourceDescription: item.description?.trim() || undefined,
      });
      toast.success("Added to todos.");
    } catch {
      toast.error("Failed to create todo.");
    }
  };

  const handleCreateNote = async (item: ResourceItem) => {
    if (item.type !== "link" || !item.url) return;
    try {
      const noteId = await createNote({
        scope,
        workspaceId: isWorkspace ? selectedWorkspaceId ?? undefined : undefined,
        title: item.title,
        content: buildNoteContent(item.url, item.description ?? item.title),
        createdBy: convexUser._id,
      });
      toast.success("Note created from resource.");
      router.push(`${routeBase}/notes?note=${noteId}`);
    } catch {
      toast.error("Failed to create note.");
    }
  };

  const handleCreateIdea = async (item: ResourceItem) => {
    if (item.type !== "link" || !item.url) return;
    try {
      await createIdea({
        scope,
        workspaceId: isWorkspace ? selectedWorkspaceId ?? undefined : undefined,
        title: item.title,
        description: item.description?.trim() ? `${item.description.trim()}\n\nSource: ${item.url}` : `Source: ${item.url}`,
        tags: [],
        createdBy: convexUser._id,
      });
      toast.success("Idea created from resource.");
      router.push(`${routeBase}/ideas`);
    } catch {
      toast.error("Failed to create idea.");
    }
  };

  const createFolderShareLink = async (folder: ResourceItem) => {
    const payload = buildFolderSharePayload(folder, mergedItems);
    const shareToken = await createFolderShare({
      scope,
      workspaceId: isWorkspace ? selectedWorkspaceId ?? undefined : undefined,
      title: folder.title,
      payload: JSON.stringify(payload),
    });
    return `${window.location.origin}/share/resources/${shareToken}`;
  };

  const handleCopyShare = async (item: ResourceItem) => {
    if (item.type !== "folder") return;
    try {
      const url = await createFolderShareLink(item);
      await navigator.clipboard.writeText(url);
      toast.success("Public share link copied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create share link.");
    }
  };

  const handleShareToRoom = async (roomId: string) => {
    if (!shareFolder) return;
    try {
      const url = await createFolderShareLink(shareFolder);
      await sendSharedMessage({
        roomId: roomId as Id<"socialChatRooms">,
        shareType: "resource",
        shareTitle: `${shareFolder.title} folder`,
        shareDescription: `Shared resource folder: ${shareFolder.title}`,
        shareMeta: url,
      });
      setShareFolder(null);
      toast.success("Folder shared to chat.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share folder.");
    }
  };

  return (
    <div className="animate-fade-in-up h-full" style={{ padding: 0, maxWidth: "none" }}>
      <ResourceToolbar searchQuery={searchQuery} onSearchChange={setSearchQuery} onAddFolder={() => { setRenameTarget(null); setDialogMode("folder"); }} onAddLink={() => { setRenameTarget(null); setDialogMode("link"); }} breadcrumb={breadcrumb} />

      <div className="overflow-x-auto px-4 py-4">
        <div className="flex gap-3">
          {columns.map((column) => (
            <ResourceColumn
              key={`${column.title}-${column.columnIndex}-${column.selectedFolderId ?? "root"}`}
              title={column.title}
              items={column.items}
              selectedFolderId={column.selectedFolderId}
              onSelectFolder={(folderId) => setSelectedPath((current) => [...current.slice(0, column.columnIndex), folderId])}
              onOpenLink={(url) => window.open(url, "_blank", "noopener,noreferrer")}
              onRename={(item) => { setRenameTarget(item); setDialogMode("rename"); }}
              onDelete={(item) => void handleDelete(item)}
              onCreateTodo={(item) => void handleCreateTodo(item)}
              onCreateNote={(item) => void handleCreateNote(item)}
              onCreateIdea={(item) => void handleCreateIdea(item)}
              onCopyShare={(item) => void handleCopyShare(item)}
              onShareChats={(item) => setShareFolder(item)}
              draggingItemId={draggingItemId}
              dropParentId={dropParentId}
              onDropToParent={handleDropToParent}
              onHoverFolder={handleHoverFolder}
              onDragItemStart={(itemId) => {
                clearHoverTimer();
                setDraggingItemId(itemId);
                setDropParentId(null);
              }}
              onDragItemEnd={() => {
                clearHoverTimer();
                setDraggingItemId(null);
                setDropParentId(null);
              }}
              parentId={column.columnIndex === 0 ? null : selectedPath[column.columnIndex - 1] ?? null}
              columnIndex={column.columnIndex}
            />
          ))}
        </div>
      </div>

      <AddResourceDialog
        key={`${dialogMode ?? "closed"}-${renameTarget?.id ?? "new"}`}
        mode={dialogMode}
        initialTitle={dialogMode === "rename" ? renameTarget?.title ?? "" : ""}
        onClose={() => { setDialogMode(null); setRenameTarget(null); }}
        onSubmit={(values) => {
          if (dialogMode === "folder") return handleCreateFolder(values);
          if (dialogMode === "link") return void handleCreateLink(values);
          return handleRename(values);
        }}
      />

      <ShareFolderDialog
        folder={shareFolder}
        rooms={availableRooms}
        onClose={() => setShareFolder(null)}
        onShare={(roomId) => void handleShareToRoom(roomId)}
      />
    </div>
  );
}

export function ResourcesPage({ scope }: { scope: ResourceScope }) {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();

  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const workspace = useQuery(
    api.workspaces.getWorkspaceById,
    scope === "workspace" && selectedWorkspaceId && user
      ? { workspaceId: selectedWorkspaceId, clerkId: user.id }
      : "skip"
  );
  const workspaceResources = useQuery(
    api.resources.getResources,
    scope === "workspace" && selectedWorkspaceId
      ? { workspaceId: selectedWorkspaceId }
      : "skip"
  );
  const privateResources = useQuery(
    api.resources.getPrivateResources,
    scope === "private" && convexUser
      ? { createdBy: convexUser._id }
      : "skip"
  );

  const createResource = useMutation(api.resources.createResource);
  const deleteResource = useMutation(api.resources.deleteResource);
  const createTodo = useMutation(api.todos.createTodo);
  const createNote = useMutation(api.notes.createNote);
  const createIdea = useMutation(api.ideas.createIdea);

  const resources = scope === "workspace" ? workspaceResources : privateResources;
  const isWorkspace = scope === "workspace";
  const titlePrefix = isWorkspace ? workspace?.name ?? "Workspace" : "Private";
  const routeBase = isWorkspace ? "/workspace" : "/private";
  const storageKey = useMemo(() => getStorageKey(scope, selectedWorkspaceId ?? null), [scope, selectedWorkspaceId]);

  if (isWorkspace && !selectedWorkspaceId) {
    return (
      <div className="page-container animate-fade-in-up flex flex-col items-center justify-center py-40 text-center">
        <Users size={40} className="mb-6" style={{ color: "var(--stone)" }} />
        <h2 className="text-2xl font-medium mb-3" style={{ color: "var(--ink)" }}>No workspace selected</h2>
        <p style={{ color: "var(--charcoal)" }}>Create or join a workspace using the sidebar.</p>
      </div>
    );
  }

  if (!user || convexUser === undefined || !convexUser || (isWorkspace && selectedWorkspaceId && workspace === undefined) || resources === undefined) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton h-10 w-52 mb-6" />
        <div className="skeleton h-[560px] rounded-2xl" />
      </div>
    );
  }

  return (
    <ResourcesExplorer
      key={storageKey}
      scope={scope}
      isWorkspace={isWorkspace}
      selectedWorkspaceId={selectedWorkspaceId}
      convexUser={convexUser}
      titlePrefix={titlePrefix}
      routeBase={routeBase}
      resourceList={resources as ResourceDoc[]}
      storageKey={storageKey}
      createResource={createResource}
      deleteResource={deleteResource}
      createTodo={createTodo}
      createNote={createNote}
      createIdea={createIdea}
    />
  );
}
