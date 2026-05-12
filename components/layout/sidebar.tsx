"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  CheckSquare,
  FileText,
  Zap,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ideas",     label: "Ideas",     icon: Lightbulb       },
  { href: "/todos",     label: "Todos",     icon: CheckSquare     },
  { href: "/notes",     label: "Notes",     icon: FileText        },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col h-full border-r"
      style={{ 
        width: "240px", 
        flexShrink: 0, 
        backgroundColor: "var(--canvas)",
        borderColor: "var(--hairline-strong)"
      }}
      aria-label="Sidebar navigation"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-[64px] border-b" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex items-center justify-center w-6 h-6 rounded-sm bg-white">
          <Zap size={14} className="text-black" strokeWidth={2.5} />
        </div>
        <span className="font-medium text-sm text-white tracking-tight">
          Rits
        </span>
      </div>

      {/* Navigation section */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <p className="px-3 mb-3 text-xs font-medium uppercase tracking-widest" style={{ color: "var(--mute)" }}>
          Workspace
        </p>
        
        <nav className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group relative"
                style={{
                  color: isActive ? "var(--ink)" : "var(--charcoal)",
                  backgroundColor: isActive ? "var(--surface-elevated)" : "transparent"
                }}
              >
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.75}
                  className="flex-shrink-0 transition-colors"
                  style={{ color: isActive ? "var(--ink)" : "var(--charcoal)" }}
                />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area */}
      <div className="p-4 border-t" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-md border" style={{ backgroundColor: "var(--surface-deep)", borderColor: "var(--hairline-strong)" }}>
           <div className="status-dot status-green" />
           <span className="text-xs font-medium" style={{ color: "var(--body)" }}>System Operational</span>
        </div>
      </div>
    </aside>
  );
}