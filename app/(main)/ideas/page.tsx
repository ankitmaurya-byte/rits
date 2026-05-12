"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/use-workspace";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useQuery as useConvexUserQuery } from "convex/react";
import { Plus, Lightbulb, Trash2, Tag, ArrowRight } from "lucide-react";
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

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!workspaceId || !convexUser) return;
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSubmitting(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      await createIdea({
        workspaceId,
        title: title.trim(),
        description: description.trim(),
        tags,
        createdBy: convexUser._id,
      });
      toast.success("Idea captured successfully.");
      setTitle(""); setDescription(""); setTagsInput(""); setShowForm(false);
    } catch (e) {
      toast.error("Failed to save idea.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in-up">
      {/* Header */}
      <div className="page-header border-b border-[#e2e8f0] pb-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-[#0f172a] tracking-tight mb-2">
            Ideas Hub
          </h2>
          <p className="text-sm font-medium text-[#64748b]">
            {ideas?.length ?? 0} {ideas?.length === 1 ? 'Idea' : 'Ideas'} captured
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          <Plus size={16} />
          New Idea
        </button>
      </div>

      {/* Creation Form */}
      {showForm && (
        <div className="stripe-card p-8 mb-8 bg-white border-[#cbd5e1] shadow-md animate-fade-in-up">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold text-[#0f172a] mb-6">Capture a new idea</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">Title</label>
                <input
                  autoFocus
                  placeholder="e.g. Mobile app redesign..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">Description</label>
                <textarea
                  placeholder="What's the core concept?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">Tags (Optional)</label>
                <input
                  placeholder="marketing, Q3, design..."
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#f1f5f9]">
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? "Saving..." : "Save Idea"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {ideas?.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-[#e2e8f0] rounded-xl bg-[#f8fafc]">
          <div className="w-16 h-16 rounded-full bg-[#fef3c7] flex items-center justify-center mb-6 shadow-sm">
            <Lightbulb size={28} className="text-[#d97706]" />
          </div>
          <h3 className="text-xl font-semibold text-[#0f172a] mb-2">No ideas yet</h3>
          <p className="text-[#64748b] mb-8 max-w-sm">
            Capture your startup ideas, feature requests, and brainstorming sessions here.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus size={16} /> Capture first idea
          </button>
        </div>
      )}

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ideas?.map((idea, i) => (
          <div
            key={idea._id}
            className="stripe-card flex flex-col group relative overflow-hidden"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4 gap-4">
                <h3 className="text-lg font-semibold text-[#0f172a] leading-tight">
                  {idea.title}
                </h3>
                <button
                  onClick={() => {
                    if (confirm("Delete this idea?")) {
                      deleteIdea({ id: idea._id }).then(() => toast.success("Deleted"));
                    }
                  }}
                  className="p-1.5 text-[#cbd5e1] hover:text-[#ef4444] hover:bg-[#fee2e2] rounded-md transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  aria-label="Delete idea"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {idea.description ? (
                <p className="text-[#475569] text-sm leading-relaxed mb-6 line-clamp-4">
                  {idea.description}
                </p>
              ) : (
                <p className="text-[#94a3b8] text-sm italic mb-6">No description.</p>
              )}

              {/* Footer */}
              <div className="mt-auto pt-4 border-t border-[#f1f5f9] flex flex-wrap gap-2 items-center">
                {idea.tags.length > 0 ? (
                   idea.tags.map(tag => (
                     <span key={tag} className="badge bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]">
                       {tag}
                     </span>
                   ))
                ) : (
                  <span className="text-xs font-medium text-[#cbd5e1] flex items-center gap-1">
                    <Tag size={12} /> No tags
                  </span>
                )}
              </div>
            </div>
            
            {/* Subtle top border accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#635bff] opacity-0 group-hover:opacity-10 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
}
