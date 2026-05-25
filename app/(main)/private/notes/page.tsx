"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, FileText, Trash2, Clock, Menu, Lock, ChevronRight, List, Filter, ArrowDownUp, Zap, Search, Maximize2, Settings, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { NoteEditor } from "@/components/notes/editor";
import { formatDistanceToNow } from "date-fns";
import { useConfirm } from "@/components/ui/confirm-provider";

import { ConfluenceLayout } from "@/components/notes/confluence-layout";

export default function PrivateNotesPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");

  const notes = useQuery(api.notes.getPrivateNotes, convexUser ? { createdBy: convexUser._id } : "skip");
  const createNote = useMutation(api.notes.createNote);
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const confirm = useConfirm();

  return (
    <ConfluenceLayout 
      notes={notes}
      createNote={createNote}
      updateNote={updateNote}
      deleteNote={deleteNote}
      confirm={confirm}
      convexUser={convexUser}
      scope="private"
    />
  );
}
