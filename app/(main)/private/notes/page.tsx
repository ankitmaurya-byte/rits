"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, FileText, Trash2, Clock, Menu, Lock } from "lucide-react";
import { toast } from "sonner";
import { NoteEditor } from "@/components/notes/editor";
import { formatDistanceToNow } from "date-fns";
import { useConfirm } from "@/components/ui/confirm-provider";

export default function PrivateNotesPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");

  const notes = useQuery(api.notes.getPrivateNotes, convexUser ? { createdBy: convexUser._id } : "skip");
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
    if (!convexUser || !newTitle.trim()) { toast.error("Title is required"); return; }
    try {
      const id = await createNote({ scope: "private", title: newTitle.trim(), content: "", createdBy: convexUser._id });
      setNewTitle(""); setShowCreate(false);
      handleSelect(id as Id<"notes">, newTitle.trim(), "");
      toast.success("Note created!");
    } catch { toast.error("Failed to create note."); }
  };

  return (
    <div className="flex h-full overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--canvas)" }}>
      {/* Sidebar */}
      <div className="flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out border-r"
        style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-deep)", width: sidebarOpen ? "288px" : "0px", opacity: sidebarOpen ? 1 : 0, borderRightWidth: sidebarOpen ? "1px" : "0px" }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
          <div className="flex items-center gap-2">
            <Lock size={11} style={{ color: "var(--mute)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>Private Confluence ({notes?.length ?? 0})</span>
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
              <p className="text-sm font-medium mb-1" style={{ color: "var(--charcoal)" }}>No private Confluence pages yet</p>
            </div>
          )}
          {notes?.map((note) => {
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

      {/* Editor */}
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ backgroundColor: "var(--canvas)" }}>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, var(--accent-orange-glow) 0%, transparent 70%)", opacity: 0.15 }} />

        {activeNote ? (
          <>
            <div className="flex items-center gap-4 px-6 py-4 shrink-0 border-b z-10 relative" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--body)" }} title="Toggle sidebar">
                <Menu size={18} />
              </button>
              <input value={activeTitle} onChange={(e) => {
                if (!selectedNote && autoSelectedNote) {
                  handleSelect(autoSelectedNote._id, autoSelectedNote.title, autoSelectedNote.content);
                }
                setEditTitle(e.target.value);
               }} className="flex-1 text-xl font-medium outline-none bg-transparent" style={{ color: "var(--ink)" }} placeholder="Confluence page title..." />
              <span className="text-sm" style={{ color: saving ? "var(--body)" : "var(--mute)" }}>{saving ? "Saving..." : "Autosaved"}</span>
            </div>
            <div className="flex-1 overflow-auto p-8 lg:p-12 relative z-10">
              <div className="max-w-3xl mx-auto stripe-card" style={{ padding: "0" }}>
                <NoteEditor content={activeContent} minHeight="500px" onChange={(value) => {
                  if (!selectedNote && autoSelectedNote) {
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
            <p className="mb-10 max-w-sm" style={{ color: "var(--charcoal)" }}>Your private long-form docs, notes, and personal knowledge pages.</p>
            <button onClick={() => { setSidebarOpen(true); setShowCreate(true); }} className="btn-primary">
              <Plus size={16} /> Create Private Confluence Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
