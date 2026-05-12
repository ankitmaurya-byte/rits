"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/use-workspace";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useQuery as useConvexUserQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Lightbulb, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

export default function IdeasPage() {
  const { workspaceId, isLoading } = useWorkspace();
  const { user } = useUser();

  const convexUser = useConvexUserQuery(
    api.users.getUser,
    user ? { clerkId: user.id } : "skip"
  );

  const ideas = useQuery(
    api.ideas.getIdeas,
    workspaceId ? { workspaceId } : "skip"
  );

  const createIdea = useMutation(api.ideas.createIdea);
  const deleteIdea = useMutation(api.ideas.deleteIdea);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleCreate = async () => {
    if (!workspaceId || !convexUser) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await createIdea({
      workspaceId,
      title: title.trim(),
      description: description.trim(),
      tags,
      createdBy: convexUser._id,
    });
    toast.success("Idea created!");
    setTitle("");
    setDescription("");
    setTagsInput("");
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Ideas</h1>
          <p className="text-sm text-zinc-500 mt-1">Capture and manage your startup ideas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Idea
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input
                placeholder="Idea title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Describe your idea..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
              <Input
                placeholder="Tags (comma separated)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <Button onClick={handleCreate} className="w-full">
                Create Idea
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {ideas?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Lightbulb className="w-12 h-12 text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium">No ideas yet</p>
          <p className="text-zinc-400 text-sm">Click "New Idea" to get started</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ideas?.map((idea) => (
          <div
            key={idea._id}
            className="rounded-xl border bg-white dark:bg-zinc-900 p-5 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
                {idea.title}
              </h2>
              <button
                onClick={() =>
                  deleteIdea({ id: idea._id }).then(() => toast.success("Idea deleted"))
                }
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {idea.description && (
              <p className="text-zinc-500 text-sm mt-2 line-clamp-3">{idea.description}</p>
            )}
            {idea.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {idea.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
