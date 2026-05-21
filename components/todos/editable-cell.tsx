"use client";

import { useState } from "react";

import type { SheetCoord } from "@/components/todos/sheet-types";

export function EditableCell({
  cellKey,
  coord,
  value,
  placeholder,
  active,
  selected,
  onCommit,
  onActivate,
  onNavigate,
  onPasteMatrix,
}: {
  cellKey: string;
  coord: SheetCoord;
  value: string;
  placeholder?: string;
  active?: boolean;
  selected?: boolean;
  onCommit: (value: string) => Promise<void>;
  onActivate: (coord: SheetCoord, extend: boolean) => void;
  onNavigate: (coord: SheetCoord, direction: "left" | "right" | "up" | "down", extend: boolean) => void;
  onPasteMatrix: (coord: SheetCoord, matrix: string[][]) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <input
      key={value}
      data-sheet-cell={cellKey}
      defaultValue={value}
      placeholder={placeholder}
      onFocus={() => onActivate(coord, false)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft === value) return;
        void onCommit(draft.trim());
      }}
      onPaste={(event) => {
        const text = event.clipboardData.getData("text/plain");
        if (!text.includes("\t") && !text.includes("\n")) {
          return;
        }
        event.preventDefault();
        const matrix = text
          .replace(/\r/g, "")
          .split("\n")
          .filter((row) => row.length > 0)
          .map((row) => row.split("\t"));
        void onPasteMatrix(coord, matrix);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onNavigate(coord, "left", event.shiftKey);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onNavigate(coord, "right", event.shiftKey);
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          onNavigate(coord, "up", event.shiftKey);
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          onNavigate(coord, "down", event.shiftKey);
        }
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
          onNavigate(coord, "down", event.shiftKey);
        }
        if (event.key === "Tab") {
          event.preventDefault();
          event.currentTarget.blur();
          onNavigate(coord, event.shiftKey ? "left" : "right", false);
        }
      }}
      className="w-full min-w-[140px] rounded-sm bg-transparent px-1 py-0.5 text-sm outline-none"
      style={{
        color: "var(--ink)",
        backgroundColor: active ? "rgba(59,130,246,0.16)" : selected ? "rgba(59,130,246,0.08)" : "transparent",
        boxShadow: active ? "inset 0 0 0 1px var(--accent-blue)" : undefined,
      }}
    />
  );
}
