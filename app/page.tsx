"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Zap, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

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
          <div className="flex items-center justify-center w-6 h-6 rounded-sm bg-white">
            <Zap size={14} className="text-black" strokeWidth={2.5} />
          </div>
          <span className="font-medium text-sm tracking-tight" style={{ color: "var(--ink)" }}>
            Rits
          </span>
        </div>

        <div className="flex items-center gap-4">
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
        {/* Badge */}
        <div className="badge-pill mb-10 flex items-center gap-2" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--hairline-strong)" }}>
          <span className="status-dot status-green" />
          System Operational
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
          The OS for founders
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

      {/* Footer */}
      <footer className="relative z-10 py-[64px] px-[32px] text-center" style={{ borderTop: "1px solid var(--divider-soft)" }}>
        <p className="text-sm" style={{ color: "var(--ash)" }}>
          © 2026 Rits. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
