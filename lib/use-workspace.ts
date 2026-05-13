"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useEffect, useRef } from "react";

/**
 * Returns the currently selected workspace ID from the Zustand store.
 * Also ensures the user record exists in Convex (runs ensureUser once on mount).
 * Compatible with the old API for existing pages.
 */
export function useWorkspace(): {
  workspaceId: Id<"workspaces"> | null;
  isLoading: boolean;
} {
  const { user, isLoaded } = useUser();
  const ensureUser = useMutation(api.users.ensureUser);
  const hasEnsured = useRef(false);
  const { selectedWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    if (!isLoaded || !user || hasEnsured.current) return;
    hasEnsured.current = true;
    ensureUser({
      clerkId: user.id,
      name: user.fullName ?? user.username ?? "User",
      email: user.primaryEmailAddress?.emailAddress ?? "",
      image: user.imageUrl,
    }).catch(console.error);
  }, [isLoaded, user, ensureUser]);

  if (!isLoaded || !user) return { workspaceId: null, isLoading: true };

  return { workspaceId: selectedWorkspaceId, isLoading: false };
}
