"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Zap, ArrowRight, CheckCircle2 } from "lucide-react";
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
      className="min-h-screen flex flex-col"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Gradient blob */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99 91 255 / 0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: "-20%",
          left: "-5%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(5 112 222 / 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 32,
              height: 32,
              background: "var(--brand)",
              boxShadow: "var(--shadow-brand)",
            }}
          >
            <Zap size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span
            className="font-semibold text-base tracking-tight"
            style={{ color: "#fff" }}
          >
            Rits
          </span>
        </div>

        <SignInButton mode="modal">
          <button
            className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={{
              color: "rgba(255 255 255 / 0.7)",
              border: "1px solid rgba(255 255 255 / 0.12)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255 255 255 / 0.06)";
              (e.currentTarget as HTMLElement).style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color =
                "rgba(255 255 255 / 0.7)";
            }}
          >
            Sign in
          </button>
        </SignInButton>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center py-24 animate-fade-up">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{
            background: "rgba(99 91 255 / 0.15)",
            color: "#a5b4fc",
            border: "1px solid rgba(99 91 255 / 0.3)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--brand)" }}
          />
          Your startup command center
        </div>

        <h1
          className="max-w-2xl text-5xl font-bold leading-tight mb-6"
          style={{ color: "#fff", letterSpacing: "-0.03em" }}
        >
          The OS for{" "}
          <span
            style={{
              backgroundImage:
                "linear-gradient(135deg, #635bff 0%, #0570de 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ambitious
          </span>{" "}
          founders
        </h1>

        <p
          className="max-w-md text-lg mb-10 leading-relaxed"
          style={{ color: "rgba(255 255 255 / 0.5)" }}
        >
          Ideas, todos, and notes — all in one beautifully unified workspace.
          Built for startup teams moving fast.
        </p>

        {/* Feature list */}
        <ul className="flex flex-col sm:flex-row flex-wrap justify-center gap-x-6 gap-y-2 mb-12">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "rgba(255 255 255 / 0.5)" }}
            >
              <CheckCircle2
                size={13}
                style={{ color: "var(--brand)", flexShrink: 0 }}
              />
              {f}
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <SignUpButton mode="modal">
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "var(--brand)",
                color: "#fff",
                boxShadow: "var(--shadow-brand)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--brand-hover)";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-1px)";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 8px 24px rgba(99 91 255 / 0.45)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--brand)";
                (e.currentTarget as HTMLElement).style.transform = "none";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "var(--shadow-brand)";
              }}
            >
              Get started free
              <ArrowRight size={14} />
            </button>
          </SignUpButton>

          <SignInButton mode="modal">
            <button
              className="px-6 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                color: "rgba(255 255 255 / 0.6)",
                border: "1px solid rgba(255 255 255 / 0.1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255 255 255 / 0.06)";
                (e.currentTarget as HTMLElement).style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(255 255 255 / 0.6)";
              }}
            >
              Sign in to existing account
            </button>
          </SignInButton>
        </div>
      </main>

      {/* Bottom fade */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "200px",
          background:
            "linear-gradient(to top, rgba(10 37 64 / 0.5), transparent)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
