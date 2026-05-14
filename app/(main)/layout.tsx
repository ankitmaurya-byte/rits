"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { RitsAiLogo } from "@/components/ai/rits-ai-logo";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Search, Command } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ChatSheet } from "@/components/ai/chat-sheet";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/ideas": "Ideas",
  "/todos": "Todos",
  "/notes": "Notes",
  "/startups": "Startup Directory",
  "/private/ideas": "Private · Ideas",
  "/private/todos": "Private · Todos",
  "/private/notes": "Private · Notes",
  "/private/resources": "Private · Resources",
  "/workspace/ideas": "Workspace · Ideas",
  "/workspace/todos": "Workspace · Todos",
  "/workspace/notes": "Workspace · Notes",
  "/workspace/resources": "Workspace · Resources",
  "/workspace/members": "Workspace · Members",
  "/workspace/join": "Join Workspace",
  "/profile": "Profile",
  "/settings": "Settings",
  "/feedback": "Feedback",
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isAiOpen, setIsAiOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/");
  }, [isLoaded, isSignedIn, router]);

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

  const title = pageTitles[pathname] ?? "Rits";

  return (
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
  <div className="relative hidden sm:block">
    <Search
      size={13}
      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
      style={{ color: "var(--mute)" }}
    />
    <input
      type="text"
      placeholder="Search..."
      className="h-[36px] rounded-md text-sm transition-colors"
      style={{
        width: "200px",
        padding: "0 12px 0 32px",
        background: "var(--surface-card)",
        border: "1px solid var(--hairline-strong)",
        color: "var(--ink)",
        outline: "none",
      }}
      onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
      onBlur={e => (e.currentTarget.style.borderColor = "var(--hairline-strong)")}
    />
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
  {/* Pulse rings — use accent-blue-glow from design */}
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
  );
}
