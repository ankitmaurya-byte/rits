"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Compass, Home } from "lucide-react";

export default function NotFoundPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [secondsLeft, setSecondsLeft] = useState(5);
  const fallbackHref = isSignedIn ? "/dashboard" : "/";

  useEffect(() => {
    if (!isLoaded) return;

    const countdown = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(countdown);
          router.push(isSignedIn ? "/dashboard" : "/");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdown);
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10" style={{ backgroundColor: "var(--canvas)" }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background: "radial-gradient(ellipse at top, rgba(59,158,255,0.14) 0%, transparent 62%), radial-gradient(ellipse at 70% 18%, rgba(255,128,31,0.12) 0%, transparent 48%)",
        }}
      />

      <div className="relative w-full max-w-2xl rounded-[28px] border px-6 py-10 text-center sm:px-10" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--accent-orange)" }}>
          <Compass size={28} />
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>404</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl" style={{ color: "var(--ink)" }}>This page could not be found.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 sm:text-base" style={{ color: "var(--charcoal)" }}>
          The page may have moved, the link may be outdated, or the route may not exist in this environment.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => router.back()} className="btn-outline">
            <ArrowLeft size={15} /> Go back
          </button>
          <Link href={fallbackHref} className="btn-primary">
            <Home size={15} /> Go home
          </Link>
        </div>

        <p className="mt-6 text-xs" style={{ color: "var(--mute)" }}>
          Redirecting to {isSignedIn ? "dashboard" : "home"} in {secondsLeft}s...
        </p>
      </div>
    </div>
  );
}
