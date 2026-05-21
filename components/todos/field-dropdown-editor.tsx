"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { SheetCoord, TodoCustomField } from "@/components/todos/sheet-types";

function summarize(fields: TodoCustomField[]) {
  if (fields.length === 0) return "No fields";
  if (fields.length === 1) return `${fields[0].key}: ${fields[0].value}`;
  return `${fields[0].key}: ${fields[0].value} +${fields.length - 1}`;
}

export function FieldDropdownEditor({
  cellKey,
  coord,
  fields,
  active,
  selected,
  onSave,
  onActivate,
  onNavigate,
  onPasteMatrix,
}: {
  cellKey: string;
  coord: SheetCoord;
  fields: TodoCustomField[];
  active?: boolean;
  selected?: boolean;
  onSave: (fields: TodoCustomField[]) => Promise<void>;
  onActivate: (coord: SheetCoord, extend: boolean) => void;
  onNavigate: (coord: SheetCoord, direction: "left" | "right" | "up" | "down", extend: boolean) => void;
  onPasteMatrix: (coord: SheetCoord, matrix: string[][]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TodoCustomField[]>(fields.length ? fields : [{ key: "", value: "" }]);

  return (
    <div className="relative min-w-[160px]">
      <button
        data-sheet-cell={cellKey}
        onClick={() => {
          onActivate(coord, false);
          setDraft(fields.length ? fields : [{ key: "", value: "" }]);
          setOpen((value) => !value);
        }}
        onFocus={() => onActivate(coord, false)}
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
        }}
        className="w-full rounded px-2 py-1 text-left text-sm hover:bg-[var(--surface-elevated)]"
        style={{
          color: fields.length ? "var(--ink)" : "var(--mute)",
          backgroundColor: active ? "rgba(59,130,246,0.16)" : selected ? "rgba(59,130,246,0.08)" : "transparent",
          boxShadow: active ? "inset 0 0 0 1px var(--accent-blue)" : undefined,
        }}
      >
        {summarize(fields)}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[320px] rounded-xl border p-3 shadow-xl" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--hairline-strong)" }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Card fields</div>
            <button onClick={() => setOpen(false)} className="text-xs" style={{ color: "var(--mute)" }}>Close</button>
          </div>

          <div className="space-y-2">
            {draft.map((field, index) => (
              <div key={`${index}:${field.key}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  value={field.key}
                  onChange={(event) => {
                    const next = [...draft];
                    next[index] = { ...next[index], key: event.target.value };
                    setDraft(next);
                  }}
                  placeholder="Key"
                  className="input-field h-9"
                />
                <input
                  value={field.value}
                  onChange={(event) => {
                    const next = [...draft];
                    next[index] = { ...next[index], value: event.target.value };
                    setDraft(next);
                  }}
                  placeholder="Value"
                  className="input-field h-9"
                />
                <button
                  onClick={() => setDraft((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-[var(--surface-elevated)]"
                  style={{ color: "var(--stone)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              onClick={() => setDraft((current) => [...current, { key: "", value: "" }])}
              className="btn-outline text-xs"
            >
              <Plus size={12} /> + Add Field
            </button>
            <button
              onClick={() => {
                const cleaned = draft
                  .map((field) => ({ key: field.key.trim(), value: field.value.trim() }))
                  .filter((field) => field.key || field.value);
                void onSave(cleaned).then(() => setOpen(false));
              }}
              className="btn-primary text-xs"
            >
              Save fields
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
