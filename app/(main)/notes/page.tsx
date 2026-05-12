"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/use-workspace";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, FileText, Trash2, Save, Clock, Menu } from "lucide-react";
import { toast } from "sonner";
import { NoteEditor } from "@/components/notes/editor";
import { formatDistanceToNow } from "date-fns";

export default function NotesPage() {
  const { workspaceId, isLoading } = useWorkspace();

  const notes      = useQuery(api.notes.getNotes,  workspaceId ? { workspaceId } : "skip");
  const createNote = useMutation(api.notes.createNote);
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);

  const [selectedId, setSelectedId]   = useState<Id<"notes"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle]     = useState("");
  const [newTitle, setNewTitle]       = useState("");
  const [showCreate, setShowCreate]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectedNote = notes?.find((n) => n._id === selectedId);

  const handleSelect = (id: Id<"notes">, title: string, content: string) => {
    setSelectedId(id); setEditTitle(title); setEditContent(content);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await updateNote({ id: selectedId, title: editTitle, content: editContent });
      toast.success("Note saved");
    } finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!workspaceId || !newTitle.trim()) { toast.error("Title is required"); return; }
    try {
      const id = await createNote({ workspaceId, title: newTitle.trim(), content: "" });
      setNewTitle(""); setShowCreate(false);
      handleSelect(id as Id<"notes">, newTitle.trim(), "");
      toast.success("Note created!");
    } catch (e) {
      toast.error("Failed to create note.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full" style={{ backgroundColor: "var(--canvas)" }}>
        <div className="w-72 border-r p-4 space-y-3" style={{ borderColor: "var(--hairline-strong)" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-lg w-full" />
          ))}
        </div>
        <div className="flex-1 p-10">
          <div className="skeleton h-10 w-1/3 rounded-lg mb-8" />
          <div className="skeleton h-96 rounded-xl w-full max-w-4xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden animate-fade-in-up" style={{ backgroundColor: "var(--canvas)" }}>
      {/* Note list sidebar */}
      <div
        className={`flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out border-r`}
        style={{ 
          borderColor: "var(--hairline-strong)", 
          backgroundColor: "var(--surface-deep)",
          width: sidebarOpen ? "288px" : "0px",
          opacity: sidebarOpen ? 1 : 0,
          borderRightWidth: sidebarOpen ? "1px" : "0px"
        }}
      >
        {/* List header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
          <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            All Notes ({notes?.length ?? 0})
          </span>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1.5 rounded-md transition-colors hover:bg-[#101012]"
            style={{ color: "var(--body)" }}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* New note input */}
        {showCreate && (
          <div className="p-4 border-b z-10 relative" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
            <input
              autoFocus
              placeholder="Note title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreate(false);
              }}
              className="input-field mb-3"
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="btn-primary flex-1 py-1.5 text-xs">
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-outline flex-1 py-1.5 text-xs">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Note items */}
        <div className="flex-1 overflow-y-auto">
          {notes?.length === 0 && !showCreate && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="flex items-center justify-center mb-4">
                 <FileText size={24} style={{ color: "var(--stone)" }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--charcoal)" }}>No notes found</p>
            </div>
          )}
          {notes?.map((note) => {
            const isSelected = selectedId === note._id;
            return (
              <button
                key={note._id}
                onClick={() => handleSelect(note._id, note.title, note.content)}
                className={`w-full text-left px-5 py-4 transition-colors border-b group relative hover:bg-[#101012]`}
                style={{
                  borderColor: "var(--hairline)",
                  backgroundColor: isSelected ? "var(--surface-elevated)" : "transparent"
                }}
              >
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "var(--ink)" }} />
                )}
                
                <div className="flex items-start justify-between mb-1">
                  <h4 className={`text-sm font-medium truncate pr-2`} style={{ color: "var(--ink)" }}>
                    {note.title}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if(confirm("Delete this note?")) {
                         deleteNote({ id: note._id }).then(() => {
                           if (selectedId === note._id) setSelectedId(null);
                           toast.success("Deleted");
                         });
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                    style={{ color: "var(--stone)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-red)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--charcoal)" }}>
                  <Clock size={12} />
                  {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ backgroundColor: "var(--canvas)" }}>
        
        {/* Top Atmospheric Glow */}
        <div 
          className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at top, var(--accent-orange-glow) 0%, transparent 70%)",
            opacity: 0.15
          }}
        />

        {selectedNote ? (
          <>
            {/* Editor toolbar */}
            <div className="flex items-center gap-4 px-6 py-4 shrink-0 border-b z-10 relative" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md transition-colors hover:bg-[#101012]"
                style={{ color: "var(--body)" }}
                title="Toggle sidebar"
              >
                 <Menu size={18} />
              </button>
              
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 text-xl font-medium outline-none bg-transparent"
                style={{ color: "var(--ink)" }}
                placeholder="Note title..."
              />
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-outline"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            
            {/* Editor Content */}
            <div className="flex-1 overflow-auto p-8 lg:p-12 relative z-10">
              <div className="max-w-3xl mx-auto stripe-card" style={{ padding: "0" }}>
                <NoteEditor content={editContent} onChange={setEditContent} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center relative z-10">
            <div className="flex items-center justify-center mb-8">
              <FileText size={48} style={{ color: "var(--stone)" }} />
            </div>
            <h3 className="text-xl font-medium mb-3" style={{ color: "var(--ink)" }}>
              Select a note to view
            </h3>
            <p className="mb-10 max-w-sm" style={{ color: "var(--charcoal)" }}>
              Choose an existing note from the sidebar or create a new one to start writing.
            </p>
            <button
              onClick={() => {
                setSidebarOpen(true);
                setShowCreate(true);
              }}
              className="btn-primary"
            >
              <Plus size={16} /> Create New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
