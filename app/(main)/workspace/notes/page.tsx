"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, FileText, Trash2, Clock, Menu, Users, ChevronRight, List, Filter, ArrowDownUp, Zap, Search, Maximize2, Settings, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { NoteEditor } from "@/components/notes/editor";
import { formatDistanceToNow } from "date-fns";
import { useConfirm } from "@/components/ui/confirm-provider";

import { ConfluenceLayout } from "@/components/notes/confluence-layout";

export default function WorkspaceNotesPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { selectedWorkspaceId } = useWorkspaceStore();

  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const notes = useQuery(api.notes.getNotes, selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip");
  const createNote = useMutation(api.notes.createNote);
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const confirm = useConfirm();

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
    <ConfluenceLayout 
      notes={notes}
      createNote={createNote}
      updateNote={updateNote}
      deleteNote={deleteNote}
      confirm={confirm}
      convexUser={convexUser}
      scope="workspace"
      workspaceId={selectedWorkspaceId}
    />
  );
}
