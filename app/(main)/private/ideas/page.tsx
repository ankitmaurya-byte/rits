"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { getIdeaTitle } from "@/components/ideas/idea-text";
import { RichEditor } from "@/components/editor/rich-editor";
import { Plus, Lightbulb, Trash2, Tag, Pencil, Lock } from "lucide-react";
import { toast } from "sonner";

export default function PrivateIdeasPage() {
  const { user } = useUser();

  const convexUser = useQuery(
    api.users.getUser,
    user ? { clerkId: user.id } : "skip"
  );

  const ideas = useQuery(
    api.ideas.getPrivateIdeas,
    convexUser ? { createdBy: convexUser._id } : "skip"
  );

  const createIdea = useMutation(api.ideas.createIdea);
  const updateIdea = useMutation(api.ideas.updateIdea);
  const deleteIdea = useMutation(api.ideas.deleteIdea);

  const [showForm, setShowForm] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEditClick = (idea: any) => {
    setEditingIdeaId(idea._id);
    setTitle(idea.title);
    setDescription(idea.description || "");
    setTagsInput(idea.tags.join(", "));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreate = async () => {
    if (!convexUser) return;
    const plainDesc = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const normalizedTitle = getIdeaTitle(title, plainDesc);
    if (!normalizedTitle) { toast.error("Add a title or description"); return; }
    setSubmitting(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

      if (editingIdeaId) {
        await updateIdea({ id: editingIdeaId as any, title: normalizedTitle, description: description.trim(), tags });
        toast.success("Idea updated.");
      } else {
        await createIdea({
          scope: "private",
          title: normalizedTitle,
          description: description.trim(),
          tags,
          createdBy: convexUser._id,
        });
        toast.success("Idea captured.");
      }
      setTitle(""); setDescription(""); setTagsInput(""); setShowForm(false); setEditingIdeaId(null);
    } catch (e) {
      toast.error("Failed to save idea.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!convexUser || ideas === undefined) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in-up relative">
      {/* Glow */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top, var(--accent-yellow) 0%, transparent 70%)", opacity: 0.12 }} />

      {/* Header */}
      <div className="page-header border-b pb-12 mb-12 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lock size={13} style={{ color: "var(--mute)" }} />
            <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--mute)" }}>Private</span>
          </div>
          <h2 className="text-3xl font-medium tracking-tight mb-1" style={{ color: "var(--ink)" }}>Ideas</h2>
          <p className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>
            {ideas?.length ?? 0} {ideas?.length === 1 ? "idea" : "ideas"}  only visible to you
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) { setShowForm(false); setEditingIdeaId(null); setTitle(""); setDescription(""); setTagsInput(""); }
            else { setShowForm(true); setEditingIdeaId(null); setTitle(""); setDescription(""); setTagsInput(""); }
          }}
          className="btn-primary"
        >
          <Plus size={16} /> New Idea
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="feature-card mb-12 animate-fade-in-up relative z-10">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-medium mb-8" style={{ color: "var(--ink)" }}>
              {editingIdeaId ? "Edit idea" : "Capture a private idea"}
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--body)" }}>Title</label>
                <input autoFocus placeholder="e.g. Mobile app redesign..." value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--body)" }}>Description</label>
                <RichEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Paste rough bullets, feature notes, or the full concept here…"
                  minHeight="220px"
                  showCount={false}
                  contextType="idea"
                />
                <p className="mt-2 text-xs" style={{ color: "var(--mute)" }}>Leave the title blank and the first description line becomes the title.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--body)" }}>Tags (optional)</label>
                <input placeholder="marketing, Q3, design..." value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="input-field" />
              </div>
              <div className="flex gap-4 pt-6 border-t" style={{ borderColor: "var(--divider-soft)" }}>
                <button onClick={handleCreate} disabled={submitting} className="btn-primary">
                  {submitting ? "Saving..." : editingIdeaId ? "Update Idea" : "Save Idea"}
                </button>
                <button onClick={() => { setShowForm(false); setEditingIdeaId(null); setTitle(""); setDescription(""); setTagsInput(""); }} className="btn-outline">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {ideas?.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-32 text-center border rounded-xl relative z-10"
          style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-deep)" }}>
          <Lightbulb size={32} className="mb-6" style={{ color: "var(--accent-yellow)" }} />
          <h3 className="text-xl font-medium mb-3" style={{ color: "var(--ink)" }}>No private ideas yet</h3>
          <p className="mb-10 max-w-sm" style={{ color: "var(--charcoal)" }}>
            Keep your personal brainstorms here. Only you can see these.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Capture first idea</button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {ideas?.map((idea, i) => (
          <div key={idea._id} className="feature-card flex flex-col group relative overflow-hidden"
            style={{ animationDelay: `${i * 50}ms`, padding: "24px" }}>
            <div className="flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4 gap-4">
                <h3 className="text-lg font-medium leading-tight" style={{ color: "var(--ink)" }}>{idea.title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => handleEditClick(idea)} className="p-1 rounded-md transition-colors" style={{ color: "var(--stone)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--ink)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}
                    aria-label="Edit idea">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => { if (confirm("Delete this idea?")) deleteIdea({ id: idea._id }).then(() => toast.success("Deleted")); }}
                    className="p-1 rounded-md transition-colors" style={{ color: "var(--stone)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-red)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}
                    aria-label="Delete idea">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {idea.description ? (
                <div
                  className="text-sm leading-relaxed mb-8 line-clamp-5"
                  style={{ color: "var(--charcoal)" }}
                  dangerouslySetInnerHTML={{ __html: idea.description }}
                />
              ) : (
                <p className="text-sm italic mb-8" style={{ color: "var(--stone)" }}>No description.</p>
              )}
              <div className="mt-auto pt-4 border-t flex flex-wrap gap-2 items-center" style={{ borderColor: "var(--divider-soft)" }}>
                {idea.tags.length > 0 ? idea.tags.map(tag => <span key={tag} className="badge-pill">{tag}</span>) : (
                  <span className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--stone)" }}><Tag size={12} /> No tags</span>
                )}
              </div>
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "var(--accent-yellow)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
