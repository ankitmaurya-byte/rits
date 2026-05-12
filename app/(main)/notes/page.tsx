"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/use-workspace";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { NoteEditor } from "@/components/notes/editor";

export default function NotesPage() {
  const { workspaceId, isLoading } = useWorkspace();

  const notes = useQuery(
    api.notes.getNotes,
    workspaceId ? { workspaceId } : "skip"
  );

  const createNote = useMutation(api.notes.createNote);
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);

  const [selectedId, setSelectedId] = useState<Id<"notes"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [open, setOpen] = useState(false);

  const selectedNote = notes?.find((n) => n._id === selectedId);

  const handleSelect = (id: Id<"notes">, title: string, content: string) => {
    setSelectedId(id);
    setEditTitle(title);
    setEditContent(content);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    await updateNote({ id: selectedId, title: editTitle, content: editContent });
    toast.success("Note saved!");
  };

  const handleCreate = async () => {
    if (!workspaceId || !newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    const id = await createNote({ workspaceId, title: newTitle.trim(), content: "" });
    setNewTitle("");
    setOpen(false);
    handleSelect(id as Id<"notes">, newTitle.trim(), "");
    toast.success("Note created!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar list */}
      <div className="w-64 border-r flex flex-col bg-white dark:bg-zinc-950 h-full overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Notes</span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Plus className="w-4 h-4 text-zinc-500" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input
                  placeholder="Note title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <Button onClick={handleCreate} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notes?.length === 0 && (
            <p className="text-xs text-zinc-400 text-center mt-8 px-4">
              No notes yet. Create one!
            </p>
          )}
          {notes?.map((note) => (
            <button
              key={note._id}
              onClick={() => handleSelect(note._id, note.title, note.content)}
              className={`w-full text-left px-3 py-2.5 text-sm border-b hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors group ${
                selectedId === note._id
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {note.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote({ id: note._id }).then(() => {
                      if (selectedId === note._id) setSelectedId(null);
                      toast.success("Deleted");
                    });
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500 ml-1 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">
                {note.content || "Empty note"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900">
        {selectedNote ? (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b bg-white dark:bg-zinc-950">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                placeholder="Note title..."
              />
              <Button size="sm" onClick={handleSave} className="flex items-center gap-2 ml-4">
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <NoteEditor
                content={editContent}
                onChange={setEditContent}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="w-12 h-12 text-zinc-300 mb-4" />
            <p className="text-zinc-500 font-medium">Select a note to edit</p>
            <p className="text-zinc-400 text-sm">or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
