"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Workspace", href: "#workspace" },
  { label: "AI", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
];

const PARTICLES = [
  { id: 0, x: 8, y: 12, size: 1.8, duration: 9, delay: 0.2, opacity: 0.18 },
  { id: 1, x: 16, y: 72, size: 1.2, duration: 11, delay: 1.1, opacity: 0.16 },
  { id: 2, x: 24, y: 34, size: 2.2, duration: 10, delay: 2.2, opacity: 0.2 },
  { id: 3, x: 32, y: 58, size: 1.4, duration: 12, delay: 0.8, opacity: 0.14 },
  { id: 4, x: 41, y: 18, size: 1.6, duration: 8, delay: 1.7, opacity: 0.18 },
  { id: 5, x: 48, y: 80, size: 2.1, duration: 13, delay: 2.6, opacity: 0.22 },
  { id: 6, x: 55, y: 44, size: 1.1, duration: 10, delay: 0.5, opacity: 0.12 },
  { id: 7, x: 62, y: 24, size: 1.9, duration: 9, delay: 1.3, opacity: 0.19 },
  { id: 8, x: 68, y: 66, size: 1.3, duration: 14, delay: 2.9, opacity: 0.15 },
  { id: 9, x: 74, y: 10, size: 2.4, duration: 11, delay: 1.9, opacity: 0.2 },
  { id: 10, x: 81, y: 52, size: 1.5, duration: 8, delay: 0.4, opacity: 0.12 },
  { id: 11, x: 88, y: 30, size: 1.8, duration: 12, delay: 2.1, opacity: 0.18 },
  { id: 12, x: 93, y: 76, size: 1.1, duration: 10, delay: 0.9, opacity: 0.13 },
  { id: 13, x: 12, y: 90, size: 1.7, duration: 13, delay: 2.4, opacity: 0.17 },
  { id: 14, x: 28, y: 6, size: 2, duration: 9, delay: 1.5, opacity: 0.21 },
  { id: 15, x: 36, y: 86, size: 1.2, duration: 11, delay: 0.7, opacity: 0.11 },
  { id: 16, x: 46, y: 60, size: 1.5, duration: 12, delay: 2.7, opacity: 0.14 },
  { id: 17, x: 58, y: 8, size: 2.1, duration: 8, delay: 1.6, opacity: 0.2 },
  { id: 18, x: 66, y: 92, size: 1.3, duration: 13, delay: 2.8, opacity: 0.16 },
  { id: 19, x: 78, y: 40, size: 1.9, duration: 9, delay: 0.3, opacity: 0.18 },
  { id: 20, x: 84, y: 62, size: 1.4, duration: 10, delay: 1.8, opacity: 0.12 },
  { id: 21, x: 6, y: 48, size: 2.3, duration: 14, delay: 2.5, opacity: 0.19 },
  { id: 22, x: 52, y: 28, size: 1.2, duration: 11, delay: 0.6, opacity: 0.14 },
  { id: 23, x: 96, y: 18, size: 1.6, duration: 12, delay: 1.2, opacity: 0.17 },
];

/* ─── Floating Orb SVG ─── */
function FloatingOrb({ cx, cy, r, color, delay, duration }: { cx: number; cy: number; r: number; color: string; delay: number; duration: number }) {
  return (
    <circle
      cx={cx} cy={cy} r={r} fill={color} opacity={0.18}
      style={{ animation: `floatOrb ${duration}s ease-in-out ${delay}s infinite alternate` }}
    />
  );
}

/* ─── Grid Background SVG ─── */
function GridSVG() {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.035 }}>
      <defs>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

/* ─── Hero Constellation SVG ─── */
function ConstellationSVG() {
  const nodes = [
    { x: 120, y: 80 }, { x: 300, y: 40 }, { x: 480, y: 120 },
    { x: 600, y: 60 }, { x: 700, y: 160 }, { x: 200, y: 200 },
    { x: 420, y: 220 }, { x: 560, y: 240 }, { x: 80, y: 260 },
  ];
  const edges = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[2,6],[1,5],[4,7]];
  return (
    <svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", opacity: 0.22 }}>
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"
          strokeDasharray="4 4"
          style={{ animation: `dashFlow 4s linear ${i * 0.3}s infinite` }} />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={i % 3 === 0 ? 3 : 1.5}
          fill="white" opacity={i % 3 === 0 ? 0.9 : 0.5}
          style={{ animation: `pulse 3s ease-in-out ${i * 0.4}s infinite alternate` }} />
      ))}
    </svg>
  );
}

function OrbitalNetwork() {
  return (
    <svg viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 520 }}>
      <defs>
        <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="260" cy="260" r="180" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" />
      <circle cx="260" cy="260" r="120" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" strokeDasharray="6 10" />
      <circle cx="260" cy="260" r="58" fill="url(#orbGlow)" />
      <circle cx="260" cy="260" r="10" fill="#fcfdff" opacity="0.95" />
      <path d="M260 80 L160 180 L260 260 L372 190 L438 258" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" strokeDasharray="5 8" />
      <path d="M120 320 L210 282 L260 260 L314 326 L402 372" stroke="rgba(255,255,255,0.14)" strokeWidth="1" fill="none" strokeDasharray="4 10" />
      <FloatingOrb cx={260} cy={80} r={10} color="#ffc53d" delay={0} duration={5} />
      <FloatingOrb cx={160} cy={180} r={8} color="#11ff99" delay={0.8} duration={6.5} />
      <FloatingOrb cx={372} cy={190} r={9} color="#3b9eff" delay={1.2} duration={7} />
      <FloatingOrb cx={438} cy={258} r={7} color="#ff801f" delay={0.4} duration={5.8} />
      <FloatingOrb cx={120} cy={320} r={8} color="#a78bfa" delay={1.7} duration={6.8} />
      <FloatingOrb cx={402} cy={372} r={9} color="#ff2047" delay={0.6} duration={7.2} />
      <FloatingOrb cx={314} cy={326} r={6} color="#fcfdff" delay={1.4} duration={5.4} />
    </svg>
  );
}

/* ─── Feature Card SVG Icons ─── */
function IdeaIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="14" r="7" stroke="#ffc53d" strokeWidth="1.5" fill="none" />
      <path d="M13 21h6M14 24h4" stroke="#ffc53d" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 7V5M9.5 9.5l-1.5-1.5M22.5 9.5l1.5-1.5" stroke="#ffc53d" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="14" r="2" fill="#ffc53d" opacity="0.4" />
    </svg>
  );
}

function TodoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="24" height="20" rx="3" stroke="#11ff99" strokeWidth="1.5" fill="none" />
      <path d="M9 13l3 3 7-7" stroke="#11ff99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9" y1="20" x2="23" y2="20" stroke="#11ff99" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
      <line x1="9" y1="23" x2="18" y2="23" stroke="#11ff99" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="4" width="18" height="24" rx="2" stroke="#3b9eff" strokeWidth="1.5" fill="none" />
      <rect x="9" y="4" width="14" height="24" rx="2" stroke="#3b9eff" strokeWidth="1" fill="#06060a" />
      <line x1="12" y1="11" x2="20" y2="11" stroke="#3b9eff" strokeWidth="1" strokeLinecap="round" />
      <line x1="12" y1="15" x2="20" y2="15" stroke="#3b9eff" strokeWidth="1" strokeLinecap="round" />
      <line x1="12" y1="19" x2="17" y2="19" stroke="#3b9eff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function AIIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4z" stroke="#ff801f" strokeWidth="1.5" fill="none" />
      <path d="M11 14l3 3 7-7" stroke="#ff801f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
      <circle cx="16" cy="16" r="3" fill="#ff801f" opacity="0.3" />
      <path d="M16 10v2M16 20v2M10 16h2M20 16h2" stroke="#ff801f" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12.1 12.1l1.4 1.4M18.5 18.5l1.4 1.4M18.5 12.1l-1.4 1.4M12.1 18.5l1.4 1.4" stroke="#ff801f" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="10" r="4" stroke="#a78bfa" strokeWidth="1.5" fill="none" />
      <circle cx="7" cy="24" r="3" stroke="#a78bfa" strokeWidth="1.5" fill="none" />
      <circle cx="25" cy="24" r="3" stroke="#a78bfa" strokeWidth="1.5" fill="none" />
      <line x1="16" y1="14" x2="7" y2="21" stroke="#a78bfa" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
      <line x1="16" y1="14" x2="25" y2="21" stroke="#a78bfa" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
      <line x1="10" y1="24" x2="22" y2="24" stroke="#a78bfa" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
    </svg>
  );
}

function ResourceIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 16a10 10 0 1020 0A10 10 0 006 16z" stroke="#ff2047" strokeWidth="1.5" fill="none" />
      <path d="M6 16h20M16 6c-3 4-3 12 0 20M16 6c3 4 3 12 0 20" stroke="#ff2047" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/* ─── Animated number counter ─── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = target / 60;
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Scroll reveal hook ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ─── Reveal wrapper ─── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

/* ─── Floating particles ─── */
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          borderRadius: "50%",
          background: "white",
          opacity: p.opacity,
          animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
        }} />
      ))}
    </div>
  );
}

/* ─── Workflow SVG ─── */
function WorkflowDiagram() {
  return (
    <svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 640 }}>
      {/* connecting lines */}
      <line x1="120" y1="100" x2="200" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="280" y1="100" x2="360" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="440" y1="100" x2="520" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />

      {/* node 1  Capture */}
      <rect x="20" y="70" width="100" height="60" rx="8" fill="#0a0a0c" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      <text x="70" y="96" textAnchor="middle" fontSize="10" fill="#ffc53d" fontFamily="monospace">●</text>
      <text x="70" y="112" textAnchor="middle" fontSize="11" fill="rgba(252,253,255,0.7)" fontFamily="monospace">Capture</text>

      {/* node 2  Organize */}
      <rect x="200" y="70" width="100" height="60" rx="8" fill="#0a0a0c" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      <text x="250" y="96" textAnchor="middle" fontSize="10" fill="#11ff99" fontFamily="monospace">◆</text>
      <text x="250" y="112" textAnchor="middle" fontSize="11" fill="rgba(252,253,255,0.7)" fontFamily="monospace">Organize</text>

      {/* node 3  Collaborate */}
      <rect x="360" y="70" width="100" height="60" rx="8" fill="#0a0a0c" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      <text x="410" y="96" textAnchor="middle" fontSize="10" fill="#3b9eff" fontFamily="monospace">▲</text>
      <text x="410" y="112" textAnchor="middle" fontSize="11" fill="rgba(252,253,255,0.7)" fontFamily="monospace">Collaborate</text>

      {/* node 4  Ship */}
      <rect x="520" y="70" width="100" height="60" rx="8" fill="#101012" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
      <text x="570" y="96" textAnchor="middle" fontSize="10" fill="#ff801f" fontFamily="monospace">★</text>
      <text x="570" y="112" textAnchor="middle" fontSize="11" fill="#fcfdff" fontFamily="monospace">Ship</text>

      {/* animated dot along lines */}
      <circle r="3" fill="#ff801f" opacity="0.9">
        <animateMotion dur="3s" repeatCount="indefinite" path="M 120 100 L 200 100 M 280 100 L 360 100 M 440 100 L 520 100" />
      </circle>
    </svg>
  );
}

/* ─── Stats bar SVG ─── */
function StatsBar({ label, value, color, pct }: { label: string; value: string; color: string; pct: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(252,253,255,0.5)", fontFamily: "monospace" }}>
        <span>{label}</span><span style={{ color }}>{value}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99,
          animation: "growBar 1.2s ease-out forwards", transformOrigin: "left" }} />
      </div>
    </div>
  );
}

const features = [
  {
    icon: <IdeaIcon />,
    title: "Idea Capture",
    desc: "Never lose a thought. Tag, describe, and link ideas with rich text and AI-assisted writing.",
    color: "#ffc53d",
    glow: "rgba(255,197,61,0.12)",
  },
  {
    icon: <TodoIcon />,
    title: "Smart Todos",
    desc: "Kanban boards with priority levels, drag-and-drop lanes, and workspace collaboration.",
    color: "#11ff99",
    glow: "rgba(17,255,153,0.12)",
  },
  {
    icon: <NoteIcon />,
    title: "Rich Notes",
    desc: "TipTap-powered editor with headings, code blocks, task lists, and live sync.",
    color: "#3b9eff",
    glow: "rgba(59,158,255,0.12)",
  },
  {
    icon: <AIIcon />,
    title: "Rits AI",
    desc: "Contextual AI that reads your entire workspace and helps you write, reason, and ship faster.",
    color: "#ff801f",
    glow: "rgba(255,128,31,0.12)",
  },
  {
    icon: <WorkspaceIcon />,
    title: "Team Workspace",
    desc: "Shared boards, ideas, and notes with real-time collaboration for your founding team.",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.12)",
  },
  {
    icon: <ResourceIcon />,
    title: "Resource Hub",
    desc: "Save URLs, docs, and links with context. Never lose a useful reference again.",
    color: "#ff2047",
    glow: "rgba(255,32,71,0.12)",
  },
];

const stats = [
  { label: "Ideas captured", value: "12K+", target: 12, suffix: "K+", color: "#ffc53d", pct: 85 },
  { label: "Tasks completed", value: "48K+", target: 48, suffix: "K+", color: "#11ff99", pct: 92 },
  { label: "AI conversations", value: "8K+", target: 8, suffix: "K+", color: "#3b9eff", pct: 60 },
  { label: "Teams onboarded", value: "340+", target: 340, suffix: "+", color: "#ff801f", pct: 70 },
];

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isLoaded && isSignedIn) router.push("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: "#000000", color: "#fcfdff", overflowX: "hidden" }}>

      {/* ── Global keyframes injected via style tag ── */}
      <style>{`
        @keyframes floatOrb {
          from { transform: translateY(0px) scale(1); }
          to { transform: translateY(-24px) scale(1.06); }
        }
        @keyframes floatParticle {
          from { transform: translate(0,0); opacity: 0.05; }
          to { transform: translate(12px, -20px); opacity: 0.25; }
        }
        @keyframes dashFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -24; }
        }
        @keyframes pulse {
          from { opacity: 0.4; transform: scale(1); }
          to { opacity: 1; transform: scale(1.5); }
        }
        @keyframes growBar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes borderGlow {
          0%,100% { border-color: rgba(255,255,255,0.08); }
          50% { border-color: rgba(255,255,255,0.22); }
        }
        .hero-word {
          display: inline-block;
          animation: fadeInUp 0.8s ease both;
        }
        .hero-word:nth-child(1) { animation-delay: 0.1s; }
        .hero-word:nth-child(2) { animation-delay: 0.22s; }
        .hero-word:nth-child(3) { animation-delay: 0.34s; }
        .hero-word:nth-child(4) { animation-delay: 0.46s; }
        .hero-word:nth-child(5) { animation-delay: 0.58s; }
        .feature-card:hover {
          border-color: rgba(255,255,255,0.22) !important;
          transform: translateY(-2px);
        }
        .feature-card { transition: border-color 0.3s ease, transform 0.3s ease; }
        .btn-primary-rits {
          background: #fcfdff;
          color: #000000;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-primary-rits:hover { background: #e8edf5; }
        .btn-outline-rits {
          background: transparent;
          color: #fcfdff;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .btn-outline-rits:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.04); }
      `}</style>

      {/* ── Mouse-tracking glow ── */}
      <div aria-hidden style={{
        position: "fixed", top: 0, left: 0, pointerEvents: "none", zIndex: 0,
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,158,255,0.05) 0%, transparent 70%)",
        transform: `translate(${mousePos.x - 300}px, ${mousePos.y - 300}px)`,
        transition: "transform 0.15s ease",
      }} />

      {/* ── Background grid ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <GridSVG />
      </div>

      {/* ── Atmospheric glows ── */}
      <div aria-hidden style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 1200, height: 600, background: "radial-gradient(ellipse at top, rgba(255,255,255,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "fixed", bottom: "-20%", right: "-10%", width: 800, height: 800, background: "radial-gradient(ellipse at bottom right, rgba(255,89,0,0.12) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "fixed", top: "30%", left: "-10%", width: 600, height: 600, background: "radial-gradient(ellipse, rgba(0,117,255,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Floating particles ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <Particles />
      </div>

      {/* ─────────── NAV ─────────── */}
      <nav className="relative z-10 flex h-[64px] items-center justify-between px-5 sm:px-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.6)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white">
            <Image
              src="/rits_brand_logo_assets/rits_only_logo_transparent_background_text_dark.png"
              alt="Rits"
              width={36}
              height={36}
              className="scale-[1.55] object-contain"
              priority
            />
          </div>
          <Image
            src="/rits_brand_logo_assets/rits_name_only_complete_transpaent_background_withou_dot_com_text_white.png"
            alt="Rits"
            width={64}
            height={20}
            className="hidden object-contain sm:block"
            priority
          />
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)" }} />
          <span style={{ fontSize: 10, color: "rgba(252,253,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace" }}>
            alpha
          </span>
        </div>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} style={{ fontSize: 13, color: "rgba(252,253,255,0.55)", fontFamily: "monospace", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fcfdff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(252,253,255,0.55)")}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <SignInButton mode="modal">
            <button className="btn-outline-rits" style={{ padding: "6px 14px" }}>Sign in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="btn-primary-rits" style={{ padding: "6px 14px" }}>Get Started</button>
          </SignUpButton>
        </div>
      </nav>

      {/* ─────────── HERO ─────────── */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-20  text-center  ">

        {/* Constellation */}
        <div className="relative flex w-full max-w-[900px] justify-center" style={{ marginBottom: 24, animation: "fadeInUp 0.8s ease 0.1s both" }}>
          <div style={{ width: "100%", maxWidth: 800, opacity: 0.6 }}>
            <ConstellationSVG />
          </div>

          {/* Hero headline */}
          <h1 className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-4" style={{ fontSize: "clamp(52px, 9vw, 96px)", fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.04em", color: "#fcfdff", maxWidth: 900, margin: "0 auto", fontFamily: "monospace", textShadow: "0 10px 40px rgba(0,0,0,0.45)" }}>
            <span className="hero-word">Research&nbsp;</span>
            <span className="hero-word">in&nbsp;</span>
            <span className="hero-word">tech&nbsp;</span>
            <span className="hero-word" style={{ color: "rgba(252,253,255,0.35)" }}>startup</span>
          </h1>
        </div>

        <p style={{ animation: "fadeInUp 0.8s ease 0.6s both", maxWidth: 560, fontSize: 18, lineHeight: 1.6, color: "rgba(252,253,255,0.55)", marginBottom: 48, fontFamily: "monospace" }}>
          Ideas, todos, and notes — all in one beautifully unified workspace.
          Built for startup teams moving fast.
        </p>

        {/* CTAs */}
        <div style={{ animation: "fadeInUp 0.8s ease 0.75s both", display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 80 }}>
          <SignUpButton mode="modal">
            <button className="btn-primary-rits" style={{ height: 48, padding: "0 28px", fontSize: 15 }}>
              Get started free
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="btn-outline-rits" style={{ height: 48, padding: "0 28px", fontSize: 15 }}>
              Sign in
            </button>
          </SignInButton>
        </div>

        {/* Workflow diagram */}
        <div className="grid w-full max-w-6xl items-center gap-10 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:pt-12">
          <div style={{ animation: "fadeInUp 0.8s ease 0.9s both", width: "100%" }}>
            <WorkflowDiagram />
          </div>
          <div style={{ animation: "fadeInUp 0.8s ease 1.05s both" }}>
            <div className="mx-auto max-w-[420px] rounded-[28px] border border-white/10 bg-[#06060a] p-6 text-left">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">Operating layer</p>
              <h3 className="mt-3 text-2xl font-normal tracking-tight text-white" style={{ fontFamily: "monospace" }}>
                Structured chaos for founding teams.
              </h3>
              <p className="mt-4 text-[13px] leading-7 text-white/45" style={{ fontFamily: "monospace" }}>
                From raw thoughts to shippable work, Rits keeps every thread in one place and gives AI enough context to be useful instead of generic.
              </p>
              <div className="mt-6">
                <OrbitalNetwork />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── STATS BAND ─────────── */}
      <section className="relative z-10 py-16 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              {stats.map((s) => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 400, fontFamily: "monospace", color: s.color, lineHeight: 1 }}>
                    <Counter target={s.target} suffix={s.suffix} />
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(252,253,255,0.4)", fontFamily: "monospace" }}>{s.label}</div>
                  <StatsBar label="" value="" color={s.color} pct={s.pct} />
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── FEATURES GRID ─────────── */}
      <section id="features" className="relative z-10 py-24 px-8">
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(252,253,255,0.3)", fontFamily: "monospace", marginBottom: 16 }}>Everything you need</p>
              <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em", fontFamily: "monospace", color: "#fcfdff" }}>
                One workspace.<br />Every tool.
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="feature-card" style={{
                  background: "#0a0a0c",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 32,
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* card glow */}
                  <div style={{ position: "absolute", top: 0, right: 0, width: 160, height: 160, background: `radial-gradient(circle at top right, ${f.glow} 0%, transparent 70%)`, pointerEvents: "none" }} />

                  <div style={{ marginBottom: 20 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 500, color: "#fcfdff", fontFamily: "monospace", marginBottom: 10 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(252,253,255,0.45)", fontFamily: "monospace" }}>{f.desc}</p>

                  {/* bottom accent line */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)` }} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── AI SECTION ─────────── */}
      <section id="ai" className="relative z-10 py-24 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto grid max-w-[1080px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,128,31,0.7)", fontFamily: "monospace", marginBottom: 16 }}>Rits AI</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em", fontFamily: "monospace", color: "#fcfdff", marginBottom: 24 }}>
              Your AI layer that reads the whole workspace
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(252,253,255,0.5)", fontFamily: "monospace", marginBottom: 32 }}>
              Rits AI doesn't just generate text  it reads your ideas, todos, and notes to give contextual, workspace-aware answers. Ask it to reason across your entire startup context.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["Contextual writing assistant inside notes & ideas", "Full-conversation chat with workspace memory", "Private + shared workspace scope modes"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(252,253,255,0.6)", fontFamily: "monospace" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#ff801f" strokeWidth="1" />
                    <path d="M4 7l2.5 2.5L10 4.5" stroke="#ff801f" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={200}>
            {/* AI Chat preview card */}
            <div style={{ background: "#06060a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, overflow: "hidden" }}>
              {/* window chrome */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0a0a0c" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff2047" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffc53d" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#11ff99" }} />
                <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(252,253,255,0.3)", fontFamily: "monospace" }}>Rits AI · workspace context</span>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, minHeight: 220 }}>
                {/* user message */}
                <div style={{ alignSelf: "flex-end", background: "#101012", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px 12px 2px 12px", padding: "8px 14px", fontSize: 12, color: "rgba(252,253,255,0.7)", fontFamily: "monospace", maxWidth: "80%" }}>
                  What are my top-priority todos this week?
                </div>
                {/* AI response */}
                <div style={{ alignSelf: "flex-start", background: "#0a0a0c", border: "1px solid rgba(255,128,31,0.2)", borderRadius: "12px 12px 12px 2px", padding: "10px 14px", fontSize: 12, color: "rgba(252,253,255,0.6)", fontFamily: "monospace", maxWidth: "90%", lineHeight: 1.7 }}>
                  <span style={{ color: "#ff801f" }}>Rits AI</span> · Based on your workspace:<br />
                  <span style={{ color: "#11ff99" }}>①</span> Ship landing page <span style={{ color: "#ff2047", fontSize: 10 }}>high</span><br />
                  <span style={{ color: "#11ff99" }}>②</span> Set up Convex auth <span style={{ color: "#ffc53d", fontSize: 10 }}>medium</span><br />
                  <span style={{ color: "#11ff99" }}>③</span> Investor deck draft <span style={{ color: "#ff2047", fontSize: 10 }}>high</span>
                </div>
                {/* typing indicator */}
                <div style={{ alignSelf: "flex-start", display: "flex", gap: 4, padding: "10px 14px" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,128,31,0.5)", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite alternate` }} />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── FLOATING SHAPES BAND ─────────── */}
      <section id="workspace" className="relative z-10 py-24 overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* floating geometric SVGs */}
        <svg style={{ position: "absolute", top: "10%", left: "5%", opacity: 0.06, animation: "spinSlow 30s linear infinite" }} width="120" height="120" viewBox="0 0 120 120">
          <polygon points="60,10 110,90 10,90" fill="none" stroke="white" strokeWidth="1" />
          <polygon points="60,25 95,85 25,85" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
        <svg style={{ position: "absolute", top: "20%", right: "8%", opacity: 0.06, animation: "spinSlow 20s linear infinite reverse" }} width="80" height="80" viewBox="0 0 80 80">
          <rect x="10" y="10" width="60" height="60" fill="none" stroke="white" strokeWidth="1" transform="rotate(15 40 40)" />
          <rect x="20" y="20" width="40" height="40" fill="none" stroke="white" strokeWidth="0.5" transform="rotate(30 40 40)" />
        </svg>
        <svg style={{ position: "absolute", bottom: "15%", left: "15%", opacity: 0.05, animation: "floatOrb 8s ease-in-out infinite alternate" }} width="60" height="60" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="25" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="30" cy="30" r="15" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>

        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
          <Reveal>
            <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(252,253,255,0.3)", fontFamily: "monospace", marginBottom: 16 }}>The stack</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em", fontFamily: "monospace", color: "#fcfdff", marginBottom: 48 }}>
              Built on what moves fast
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              {[
                { name: "Next.js", color: "#fcfdff" },
                { name: "Convex", color: "#11ff99" },
                { name: "Clerk", color: "#3b9eff" },
                { name: "TipTap", color: "#ffc53d" },
                { name: "Tailwind", color: "#38bdf8" },
                { name: "xAI / Grok", color: "#ff801f" },
                { name: "TypeScript", color: "#a78bfa" },
                { name: "Radix UI", color: "#fcfdff" },
              ].map(t => (
                <span key={t.name} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#0a0a0c", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 9999, padding: "5px 14px",
                  fontSize: 12, fontFamily: "monospace", color: "rgba(252,253,255,0.55)",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = t.color; (e.currentTarget as HTMLElement).style.borderColor = `${t.color}40`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(252,253,255,0.55)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.color, display: "inline-block" }} />
                  {t.name}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={180} className="mt-14">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] border border-white/10 bg-[#0a0a0c] p-6 text-left">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/35" style={{ fontFamily: "monospace" }}>Workspace memory</p>
                <h3 className="mt-3 text-2xl font-normal text-white" style={{ fontFamily: "monospace" }}>
                  Shared context, not scattered tabs.
                </h3>
                <p className="mt-4 max-w-2xl text-[13px] leading-7 text-white/45" style={{ fontFamily: "monospace" }}>
                  Private work stays private. Team work becomes legible. Every idea, todo, note, and resource can live in the right scope without losing velocity.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Private", "Founder notes, personal ideas, deep work drafts"],
                    ["Workspace", "Shared boards, group lanes, and collaborative notes"],
                    ["AI-ready", "Context assembled across both scopes when needed"],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-sm text-white" style={{ fontFamily: "monospace" }}>{title}</p>
                      <p className="mt-2 text-[12px] leading-6 text-white/40" style={{ fontFamily: "monospace" }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-[#06060a] p-6 text-left">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/35" style={{ fontFamily: "monospace" }}>Signal</p>
                <div className="mt-4 flex flex-col gap-4">
                  {[
                    ["Notes", "Knowledge stays searchable and structured", "#3b9eff"],
                    ["Todos", "Execution turns into visible momentum", "#11ff99"],
                    ["Ideas", "Exploration accumulates instead of disappearing", "#ffc53d"],
                  ].map(([label, text, color]) => (
                    <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white" style={{ fontFamily: "monospace" }}>{label}</p>
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color as string }} />
                      </div>
                      <p className="mt-2 text-[12px] leading-6 text-white/40" style={{ fontFamily: "monospace" }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── CTA BAND ─────────── */}
      <section id="pricing" className="relative z-10 py-32 px-8 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* large glow behind CTA */}
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(59,158,255,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Reveal>
          <h2 style={{ fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.04em", fontFamily: "monospace", color: "#fcfdff", marginBottom: 24 }}>
            Start building<br />
            <span style={{ color: "rgba(252,253,255,0.3)" }}>your startup OS.</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(252,253,255,0.4)", fontFamily: "monospace", marginBottom: 40 }}>
            Free to start. No credit card required.
          </p>
          <SignUpButton mode="modal">
            <button className="btn-primary-rits" style={{ height: 52, padding: "0 36px", fontSize: 16 }}>
              Create your workspace
            </button>
          </SignUpButton>
        </Reveal>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="relative z-10 py-12 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Image
              src="/rits_brand_logo_assets/rits_name_only_complete_transpaent_background_withou_dot_com_text_white.png"
              alt="Rits"
              width={40}
              height={16}
              className="object-contain opacity-50"
            />
            <span style={{ fontSize: 11, color: "rgba(252,253,255,0.2)", fontFamily: "monospace" }}>© 2025 · Research in tech startup</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { label: "Privacy", href: "#pricing" },
              { label: "Terms", href: "#pricing" },
              { label: "Feedback", href: "/feedback" },
            ].map((link) => (
              <a key={link.label} href={link.href} style={{ fontSize: 12, color: "rgba(252,253,255,0.3)", fontFamily: "monospace", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(252,253,255,0.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(252,253,255,0.3)")}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
