"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { X, Mail, Link2, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface InviteMemberDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
  workspaceName: string;
}

export function InviteMemberDialog({ open, onClose, workspaceId, workspaceName }: InviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { user } = useUser();
  const inviteByEmail = useMutation(api.workspaces.inviteByEmail);
  const regenerateToken = useMutation(api.workspaces.regenerateInviteToken);
  const workspace = useQuery(api.workspaces.getWorkspaceById, user ? { workspaceId, clerkId: user.id } : "skip");

  const inviteLink = workspace
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/workspace/join?token=${workspace.inviteToken}`
    : "";

  const handleInvite = async () => {
    if (!email.trim() || !email.includes("@")) { toast.error("Enter a valid email"); return; }
    setLoading(true);
    try {
      await inviteByEmail({ workspaceId, email: email.trim(), clerkId: user!.id });
      toast.success(`Invite sent to ${email.trim()}`);
      setEmail("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleRegenerateToken = async () => {
    try {
      await regenerateToken({ workspaceId, clerkId: user!.id });
      toast.success("New invite link generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to regenerate link");
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
              <Mail size={18} style={{ color: "var(--ink)" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>Invite to {workspaceName}</h2>
              <p className="text-xs" style={{ color: "var(--mute)" }}>Add team members via email or link</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md transition-colors" style={{ color: "var(--stone)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--stone)")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Email invite */}
        <div className="mb-5">
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--mute)" }}>
            Invite by email
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={14} style={{ color: "var(--mute)" }} />
              </div>
              <input
                autoFocus
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="input-field pl-9"
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={loading || !email.trim()}
              className="btn-primary px-4 flex items-center gap-2 flex-shrink-0"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : null}
              {loading ? "" : "Send"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--hairline)" }} />
          <span className="text-xs" style={{ color: "var(--mute)" }}>or share link</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--hairline)" }} />
        </div>

        {/* Invite link */}
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--mute)" }}>
            Shareable invite link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm truncate"
              style={{ backgroundColor: "var(--surface-deep)", borderColor: "var(--hairline)", color: "var(--charcoal)" }}
            >
              <Link2 size={13} className="flex-shrink-0" style={{ color: "var(--mute)" }} />
              <span className="truncate text-xs">{inviteLink || "Loading..."}</span>
            </div>
            <button
              onClick={handleCopyLink}
              disabled={!inviteLink}
              className="px-3 py-2 rounded-lg border text-sm flex items-center gap-1.5 flex-shrink-0 transition-colors"
              style={{
                backgroundColor: linkCopied ? "rgba(34,197,94,0.1)" : "var(--surface-deep)",
                borderColor: linkCopied ? "rgba(34,197,94,0.3)" : "var(--hairline)",
                color: linkCopied ? "rgb(34,197,94)" : "var(--charcoal)"
              }}
            >
              {linkCopied ? <Check size={13} /> : <Copy size={13} />}
              {linkCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--mute)" }}>
            Anyone with this link can join.{" "}
            <button
              onClick={handleRegenerateToken}
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:no-underline transition-all"
              style={{ color: "var(--charcoal)" }}
            >
              <RefreshCw size={10} /> Regenerate
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
