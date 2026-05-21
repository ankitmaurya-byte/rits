"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function SheetStatusSection({
  label,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
}: {
  label: string;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  return (
    <th colSpan={3} className="border-b px-4 py-3 text-center text-sm font-semibold" style={{ borderColor: "var(--hairline-strong)", color: "var(--ink)", backgroundColor: "var(--surface-elevated)" }}>
      <div className="flex items-center justify-center gap-2">
        <button disabled={!canMoveLeft} onClick={onMoveLeft} className="rounded p-1 disabled:opacity-30" style={{ color: "var(--mute)" }}>
          <ChevronLeft size={14} />
        </button>
        <span>{label}</span>
        <button disabled={!canMoveRight} onClick={onMoveRight} className="rounded p-1 disabled:opacity-30" style={{ color: "var(--mute)" }}>
          <ChevronRight size={14} />
        </button>
      </div>
    </th>
  );
}
