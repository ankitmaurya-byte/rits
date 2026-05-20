"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  FileText,
  Layers3,
  Link2,
  Package2,
  Rocket,
  Route,
  Users,
  FolderKanban,
  MessageSquareText,
  PlugZap,
  Radar,
  Receipt,
  Search,
  SearchCode,
  Telescope,
  MessageSquare,
  Mail,
  Flame,
} from "lucide-react";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { ProfileMenu } from "@/components/profile/profile-menu";

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
  { href: "/marketplace", label: "Marketplace", icon: Package2 },
  { href: "/integrations", label: "Integrations", icon: PlugZap },
];

const stickyBottomLinks = [
  { href: "/private/chats", label: "Private Chats", icon: MessageSquareText },
  { href: "/private/vaults", label: "Private Vault", icon: FolderKanban },
  { href: "/feed", label: "Tech Feed", icon: Flame },
  { href: "/dashboard", label: "Dashboard", icon: Radar },
];

const searchEntries = [
  { href: "/dashboard", title: "Dashboard", keywords: ["home", "overview"] },
  { href: "/explore", title: "Explore", keywords: ["discover", "startups"] },
  { href: "/explore/yc", title: "YC Explorer", keywords: ["y combinator"] },
  { href: "/explore/sharktank", title: "Shark Tank", keywords: ["pitches"] },
  { href: "/explore/github-tools", title: "GitHub Tools", keywords: ["github"] },
  { href: "/explore/ai-startups", title: "Startups", keywords: ["startups"] },
  { href: "/research", title: "Research", keywords: ["analysis"] },
  { href: "/research/analysis", title: "Analysis", keywords: ["workspace"] },
  { href: "/research/competitors", title: "Competitors", keywords: ["rivals"] },
  { href: "/research/newsletters", title: "Newsletters", keywords: ["inbox"] },
  { href: "/research/reports", title: "AI Reports", keywords: ["reports"] },
  { href: "/research/mvp-lab", title: "MVP Lab", keywords: ["builder"] },
  { href: "/vaults", title: "Vaults", keywords: ["collections"] },
  { href: "/feed", title: "Tech Feed", keywords: ["feed", "social"] },
  { href: "/chats", title: "Chats", keywords: ["ai", "threads"] },
  { href: "/roadmap", title: "Roadmap", keywords: ["learning"] },
  { href: "/ideas", title: "Ideas", keywords: ["brainstorm"] },
  { href: "/todos", title: "Todos", keywords: ["tasks"] },
  { href: "/notes", title: "Notes", keywords: ["documents"] },
  { href: "/marketplace", title: "Marketplace", keywords: ["products"] },
  { href: "/integrations", title: "Integrations", keywords: ["gmail"] },
  { href: "/profile", title: "Profile", keywords: ["account"] },
  { href: "/settings", title: "Settings", keywords: ["preferences"] },
];

const exploreLinks = [
  { href: "/explore/yc", label: "YC Explorer", icon: Rocket },
  { href: "/explore/sharktank", label: "Shark Tank", icon: Telescope },
  { href: "/explore/github-tools", label: "GitHub Tools", icon: SearchCode },
  { href: "/explore/ai-startups", label: "Startups", icon: Bot },
];

const researchLinks = [
  { href: "/research/analysis", label: "Analysis", icon: Layers3 },
  { href: "/research/competitors", label: "Competitors", icon: Users },
  { href: "/research/newsletters", label: "Newsletters", icon: Mail },
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
              key={`${href}-${linkLabel}`}
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
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const hasMountedRef = useRef(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isExpanded = isOpen;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (isOpen) {
      sectionRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }
  }, [isOpen]);

  return (
    <div ref={sectionRef} className="relative mb-1 scroll-mt-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="sticky top-0 bottom-0 z-10 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-all duration-150 hover:bg-[var(--surface-elevated)]"
        style={{
          borderColor: hasActiveLink || hasActiveChild ? "var(--hairline-strong)" : "transparent",
          backgroundColor: hasActiveLink || hasActiveChild ? "var(--surface-elevated)" : "var(--canvas)",
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
        <div className="mt-2 space-y-2 pb-1">
          {links.length > 0 ? <NavSection label="" links={links} /> : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  useUser();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return [];
    return searchEntries
      .filter((entry) => {
        const haystack = [entry.title, entry.href, ...entry.keywords].join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 6);
  }, [searchValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openSearchResult = (href: string) => {
    setSearchValue("");
    setSearchOpen(false);
    router.push(href);
  };

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
      {/* Brand Header with search */}
      <div className="flex items-center gap-2 px-3 h-[60px] border-b shrink-0" style={{ borderColor: "var(--hairline)" }}>
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
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
            width={48}
            height={20}
            className="object-contain show-in-dark"
            priority
          />
          <Image
            src="/rits_brand_logo_assets/rits_name_only_without_dot_com_transparent_but_light_white_background_text_dark.png"
            alt="Rits Name"
            width={48}
            height={20}
            className="object-contain show-in-light"
            priority
          />
        </div>

        {/* Search input */}
        <div ref={searchRef} className="relative flex-1">
          <Search
            size={11}
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--mute)" }}
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) {
                e.preventDefault();
                openSearchResult(matches[0].href);
              }
              if (e.key === "Escape") setSearchOpen(false);
            }}
            className="w-full h-[28px] rounded-md text-xs transition-colors"
            style={{
              padding: "0 8px 0 24px",
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              color: "var(--ink)",
              outline: "none",
            }}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--hairline)")}
          />
          {searchOpen && matches.length > 0 && (
            <div
              className="absolute left-0 top-[calc(100%+6px)] z-50 w-[220px] overflow-hidden rounded-xl border"
              style={{
                borderColor: "var(--hairline-strong)",
                backgroundColor: "var(--surface-card)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
              }}
            >
              <div className="border-b px-3 py-1.5 text-[9px] uppercase tracking-[0.16em]" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>
                Jump to
              </div>
              <div className="p-1">
                {matches.map((entry) => (
                  <button
                    key={entry.href}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openSearchResult(entry.href)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/6"
                  >
                    <span className="text-xs" style={{ color: "var(--ink)" }}>{entry.title}</span>
                    <span className="text-[10px]" style={{ color: "var(--mute)" }}>{entry.href}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable nav area */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-4 pt-0">
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
        <div className="h-px mx-1" style={{ backgroundColor: "var(--hairline)" }} />

        <CollapsibleNavSection label="Product" links={productLinks} />
      </div>

      {/* Sticky bottom: nav links + Profile */}
      <div className="shrink-0 border-t" style={{ borderColor: "var(--hairline)" }}>
        <div className="px-3 pt-2 pb-1">
          <NavSection label="" links={stickyBottomLinks} />
        </div>
        <div className="h-px mx-3" style={{ backgroundColor: "var(--hairline)" }} />
        <div className="px-3 py-2">
          <ProfileMenu variant="sidebar" />
        </div>
      </div>
    </aside>
  );
}
