"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useUser } from "@clerk/nextjs";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkspaceDialog({ open, onClose }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const createWorkspace = useMutation(api.workspaces.createWorkspace);
  const setSelectedWorkspace = useWorkspaceStore((s) => s.setSelectedWorkspace);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Workspace name is required"); return; }
    setLoading(true);
    try {
      const id = await createWorkspace({ name: name.trim(), description: description.trim() || undefined, clerkId: user!.id });
      setSelectedWorkspace(id);
      toast.success(`Workspace "${name.trim()}" created!`);
      setName(""); setDescription("");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
      <div
        className="relative w-full max-w-md rounded-xl border p-6 shadow-2xl animate-fade-in-up"
        style={{ backgroundColor: "var(--surface-elevated)", borderColor: "var(--hairline-strong)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ backgroundColor: "var(--surface-deep)", border: "1px solid var(--hairline)" }}>
              <Building2 size={18} style={{ color: "var(--ink)" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>Create workspace</h2>
              <p className="text-xs" style={{ color: "var(--mute)" }}>Invite your team to collaborate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--stone)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--stone)")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--mute)" }}>
              Workspace name *
            </label>
            <input
              autoFocus
              placeholder="e.g. Acme Corp, Growth Team..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--mute)" }}>
              Description (optional)
            </label>
            <textarea
              placeholder="What does this workspace focus on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input-field resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? "Creating..." : "Create workspace"}
          </button>
          <button onClick={onClose} className="btn-outline px-4">Cancel</button>
        </div>
      </div>
    </div>
  );
}
