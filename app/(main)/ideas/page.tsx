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
    <div className="page-container animate-fade-in-up relative">
      
      {/* Top Atmospheric Glow */}
      <div 
        className="absolute top-0 right-1/4 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, var(--accent-yellow) 0%, transparent 70%)",
          opacity: 0.15
        }}
      />

      {/* Header */}
      <div className="page-header border-b pb-12 mb-12 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <h2 className="text-3xl font-medium tracking-tight mb-2" style={{ color: "var(--ink)" }}>
            Ideas Hub
          </h2>
          <p className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>
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
        <div className="feature-card mb-12 animate-fade-in-up relative z-10">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-medium mb-8" style={{ color: "var(--ink)" }}>Capture a new idea</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--body)" }}>Title</label>
                <input
                  autoFocus
                  placeholder="e.g. Mobile app redesign..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--body)" }}>Description</label>
                <textarea
                  placeholder="What's the core concept?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--body)" }}>Tags (Optional)</label>
                <input
                  placeholder="marketing, Q3, design..."
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="flex gap-4 pt-6 border-t" style={{ borderColor: "var(--divider-soft)" }}>
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? "Saving..." : "Save Idea"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="btn-outline"
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
        <div className="flex flex-col items-center justify-center py-32 text-center border rounded-xl relative z-10" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-deep)" }}>
          <div className="flex items-center justify-center mb-6">
            <Lightbulb size={32} style={{ color: "var(--accent-yellow)" }} />
          </div>
          <h3 className="text-xl font-medium mb-3" style={{ color: "var(--ink)" }}>No ideas yet</h3>
          <p className="mb-10 max-w-sm" style={{ color: "var(--charcoal)" }}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {ideas?.map((idea, i) => (
          <div
            key={idea._id}
            className="feature-card flex flex-col group relative overflow-hidden"
            style={{ animationDelay: `${i * 50}ms`, padding: "24px" }}
          >
            {/* Content */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4 gap-4">
                <h3 className="text-lg font-medium leading-tight" style={{ color: "var(--ink)" }}>
                  {idea.title}
                </h3>
                <button
                  onClick={() => {
                    if (confirm("Delete this idea?")) {
                      deleteIdea({ id: idea._id }).then(() => toast.success("Deleted"));
                    }
                  }}
                  className="p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  style={{ color: "var(--stone)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-red)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}
                  aria-label="Delete idea"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {idea.description ? (
                <p className="text-sm leading-relaxed mb-8 line-clamp-4" style={{ color: "var(--charcoal)" }}>
                  {idea.description}
                </p>
              ) : (
                <p className="text-sm italic mb-8" style={{ color: "var(--stone)" }}>No description.</p>
              )}

              {/* Footer */}
              <div className="mt-auto pt-4 border-t flex flex-wrap gap-2 items-center" style={{ borderColor: "var(--divider-soft)" }}>
                {idea.tags.length > 0 ? (
                   idea.tags.map(tag => (
                     <span key={tag} className="badge-pill">
                       {tag}
                     </span>
                   ))
                ) : (
                  <span className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--stone)" }}>
                    <Tag size={12} /> No tags
                  </span>
                )}
              </div>
            </div>
            
            {/* Subtle top border accent */}
            <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "var(--accent-yellow)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
