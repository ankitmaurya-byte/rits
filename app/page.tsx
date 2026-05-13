"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const features = [
  "Capture and organize startup ideas",
  "Track todos with priority levels",
  "Rich-text notes with live editing",
  "Real-time sync across all devices",
];

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.push("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: "var(--canvas)", color: "var(--ink)" }}
    >
      {/* Top Atmospheric Glow */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "0",
          left: "50%",
          transform: "translateX(-50%)",
          width: "1200px",
          height: "600px",
          background: "radial-gradient(ellipse at top, var(--hairline-strong) 0%, transparent 70%)",
          opacity: 0.8,
          pointerEvents: "none",
        }}
      />

      {/* Accent Glow */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: "-20%",
          right: "-10%",
          width: "800px",
          height: "800px",
          background: "radial-gradient(ellipse at bottom right, var(--accent-orange-glow) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 h-[64px]" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-sm bg-white overflow-hidden">
            <Image
              src="/rits_brand_logo_assets/rits_only_logo_transparent_background_text_dark.png"
              alt="Rits Logo"
              width={32}
              height={32}
              className="object-contain scale-[1.7]"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm tracking-tight leading-none" style={{ color: "var(--ink)" }}>
              Rits
            </span>
            <span className="text-[10px] font-medium opacity-50 mt-1" style={{ color: "var(--charcoal)" }}>
              Research in tech startup
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <SignInButton mode="modal">
            <button className="text-sm font-medium transition-colors hover:underline" style={{ color: "var(--body)" }}>
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="btn-primary" style={{ padding: "6px 14px" }}>
              Get Started
            </button>
          </SignUpButton>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center py-[128px] animate-fade-in-up">
        {/* Logo */}
        <div className="mb-10 flex items-center justify-center">
          <Image
            src="/rits_brand_logo_assets/rits_name_only_complete_transpaent_background_withou_dot_com_text_white.png"
            alt="Rits Icon"
            width={120}
            height={48}
            className="object-contain drop-shadow-xl show-in-dark"
            priority
          />
          <Image
            src="/rits_brand_logo_assets/rits_name_only_without_dot_com_transparent_but_light_white_background_text_dark.png"
            alt="Rits Icon"
            width={120}
            height={48}
            className="object-contain drop-shadow-xl show-in-light"
            priority
          />
        </div>

        {/* Hero Text */}
        <h1
          className="max-w-4xl mx-auto font-medium leading-[1.0] mb-8"
          style={{
            color: "var(--ink)",
            letterSpacing: "-0.04em",
            fontSize: "clamp(56px, 8vw, 96px)", // Responsive size from 56px to 96px
            fontFamily: "'Geist Mono', monospace, sans-serif" // Resend uses Domaine Display, we approximate with a sharp font or standard sans
          }}
        >
          Research in tech startup
        </h1>

        <p
          className="max-w-2xl text-lg mb-12 leading-relaxed mx-auto"
          style={{ color: "var(--charcoal)", fontSize: "20px" }}
        >
          Ideas, todos, and notes — all in one beautifully unified workspace.
          Built for startup teams moving fast.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <SignUpButton mode="modal">
            <button className="btn-primary" style={{ height: "48px", padding: "0 24px", fontSize: "16px" }}>
              Get started for free
            </button>
          </SignUpButton>

          <SignInButton mode="modal">
            <button className="btn-outline" style={{ height: "48px", padding: "0 24px", fontSize: "16px" }}>
              Sign in to account
            </button>
          </SignInButton>
        </div>

        {/* Feature list */}
        <div className="pt-12 border-t" style={{ borderColor: "var(--divider-soft)", width: "100%", maxWidth: "800px" }}>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {features.map((f) => (
              <li
                key={f}
                className="flex flex-col gap-3 text-sm"
                style={{ color: "var(--body)" }}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: "var(--surface-elevated)" }}>
                  <CheckCircle2 size={16} style={{ color: "var(--ink)" }} />
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Complex Footer */}
      <footer className="relative z-10 pt-16 pb-8 px-8 sm:px-16" style={{ borderTop: "1px solid var(--divider-soft)", backgroundColor: "var(--canvas)", color: "var(--charcoal)" }}>
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
          <div className="flex flex-col gap-6 w-full max-w-md">
            <h3 className="text-base font-semibold" style={{ color: "var(--ink)" }}>Sign up for updates on our latest innovations</h3>
            <p className="text-xs" style={{ color: "var(--mute)" }}>
              I accept Rits's Terms and Conditions and acknowledge that my information will be used in accordance with Rits's Privacy Policy.
            </p>
            <div className="flex w-full items-center rounded-full p-1" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--hairline-strong)" }}>
              <input type="email" placeholder="Get the latest updates" className="flex-1 bg-transparent px-4 py-2 text-sm outline-none" style={{ color: "var(--ink)" }} />
              <button className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors hover:bg-opacity-90" style={{ backgroundColor: "var(--ink)", color: "var(--canvas)" }}>
                Sign up
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>Follow us</span>
            <div className="flex gap-4">
              <a href="#" className="hover:opacity-70 transition-opacity" style={{ color: "var(--ink)" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l16 16M4 20L20 4"/></svg></a>
              <a href="#" className="hover:opacity-70 transition-opacity" style={{ color: "var(--ink)" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
              <a href="#" className="hover:opacity-70 transition-opacity" style={{ color: "var(--ink)" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg></a>
              <a href="#" className="hover:opacity-70 transition-opacity" style={{ color: "var(--ink)" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>
              <a href="#" className="hover:opacity-70 transition-opacity" style={{ color: "var(--ink)" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg></a>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-24 text-sm">
          {/* Models */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-base mb-2" style={{ color: "var(--ink)" }}>Models</h4>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 bg-current rotate-45 scale-75" /> Gemini</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 bg-current rotate-45 scale-75" /> Nano Banana</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 bg-current rotate-45 scale-75" /> Gemini Audio</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 bg-current rotate-45 scale-75" /> Gemma</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 bg-current rotate-45 scale-75" /> Genie</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 bg-current rotate-45 scale-75" /> Lyria</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 bg-current rotate-45 scale-75" /> Veo</a>
          </div>

          {/* Research */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-base mb-2" style={{ color: "var(--ink)" }}>Research</h4>
            <a href="#" className="hover:opacity-70">Evals</a>
            <a href="#" className="hover:opacity-70">Breakthroughs</a>
            <a href="#" className="hover:opacity-70">Publications</a>
            <a href="#" className="hover:opacity-70">Responsibility</a>
          </div>

          {/* Science */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-base mb-2" style={{ color: "var(--ink)" }}>Science</h4>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 border border-current rounded-sm" /> AlphaFold</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 border border-current rounded-sm" /> AlphaGenome</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 border border-current rounded-sm" /> WeatherNext</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 border border-current rounded-sm" /> AlphaEarth</a>
          </div>

          {/* Products */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-base mb-2" style={{ color: "var(--ink)" }}>Products</h4>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 bg-current rotate-45 scale-75" /> Gemini app</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 border border-current rotate-45 scale-75" /> Google AI Studio</a>
            <a href="#" className="flex items-center gap-2 hover:opacity-70"><div className="w-3 h-3 bg-current" style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} /> Google Antigravity</a>
          </div>

          {/* Learn more */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-base mb-2" style={{ color: "var(--ink)" }}>Learn more</h4>
            <a href="#" className="hover:opacity-70">About</a>
            <a href="#" className="hover:opacity-70">News</a>
            <a href="#" className="hover:opacity-70">Careers</a>
            <a href="#" className="hover:opacity-70">National Partnerships for AI</a>
            <a href="#" className="hover:opacity-70">The Podcast</a>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 pt-8" style={{ borderTop: "1px solid var(--hairline-strong)" }}>
          <div className="flex flex-col">
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight mb-2" style={{ color: "var(--ink)" }}>Rits</h2>
            <p className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: "var(--mute)" }}>
              Build responsibly<br />to benefit humanity
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)", border: "1px solid var(--hairline-strong)" }}>
              Build with Rits
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors hover:bg-opacity-90" style={{ backgroundColor: "var(--ink)", color: "var(--canvas)" }}>
              <div className="w-3 h-3 bg-current rotate-45 scale-75" /> Try Rits
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
