"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Crown, UserPlus, Users, UserX } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { InviteMemberDialog } from "@/components/workspace/invite-member-dialog";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useWorkspaceStore } from "@/store/workspace-store";

type WorkspaceMember = {
  _id: string;
  name?: string;
  email?: string;
  role: string;
};

type PendingInvite = {
  _id: string;
  email: string;
};

export function WorkspaceMembersPanel() {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const [showInvite, setShowInvite] = useState(false);

  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const workspace = useQuery(api.workspaces.getWorkspaceById, selectedWorkspaceId && user ? { workspaceId: selectedWorkspaceId, clerkId: user.id } : "skip");
  const members = (useQuery(api.workspaces.getWorkspaceMembers, selectedWorkspaceId && user ? { workspaceId: selectedWorkspaceId, clerkId: user.id } : "skip") ?? []) as WorkspaceMember[];
  const pendingInvites = (useQuery(api.workspaces.getPendingInvites, selectedWorkspaceId && user ? { workspaceId: selectedWorkspaceId, clerkId: user.id } : "skip") ?? []) as PendingInvite[];
  const removeMember = useMutation(api.workspaces.removeMember);
  const confirm = useConfirm();

  const isOwner = workspace?.ownerId === convexUser?._id;

  if (!selectedWorkspaceId) {
    return (
      <div className="feature-card flex flex-col items-center justify-center px-6 py-16 text-center">
        <Users size={36} className="mb-4" style={{ color: "var(--stone)" }} />
        <h2 className="text-xl font-medium" style={{ color: "var(--ink)" }}>No workspace selected</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--charcoal)" }}>Open the workspace menu in the sidebar and pick a workspace first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-8" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <span className="rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-widest" style={{ color: "var(--mute)", backgroundColor: "var(--surface-deep)", borderColor: "var(--hairline)" }}>
            {workspace?.name ?? "Workspace"}
          </span>
          <h2 className="mt-2 text-2xl font-medium tracking-tight" style={{ color: "var(--ink)" }}>Members</h2>
          <p className="text-sm" style={{ color: "var(--charcoal)" }}>{members.length} {members.length === 1 ? "member" : "members"}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Invite members
        </button>
      </div>

      <div className="max-w-3xl">
        <div className="mb-8">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--mute)" }}>Active members</h3>
          <div className="feature-card divide-y" style={{ padding: 0, borderColor: "var(--hairline-strong)" }}>
            {members.map((member) => {
              const isSelf = member._id === convexUser?._id;
              const memberIsOwner = member.role === "owner";
              return (
                <div key={member._id} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{ backgroundColor: "var(--surface-elevated)", color: "var(--ink)", border: "1px solid var(--hairline)" }}
                  >
                    {member.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{member.name} {isSelf ? <span className="text-xs" style={{ color: "var(--mute)" }}>(you)</span> : null}</p>
                      {memberIsOwner ? <Crown size={12} style={{ color: "var(--accent-yellow)" }} aria-label="Owner" /> : null}
                    </div>
                    <p className="truncate text-xs" style={{ color: "var(--mute)" }}>{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: memberIsOwner ? "rgba(250,204,21,0.1)" : "var(--surface-deep)",
                        color: memberIsOwner ? "var(--accent-yellow)" : "var(--mute)",
                        border: `1px solid ${memberIsOwner ? "rgba(250,204,21,0.2)" : "var(--hairline)"}`,
                      }}
                    >
                      {member.role}
                    </span>
                    {!memberIsOwner && (isOwner || isSelf) ? (
                      <button
                        onClick={async () => {
                          const action = isSelf ? "leave this workspace?" : `remove ${member.name}?`;
                          const confirmed = await confirm({ title: "Confirm workspace action", description: `Are you sure you want to ${action}`, confirmLabel: isSelf ? "Leave" : "Remove", variant: "destructive" });
                          if (!confirmed) return;
                          try {
                            await removeMember({ workspaceId: selectedWorkspaceId, userId: member._id, clerkId: user!.id });
                            toast.success(isSelf ? "Left workspace" : "Member removed");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Failed");
                          }
                        }}
                        className="rounded-md p-1.5 transition-colors"
                        style={{ color: "var(--stone)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-red)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}
                        title={isSelf ? "Leave workspace" : "Remove member"}
                      >
                        <UserX size={15} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {pendingInvites.length > 0 ? (
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--mute)" }}>Pending invites</h3>
            <div className="feature-card divide-y" style={{ padding: 0, borderColor: "var(--hairline-strong)" }}>
              {pendingInvites.map((invite) => (
                <div key={invite._id} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--hairline)", color: "var(--mute)" }}
                  >
                    <UserPlus size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{invite.email}</p>
                    <p className="text-xs" style={{ color: "var(--mute)" }}>Invite pending</p>
                  </div>
                  <span className="rounded border px-2 py-0.5 text-xs" style={{ backgroundColor: "rgba(251,191,36,0.1)", color: "rgb(251,191,36)", borderColor: "rgba(251,191,36,0.2)" }}>
                    pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {workspace ? (
        <InviteMemberDialog
          open={showInvite}
          onClose={() => setShowInvite(false)}
          workspaceId={selectedWorkspaceId}
          workspaceName={workspace.name}
        />
      ) : null}
    </div>
  );
}
