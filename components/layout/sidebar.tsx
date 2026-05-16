"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Blocks,
  Bot,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  FileText,
  Layers3,
  Link2,
  Rocket,
  Route,
  Users,
  FolderKanban,
  MessageSquareText,
  PlugZap,
  Radar,
  SearchCode,
  Telescope,
  MessageSquare,
} from "lucide-react";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

const privateLinks = [
  { href: "/roadmap", label: "Roadmap", icon: Route },
  { href: "/private/todos", label: "Kanban", icon: CheckSquare },
  { href: "/private/notes", label: "Confluence", icon: FileText },
  { href: "/private/resources", label: "Resources", icon: Link2 },
];

const workspaceLinks = [
  { href: "/workspace/chats", label: "Chats", icon: MessageSquare },
  { href: "/workspace/todos", label: "Kanban", icon: CheckSquare },
  { href: "/workspace/notes", label: "Confluence", icon: FileText },
  { href: "/workspace/resources", label: "Resources", icon: Link2 },
  { href: "/workspace/vaults", label: "Vault", icon: FolderKanban },
];

const productLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Radar },
  { href: "/integrations", label: "Integrations", icon: PlugZap },
];

const exploreLinks = [
  { href: "/explore/yc", label: "YC Explorer", icon: Rocket },
  { href: "/explore/sharktank", label: "Shark Tank", icon: Telescope },
  { href: "/explore/open-source", label: "Open Source", icon: Blocks },
  { href: "/explore/github-tools", label: "GitHub Tools", icon: SearchCode },
  { href: "/explore/ai-startups", label: "AI Startups", icon: Bot },
];

const researchLinks = [
  { href: "/research/reports", label: "Analysis", icon: Layers3 },
  { href: "/research/competitors", label: "Competitors", icon: Users },
  { href: "/research/reports", label: "AI Reports", icon: Bot },
  { href: "/research/mvp-lab", label: "MVP Lab", icon: Rocket },
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
      {label ? (
        <div className="flex items-center justify-between px-3 mb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--mute)" }}>
            {label}
          </p>
          {icon}
        </div>
      ) : null}
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

function CollapsibleNavSection({
  label,
  links,
  icon,
  defaultOpen = false,
  children,
}: {
  label: string;
  links: { href: string; label: string; icon: React.ElementType }[];
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasActiveLink = links.some(
    ({ href }) => pathname === href || pathname.startsWith(href + "/")
  );
  const hasActiveChild = Boolean(children) && (
    pathname.startsWith("/private/") || pathname.startsWith("/workspace/")
  );
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isExpanded = isOpen || hasActiveLink || hasActiveChild;

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-all duration-150 hover:bg-[var(--surface-elevated)]"
        style={{
          borderColor: hasActiveLink || hasActiveChild ? "var(--hairline-strong)" : "transparent",
          backgroundColor: hasActiveLink || hasActiveChild ? "var(--surface-elevated)" : "transparent",
        }}
      >
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--mute)" }}>
            {label}
          </p>
          {icon}
        </div>
        {isExpanded ? (
          <ChevronDown size={12} style={{ color: "var(--stone)" }} />
        ) : (
          <ChevronRight size={12} style={{ color: "var(--stone)" }} />
        )}
      </button>
      {isExpanded ? (
        <div className="mt-2 space-y-2">
          {links.length > 0 ? <NavSection label="" links={links} /> : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  useUser();

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
        <CollapsibleNavSection
          label="Workspace"
          links={[]}
          icon={<Users size={10} style={{ color: "var(--mute)" }} />}
          defaultOpen
        >
          <div className="space-y-2 pl-2">
            <NavSection label="" links={privateLinks} />

            <div>
              <div className="mb-2 px-3">
                <WorkspaceSwitcher />
              </div>
              <NavSection label="" links={workspaceLinks} />
            </div>
          </div>
        </CollapsibleNavSection>

        <div className="h-px mx-1" style={{ backgroundColor: "var(--hairline)" }} />

        <CollapsibleNavSection label="Explore" links={exploreLinks} />

        <div className="h-px mx-1" style={{ backgroundColor: "var(--hairline)" }} />

        <CollapsibleNavSection label="Research" links={researchLinks} />
      </div>

      {/* ── PRODUCT (sticky bottom) ── */}
      <div className="shrink-0 px-3 py-3 border-t" style={{ borderColor: "var(--hairline)" }}>
        <nav className="space-y-0.5">
          <Link
            href="/private/chats"
            className="mb-2 flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 relative"
            style={{
              color: pathname === "/private/chats" ? "var(--ink)" : "var(--charcoal)",
              backgroundColor: pathname === "/private/chats" ? "var(--surface-elevated)" : "transparent",
            }}
          >
            {pathname === "/private/chats" ? (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full" style={{ backgroundColor: "var(--ink)" }} />
            ) : null}
            <MessageSquareText size={14} className="flex-shrink-0 ml-1" style={{ color: pathname === "/private/chats" ? "var(--ink)" : "var(--stone)" }} />
            <span className="flex-1">Private Chats</span>
          </Link>
          {productLinks.map(({ href, label, icon: Icon }) => {
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
        <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--hairline)" }}>
          <Link
            href="/private/vaults"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 relative"
            style={{
              color: pathname === "/private/vaults" || pathname.startsWith("/private/vaults/") ? "var(--ink)" : "var(--charcoal)",
              backgroundColor: pathname === "/private/vaults" || pathname.startsWith("/private/vaults/") ? "var(--surface-elevated)" : "transparent",
            }}
          >
            {(pathname === "/private/vaults" || pathname.startsWith("/private/vaults/")) ? (
              <div className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full" style={{ backgroundColor: "var(--ink)" }} />
            ) : null}
            <FolderKanban size={14} className="ml-1 flex-shrink-0" style={{ color: pathname === "/private/vaults" || pathname.startsWith("/private/vaults/") ? "var(--ink)" : "var(--stone)" }} />
            <span className="flex-1">Private Vault</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
