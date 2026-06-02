"use client";

import { useState, useCallback, useEffect, createContext, useContext, useRef, type DragEvent } from "react";
import { FileText, GitBranch, Tag, Calendar, ChevronDown, ChevronRight, Settings2, X, Plus, PlusCircle, Trash2, List, ListOrdered, Quote, Code2, GripVertical, ArrowUp, ArrowDown, Pencil, Sparkles, MessageSquare, Check, RemoveFormatting, Heading2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// ─── Settings & Themes ───────────────────────────────────────────────────────

interface LevelStyle { accent: string; bg: string; headerBg: string; textColor: string; label: string; }
interface ThemeConfig {
  name: string; swatch: string;
  rootBg: string; tabBg: string; tabBorder: string;
  bodyText: string; mutedText: string; faintBorder: string;
  sourceBg: string; sourceText: string;
  levels: LevelStyle[];
}

const THEMES: ThemeConfig[] = [
  {
    name: "Solarized Dark", swatch: "#002b36",
    rootBg: "#002b36", tabBg: "#073642", tabBorder: "#586e7544",
    bodyText: "#839496", mutedText: "#586e75", faintBorder: "#586e7544",
    sourceBg: "#002b36", sourceText: "#839496",
    levels: [
      { accent: "#268bd2", bg: "#073642", headerBg: "#0a3f50", textColor: "#eee8d5", label: "H1" },
      { accent: "#2aa198", bg: "#073642", headerBg: "#0b3d3a", textColor: "#eee8d5", label: "H2" },
      { accent: "#859900", bg: "#073642", headerBg: "#1a2e00", textColor: "#93a1a1", label: "H3" },
      { accent: "#b58900", bg: "#073642", headerBg: "#2e2200", textColor: "#93a1a1", label: "H4" },
      { accent: "#cb4b16", bg: "#073642", headerBg: "#2e1200", textColor: "#93a1a1", label: "H5" },
      { accent: "#6c71c4", bg: "#073642", headerBg: "#1a1b3a", textColor: "#93a1a1", label: "H6" },
    ],
  },
  {
    name: "Solarized Light", swatch: "#fdf6e3",
    rootBg: "#fdf6e3", tabBg: "#eee8d5", tabBorder: "#93a1a133",
    bodyText: "#657b83", mutedText: "#93a1a1", faintBorder: "#93a1a133",
    sourceBg: "#fdf6e3", sourceText: "#586e75",
    levels: [
      { accent: "#268bd2", bg: "#eee8d5", headerBg: "#d4e8f5", textColor: "#073642", label: "H1" },
      { accent: "#2aa198", bg: "#eee8d5", headerBg: "#d3eeec", textColor: "#073642", label: "H2" },
      { accent: "#859900", bg: "#eee8d5", headerBg: "#e4edcc", textColor: "#073642", label: "H3" },
      { accent: "#b58900", bg: "#eee8d5", headerBg: "#f0e4b0", textColor: "#073642", label: "H4" },
      { accent: "#cb4b16", bg: "#eee8d5", headerBg: "#f5ddd0", textColor: "#073642", label: "H5" },
      { accent: "#6c71c4", bg: "#eee8d5", headerBg: "#dddff5", textColor: "#073642", label: "H6" },
    ],
  },
  {
    name: "Nord", swatch: "#2e3440",
    rootBg: "#2e3440", tabBg: "#3b4252", tabBorder: "#4c566a55",
    bodyText: "#d8dee9", mutedText: "#4c566a", faintBorder: "#4c566a55",
    sourceBg: "#2e3440", sourceText: "#d8dee9",
    levels: [
      { accent: "#88c0d0", bg: "#3b4252", headerBg: "#3a4a55", textColor: "#eceff4", label: "H1" },
      { accent: "#81a1c1", bg: "#3b4252", headerBg: "#384555", textColor: "#eceff4", label: "H2" },
      { accent: "#a3be8c", bg: "#3b4252", headerBg: "#3d4a3a", textColor: "#d8dee9", label: "H3" },
      { accent: "#ebcb8b", bg: "#3b4252", headerBg: "#4a4535", textColor: "#d8dee9", label: "H4" },
      { accent: "#bf616a", bg: "#3b4252", headerBg: "#4a3638", textColor: "#d8dee9", label: "H5" },
      { accent: "#b48ead", bg: "#3b4252", headerBg: "#443d4a", textColor: "#d8dee9", label: "H6" },
    ],
  },
  {
    name: "Dracula", swatch: "#282a36",
    rootBg: "#282a36", tabBg: "#343746", tabBorder: "#6272a455",
    bodyText: "#f8f8f2", mutedText: "#6272a4", faintBorder: "#6272a455",
    sourceBg: "#282a36", sourceText: "#f8f8f2",
    levels: [
      { accent: "#8be9fd", bg: "#343746", headerBg: "#2f4050", textColor: "#f8f8f2", label: "H1" },
      { accent: "#50fa7b", bg: "#343746", headerBg: "#2a3f30", textColor: "#f8f8f2", label: "H2" },
      { accent: "#ffb86c", bg: "#343746", headerBg: "#3f3525", textColor: "#f8f8f2", label: "H3" },
      { accent: "#ff79c6", bg: "#343746", headerBg: "#3f2535", textColor: "#f8f8f2", label: "H4" },
      { accent: "#bd93f9", bg: "#343746", headerBg: "#352a45", textColor: "#f8f8f2", label: "H5" },
      { accent: "#ff5555", bg: "#343746", headerBg: "#3f2525", textColor: "#f8f8f2", label: "H6" },
    ],
  },
  {
    name: "Monokai", swatch: "#272822",
    rootBg: "#272822", tabBg: "#3e3d32", tabBorder: "#75715e55",
    bodyText: "#f8f8f2", mutedText: "#75715e", faintBorder: "#75715e55",
    sourceBg: "#272822", sourceText: "#f8f8f2",
    levels: [
      { accent: "#66d9e8", bg: "#3e3d32", headerBg: "#2a3a40", textColor: "#f8f8f2", label: "H1" },
      { accent: "#a6e22e", bg: "#3e3d32", headerBg: "#303820", textColor: "#f8f8f2", label: "H2" },
      { accent: "#e6db74", bg: "#3e3d32", headerBg: "#3e3a20", textColor: "#f8f8f2", label: "H3" },
      { accent: "#fd971f", bg: "#3e3d32", headerBg: "#3e3020", textColor: "#f8f8f2", label: "H4" },
      { accent: "#f92672", bg: "#3e3d32", headerBg: "#3e2230", textColor: "#f8f8f2", label: "H5" },
      { accent: "#ae81ff", bg: "#3e3d32", headerBg: "#302040", textColor: "#f8f8f2", label: "H6" },
    ],
  },
  {
    name: "Clean Light", swatch: "#ffffff",
    rootBg: "#f6f8fa", tabBg: "#ffffff", tabBorder: "#d0d7de",
    bodyText: "#24292f", mutedText: "#8c959f", faintBorder: "#d0d7de",
    sourceBg: "#ffffff", sourceText: "#24292f",
    levels: [
      { accent: "#0969da", bg: "#f6f8fa", headerBg: "#dbeafe", textColor: "#0c1b33", label: "H1" },
      { accent: "#1a7f37", bg: "#f6f8fa", headerBg: "#dcfce7", textColor: "#0c1b33", label: "H2" },
      { accent: "#9a6700", bg: "#f6f8fa", headerBg: "#fef9c3", textColor: "#0c1b33", label: "H3" },
      { accent: "#8250df", bg: "#f6f8fa", headerBg: "#f3e8ff", textColor: "#0c1b33", label: "H4" },
      { accent: "#cf222e", bg: "#f6f8fa", headerBg: "#fee2e2", textColor: "#0c1b33", label: "H5" },
      { accent: "#bc4c00", bg: "#f6f8fa", headerBg: "#ffedd5", textColor: "#0c1b33", label: "H6" },
    ],
  },
];

interface HierarchySettings { theme: ThemeConfig; textSize: number; fontFamily: string; }
export type HierarchyThemeName = "Solarized Dark" | "Solarized Light" | "Nord" | "Dracula" | "Monokai" | "Clean Light";
export type HierarchyTextSize = 11 | 12 | 13 | 15;
export type HierarchyFontFamily = "monospace" | "sans-serif" | "Georgia, serif";
export type HierarchyEditorSettingsValue = { themeName: HierarchyThemeName; textSize: HierarchyTextSize; fontFamily: HierarchyFontFamily };
const defaultSettings: HierarchySettings = { theme: THEMES[0], textSize: 12, fontFamily: "monospace" };
const SettingsCtx = createContext<HierarchySettings>(defaultSettings);
const HISTORY_LIMIT = 100;
const VALID_TEXT_SIZES = new Set<HierarchyTextSize>([11, 12, 13, 15]);
const VALID_FONT_FAMILIES = new Set<HierarchyFontFamily>(["monospace", "sans-serif", "Georgia, serif"]);

function settingsFromValue(value?: HierarchyEditorSettingsValue | null): HierarchySettings {
  const theme = THEMES.find((item) => item.name === value?.themeName) ?? defaultSettings.theme;
  const textSize = value && VALID_TEXT_SIZES.has(value.textSize) ? value.textSize : defaultSettings.textSize;
  const fontFamily = value && VALID_FONT_FAMILIES.has(value.fontFamily) ? value.fontFamily : defaultSettings.fontFamily;
  return { theme, textSize, fontFamily };
}

function settingsToValue(settings: HierarchySettings): HierarchyEditorSettingsValue {
  return {
    themeName: settings.theme.name as HierarchyThemeName,
    textSize: settings.textSize as HierarchyTextSize,
    fontFamily: settings.fontFamily as HierarchyFontFamily,
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  level: number; // 1=# 2=## 3=### …
  title: string;
  content: string[];
  children: Section[];
  anchorLineIndex?: number | null;
}

type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "blockquote"; text: string; variant: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; lang: string; lines: string[] }
  | { type: "spacer" };

type SectionDropIntent = "before" | "after" | "inside";
type LineTransformType = "text" | "bullet" | "numbered" | "quote" | "code";
type LineDropTarget = { sectionId: string; lineIndex: number; intent: "before" | "after" };
type LineMenuState = { sectionId: string; lineIndex: number } | null;

// ─── Frontmatter ─────────────────────────────────────────────────────────────

function parseFrontmatter(text: string): { fm: Record<string, unknown> | null; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: null, body: text };
  const raw = m[1];
  const body = m[2];
  const fm: Record<string, unknown> = {};
  let lastKey = "";
  for (const line of raw.split("\n")) {
    const list = line.match(/^  - (.+)$/);
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (list && lastKey) {
      const prev = fm[lastKey];
      fm[lastKey] = Array.isArray(prev) ? [...prev, list[1]] : [list[1]];
    } else if (kv) {
      lastKey = kv[1];
      if (kv[2]) fm[lastKey] = kv[2].replace(/^["']|["']$/g, "");
    }
  }
  return { fm, body };
}

// ─── Markdown → Section tree ──────────────────────────────────────────────────

function parseMarkdownTree(body: string): Section[] {
  const lines = body.split("\n");
  const flat: { level: number; title: string; content: string[]; anchorLineIndex?: number | null }[] = [];
  let cur: typeof flat[0] | null = null;
  let pendingAnchorLine: number | null = null;

  for (const line of lines) {
    const anchor = line.match(/^<!--\s*rits:child-after=(-?\d+)\s*-->$/);
    if (anchor) {
      pendingAnchorLine = Number(anchor[1]);
      continue;
    }

    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      if (cur) flat.push(cur);
      cur = { level: hm[1].length, title: hm[2].trim(), content: [], anchorLineIndex: pendingAnchorLine };
      pendingAnchorLine = null;
    } else if (cur) {
      if (line.trim() || cur.content.length > 0) cur.content.push(line);
    }
  }
  if (cur) flat.push(cur);

  // Build tree
  const root: Section[] = [];
  const stack: { s: Section; level: number }[] = [];
  for (const f of flat) {
    const s: Section = { id: Math.random().toString(36).slice(2), level: f.level, title: f.title, content: f.content, children: [], anchorLineIndex: f.anchorLineIndex ?? null };
    while (stack.length && stack[stack.length - 1].level >= f.level) stack.pop();
    if (!stack.length) root.push(s);
    else stack[stack.length - 1].s.children.push(s);
    stack.push({ s, level: f.level });
  }
  return root;
}

// ─── Content block parser ─────────────────────────────────────────────────────

function parseBlocks(lines: string[]): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let i = 0;

  const push = (b: ContentBlock) => {
    if (b.type === "spacer" && blocks.length && blocks[blocks.length - 1].type === "spacer") return;
    blocks.push(b);
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { push({ type: "spacer" }); i++; continue; }

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      i++;
      push({ type: "code", lang, lines: codeLines });
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const inner = line.slice(2);
      const am = inner.match(/^\[!(\w+)\]/i);
      let variant = "quote";
      let text = inner;
      if (am) {
        variant = am[1].toLowerCase();
        i++;
        text = lines[i] ? lines[i].replace(/^> /, "") : "";
      }
      push({ type: "blockquote", text, variant });
      i++;
      continue;
    }

    // List
    if (/^[-*+] /.test(line) || /^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && (/^[-*+] /.test(lines[i]) || /^\d+\.\s/.test(lines[i]))) {
        items.push(lines[i].replace(/^[-*+] /, "").replace(/^\d+\.\s+/, ""));
        i++;
      }
      push({ type: "list", items });
      continue;
    }

    // Table
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) { tableLines.push(lines[i]); i++; }
      const parseRow = (r: string) => r.split("|").slice(1, -1).map((c) => c.trim());
      const nonSep = tableLines.filter((l) => !/^\|[-| :]+\|$/.test(l));
      if (nonSep.length) {
        push({ type: "table", headers: parseRow(nonSep[0]), rows: nonSep.slice(1).map(parseRow) });
      }
      continue;
    }

    push({ type: "paragraph", text: line });
    i++;
  }
  return blocks;
}

// ─── Content renderer ─────────────────────────────────────────────────────────

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenPattern = /(\*\*[^*]+?\*\*|__[^_]+?__|~~[^~]+?~~|`[^`]+?`|\[[^\]]+\]\([^)]+\)|\*[^*]+?\*|_[^_]+?_)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2).trim()}</strong>);
    } else if (token.startsWith("__") && token.endsWith("__")) {
      nodes.push(<strong key={key}>{token.slice(2, -2).trim()}</strong>);
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      nodes.push(<span key={key} style={{ textDecoration: "line-through" }}>{token.slice(2, -2).trim()}</span>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(<code key={key} className="px-1 py-0.5 text-[0.92em]" style={{ background: "rgba(127,127,127,0.16)" }}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const close = token.indexOf("](");
      const label = token.slice(1, close);
      const href = token.slice(close + 2, -1);
      nodes.push(<a key={key} href={href} target="_blank" rel="noreferrer" className="underline">{label}</a>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1).trim()}</em>);
    } else if (token.startsWith("_") && token.endsWith("_")) {
      nodes.push(<em key={key}>{token.slice(1, -1).trim()}</em>);
    } else {
      nodes.push(token);
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes.length ? nodes : [text];
}

function ContentBlocks({ lines }: { lines: string[] }) {
  const { theme, textSize, fontFamily } = useContext(SettingsCtx);
  const blocks = parseBlocks(lines);
  const t = theme;
  return (
    <div className="flex flex-col gap-1.5 leading-relaxed" style={{ color: t.bodyText, fontSize: `${textSize}px`, fontFamily }}>
      {blocks.map((b, i) => {
        if (b.type === "spacer") return <div key={i} className="h-1" />;
        if (b.type === "paragraph") return <p key={i} style={{ color: t.bodyText }}>{renderInlineMarkdown(b.text)}</p>;
        if (b.type === "list") return (
          <ul key={i} className="flex flex-col gap-0.5 pl-3">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-1.5" style={{ color: t.bodyText }}>
                <span className="shrink-0 mt-[5px] w-1 h-1 rounded-full" style={{ background: t.mutedText }} />{renderInlineMarkdown(it)}
              </li>
            ))}
          </ul>
        );
        if (b.type === "blockquote") return (
          <div key={i} className="flex gap-2 px-2 py-1.5" style={{ background: t.rootBg, borderLeft: "2px solid " + t.levels[1]?.accent }}>
            <span className="italic flex-1" style={{ color: t.bodyText }}>{renderInlineMarkdown(b.text)}</span>
          </div>
        );
        if (b.type === "code") return (
          <pre key={i} className="px-2 py-1.5 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap" style={{ background: t.rootBg, color: t.levels[2]?.accent }}>
            {b.lines.join("\n")}
          </pre>
        );
        if (b.type === "table") return (
          <div key={i} className="overflow-x-auto" style={{ border: "1px solid " + t.faintBorder }}>
            <table className="w-full text-[10px]">
              <thead><tr style={{ background: t.rootBg }}>
                {b.headers.map((h, j) => <th key={j} className="px-2 py-1 text-left font-semibold" style={{ color: t.bodyText, borderBottom: "1px solid " + t.faintBorder }}>{h}</th>)}
              </tr></thead>
              <tbody>{b.rows.map((row, j) => (
                <tr key={j} style={{ borderBottom: "1px solid " + t.faintBorder }}>
                  {row.map((cell, k) => <td key={k} className="px-2 py-1" style={{ color: t.bodyText }}>{cell}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        );
        return null;
      })}
    </div>
  );
}


// ─── Tree utilities ───────────────────────────────────────────────────────────

function updateSectionInTree(sections: Section[], id: string, changes: Partial<Pick<Section, "title" | "content">>): Section[] {
  return sections.map((s) =>
    s.id === id ? { ...s, ...changes } : { ...s, children: updateSectionInTree(s.children, id, changes) }
  );
}

function deleteSectionFromTree(sections: Section[], id: string): Section[] {
  return sections
    .filter((s) => s.id !== id)
    .map((s) => ({ ...s, children: deleteSectionFromTree(s.children, id) }));
}

function addChildToSection(sections: Section[], parentId: string, child: Section): Section[] {
  return sections.map((s) =>
    s.id === parentId
      ? { ...s, children: [...s.children, child] }
      : { ...s, children: addChildToSection(s.children, parentId, child) }
  );
}

function getLineKey(sectionId: string, lineIndex: number) {
  return `${sectionId}:${lineIndex}`;
}

function parseLineKey(key: string): { sectionId: string; lineIndex: number } | null {
  const sep = key.lastIndexOf(":");
  if (sep < 0) return null;
  const lineIndex = Number(key.slice(sep + 1));
  if (!Number.isFinite(lineIndex)) return null;
  return { sectionId: key.slice(0, sep), lineIndex };
}

function stripLineMarkup(line: string) {
  const stripped = line
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^>\s+/, "")
    .replace(/^`(.+)`$/, "$1")
    .trim();
  return stripped;
}

function transformLineValue(line: string, type: LineTransformType) {
  const text = stripLineMarkup(line);
  if (type === "text") return text;
  if (type === "bullet") return `- ${text}`;
  if (type === "numbered") return `1. ${text}`;
  if (type === "quote") return `> ${text}`;
  return text ? `\`${text}\`` : "`code`";
}

function remapAnchorAfterRemoving(anchor: number | null | undefined, removedIndices: number[]) {
  if (typeof anchor !== "number") return anchor ?? null;
  const removed = new Set(removedIndices);
  const removedBefore = removedIndices.filter((index) => index < anchor).length;
  if (removed.has(anchor)) return Math.max(-1, anchor - removedBefore - 1);
  return anchor - removedBefore;
}

function shiftAnchorAfterInsert(anchor: number | null | undefined, insertIndex: number, count: number) {
  if (typeof anchor !== "number") return anchor ?? null;
  return anchor >= insertIndex ? anchor + count : anchor;
}

function updateSectionLineInTree(sections: Section[], id: string, lineIndex: number, value: string): Section[] {
  return sections.map((section) => {
    if (section.id === id) {
      const content = section.content.length ? [...section.content] : [""];
      content[lineIndex] = value;
      return { ...section, content };
    }

    return { ...section, children: updateSectionLineInTree(section.children, id, lineIndex, value) };
  });
}

function insertSectionLineInTree(sections: Section[], id: string, lineIndex: number): Section[] {
  return sections.map((section) => {
    if (section.id === id) {
      const content = section.content.length ? [...section.content] : [""];
      const insertIndex = Math.min(Math.max(lineIndex + 1, 0), content.length);
      content.splice(insertIndex, 0, "");
      return {
        ...section,
        content,
        children: section.children.map((child) => ({
          ...child,
          anchorLineIndex: shiftAnchorAfterInsert(child.anchorLineIndex, insertIndex, 1),
        })),
      };
    }

    return { ...section, children: insertSectionLineInTree(section.children, id, lineIndex) };
  });
}

function splitSectionLineInTree(sections: Section[], id: string, lineIndex: number, before: string, after: string): Section[] {
  return sections.map((section) => {
    if (section.id === id) {
      const content = section.content.length ? [...section.content] : [""];
      content[lineIndex] = before;
      const insertIndex = Math.min(Math.max(lineIndex + 1, 0), content.length);
      content.splice(insertIndex, 0, after);
      return {
        ...section,
        content,
        children: section.children.map((child) => ({
          ...child,
          anchorLineIndex: shiftAnchorAfterInsert(child.anchorLineIndex, insertIndex, 1),
        })),
      };
    }

    return { ...section, children: splitSectionLineInTree(section.children, id, lineIndex, before, after) };
  });
}

function deleteSectionLineInTree(sections: Section[], id: string, lineIndex: number): Section[] {
  return sections.map((section) => {
    if (section.id === id) {
      const content = [...section.content];
      if (content.length) content.splice(lineIndex, 1);
      return {
        ...section,
        content,
        children: section.children.map((child) => ({
          ...child,
          anchorLineIndex: remapAnchorAfterRemoving(child.anchorLineIndex, [lineIndex]),
        })),
      };
    }

    return { ...section, children: deleteSectionLineInTree(section.children, id, lineIndex) };
  });
}

function transformSectionLineInTree(sections: Section[], id: string, lineIndex: number, type: LineTransformType): Section[] {
  return sections.map((section) => {
    if (section.id === id) {
      const content = section.content.length ? [...section.content] : [""];
      content[lineIndex] = transformLineValue(content[lineIndex] ?? "", type);
      return { ...section, content };
    }

    return { ...section, children: transformSectionLineInTree(section.children, id, lineIndex, type) };
  });
}

function addChildToSectionAtLine(sections: Section[], parentId: string, lineIndex: number, child: Section): Section[] {
  return sections.map((section) =>
    section.id === parentId
      ? { ...section, children: [...section.children, { ...child, anchorLineIndex: lineIndex }] }
      : { ...section, children: addChildToSectionAtLine(section.children, parentId, lineIndex, child) }
  );
}

function convertLineToChildSection(sections: Section[], parentId: string, lineIndex: number): Section[] {
  return sections.map((section) => {
    if (section.id === parentId) {
      const content = [...section.content];
      const title = stripLineMarkup(content[lineIndex] ?? "") || "New Section";
      if (content.length) content.splice(lineIndex, 1);
      const child: Section = {
        id: Math.random().toString(36).slice(2),
        level: Math.min(section.level + 1, 6),
        title,
        content: [""],
        children: [],
        anchorLineIndex: lineIndex - 1,
      };
      return {
        ...section,
        content,
        children: [
          ...section.children.map((item) => ({
            ...item,
            anchorLineIndex: remapAnchorAfterRemoving(item.anchorLineIndex, [lineIndex]),
          })),
          child,
        ],
      };
    }

    return { ...section, children: convertLineToChildSection(section.children, parentId, lineIndex) };
  });
}

function findSectionInTree(sections: Section[], id: string): Section | null {
  for (const section of sections) {
    if (section.id === id) return section;
    const child = findSectionInTree(section.children, id);
    if (child) return child;
  }
  return null;
}

function sectionContains(section: Section, id: string): boolean {
  return section.children.some((child) => child.id === id || sectionContains(child, id));
}

function relevelSection(section: Section, level: number): Section {
  const safeLevel = Math.max(1, Math.min(6, level));
  return {
    ...section,
    level: safeLevel,
    children: section.children.map((child) => relevelSection(child, Math.min(safeLevel + 1, 6))),
  };
}

function removeSectionFromTree(sections: Section[], id: string): { sections: Section[]; removed: Section | null } {
  let removed: Section | null = null;
  const next: Section[] = [];

  for (const section of sections) {
    if (section.id === id) {
      removed = section;
      continue;
    }

    const childResult = removeSectionFromTree(section.children, id);
    if (childResult.removed) removed = childResult.removed;
    next.push({ ...section, children: childResult.sections });
  }

  return { sections: next, removed };
}

function insertSectionNearTarget(
  sections: Section[],
  targetId: string,
  intent: SectionDropIntent,
  sectionToInsert: Section
): Section[] {
  const next: Section[] = [];

  for (const section of sections) {
    if (section.id === targetId) {
      if (intent === "before") next.push(sectionToInsert);
      if (intent === "inside") next.push({ ...section, children: [...section.children, sectionToInsert] });
      else next.push(section);
      if (intent === "after") next.push(sectionToInsert);
      continue;
    }

    next.push({
      ...section,
      children: insertSectionNearTarget(section.children, targetId, intent, sectionToInsert),
    });
  }

  return next;
}

function moveSectionInTree(sections: Section[], draggedId: string, targetId: string, intent: SectionDropIntent): Section[] {
  if (draggedId === targetId) return sections;

  const dragged = findSectionInTree(sections, draggedId);
  const target = findSectionInTree(sections, targetId);
  if (!dragged || !target || sectionContains(dragged, targetId)) return sections;
  if (intent === "inside" && target.level >= 6) return sections;

  const { sections: withoutDragged, removed } = removeSectionFromTree(sections, draggedId);
  if (!removed) return sections;

  const level = intent === "inside" ? target.level + 1 : target.level;
  const anchorLineIndex = intent === "inside" ? null : target.anchorLineIndex ?? null;
  return insertSectionNearTarget(withoutDragged, targetId, intent, relevelSection({ ...removed, anchorLineIndex }, level));
}

function insertSectionIntoParentAtLine(sections: Section[], parentId: string, lineIndex: number, sectionToInsert: Section): Section[] {
  return sections.map((section) => {
    if (section.id === parentId) {
      return {
        ...section,
        children: [
          ...section.children,
          relevelSection({ ...sectionToInsert, anchorLineIndex: lineIndex }, Math.min(section.level + 1, 6)),
        ],
      };
    }

    return { ...section, children: insertSectionIntoParentAtLine(section.children, parentId, lineIndex, sectionToInsert) };
  });
}

function moveSectionToLineInTree(sections: Section[], draggedId: string, parentId: string, lineIndex: number): Section[] {
  if (draggedId === parentId) return sections;

  const dragged = findSectionInTree(sections, draggedId);
  const parent = findSectionInTree(sections, parentId);
  if (!dragged || !parent || parent.level >= 6 || sectionContains(dragged, parentId)) return sections;

  const { sections: withoutDragged, removed } = removeSectionFromTree(sections, draggedId);
  if (!removed) return sections;

  return insertSectionIntoParentAtLine(withoutDragged, parentId, lineIndex, removed);
}

function moveContentLinesInTree(
  sections: Section[],
  sourceSectionId: string,
  sourceLineIndices: number[],
  targetSectionId: string,
  targetLineIndex: number,
  intent: "before" | "after"
): Section[] {
  const sortedSourceIndices = Array.from(new Set(sourceLineIndices)).sort((a, b) => a - b);
  if (!sortedSourceIndices.length) return sections;
  if (sourceSectionId === targetSectionId && sortedSourceIndices.includes(targetLineIndex)) return sections;

  const originalInsertIndex = targetLineIndex + (intent === "after" ? 1 : 0);
  const insertIndex = sourceSectionId === targetSectionId
    ? originalInsertIndex - sortedSourceIndices.filter((index) => index < originalInsertIndex).length
    : originalInsertIndex;
  let movingLines: string[] = [];

  const removeLines = (items: Section[]): Section[] => items.map((section) => {
    if (section.id === sourceSectionId) {
      movingLines = sortedSourceIndices
        .map((index) => section.content[index])
        .filter((line): line is string => typeof line === "string");
      const removed = new Set(sortedSourceIndices);
      return {
        ...section,
        content: section.content.filter((_, index) => !removed.has(index)),
        children: section.children.map((child) => ({
          ...child,
          anchorLineIndex: remapAnchorAfterRemoving(child.anchorLineIndex, sortedSourceIndices),
        })),
      };
    }

    return { ...section, children: removeLines(section.children) };
  });

  const insertLines = (items: Section[]): Section[] => items.map((section) => {
    if (section.id === targetSectionId) {
      const content = [...section.content];
      const safeInsertIndex = Math.min(Math.max(insertIndex, 0), content.length);
      content.splice(safeInsertIndex, 0, ...movingLines);
      return {
        ...section,
        content,
        children: section.children.map((child) => ({
          ...child,
          anchorLineIndex: shiftAnchorAfterInsert(child.anchorLineIndex, safeInsertIndex, movingLines.length),
        })),
      };
    }

    return { ...section, children: insertLines(section.children) };
  });

  const withoutLines = removeLines(sections);
  if (!movingLines.length) return sections;
  return insertLines(withoutLines);
}

function moveSectionByStep(sections: Section[], id: string, direction: -1 | 1): Section[] {
  let moved = false;

  const moveWithin = (items: Section[]): Section[] => {
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= items.length) return items;
      const next = [...items];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      moved = true;
      return next;
    }

    return items.map((item) => {
      if (moved) return item;
      return { ...item, children: moveWithin(item.children) };
    });
  };

  return moveWithin(sections);
}

function getChildrenBeforeFirstLine(section: Section) {
  return section.children.filter((child) => typeof child.anchorLineIndex === "number" && child.anchorLineIndex < 0);
}

function getChildrenAfterLine(section: Section, lineIndex: number) {
  return section.children.filter((child) => child.anchorLineIndex === lineIndex);
}

function getChildrenAtEnd(section: Section, visibleLineCount = section.content.length) {
  return section.children.filter((child) => (
    typeof child.anchorLineIndex !== "number" || child.anchorLineIndex >= visibleLineCount
  ));
}

function getSectionDropIntent(event: DragEvent<HTMLElement>, section: Section): SectionDropIntent {
  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const edgeSize = rect.height * 0.25;

  if (y < edgeSize) return "before";
  if (y > rect.height - edgeSize) return "after";
  return section.level < 6 ? "inside" : "after";
}

function getSectionMarkdown(section: Section) {
  return treeToMarkdown([section], null).trim();
}

function openRitsAi(prompt: string) {
  window.dispatchEvent(new CustomEvent("rits-ai:open", { detail: { prompt } }));
}

function treeToMarkdown(sections: Section[], fm: Record<string, unknown> | null): string {
  let md = "";
  if (fm) {
    md += "---\n";
    for (const [k, v] of Object.entries(fm)) {
      if (Array.isArray(v)) md += `${k}:\n${(v as string[]).map((i) => `  - ${i}`).join("\n")}\n`;
      else md += `${k}: ${String(v)}\n`;
    }
    md += "---\n\n";
  }
  function render(s: Section): string {
    let r = `${"#".repeat(s.level)} ${s.title}\n\n`;
    const body = s.content.join("\n");
    if (s.content.some((line) => line.trim())) r += body.endsWith("\n") ? `${body}\n` : `${body}\n\n`;
    for (const c of s.children) {
      if (typeof c.anchorLineIndex === "number") r += `<!-- rits:child-after=${c.anchorLineIndex} -->\n`;
      r += render(c);
    }
    return r;
  }
  for (const s of sections) md += render(s);
  return md;
}

// ─── Editable section box ─────────────────────────────────────────────────────

function EditableLineRow({
  section,
  line,
  lineIndex,
  selected,
  lineMenu,
  lineDropTarget,
  onUpdateLine,
  onInsertLine,
  onSplitLine,
  onDeleteLine,
  onTransformLine,
  onAddChildAtLine,
  onConvertLineToChild,
  onOpenLineMenu,
  onLineMouseDown,
  onLineMouseEnter,
  onLineDragStart,
  onLineDragOver,
  onLineDrop,
  onLineDragEnd,
}: {
  section: Section;
  line: string;
  lineIndex: number;
  selected: boolean;
  lineMenu: LineMenuState;
  lineDropTarget: LineDropTarget | null;
  onUpdateLine: (sectionId: string, lineIndex: number, value: string) => void;
  onInsertLine: (sectionId: string, lineIndex: number) => void;
  onSplitLine: (sectionId: string, lineIndex: number, before: string, after: string) => void;
  onDeleteLine: (sectionId: string, lineIndex: number) => void;
  onTransformLine: (sectionId: string, lineIndex: number, type: LineTransformType) => void;
  onAddChildAtLine: (sectionId: string, lineIndex: number) => void;
  onConvertLineToChild: (sectionId: string, lineIndex: number) => void;
  onOpenLineMenu: (menu: LineMenuState) => void;
  onLineMouseDown: (event: React.MouseEvent<HTMLElement>, sectionId: string, lineIndex: number) => void;
  onLineMouseEnter: (event: React.MouseEvent<HTMLElement>, sectionId: string, lineIndex: number) => void;
  onLineDragStart: (event: DragEvent<HTMLElement>, sectionId: string, lineIndex: number) => void;
  onLineDragOver: (event: DragEvent<HTMLElement>, sectionId: string, lineIndex: number) => void;
  onLineDrop: (event: DragEvent<HTMLElement>, sectionId: string, lineIndex: number) => void;
  onLineDragEnd: () => void;
}) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const { theme, textSize, fontFamily } = useContext(SettingsCtx);
  const style = theme.levels[Math.min(section.level - 1, theme.levels.length - 1)];
  const lineKey = getLineKey(section.id, lineIndex);
  const menuOpen = lineMenu?.sectionId === section.id && lineMenu.lineIndex === lineIndex;
  const activeDrop = lineDropTarget?.sectionId === section.id && lineDropTarget.lineIndex === lineIndex
    ? lineDropTarget.intent
    : null;

  useEffect(() => {
    if (!textAreaRef.current) return;
    textAreaRef.current.style.height = "auto";
    textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
  }, [focused, line]);

  useEffect(() => {
    if (!focused) return;
    requestAnimationFrame(() => {
      textAreaRef.current?.focus();
      const end = textAreaRef.current?.value.length ?? 0;
      textAreaRef.current?.setSelectionRange(end, end);
    });
  }, [focused]);

  const runMenuAction = useCallback((action: () => void) => {
    action();
    onOpenLineMenu(null);
  }, [onOpenLineMenu]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const target = event.currentTarget;
      const before = target.value.slice(0, target.selectionStart);
      const after = target.value.slice(target.selectionEnd);
      onSplitLine(section.id, lineIndex, before, after);
      requestAnimationFrame(() => {
        const nextKey = getLineKey(section.id, lineIndex + 1);
        const nextInput = document.querySelector<HTMLTextAreaElement>(`[data-line-input-key="${nextKey}"]`);
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(0, 0);
          return;
        }
        document.querySelector<HTMLButtonElement>(`[data-line-display-key="${nextKey}"]`)?.click();
      });
    }

    if (event.key === "Backspace" && !event.currentTarget.value && section.content.length > 1) {
      event.preventDefault();
      onDeleteLine(section.id, lineIndex);
      requestAnimationFrame(() => {
        const nextIndex = Math.max(0, lineIndex - 1);
        const nextKey = getLineKey(section.id, nextIndex);
        const nextInput = document.querySelector<HTMLTextAreaElement>(`[data-line-input-key="${nextKey}"]`);
        if (nextInput) {
          nextInput.focus();
          const end = nextInput.value.length;
          nextInput.setSelectionRange(end, end);
          return;
        }
        document.querySelector<HTMLButtonElement>(`[data-line-display-key="${nextKey}"]`)?.click();
      });
    }
  }, [lineIndex, onDeleteLine, onSplitLine, section.content.length, section.id]);

  const menuButton = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void
  ) => (
    <button
      key={label}
      type="button"
      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors hover:opacity-80"
      style={{ color: theme.bodyText }}
      onClick={(event) => {
        event.stopPropagation();
        runMenuAction(onClick);
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      data-hierarchy-line-key={lineKey}
      className="group/line relative flex items-start gap-1 transition-colors"
      style={{
        background: selected ? style.accent + "18" : "transparent",
        borderTop: activeDrop === "before" ? `2px solid ${style.accent}` : "2px solid transparent",
        borderBottom: activeDrop === "after" ? `2px solid ${style.accent}` : "2px solid transparent",
      }}
      onMouseDown={(event) => onLineMouseDown(event, section.id, lineIndex)}
      onMouseEnter={(event) => onLineMouseEnter(event, section.id, lineIndex)}
      onDragOver={(event) => onLineDragOver(event, section.id, lineIndex)}
      onDrop={(event) => onLineDrop(event, section.id, lineIndex)}
    >
      <div className="sticky left-0 z-10 flex w-14 shrink-0 justify-end gap-0.5 pt-0.5 opacity-0 transition-opacity group-hover/line:opacity-100">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center transition-colors hover:opacity-80"
          style={{ color: theme.mutedText, background: style.bg }}
          title="Add line below"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onInsertLine(section.id, lineIndex);
          }}
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          draggable
          className="flex h-6 w-6 cursor-grab items-center justify-center transition-colors hover:opacity-80 active:cursor-grabbing"
          style={{ color: menuOpen ? style.accent : theme.mutedText, background: style.bg }}
          title="Drag line or open line menu"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onOpenLineMenu(menuOpen ? null : { sectionId: section.id, lineIndex });
          }}
          onDragStart={(event) => onLineDragStart(event, section.id, lineIndex)}
          onDragEnd={onLineDragEnd}
        >
          <GripVertical size={14} />
        </button>
      </div>

      {focused ? (
        <textarea
          ref={textAreaRef}
          data-line-input-key={lineKey}
          value={line}
          onChange={(event) => onUpdateLine(section.id, lineIndex, event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Write text..."
          rows={1}
          className="min-h-[26px] flex-1 resize-none bg-transparent py-1 leading-relaxed outline-none"
          style={{ color: theme.bodyText, fontSize: `${textSize}px`, fontFamily, overflow: "hidden" }}
        />
      ) : (
        <button
          type="button"
          data-line-display-key={lineKey}
          className="min-h-[26px] flex-1 py-1 text-left leading-relaxed outline-none"
          style={{ color: line ? theme.bodyText : theme.mutedText, fontSize: `${textSize}px`, fontFamily }}
          onClick={(event) => {
            event.stopPropagation();
            setFocused(true);
          }}
        >
          {line ? renderInlineMarkdown(line) : "Write text..."}
        </button>
      )}

      {menuOpen && (
        <div
          className="absolute left-14 top-7 z-[90] w-56 overflow-hidden shadow-2xl"
          style={{ background: theme.tabBg, border: "1px solid " + theme.faintBorder }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.mutedText, borderBottom: "1px solid " + theme.faintBorder }}>
            Turn into
          </div>
          <div className="p-1">
            {menuButton("Text", <RemoveFormatting size={13} />, () => onTransformLine(section.id, lineIndex, "text"))}
            {menuButton("Bullet list", <List size={13} />, () => onTransformLine(section.id, lineIndex, "bullet"))}
            {menuButton("Numbered list", <ListOrdered size={13} />, () => onTransformLine(section.id, lineIndex, "numbered"))}
            {menuButton("Quote", <Quote size={13} />, () => onTransformLine(section.id, lineIndex, "quote"))}
            {menuButton("Code", <Code2 size={13} />, () => onTransformLine(section.id, lineIndex, "code"))}
          </div>
          <div className="p-1" style={{ borderTop: "1px solid " + theme.faintBorder }}>
            {menuButton("Add line below", <Plus size={13} />, () => onInsertLine(section.id, lineIndex))}
            {section.level < 6 && menuButton("Add child below", <PlusCircle size={13} />, () => onAddChildAtLine(section.id, lineIndex))}
            {section.level < 6 && menuButton("Convert line to child", <Heading2 size={13} />, () => onConvertLineToChild(section.id, lineIndex))}
            {menuButton("Delete line", <Trash2 size={13} />, () => onDeleteLine(section.id, lineIndex))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableSectionBox({
  section,
  depth,
  onUpdate,
  onAddChild,
  onAddChildAtLine,
  onConvertLineToChild,
  onDelete,
  onMoveStep,
  onUpdateLine,
  onInsertLine,
  onSplitLine,
  onDeleteLine,
  onTransformLine,
  onLineDragStart,
  onLineDragOver,
  onLineDrop,
  onLineDragEnd,
  onLineMouseDown,
  onLineMouseEnter,
  onOpenLineMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedSectionId,
  dropTarget,
  selectedLineKeys,
  lineMenu,
  lineDropTarget,
}: {
  section: Section; depth: number;
  onUpdate: (id: string, changes: Partial<Pick<Section, "title" | "content">>) => void;
  onAddChild: (parentId: string) => void;
  onAddChildAtLine: (parentId: string, lineIndex: number) => void;
  onConvertLineToChild: (parentId: string, lineIndex: number) => void;
  onDelete: (id: string) => void;
  onMoveStep: (id: string, direction: -1 | 1) => void;
  onUpdateLine: (sectionId: string, lineIndex: number, value: string) => void;
  onInsertLine: (sectionId: string, lineIndex: number) => void;
  onSplitLine: (sectionId: string, lineIndex: number, before: string, after: string) => void;
  onDeleteLine: (sectionId: string, lineIndex: number) => void;
  onTransformLine: (sectionId: string, lineIndex: number, type: LineTransformType) => void;
  onLineDragStart: (event: DragEvent<HTMLElement>, sectionId: string, lineIndex: number) => void;
  onLineDragOver: (event: DragEvent<HTMLElement>, sectionId: string, lineIndex: number) => void;
  onLineDrop: (event: DragEvent<HTMLElement>, sectionId: string, lineIndex: number) => void;
  onLineDragEnd: () => void;
  onLineMouseDown: (event: React.MouseEvent<HTMLElement>, sectionId: string, lineIndex: number) => void;
  onLineMouseEnter: (event: React.MouseEvent<HTMLElement>, sectionId: string, lineIndex: number) => void;
  onOpenLineMenu: (menu: LineMenuState) => void;
  onDragStart: (event: DragEvent<HTMLElement>, section: Section) => void;
  onDragOver: (event: DragEvent<HTMLElement>, section: Section) => void;
  onDrop: (event: DragEvent<HTMLElement>, section: Section) => void;
  onDragEnd: () => void;
  draggedSectionId: string | null;
  dropTarget: { id: string; intent: SectionDropIntent } | null;
  selectedLineKeys: string[];
  lineMenu: LineMenuState;
  lineDropTarget: LineDropTarget | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const { theme, textSize, fontFamily } = useContext(SettingsCtx);
  const style = theme.levels[Math.min(section.level - 1, theme.levels.length - 1)];
  const hasChildren = section.children.length > 0;
  const contentLines = section.content.length ? section.content : [""];
  const hasContent = section.content.some((l) => l.trim());
  const headingSize = textSize + (section.level === 1 ? 3 : section.level === 2 ? 1 : 0);
  const activeDrop = dropTarget?.id === section.id ? dropTarget.intent : null;
  const dropStyle: React.CSSProperties = activeDrop === "inside"
    ? { boxShadow: `inset 0 0 0 2px ${style.accent}` }
    : activeDrop === "before"
      ? { borderTopColor: style.accent, borderTopWidth: 3 }
      : activeDrop === "after"
        ? { borderBottomColor: style.accent, borderBottomWidth: 3 }
        : {};

  const renderChild = (child: Section) => (
    <EditableSectionBox
      key={child.id}
      section={child}
      depth={depth + 1}
      onUpdate={onUpdate}
      onAddChild={onAddChild}
      onAddChildAtLine={onAddChildAtLine}
      onConvertLineToChild={onConvertLineToChild}
      onDelete={onDelete}
      onMoveStep={onMoveStep}
      onUpdateLine={onUpdateLine}
      onInsertLine={onInsertLine}
      onSplitLine={onSplitLine}
      onDeleteLine={onDeleteLine}
      onTransformLine={onTransformLine}
      onLineDragStart={onLineDragStart}
      onLineDragOver={onLineDragOver}
      onLineDrop={onLineDrop}
      onLineDragEnd={onLineDragEnd}
      onLineMouseDown={onLineMouseDown}
      onLineMouseEnter={onLineMouseEnter}
      onOpenLineMenu={onOpenLineMenu}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      draggedSectionId={draggedSectionId}
      dropTarget={dropTarget}
      selectedLineKeys={selectedLineKeys}
      lineMenu={lineMenu}
      lineDropTarget={lineDropTarget}
    />
  );

  return (
    <div
      className={`flex flex-col w-full border transition-opacity ${draggedSectionId === section.id ? "opacity-45" : ""}`}
      style={{ borderColor: style.accent + "88", background: style.bg, ...dropStyle }}
      onDragOver={(event) => onDragOver(event, section)}
      onDrop={(event) => onDrop(event, section)}
    >
      <div
        className="flex items-center gap-2 px-3 group sticky select-none"
        style={{ top: depth * 36, zIndex: 50 - depth, minHeight: 36, background: style.headerBg, borderBottom: (hasContent || hasChildren) && !collapsed ? "1px solid " + style.accent + "66" : "none" }}
      >
        <div className="relative shrink-0">
          <button
            type="button"
            draggable
            onDragStart={(event) => {
              setSectionMenuOpen(false);
              onDragStart(event, section);
            }}
            onDragEnd={onDragEnd}
            onClick={(e) => {
              e.stopPropagation();
              setSectionMenuOpen((open) => !open);
            }}
            className="cursor-grab rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 active:cursor-grabbing"
            style={{ color: sectionMenuOpen ? style.accent : theme.mutedText }}
            title="Drag section or open section menu"
          >
            <GripVertical size={13} />
          </button>
          {sectionMenuOpen && (
            <div
              className="absolute left-0 top-6 z-[95] w-44 overflow-hidden shadow-2xl"
              style={{ background: theme.tabBg, border: "1px solid " + theme.faintBorder }}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:opacity-80" style={{ color: theme.bodyText }} onClick={() => { onMoveStep(section.id, -1); setSectionMenuOpen(false); }}>
                <ArrowUp size={13} /> Move up
              </button>
              <button type="button" className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:opacity-80" style={{ color: theme.bodyText }} onClick={() => { onMoveStep(section.id, 1); setSectionMenuOpen(false); }}>
                <ArrowDown size={13} /> Move down
              </button>
              {section.level < 6 && (
                <button type="button" className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:opacity-80" style={{ color: theme.bodyText }} onClick={() => { onAddChild(section.id); setSectionMenuOpen(false); }}>
                  <PlusCircle size={13} /> Add child
                </button>
              )}
              <button type="button" className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:opacity-80" style={{ color: "#e06c75", borderTop: "1px solid " + theme.faintBorder }} onClick={() => { onDelete(section.id); setSectionMenuOpen(false); }}>
                <Trash2 size={13} /> Delete block
              </button>
            </div>
          )}
        </div>
        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5" style={{ background: style.accent + "33", color: style.accent, fontFamily: "monospace" }}>
          {style.label}
        </span>
        <input
          value={section.title}
          onChange={(e) => { onUpdate(section.id, { title: e.target.value }); }}
          onClick={(e) => e.stopPropagation()}
          placeholder="Section title…"
          className="flex-1 bg-transparent outline-none border-none font-semibold leading-snug"
          style={{ color: style.textColor, fontSize: `${headingSize}px`, fontFamily }}
        />
        <button onClick={() => setCollapsed((c) => !c)} className="shrink-0 cursor-pointer">
          {collapsed ? <ChevronRight size={13} style={{ color: "#586e75" }} /> : <ChevronDown size={13} style={{ color: "#586e75" }} />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-0" style={{ background: style.bg }}>
          <div className="py-1.5">
            {getChildrenBeforeFirstLine(section).map((child) => (
              <div key={child.id} className="pl-9 pr-2 py-0.5">{renderChild(child)}</div>
            ))}
            {contentLines.map((line, index) => (
              <div key={`${section.id}-${index}`}>
                <EditableLineRow
                  section={section}
                  line={line}
                  lineIndex={index}
                  selected={selectedLineKeys.includes(getLineKey(section.id, index))}
                  lineMenu={lineMenu}
                  lineDropTarget={lineDropTarget}
                  onUpdateLine={onUpdateLine}
                  onInsertLine={onInsertLine}
                  onSplitLine={onSplitLine}
                  onDeleteLine={onDeleteLine}
                  onTransformLine={onTransformLine}
                  onAddChildAtLine={onAddChildAtLine}
                  onConvertLineToChild={onConvertLineToChild}
                  onOpenLineMenu={onOpenLineMenu}
                  onLineMouseDown={onLineMouseDown}
                  onLineMouseEnter={onLineMouseEnter}
                  onLineDragStart={onLineDragStart}
                  onLineDragOver={onLineDragOver}
                  onLineDrop={onLineDrop}
                  onLineDragEnd={onLineDragEnd}
                />
                {getChildrenAfterLine(section, index).map((child) => (
                  <div key={child.id} className="pl-9 pr-2 py-0.5">{renderChild(child)}</div>
                ))}
              </div>
            ))}
            {getChildrenAtEnd(section, contentLines.length).map((child) => (
              <div key={child.id} className="pl-9 pr-2 py-0.5">{renderChild(child)}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section box (recursive) ──────────────────────────────────────────────────

function SectionBox({
  section,
  depth,
  onAddChild,
  readOnly,
  editingSectionId,
  onEditSection,
  onFinishEditing,
  onUpdate,
  onDelete,
  onExplain,
  onOpenChat,
}: {
  section: Section;
  depth: number;
  onAddChild?: (parentId: string) => void;
  readOnly?: boolean;
  editingSectionId?: string | null;
  onEditSection?: (id: string) => void;
  onFinishEditing?: () => void;
  onUpdate?: (id: string, changes: Partial<Pick<Section, "title" | "content">>) => void;
  onDelete?: (id: string) => void;
  onExplain?: (section: Section) => void;
  onOpenChat?: (section: Section) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { theme, textSize, fontFamily } = useContext(SettingsCtx);
  const levels = theme.levels;
  const style = levels[Math.min(section.level - 1, levels.length - 1)];
  const hasChildren = section.children.length > 0;
  const hasContent = section.content.some((l) => l.trim());
  const headingSize = textSize + (section.level === 1 ? 3 : section.level === 2 ? 1 : 0);
  const isEditing = editingSectionId === section.id;
  const contentValue = section.content.join("\n");
  const renderReadChild = (child: Section) => (
    <SectionBox
      key={child.id}
      section={child}
      depth={depth + 1}
      onAddChild={onAddChild}
      readOnly={readOnly}
      editingSectionId={editingSectionId}
      onEditSection={onEditSection}
      onFinishEditing={onFinishEditing}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onExplain={onExplain}
      onOpenChat={onOpenChat}
    />
  );

  const renderReadBody = () => {
    const parts: React.ReactNode[] = [];
    const pushContent = (lines: string[], key: string) => {
      if (!lines.length || !lines.some((line) => line.trim())) return;
      parts.push(
        <div key={key} className="px-3 py-2">
          <ContentBlocks lines={lines} />
        </div>
      );
    };
    const pushChildren = (children: Section[], key: string) => {
      if (!children.length) return;
      parts.push(
        <div key={key} className="flex flex-col gap-1" style={{ padding: "4px 8px 6px 16px" }}>
          {children.map(renderReadChild)}
        </div>
      );
    };

    pushChildren(getChildrenBeforeFirstLine(section), "children-before");

    let contentChunk: string[] = [];
    section.content.forEach((line, index) => {
      contentChunk.push(line);
      const anchoredChildren = getChildrenAfterLine(section, index);
      if (!anchoredChildren.length) return;
      pushContent(contentChunk, `content-${index}`);
      contentChunk = [];
      pushChildren(anchoredChildren, `children-${index}`);
    });

    pushContent(contentChunk, "content-end");
    pushChildren(getChildrenAtEnd(section), "children-end");
    return parts;
  };

  useEffect(() => {
    if (!isEditing || !taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = `${taRef.current.scrollHeight}px`;
  }, [contentValue, isEditing]);

  const box = (
    <div
      className="flex flex-col w-full border"
      style={{ borderColor: style.accent + "88", background: style.bg }}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2 px-3 select-none sticky group ${isEditing ? "" : "cursor-pointer"}`}
        style={{
          top: depth * 36,
          zIndex: 50 - depth,
          minHeight: 36,
          background: style.headerBg,
          borderBottom: (hasContent || hasChildren) && !collapsed ? "1px solid " + style.accent + "66" : "none",
        }}
        onClick={() => {
          if (!isEditing) setCollapsed((c) => !c);
        }}
      >
        <span
          className="shrink-0 text-[9px] font-bold px-1.5 py-0.5"
          style={{ background: style.accent + "33", color: style.accent, fontFamily: "monospace" }}
        >
          {style.label}
        </span>
        {isEditing ? (
          <input
            value={section.title}
            onChange={(event) => onUpdate?.(section.id, { title: event.target.value })}
            onClick={(event) => event.stopPropagation()}
            autoFocus
            className="flex-1 bg-transparent outline-none border-none font-semibold leading-snug"
            style={{ color: style.textColor, fontSize: `${headingSize}px`, fontFamily }}
          />
        ) : (
          <span
            className="flex-1 font-semibold leading-snug truncate"
            style={{ color: style.textColor, fontSize: `${headingSize}px`, fontFamily }}
          >
            {section.title}
          </span>
        )}
        {isEditing && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFinishEditing?.();
            }}
            className="shrink-0 p-0.5 rounded transition-opacity hover:opacity-80"
            style={{ color: style.accent }}
            title="Done editing"
          >
            <Check size={13} />
          </button>
        )}
        {!readOnly && onAddChild && section.level < 6 && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(section.id); }}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
            style={{ color: style.accent }}
            title="Add child section"
          >
            <PlusCircle size={13} />
          </button>
        )}
        {(hasChildren || hasContent) && (
          collapsed
            ? <ChevronRight size={13} style={{ color: "#586e75" }} className="shrink-0" />
            : <ChevronDown size={13} style={{ color: "#586e75" }} className="shrink-0" />
        )}
      </div>

      {/* Body */}
      {!collapsed && (hasContent || hasChildren || isEditing) && (
        <div className="flex flex-col gap-0" style={{ background: style.bg }}>
          {isEditing ? (
            <div className="px-3 py-2">
              <textarea
                ref={taRef}
                value={contentValue}
                onChange={(event) => onUpdate?.(section.id, { content: event.target.value.split("\n") })}
                rows={1}
                className="w-full resize-none outline-none bg-transparent leading-relaxed"
                style={{ color: theme.bodyText, fontSize: `${textSize}px`, fontFamily, minHeight: 28, overflow: "hidden" }}
              />
            </div>
          ) : renderReadBody()}
          {isEditing && hasChildren && (
            <div className="flex flex-col gap-1" style={{ padding: "4px 8px 6px 16px" }}>
              {section.children.map(renderReadChild)}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!readOnly) return box;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{box}</ContextMenuTrigger>
      <ContextMenuContent
        className="z-[120] min-w-48 border p-1 shadow-xl"
        style={{ borderColor: theme.faintBorder, backgroundColor: theme.tabBg, color: theme.bodyText }}
      >
        <ContextMenuItem onSelect={() => onEditSection?.(section.id)}>
          <Pencil size={14} /> Edit block
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onExplain?.(section)}>
          <Sparkles size={14} /> AI explain
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onOpenChat?.(section)}>
          <MessageSquare size={14} /> Open chat with AI
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => onDelete?.(section.id)}>
          <Trash2 size={14} /> Remove block
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── Frontmatter card ─────────────────────────────────────────────

function FrontmatterCard({ fm }: { fm: Record<string, unknown> }) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme: t } = useContext(SettingsCtx);
  return (
    <div className="border" style={{ borderColor: t.faintBorder, background: t.rootBg }}>
      <div className="flex items-center gap-2 px-3 cursor-pointer sticky top-0"
        style={{ zIndex: 51, minHeight: 36, background: t.tabBg, borderBottom: collapsed ? "none" : "1px solid " + t.faintBorder }}
        onClick={() => setCollapsed((c) => !c)}>
        <FileText size={13} style={{ color: t.mutedText }} className="shrink-0" />
        <span className="text-xs font-semibold flex-1" style={{ color: t.bodyText }}>Metadata</span>
        {collapsed ? <ChevronRight size={13} style={{ color: t.mutedText }} /> : <ChevronDown size={13} style={{ color: t.mutedText }} />}
      </div>
      {!collapsed && (
        <div className="flex flex-wrap gap-2 p-3">
          {Object.entries(fm).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 px-2 py-1 text-xs" style={{ background: t.tabBg, border: "1px solid " + t.faintBorder }}>
              {k === "tags" ? <Tag size={10} style={{ color: t.mutedText }} /> : k === "date" ? <Calendar size={10} style={{ color: t.mutedText }} /> : null}
              <span className="font-medium" style={{ color: t.mutedText }}>{k}:</span>
              <span style={{ color: t.bodyText }}>{Array.isArray(v) ? v.join(", ") : String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Default content ──────────────────────────────────────────────────────────

export function createDefaultHierarchyContent(): string {
  return `---
title: "My Document"
date: 2026-01-01
status: draft
---

# Root Heading

Introduction paragraph goes here.

## Section One

Content for section one.

- Item A
- Item B

## Section Two

Content for section two.

### Sub-section

Nested content here.
`;
}

export function isHierarchyFileContent(content: string): boolean {
  try {
    const d = JSON.parse(content);
    if (Array.isArray(d) && d.length > 0 && "id" in d[0] && "children" in d[0]) return true;
  } catch { /* not json */ }
  return /^#{1,6}\s+\S/m.test(content) || /^---\r?\n/.test(content);
}

// ─── Migrate old JSON → plain text ───────────────────────────────────────────

function migrateIfJson(content: string): string {
  try {
    const d = JSON.parse(content);
    if (Array.isArray(d) && d.length > 0 && "id" in d[0]) {
      const toMd = (nodes: { title: string; children: { title: string; children: [] }[] }[], depth: number): string =>
        nodes.map((n) => `${"#".repeat(depth + 1)} ${n.title}\n${toMd(n.children as never, depth + 1)}`).join("\n");
      return toMd(d, 0);
    }
  } catch { /* not json */ }
  return content;
}
// ─── Settings panel ─────────────────────────────────────────────

function SettingsPanel({ settings, onChange, onClose }: {
  settings: HierarchySettings;
  onChange: (s: HierarchySettings) => void;
  onClose: () => void;
}) {
  const { theme, textSize, fontFamily } = settings;
  const sizes = [{ label: "S", val: 11 }, { label: "M", val: 13 }, { label: "L", val: 15 }];
  const fonts = [{ label: "Mono", val: "monospace" }, { label: "Sans", val: "sans-serif" }, { label: "Serif", val: "Georgia, serif" }];
  return (
    <div className="absolute right-2 top-10 z-[100] w-72 shadow-2xl overflow-hidden" style={{ background: theme.tabBg, border: "1px solid " + theme.faintBorder }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid " + theme.faintBorder }}>
        <span className="text-xs font-semibold" style={{ color: theme.bodyText }}>Appearance</span>
        <button onClick={onClose} style={{ color: theme.mutedText }}><X size={13} /></button>
      </div>

      {/* Themes */}
      <div className="p-3" style={{ borderBottom: "1px solid " + theme.faintBorder }}>
        <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: theme.mutedText }}>Theme</p>
        <div className="grid grid-cols-3 gap-1.5">
          {THEMES.map((t) => (
            <button key={t.name} onClick={() => onChange({ ...settings, theme: t })}
              className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-medium transition-all"
              style={{ background: t.swatch, color: t.bodyText, border: "2px solid " + (t.name === theme.name ? t.levels[0].accent : "transparent"), outline: "none" }}>
              <span className="flex gap-0.5">
                {t.levels.slice(0, 3).map((l) => <span key={l.label} style={{ width: 6, height: 6, background: l.accent, display: "inline-block" }} />)}
              </span>
              <span className="truncate">{t.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Text size */}
      <div className="p-3" style={{ borderBottom: "1px solid " + theme.faintBorder }}>
        <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: theme.mutedText }}>Text Size</p>
        <div className="flex gap-1">
          {sizes.map((s) => (
            <button key={s.val} onClick={() => onChange({ ...settings, textSize: s.val })}
              className="flex-1 py-1 text-xs font-semibold transition-all"
              style={{ background: textSize === s.val ? theme.levels[0].accent + "33" : "transparent", color: textSize === s.val ? theme.levels[0].accent : theme.bodyText, border: "1px solid " + (textSize === s.val ? theme.levels[0].accent : theme.faintBorder) }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font family */}
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: theme.mutedText }}>Font</p>
        <div className="flex gap-1">
          {fonts.map((f) => (
            <button key={f.val} onClick={() => onChange({ ...settings, fontFamily: f.val })}
              className="flex-1 py-1 text-[11px] transition-all"
              style={{ fontFamily: f.val, background: fontFamily === f.val ? theme.levels[0].accent + "33" : "transparent", color: fontFamily === f.val ? theme.levels[0].accent : theme.bodyText, border: "1px solid " + (fontFamily === f.val ? theme.levels[0].accent : theme.faintBorder) }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Syntax-highlighted source editor ───────────────────────────────────

// Heading colors: # ## ### #### ##### ######
const H_COLORS = ["#268bd2", "#2aa198", "#859900", "#b58900", "#cb4b16", "#6c71c4"];

function renderHighlightedLine(line: string, bodyColor: string): React.ReactNode {
  const m = line.match(/^(#{1,6})(\s)(.*)$/);
  if (m) {
    const hashes = m[1];
    const rest = m[3];
    const color = H_COLORS[hashes.length - 1];
    return <><span style={{ color, fontWeight: 700 }}>{hashes}</span><span style={{ color: bodyColor }}>{" " + rest}</span></>;
  }
  const fm = line.match(/^(---\s*)$/);
  if (fm) return <span style={{ color: "#586e75" }}>{line}</span>;
  const kv = line.match(/^([\w-]+)(:\s*.*)$/);
  if (kv) return <><span style={{ color: "#b58900" }}>{kv[1]}</span><span style={{ color: bodyColor + "aa" }}>{kv[2]}</span></>;
  return <span style={{ color: bodyColor }}>{line}</span>;
}

function HighlightedSourceEditor({ value, onChange, onKeyDown, theme, textSize, fontFamily, readOnly = false }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  theme: ThemeConfig; textSize: number; fontFamily: string;
  readOnly?: boolean;
}) {
  const lines = value.split("\n");
  const sharedStyle: React.CSSProperties = { fontFamily, fontSize: textSize, lineHeight: "1.6", padding: "16px", tabSize: 2, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word" };
  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Highlight layer */}
      <div aria-hidden className="absolute inset-0 overflow-auto pointer-events-none" style={{ ...sharedStyle, color: theme.sourceText, background: "transparent" }}>
        {lines.map((line, i) => (
          <div key={i} style={{ minHeight: "1.6em" }}>{renderHighlightedLine(line || " ", theme.bodyText)}</div>
        ))}
      </div>
      {/* Actual textarea — transparent text so highlight shows through */}
      <textarea
        className="absolute inset-0 w-full h-full resize-none outline-none border-none"
        style={{ ...sharedStyle, background: "transparent", color: "transparent", caretColor: theme.levels[0].accent }}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        spellCheck={false}
      />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────

interface HierarchyFileEditorProps {
  content: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  viewMode?: "read" | "edit";
  onViewModeChange?: (mode: "read" | "edit") => void;
  settingsValue?: HierarchyEditorSettingsValue | null;
  onSettingsValueChange?: (settings: HierarchyEditorSettingsValue) => void;
}

export function HierarchyFileEditor({ content, onChange, readOnly = false, viewMode, onViewModeChange, settingsValue, onSettingsValueChange }: HierarchyFileEditorProps) {
  const [mode, setMode] = useState<"source" | "hierarchy">("hierarchy");
  const [fallbackSettings, setFallbackSettings] = useState<HierarchySettings>(() => settingsFromValue(settingsValue));
  const [showSettings, setShowSettings] = useState(false);
  const [text, setText] = useState(() => migrateIfJson(content || createDefaultHierarchyContent()));
  const editorRootRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  // ── Edit-mode tree state ──────────────────────────────────────────────
  const [editTree, setEditTree] = useState<Section[]>(() => parseMarkdownTree(parseFrontmatter(migrateIfJson(content || createDefaultHierarchyContent())).body));
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; intent: SectionDropIntent } | null>(null);
  const [draggedLine, setDraggedLine] = useState<{ sectionId: string; lineIndex: number } | null>(null);
  const [lineDropTarget, setLineDropTarget] = useState<LineDropTarget | null>(null);
  const [lineMenu, setLineMenu] = useState<LineMenuState>(null);
  const [selectedLineKeys, setSelectedLineKeys] = useState<string[]>([]);
  const [readEditingSectionId, setReadEditingSectionId] = useState<string | null>(null);
  const latestTextRef = useRef(text);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isInternalRef = useRef(false);
  const lineSelectingRef = useRef(false);
  const selectedLineKeysRef = useRef<string[]>([]);

  const restoreSnapshot = useCallback((nextText: string) => {
    latestTextRef.current = nextText;
    isInternalRef.current = true;
    setText(nextText);
    setEditTree(parseMarkdownTree(parseFrontmatter(nextText).body));
    setReadEditingSectionId(null);
    setSelectedLineKeys([]);
    setLineMenu(null);
    setDraggedLine(null);
    setLineDropTarget(null);
    onChange(nextText);
    requestAnimationFrame(() => { isInternalRef.current = false; });
  }, [onChange]);

  const recordUndoSnapshot = useCallback((snapshot: string) => {
    const undoStack = undoStackRef.current;
    if (undoStack[undoStack.length - 1] === snapshot) return;
    undoStackRef.current = [...undoStack, snapshot].slice(-HISTORY_LIMIT);
  }, []);

  const commitText = useCallback((nextText: string, nextTree?: Section[]) => {
    const currentText = latestTextRef.current;
    if (nextText === currentText) {
      if (nextTree) setEditTree(nextTree);
      return;
    }

    recordUndoSnapshot(currentText);
    redoStackRef.current = [];
    latestTextRef.current = nextText;
    isInternalRef.current = true;
    setText(nextText);
    setEditTree(nextTree ?? parseMarkdownTree(parseFrontmatter(nextText).body));
    onChange(nextText);
    requestAnimationFrame(() => { isInternalRef.current = false; });
  }, [onChange, recordUndoSnapshot]);

  const undo = useCallback(() => {
    const previous = undoStackRef.current.at(-1);
    if (!previous) return false;

    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, latestTextRef.current].slice(-HISTORY_LIMIT);
    restoreSnapshot(previous);
    return true;
  }, [restoreSnapshot]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.at(-1);
    if (!next) return false;

    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, latestTextRef.current].slice(-HISTORY_LIMIT);
    restoreSnapshot(next);
    return true;
  }, [restoreSnapshot]);

  const applyTree = useCallback((next: Section[]) => {
    const { fm: curFm } = parseFrontmatter(latestTextRef.current);
    const newMd = treeToMarkdown(next, curFm);
    commitText(newMd, next);
  }, [commitText]);

  const handleUpdateSection = useCallback((id: string, changes: Partial<Pick<Section, "title" | "content">>) => {
    const next = updateSectionInTree(editTree, id, changes);
    const { fm: curFm } = parseFrontmatter(latestTextRef.current);
    commitText(treeToMarkdown(next, curFm), next);
  }, [commitText, editTree]);

  const handleDeleteSection = useCallback((id: string) => {
    setReadEditingSectionId(null);
    applyTree(deleteSectionFromTree(editTree, id));
  }, [applyTree, editTree]);

  const handleAddChildToTree = useCallback((parentId: string) => {
    const parent = findSectionInTree(editTree, parentId);
    if (!parent) return;
    const child: Section = { id: Math.random().toString(36).slice(2), level: Math.min(parent.level + 1, 6), title: "New Section", content: [""], children: [] };
    applyTree(addChildToSection(editTree, parentId, child));
  }, [applyTree, editTree]);

  const handleUpdateLine = useCallback((sectionId: string, lineIndex: number, value: string) => {
    applyTree(updateSectionLineInTree(editTree, sectionId, lineIndex, value));
  }, [applyTree, editTree]);

  const handleInsertLine = useCallback((sectionId: string, lineIndex: number) => {
    applyTree(insertSectionLineInTree(editTree, sectionId, lineIndex));
    requestAnimationFrame(() => {
      const nextKey = getLineKey(sectionId, lineIndex + 1);
      const nextInput = document.querySelector<HTMLTextAreaElement>(`[data-line-input-key="${nextKey}"]`);
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(0, 0);
        return;
      }
      document.querySelector<HTMLButtonElement>(`[data-line-display-key="${nextKey}"]`)?.click();
    });
  }, [applyTree, editTree]);

  const handleSplitLine = useCallback((sectionId: string, lineIndex: number, before: string, after: string) => {
    applyTree(splitSectionLineInTree(editTree, sectionId, lineIndex, before, after));
  }, [applyTree, editTree]);

  const handleDeleteLine = useCallback((sectionId: string, lineIndex: number) => {
    setSelectedLineKeys((current) => current.filter((key) => key !== getLineKey(sectionId, lineIndex)));
    applyTree(deleteSectionLineInTree(editTree, sectionId, lineIndex));
  }, [applyTree, editTree]);

  const handleTransformLine = useCallback((sectionId: string, lineIndex: number, type: LineTransformType) => {
    applyTree(transformSectionLineInTree(editTree, sectionId, lineIndex, type));
  }, [applyTree, editTree]);

  const handleAddChildAtLine = useCallback((parentId: string, lineIndex: number) => {
    const parent = findSectionInTree(editTree, parentId);
    if (!parent || parent.level >= 6) return;
    const child: Section = {
      id: Math.random().toString(36).slice(2),
      level: Math.min(parent.level + 1, 6),
      title: "New Section",
      content: [""],
      children: [],
      anchorLineIndex: lineIndex,
    };
    applyTree(addChildToSectionAtLine(editTree, parentId, lineIndex, child));
  }, [applyTree, editTree]);

  const handleConvertLineToChild = useCallback((parentId: string, lineIndex: number) => {
    const parent = findSectionInTree(editTree, parentId);
    if (!parent || parent.level >= 6) return;
    setSelectedLineKeys((current) => current.filter((key) => key !== getLineKey(parentId, lineIndex)));
    applyTree(convertLineToChildSection(editTree, parentId, lineIndex));
  }, [applyTree, editTree]);

  const handleAddRootSection = useCallback(() => {
    const root: Section = { id: Math.random().toString(36).slice(2), level: 1, title: "New Section", content: [""], children: [] };
    applyTree([...editTree, root]);
  }, [applyTree, editTree]);

  const handleMoveSectionStep = useCallback((id: string, direction: -1 | 1) => {
    applyTree(moveSectionByStep(editTree, id, direction));
  }, [applyTree, editTree]);

  const resetSectionDrag = useCallback(() => {
    setDraggedSectionId(null);
    setDropTarget(null);
    setLineDropTarget(null);
  }, []);

  const handleSectionDragStart = useCallback((event: DragEvent<HTMLElement>, section: Section) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", section.id);
    setDraggedLine(null);
    setLineDropTarget(null);
    setLineMenu(null);
    setDraggedSectionId(section.id);
  }, []);

  const handleSectionDragOver = useCallback((event: DragEvent<HTMLElement>, section: Section) => {
    if (!draggedSectionId || draggedSectionId === section.id) return;
    const dragged = findSectionInTree(editTree, draggedSectionId);
    if (!dragged || sectionContains(dragged, section.id)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropTarget({ id: section.id, intent: getSectionDropIntent(event, section) });
  }, [draggedSectionId, editTree]);

  const handleSectionDrop = useCallback((event: DragEvent<HTMLElement>, section: Section) => {
    if (!draggedSectionId || draggedSectionId === section.id) return;
    event.preventDefault();
    event.stopPropagation();
    const intent = dropTarget?.id === section.id ? dropTarget.intent : getSectionDropIntent(event, section);
    applyTree(moveSectionInTree(editTree, draggedSectionId, section.id, intent));
    resetSectionDrag();
  }, [applyTree, draggedSectionId, dropTarget, editTree, resetSectionDrag]);

  const resetLineDrag = useCallback(() => {
    setDraggedLine(null);
    setLineDropTarget(null);
  }, []);

  const handleLineMouseDown = useCallback((event: React.MouseEvent<HTMLElement>, sectionId: string, lineIndex: number) => {
    const key = getLineKey(sectionId, lineIndex);
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      lineSelectingRef.current = true;
      setLineMenu(null);
      setSelectedLineKeys((current) => current.includes(key) ? current : [...current, key]);
      return;
    }

    setSelectedLineKeys([]);
  }, []);

  const handleLineMouseEnter = useCallback((event: React.MouseEvent<HTMLElement>, sectionId: string, lineIndex: number) => {
    if (!lineSelectingRef.current || event.buttons !== 1) return;
    const key = getLineKey(sectionId, lineIndex);
    setSelectedLineKeys((current) => current.includes(key) ? current : [...current, key]);
  }, []);

  const handleLineDragStart = useCallback((event: DragEvent<HTMLElement>, sectionId: string, lineIndex: number) => {
    event.stopPropagation();
    const key = getLineKey(sectionId, lineIndex);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-rits-hierarchy-line", key);
    setDraggedSectionId(null);
    setDropTarget(null);
    setLineDropTarget(null);
    setLineMenu(null);
    setDraggedLine({ sectionId, lineIndex });
    setSelectedLineKeys((current) => current.includes(key) ? current : [key]);
  }, []);

  const handleLineDragOver = useCallback((event: DragEvent<HTMLElement>, sectionId: string, lineIndex: number) => {
    if (!draggedLine && !draggedSectionId) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const intent = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropTarget(null);
    setLineDropTarget({ sectionId, lineIndex, intent });
  }, [draggedLine, draggedSectionId]);

  const handleLineDrop = useCallback((event: DragEvent<HTMLElement>, sectionId: string, lineIndex: number) => {
    const target = lineDropTarget?.sectionId === sectionId && lineDropTarget.lineIndex === lineIndex
      ? lineDropTarget
      : { sectionId, lineIndex, intent: "after" as const };

    if (draggedLine) {
      event.preventDefault();
      event.stopPropagation();
      const dragKey = getLineKey(draggedLine.sectionId, draggedLine.lineIndex);
      const selectedFromSource = selectedLineKeysRef.current
        .map(parseLineKey)
        .filter((item): item is { sectionId: string; lineIndex: number } => !!item && item.sectionId === draggedLine.sectionId)
        .map((item) => item.lineIndex);
      const sourceLineIndices = selectedLineKeysRef.current.includes(dragKey) && selectedFromSource.length
        ? selectedFromSource
        : [draggedLine.lineIndex];
      applyTree(moveContentLinesInTree(editTree, draggedLine.sectionId, sourceLineIndices, target.sectionId, target.lineIndex, target.intent));
      setSelectedLineKeys([]);
      resetLineDrag();
      return;
    }

    if (draggedSectionId) {
      event.preventDefault();
      event.stopPropagation();
      const anchorLineIndex = target.intent === "before" ? target.lineIndex - 1 : target.lineIndex;
      applyTree(moveSectionToLineInTree(editTree, draggedSectionId, target.sectionId, anchorLineIndex));
      resetSectionDrag();
    }
  }, [applyTree, draggedLine, draggedSectionId, editTree, lineDropTarget, resetLineDrag, resetSectionDrag]);

  const handleExplainSection = useCallback((section: Section) => {
    openRitsAi(`Explain this hierarchy block clearly and call out the main idea, important details, and any implied next steps.\n\n${getSectionMarkdown(section)}`);
  }, []);

  const handleOpenSectionChat = useCallback((section: Section) => {
    openRitsAi(`Use this hierarchy block as context for our chat. I may ask follow-up questions about it.\n\n${getSectionMarkdown(section)}`);
  }, []);

  const handleHistoryKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((!event.ctrlKey && !event.metaKey) || event.altKey) return;

    const key = event.key.toLowerCase();
    const isUndo = key === "z" && !event.shiftKey;
    const isRedo = (key === "z" && event.shiftKey) || key === "y";
    if (!isUndo && !isRedo) return;

    const handled = isUndo ? undo() : redo();
    if (!handled) return;
    event.preventDefault();
    event.stopPropagation();
  }, [redo, undo]);

  useEffect(() => {
    if (isInternalRef.current) return;
    const migrated = migrateIfJson(content || createDefaultHierarchyContent());
    setText((prev) => {
      if (migrated !== prev) {
        const { body } = parseFrontmatter(migrated);
        latestTextRef.current = migrated;
        undoStackRef.current = [];
        redoStackRef.current = [];
        setEditTree(parseMarkdownTree(body));
        setReadEditingSectionId(null);
        setSelectedLineKeys([]);
        setLineMenu(null);
        setDraggedLine(null);
        setLineDropTarget(null);
        return migrated;
      }
      return prev;
    });
  }, [content]);

  useEffect(() => {
    selectedLineKeysRef.current = selectedLineKeys;
  }, [selectedLineKeys]);

  useEffect(() => {
    const handleMouseUp = () => { lineSelectingRef.current = false; };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Close settings on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (!settingsPanelRef.current?.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSettings]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    commitText(next);
  }, [commitText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.defaultPrevented) return;
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget, s = ta.selectionStart;
      const val = ta.value.slice(0, s) + "  " + ta.value.slice(ta.selectionEnd);
      ta.value = val; ta.selectionStart = ta.selectionEnd = s + 2;
      commitText(val);
    }
  }, [commitText]);

  const { fm } = parseFrontmatter(text);
  const visibleTree = editTree;
  const settings = settingsValue ? settingsFromValue(settingsValue) : fallbackSettings;
  const t = settings.theme;
  const handleSettingsChange = useCallback((next: HierarchySettings) => {
    if (!settingsValue) setFallbackSettings(next);
    onSettingsValueChange?.(settingsToValue(next));
  }, [onSettingsValueChange, settingsValue]);

  const effectiveMode = mode;

  return (
    <SettingsCtx.Provider value={settings}>
      <div
        ref={editorRootRef}
        className="h-full w-full flex flex-col overflow-hidden"
        style={{ background: t.rootBg }}
        tabIndex={-1}
        onKeyDownCapture={handleHistoryKeyDown}
        onClick={() => setLineMenu(null)}
      >
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-3 py-1.5 shrink-0 relative z-[60]" ref={settingsPanelRef} style={{ background: t.tabBg, borderBottom: "1px solid " + t.tabBorder }}>
          {(["source", "hierarchy"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors capitalize cursor-pointer"
              style={{ background: mode === m ? t.levels[0].accent + "22" : "transparent", color: mode === m ? t.levels[0].accent : t.mutedText, border: "1px solid " + (mode === m ? t.levels[0].accent + "55" : "transparent") }}>
              {m === "source" ? <FileText size={12} /> : <GitBranch size={12} />} {m}
            </button>
          ))}
          {onViewModeChange ? (
            <div className="flex items-center p-0.5" style={{ background: t.rootBg, border: "1px solid " + t.faintBorder }}>
              <button
                type="button"
                onClick={() => onViewModeChange("read")}
                className="px-2.5 py-1 text-xs font-medium transition-colors"
                style={{
                  background: viewMode === "read" ? t.levels[0].accent + "28" : "transparent",
                  color: viewMode === "read" ? t.levels[0].accent : t.mutedText,
                }}
              >
                Read
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("edit")}
                className="px-2.5 py-1 text-xs font-medium transition-colors"
                style={{
                  background: viewMode === "edit" ? t.levels[0].accent + "28" : "transparent",
                  color: viewMode === "edit" ? t.levels[0].accent : t.mutedText,
                }}
              >
                Edit
              </button>
            </div>
          ) : readOnly ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium" style={{ color: t.levels[0].accent }}>
              <GitBranch size={12} /> Read
            </span>
          ) : null}
          {!readOnly && mode === "hierarchy" && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium" style={{ color: t.mutedText }}>
              <GitBranch size={12} /> Inline Edit
            </span>
          )}
          <span className="text-[10px] font-mono ml-2" style={{ color: t.mutedText }}>{visibleTree.length} section{visibleTree.length !== 1 ? "s" : ""}</span>
          {!readOnly && mode === "hierarchy" && (
            <button onClick={handleAddRootSection} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={{ color: t.levels[0].accent, border: "1px solid " + t.levels[0].accent + "55", background: t.levels[0].accent + "12" }}>
              <PlusCircle size={12} /> Root
            </button>
          )}
          <button onClick={() => setShowSettings((v) => !v)} className="ml-auto p-1.5 cursor-pointer transition-colors"
            style={{ color: showSettings ? t.levels[0].accent : t.mutedText }}>
            <Settings2 size={14} />
          </button>
          {showSettings && <SettingsPanel settings={settings} onChange={handleSettingsChange} onClose={() => setShowSettings(false)} />}
        </div>

        {/* Content */}
        {effectiveMode === "source" ? (
          <HighlightedSourceEditor value={text} onChange={handleChange} onKeyDown={handleKeyDown}
            theme={t} textSize={settings.textSize} fontFamily={settings.fontFamily} readOnly={readOnly} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="w-full flex flex-col gap-0">
              {fm && <FrontmatterCard fm={fm} />}
              {visibleTree.length === 0 ? (
                <div className="text-center py-16 text-sm" style={{ color: t.mutedText }}>
                  <GitBranch size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No headings found</p>
                  <p className="text-xs opacity-60 mt-1">Switch to Source and add # headings</p>
                </div>
              ) : readOnly
                ? visibleTree.map((s) => (
                  <SectionBox
                    key={s.id}
                    section={s}
                    depth={0}
                    readOnly
                    editingSectionId={readEditingSectionId}
                    onEditSection={setReadEditingSectionId}
                    onFinishEditing={() => setReadEditingSectionId(null)}
                    onUpdate={handleUpdateSection}
                    onDelete={handleDeleteSection}
                    onExplain={handleExplainSection}
                    onOpenChat={handleOpenSectionChat}
                  />
                ))
                : editTree.map((s) => (
                  <EditableSectionBox
                    key={s.id}
                    section={s}
                    depth={0}
                    onUpdate={handleUpdateSection}
                    onAddChild={handleAddChildToTree}
                    onAddChildAtLine={handleAddChildAtLine}
                    onConvertLineToChild={handleConvertLineToChild}
                    onDelete={handleDeleteSection}
                    onMoveStep={handleMoveSectionStep}
                    onUpdateLine={handleUpdateLine}
                    onInsertLine={handleInsertLine}
                    onSplitLine={handleSplitLine}
                    onDeleteLine={handleDeleteLine}
                    onTransformLine={handleTransformLine}
                    onLineDragStart={handleLineDragStart}
                    onLineDragOver={handleLineDragOver}
                    onLineDrop={handleLineDrop}
                    onLineDragEnd={resetLineDrag}
                    onLineMouseDown={handleLineMouseDown}
                    onLineMouseEnter={handleLineMouseEnter}
                    onOpenLineMenu={setLineMenu}
                    onDragStart={handleSectionDragStart}
                    onDragOver={handleSectionDragOver}
                    onDrop={handleSectionDrop}
                    onDragEnd={resetSectionDrag}
                    draggedSectionId={draggedSectionId}
                    dropTarget={dropTarget}
                    selectedLineKeys={selectedLineKeys}
                    lineMenu={lineMenu}
                    lineDropTarget={lineDropTarget}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </SettingsCtx.Provider>
  );
}
