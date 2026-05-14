"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Search, Command, BrainCircuit } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ChatSheet } from "@/components/ai/chat-sheet";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard":          "Dashboard",
  "/ideas":              "Ideas",
  "/todos":              "Todos",
  "/notes":              "Notes",
  "/startups":           "Startup Directory",
  "/private/ideas":      "Private · Ideas",
  "/private/todos":      "Private · Todos",
  "/private/notes":      "Private · Notes",
  "/private/resources":  "Private · Resources",
  "/workspace/ideas":    "Workspace · Ideas",
  "/workspace/todos":    "Workspace · Todos",
  "/workspace/notes":    "Workspace · Notes",
  "/workspace/resources": "Workspace · Resources",
  "/workspace/members":  "Workspace · Members",
  "/workspace/join":     "Join Workspace",
  "/profile":            "Profile",
  "/settings":           "Settings",
  "/feedback":           "Feedback",
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router   = useRouter();
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
          <p className="text-sm text-[#888e90] font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const title = pageTitles[pathname] ?? "Rits";

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--canvas)" }}>
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="layout-header shrink-0">
          <div className="flex items-center gap-4">
             <h1 className="text-lg font-medium tracking-tight" style={{ color: "var(--ink)" }}>
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden rounded-full sm:inline-flex"
              onClick={() => setIsAiOpen(true)}
            >
              <BrainCircuit size={14} />
              Open Rits AI
            </Button>
            <ThemeToggle />
            {/* Search */}
            <div className="relative group hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} style={{ color: "var(--mute)" }} />
              </div>
              <input 
                type="text" 
                placeholder="Search..." 
                className="input-field pl-9 pr-12 h-[36px]"
                style={{ width: "240px", padding: "6px 14px 6px 36px" }}
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border" style={{ color: "var(--mute)", backgroundColor: "var(--surface-deep)", borderColor: "var(--hairline-strong)" }}>
                  <Command size={10} /> K
                </span>
              </div>
            </div>

            {/* Notifications */}
            <button className="p-2 rounded-md transition-colors relative" style={{ color: "var(--charcoal)" }}>
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-black" style={{ backgroundColor: "var(--accent-red)" }}></span>
            </button>

            <div className="w-px h-6 mx-1" style={{ backgroundColor: "var(--hairline)" }} />

            <ProfileMenu />
          </div>
        </header>

        {/* Main scrollable content area */}
        <main className="flex-1 overflow-auto" style={{ backgroundColor: "var(--canvas)" }}>
          <div className="h-full relative">
             {/* Atmospheric top glow for every page */}
             <div 
               className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
               style={{
                 background: "radial-gradient(ellipse at top, var(--hairline-strong) 0%, transparent 70%)",
                 opacity: 0.5
               }}
             />
             <div className="relative z-10 h-full">
               {children}
             </div>
          </div>
        </main>
      </div>

      <button
        type="button"
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium shadow-xl transition-transform hover:scale-[1.02]"
        style={{
          background: "linear-gradient(135deg, rgba(59,158,255,0.96), rgba(255,128,31,0.92))",
          color: "white",
          borderColor: "rgba(255,255,255,0.15)",
        }}
      >
        <BrainCircuit size={16} />
        Rits AI
      </button>

      <ChatSheet open={isAiOpen} onOpenChange={setIsAiOpen} />
    </div>
  );
}
