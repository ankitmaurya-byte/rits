"use client";

import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemedSelect({
  className,
  icon,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3" style={{ color: "var(--mute)" }}>
          {icon}
        </div>
      ) : null}
      <select
        {...props}
        className={cn(
          "input-field appearance-none rounded-xl border bg-[var(--surface-card)] pr-10 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors focus:border-[var(--ink)]",
          icon ? "pl-10" : "pl-4",
          className
        )}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" style={{ color: "var(--mute)" }}>
        <ChevronDown size={14} />
      </div>
    </div>
  );
}
