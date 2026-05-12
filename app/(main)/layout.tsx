"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Bell, Search, Command } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/ideas":     "Ideas",
  "/todos":     "Todos",
  "/notes":     "Notes",
  "/startups":  "Startups",
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router   = useRouter();
  const pathname = usePathname();

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

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-1">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium leading-tight" style={{ color: "var(--ink)" }}>
                  {user.firstName || user.username || "User"}
                </p>
                <p className="text-xs leading-tight mt-0.5" style={{ color: "var(--mute)" }}>
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <div style={{ filter: "grayscale(100%) brightness(1.2)" }}>
                <UserButton 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-8 h-8 rounded-full border border-gray-700",
                      userButtonPopoverCard: "bg-black border border-gray-800 rounded-xl"
                    }
                  }}
                />
              </div>
            </div>
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
    </div>
  );
}
