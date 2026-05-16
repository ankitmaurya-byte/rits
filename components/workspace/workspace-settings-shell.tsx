"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Settings, Users } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/store/workspace-store";

const settingsLinks = [
  { href: "/workspace/settings/members", label: "Members", icon: Users },
];

export function WorkspaceSettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const workspace = useQuery(api.workspaces.getWorkspaceById, selectedWorkspaceId && user ? { workspaceId: selectedWorkspaceId, clerkId: user.id } : "skip");

  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>Workspace settings</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-medium tracking-tight" style={{ color: "var(--ink)" }}>
          <Settings size={22} />
          {workspace?.name ?? "Workspace"}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--charcoal)" }}>Manage members and workspace-level controls from one place.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="feature-card self-start" style={{ padding: "18px" }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Settings</p>
          <nav className="space-y-1">
            {settingsLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    color: isActive ? "var(--ink)" : "var(--charcoal)",
                    backgroundColor: isActive ? "var(--surface-elevated)" : "transparent",
                  }}
                >
                  <Icon size={14} style={{ color: isActive ? "var(--ink)" : "var(--stone)" }} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
