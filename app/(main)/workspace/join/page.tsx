"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Users, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function JoinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const { user } = useUser();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const workspace = useQuery(
    api.workspaces.getWorkspaceByToken,
    token ? { token } : "skip"
  );
  const joinByToken = useMutation(api.workspaces.joinByToken);
  const setSelectedWorkspace = useWorkspaceStore((s) => s.setSelectedWorkspace);

  const handleJoin = async () => {
    if (!user) { toast.error("You must be logged in to join a workspace"); return; }
    setJoining(true);
    try {
      const workspaceId = await joinByToken({ token, clerkId: user.id });
      setSelectedWorkspace(workspaceId);
      setJoined(true);
      toast.success(`Joined "${workspace?.name}"!`);
      setTimeout(() => router.push("/workspace/ideas"), 1500);
    } catch (e: any) {
      toast.error(e.message || "Failed to join workspace");
    } finally {
      setJoining(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center text-center">
        <AlertCircle size={40} className="mb-4" style={{ color: "var(--accent-red)" }} />
        <h2 className="text-xl font-medium mb-2" style={{ color: "var(--ink)" }}>Invalid invite link</h2>
        <p style={{ color: "var(--charcoal)" }}>This invite link is missing a token. Please ask for a valid link.</p>
      </div>
    );
  }

  if (workspace === undefined) {
    return <div className="flex items-center gap-3"><Loader2 size={20} className="animate-spin" style={{ color: "var(--mute)" }} /><span style={{ color: "var(--charcoal)" }}>Loading workspace...</span></div>;
  }

  if (workspace === null) {
    return (
      <div className="flex flex-col items-center text-center">
        <AlertCircle size={40} className="mb-4" style={{ color: "var(--accent-red)" }} />
        <h2 className="text-xl font-medium mb-2" style={{ color: "var(--ink)" }}>Workspace not found</h2>
        <p style={{ color: "var(--charcoal)" }}>This invite link is invalid or has been revoked.</p>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 size={48} className="mb-4" style={{ color: "var(--accent-green)" }} />
        <h2 className="text-2xl font-medium mb-2" style={{ color: "var(--ink)" }}>You're in!</h2>
        <p style={{ color: "var(--charcoal)" }}>Redirecting to {workspace.name}...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold mb-6"
        style={{ backgroundColor: "var(--surface-elevated)", color: "var(--ink)", border: "1px solid var(--hairline-strong)" }}>
        {workspace.name[0]}
      </div>
      <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: "var(--mute)" }}>You've been invited to join</p>
      <h2 className="text-3xl font-semibold tracking-tight mb-2" style={{ color: "var(--ink)" }}>{workspace.name}</h2>
      {workspace.description && (
        <p className="mb-8 max-w-sm" style={{ color: "var(--charcoal)" }}>{workspace.description}</p>
      )}
      <button
        onClick={handleJoin}
        disabled={joining}
        className="btn-primary px-8 py-3 text-base flex items-center gap-2"
      >
        {joining ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
        {joining ? "Joining..." : "Join workspace"}
      </button>
    </div>
  );
}

export default function JoinWorkspacePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: "var(--canvas)" }}>
      <div className="w-full max-w-md">
        {/* Glow */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
        <Suspense fallback={
          <div className="flex items-center gap-3 justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--mute)" }} />
          </div>
        }>
          <JoinContent />
        </Suspense>
      </div>
    </div>
  );
}
