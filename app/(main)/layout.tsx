"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { RitsAiLogo } from "@/components/ai/rits-ai-logo";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Home, Flame, Layers3, Bell } from "lucide-react";
import { ChatSheet } from "@/components/ai/chat-sheet";
import { ConfirmProvider } from "@/components/ui/confirm-provider";



export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiOpenRequest, setAiOpenRequest] = useState({ id: 0, prompt: "" });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const mobileNavItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/research", label: "Research", icon: Layers3 },
    { href: "__ai__", label: "Rits AI", icon: null },
    { href: "/feed", label: "Feed", icon: Flame },
    { href: "/chats", label: "Chats", icon: Bell },
  ];

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const handleOpenAi = (event: Event) => {
      const prompt = event instanceof CustomEvent && typeof event.detail?.prompt === "string" ? event.detail.prompt : "";
      setAiOpenRequest((current) => ({ id: current.id + 1, prompt }));
      setIsAiOpen(true);
    };

    window.addEventListener("rits-ai:open", handleOpenAi);
    return () => window.removeEventListener("rits-ai:open", handleOpenAi);
  }, []);

  const openAi = () => {
    setAiOpenRequest((current) => ({ id: current.id + 1, prompt: "" }));
    setIsAiOpen(true);
  };

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

  const hideFloatingAiButton =
    pathname === "/chats" ||
    pathname === "/private/chats" ||
    pathname === "/workspace/chats";

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
        {/* Mobile-only top bar for hamburger */}
        <div className="flex items-center h-[52px] px-4 border-b md:hidden shrink-0" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--canvas)" }}>
          <button type="button" onClick={() => setMobileNavOpen((current) => !current)} className="inline-flex items-center justify-center h-9 w-9 rounded-md border" style={{ borderColor: "var(--hairline)", color: "var(--ink)", backgroundColor: "var(--surface-card)" }}>
            {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
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
            <div className="relative z-10 h-full">{children}</div>
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
    onClick={openAi}
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
      <ChatSheet key={aiOpenRequest.id} open={isAiOpen} onOpenChange={setIsAiOpen} initialPrompt={aiOpenRequest.prompt} />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t md:hidden" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)" }}>
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {mobileNavItems.map(({ href, label, icon: Icon }) => {
            const isAi = href === "__ai__";
            const isActive = !isAi && (pathname === href || pathname.startsWith(href + "/"));
            return (
              <button key={href} type="button" onClick={() => { if (isAi) openAi(); else router.push(href); }} className="flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-medium" style={{ color: isAi ? "var(--ink)" : isActive ? "var(--ink)" : "var(--mute)", backgroundColor: isAi ? "var(--surface-elevated)" : isActive ? "var(--surface-elevated)" : "transparent" }}>
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
