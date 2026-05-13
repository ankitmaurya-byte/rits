"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, FileText, Trash2, Save, Clock, Menu, Users } from "lucide-react";
import { toast } from "sonner";
import { NoteEditor } from "@/components/notes/editor";
import { formatDistanceToNow } from "date-fns";

export default function WorkspaceNotesPage() {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();

  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const workspace = useQuery(api.workspaces.getWorkspaceById, selectedWorkspaceId && user ? { workspaceId: selectedWorkspaceId, clerkId: user.id } : "skip");
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

  const selectedNote = notes?.find((n) => n._id === selectedId);

  const handleSelect = (id: Id<"notes">, title: string, content: string) => {
    setSelectedId(id); setEditTitle(title); setEditContent(content);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try { await updateNote({ id: selectedId, title: editTitle, content: editContent }); toast.success("Note saved"); }
    finally { setSaving(false); }
  };

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
    <div className="flex h-full overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--canvas)" }}>
      {/* Sidebar */}
      <div className="flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out border-r"
        style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-deep)", width: sidebarOpen ? "288px" : "0px", opacity: sidebarOpen ? 1 : 0, borderRightWidth: sidebarOpen ? "1px" : "0px" }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ color: "var(--mute)", backgroundColor: "var(--surface-deep)", border: "1px solid var(--hairline)" }}>{workspace?.name}</span>
            <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>Notes ({notes?.length ?? 0})</span>
          </div>
          <button onClick={() => setShowCreate(true)} className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--body)" }}>
            <Plus size={18} />
          </button>
        </div>

        {showCreate && (
          <div className="p-4 border-b z-10 relative" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
            <input autoFocus placeholder="Note title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
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
              <p className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>No team notes yet</p>
            </div>
          )}
          {notes?.map((note) => {
            const isSelected = selectedId === note._id;
            return (
              <div key={note._id} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(note._id, note.title, note.content); } }}
                onClick={() => handleSelect(note._id, note.title, note.content)}
                className="w-full text-left px-5 py-4 transition-colors border-b group relative hover:bg-[var(--surface-elevated)] cursor-pointer"
                style={{ borderColor: "var(--hairline)", backgroundColor: isSelected ? "var(--surface-elevated)" : "transparent" }}>
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "var(--ink)" }} />}
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-sm font-medium truncate pr-2" style={{ color: "var(--ink)" }}>{note.title}</h4>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this note?")) deleteNote({ id: note._id }).then(() => { if (selectedId === note._id) setSelectedId(null); toast.success("Deleted"); }); }}
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

      {/* Editor */}
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ backgroundColor: "var(--canvas)" }}>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, var(--accent-orange-glow) 0%, transparent 70%)", opacity: 0.15 }} />

        {selectedNote ? (
          <>
            <div className="flex items-center gap-4 px-6 py-4 shrink-0 border-b z-10 relative" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--body)" }}><Menu size={18} /></button>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="flex-1 text-xl font-medium outline-none bg-transparent" style={{ color: "var(--ink)" }} placeholder="Note title..." />
              <button onClick={handleSave} disabled={saving} className="btn-outline"><Save size={16} />{saving ? "Saving..." : "Save"}</button>
            </div>
            <div className="flex-1 overflow-auto p-8 lg:p-12 relative z-10">
              <div className="max-w-3xl mx-auto stripe-card" style={{ padding: "0" }}>
                <NoteEditor content={editContent} onChange={setEditContent} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center relative z-10">
            <FileText size={48} className="mb-8" style={{ color: "var(--stone)" }} />
            <h3 className="text-xl font-medium mb-3" style={{ color: "var(--ink)" }}>Select a note to view</h3>
            <p className="mb-10 max-w-sm" style={{ color: "var(--charcoal)" }}>Team notes shared with the workspace.</p>
            <button onClick={() => { setSidebarOpen(true); setShowCreate(true); }} className="btn-primary"><Plus size={16} /> New Team Note</button>
          </div>
        )}
      </div>
    </div>
  );
}
