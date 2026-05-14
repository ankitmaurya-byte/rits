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


/* ─── Full-page warp grid ─── */
function WarpGrid({ mousePos }: { mousePos: { x: number; y: number } }) {
  const x = `${mousePos.x}px`;
  const y = `${mousePos.y}px`;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.14,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          backgroundPosition: "center center",
        }}
      />
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out"
        style={{
          opacity: 0.3,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          backgroundPosition: `${mousePos.x * -0.05}px ${mousePos.y * -0.05}px`,
          maskImage: `radial-gradient(circle 180px at ${x} ${y}, rgba(0,0,0,1) 0%, rgba(0,0,0,0.84) 35%, rgba(0,0,0,0) 72%)`,
          WebkitMaskImage: `radial-gradient(circle 180px at ${x} ${y}, rgba(0,0,0,1) 0%, rgba(0,0,0,0.84) 35%, rgba(0,0,0,0) 72%)`,
          transform: `perspective(1000px) translate(${(mousePos.x - 720) * 0.008}px, ${(mousePos.y - 400) * 0.008}px) scale(1.04)`,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          left: mousePos.x - 170,
          top: mousePos.y - 170,
          width: 340,
          height: 340,
          background: "radial-gradient(circle, rgba(59,158,255,0.08) 0%, rgba(59,158,255,0.03) 36%, transparent 72%)",
          filter: "blur(18px)",
          transition: "left 120ms ease-out, top 120ms ease-out",
        }}
      />
    </div>
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

/* ─── Research diagram SVG ─── */
function WorkflowDiagram() {
  return (
    <svg viewBox="0 0 820 420" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="panelStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
        </linearGradient>
        <linearGradient id="panelFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.005)" />
        </linearGradient>
        <linearGradient id="signalLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b9eff" />
          <stop offset="50%" stopColor="#ffc53d" />
          <stop offset="100%" stopColor="#ff801f" />
        </linearGradient>
        <linearGradient id="scanBand" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <rect x="24" y="28" width="772" height="364" rx="18" fill="#06060a" stroke="url(#panelStroke)" strokeWidth="1" />
      <rect x="24" y="28" width="772" height="364" rx="18" fill="url(#panelFill)" />

      <g opacity="0.7">
        <line x1="56" y1="92" x2="764" y2="92" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="56" y1="156" x2="764" y2="156" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="56" y1="220" x2="764" y2="220" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="56" y1="284" x2="764" y2="284" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="56" y1="348" x2="764" y2="348" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      </g>

      <g>
        <rect x="58" y="54" width="184" height="300" rx="14" fill="#0a0a0c" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <text x="80" y="78" fontSize="9" fill="rgba(252,253,255,0.34)" fontFamily="monospace">INPUT SET</text>
        <text x="80" y="102" fontSize="15" fill="#fcfdff" fontFamily="monospace">Interviews</text>
        <text x="80" y="121" fontSize="10" fill="rgba(252,253,255,0.58)" fontFamily="monospace">transcripts</text>
        <text x="80" y="168" fontSize="15" fill="#11ff99" fontFamily="monospace">Documents</text>
        <text x="80" y="187" fontSize="10" fill="rgba(252,253,255,0.58)" fontFamily="monospace">briefs + reports</text>
        <text x="80" y="234" fontSize="15" fill="#3b9eff" fontFamily="monospace">Signals</text>
        <text x="80" y="253" fontSize="10" fill="rgba(252,253,255,0.58)" fontFamily="monospace">sources + evidence</text>
        <text x="80" y="300" fontSize="15" fill="#ff801f" fontFamily="monospace">Patterns</text>
        <text x="80" y="319" fontSize="10" fill="rgba(252,253,255,0.58)" fontFamily="monospace">emerging themes</text>
      </g>

      <g>
        <rect x="304" y="64" width="208" height="252" rx="14" fill="#09090b" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
        <rect x="320" y="80" width="208" height="252" rx="14" fill="#0a0a0c" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <text x="348" y="102" fontSize="9" fill="rgba(252,253,255,0.34)" fontFamily="monospace">ANALYSIS SURFACE</text>
        <rect x="348" y="124" width="156" height="190" rx="12" fill="#06060a" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <rect x="348" y="150" width="156" height="18" rx="9" fill="rgba(255,255,255,0.02)" />
        <rect x="348" y="184" width="156" height="18" rx="9" fill="rgba(255,255,255,0.02)" />
        <rect x="348" y="218" width="156" height="18" rx="9" fill="rgba(255,255,255,0.02)" />
        <rect x="348" y="252" width="156" height="18" rx="9" fill="rgba(255,255,255,0.02)" />
        <path d="M358 286 C382 236, 402 184, 434 188 S470 136, 486 154" fill="none" stroke="url(#signalLine)" strokeWidth="2.4" strokeLinecap="round">
          <animate attributeName="d" dur="7s" repeatCount="indefinite" values="M326 250 C350 216, 370 174, 402 178 S438 126, 454 144;M326 242 C352 206, 374 182, 404 170 S438 136, 454 152;M326 250 C350 216, 370 174, 402 178 S438 126, 454 144" />
        </path>
        <rect x="348" y="132" width="156" height="20" rx="10" fill="url(#scanBand)" opacity="0.65">
          <animate attributeName="y" dur="5.8s" values="132;286;132" repeatCount="indefinite" />
        </rect>
        <circle cx="382" cy="214" r="4" fill="#3b9eff" />
        <circle cx="424" cy="180" r="4" fill="#ffc53d" />
        <circle cx="466" cy="150" r="4" fill="#ff801f" />
        <circle cx="382" cy="214" r="11" fill="#3b9eff" opacity="0.12" filter="url(#softBlur)" />
        <circle cx="424" cy="180" r="11" fill="#ffc53d" opacity="0.12" filter="url(#softBlur)" />
        <circle cx="466" cy="150" r="11" fill="#ff801f" opacity="0.12" filter="url(#softBlur)" />
        <g>
          <line x1="382" y1="214" x2="320" y2="198" stroke="rgba(59,158,255,0.35)" strokeWidth="1" strokeDasharray="3 4" />
          <line x1="424" y1="180" x2="542" y2="174" stroke="rgba(255,197,61,0.35)" strokeWidth="1" strokeDasharray="3 4" />
          <line x1="466" y1="150" x2="544" y2="122" stroke="rgba(255,128,31,0.35)" strokeWidth="1" strokeDasharray="3 4" />
          <rect x="276" y="186" width="48" height="16" rx="8" fill="#0a0a0c" stroke="rgba(59,158,255,0.18)" strokeWidth="1" />
          <text x="300" y="197" textAnchor="middle" fontSize="8" fill="#3b9eff" fontFamily="monospace">theme</text>
          <rect x="542" y="166" width="66" height="16" rx="8" fill="#0a0a0c" stroke="rgba(255,197,61,0.18)" strokeWidth="1" />
          <text x="575" y="177" textAnchor="middle" fontSize="8" fill="#ffc53d" fontFamily="monospace">evidence</text>
          <rect x="544" y="114" width="68" height="16" rx="8" fill="#0a0a0c" stroke="rgba(255,128,31,0.18)" strokeWidth="1" />
          <text x="578" y="125" textAnchor="middle" fontSize="8" fill="#ff801f" fontFamily="monospace">insight</text>
        </g>
      </g>

      <g>
        <rect x="620" y="58" width="136" height="128" rx="14" fill="#0a0a0c" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <text x="640" y="82" fontSize="9" fill="rgba(252,253,255,0.34)" fontFamily="monospace">DELIVERABLE</text>
        <text x="640" y="110" fontSize="16" fill="#fcfdff" fontFamily="monospace">Memo</text>
        <text x="640" y="131" fontSize="10" fill="rgba(252,253,255,0.58)" fontFamily="monospace">evidence-backed</text>
      </g>

      <g>
        <rect x="620" y="214" width="136" height="128" rx="14" fill="#0a0a0c" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <text x="640" y="238" fontSize="9" fill="rgba(252,253,255,0.34)" fontFamily="monospace">TRUST</text>
        <text x="640" y="266" fontSize="16" fill="#fcfdff" fontFamily="monospace">Traceable</text>
        <text x="640" y="287" fontSize="10" fill="rgba(252,253,255,0.58)" fontFamily="monospace">source-linked</text>
      </g>

      <line x1="242" y1="176" x2="320" y2="176" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" strokeDasharray="5 7" />
      <line x1="504" y1="130" x2="620" y2="112" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" strokeDasharray="5 7" />
      <line x1="504" y1="248" x2="620" y2="268" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" strokeDasharray="5 7" />

      <circle r="3.5" fill="#fcfdff" opacity="0.9">
        <animateMotion dur="6.5s" repeatCount="indefinite" path="M 242 176 L 320 176 L 422 176 L 504 130 L 620 112" />
      </circle>
      <circle r="3" fill="#ffc53d" opacity="0.9">
        <animateMotion dur="7.8s" repeatCount="indefinite" path="M 242 176 L 320 176 L 422 176 L 504 248 L 620 268" />
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
    title: "Research Intake",
    desc: "Capture briefs, hypotheses, market signals, and client questions in one place.",
    color: "#ffc53d",
    glow: "rgba(255,197,61,0.12)",
  },
  {
    icon: <TodoIcon />,
    title: "Analysis Workflow",
    desc: "Structure research tasks, review queues, and analyst follow-ups with clear status lanes.",
    color: "#11ff99",
    glow: "rgba(17,255,153,0.12)",
  },
  {
    icon: <NoteIcon />,
    title: "Research Notes",
    desc: "Build layered notes, interview summaries, findings, and internal memos with rich editing.",
    color: "#3b9eff",
    glow: "rgba(59,158,255,0.12)",
  },
  {
    icon: <AIIcon />,
    title: "Rits AI",
    desc: "Contextual AI that reads your research base and helps summarize, compare, and surface patterns.",
    color: "#ff801f",
    glow: "rgba(255,128,31,0.12)",
  },
  {
    icon: <WorkspaceIcon />,
    title: "Consultant Workspace",
    desc: "Give researchers and consultants a shared operating layer clients can trust and teams can navigate.",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.12)",
  },
  {
    icon: <ResourceIcon />,
    title: "Evidence Library",
    desc: "Save sources, documents, links, and references with enough context to support final recommendations.",
    color: "#ff2047",
    glow: "rgba(255,32,71,0.12)",
  },
];

const stats = [
  { label: "Research briefs", value: "12K+", target: 12, suffix: "K+", color: "#ffc53d", pct: 85 },
  { label: "Analyses completed", value: "48K+", target: 48, suffix: "K+", color: "#11ff99", pct: 92 },
  { label: "AI queries", value: "8K+", target: 8, suffix: "K+", color: "#3b9eff", pct: 60 },
  { label: "Consulting teams", value: "340+", target: 340, suffix: "+", color: "#ff801f", pct: 70 },
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

      {/* ── Background warp grid ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <WarpGrid mousePos={mousePos} />
      </div>

      {/* ── Atmospheric glows ── */}
      <div aria-hidden style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 1200, height: 600, background: "radial-gradient(ellipse at top, rgba(255,255,255,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "fixed", bottom: "-20%", right: "-10%", width: 800, height: 800, background: "radial-gradient(ellipse at bottom right, rgba(255,89,0,0.08) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "fixed", top: "30%", left: "-10%", width: 600, height: 600, background: "radial-gradient(ellipse, rgba(0,117,255,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

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
      <section className="relative z-10 flex flex-col items-center px-6 pt-20 text-center">

        <div className="relative w-full max-w-[980px]" style={{ marginBottom: 24, animation: "fadeInUp 0.8s ease 0.1s both" }}>
          <div className="absolute inset-x-[8%] top-1/2 h-40 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(59,158,255,0.025) 34%, transparent 74%)", filter: "blur(18px)" }} />
          <h1 className="relative px-4" style={{ fontSize: "clamp(52px, 9vw, 96px)", fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.04em", color: "#fcfdff", maxWidth: 900, margin: "0 auto", fontFamily: "monospace", textShadow: "0 10px 40px rgba(0,0,0,0.45)" }}>
            <span className="hero-word">Research&nbsp;</span>
            <span className="hero-word">in&nbsp;</span>
            <span className="hero-word">tech&nbsp;</span>
            <span className="hero-word" style={{ color: "rgba(252,253,255,0.35)" }}>startup</span>
          </h1>
        </div>

        <p style={{ animation: "fadeInUp 0.8s ease 0.6s both", maxWidth: 620, fontSize: 18, lineHeight: 1.6, color: "rgba(252,253,255,0.55)", marginBottom: 48, fontFamily: "monospace" }}>
          Research briefs, analysis systems, consultant-grade notes, and AI-assisted evaluation in one operating layer.
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
        <div className="relative aspect-[12/7] w-full max-w-[1180px] pt-8 lg:pt-12" style={{ animation: "fadeInUp 0.8s ease 0.9s both" }}>
          <WorkflowDiagram />
      
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
              <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(252,253,255,0.3)", fontFamily: "monospace", marginBottom: 16 }}>Research tools</p>
              <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em", fontFamily: "monospace", color: "#fcfdff" }}>
                One system.<br />Every research tool.
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
                Your AI layer that reads the full research record
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(252,253,255,0.5)", fontFamily: "monospace", marginBottom: 32 }}>
              Rits AI does not stop at drafting. It reads briefs, notes, findings, and sources to help consultants compare evidence, summarize patterns, and prepare recommendations.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["Contextual writing inside research notes", "Conversation memory across projects and sources", "Private analyst space plus shared client-facing work"].map((item, i) => (
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
                <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(252,253,255,0.3)", fontFamily: "monospace" }}>Rits AI · research context</span>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, minHeight: 220 }}>
                {/* user message */}
                <div style={{ alignSelf: "flex-end", background: "#101012", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px 12px 2px 12px", padding: "8px 14px", fontSize: 12, color: "rgba(252,253,255,0.7)", fontFamily: "monospace", maxWidth: "80%" }}>
                  What themes are repeating across these interview notes?
                </div>
                {/* AI response */}
                <div style={{ alignSelf: "flex-start", background: "#0a0a0c", border: "1px solid rgba(255,128,31,0.2)", borderRadius: "12px 12px 12px 2px", padding: "10px 14px", fontSize: 12, color: "rgba(252,253,255,0.6)", fontFamily: "monospace", maxWidth: "90%", lineHeight: 1.7 }}>
                  <span style={{ color: "#ff801f" }}>Rits AI</span> · Based on your research set:<br />
                  <span style={{ color: "#11ff99" }}>①</span> Pricing clarity is the strongest recurring pain point<br />
                  <span style={{ color: "#11ff99" }}>②</span> Buyers trust peer referrals more than landing page claims<br />
                  <span style={{ color: "#11ff99" }}>③</span> Enterprise prospects want implementation support before purchase
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
            <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(252,253,255,0.3)", fontFamily: "monospace", marginBottom: 16 }}>Method and infrastructure</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em", fontFamily: "monospace", color: "#fcfdff", marginBottom: 48 }}>
              Built for trusted research delivery
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
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/35" style={{ fontFamily: "monospace" }}>Consulting structure</p>
                <h3 className="mt-3 text-2xl font-normal text-white" style={{ fontFamily: "monospace" }}>
                  Shared context, clear evidence, and visible reasoning.
                </h3>
                <p className="mt-4 max-w-2xl text-[13px] leading-7 text-white/45" style={{ fontFamily: "monospace" }}>
                  Analysts keep working notes private when needed, research teams share structured findings, and client-ready recommendations can be assembled from the same source base.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Private", "Draft interpretations, raw notes, and internal analyst thinking"],
                    ["Shared", "Team-visible findings, project lanes, and collaborative review"],
                    ["Advisory", "Evidence assembled into decision-ready recommendations"],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-sm text-white" style={{ fontFamily: "monospace" }}>{title}</p>
                      <p className="mt-2 text-[12px] leading-6 text-white/40" style={{ fontFamily: "monospace" }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-[#06060a] p-6 text-left">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/35" style={{ fontFamily: "monospace" }}>Trust signals</p>
                <div className="mt-4 flex flex-col gap-4">
                  {[
                    ["Traceability", "Every recommendation can point back to notes and sources", "#3b9eff"],
                    ["Consistency", "Research process becomes repeatable across engagements", "#11ff99"],
                    ["Clarity", "Clients see conclusions with stronger narrative support", "#ffc53d"],
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
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(59,158,255,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Reveal>
          <h2 style={{ fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.04em", fontFamily: "monospace", color: "#fcfdff", marginBottom: 24 }}>
            Start building<br />
            <span style={{ color: "rgba(252,253,255,0.3)" }}>your research operating layer.</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(252,253,255,0.4)", fontFamily: "monospace", marginBottom: 40 }}>
            For consultants, research teams, and serious analysis workflows.
          </p>
          <SignUpButton mode="modal">
            <button className="btn-primary-rits" style={{ height: 52, padding: "0 36px", fontSize: 16 }}>
              Start your research workspace
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
