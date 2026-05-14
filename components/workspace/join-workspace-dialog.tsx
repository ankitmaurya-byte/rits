"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X, Link2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useUser } from "@clerk/nextjs";

interface JoinWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
}

export function JoinWorkspaceDialog({ open, onClose }: JoinWorkspaceDialogProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const joinByToken = useMutation(api.workspaces.joinByToken);
  const setSelectedWorkspace = useWorkspaceStore((s) => s.setSelectedWorkspace);

  // Extract token from pasted URL or raw token
  const extractToken = (input: string): string => {
    try {
      const url = new URL(input);
      const t = url.searchParams.get("token");
      return t || input.trim();
    } catch {
      return input.trim();
    }
  };

  // Preview workspace info from token
  const preview = useQuery(
    api.workspaces.getWorkspaceByToken,
    token.length > 8 ? { token: extractToken(token) } : "skip"
  );

  const handleJoin = async () => {
    const t = extractToken(token);
    if (!t) { toast.error("Please paste an invite link or token"); return; }
    if (!user) { toast.error("You must be logged in to join a workspace"); return; }
    setLoading(true);
    try {
      const workspaceId = await joinByToken({ token: t, clerkId: user.id });
      setSelectedWorkspace(workspaceId);
      toast.success(preview ? `Joined "${preview.name}"!` : "Joined workspace!");
      setToken("");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Invalid invite link");
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ backgroundColor: "var(--surface-deep)", border: "1px solid var(--hairline)" }}>
              <Users size={18} style={{ color: "var(--ink)" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>Join workspace</h2>
              <p className="text-xs" style={{ color: "var(--mute)" }}>Paste an invite link to get started</p>
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
              Invite link or token
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link2 size={14} style={{ color: "var(--mute)" }} />
              </div>
              <input
                autoFocus
                placeholder="https://rits.app/workspace/join?token=..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="input-field pl-9"
              />
            </div>
          </div>

          {/* Workspace preview */}
          {token.length > 8 && preview && (
            <div className="rounded-lg p-4 border" style={{ backgroundColor: "var(--surface-deep)", borderColor: "var(--hairline)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--mute)" }}>You're joining</p>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{preview.name}</p>
              {preview.description && (
                <p className="text-xs mt-1" style={{ color: "var(--charcoal)" }}>{preview.description}</p>
              )}
            </div>
          )}
          {token.length > 8 && preview === null && (
            <div className="rounded-lg p-3 border" style={{ backgroundColor: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}>
              <p className="text-xs" style={{ color: "var(--accent-red)" }}>Invalid invite link  workspace not found</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleJoin}
            disabled={loading || !token.trim()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? "Joining..." : "Join workspace"}
          </button>
          <button onClick={onClose} className="btn-outline px-4">Cancel</button>
        </div>
      </div>
    </div>
  );
}
