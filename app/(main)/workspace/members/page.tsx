"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Users, Crown, UserX, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InviteMemberDialog } from "@/components/workspace/invite-member-dialog";
import { useUser } from "@clerk/nextjs";

export default function WorkspaceMembersPage() {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const [showInvite, setShowInvite] = useState(false);

  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const workspace = useQuery(api.workspaces.getWorkspaceById, selectedWorkspaceId && user ? { workspaceId: selectedWorkspaceId, clerkId: user.id } : "skip");
  const members = useQuery(api.workspaces.getWorkspaceMembers, selectedWorkspaceId && user ? { workspaceId: selectedWorkspaceId, clerkId: user.id } : "skip");
  const pendingInvites = useQuery(api.workspaces.getPendingInvites, selectedWorkspaceId && user ? { workspaceId: selectedWorkspaceId, clerkId: user.id } : "skip");
  const removeMember = useMutation(api.workspaces.removeMember);

  const isOwner = workspace?.ownerId === convexUser?._id;

  if (!selectedWorkspaceId) {
    return (
      <div className="page-container animate-fade-in-up flex flex-col items-center justify-center py-40 text-center">
        <Users size={40} className="mb-6" style={{ color: "var(--stone)" }} />
        <h2 className="text-2xl font-medium mb-3" style={{ color: "var(--ink)" }}>No workspace selected</h2>
        <p style={{ color: "var(--charcoal)" }}>Create or join a workspace using the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in-up relative">
      {/* Atmospheric glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="page-header border-b pb-10 mb-10 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <span className="text-xs uppercase tracking-widest font-medium px-2 py-0.5 rounded" style={{ color: "var(--mute)", backgroundColor: "var(--surface-deep)", border: "1px solid var(--hairline)" }}>
            {workspace?.name ?? "Workspace"}
          </span>
          <h2 className="text-3xl font-medium tracking-tight mt-2 mb-1" style={{ color: "var(--ink)" }}>Members</h2>
          <p className="text-sm" style={{ color: "var(--charcoal)" }}>{members?.length ?? 0} {members?.length === 1 ? "member" : "members"}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Invite members
        </button>
      </div>

      {/* Members List */}
      <div className="max-w-2xl">
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-widest" style={{ color: "var(--mute)" }}>Active members</h3>
          <div className="feature-card divide-y" style={{ padding: 0, borderColor: "var(--hairline-strong)" }}>
            {members?.map((member: any) => {
              if (!member) return null;
              const isSelf = member._id === convexUser?._id;
              const memberIsOwner = member.role === "owner";
              return (
                <div key={member._id} className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: "var(--surface-elevated)", color: "var(--ink)", border: "1px solid var(--hairline)" }}>
                    {member.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{member.name} {isSelf && <span className="text-xs" style={{ color: "var(--mute)" }}>(you)</span>}</p>
                      {memberIsOwner && <Crown size={12} style={{ color: "var(--accent-yellow)" }} aria-label="Owner" />}
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--mute)" }}>{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{
                      backgroundColor: memberIsOwner ? "rgba(250,204,21,0.1)" : "var(--surface-deep)",
                      color: memberIsOwner ? "var(--accent-yellow)" : "var(--mute)",
                      border: `1px solid ${memberIsOwner ? "rgba(250,204,21,0.2)" : "var(--hairline)"}`,
                    }}>
                      {member.role}
                    </span>
                    {/* Remove: owner can remove members (not self), members can leave (not owner) */}
                    {!memberIsOwner && (isOwner || isSelf) && (
                      <button
                        onClick={async () => {
                          const action = isSelf ? "leave this workspace?" : `remove ${member.name}?`;
                          if (!confirm(`Are you sure you want to ${action}`)) return;
                          try {
                            await removeMember({ workspaceId: selectedWorkspaceId, userId: member._id, clerkId: user!.id });
                            toast.success(isSelf ? "Left workspace" : "Member removed");
                          } catch (e: any) { toast.error(e.message || "Failed"); }
                        }}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: "var(--stone)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-red)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}
                        title={isSelf ? "Leave workspace" : "Remove member"}
                      >
                        <UserX size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Invites */}
        {pendingInvites && pendingInvites.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-widest" style={{ color: "var(--mute)" }}>Pending invites</h3>
            <div className="feature-card divide-y" style={{ padding: 0, borderColor: "var(--hairline-strong)" }}>
              {pendingInvites.map((invite: any) => (
                <div key={invite._id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--hairline)", color: "var(--mute)" }}>
                    <UserPlus size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{invite.email}</p>
                    <p className="text-xs" style={{ color: "var(--mute)" }}>Invite pending</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(251,191,36,0.1)", color: "rgb(251,191,36)", border: "1px solid rgba(251,191,36,0.2)" }}>
                    pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {workspace && (
        <InviteMemberDialog
          open={showInvite}
          onClose={() => setShowInvite(false)}
          workspaceId={selectedWorkspaceId}
          workspaceName={workspace.name}
        />
      )}
    </div>
  );
}
