"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { 
  Copy, FileText, Trash2, Clock, ChevronRight,
  ChevronDown, Folder, FolderPlus, FilePlus, Share2, FolderOpen, Database, Pin, ListTree, Globe2, Lock, UserPlus, X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { NoteEditor } from "@/components/notes/editor";
import { DatabaseFileEditor, createDefaultDatabaseContent, getDatabasePreviewText, isDatabaseFileContent } from "@/components/notes/database-file-editor";
import { HierarchyFileEditor, createDefaultHierarchyContent, isHierarchyFileContent, type HierarchyEditorSettingsValue } from "@/components/notes/hierarchy-file-editor";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type NoteDoc = Doc<"notes">;
type Scope = "private" | "workspace";
type NoteKind = "folder" | "file";
type NoteFileType = "text" | "database" | "hierarchy";
type CreateMode = "folder" | "file" | "database" | "hierarchy";
type NotePermission = "read" | "comment" | "edit";
type RoomOption = { id: string; label: string; meta: string };
type NoteShareSettings = {
  noteId: Id<"notes">;
  publicShare: {
    _id: Id<"noteShares">;
    shareToken: string;
    linkAccess: "restricted" | "public";
    permission: NotePermission;
  } | null;
  invited: Array<{
    _id: Id<"noteShares">;
    shareToken: string;
    email: string;
    name: string;
    image: string | null;
    permission: NotePermission;
  }>;
};
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
  fileType?: NoteFileType;
  parentId?: Id<"notes">;
  sortOrder?: number;
};
type UpdateNoteArgs = {
  id: Id<"notes">;
  title?: string;
  content?: string;
  kind?: NoteKind;
  fileType?: NoteFileType;
  parentId?: Id<"notes"> | null;
  sortOrder?: number;
  isPinned?: boolean;
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
const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_COLLAPSE_WIDTH = 160;
const SIDEBAR_MAX_WIDTH = 520;
const DEFAULT_HIERARCHY_SETTINGS_VALUE: HierarchyEditorSettingsValue = {
  themeName: "Solarized Dark",
  textSize: 12,
  fontFamily: "monospace",
};

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

function getNoteFileType(note: NoteDoc | null): NoteFileType {
  if (!note || note.kind === "folder") return "text";
  if (note.fileType === "hierarchy") return "hierarchy";
  if (note.fileType === "database") return "database";
  
  if (isHierarchyFileContent(note.content)) return "hierarchy";
  if (isDatabaseFileContent(note.content)) return "database";
  return "text";
}

function getCreateLabel(mode: CreateMode) {
  if (mode === "folder") return "Folder";
  if (mode === "database") return "Database";
  if (mode === "hierarchy") return "Hierarchy";
  return "File";
}

function getNotePreviewText(note: NoteDoc) {
  if (getNoteFileType(note) === "database") return getDatabasePreviewText(note.content);
  if (getNoteFileType(note) === "hierarchy") return "Hierarchy Tree";
  return note.content ? note.content.replace(/<[^>]+>/g, "") : "Empty file";
}

function getIsPinned(note: NoteDoc) {
  return Boolean((note as NoteDoc & { isPinned?: boolean }).isPinned);
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
  shareSettings,
  isLoadingShareSettings,
  onClose,
  onShare,
  onCopyAppUrl,
  onSetPublicShare,
  onInviteUser,
  onRemoveInvite,
  onCopyShareLink,
}: {
  note: NoteDoc | null;
  rooms: RoomOption[];
  shareSettings?: NoteShareSettings | null;
  isLoadingShareSettings: boolean;
  onClose: () => void;
  onShare: (roomId: string) => void;
  onCopyAppUrl: (note: NoteDoc) => void;
  onSetPublicShare: (linkAccess: "restricted" | "public", permission: NotePermission) => Promise<void>;
  onInviteUser: (email: string, permission: NotePermission) => Promise<void>;
  onRemoveInvite: (shareId: Id<"noteShares">) => Promise<void>;
  onCopyShareLink: (shareToken?: string | null) => Promise<void>;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] = useState<NotePermission>("read");
  const [generalOverride, setGeneralOverride] = useState<{ noteId: string; linkAccess: "restricted" | "public"; permission: NotePermission } | null>(null);
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const activeGeneralOverride = generalOverride && generalOverride.noteId === note?._id ? generalOverride : null;
  const generalAccess = activeGeneralOverride?.linkAccess ?? shareSettings?.publicShare?.linkAccess ?? "restricted";
  const generalPermission = activeGeneralOverride?.permission ?? shareSettings?.publicShare?.permission ?? "read";

  const permissionOptions: Array<{ value: NotePermission; label: string }> = [
    { value: "read", label: "Viewer" },
    { value: "comment", label: "Commenter" },
    { value: "edit", label: "Editor" },
  ];

  const handleAccessChange = async (nextAccess: "restricted" | "public", nextPermission = generalPermission) => {
    if (note) setGeneralOverride({ noteId: note._id, linkAccess: nextAccess, permission: nextPermission });
    setIsSavingAccess(true);
    try {
      await onSetPublicShare(nextAccess, nextPermission);
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handlePermissionChange = async (nextPermission: NotePermission) => {
    if (note) setGeneralOverride({ noteId: note._id, linkAccess: generalAccess, permission: nextPermission });
    setIsSavingAccess(true);
    try {
      await onSetPublicShare(generalAccess, nextPermission);
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await onInviteUser(inviteEmail, invitePermission);
      setInviteEmail("");
      setInvitePermission("read");
    } finally {
      setIsInviting(false);
    }
  };

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
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{note?.title}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>Invite people or use a share link with Viewer, Commenter, or Editor access.</p>
              </div>
              <button type="button" onClick={() => note && onCopyAppUrl(note)} className="btn-outline h-9 px-3 text-xs" disabled={!note}>
                <Copy size={14} /> App URL
              </button>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Invite people</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void handleInvite(); }}
                placeholder="name@example.com"
                className="input-field min-w-0 flex-1"
              />
              <select
                value={invitePermission}
                onChange={(event) => setInvitePermission(event.target.value as NotePermission)}
                className="h-10 rounded-md border bg-[var(--surface-elevated)] px-3 text-xs font-medium outline-none"
                style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
              >
                {permissionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <button type="button" onClick={() => void handleInvite()} disabled={isInviting || !inviteEmail.trim()} className="btn-primary h-10 px-3 text-xs disabled:opacity-50">
                <UserPlus size={14} /> Invite
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {isLoadingShareSettings ? (
                <div className="rounded-lg border px-3 py-3 text-xs" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>Loading people...</div>
              ) : shareSettings?.invited.length ? shareSettings.invited.map((invite) => (
                <div key={invite._id} className="flex items-center gap-3 rounded-lg border px-3 py-2" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: "var(--surface-deep)", color: "var(--ink)" }}>
                    {invite.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{invite.name}</p>
                    <p className="truncate text-xs" style={{ color: "var(--mute)" }}>{invite.email}</p>
                  </div>
                  <span className="rounded-full border px-2 py-1 text-[11px] capitalize" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }}>
                    {invite.permission}
                  </span>
                  <button type="button" onClick={() => void onCopyShareLink(invite.shareToken)} className="p-1.5 text-[var(--mute)] transition-colors hover:text-[var(--ink)]" title="Copy invite link">
                    <Copy size={14} />
                  </button>
                  <button type="button" onClick={() => void onRemoveInvite(invite._id)} className="p-1.5 text-[var(--mute)] transition-colors hover:text-[var(--accent-red)]" title="Remove access">
                    <X size={14} />
                  </button>
                </div>
              )) : (
                <div className="rounded-lg border px-3 py-3 text-xs" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>No invited people yet.</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>General access</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--ink)" }}>
                  {generalAccess === "public" ? <Globe2 size={16} /> : <Lock size={16} />}
                </span>
                <div className="min-w-0">
                  <select
                    value={generalAccess}
                    disabled={isSavingAccess}
                    onChange={(event) => void handleAccessChange(event.target.value as "restricted" | "public")}
                    className="h-9 rounded-md border bg-[var(--surface-elevated)] px-3 text-sm font-medium outline-none"
                    style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
                  >
                    <option value="restricted">Restricted</option>
                    <option value="public">Anyone with the link</option>
                  </select>
                  <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>
                    {generalAccess === "public" ? "Anyone with the link can access this note." : "Only invited people can access this link."}
                  </p>
                </div>
              </div>
              <select
                value={generalPermission}
                disabled={isSavingAccess}
                onChange={(event) => void handlePermissionChange(event.target.value as NotePermission)}
                className="h-9 rounded-md border bg-[var(--surface-elevated)] px-3 text-xs font-medium outline-none"
                style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
              >
                {permissionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <button type="button" onClick={() => void onCopyShareLink(shareSettings?.publicShare?.shareToken)} className="btn-outline h-9 px-3 text-xs">
                <Copy size={14} /> Copy link
              </button>
            </div>
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
  const isDatabaseFile = !isFolder && getNoteFileType(item) === "database";
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
            ) : isDatabaseFile ? (
              <Database size={14} className="shrink-0 text-[var(--accent-green)]" />
            ) : getNoteFileType(item) === "hierarchy" ? (
              <ListTree size={14} className="shrink-0 text-purple-400" />
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

function HierarchyViewItem({
  item,
  allNotes,
  activeNoteId,
  expandedFolders,
  toggleFolder,
  handleSelect,
  depth = 0
}: Omit<NoteTreeItemProps, "draggedNoteId" | "dropTarget" | "handleDragStart" | "handleDragOverItem" | "handleDropOnItem" | "resetDragState" | "deleteNote" | "confirm">) {
  const children = sortNotes(allNotes.filter((n) => n.parentId === item._id));
  const isFolder = item.kind === "folder";
  const isDatabaseFile = !isFolder && getNoteFileType(item) === "database";
  const isExpanded = expandedFolders.has(item._id);
  const isSelected = activeNoteId === item._id;
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col w-full">
      <div 
        className={`flex items-center w-full border border-[var(--hairline)] -mt-[1px] transition-colors ${hasChildren ? "cursor-pointer hover:bg-[var(--surface-elevated)]" : "cursor-default"}`}
        style={{ 
          paddingLeft: `${(depth * 16) + 12}px`, 
          backgroundColor: isSelected ? "var(--surface-elevated)" : "transparent"
        }}
        onClick={() => {
          if (hasChildren) {
            toggleFolder(item._id);
          } else {
            handleSelect(item._id, item.content);
          }
        }}
      >
        <div className="flex items-center gap-2 py-2 pr-4 flex-1 overflow-hidden min-w-0">
          <div className="w-[14px] shrink-0 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? <ChevronDown size={14} className="text-[var(--stone)]" /> : <ChevronRight size={14} className="text-[var(--stone)]" />
            ) : null}
          </div>
          
          {isFolder ? (
            isExpanded ? <FolderOpen size={14} className="shrink-0 text-blue-400" /> : <Folder size={14} className="shrink-0 text-blue-400" />
          ) : isDatabaseFile ? (
            <Database size={14} className="shrink-0 text-[var(--accent-green)]" />
          ) : (
            <FileText size={14} className="shrink-0 text-[var(--stone)]" />
          )}
          
          <span className="truncate text-sm font-medium text-[var(--ink)] cursor-pointer" onClick={(e) => {
            if (!hasChildren) {
              e.stopPropagation();
              handleSelect(item._id, item.content);
            }
          }}>{item.title}</span>
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="flex flex-col w-full">
          {children.map((child) => (
            <HierarchyViewItem 
              key={child._id} 
              item={child} 
              allNotes={allNotes} 
              activeNoteId={activeNoteId} 
              expandedFolders={expandedFolders} 
              toggleFolder={toggleFolder} 
              handleSelect={handleSelect} 
              depth={depth + 1}
            />
          ))}
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
  const [view, setView] = useState<"sidebar" | "gallery" | "hierarchy">("sidebar");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"notes"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editorMode, setEditorMode] = useState<"read" | "edit">("read");
  const sidebarShellRef = useRef<HTMLDivElement | null>(null);
  
  // Folder state
  const [expandedFolders, setExpandedFolders] = useState<Set<Id<"notes">>>(new Set());
  const [currentFolderId, setCurrentFolderId] = useState<Id<"notes"> | null>(null); // For gallery view
  const [showCreate, setShowCreate] = useState<CreateMode | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const [previewNote, setPreviewNote] = useState<NoteDoc | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<Id<"notes"> | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: Id<"notes">; intent: DropIntent } | null>(null);
  const [galleryDropActive, setGalleryDropActive] = useState(false);
  const [pendingHierarchySettings, setPendingHierarchySettings] = useState<HierarchyEditorSettingsValue | null>(null);
  const [initialUrlNoteId] = useState(() => (
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("noteId")
  ));
  const [dismissedUrlNoteId, setDismissedUrlNoteId] = useState<string | null>(null);
  
  const allNotes = notes ?? EMPTY_NOTES;
  const activeNote = allNotes.find((n) => n._id === selectedId);
  const activeNoteFileType = getNoteFileType(activeNote ?? null);
  const urlPreviewNote = useMemo(() => {
    if (!initialUrlNoteId || dismissedUrlNoteId === initialUrlNoteId) return null;
    const note = allNotes.find((item) => item._id === initialUrlNoteId) ?? null;
    return note?.kind === "folder" ? null : note;
  }, [allNotes, dismissedUrlNoteId, initialUrlNoteId]);
  const activePreviewNote = previewNote ?? urlPreviewNote;
  const activePreviewFileType = getNoteFileType(activePreviewNote);
  const savedHierarchySettings = convexUser?.hierarchyEditorSettings ?? null;
  const activeHierarchySettings = pendingHierarchySettings ?? savedHierarchySettings ?? DEFAULT_HIERARCHY_SETTINGS_VALUE;
  const updateHierarchyEditorSettings = useMutation(api.users.updateHierarchyEditorSettings);
  const handleHierarchySettingsChange = useCallback((settings: HierarchyEditorSettingsValue) => {
    setPendingHierarchySettings(settings);
    void updateHierarchyEditorSettings(settings).catch((error) => {
      console.error(error);
      setPendingHierarchySettings(null);
      toast.error("Failed to save hierarchy appearance.");
    });
  }, [updateHierarchyEditorSettings]);

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
      const nextWidth = event.clientX - shellRect.left;
      if (nextWidth < SIDEBAR_COLLAPSE_WIDTH) {
        setSidebarOpen(false);
        setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
        setResizingSidebar(false);
        return;
      }
      setSidebarOpen(true);
      setSidebarWidth(clampSidebarWidth(nextWidth));
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

  useEffect(() => {
    const handleNavSelection = (event: Event) => {
      const href = event instanceof CustomEvent && typeof event.detail?.href === "string" ? event.detail.href : "";
      if (href !== "/private/notes" && href !== "/workspace/notes") return;
      setResizingSidebar(false);
      setSidebarOpen((open) => {
        if (!open) setSidebarWidth((width) => clampSidebarWidth(width || SIDEBAR_DEFAULT_WIDTH));
        return !open;
      });
    };

    window.addEventListener("rits-app-nav:select", handleNavSelection);
    return () => window.removeEventListener("rits-app-nav:select", handleNavSelection);
  }, []);

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
    setEditorMode("read");
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !showCreate) return;
    try {
      const parentId = currentFolderId ?? undefined;
      const isDatabase = showCreate === "database";
      const isHierarchy = showCreate === "hierarchy";
      
      let initialContent = "";
      if (isDatabase) initialContent = createDefaultDatabaseContent();
      else if (isHierarchy) initialContent = createDefaultHierarchyContent();
      
      const id = await createNote({ 
        scope, 
        workspaceId: scope === "workspace" ? workspaceId : undefined, 
        title: newTitle.trim(), 
        content: initialContent, 
        createdBy: convexUser?._id,
        kind: showCreate === "folder" ? "folder" : "file",
        fileType: showCreate === "folder" ? undefined : showCreate === "file" ? "text" : showCreate,
        parentId,
        sortOrder: Date.now()
      });
      
      setNewTitle(""); 
      
      if (showCreate === "file" || showCreate === "database") {
        handleSelect(id, initialContent);
        setView("sidebar");
      } else if (showCreate === "folder" && parentId) {
        setExpandedFolders(prev => new Set(prev).add(parentId));
      }
      setShowCreate(null);
      toast.success(`${getCreateLabel(showCreate)} created!`);
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
  const shareSettings = useQuery(api.notes.getNoteShareSettings, shareNote ? { noteId: shareNote._id } : "skip") as NoteShareSettings | undefined;
  const sendSharedMessage = useMutation(api.socialChats.sendSharedMessage);
  const setNotePublicShare = useMutation(api.notes.setNotePublicShare);
  const inviteNoteUser = useMutation(api.notes.inviteNoteUser);
  const removeNoteInvite = useMutation(api.notes.removeNoteInvite);

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
        shareDescription: getNoteFileType(shareNote) === "database"
          ? getDatabasePreviewText(shareNote.content)
          : shareNote.content ? shareNote.content.replace(/<[^>]+>/g, '').substring(0, 100) : "",
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

  const getSharedNoteUrl = (shareToken: string) => {
    const url = new URL(`/share/notes/${shareToken}`, window.location.origin);
    return url.toString();
  };

  const handleSetPublicShare = async (linkAccess: "restricted" | "public", permission: NotePermission) => {
    if (!shareNote) return;
    try {
      await setNotePublicShare({ noteId: shareNote._id, linkAccess, permission });
      toast.success(linkAccess === "public" ? "Public link updated." : "Link access restricted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update sharing.");
      throw error;
    }
  };

  const handleInviteUser = async (email: string, permission: NotePermission) => {
    if (!shareNote) return;
    try {
      const result = await inviteNoteUser({ noteId: shareNote._id, email, permission });
      await navigator.clipboard.writeText(getSharedNoteUrl(result.shareToken));
      toast.success("Invite added and link copied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite user.");
      throw error;
    }
  };

  const handleRemoveInvite = async (shareId: Id<"noteShares">) => {
    if (!shareNote) return;
    try {
      await removeNoteInvite({ noteId: shareNote._id, shareId });
      toast.success("Access removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove access.");
    }
  };

  const handleCopyShareLink = async (shareToken?: string | null) => {
    if (!shareNote) return;
    try {
      let token = shareToken;
      if (!token) {
        const result = await setNotePublicShare({
          noteId: shareNote._id,
          linkAccess: shareSettings?.publicShare?.linkAccess ?? "restricted",
          permission: shareSettings?.publicShare?.permission ?? "read",
        });
        token = result.shareToken;
      }
      await navigator.clipboard.writeText(getSharedNoteUrl(token));
      toast.success("Share link copied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy share link.");
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

  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    let current = currentFolderId;
    while (current) {
      const folder = allNotes.find(n => n._id === current);
      if (folder) {
        crumbs.unshift(folder);
        current = folder.parentId ?? null;
      } else {
        break;
      }
    }
    return crumbs;
  }, [currentFolderId, allNotes]);

  const renderActiveShareButton = (compact = false) => activeNote ? (
    <button
      type="button"
      onClick={() => setShareNote(activeNote)}
      className={`flex items-center gap-1.5 rounded-md border text-xs font-medium transition-colors hover:bg-[var(--surface-card)] ${compact ? "px-2.5 py-1.5" : "h-8 px-2.5"}`}
      style={{ borderColor: "var(--hairline-strong)", color: "var(--charcoal)", backgroundColor: "var(--surface-elevated)" }}
    >
      <Share2 size={compact ? 12 : 14} /> Share
    </button>
  ) : null;

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
                    {activePreviewFileType === "database" ? <Database size={13} /> : activePreviewFileType === "hierarchy" ? <ListTree size={13} /> : <FileText size={13} />} {activePreviewFileType === "database" ? "Database" : activePreviewFileType === "hierarchy" ? "Hierarchy" : "File"}
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
              {activePreviewFileType === "database" ? (
                <DatabaseFileEditor
                  content={activePreviewNote.content}
                  onChange={(value) => {
                    updateNote({ id: activePreviewNote._id, content: value, title: activePreviewNote.title, fileType: "database" });
                    setPreviewNote({ ...activePreviewNote, content: value });
                  }}
                />
              ) : activePreviewFileType === "hierarchy" ? (
                <HierarchyFileEditor
                  content={activePreviewNote.content}
                  settingsValue={activeHierarchySettings}
                  onSettingsValueChange={handleHierarchySettingsChange}
                  onChange={(value) => {
                    updateNote({ id: activePreviewNote._id, content: value, title: activePreviewNote.title, fileType: "hierarchy" });
                    setPreviewNote({ ...activePreviewNote, content: value });
                  }}
                />
              ) : (
                <NoteEditor
                  className="h-full w-full !rounded-none !border-0 shadow-none"
                  content={activePreviewNote.content}
                  minHeight="0px"
                  onChange={(value) => {
                    updateNote({ id: activePreviewNote._id, content: value, title: activePreviewNote.title, fileType: "text" });
                    setPreviewNote({ ...activePreviewNote, content: value });
                  }}
                />
              )}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <ShareNoteDialog
        note={shareNote}
        rooms={rooms}
        shareSettings={shareSettings}
        isLoadingShareSettings={Boolean(shareNote && shareSettings === undefined)}
        onClose={() => setShareNote(null)}
        onShare={handleShare}
        onCopyAppUrl={(note) => void handleCopyNoteUrl(note)}
        onSetPublicShare={handleSetPublicShare}
        onInviteUser={handleInviteUser}
        onRemoveInvite={handleRemoveInvite}
        onCopyShareLink={handleCopyShareLink}
      />
      
      <div className="flex-1 min-h-0 relative flex h-full w-full overflow-hidden bg-[var(--canvas)]">
        <div
          ref={sidebarShellRef}
          className={`relative flex shrink-0 flex-col overflow-hidden border-r ${resizingSidebar ? "" : "transition-all duration-300 ease-in-out"}`}
          style={{ borderColor: resizingSidebar ? "var(--accent-blue)" : "var(--hairline-strong)", backgroundColor: "var(--surface-deep)", width: sidebarOpen ? `${sidebarWidth}px` : "0px", opacity: sidebarOpen ? 1 : 0, borderRightWidth: sidebarOpen ? "1px" : "0px" }}
        >
          <div className="p-3 border-b shrink-0" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
            <div className="flex items-center gap-1 p-1 bg-[var(--surface-elevated)] border border-[var(--hairline-strong)] rounded-lg shrink-0">
              <button onClick={() => setView("sidebar")} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "sidebar" ? "bg-[var(--ink)] text-[var(--canvas)] shadow-sm" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}>
                Sidebar View
              </button>
              <button onClick={() => setView("gallery")} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "gallery" ? "bg-[var(--ink)] text-[var(--canvas)] shadow-sm" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}>
                Gallery View
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)" }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--mute)" }}>Explorer</span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setShowCreate("folder")} className="p-1 rounded hover:bg-[var(--surface-deep)] transition-colors text-[var(--charcoal)] hover:text-[var(--ink)]" title="New Folder"><FolderPlus size={14} /></button>
              <button onClick={() => setShowCreate("file")} className="p-1 rounded hover:bg-[var(--surface-deep)] transition-colors text-[var(--charcoal)] hover:text-[var(--ink)]" title="New Document"><FilePlus size={14} /></button>
              <button onClick={() => setShowCreate("database")} className="p-1 rounded hover:bg-[var(--surface-deep)] transition-colors text-[var(--charcoal)] hover:text-[var(--ink)]" title="New Database"><Database size={14} /></button>
              <button onClick={() => setShowCreate("hierarchy")} className="p-1 rounded hover:bg-[var(--surface-deep)] transition-colors text-[var(--charcoal)] hover:text-[var(--ink)]" title="New Hierarchy"><ListTree size={14} /></button>
            </div>
          </div>

          {showCreate && (
            <div className="p-3 border-b z-10 relative bg-[var(--surface-card)]" style={{ borderColor: "var(--hairline-strong)" }}>
              <input autoFocus placeholder={`New ${getCreateLabel(showCreate).toLowerCase()}...`} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
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
            {view === "sidebar" ? (
              rootItems.map((item) => (
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
              ))
            ) : (
              <div className="flex flex-col gap-4 px-2 py-2">
                <div className="flex flex-col gap-1">
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--mute)] mb-2">Navigation</p>
                  <button 
                    onClick={() => setCurrentFolderId(null)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFolderId === null ? "bg-[var(--surface-elevated)] text-[var(--ink)] shadow-sm" : "text-[var(--charcoal)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink)]"}`}
                  >
                    <Database size={16} className={currentFolderId === null ? "text-blue-400" : ""} /> 
                    Root Folder
                  </button>
                </div>

                <div className="flex flex-col gap-1 mt-2">
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--mute)] mb-2">Pinned Folders</p>
                  {allNotes.filter(n => n.kind === "folder" && getIsPinned(n)).map(folder => (
                    <button 
                      key={`pinned-${folder._id}`}
                      onClick={() => setCurrentFolderId(folder._id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFolderId === folder._id ? "bg-[var(--surface-elevated)] text-[var(--ink)] shadow-sm" : "text-[var(--charcoal)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink)]"}`}
                    >
                      <Pin size={14} className="text-[var(--accent-blue)] shrink-0" />
                      <span className="truncate">{folder.title}</span>
                    </button>
                  ))}
                  {allNotes.filter(n => n.kind === "folder" && getIsPinned(n)).length === 0 && (
                    <p className="px-3 py-1 text-xs text-[var(--mute)] italic">No pinned folders</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 mt-2">
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--mute)] mb-2">Quick Access</p>
                  {rootItems.filter(n => n.kind === "folder").map(folder => (
                    <button 
                      key={folder._id}
                      onClick={() => setCurrentFolderId(folder._id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFolderId === folder._id ? "bg-[var(--surface-elevated)] text-[var(--ink)] shadow-sm" : "text-[var(--charcoal)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink)]"}`}
                    >
                      <Folder size={16} className={currentFolderId === folder._id ? "text-blue-400" : "shrink-0"} /> 
                      <span className="truncate">{folder.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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

        {view === "sidebar" ? (
          <div className="flex flex-col flex-1 overflow-hidden relative bg-[var(--canvas)]">
            {activeNote ? (
              <div className="flex-1 overflow-hidden relative z-10 bg-[var(--surface-card)] flex flex-col">
                {activeNoteFileType !== "hierarchy" && (
                  <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-b" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)" }}>
                    <span className="text-xs font-medium truncate max-w-[200px]" style={{ color: "var(--mute)" }}>{activeNote.title}</span>
                    <div className="ml-auto">{renderActiveShareButton()}</div>
                    <div className="flex items-center p-0.5 rounded-lg" style={{ background: "var(--surface-deep)", border: "1px solid var(--hairline-strong)" }}>
                      <button
                        onClick={() => setEditorMode("read")}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                          editorMode === "read"
                            ? "bg-[var(--ink)] text-[var(--canvas)] shadow-sm"
                            : "text-[var(--charcoal)] hover:text-[var(--ink)]"
                        }`}
                      >
                        Read
                      </button>
                      <button
                        onClick={() => setEditorMode("edit")}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                          editorMode === "edit"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-[var(--charcoal)] hover:text-[var(--ink)]"
                        }`}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}

                {/* Editor / Read-only content */}
                <div className="flex-1 overflow-hidden">
                  {editorMode === "read" ? (
                    /* Read-only view — hierarchy shows collapsible tree (if markdown), text shows HTML, database shows viewer */
                    activeNoteFileType === "hierarchy" && isHierarchyFileContent(editContent) ? (
                      <HierarchyFileEditor
                        content={editContent}
                        settingsValue={activeHierarchySettings}
                        onSettingsValueChange={handleHierarchySettingsChange}
                        viewMode={editorMode}
                        onViewModeChange={setEditorMode}
                        onChange={(value) => {
                          setEditContent(value);
                          updateNote({ id: activeNote._id, content: value, title: activeNote.title, fileType: "hierarchy" });
                        }}
                        headerActions={renderActiveShareButton(true)}
                        readOnly
                      />
                    ) : activeNoteFileType === "database" ? (
                      <DatabaseFileEditor
                        content={editContent}
                        onChange={() => {}}
                      />
                    ) : (
                      <div
                        className="h-full w-full overflow-y-auto px-10 py-8 prose prose-sm max-w-none"
                        style={{ color: "var(--ink)", background: "var(--surface-card)" }}
                        dangerouslySetInnerHTML={{ __html: editContent }}
                      />
                    )
                  ) : (
                    activeNoteFileType === "database" ? (
                      <DatabaseFileEditor
                        content={editContent}
                        onChange={(value) => {
                          setEditContent(value);
                          updateNote({ id: activeNote._id, content: value, title: activeNote.title, fileType: "database" });
                        }}
                      />
                    ) : activeNoteFileType === "hierarchy" ? (
                      <HierarchyFileEditor
                        content={editContent}
                        settingsValue={activeHierarchySettings}
                        onSettingsValueChange={handleHierarchySettingsChange}
                        viewMode={editorMode}
                        onViewModeChange={setEditorMode}
                        onChange={(value) => {
                          setEditContent(value);
                          updateNote({ id: activeNote._id, content: value, title: activeNote.title, fileType: "hierarchy" });
                        }}
                        headerActions={renderActiveShareButton(true)}
                      />
                    ) : (
                      <NoteEditor
                        className="w-full h-full !border-0 !rounded-none shadow-none"
                        content={editContent}
                        minHeight="100%"
                        onChange={(value) => {
                          setEditContent(value);
                          updateNote({
                            id: activeNote._id,
                            content: value,
                            title: activeNote.title,
                            fileType: "text",
                          });
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center relative z-10">
                <FileText size={48} className="mb-8 text-[var(--stone)]" />
                <h3 className="text-xl font-medium mb-3 text-[var(--ink)]">Select a file</h3>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-auto relative p-8 bg-[#191919]">
            <div className="max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="text-2xl font-bold text-white flex items-center gap-2">
                  <button onClick={() => setCurrentFolderId(null)} className="hover:text-[var(--accent-blue)] transition-colors">Confluence Root</button>
                  {breadcrumbs.map((crumb) => (
                    <div key={crumb._id} className="flex items-center gap-2">
                      <ChevronRight size={20} className="text-[var(--mute)]" />
                      <button onClick={() => setCurrentFolderId(crumb._id)} className="hover:text-[var(--accent-blue)] transition-colors">{crumb.title}</button>
                    </div>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setShowCreate("folder")} className="px-3 py-1.5 rounded-md bg-[var(--surface-elevated)] text-[var(--body)] text-sm flex items-center gap-2"><FolderPlus size={16} /> New Folder</button>
                  <button onClick={() => setShowCreate("file")} className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm flex items-center gap-2"><FilePlus size={16} /> New File</button>
                  <button onClick={() => setShowCreate("database")} className="px-3 py-1.5 rounded-md bg-[var(--accent-green)] text-[var(--canvas)] text-sm flex items-center gap-2"><Database size={16} /> New Database</button>
                </div>
              </div>

              {showCreate && (
                <div className="p-4 rounded-xl border z-10 relative mb-8 w-80" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
                  <input autoFocus placeholder={`New ${getCreateLabel(showCreate).toLowerCase()}...`} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
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
                    <div
                      key={item._id}
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(event) => handleDragStart(event, item)}
                      onDragOver={(event) => handleDragOverItem(event, item)}
                      onDragEnd={resetDragState}
                      onDrop={(event) => void handleDropOnItem(event, item)}
                      onClick={() => setCurrentFolderId(item._id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setCurrentFolderId(item._id);
                        }
                      }}
                      className={`group relative flex h-[220px] w-[200px] cursor-grab flex-col items-center justify-center gap-3 rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface-deep)] transition-colors hover:bg-[var(--surface-elevated)] active:cursor-grabbing ${dropClass} ${draggingClass}`}
                    >
                      {activeDrop === "inside" ? (
                        <span className="absolute left-3 top-3 rounded-full bg-blue-500 px-2 py-1 text-[10px] font-medium text-white">
                          Drop inside
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          updateNote({ id: item._id, title: item.title, isPinned: !getIsPinned(item) });
                        }}
                        className={`absolute right-3 top-3 z-10 rounded-md border border-[var(--hairline-strong)] bg-[var(--surface-card)] p-1.5 shadow-sm transition-all hover:bg-[var(--surface-elevated)] hover:text-blue-400 focus-visible:opacity-100 ${getIsPinned(item) ? "opacity-100 text-[var(--accent-blue)]" : "opacity-0 text-[var(--stone)] group-hover:opacity-100"}`}
                        aria-label={`Pin ${item.title}`}
                      >
                        <Pin size={14} />
                      </button>
                      <Folder size={40} className="text-blue-400" />
                      <span className="w-full truncate px-4 text-sm font-medium text-[var(--ink)]">{item.title}</span>
                    </div>
                  ) : (
                    <div
                      key={item._id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, item)}
                      onDragOver={(event) => handleDragOverItem(event, item)}
                      onDragEnd={resetDragState}
                      onDrop={(event) => void handleDropOnItem(event, item)}
                      className={`group relative flex h-[280px] w-[236px] cursor-grab flex-col overflow-hidden rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface-deep)] transition-colors hover:bg-[var(--surface-elevated)] active:cursor-grabbing ${dropClass} ${draggingClass}`}
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
                        <h4 className="mb-2 flex min-w-0 items-center gap-2 text-base font-medium leading-snug text-[var(--ink)]">
                          {getNoteFileType(item) === "database" ? <Database size={15} className="shrink-0 text-[var(--accent-green)]" /> : <FileText size={15} className="shrink-0 text-[var(--stone)]" />}
                          <span className="truncate">{item.title}</span>
                        </h4>
                        <p className="text-xs text-[var(--charcoal)] mt-2" style={{ display: '-webkit-box', WebkitLineClamp: 12, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{getNotePreviewText(item)}</p>
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
