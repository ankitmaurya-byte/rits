"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { RitsAiLogo } from "@/components/ai/rits-ai-logo";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Search, Command, Menu, X, Home, Flame, Layers3, Filter } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ChatSheet } from "@/components/ai/chat-sheet";
import { ConfirmProvider } from "@/components/ui/confirm-provider";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/explore": "Explore",
  "/explore/yc": "Explore · YC",
  "/explore/sharktank": "Explore · Shark Tank",
  "/explore/open-source": "Explore · Tech Feed",
  "/explore/github-tools": "Explore · GitHub Tools",
  "/explore/ai-startups": "Explore · AI Startups",
  "/research": "Research",
  "/research/link-analysis": "Research · Analysis",
  "/research/files": "Research · Analysis",
  "/research/competitors": "Research · Competitors",
  "/research/newsletters": "Research · Newsletters",
  "/research/reports": "Research · Analysis",
  "/research/mvp-lab": "Research · MVP Lab",
  "/vaults": "Vaults",
  "/vaults/startups": "Vaults · Startups",
  "/vaults/ai-tools": "Vaults · AI Tools",
  "/vaults/markets": "Vaults · Markets",
  "/integrations": "Integrations",
  "/feed": "Tech Feed",
  "/chats": "Chats",
  "/roadmap": "Roadmap",
  "/ideas": "Ideas",
  "/todos": "Todos",
  "/notes": "Notes",
  "/startups": "Startup Directory",
  "/private/ideas": "Private · Ideas",
  "/private/chats": "Private · Chats",
  "/private/todos": "Private · Kanban",
  "/private/notes": "Private · Confluence",
  "/private/resources": "Private · Resources",
  "/private/vaults": "Private · Vaults",
  "/workspace/chats": "Workspace · Chats",
  "/workspace/todos": "Workspace · Kanban",
  "/workspace/notes": "Workspace · Confluence",
  "/workspace/resources": "Workspace · Resources",
  "/workspace/vaults": "Workspace · Vaults",
  "/workspace/members": "Workspace · Members",
  "/workspace/settings": "Workspace · Settings",
  "/workspace/settings/members": "Workspace · Settings · Members",
  "/workspace/join": "Join Workspace",
  "/profile": "Profile",
  "/settings": "Settings",
  "/feedback": "Feedback",
};

const searchEntries = [
  { href: "/dashboard", title: "Dashboard", keywords: ["home", "overview", "summary"] },
  { href: "/explore", title: "Explore", keywords: ["discover", "directory", "startups"] },
  { href: "/explore/yc", title: "YC Explorer", keywords: ["y combinator", "batches", "founders"] },
  { href: "/explore/sharktank", title: "Shark Tank", keywords: ["pitches", "investors", "tv"] },
  { href: "/explore/open-source", title: "Tech Feed", keywords: ["tech social", "network", "feed", "builders"] },
  { href: "/explore/github-tools", title: "GitHub Tools", keywords: ["github", "frameworks", "tools"] },
  { href: "/explore/ai-startups", title: "AI Startups", keywords: ["ai companies", "models", "copilots"] },
  { href: "/research", title: "Research", keywords: ["analysis", "reports", "intelligence"] },
  { href: "/research/link-analysis", title: "Analysis", keywords: ["url", "website", "summary", "analysis"] },
  { href: "/research/files", title: "Analysis", keywords: ["drive", "docs", "folders", "analysis"] },
  { href: "/research/competitors", title: "Competitors", keywords: ["market map", "rivals", "alternatives"] },
  { href: "/research/newsletters", title: "Newsletters", keywords: ["newsletter", "research inbox", "subscriptions"] },
  { href: "/research/reports", title: "Analysis", keywords: ["briefs", "reports", "structured docs", "analysis"] },
  { href: "/research/mvp-lab", title: "MVP Lab", keywords: ["builder", "landing page", "spec"] },
  { href: "/vaults", title: "Vaults", keywords: ["collections", "knowledge", "curation"] },
  { href: "/vaults/startups", title: "Startup Vaults", keywords: ["companies", "founders", "watchlist"] },
  { href: "/vaults/ai-tools", title: "AI Tools Vault", keywords: ["repos", "ai tools", "frameworks"] },
  { href: "/vaults/markets", title: "Market Vaults", keywords: ["industry", "trends", "sectors"] },
  { href: "/integrations", title: "Integrations", keywords: ["gmail", "calendar", "github"] },
  { href: "/feed", title: "Tech Feed", keywords: ["feed", "tech network", "builders", "social"] },
  { href: "/chats", title: "Chats", keywords: ["ai", "threads", "workspace chat"] },
  { href: "/roadmap", title: "Roadmap", keywords: ["learning path", "roadmap", "templates"] },
  { href: "/ideas", title: "Ideas", keywords: ["brainstorm", "concepts"] },
  { href: "/todos", title: "Todos", keywords: ["tasks", "kanban"] },
  { href: "/notes", title: "Notes", keywords: ["documents", "writing"] },
  { href: "/startups", title: "Startup Directory", keywords: ["companies", "directory"] },
  { href: "/private/ideas", title: "Private Ideas", keywords: ["personal ideas"] },
  { href: "/private/chats", title: "Private Chats", keywords: ["friends", "direct messages"] },
  { href: "/private/todos", title: "Private Kanban", keywords: ["personal tasks", "kanban"] },
  { href: "/private/notes", title: "Private Confluence", keywords: ["personal docs", "confluence"] },
  { href: "/private/resources", title: "Private Resources", keywords: ["personal links"] },
  { href: "/private/vaults", title: "Private Vaults", keywords: ["personal vaults", "assets", "images"] },
  { href: "/workspace/chats", title: "Workspace Chats", keywords: ["team chat", "workspace rooms"] },
  { href: "/workspace/todos", title: "Workspace Kanban", keywords: ["team tasks", "kanban"] },
  { href: "/workspace/notes", title: "Workspace Confluence", keywords: ["team docs", "confluence", "knowledge base"] },
  { href: "/workspace/resources", title: "Workspace Resources", keywords: ["team resources"] },
  { href: "/workspace/vaults", title: "Workspace Vaults", keywords: ["team vaults", "shared assets"] },
  { href: "/workspace/settings", title: "Workspace Settings", keywords: ["workspace", "settings", "team"] },
  { href: "/workspace/settings/members", title: "Workspace Members", keywords: ["team", "people"] },
  { href: "/workspace/join", title: "Join Workspace", keywords: ["invite", "join"] },
  { href: "/profile", title: "Profile", keywords: ["account", "me"] },
  { href: "/settings", title: "Settings", keywords: ["preferences", "config"] },
  { href: "/feedback", title: "Feedback", keywords: ["support", "message"] },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  type PageSearchFilter = "all" | "headings" | "actions" | "content";
  type PageSearchKind = Exclude<PageSearchFilter, "all">;
  type PageSearchItem = { id: string; label: string; kind: PageSearchKind; element: HTMLElement };

  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const pageSearchRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const pageItemCounterRef = useRef(0);
  const [pageQuery, setPageQuery] = useState("");
  const [pageFilter, setPageFilter] = useState<PageSearchFilter>("all");
  const [pageResults, setPageResults] = useState<PageSearchItem[]>([]);
  const [pageSearchOpen, setPageSearchOpen] = useState(false);

  const mobileNavItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/research", label: "Research", icon: Layers3 },
    { href: "__ai__", label: "Rits AI", icon: null },
    { href: "/feed", label: "Feed", icon: Flame },
    { href: "/chats", label: "Chats", icon: Bell },
  ];

  const matches = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return searchEntries.slice(0, 6);

    return searchEntries
      .filter((entry) => {
        const haystack = [entry.title, entry.href, ...entry.keywords].join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 6);
  }, [searchValue]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (!pageSearchRef.current?.contains(event.target as Node)) {
        setPageSearchOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#fcfdff] border-t-transparent animate-spin" />
          <p className="text-sm text-[#888e90] font-medium">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  const title =
    pageTitles[pathname] ??
    (pathname.startsWith("/private/vaults/")
      ? "Private · Vault"
      : pathname.startsWith("/workspace/vaults/")
        ? "Workspace · Vault"
        : "Rits");
  const hideFloatingAiButton =
    pathname === "/chats" ||
    pathname === "/private/chats" ||
    pathname === "/workspace/chats";

  const openSearchResult = (href: string) => {
    setSearchValue("");
    setSearchOpen(false);
    router.push(href);
  };

  const collectPageItems = (query: string, filter: PageSearchFilter) => {
    const root = mainContentRef.current;
    if (!root) return [] as PageSearchItem[];

    const selectors = [
      "[data-page-search]",
      "h1",
      "h2",
      "h3",
      "button",
      "a",
      "article",
      "section",
      "[role='button']",
    ].join(",");

    const normalized = query.trim().toLowerCase();

    return Array.from(root.querySelectorAll<HTMLElement>(selectors))
      .map((element) => {
        const text = (element.dataset.pageSearch || element.textContent || "").replace(/\s+/g, " ").trim();
        if (!text || text.length < 3) return null;
        const tag = element.tagName.toLowerCase();
        const kind: PageSearchKind = tag.startsWith("h") ? "headings" : tag === "button" || tag === "a" || element.getAttribute("role") === "button" ? "actions" : "content";
        if (filter !== "all" && kind !== filter) return null;
        if (normalized && !text.toLowerCase().includes(normalized)) return null;
        if (!element.dataset.pageSearchId) {
          pageItemCounterRef.current += 1;
          element.dataset.pageSearchId = `page-item-${pageItemCounterRef.current}`;
        }
        return {
          id: element.dataset.pageSearchId,
          label: text.slice(0, 110),
          kind,
          element,
        } satisfies PageSearchItem;
      })
      .filter((item): item is PageSearchItem => Boolean(item))
      .slice(0, 8);
  };

  const updatePageResults = (nextQuery: string, nextFilter: PageSearchFilter) => {
    const results = collectPageItems(nextQuery, nextFilter);
    setPageResults(results);
    setPageSearchOpen(true);
  };

  const jumpToPageItem = (item: PageSearchItem) => {
    item.element.scrollIntoView({ behavior: "smooth", block: "center" });
    item.element.style.outline = "1px solid rgba(59,158,255,0.85)";
    item.element.style.outlineOffset = "4px";
    window.setTimeout(() => {
      item.element.style.outline = "";
      item.element.style.outlineOffset = "";
    }, 1400);
    setPageSearchOpen(false);
  };

  return (
    <ConfirmProvider>
      <div
        className="flex h-dvh overflow-hidden"
        style={{ backgroundColor: "var(--canvas)" }}
      >
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[272px] shadow-2xl">
              <Sidebar />
            </div>
          </div>
        ) : null}

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Top header */}
        <header className="layout-header shrink-0">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setMobileNavOpen((current) => !current)} className="inline-flex md:hidden items-center justify-center h-9 w-9 rounded-md border" style={{ borderColor: "var(--hairline)", color: "var(--ink)", backgroundColor: "var(--surface-card)" }}>
              {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <h1
              className="text-base sm:text-lg font-medium tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
  {/* Rits AI button */}
  <button
    type="button"
    onClick={() => setIsAiOpen(true)}
    className="hidden sm:inline-flex items-center gap-2 h-[36px] px-3 rounded-md transition-colors"
    style={{
      background: "var(--surface-elevated)",
      border: "1px solid var(--hairline-strong)",
      color: "var(--charcoal)",
      fontSize: "13px",
      fontWeight: 500,
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.24)";
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.color = "var(--charcoal)";
      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--hairline-strong)";
    }}
  >
    <RitsAiLogo size={15} />
    <span>Rits AI</span>
    <span
      className="flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded"
      style={{
        background: "var(--surface-deep)",
        border: "1px solid var(--hairline)",
        color: "var(--mute)",
      }}
    >
      <Command size={9} />K
    </span>
  </button>

  <div className="hidden sm:block w-px h-5" style={{ backgroundColor: "var(--hairline)" }} />

  {/* Search */}
  <div ref={searchRef} className="relative hidden lg:block">
    <Search
      size={13}
      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
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
      onFocus={(e) => {
        setSearchOpen(true);
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && matches[0]) {
          e.preventDefault();
          openSearchResult(matches[0].href);
        }
        if (e.key === "Escape") {
          setSearchOpen(false);
        }
      }}
      className="h-[36px] rounded-md text-sm transition-colors"
      style={{
        width: "200px",
        padding: "0 12px 0 32px",
        background: "var(--surface-card)",
        border: "1px solid var(--hairline-strong)",
        color: "var(--ink)",
        outline: "none",
      }}
      onBlur={e => (e.currentTarget.style.borderColor = "var(--hairline-strong)")}
    />
    {searchOpen && matches.length > 0 && (
      <div
        className="absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] overflow-hidden rounded-xl border"
        style={{
          borderColor: "var(--hairline-strong)",
          backgroundColor: "var(--surface-card)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
        }}
      >
        <div className="border-b px-3 py-2 text-[10px] uppercase tracking-[0.16em]" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>
          Jump to
        </div>
        <div className="p-1.5">
          {matches.map((entry) => (
            <button
              key={entry.href}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => openSearchResult(entry.href)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/6"
            >
              <span className="text-sm" style={{ color: "var(--ink)" }}>{entry.title}</span>
              <span className="text-[11px]" style={{ color: "var(--mute)" }}>{entry.href}</span>
            </button>
          ))}
        </div>
      </div>
    )}
  </div>

  <div className="hidden sm:block w-px h-5" style={{ backgroundColor: "var(--hairline)" }} />

  <div className="hidden sm:block">
    <ThemeToggle />
  </div>

  {/* Notifications */}
  <button
    className="relative flex items-center justify-center w-[36px] h-[36px] rounded-md transition-colors"
    style={{ color: "var(--charcoal)" }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-elevated)";
      (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      (e.currentTarget as HTMLButtonElement).style.color = "var(--charcoal)";
    }}
  >
    <Bell size={17} />
    <span
      className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: "var(--accent-red)" }}
    />
  </button>

  <div className="hidden sm:block w-px h-5" style={{ backgroundColor: "var(--hairline)" }} />

  <ProfileMenu />
</div>
        </header>

        <div className="shrink-0 border-b px-3 py-2 sm:px-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--canvas)" }}>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div ref={pageSearchRef} className="relative w-full lg:max-w-[420px]">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
              <input
                type="text"
                value={pageQuery}
                onChange={(event) => {
                  const next = event.target.value;
                  setPageQuery(next);
                  updatePageResults(next, pageFilter);
                }}
                onFocus={() => updatePageResults(pageQuery, pageFilter)}
                placeholder="Search this page"
                className="h-[36px] w-full rounded-md pl-9 pr-3 text-sm outline-none"
                style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--hairline-strong)", color: "var(--ink)" }}
              />
              {pageSearchOpen && pageResults.length > 0 ? (
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-xl border" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)", boxShadow: "0 18px 40px rgba(0,0,0,0.28)" }}>
                  <div className="border-b px-3 py-2 text-[10px] uppercase tracking-[0.16em]" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>Jump in page</div>
                  <div className="p-1.5">
                    {pageResults.map((item) => (
                      <button key={item.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => jumpToPageItem(item)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/6">
                        <span className="text-sm" style={{ color: "var(--ink)" }}>{item.label}</span>
                        <span className="text-[10px] uppercase" style={{ color: "var(--mute)" }}>{item.kind}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {([
                { key: "all", label: "All" },
                { key: "headings", label: "Headings" },
                { key: "actions", label: "Actions" },
                { key: "content", label: "Content" },
              ] as Array<{ key: PageSearchFilter; label: string }>).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setPageFilter(item.key);
                    updatePageResults(pageQuery, item.key);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: pageFilter === item.key ? "var(--hairline-strong)" : "var(--hairline)", backgroundColor: pageFilter === item.key ? "var(--surface-elevated)" : "var(--surface-card)", color: pageFilter === item.key ? "var(--ink)" : "var(--mute)" }}
                >
                  {item.key === "all" ? <Filter size={12} /> : null}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main scrollable content area */}
        <main
          className="flex-1 overflow-auto"
          style={{ backgroundColor: "var(--canvas)" }}
        >
          <div className="h-full relative pb-20 md:pb-0">
            {/* Atmospheric top glow for every page */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at top, var(--hairline-strong) 0%, transparent 70%)",
                opacity: 0.5,
              }}
            />
            <div ref={mainContentRef} className="relative z-10 h-full">{children}</div>
          </div>
        </main>
      </div>

      {/* Floating AI Button */}
 {!hideFloatingAiButton ? <div className="fixed bottom-5 right-5 z-40 group hidden md:block">
  {/* Pulse rings  use accent-blue-glow from design */}
  <span
    className="absolute inset-0 rounded-full animate-ping"
    style={{
      background: "rgba(0,117,255,0.2)",
      animationDuration: "2.4s",
    }}
  />
  <span
    className="absolute -inset-2 rounded-full animate-ping"
    style={{
      background: "rgba(0,117,255,0.1)",
      animationDuration: "2.4s",
      animationDelay: "0.8s",
    }}
  />

  {/* Button */}
  <button
    type="button"
    onClick={() => setIsAiOpen(true)}
    aria-label="Chat with Rits AI"
    className="relative z-10 w-[60px] h-[60px] rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95"
    style={{
      background: "linear-gradient(135deg, #0a0a0c 0%, #101012 60%, #06060a 100%)",
      border: "1px solid rgba(255,255,255,0.14)",
      boxShadow: "0 0 24px rgba(0,117,255,0.2), 0 8px 32px rgba(0,0,0,0.6)",
      transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
    }}
  >
    <RitsAiLogo size={28} />
  </button>

  {/* Tooltip */}
  <div
    className="absolute bottom-full right-0 mb-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
    style={{
      background: "#101012",
      border: "1px solid rgba(255,255,255,0.14)",
      color: "rgba(252,253,255,0.86)",
    }}
  >
    Chat with Rits AI
  </div>
 </div> : null}
      <ChatSheet open={isAiOpen} onOpenChange={setIsAiOpen} />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t md:hidden" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)" }}>
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {mobileNavItems.map(({ href, label, icon: Icon }) => {
            const isAi = href === "__ai__";
            const isActive = !isAi && (pathname === href || pathname.startsWith(href + "/"));
            return (
              <button key={href} type="button" onClick={() => { if (isAi) setIsAiOpen(true); else router.push(href); }} className="flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-medium" style={{ color: isAi ? "var(--ink)" : isActive ? "var(--ink)" : "var(--mute)", backgroundColor: isAi ? "var(--surface-elevated)" : isActive ? "var(--surface-elevated)" : "transparent" }}>
                {isAi ? <RitsAiLogo size={16} /> : Icon ? <Icon size={16} /> : null}
                <span className="mt-1">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      </div>
    </ConfirmProvider>
  );
}
