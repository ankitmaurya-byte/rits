"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { 
  Copy, FileText, Trash2, Clock, Menu, ChevronRight,
  ChevronDown, Folder, FolderPlus, FilePlus, Share2, FolderOpen
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { NoteEditor } from "@/components/notes/editor";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type NoteDoc = Doc<"notes">;
type Scope = "private" | "workspace";
type NoteKind = "folder" | "file";
type RoomOption = { id: string; label: string; meta: string };
type DropIntent = "before" | "after" | "inside";
type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
};
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type CreateNoteArgs = {
  scope: Scope;
  workspaceId?: Id<"workspaces">;
  title: string;
  content: string;
  createdBy?: Id<"users">;
  kind?: NoteKind;
  parentId?: Id<"notes">;
  sortOrder?: number;
};
type UpdateNoteArgs = {
  id: Id<"notes">;
  title?: string;
  content?: string;
  kind?: NoteKind;
  parentId?: Id<"notes"> | null;
  sortOrder?: number;
};
type DeleteNoteArgs = {
  id: Id<"notes">;
};
type NoteTreeItemProps = {
  item: NoteDoc;
  allNotes: NoteDoc[];
  activeNoteId: Id<"notes"> | null;
  expandedFolders: Set<Id<"notes">>;
  draggedNoteId: Id<"notes"> | null;
  dropTarget: { id: Id<"notes">; intent: DropIntent } | null;
  toggleFolder: (folderId: Id<"notes">) => void;
  handleSelect: (id: Id<"notes">, content: string) => void;
  handleDragStart: (event: DragEvent<HTMLElement>, note: NoteDoc) => void;
  handleDragOverItem: (event: DragEvent<HTMLElement>, target: NoteDoc) => void;
  handleDropOnItem: (event: DragEvent<HTMLElement>, target: NoteDoc) => Promise<void>;
  resetDragState: () => void;
  deleteNote: (args: DeleteNoteArgs) => Promise<unknown>;
  confirm: ConfirmFn;
  depth?: number;
};
type ConfluenceLayoutProps = {
  notes?: NoteDoc[];
  createNote: (args: CreateNoteArgs) => Promise<Id<"notes">>;
  updateNote: (args: UpdateNoteArgs) => Promise<unknown>;
  deleteNote: (args: DeleteNoteArgs) => Promise<unknown>;
  confirm: ConfirmFn;
  convexUser?: Doc<"users"> | null;
  scope: Scope;
  workspaceId?: Id<"workspaces">;
};

const ORDER_GAP = 1024;
const EMPTY_NOTES: NoteDoc[] = [];
const SIDEBAR_DEFAULT_WIDTH = 288;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 520;

function clampSidebarWidth(width: number) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select" || Boolean(target.closest("[contenteditable='true']"));
}

function getSortOrder(note: NoteDoc) {
  return note.sortOrder ?? note._creationTime;
}

function sortNotes(items: NoteDoc[]) {
  return [...items].sort((left, right) => {
    const orderDelta = getSortOrder(left) - getSortOrder(right);
    if (orderDelta !== 0) return orderDelta;
    return left._creationTime - right._creationTime;
  });
}

function getInsertSortOrder(orderedSiblings: NoteDoc[], insertIndex: number) {
  const previous = orderedSiblings[insertIndex - 1];
  const next = orderedSiblings[insertIndex];
  if (previous && next) return (getSortOrder(previous) + getSortOrder(next)) / 2;
  if (previous) return getSortOrder(previous) + ORDER_GAP;
  if (next) return getSortOrder(next) - ORDER_GAP;
  return Date.now();
}

function getDropIntent(event: DragEvent<HTMLElement>, target: NoteDoc): DropIntent {
  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const edgeSize = rect.height * 0.28;

  if (target.kind === "folder") {
    if (y < edgeSize) return "before";
    if (y > rect.height - edgeSize) return "after";
    return "inside";
  }

  return y < rect.height / 2 ? "before" : "after";
}

function ShareNoteDialog({
  note,
  rooms,
  onClose,
  onShare,
  onCopyLink,
}: {
  note: NoteDoc | null;
  rooms: RoomOption[];
  onClose: () => void;
  onShare: (roomId: string) => void;
  onCopyLink: (note: NoteDoc) => void;
}) {
  return (
    <Dialog open={Boolean(note)} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl" overlayClassName="bg-black/35 supports-backdrop-filter:backdrop-blur-[2px]">
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--ink)" }}>Share note</DialogTitle>
          </DialogHeader>
        </div>
        <div className="space-y-5 p-5">
          <div className="rounded-lg border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{note?.title}</p>
            <button
              type="button"
              onClick={() => note && onCopyLink(note)}
              className="btn-outline mt-3 h-9 px-3 text-xs"
              disabled={!note}
            >
              <Copy size={14} /> Copy URL
            </button>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Share in chats</p>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NoteTreeItem({
  item,
  allNotes,
  activeNoteId,
  expandedFolders,
  draggedNoteId,
  dropTarget,
  toggleFolder,
  handleSelect,
  handleDragStart,
  handleDragOverItem,
  handleDropOnItem,
  resetDragState,
  deleteNote,
  confirm,
  depth = 0
}: NoteTreeItemProps) {
  const children = sortNotes(allNotes.filter((n) => n.parentId === item._id));
  const isFolder = item.kind === "folder";
  const isExpanded = expandedFolders.has(item._id);
  const isSelected = activeNoteId === item._id;
  const activeDrop = dropTarget?.id === item._id ? dropTarget.intent : null;
  const dropClass = activeDrop === "inside"
    ? "ring-1 ring-blue-400/70 bg-blue-500/10"
    : activeDrop === "before"
      ? "border-t-blue-400"
      : activeDrop === "after"
        ? "border-b-blue-400"
        : "border-y-transparent";
  const draggingClass = draggedNoteId === item._id ? "opacity-45" : "";

  return (
    <div>
      <div 
        className={`w-full text-left transition-colors group relative cursor-grab active:cursor-grabbing ${draggingClass}`}
        style={{ 
          backgroundColor: isSelected ? "var(--surface-elevated)" : "transparent"
        }}
        draggable
        onDragStart={(event) => handleDragStart(event, item)}
        onDragOver={(event) => handleDragOverItem(event, item)}
        onDragEnd={resetDragState}
        onDrop={(event) => void handleDropOnItem(event, item)}
      >
        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
        <div 
          className={`flex items-center justify-between border-y py-2 pr-4 hover:bg-[var(--surface-elevated)] ${dropClass}`}
          style={{ paddingLeft: `${(depth * 12) + 12}px` }}
          onClick={() => {
            if (isFolder) {
              toggleFolder(item._id);
            } else {
              handleSelect(item._id, item.content);
            }
          }}
        >
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            {isFolder ? (
              isExpanded ? <ChevronDown size={14} className="shrink-0 text-[var(--stone)]" /> : <ChevronRight size={14} className="shrink-0 text-[var(--stone)]" />
            ) : (
              <div className="w-[14px] shrink-0" />
            )}
            
            {isFolder ? (
              isExpanded ? <FolderOpen size={14} className="shrink-0 text-blue-400" /> : <Folder size={14} className="shrink-0 text-blue-400" />
            ) : (
              <FileText size={14} className="shrink-0 text-[var(--stone)]" />
            )}
            
            <span className="truncate text-sm font-medium text-[var(--ink)]">{item.title}</span>
          </div>

          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                void (async () => { 
                  const confirmed = await confirm({ 
                    title: `Delete ${isFolder ? 'folder' : 'note'}?`, 
                    description: isFolder ? "This folder and all its contents will be removed permanently." : "This note will be removed permanently.", 
                    confirmLabel: "Delete", 
                    variant: "destructive" 
                  }); 
                  if (!confirmed) return; 
                  deleteNote({ id: item._id })
                    .then(() => toast.success("Deleted!"))
                    .catch(() => toast.error("Failed to delete"));
                })(); 
              }}
              className="p-1 rounded text-[var(--stone)] hover:text-[var(--accent-red)] transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
      
      {isFolder && isExpanded && (
        <div className="flex flex-col">
          {children.length === 0 ? (
            <div className="py-1 text-xs text-[var(--mute)] italic" style={{ paddingLeft: `${((depth + 1) * 12) + 32}px` }}>
              Empty folder
            </div>
          ) : (
            children.map((child) => (
              <NoteTreeItem 
                key={child._id} 
                item={child} 
                allNotes={allNotes} 
                activeNoteId={activeNoteId} 
                expandedFolders={expandedFolders} 
                draggedNoteId={draggedNoteId}
                dropTarget={dropTarget}
                toggleFolder={toggleFolder} 
                handleSelect={handleSelect} 
                handleDragStart={handleDragStart}
                handleDragOverItem={handleDragOverItem}
                handleDropOnItem={handleDropOnItem}
                resetDragState={resetDragState}
                deleteNote={deleteNote} 
                confirm={confirm}
                depth={depth + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function ConfluenceLayout({
  notes,
  createNote,
  updateNote,
  deleteNote,
  confirm,
  convexUser,
  scope,
  workspaceId
}: ConfluenceLayoutProps) {
  const [view, setView] = useState<"sidebar" | "gallery">("sidebar");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"notes"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const sidebarShellRef = useRef<HTMLDivElement | null>(null);
  
  // Folder state
  const [expandedFolders, setExpandedFolders] = useState<Set<Id<"notes">>>(new Set());
  const [currentFolderId, setCurrentFolderId] = useState<Id<"notes"> | null>(null); // For gallery view
  const [showCreate, setShowCreate] = useState<"folder" | "file" | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const [previewNote, setPreviewNote] = useState<NoteDoc | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<Id<"notes"> | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: Id<"notes">; intent: DropIntent } | null>(null);
  const [galleryDropActive, setGalleryDropActive] = useState(false);
  const [initialUrlNoteId] = useState(() => (
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("noteId")
  ));
  const [dismissedUrlNoteId, setDismissedUrlNoteId] = useState<string | null>(null);
  
  const allNotes = notes ?? EMPTY_NOTES;
  const activeNote = allNotes.find((n) => n._id === selectedId);
  const urlPreviewNote = useMemo(() => {
    if (!initialUrlNoteId || dismissedUrlNoteId === initialUrlNoteId) return null;
    const note = allNotes.find((item) => item._id === initialUrlNoteId) ?? null;
    return note?.kind === "folder" ? null : note;
  }, [allNotes, dismissedUrlNoteId, initialUrlNoteId]);
  const activePreviewNote = previewNote ?? urlPreviewNote;

  useEffect(() => {
    if (view !== "gallery" || !currentFolderId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" || isEditableTarget(event.target)) return;
      event.preventDefault();
      const folder = allNotes.find((item) => item._id === currentFolderId);
      setCurrentFolderId(folder?.parentId ?? null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allNotes, currentFolderId, view]);

  useEffect(() => {
    if (!resizingSidebar) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (event: MouseEvent) => {
      const shellRect = sidebarShellRef.current?.getBoundingClientRect();
      if (!shellRect) return;
      setSidebarWidth(clampSidebarWidth(event.clientX - shellRect.left));
    };

    const handleMouseUp = () => {
      setResizingSidebar(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingSidebar]);

  const toggleFolder = (folderId: Id<"notes">) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleSelect = (id: Id<"notes">, content: string) => {
    setSelectedId(id);
    setEditContent(content);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const parentId = currentFolderId ?? undefined;
      const id = await createNote({ 
        scope, 
        workspaceId: scope === "workspace" ? workspaceId : undefined, 
        title: newTitle.trim(), 
        content: "", 
        createdBy: convexUser?._id,
        kind: showCreate === "folder" ? "folder" : "file",
        parentId
      });
      
      setNewTitle(""); 
      
      if (showCreate === "file") {
        handleSelect(id, "");
        setView("sidebar");
      } else if (showCreate === "folder" && parentId) {
        setExpandedFolders(prev => new Set(prev).add(parentId));
      }
      setShowCreate(null);
      toast.success(`${showCreate === "folder" ? "Folder" : "File"} created!`);
    } catch (e) {
      toast.error("Failed to create item.");
      console.error(e);
    }
  };

  const rootItems = sortNotes(allNotes.filter((n) => !n.parentId));
  const galleryItems = sortNotes(allNotes.filter((n) => n.parentId === (currentFolderId || undefined)));

  const [shareNote, setShareNote] = useState<NoteDoc | null>(null);
  const privateRoomsQuery = useQuery(api.socialChats.listPrivateRooms, {});
  const workspaceRoomsQuery = useQuery(api.socialChats.listWorkspaceRooms, scope === "workspace" && workspaceId ? { workspaceId } : "skip");
  const sendSharedMessage = useMutation(api.socialChats.sendSharedMessage);

  const rooms = useMemo(() => {
    const priv = (privateRoomsQuery || []).map((r) => ({ id: r._id, label: r.displayName || r.title, meta: "Private chat" }));
    const work = (workspaceRoomsQuery || []).map((r) => ({ id: r._id, label: r.title, meta: "Workspace chat" }));
    return [...priv, ...work];
  }, [privateRoomsQuery, workspaceRoomsQuery]);

  const handleShare = async (roomId: string) => {
    if (!shareNote) return;
    try {
      await sendSharedMessage({
        roomId: roomId as Id<"socialChatRooms">,
        shareType: "note",
        shareTitle: shareNote.title,
        shareDescription: shareNote.content ? shareNote.content.replace(/<[^>]+>/g, '').substring(0, 100) : "",
        shareMeta: JSON.stringify({ noteId: shareNote._id })
      });
      setShareNote(null);
      toast.success("Shared to chat!");
    } catch (e) {
      toast.error("Failed to share.");
      console.error(e);
    }
  };

  const handleCopyNoteUrl = async (note: NoteDoc) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("noteId", note._id);
      await navigator.clipboard.writeText(url.toString());
      toast.success("Note URL copied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy note URL.");
    }
  };

  const resetDragState = () => {
    setDraggedNoteId(null);
    setDropTarget(null);
    setGalleryDropActive(false);
  };

  const getSiblings = (parentId: Id<"notes"> | null, excludeId?: Id<"notes">) => (
    sortNotes(allNotes.filter((note) => (note.parentId ?? null) === parentId && note._id !== excludeId))
  );

  const isDescendantOf = (candidate: NoteDoc, ancestorId: Id<"notes">) => {
    let parentId = candidate.parentId;
    while (parentId) {
      if (parentId === ancestorId) return true;
      parentId = allNotes.find((note) => note._id === parentId)?.parentId;
    }
    return false;
  };

  const getSortOrderForTarget = (target: NoteDoc, intent: Exclude<DropIntent, "inside">, draggedId: Id<"notes">) => {
    const parentId = target.parentId ?? null;
    const siblings = getSiblings(parentId, draggedId);
    const targetIndex = siblings.findIndex((note) => note._id === target._id);
    if (targetIndex < 0) return getInsertSortOrder(siblings, siblings.length);
    return getInsertSortOrder(siblings, intent === "after" ? targetIndex + 1 : targetIndex);
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, note: NoteDoc) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", note._id);
    setDraggedNoteId(note._id);
  };

  const handleDragOverItem = (event: DragEvent<HTMLElement>, target: NoteDoc) => {
    if (!draggedNoteId || draggedNoteId === target._id) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropTarget({ id: target._id, intent: getDropIntent(event, target) });
  };

  const handleDropOnItem = async (event: DragEvent<HTMLElement>, target: NoteDoc) => {
    event.preventDefault();
    event.stopPropagation();

    const dragged = allNotes.find((note) => note._id === draggedNoteId);
    if (!dragged || dragged._id === target._id) {
      resetDragState();
      return;
    }

    const intent = dropTarget?.id === target._id ? dropTarget.intent : getDropIntent(event, target);

    try {
      if (intent === "inside" && target.kind === "folder") {
        if (isDescendantOf(target, dragged._id)) {
          toast.error("Cannot move a folder into its own child.");
          return;
        }

        const siblings = getSiblings(target._id, dragged._id);
        await updateNote({
          id: dragged._id,
          parentId: target._id,
          sortOrder: getInsertSortOrder(siblings, siblings.length),
        });
        setExpandedFolders((previous) => new Set(previous).add(target._id));
        toast.success(`Moved to ${target.title}.`);
        return;
      }

      const parentId = target.parentId ?? null;
      await updateNote({
        id: dragged._id,
        parentId,
        sortOrder: getSortOrderForTarget(target, intent === "inside" ? "after" : intent, dragged._id),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move item.");
    } finally {
      resetDragState();
    }
  };

  const handleDropOnRoot = async (event: DragEvent<HTMLDivElement>) => {
    if (!draggedNoteId) return;
    event.preventDefault();

    const dragged = allNotes.find((note) => note._id === draggedNoteId);
    if (!dragged) {
      resetDragState();
      return;
    }

    const siblings = getSiblings(null, dragged._id);
    try {
      await updateNote({
        id: dragged._id,
        parentId: null,
        sortOrder: getInsertSortOrder(siblings, siblings.length),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move item.");
    } finally {
      resetDragState();
    }
  };

  const handleDropOnGallery = async (event: DragEvent<HTMLDivElement>) => {
    if (!draggedNoteId) return;
    event.preventDefault();

    const dragged = allNotes.find((note) => note._id === draggedNoteId);
    if (!dragged) {
      resetDragState();
      return;
    }

    const parentId = currentFolderId ?? null;
    const siblings = getSiblings(parentId, dragged._id);
    try {
      await updateNote({
        id: dragged._id,
        parentId,
        sortOrder: getInsertSortOrder(siblings, siblings.length),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move item.");
    } finally {
      resetDragState();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-[var(--canvas)]">
      <Dialog
        open={Boolean(activePreviewNote)}
        onOpenChange={(value) => {
          if (value) return;
          if (previewNote) {
            setPreviewNote(null);
            return;
          }
          setDismissedUrlNoteId(initialUrlNoteId);
        }}
      >
        {activePreviewNote ? (
          <DialogContent
            showCloseButton
            overlayClassName="bg-black/35 supports-backdrop-filter:backdrop-blur-[2px]"
            className="!top-1/2 !-translate-y-1/2 max-h-[96vh] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-6xl 2xl:max-w-[1320px]"
          >
            <div className="sticky top-0 z-20 border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
              <DialogHeader>
                <div className="flex items-center gap-3 pr-11">
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }}>
                    <FileText size={13} /> File
                  </span>
                  {typeof activePreviewNote._creationTime === "number" ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>
                      <Clock size={13} /> {formatDistanceToNow(activePreviewNote._creationTime, { addSuffix: true })}
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="truncate text-xl sm:text-2xl" style={{ color: "var(--ink)" }}>
                      {activePreviewNote.title || "Untitled file"}
                    </DialogTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShareNote(activePreviewNote)}
                    className="btn-outline h-9 self-start px-3 text-xs"
                  >
                    <Share2 size={14} /> Share
                  </button>
                </div>
              </DialogHeader>
            </div>

            <div className="min-h-[420px] overflow-hidden" style={{ backgroundColor: "var(--canvas)", height: "min(860px, calc(96vh - 88px))" }}>
              <NoteEditor
                className="h-full w-full !rounded-none !border-0 shadow-none"
                content={activePreviewNote.content}
                minHeight="0px"
                onChange={(value) => {
                  updateNote({ id: activePreviewNote._id, content: value, title: activePreviewNote.title });
                  setPreviewNote({ ...activePreviewNote, content: value });
                }}
              />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <ShareNoteDialog note={shareNote} rooms={rooms} onClose={() => setShareNote(null)} onShare={handleShare} onCopyLink={(note) => void handleCopyNoteUrl(note)} />
      
      <div className="flex items-center justify-center py-3 border-b shrink-0 z-20" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
        <div className="flex items-center gap-1 p-1 bg-[var(--surface-elevated)] border border-[var(--hairline-strong)] rounded-lg shrink-0">
          <button onClick={() => setView("sidebar")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "sidebar" ? "bg-[var(--ink)] text-[var(--canvas)] shadow-sm" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}>
            Sidebar View
          </button>
          <button onClick={() => setView("gallery")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "gallery" ? "bg-[var(--ink)] text-[var(--canvas)] shadow-sm" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}>
            Gallery View
          </button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 relative">
        {view === "sidebar" ? (
          <div ref={sidebarShellRef} className="flex h-full w-full overflow-hidden bg-[var(--canvas)]">
            <div
              className={`relative flex shrink-0 flex-col overflow-hidden border-r ${resizingSidebar ? "" : "transition-all duration-300 ease-in-out"}`}
              style={{ borderColor: resizingSidebar ? "var(--accent-blue)" : "var(--hairline-strong)", backgroundColor: "var(--surface-deep)", width: sidebarOpen ? `${sidebarWidth}px` : "0px", opacity: sidebarOpen ? 1 : 0, borderRightWidth: sidebarOpen ? "1px" : "0px" }}
            >
              <div className="flex items-center justify-between px-4 py-4 shrink-0 border-b" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
                <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>Explorer</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setCurrentFolderId(null); setShowCreate("file"); }} className="p-1 rounded hover:bg-[var(--surface-elevated)] text-[var(--body)]" title="New Note">
                    <FilePlus size={16} />
                  </button>
                  <button onClick={() => { setCurrentFolderId(null); setShowCreate("folder"); }} className="p-1 rounded hover:bg-[var(--surface-elevated)] text-[var(--body)]" title="New Folder">
                    <FolderPlus size={16} />
                  </button>
                </div>
              </div>

              {showCreate && (
                <div className="p-3 border-b z-10 relative bg-[var(--surface-card)]" style={{ borderColor: "var(--hairline-strong)" }}>
                  <input autoFocus placeholder={`New ${showCreate}...`} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(null); }}
                    className="w-full bg-[var(--surface-elevated)] border border-[var(--hairline)] rounded-md px-3 py-1.5 text-sm text-[var(--ink)] mb-2 outline-none" />
                  <div className="flex gap-2">
                    <button onClick={handleCreate} className="flex-1 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium">Create</button>
                    <button onClick={() => setShowCreate(null)} className="flex-1 py-1 rounded border border-[var(--hairline-strong)] text-[var(--charcoal)] text-xs font-medium">Cancel</button>
                  </div>
                </div>
              )}

              <div
                className="flex-1 overflow-y-auto py-2"
                onDragOver={(event) => {
                  if (!draggedNoteId) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTarget(null);
                }}
                onDrop={(event) => void handleDropOnRoot(event)}
              >
                {rootItems.map((item) => (
                  <NoteTreeItem 
                    key={item._id} 
                    item={item} 
                    allNotes={allNotes} 
                    activeNoteId={selectedId} 
                    expandedFolders={expandedFolders} 
                    draggedNoteId={draggedNoteId}
                    dropTarget={dropTarget}
                    toggleFolder={toggleFolder} 
                    handleSelect={handleSelect} 
                    handleDragStart={handleDragStart}
                    handleDragOverItem={handleDragOverItem}
                    handleDropOnItem={handleDropOnItem}
                    resetDragState={resetDragState}
                    deleteNote={deleteNote} 
                    confirm={confirm} 
                  />
                ))}
              </div>
              {sidebarOpen ? (
                <button
                  type="button"
                  aria-label="Resize explorer sidebar"
                  title="Resize sidebar"
                  className="group absolute -right-1 top-0 z-40 h-full w-2 cursor-col-resize"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setResizingSidebar(true);
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
                  }}
                >
                  <span
                    className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 transition-colors group-hover:bg-[var(--accent-blue)]"
                    style={{ backgroundColor: resizingSidebar ? "var(--accent-blue)" : "transparent" }}
                  />
                </button>
              ) : null}
            </div>

            <div className="flex flex-col flex-1 overflow-hidden relative bg-[var(--canvas)]">
              {sidebarOpen ? null : (
                <button onClick={() => setSidebarOpen(true)} className="absolute top-4 left-4 z-50 p-2 rounded-md transition-colors bg-[var(--surface-elevated)] border border-[var(--hairline-strong)] text-[var(--body)] hover:text-[var(--ink)] shadow-sm">
                  <Menu size={18} />
                </button>
              )}
              {activeNote ? (
                <div className="flex-1 overflow-hidden relative z-10 bg-[var(--surface-card)]">
                  <NoteEditor 
                    className="w-full h-full !border-0 !rounded-none shadow-none" 
                    content={editContent} 
                    minHeight="100%" 
                    onChange={(value) => {
                      setEditContent(value);
                      updateNote({ id: activeNote._id, content: value, title: activeNote.title });
                    }} 
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center relative z-10">
                  <FileText size={48} className="mb-8 text-[var(--stone)]" />
                  <h3 className="text-xl font-medium mb-3 text-[var(--ink)]">Select a file</h3>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full bg-[#191919] overflow-auto relative p-8">
            <div className="max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-4 mb-8">
                {currentFolderId && (
                  <button onClick={() => {
                    const folder = allNotes.find((n) => n._id === currentFolderId);
                    setCurrentFolderId(folder?.parentId || null);
                  }} className="p-2 bg-[var(--surface-elevated)] border border-[var(--hairline-strong)] rounded-lg text-[var(--body)] hover:text-[var(--ink)]">
                    <ChevronRight size={18} className="rotate-180" />
                  </button>
                )}
                <div className="text-2xl font-bold text-white flex items-center gap-2">
                  {currentFolderId ? allNotes.find((n) => n._id === currentFolderId)?.title : "Confluence Root"}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setShowCreate("folder")} className="px-3 py-1.5 rounded-md bg-[var(--surface-elevated)] text-[var(--body)] text-sm flex items-center gap-2"><FolderPlus size={16} /> New Folder</button>
                  <button onClick={() => setShowCreate("file")} className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm flex items-center gap-2"><FilePlus size={16} /> New File</button>
                </div>
              </div>

              {showCreate && (
                <div className="p-4 rounded-xl border z-10 relative mb-8 w-80" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
                  <input autoFocus placeholder={`New ${showCreate}...`} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(null); }}
                    className="w-full bg-[var(--surface-elevated)] border border-[var(--hairline)] rounded-md px-3 py-2 text-sm text-[var(--ink)] mb-3 outline-none" />
                  <div className="flex gap-2">
                    <button onClick={handleCreate} className="flex-1 py-1.5 rounded bg-blue-600 text-white text-xs font-medium">Create</button>
                    <button onClick={() => setShowCreate(null)} className="flex-1 py-1.5 rounded border border-[var(--hairline-strong)] text-[var(--charcoal)] text-xs font-medium">Cancel</button>
                  </div>
                </div>
              )}

              <div
                className={`flex min-h-[220px] flex-wrap gap-4 rounded-xl transition-colors ${galleryDropActive ? "outline outline-1 outline-blue-400/60 outline-offset-4" : ""}`}
                onDragOver={(event) => {
                  if (!draggedNoteId) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setGalleryDropActive(true);
                  setDropTarget(null);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  setGalleryDropActive(false);
                }}
                onDrop={(event) => void handleDropOnGallery(event)}
              >
                {galleryItems.map((item) => {
                  const activeDrop = dropTarget?.id === item._id ? dropTarget.intent : null;
                  const dropClass = activeDrop === "inside"
                    ? "ring-2 ring-blue-400"
                    : activeDrop === "before"
                      ? "border-t-4 border-t-blue-400"
                      : activeDrop === "after"
                        ? "border-b-4 border-b-blue-400"
                        : "";
                  const draggingClass = draggedNoteId === item._id ? "opacity-45" : "";

                  return item.kind === "folder" ? (
                    <button
                      key={item._id}
                      type="button"
                      draggable
                      onDragStart={(event) => handleDragStart(event, item)}
                      onDragOver={(event) => handleDragOverItem(event, item)}
                      onDragEnd={resetDragState}
                      onDrop={(event) => void handleDropOnItem(event, item)}
                      onClick={() => setCurrentFolderId(item._id)}
                      className={`relative flex h-[160px] w-[200px] cursor-grab flex-col items-center justify-center gap-3 rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface-deep)] transition-colors hover:bg-[var(--surface-elevated)] active:cursor-grabbing ${dropClass} ${draggingClass}`}
                    >
                      {activeDrop === "inside" ? (
                        <span className="absolute left-3 top-3 rounded-full bg-blue-500 px-2 py-1 text-[10px] font-medium text-white">
                          Drop inside
                        </span>
                      ) : null}
                      <Folder size={40} className="text-blue-400" />
                      <span className="w-full truncate px-4 text-sm font-medium text-[var(--ink)]">{item.title}</span>
                    </button>
                  ) : (
                    <div
                      key={item._id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, item)}
                      onDragOver={(event) => handleDragOverItem(event, item)}
                      onDragEnd={resetDragState}
                      onDrop={(event) => void handleDropOnItem(event, item)}
                      className={`group relative flex h-[184px] w-[236px] cursor-grab flex-col overflow-hidden rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface-deep)] transition-colors hover:bg-[var(--surface-elevated)] active:cursor-grabbing ${dropClass} ${draggingClass}`}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setShareNote(item);
                        }}
                        className="absolute right-3 top-3 z-10 rounded-md border border-[var(--hairline-strong)] bg-[var(--surface-card)] p-1.5 text-[var(--stone)] opacity-0 shadow-sm transition-all hover:bg-[var(--surface-elevated)] hover:text-blue-400 focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={`Share ${item.title}`}
                      >
                        <Share2 size={14} />
                      </button>
                      <div className="flex h-full cursor-pointer flex-col p-4 pr-12" onClick={() => setPreviewNote(item)}>
                        <h4 className="mb-2 line-clamp-1 text-base font-medium leading-snug text-[var(--ink)]">{item.title}</h4>
                        <p className="line-clamp-6 text-xs text-[var(--charcoal)]">{item.content ? item.content.replace(/<[^>]+>/g, '') : "Empty file"}</p>
                      </div>
                    </div>
                  );
                })}
                {galleryItems.length === 0 && (
                  <div className="w-full py-12 text-center text-[var(--charcoal)]">This folder is empty.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
