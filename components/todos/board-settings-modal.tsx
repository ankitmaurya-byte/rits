"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, UserPlus, Shield } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface BoardSettingsModalProps {
  boardId: Id<"kanbanBoards"> | Id<"todoGroups">;
  boardType: "kanbanBoards" | "todoGroups";
  isOpen: boolean;
  onClose: () => void;
  isPublished?: boolean;
}

export function BoardSettingsModal({ boardId, boardType, isOpen, onClose, isPublished }: BoardSettingsModalProps) {
  const togglePublish = useMutation(api.kanbanSettings.togglePublish);
  const addMember = useMutation(api.kanbanSettings.addMember);
  const removeMember = useMutation(api.kanbanSettings.removeMember);
  const inviteByEmail = useMutation(api.kanbanSettings.inviteByEmail);
  
  const members = useQuery(api.kanbanSettings.getMembers, isOpen ? { boardId } : "skip");

  const handleTogglePublish = async (checked: boolean) => {
    try {
      await togglePublish({ boardId, type: boardType, isPublished: checked });
      toast.success(`Board ${checked ? "published" : "unpublished"}`);
    } catch {
      toast.error("Failed to update board status");
    }
  };

  const handleInvite = async () => {
    const email = window.prompt("Enter user email to invite:");
    if (!email) return;

    try {
      await inviteByEmail({ boardId, email: email.trim(), role: "member" });
      toast.success("User invited to kanban board");
    } catch (e: any) {
      toast.error(e.message || "Failed to invite user");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent overlayClassName="bg-black/70 backdrop-blur-[4px]" className="sm:max-w-[425px] border" style={{ backgroundColor: "var(--surface)", borderColor: "var(--hairline-strong)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--ink)" }}>Kanban Settings</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          <div className="flex items-center justify-between p-4 border rounded-xl" style={{ backgroundColor: "var(--surface-elevated)", borderColor: "var(--hairline)" }}>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{isPublished ? "Kanban is Published" : "Publish Kanban"}</span>
              <span className="text-xs max-w-[200px]" style={{ color: "var(--mute)" }}>
                Allow others to join and see Assigned To / Created By
              </span>
            </div>
            {isPublished ? (
              <Button variant="outline" size="sm" onClick={() => handleTogglePublish(false)} className="text-xs text-red-500 hover:text-red-600">
                Unpublish
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleTogglePublish(true)} className="text-xs bg-[var(--accent-blue)] text-white hover:opacity-90">
                Publish Board
              </Button>
            )}
          </div>

          <div className={`flex flex-col gap-4 ${!isPublished ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--hairline-strong)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>Members</span>
              <Button variant="outline" size="sm" onClick={handleInvite} className="h-8 text-xs" disabled={!isPublished}>
                <UserPlus size={14} className="mr-2" /> Invite Member
              </Button>
            </div>
            
            <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-2">
              {!isPublished ? (
                <div className="text-xs text-center py-4" style={{ color: "var(--mute)" }}>
                  Publish this board to start inviting members.
                </div>
              ) : members?.length === 0 ? (
                <div className="text-xs text-center py-4" style={{ color: "var(--mute)" }}>No members joined yet.</div>
              ) : (
                members?.map((member: any) => (
                  <div key={member._id} className="flex items-center justify-between p-2 rounded-md bg-[var(--surface-elevated)] border border-[var(--hairline)]">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.image} />
                        <AvatarFallback>{member.name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium" style={{ color: "var(--ink)" }}>{member.name}</span>
                      {member.role === "owner" && <Shield size={12} className="text-[var(--accent-blue)]" />}
                    </div>
                    <button 
                      onClick={() => removeMember({ boardId, userId: member._id })}
                      className="text-[var(--mute)] hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
