"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Id } from "@/convex/_generated/dataModel";

interface WorkspaceState {
  selectedWorkspaceId: Id<"workspaces"> | null;
  setSelectedWorkspace: (id: Id<"workspaces"> | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspaceId: null,
      setSelectedWorkspace: (id) => set({ selectedWorkspaceId: id }),
    }),
    {
      name: "rits-selected-workspace",
    }
  )
);
