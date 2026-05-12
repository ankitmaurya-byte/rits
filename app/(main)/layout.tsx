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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc]">
         <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#635bff] border-t-transparent animate-spin" />
          <p className="text-sm text-[#475569] font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const title = pageTitles[pathname] ?? "Rits";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fc]">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="layout-header shrink-0">
          <div className="flex items-center gap-4">
             <h1 className="text-lg font-semibold text-[#0f172a] tracking-tight">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative group hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-[#94a3b8] group-hover:text-[#635bff] transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-12 py-1.5 w-64 bg-[#f1f5f9] border border-transparent rounded-md text-sm text-[#0f172a] placeholder-[#94a3b8] focus:bg-white focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff] transition-all outline-none"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-[#94a3b8] bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                  <Command size={10} /> K
                </span>
              </div>
            </div>

            {/* Notifications */}
            <button className="p-2 text-[#475569] hover:bg-[#f1f5f9] rounded-md transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ef4444] rounded-full border-2 border-white"></span>
            </button>

            <div className="w-px h-6 bg-[#e2e8f0] mx-1" />

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-1">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-[#0f172a] leading-tight">
                  {user.firstName || user.username || "User"}
                </p>
                <p className="text-xs text-[#64748b] leading-tight">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8 rounded-md shadow-sm border border-[#e2e8f0]",
                    userButtonPopoverCard: "shadow-lg border border-[#e2e8f0] rounded-xl"
                  }
                }}
              />
            </div>
          </div>
        </header>

        {/* Main scrollable content area */}
        <main className="flex-1 overflow-auto bg-[#f7f9fc]">
          <div className="h-full">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
}
