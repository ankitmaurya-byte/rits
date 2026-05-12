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
      <div className="flex h-full bg-white">
        <div className="w-72 border-r border-[#e2e8f0] p-4 space-y-3">
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
    <div className="flex h-full overflow-hidden bg-white animate-fade-in-up">
      {/* Note list sidebar */}
      <div
        className={`flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out border-r border-[#e2e8f0] bg-[#f8fafc]
          ${sidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 border-r-0'}`}
      >
        {/* List header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-[#e2e8f0] bg-white">
          <span className="text-sm font-semibold text-[#0f172a]">
            All Notes ({notes?.length ?? 0})
          </span>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1.5 text-[#64748b] hover:text-[#635bff] hover:bg-[#f0f0ff] rounded-md transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* New note input */}
        {showCreate && (
          <div className="p-4 border-b border-[#e2e8f0] bg-white shadow-sm z-10 relative">
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
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 py-1.5 text-xs">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Note items */}
        <div className="flex-1 overflow-y-auto">
          {notes?.length === 0 && !showCreate && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center mb-3">
                 <FileText size={20} className="text-[#94a3b8]" />
              </div>
              <p className="text-sm font-medium text-[#475569] mb-1">No notes found</p>
              <p className="text-xs text-[#94a3b8]">Create a new note to get started.</p>
            </div>
          )}
          {notes?.map((note) => {
            const isSelected = selectedId === note._id;
            return (
              <button
                key={note._id}
                onClick={() => handleSelect(note._id, note.title, note.content)}
                className={`w-full text-left px-5 py-4 transition-colors border-b border-[#e2e8f0] group relative
                  ${isSelected ? "bg-white" : "hover:bg-white"}`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#635bff]" />
                )}
                
                <div className="flex items-start justify-between mb-1">
                  <h4 className={`text-sm font-semibold truncate pr-2 ${isSelected ? "text-[#635bff]" : "text-[#0f172a]"}`}>
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#cbd5e1] hover:text-[#ef4444] rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-[#64748b] flex items-center gap-1.5">
                  <Clock size={12} />
                  {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-col flex-1 overflow-hidden bg-white">
        {selectedNote ? (
          <>
            {/* Editor toolbar */}
            <div className="flex items-center gap-4 px-6 py-4 shrink-0 border-b border-[#e2e8f0] bg-white shadow-sm z-10 relative">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-[#64748b] hover:bg-[#f1f5f9] rounded-md transition-colors"
                title="Toggle sidebar"
              >
                 <Menu size={18} />
              </button>
              
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 text-xl font-bold text-[#0f172a] placeholder-[#94a3b8] outline-none bg-transparent"
                placeholder="Note title..."
              />
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            
            {/* Editor Content */}
            <div className="flex-1 overflow-auto p-8 lg:p-12">
              <div className="max-w-3xl mx-auto">
                <NoteEditor content={editContent} onChange={setEditContent} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center bg-[#f8fafc]">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-sm border border-[#e2e8f0] flex items-center justify-center mb-6">
              <FileText size={36} className="text-[#635bff]" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-2">
              Select a note to view
            </h3>
            <p className="text-[#64748b] mb-8 max-w-sm">
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
