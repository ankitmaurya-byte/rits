"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useUser } from "@clerk/nextjs";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { JoinWorkspaceDialog } from "@/components/workspace/join-workspace-dialog";
import {
  ChevronDown,
  Plus,
  UserPlus,
  Check,
  Building2,
  Settings,
} from "lucide-react";

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const workspacesQuery = useQuery(api.workspaces.getMyWorkspaces, user ? { clerkId: user.id } : "skip");
  const workspaces = useMemo(() => workspacesQuery ?? [], [workspacesQuery]);
  const { selectedWorkspaceId, setSelectedWorkspace } = useWorkspaceStore();

  const selected = workspaces.find((w) => w?._id === selectedWorkspaceId) ?? workspaces[0] ?? null;

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0 && workspaces[0]) {
      setSelectedWorkspace(workspaces[0]._id);
    }
  }, [workspaces, selectedWorkspaceId, setSelectedWorkspace]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div className="relative" ref={ref}>
        {/* Trigger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150 group"
          style={{
            color: "var(--charcoal)",
            backgroundColor: open ? "var(--surface-elevated)" : "transparent",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-elevated)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = open ? "var(--surface-elevated)" : "transparent")}
        >
          <div
            className="flex items-center justify-center w-5 h-5 rounded flex-shrink-0 text-xs font-bold uppercase"
            style={{ backgroundColor: "var(--ink)", color: "var(--canvas)" }}
          >
            {selected ? selected.name[0] : <Building2 size={12} />}
          </div>
          <span className="flex-1 text-left truncate text-sm font-medium" style={{ color: "var(--ink)" }}>
            {selected ? selected.name : "No workspace"}
          </span>
          <ChevronDown
            size={14}
            className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            style={{ color: "var(--mute)" }}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-lg border shadow-xl z-50 overflow-hidden"
            style={{ backgroundColor: "var(--surface-elevated)", borderColor: "var(--hairline-strong)" }}
          >
            {workspaces.length > 0 && (
              <div className="py-1">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--mute)" }}>
                  Your workspaces
                </p>
                {workspaces.map((ws) => {
                  if (!ws) return null;
                  const isActive = ws._id === (selected?._id);
                  return (
                    <button
                      key={ws._id}
                      onClick={() => { setSelectedWorkspace(ws._id); setOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                      style={{
                        color: isActive ? "var(--ink)" : "var(--charcoal)",
                        backgroundColor: isActive ? "var(--surface-deep)" : "transparent",
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "var(--surface-deep)"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <div
                        className="flex items-center justify-center w-5 h-5 rounded flex-shrink-0 text-[10px] font-bold uppercase"
                        style={{ backgroundColor: "var(--ink)", color: "var(--canvas)" }}
                      >
                        {ws.name[0]}
                      </div>
                      <span className="flex-1 text-left truncate">{ws.name}</span>
                      {isActive && <Check size={13} style={{ color: "var(--ink)" }} />}
                    </button>
                  );
                })}
              </div>
            )}

            {workspaces.length > 0 && (
              <div className="border-t" style={{ borderColor: "var(--hairline)" }} />
            )}

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); setShowCreate(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                style={{ color: "var(--charcoal)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-deep)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Plus size={14} style={{ color: "var(--mute)" }} />
                Create workspace
              </button>
              <button
                onClick={() => { setOpen(false); setShowJoin(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                style={{ color: "var(--charcoal)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-deep)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <UserPlus size={14} style={{ color: "var(--mute)" }} />
                Join workspace
              </button>
              {selected ? (
                <Link
                  href="/workspace/settings"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                  style={{ color: "var(--charcoal)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-deep)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <Settings size={14} style={{ color: "var(--mute)" }} />
                  Workspace settings
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <CreateWorkspaceDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <JoinWorkspaceDialog open={showJoin} onClose={() => setShowJoin(false)} />
    </>
  );
}
