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
      className="flex flex-col h-full bg-[#0b1a2e] text-[#cbd5e1] border-r border-[#1e293b]"
      style={{ width: "240px", flexShrink: 0 }}
      aria-label="Sidebar navigation"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1e293b]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#635bff] shadow-[0_0_15px_rgba(99,91,255,0.4)]">
          <Zap size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-base text-white tracking-tight">
          Rits
        </span>
      </div>

      {/* Navigation section */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <p className="px-3 mb-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
          Workspace
        </p>
        
        <nav className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group relative overflow-hidden
                  ${isActive 
                    ? "bg-[#1e293b] text-white" 
                    : "text-[#94a3b8] hover:bg-[#1e293b]/50 hover:text-white"
                  }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#635bff] rounded-r-full" />
                )}
                
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.75}
                  className={`flex-shrink-0 transition-colors ${isActive ? "text-[#635bff]" : "text-[#64748b] group-hover:text-white"}`}
                />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area */}
      <div className="p-4 border-t border-[#1e293b]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-[#0f172a] border border-[#1e293b]">
           <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
           <span className="text-xs font-medium text-[#94a3b8]">System Online</span>
        </div>
      </div>
    </aside>
  );
}