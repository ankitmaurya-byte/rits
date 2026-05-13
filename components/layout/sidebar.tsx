"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Lightbulb,
  CheckSquare,
  FileText,
  Link2,
  Rocket,
  Lock,
  Users,
} from "lucide-react";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

const privateLinks = [
  { href: "/private/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/private/todos", label: "Todos", icon: CheckSquare },
  { href: "/private/notes", label: "Notes", icon: FileText },
  { href: "/private/resources", label: "Resources", icon: Link2 },
];

const workspaceLinks = [
  { href: "/workspace/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/workspace/todos", label: "Todos", icon: CheckSquare },
  { href: "/workspace/notes", label: "Notes", icon: FileText },
  { href: "/workspace/resources", label: "Resources", icon: Link2 },
  { href: "/workspace/members", label: "Members", icon: Users },
];

function NavSection({
  label,
  links,
  icon,
}: {
  label: string;
  links: { href: string; label: string; icon: React.ElementType }[];
  icon?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mb-1">
      <div className="flex items-center justify-between px-3 mb-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--mute)" }}>
          {label}
        </p>
        {icon}
      </div>
      <nav className="space-y-0.5">
        {links.map(({ href, label: linkLabel, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 group relative"
              style={{
                color: isActive ? "var(--ink)" : "var(--charcoal)",
                backgroundColor: isActive ? "var(--surface-elevated)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-elevated)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                  style={{ backgroundColor: "var(--ink)" }}
                />
              )}
              <Icon
                size={14}
                strokeWidth={isActive ? 2 : 1.75}
                className="flex-shrink-0 transition-colors ml-1"
                style={{ color: isActive ? "var(--ink)" : "var(--stone)" }}
              />
              <span className="flex-1">{linkLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isStartupsActive = pathname === "/startups" || pathname.startsWith("/startups/");

  return (
    <aside
      className="flex flex-col h-full border-r"
      style={{
        width: "240px",
        flexShrink: 0,
        backgroundColor: "var(--canvas)",
        borderColor: "var(--hairline-strong)",
      }}
      aria-label="Sidebar navigation"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 h-[60px] border-b shrink-0" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex items-center justify-center w-6 h-6 rounded-sm bg-white overflow-hidden shrink-0">
          <Image
            src="/rits_brand_logo_assets/rits_only_logo_transparent_background_text_dark.png"
            alt="Rits Icon"
            width={32}
            height={32}
            className="object-contain scale-[1.7]"
            priority
          />
        </div>
        <Image
          src="/rits_brand_logo_assets/rits_name_only_complete_transpaent_background_withou_dot_com_text_white.png"
          alt="Rits Name"
          width={60}
          height={24}
          className="object-contain show-in-dark"
          priority
        />
        <Image
          src="/rits_brand_logo_assets/rits_name_only_without_dot_com_transparent_but_light_white_background_text_dark.png"
          alt="Rits Name"
          width={60}
          height={24}
          className="object-contain show-in-light"
          priority
        />
      </div>

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3 min-h-0">
        {/* ── PRIVATE ── */}
        <div>
          <div className="flex items-center gap-1.5 px-3 mb-1.5">
            <Lock size={9} style={{ color: "var(--mute)" }} />
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--mute)" }}>
              Private
            </p>
          </div>
          <nav className="space-y-0.5">
            {privateLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 relative"
                  style={{
                    color: isActive ? "var(--ink)" : "var(--charcoal)",
                    backgroundColor: isActive ? "var(--surface-elevated)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-elevated)"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full" style={{ backgroundColor: "var(--ink)" }} />
                  )}
                  <Icon size={14} strokeWidth={isActive ? 2 : 1.75} className="flex-shrink-0 ml-1" style={{ color: isActive ? "var(--ink)" : "var(--stone)" }} />
                  <span className="flex-1">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── DIVIDER ── */}
        <div className="h-px mx-1" style={{ backgroundColor: "var(--hairline)" }} />

        {/* ── WORKSPACE ── */}
        <div>
          <div className="mb-2">
            <WorkspaceSwitcher />
          </div>
          <nav className="space-y-0.5">
            {workspaceLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 relative"
                  style={{
                    color: isActive ? "var(--ink)" : "var(--charcoal)",
                    backgroundColor: isActive ? "var(--surface-elevated)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-elevated)"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full" style={{ backgroundColor: "var(--ink)" }} />
                  )}
                  <Icon size={14} strokeWidth={isActive ? 2 : 1.75} className="flex-shrink-0 ml-1" style={{ color: isActive ? "var(--ink)" : "var(--stone)" }} />
                  <span className="flex-1">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── STARTUP DIRECTORY (sticky bottom) ── */}
      <div className="shrink-0 px-3 py-3 border-t" style={{ borderColor: "var(--hairline)" }}>
        <Link
          href="/startups"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 relative group"
          style={{
            color: isStartupsActive ? "var(--ink)" : "var(--charcoal)",
            backgroundColor: isStartupsActive ? "var(--surface-elevated)" : "transparent",
          }}
          onMouseEnter={(e) => { if (!isStartupsActive) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-elevated)"; }}
          onMouseLeave={(e) => { if (!isStartupsActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
        >
          {isStartupsActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full" style={{ backgroundColor: "var(--ink)" }} />
          )}
          <Rocket size={14} strokeWidth={isStartupsActive ? 2 : 1.75} className="flex-shrink-0 ml-1" style={{ color: isStartupsActive ? "var(--ink)" : "var(--stone)" }} />
          <span className="flex-1">Startup Directory</span>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: "var(--surface-deep)", color: "var(--mute)", border: "1px solid var(--hairline)" }}>
            General
          </span>
        </Link>
      </div>
    </aside>
  );
}
