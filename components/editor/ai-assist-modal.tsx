"use client";

import { useRef, useState } from "react";
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Loader2,
  Replace,
  Plus,
  X,
  Sparkles,
  ClipboardPaste,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Suggested prompts
// ---------------------------------------------------------------------------

const SUGGESTIONS = {
  note: [
    "Summarise this note in 3 bullet points",
    "Expand this into a detailed outline",
    "Improve the clarity and flow",
    "Rewrite in a more professional tone",
    "Extract key action items",
    "Add a TL;DR at the top",
  ],
  idea: [
    "Write a compelling description for this idea",
    "Identify potential challenges",
    "Break this down into implementation steps",
    "Write a problem statement",
    "List the key benefits",
    "Suggest a go-to-market approach",
  ],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AiAssistModalProps {
  open: boolean;
  onClose: () => void;
  /** Current HTML content of the editor  used as context */
  contextHtml: string;
  contextType: "note" | "idea";
  /** Called when user clicks Insert (appends to editor) */
  onAppend: (html: string) => void;
  /** Called when user clicks Replace (replaces entire editor content) */
  onReplace: (html: string) => void;
}

// ---------------------------------------------------------------------------
// Convert markdown-ish plain text → basic HTML for TipTap
// ---------------------------------------------------------------------------

function textToHtml(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let inList = false;
  let inOl = false;

  const flushList = () => {
    if (inList) { result.push("</ul>"); inList = false; }
    if (inOl) { result.push("</ol>"); inOl = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Heading 1
    if (/^# /.test(line)) {
      flushList();
      result.push(`<h1>${escHtml(line.slice(2).trim())}</h1>`);
      continue;
    }
    // Heading 2
    if (/^## /.test(line)) {
      flushList();
      result.push(`<h2>${escHtml(line.slice(3).trim())}</h2>`);
      continue;
    }
    // Heading 3
    if (/^### /.test(line)) {
      flushList();
      result.push(`<h3>${escHtml(line.slice(4).trim())}</h3>`);
      continue;
    }
    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      if (inList) { result.push("</ul>"); inList = false; }
      if (!inOl) { result.push("<ol>"); inOl = true; }
      result.push(`<li>${inlineFormat(line.replace(/^\d+\.\s/, ""))}</li>`);
      continue;
    }
    // Bullet list
    if (/^[-*•]\s/.test(line)) {
      if (inOl) { result.push("</ol>"); inOl = false; }
      if (!inList) { result.push("<ul>"); inList = true; }
      result.push(`<li>${inlineFormat(line.slice(2).trim())}</li>`);
      continue;
    }
    // Blockquote
    if (/^> /.test(line)) {
      flushList();
      result.push(`<blockquote><p>${inlineFormat(line.slice(2).trim())}</p></blockquote>`);
      continue;
    }
    // Horizontal rule
    if (/^---+$/.test(line)) {
      flushList();
      result.push("<hr>");
      continue;
    }
    // Empty line
    if (!line.trim()) {
      flushList();
      continue;
    }
    // Normal paragraph
    flushList();
    result.push(`<p>${inlineFormat(line.trim())}</p>`);
  }

  flushList();
  return result.join("");
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineFormat(text: string) {
  // Bold+italic, bold, italic, code, inline links
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiAssistModal({
  open,
  onClose,
  contextHtml,
  contextType,
  onAppend,
  onReplace,
}: AiAssistModalProps) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!open) return null;

  const suggestions = SUGGESTIONS[contextType];

  const plainContext = contextHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const handleGenerate = async (overridePrompt?: string) => {
    const p = (overridePrompt ?? prompt).trim();
    if (!p) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, context: contextHtml, contextType }),
      });
      const data = (await res.json()) as { result?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "AI assist failed.");
      setResult(data.result ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get AI response.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppend = () => {
    if (!result) return;
    onAppend(textToHtml(result));
    onClose();
  };

  const handleReplace = () => {
    if (!result) return;
    onReplace(textToHtml(result));
    onClose();
  };

  const handleClose = () => {
    setPrompt("");
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Modal */}
      <div
        className="relative flex w-full max-w-2xl flex-col rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: "var(--surface-card)",
          borderColor: "var(--hairline-strong)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--hairline-strong)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border"
              style={{
                borderColor: "var(--hairline-strong)",
                backgroundColor: "var(--surface-elevated)",
                color: "var(--ink)",
              }}
            >
              <BrainCircuit size={14} />
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: "var(--ink)" }}>
                AI Writing Assistant
              </p>
              <p className="text-[11px]" style={{ color: "var(--mute)" }}>
                {contextType === "idea" ? "Idea" : "Note"} context loaded
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
            style={{ color: "var(--mute)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--mute)")}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 gap-4">
          {/* Context preview */}
          {plainContext && (
            <div
              className="rounded-xl border"
              style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)" }}
            >
              <button
                type="button"
                onClick={() => setShowContext((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em]"
                style={{ color: "var(--mute)" }}
              >
                <span>Current {contextType} content (context)</span>
                {showContext ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showContext && (
                <div
                  className="border-t px-4 py-3 text-[12px] leading-6 line-clamp-6"
                  style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }}
                >
                  {plainContext.slice(0, 600)}{plainContext.length > 600 ? "…" : ""}
                </div>
              )}
            </div>
          )}

          {/* Suggestions */}
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--mute)" }}>
              Quick prompts
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setPrompt(s);
                    void handleGenerate(s);
                  }}
                  className="rounded-full border px-3 py-1 text-[12px] transition-colors"
                  style={{
                    borderColor: "var(--hairline-strong)",
                    backgroundColor: "var(--surface-elevated)",
                    color: "var(--charcoal)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--hairline-strong)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--charcoal)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div
            className="flex items-end gap-3 rounded-xl border px-4 py-3"
            style={{
              borderColor: "var(--hairline-strong)",
              backgroundColor: "var(--surface-elevated)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleGenerate();
                }
              }}
              placeholder={`What should the AI do with this ${contextType}? (Enter to generate)`}
              rows={1}
              className="flex-1 resize-none border-0 bg-transparent text-[13.5px] leading-6 shadow-none outline-none"
              style={{ color: "var(--ink)", minHeight: "24px", maxHeight: "120px" }}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading || !prompt.trim()}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-opacity disabled:opacity-30"
              style={{ backgroundColor: "var(--ink)", color: "var(--canvas)" }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl border px-4 py-3 text-[13px]"
              style={{
                borderColor: "rgba(239,68,68,0.3)",
                backgroundColor: "rgba(239,68,68,0.08)",
                color: "var(--accent-red, #ef4444)",
              }}
            >
              {error}
            </div>
          )}

          {/* Result */}
          {loading && !result && (
            <div
              className="flex items-center gap-3 rounded-xl border px-4 py-4 text-[13px]"
              style={{ borderColor: "var(--hairline-strong)", color: "var(--charcoal)" }}
            >
              <Loader2 size={14} className="animate-spin shrink-0" style={{ color: "var(--mute)" }} />
              Generating response…
            </div>
          )}

          {result && (
            <div
              className="rounded-xl border"
              style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)" }}
            >
              <div
                className="border-b px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em]"
                style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}
              >
                AI response  choose what to do with it
              </div>
              <div
                className="max-h-64 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-[13.5px] leading-7"
                style={{ color: "var(--body)" }}
              >
                {result}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {result && (
          <div
            className="flex shrink-0 items-center justify-end gap-3 border-t px-5 py-4"
            style={{ borderColor: "var(--hairline-strong)" }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border px-4 py-2 text-[13px] transition-colors"
              style={{ borderColor: "var(--hairline-strong)", color: "var(--charcoal)" }}
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleAppend}
              className="flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors"
              style={{
                borderColor: "var(--hairline-strong)",
                backgroundColor: "var(--surface-elevated)",
                color: "var(--ink)",
              }}
            >
              <Plus size={13} />
              Append
            </button>
            <button
              type="button"
              onClick={handleReplace}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--ink)", color: "var(--canvas)" }}
            >
              <Replace size={13} />
              Replace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trigger button  drop this wherever you need it outside the editor
// ---------------------------------------------------------------------------

export function AiAssistButton({
  onClick,
  label = "AI",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors"
      style={{
        borderColor: "var(--hairline-strong)",
        backgroundColor: "var(--surface-elevated)",
        color: "var(--charcoal)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--hairline-strong)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--charcoal)";
      }}
    >
      <BrainCircuit size={11} />
      {label}
    </button>
  );
}
