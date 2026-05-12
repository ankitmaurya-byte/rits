"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef } from "react";

/**
 * Returns the current user's workspace ID from Convex.
 * Also ensures the user record exists in Convex (runs ensureUser once on mount).
 */
export function useWorkspace(): {
  workspaceId: Id<"workspaces"> | null | undefined;
  isLoading: boolean;
} {
  const { user, isLoaded } = useUser();
  const ensureUser = useMutation(api.users.ensureUser);
  const hasEnsured = useRef(false);

  const workspace = useQuery(
    api.users.getWorkspace,
    isLoaded && user ? { clerkId: user.id } : "skip"
  );

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
  if (workspace === undefined) return { workspaceId: undefined, isLoading: true };

  return { workspaceId: workspace?._id ?? null, isLoading: false };
}
