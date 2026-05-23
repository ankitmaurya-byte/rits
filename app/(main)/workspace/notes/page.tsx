"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, FileText, Trash2, Clock, Menu, Users, ChevronRight, List, Filter, ArrowDownUp, Zap, Search, Maximize2, Settings, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { NoteEditor } from "@/components/notes/editor";
import { formatDistanceToNow } from "date-fns";
import { useConfirm } from "@/components/ui/confirm-provider";

const MOCK_FOLDERS = [
  { id: "my-folders", name: "My Folders" },
  { id: "shared", name: "Shared" },
  { id: "shared-with-me", name: "Shared With Me" }
];

const MOCK_RESOURCES = [
  {
    id: "architecture-guide",
    title: "Architecture Guide —",
    folder: "spiral tech resources",
    type: "page"
  },
  {
    id: "yc-companies",
    url: "https://news.ycombinator.com/item?id=32724564",
    title: "Pitch Deck Perfection",
    folder: "YC companies",
    type: "link"
  }
];

function ConfluenceViewToggle({ view, setView }: { view: "sidebar" | "gallery"; setView: (v: "sidebar" | "gallery") => void }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--surface-elevated)] border border-[var(--hairline-strong)] rounded-lg shrink-0">
      <button 
        onClick={() => setView("sidebar")}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "sidebar" ? "bg-[var(--ink)] text-[var(--canvas)] shadow-sm" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}
      >
        Sidebar View
      </button>
      <button 
        onClick={() => setView("gallery")}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "gallery" ? "bg-[var(--ink)] text-[var(--canvas)] shadow-sm" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}
      >
        Gallery View
      </button>
    </div>
  );
}

function FolderList() {
  return (
    <div className="w-full lg:w-[260px] shrink-0 border-r border-[var(--hairline-strong)] pr-4 py-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 px-2" style={{ color: "var(--charcoal)" }}>Folders</h3>
      <div className="flex flex-col gap-0.5">
        {MOCK_FOLDERS.map(f => (
          <button key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--surface-elevated)] transition-colors text-sm w-full text-left" style={{ color: "var(--body)" }}>
            <ChevronRight size={14} className="opacity-50" />
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResourceToolbar() {
  return (
    <div className="flex items-center justify-between mb-6 pb-2 border-b border-[var(--hairline-strong)] flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--surface-elevated)] hover:bg-[var(--surface-elevated-hover)] transition-colors text-sm border border-[var(--hairline)]" style={{ color: "var(--ink)" }}>
          <Clock size={14} /> Most Recent
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[var(--surface-elevated)] transition-colors text-sm" style={{ color: "var(--body)" }}>
          <List size={14} /> List
        </button>
        <button className="px-3 py-1.5 rounded-md hover:bg-[var(--surface-elevated)] transition-colors text-sm" style={{ color: "var(--body)" }}>
          1 more...
        </button>
      </div>
      
      <div className="flex items-center gap-1.5">
        <button className="p-2 hover:bg-[var(--surface-elevated)] rounded-md transition-colors" style={{ color: "var(--stone)" }}><Filter size={16} /></button>
        <button className="p-2 hover:bg-[var(--surface-elevated)] rounded-md transition-colors" style={{ color: "var(--stone)" }}><ArrowDownUp size={16} /></button>
        <button className="p-2 hover:bg-[var(--surface-elevated)] rounded-md transition-colors" style={{ color: "var(--stone)" }}><Zap size={16} /></button>
        <div className="w-[1px] h-4 bg-[var(--hairline-strong)] mx-1" />
        <button className="p-2 hover:bg-[var(--surface-elevated)] rounded-md transition-colors" style={{ color: "var(--stone)" }}><Search size={16} /></button>
        <button className="p-2 hover:bg-[var(--surface-elevated)] rounded-md transition-colors" style={{ color: "var(--stone)" }}><Maximize2 size={16} /></button>
        <button className="p-2 hover:bg-[var(--surface-elevated)] rounded-md transition-colors" style={{ color: "var(--stone)" }}><Settings size={16} /></button>
        
        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors ml-2">
          New <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}

function ResourceCard({ resource }: { resource?: any }) {
  if (!resource) {
    return (
      <button className="flex flex-col items-center justify-center w-[236px] h-[184px] rounded-xl border border-dashed border-[var(--hairline-strong)] hover:border-[var(--charcoal)] transition-colors group bg-transparent hover:bg-[var(--surface-elevated)]">
        <span className="text-sm font-medium text-[var(--charcoal)] group-hover:text-[var(--body)]">+ New page</span>
      </button>
    );
  }
  
  return (
    <div className="flex flex-col w-[236px] h-[184px] rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface-deep)] hover:bg-[var(--surface-elevated)] transition-colors overflow-hidden cursor-pointer group">
      <div className="flex-1 p-4 flex flex-col items-start justify-center">
        {resource.url && (
          <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-400 mb-2 truncate w-full">{resource.url}</span>
        )}
        <h4 className="text-base font-medium text-[var(--ink)] leading-snug line-clamp-3">{resource.title}</h4>
      </div>
      <div className="px-4 py-3 border-t border-[var(--hairline-strong)] bg-[var(--canvas)] group-hover:bg-[var(--surface-deep)] transition-colors flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-[var(--surface-elevated)] flex items-center justify-center shrink-0">
          <FileText size={12} className="text-[var(--stone)]" />
        </div>
        <span className="text-xs font-medium text-[var(--charcoal)] truncate">{resource.folder}</span>
      </div>
    </div>
  );
}

function GalleryConfluenceView() {
  return (
    <div className="flex flex-col w-full h-full bg-[#191919] overflow-auto">
      <div className="flex flex-col max-w-7xl mx-auto w-full px-6 py-8 md:px-12 md:py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
            <FileText size={16} />
          </div>
          <input 
            type="text" 
            defaultValue="confluence" 
            className="text-3xl font-bold bg-transparent text-white outline-none w-full placeholder-[var(--charcoal)]"
          />
        </div>
        
        <div className="w-full h-[1px] bg-[var(--hairline-strong)] mb-8" />
        
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <FolderList />
          
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-medium text-white mb-6">Reviewed and Completed Resources</h2>
            <ResourceToolbar />
            
            <div className="flex flex-wrap gap-4 items-start">
              {MOCK_RESOURCES.map(r => (
                <ResourceCard key={r.id} resource={r} />
              ))}
              <ResourceCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarConfluenceView({
  notes, showCreate, newTitle, setNewTitle, handleCreate, setShowCreate,
  handleSelect, activeNote, deleteNote, confirm, selectedId, setSelectedId,
  sidebarOpen, setSidebarOpen, activeTitle, saving, activeContent,
  autoSelectedNote, setEditTitle, setEditContent
}: any) {
  return (
    <div className="flex h-full w-full overflow-hidden" style={{ backgroundColor: "var(--canvas)" }}>
      {/* Sidebar */}
      <div className="flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out border-r relative"
        style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-deep)", width: sidebarOpen ? "288px" : "0px", opacity: sidebarOpen ? 1 : 0, borderRightWidth: sidebarOpen ? "1px" : "0px" }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>Confluence ({notes?.length ?? 0})</span>
          </div>
          <button onClick={() => setShowCreate(true)} className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--body)" }}>
            <Plus size={18} />
          </button>
        </div>

        {showCreate && (
          <div className="p-4 border-b z-10 relative" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
            <input autoFocus placeholder="Confluence page title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
              className="input-field mb-3" />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="btn-primary flex-1 py-1.5 text-xs">Create</button>
              <button onClick={() => setShowCreate(false)} className="btn-outline flex-1 py-1.5 text-xs">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {notes?.length === 0 && !showCreate && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <FileText size={24} className="mb-4" style={{ color: "var(--stone)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>No Confluence pages yet</p>
            </div>
          )}
          {notes?.map((note: any) => {
            const isSelected = activeNote?._id === note._id;
            return (
              <div key={note._id} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(note._id, note.title, note.content); } }}
                onClick={() => handleSelect(note._id, note.title, note.content)}
                className="w-full text-left px-5 py-4 transition-colors border-b group relative hover:bg-[var(--surface-elevated)] cursor-pointer"
                style={{ borderColor: "var(--hairline)", backgroundColor: isSelected ? "var(--surface-elevated)" : "transparent" }}>
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "var(--ink)" }} />}
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-sm font-medium truncate pr-2" style={{ color: "var(--ink)" }}>{note.title}</h4>
                  <button onClick={(e) => { e.stopPropagation(); void (async () => { const confirmed = await confirm({ title: "Delete note?", description: "This note will be removed permanently.", confirmLabel: "Delete", variant: "destructive" }); if (!confirmed) return; deleteNote({ id: note._id }).then(() => { if (selectedId === note._id) setSelectedId(null); toast.success("Deleted"); }); })(); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded" style={{ color: "var(--stone)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-red)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--charcoal)" }}>
                  <Clock size={12} />{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confluence Editor */}
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ backgroundColor: "var(--canvas)" }}>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, var(--accent-orange-glow) 0%, transparent 70%)", opacity: 0.15 }} />

        {activeNote ? (
          <>
            <div className="flex items-center gap-4 px-6 py-4 shrink-0 border-b z-10 relative" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--body)" }}><Menu size={18} /></button>
              <input value={activeTitle} onChange={(e) => {
                if (!selectedId && autoSelectedNote) {
                  handleSelect(autoSelectedNote._id, autoSelectedNote.title, autoSelectedNote.content);
                }
                setEditTitle(e.target.value);
               }} className="flex-1 text-xl font-medium outline-none bg-transparent" style={{ color: "var(--ink)" }} placeholder="Confluence page title..." />
              <span className="text-sm" style={{ color: saving ? "var(--body)" : "var(--mute)" }}>{saving ? "Saving..." : "Autosaved"}</span>
            </div>
            <div className="flex-1 overflow-auto p-8 lg:p-12 relative z-10">
              <div className="max-w-3xl mx-auto stripe-card" style={{ padding: "0" }}>
                <NoteEditor content={activeContent} minHeight="500px" onChange={(value) => {
                  if (!selectedId && autoSelectedNote) {
                    handleSelect(autoSelectedNote._id, autoSelectedNote.title, autoSelectedNote.content);
                  }
                  setEditContent(value);
                }} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center relative z-10">
            <FileText size={48} className="mb-8" style={{ color: "var(--stone)" }} />
            <h3 className="text-xl font-medium mb-3" style={{ color: "var(--ink)" }}>Select a Confluence page to view</h3>
            <p className="mb-10 max-w-sm" style={{ color: "var(--charcoal)" }}>Shared workspace knowledge and long-form documentation.</p>
            <button onClick={() => { setSidebarOpen(true); setShowCreate(true); }} className="btn-primary"><Plus size={16} /> New Confluence Page</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkspaceNotesPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { selectedWorkspaceId } = useWorkspaceStore();

  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const notes = useQuery(api.notes.getNotes, selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip");
  const createNote = useMutation(api.notes.createNote);
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);

  const [selectedId, setSelectedId] = useState<Id<"notes"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<"sidebar" | "gallery">("sidebar");
  const confirm = useConfirm();

  const selectedNote = notes?.find((n) => n._id === selectedId);
  const requestedNoteId = searchParams.get("note");
  const autoSelectedNote = selectedNote
    ? null
    : notes?.find((item) => item._id === requestedNoteId) ?? null;
  const activeNote = selectedNote ?? autoSelectedNote;
  const activeTitle = selectedNote ? editTitle : autoSelectedNote?.title ?? "";
  const activeContent = selectedNote ? editContent : autoSelectedNote?.content ?? "";

  const handleSelect = (id: Id<"notes">, title: string, content: string) => {
    setSelectedId(id); setEditTitle(title); setEditContent(content);
  };

  useEffect(() => {
    const noteId = selectedId ?? autoSelectedNote?._id;
    if (!noteId || !activeNote) return;
    if (editTitle === activeNote.title && editContent === activeNote.content) return;

    const timeoutId = window.setTimeout(() => {
      setSaving(true);
      void updateNote({ id: noteId, title: editTitle, content: editContent })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "Failed to save note.");
        })
        .finally(() => setSaving(false));
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [activeNote, autoSelectedNote, editContent, editTitle, selectedId, updateNote]);

  const handleCreate = async () => {
    if (!selectedWorkspaceId || !newTitle.trim()) { toast.error("Title is required"); return; }
    try {
      const id = await createNote({ scope: "workspace", workspaceId: selectedWorkspaceId, title: newTitle.trim(), content: "", createdBy: convexUser?._id });
      setNewTitle(""); setShowCreate(false);
      handleSelect(id as Id<"notes">, newTitle.trim(), "");
      toast.success("Note created!");
    } catch { toast.error("Failed to create note."); }
  };

  if (!selectedWorkspaceId) {
    return (
      <div className="page-container animate-fade-in-up flex flex-col items-center justify-center py-40 text-center">
        <Users size={40} className="mb-6" style={{ color: "var(--stone)" }} />
        <h2 className="text-2xl font-medium mb-3" style={{ color: "var(--ink)" }}>No workspace selected</h2>
        <p style={{ color: "var(--charcoal)" }}>Create or join a workspace using the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in-up relative" style={{ backgroundColor: "var(--canvas)" }}>
      {/* Top Toggle Row */}
      <div className="flex items-center justify-center py-3 border-b shrink-0 z-20" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
        <ConfluenceViewToggle view={view} setView={setView} />
      </div>
      
      <div className="flex-1 min-h-0 relative">
        {view === "sidebar" ? (
          <SidebarConfluenceView 
            notes={notes} showCreate={showCreate} newTitle={newTitle} setNewTitle={setNewTitle}
            handleCreate={handleCreate} setShowCreate={setShowCreate} handleSelect={handleSelect}
            activeNote={activeNote} deleteNote={deleteNote} confirm={confirm}
            selectedId={selectedId} setSelectedId={setSelectedId} sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen} activeTitle={activeTitle} saving={saving}
            activeContent={activeContent} autoSelectedNote={autoSelectedNote}
            setEditTitle={setEditTitle} setEditContent={setEditContent}
          />
        ) : (
          <GalleryConfluenceView />
        )}
      </div>
    </div>
  );
}
