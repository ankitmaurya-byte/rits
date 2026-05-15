"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { RitsAiLogo } from "@/components/ai/rits-ai-logo";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Search, Command } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ChatSheet } from "@/components/ai/chat-sheet";
import { ConfirmProvider } from "@/components/ui/confirm-provider";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/explore": "Explore",
  "/explore/yc": "Explore · YC",
  "/explore/sharktank": "Explore · Shark Tank",
  "/explore/open-source": "Explore · Open Source",
  "/explore/github-tools": "Explore · GitHub Tools",
  "/explore/ai-startups": "Explore · AI Startups",
  "/research": "Research",
  "/research/link-analysis": "Research · Link Analysis",
  "/research/files": "Research · Files",
  "/research/competitors": "Research · Competitors",
  "/research/reports": "Research · AI Reports",
  "/research/mvp-lab": "Research · MVP Lab",
  "/vaults": "Vaults",
  "/vaults/startups": "Vaults · Startups",
  "/vaults/ai-tools": "Vaults · AI Tools",
  "/vaults/markets": "Vaults · Markets",
  "/integrations": "Integrations",
  "/chats": "Chats",
  "/ideas": "Ideas",
  "/todos": "Todos",
  "/notes": "Notes",
  "/startups": "Startup Directory",
  "/private/ideas": "Private · Ideas",
  "/private/chats": "Private · Chats",
  "/private/todos": "Private · Todos",
  "/private/notes": "Private · Notes",
  "/private/resources": "Private · Resources",
  "/private/vaults": "Private · Vaults",
  "/workspace/chats": "Workspace · Chats",
  "/workspace/ideas": "Workspace · Ideas",
  "/workspace/todos": "Workspace · Todos",
  "/workspace/notes": "Workspace · Notes",
  "/workspace/resources": "Workspace · Resources",
  "/workspace/vaults": "Workspace · Vaults",
  "/workspace/members": "Workspace · Members",
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
  { href: "/explore/open-source", title: "Open Source", keywords: ["repos", "libraries", "oss"] },
  { href: "/explore/github-tools", title: "GitHub Tools", keywords: ["github", "frameworks", "tools"] },
  { href: "/explore/ai-startups", title: "AI Startups", keywords: ["ai companies", "models", "copilots"] },
  { href: "/research", title: "Research", keywords: ["analysis", "reports", "intelligence"] },
  { href: "/research/link-analysis", title: "Link Analysis", keywords: ["url", "website", "summary"] },
  { href: "/research/files", title: "Research Files", keywords: ["drive", "docs", "folders"] },
  { href: "/research/competitors", title: "Competitors", keywords: ["market map", "rivals", "alternatives"] },
  { href: "/research/reports", title: "AI Reports", keywords: ["briefs", "reports", "structured docs"] },
  { href: "/research/mvp-lab", title: "MVP Lab", keywords: ["builder", "landing page", "spec"] },
  { href: "/vaults", title: "Vaults", keywords: ["collections", "knowledge", "curation"] },
  { href: "/vaults/startups", title: "Startup Vaults", keywords: ["companies", "founders", "watchlist"] },
  { href: "/vaults/ai-tools", title: "AI Tools Vault", keywords: ["repos", "ai tools", "frameworks"] },
  { href: "/vaults/markets", title: "Market Vaults", keywords: ["industry", "trends", "sectors"] },
  { href: "/integrations", title: "Integrations", keywords: ["gmail", "calendar", "github"] },
  { href: "/chats", title: "Chats", keywords: ["ai", "threads", "workspace chat"] },
  { href: "/ideas", title: "Ideas", keywords: ["brainstorm", "concepts"] },
  { href: "/todos", title: "Todos", keywords: ["tasks", "kanban"] },
  { href: "/notes", title: "Notes", keywords: ["documents", "writing"] },
  { href: "/startups", title: "Startup Directory", keywords: ["companies", "directory"] },
  { href: "/private/ideas", title: "Private Ideas", keywords: ["personal ideas"] },
  { href: "/private/chats", title: "Private Chats", keywords: ["friends", "direct messages"] },
  { href: "/private/todos", title: "Private Todos", keywords: ["personal tasks"] },
  { href: "/private/notes", title: "Private Notes", keywords: ["personal notes"] },
  { href: "/private/resources", title: "Private Resources", keywords: ["personal links"] },
  { href: "/private/vaults", title: "Private Vaults", keywords: ["personal vaults", "assets", "images"] },
  { href: "/workspace/chats", title: "Workspace Chats", keywords: ["team chat", "workspace rooms"] },
  { href: "/workspace/ideas", title: "Workspace Ideas", keywords: ["team ideas"] },
  { href: "/workspace/todos", title: "Workspace Todos", keywords: ["team tasks"] },
  { href: "/workspace/notes", title: "Workspace Notes", keywords: ["team notes"] },
  { href: "/workspace/resources", title: "Workspace Resources", keywords: ["team resources"] },
  { href: "/workspace/vaults", title: "Workspace Vaults", keywords: ["team vaults", "shared assets"] },
  { href: "/workspace/members", title: "Workspace Members", keywords: ["team", "people"] },
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
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  const openSearchResult = (href: string) => {
    setSearchValue("");
    setSearchOpen(false);
    router.push(href);
  };

  return (
    <ConfirmProvider>
      <div
        className="flex h-screen overflow-hidden"
        style={{ backgroundColor: "var(--canvas)" }}
      >
        <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="layout-header shrink-0">
          <div className="flex items-center gap-4">
            <h1
              className="text-lg font-medium tracking-tight"
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

  <div className="w-px h-5" style={{ backgroundColor: "var(--hairline)" }} />

  {/* Search */}
  <div ref={searchRef} className="relative hidden sm:block">
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

  <div className="w-px h-5" style={{ backgroundColor: "var(--hairline)" }} />

  <ThemeToggle />

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

  <div className="w-px h-5" style={{ backgroundColor: "var(--hairline)" }} />

  <ProfileMenu />
</div>
        </header>

        {/* Main scrollable content area */}
        <main
          className="flex-1 overflow-auto"
          style={{ backgroundColor: "var(--canvas)" }}
        >
          <div className="h-full relative">
            {/* Atmospheric top glow for every page */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at top, var(--hairline-strong) 0%, transparent 70%)",
                opacity: 0.5,
              }}
            />
            <div className="relative z-10 h-full">{children}</div>
          </div>
        </main>
      </div>

      {/* Floating AI Button */}
<div className="fixed bottom-5 right-5 z-40 group">
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
</div>
        <ChatSheet open={isAiOpen} onOpenChange={setIsAiOpen} />
      </div>
    </ConfirmProvider>
  );
}
