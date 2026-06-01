"use client";

import { useState, useCallback, useEffect, createContext, useContext, useRef, type DragEvent } from "react";
import { FileText, GitBranch, Tag, Calendar, ChevronDown, ChevronRight, Settings2, X, PlusCircle, Trash2, Bold, Italic, Code, List, ListOrdered, Quote, Code2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";

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
const defaultSettings: HierarchySettings = { theme: THEMES[0], textSize: 12, fontFamily: "monospace" };
const SettingsCtx = createContext<HierarchySettings>(defaultSettings);

// ─── Types ───────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  level: number; // 1=# 2=## 3=### …
  title: string;
  content: string[];
  children: Section[];
}

type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "blockquote"; text: string; variant: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; lang: string; lines: string[] }
  | { type: "spacer" };

type SectionDropIntent = "before" | "after" | "inside";

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
  const flat: { level: number; title: string; content: string[] }[] = [];
  let cur: typeof flat[0] | null = null;

  for (const line of lines) {
    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      if (cur) flat.push(cur);
      cur = { level: hm[1].length, title: hm[2].trim(), content: [] };
    } else if (cur) {
      if (line.trim() || cur.content.length > 0) cur.content.push(line);
    }
  }
  if (cur) flat.push(cur);

  // Build tree
  const root: Section[] = [];
  const stack: { s: Section; level: number }[] = [];
  for (const f of flat) {
    const s: Section = { id: Math.random().toString(36).slice(2), level: f.level, title: f.title, content: f.content, children: [] };
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

function ContentBlocks({ lines }: { lines: string[] }) {
  const { theme, textSize, fontFamily } = useContext(SettingsCtx);
  const blocks = parseBlocks(lines);
  const t = theme;
  return (
    <div className="flex flex-col gap-1.5 leading-relaxed" style={{ color: t.bodyText, fontSize: `${textSize}px`, fontFamily }}>
      {blocks.map((b, i) => {
        if (b.type === "spacer") return <div key={i} className="h-1" />;
        if (b.type === "paragraph") return <p key={i} style={{ color: t.bodyText }}>{b.text}</p>;
        if (b.type === "list") return (
          <ul key={i} className="flex flex-col gap-0.5 pl-3">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-1.5" style={{ color: t.bodyText }}>
                <span className="shrink-0 mt-[5px] w-1 h-1 rounded-full" style={{ background: t.mutedText }} />{it}
              </li>
            ))}
          </ul>
        );
        if (b.type === "blockquote") return (
          <div key={i} className="flex gap-2 px-2 py-1.5" style={{ background: t.rootBg, borderLeft: "2px solid " + t.levels[1]?.accent }}>
            <span className="italic flex-1" style={{ color: t.bodyText }}>{b.text}</span>
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
  return insertSectionNearTarget(withoutDragged, targetId, intent, relevelSection(removed, level));
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

function getSectionDropIntent(event: DragEvent<HTMLElement>, section: Section): SectionDropIntent {
  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const edgeSize = rect.height * 0.25;

  if (y < edgeSize) return "before";
  if (y > rect.height - edgeSize) return "after";
  return section.level < 6 ? "inside" : "after";
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
    const body = s.content.join("\n").trim();
    if (body) r += body + "\n\n";
    for (const c of s.children) r += render(c);
    return r;
  }
  for (const s of sections) md += render(s);
  return md;
}

// ─── Mini content toolbar ─────────────────────────────────────────────────────

function MiniContentToolbar({ taRef, onApply, theme }: {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  onApply: (val: string) => void;
  theme: ThemeConfig;
}) {
  const wrap = useCallback((pre: string, suf: string) => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e);
    const next = ta.value.slice(0, s) + pre + sel + suf + ta.value.slice(e);
    onApply(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + pre.length, e + pre.length); });
  }, [onApply, taRef]);
  const linePrefix = useCallback((pre: string) => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart;
    const ls = ta.value.lastIndexOf("\n", s - 1) + 1;
    const next = ta.value.slice(0, ls) + pre + ta.value.slice(ls);
    onApply(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + pre.length, s + pre.length); });
  }, [onApply, taRef]);
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const { wrapStart, wrapEnd, linePrefix: prefix } = event.currentTarget.dataset;
    if (typeof wrapStart === "string") wrap(wrapStart, wrapEnd ?? "");
    if (typeof prefix === "string") linePrefix(prefix);
  }, [linePrefix, wrap]);
  const btn = (title: string, icon: React.ReactNode, data: { wrapStart?: string; wrapEnd?: string; linePrefix?: string }) => (
    <button key={title} onMouseDown={handleMouseDown} title={title} data-wrap-start={data.wrapStart} data-wrap-end={data.wrapEnd} data-line-prefix={data.linePrefix}
      className="flex items-center justify-center w-6 h-6 rounded transition-colors hover:opacity-80"
      style={{ color: theme.bodyText }}>
      {icon}
    </button>
  );
  return (
    <div className="flex items-center gap-0.5 mb-1.5 px-1.5 py-1 rounded" style={{ background: theme.tabBg, border: "1px solid " + theme.faintBorder }}>
      {btn("Bold", <Bold size={11} />, { wrapStart: "**", wrapEnd: "**" })}
      {btn("Italic", <Italic size={11} />, { wrapStart: "*", wrapEnd: "*" })}
      {btn("Inline code", <Code size={11} />, { wrapStart: "`", wrapEnd: "`" })}
      {btn("Code block", <Code2 size={11} />, { wrapStart: "```\n", wrapEnd: "\n```" })}
      <div className="w-px h-3 mx-0.5" style={{ background: theme.faintBorder }} />
      {btn("Bullet list", <List size={11} />, { linePrefix: "- " })}
      {btn("Numbered list", <ListOrdered size={11} />, { linePrefix: "1. " })}
      {btn("Blockquote", <Quote size={11} />, { linePrefix: "> " })}
    </div>
  );
}

// ─── Editable section box ─────────────────────────────────────────────────────

function EditableSectionBox({ section, depth, onUpdate, onAddChild, onDelete, onMoveStep, onDragStart, onDragOver, onDrop, onDragEnd, draggedSectionId, dropTarget }: {
  section: Section; depth: number;
  onUpdate: (id: string, changes: Partial<Pick<Section, "title" | "content">>) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onMoveStep: (id: string, direction: -1 | 1) => void;
  onDragStart: (event: DragEvent<HTMLElement>, section: Section) => void;
  onDragOver: (event: DragEvent<HTMLElement>, section: Section) => void;
  onDrop: (event: DragEvent<HTMLElement>, section: Section) => void;
  onDragEnd: () => void;
  draggedSectionId: string | null;
  dropTarget: { id: string; intent: SectionDropIntent } | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { theme, textSize, fontFamily } = useContext(SettingsCtx);
  const style = theme.levels[Math.min(section.level - 1, theme.levels.length - 1)];
  const contentVal = section.content.join("\n");
  const hasChildren = section.children.length > 0;
  const hasContent = section.content.some((l) => l.trim()) || focused;
  const headingSize = textSize + (section.level === 1 ? 3 : section.level === 2 ? 1 : 0);
  const activeDrop = dropTarget?.id === section.id ? dropTarget.intent : null;
  const dropStyle: React.CSSProperties = activeDrop === "inside"
    ? { boxShadow: `inset 0 0 0 2px ${style.accent}` }
    : activeDrop === "before"
      ? { borderTopColor: style.accent, borderTopWidth: 3 }
      : activeDrop === "after"
        ? { borderBottomColor: style.accent, borderBottomWidth: 3 }
        : {};

  // Auto-resize textarea
  useEffect(() => {
    if (taRef.current) { taRef.current.style.height = "auto"; taRef.current.style.height = taRef.current.scrollHeight + "px"; }
  }, [contentVal]);

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
        <button
          type="button"
          draggable
          onDragStart={(event) => onDragStart(event, section)}
          onDragEnd={onDragEnd}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-grab rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 active:cursor-grabbing"
          style={{ color: style.accent }}
          title="Drag section"
        >
          <GripVertical size={13} />
        </button>
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
        <button onClick={(e) => { e.stopPropagation(); onMoveStep(section.id, -1); }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded" style={{ color: style.accent }} title="Move up">
          <ArrowUp size={13} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveStep(section.id, 1); }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded" style={{ color: style.accent }} title="Move down">
          <ArrowDown size={13} />
        </button>
        {section.level < 6 && (
          <button onClick={(e) => { e.stopPropagation(); onAddChild(section.id); }}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded" style={{ color: style.accent }} title="Add child">
            <PlusCircle size={13} />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded" style={{ color: "#e06c75" }} title="Delete section">
          <Trash2 size={13} />
        </button>
        <button onClick={() => setCollapsed((c) => !c)} className="shrink-0 cursor-pointer">
          {collapsed ? <ChevronRight size={13} style={{ color: "#586e75" }} /> : <ChevronDown size={13} style={{ color: "#586e75" }} />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-0" style={{ background: style.bg }}>
          <div className="px-3 py-2">
            {focused && <MiniContentToolbar taRef={taRef} onApply={(val) => { onUpdate(section.id, { content: val.split("\n") }); }} theme={theme} />}
            <textarea
              ref={taRef}
              value={contentVal}
              onChange={(e) => { onUpdate(section.id, { content: e.target.value.split("\n") }); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Write content here… (supports markdown)"
              rows={1}
              className="w-full resize-none outline-none bg-transparent leading-relaxed"
              style={{ color: theme.bodyText, fontSize: `${textSize}px`, fontFamily, minHeight: 28, overflow: "hidden" }}
            />
          </div>
          {hasChildren && (
            <div className="flex flex-col gap-1" style={{ padding: "4px 8px 6px 16px" }}>
              {section.children.map((child) => (
                <EditableSectionBox
                  key={child.id}
                  section={child}
                  depth={depth + 1}
                  onUpdate={onUpdate}
                  onAddChild={onAddChild}
                  onDelete={onDelete}
                  onMoveStep={onMoveStep}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                  draggedSectionId={draggedSectionId}
                  dropTarget={dropTarget}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section box (recursive) ──────────────────────────────────────────────────

function SectionBox({ section, depth, onAddChild, readOnly }: { section: Section; depth: number; onAddChild?: (parentId: string) => void; readOnly?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, textSize, fontFamily } = useContext(SettingsCtx);
  const levels = theme.levels;
  const style = levels[Math.min(section.level - 1, levels.length - 1)];
  const hasChildren = section.children.length > 0;
  const hasContent = section.content.some((l) => l.trim());
  const headingSize = textSize + (section.level === 1 ? 3 : section.level === 2 ? 1 : 0);

  return (
    <div
      className="flex flex-col w-full border"
      style={{ borderColor: style.accent + "88", background: style.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 cursor-pointer select-none sticky group"
        style={{
          top: depth * 36,
          zIndex: 50 - depth,
          minHeight: 36,
          background: style.headerBg,
          borderBottom: (hasContent || hasChildren) && !collapsed ? "1px solid " + style.accent + "66" : "none",
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span
          className="shrink-0 text-[9px] font-bold px-1.5 py-0.5"
          style={{ background: style.accent + "33", color: style.accent, fontFamily: "monospace" }}
        >
          {style.label}
        </span>
        <span
          className="flex-1 font-semibold leading-snug truncate"
          style={{ color: style.textColor, fontSize: `${headingSize}px`, fontFamily }}
        >
          {section.title}
        </span>
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
      {!collapsed && (hasContent || hasChildren) && (
        <div className="flex flex-col gap-0" style={{ background: style.bg }}>
          {hasContent && (
            <div className="px-3 py-2">
              <ContentBlocks lines={section.content} />
            </div>
          )}
          {hasChildren && (
            <div className="flex flex-col gap-1" style={{ padding: "4px 8px 6px 16px" }}>
              {section.children.map((child) => (
                <SectionBox key={child.id} section={child} depth={depth + 1} onAddChild={onAddChild} readOnly={readOnly} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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

function HighlightedSourceEditor({ value, onChange, onKeyDown, theme, textSize, fontFamily }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  theme: ThemeConfig; textSize: number; fontFamily: string;
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
        spellCheck={false}
      />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────

interface HierarchyFileEditorProps { content: string; onChange: (value: string) => void; readOnly?: boolean; }

export function HierarchyFileEditor({ content, onChange, readOnly = false }: HierarchyFileEditorProps) {
  const [mode, setMode] = useState<"source" | "hierarchy">("hierarchy");
  const [settings, setSettings] = useState<HierarchySettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [text, setText] = useState(() => migrateIfJson(content || createDefaultHierarchyContent()));
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  // ── Edit-mode tree state ──────────────────────────────────────────────
  const [editTree, setEditTree] = useState<Section[]>(() => parseMarkdownTree(parseFrontmatter(migrateIfJson(content || createDefaultHierarchyContent())).body));
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; intent: SectionDropIntent } | null>(null);
  const isInternalRef = useRef(false);

  const applyTree = useCallback((next: Section[]) => {
    setEditTree(next);
    const { fm: curFm } = parseFrontmatter(text);
    const newMd = treeToMarkdown(next, curFm);
    isInternalRef.current = true;
    setText(newMd);
    onChange(newMd);
    requestAnimationFrame(() => { isInternalRef.current = false; });
  }, [onChange, text]);

  const handleUpdateSection = useCallback((id: string, changes: Partial<Pick<Section, "title" | "content">>) => {
    setEditTree((prev) => {
      const next = updateSectionInTree(prev, id, changes);
      const { fm: curFm } = parseFrontmatter(text);
      const newMd = treeToMarkdown(next, curFm);
      isInternalRef.current = true;
      setText(newMd);
      onChange(newMd);
      requestAnimationFrame(() => { isInternalRef.current = false; });
      return next;
    });
  }, [onChange, text]);

  const handleDeleteSection = useCallback((id: string) => {
    applyTree(deleteSectionFromTree(editTree, id));
  }, [applyTree, editTree]);

  const handleAddChildToTree = useCallback((parentId: string) => {
    const parent = findSectionInTree(editTree, parentId);
    if (!parent) return;
    const child: Section = { id: Math.random().toString(36).slice(2), level: Math.min(parent.level + 1, 6), title: "New Section", content: ["Content goes here."], children: [] };
    applyTree(addChildToSection(editTree, parentId, child));
  }, [applyTree, editTree]);

  const handleAddRootSection = useCallback(() => {
    const root: Section = { id: Math.random().toString(36).slice(2), level: 1, title: "New Section", content: ["Content goes here."], children: [] };
    applyTree([...editTree, root]);
  }, [applyTree, editTree]);

  const handleMoveSectionStep = useCallback((id: string, direction: -1 | 1) => {
    applyTree(moveSectionByStep(editTree, id, direction));
  }, [applyTree, editTree]);

  const resetSectionDrag = useCallback(() => {
    setDraggedSectionId(null);
    setDropTarget(null);
  }, []);

  const handleSectionDragStart = useCallback((event: DragEvent<HTMLElement>, section: Section) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", section.id);
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

  useEffect(() => {
    if (isInternalRef.current) return;
    const migrated = migrateIfJson(content || createDefaultHierarchyContent());
    setText((prev) => {
      if (migrated !== prev) {
        const { body } = parseFrontmatter(migrated);
        setEditTree(parseMarkdownTree(body));
        return migrated;
      }
      return prev;
    });
  }, [content]);

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
    setText(next);
    setEditTree(parseMarkdownTree(parseFrontmatter(next).body));
    onChange(next);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget, s = ta.selectionStart;
      const val = ta.value.slice(0, s) + "  " + ta.value.slice(ta.selectionEnd);
      ta.value = val; ta.selectionStart = ta.selectionEnd = s + 2;
      setText(val);
      setEditTree(parseMarkdownTree(parseFrontmatter(val).body));
      onChange(val);
    }
  }, [onChange]);

  const { fm, body } = parseFrontmatter(text);
  const tree = parseMarkdownTree(body);
  const visibleTree = readOnly ? tree : editTree;
  const t = settings.theme;

  // In readOnly mode, force hierarchy view
  const effectiveMode = readOnly ? "hierarchy" : mode;

  return (
    <SettingsCtx.Provider value={settings}>
      <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: t.rootBg }}>
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-3 py-1.5 shrink-0 relative z-[60]" ref={settingsPanelRef} style={{ background: t.tabBg, borderBottom: "1px solid " + t.tabBorder }}>
          {!readOnly && (["source", "hierarchy"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors capitalize cursor-pointer"
              style={{ background: mode === m ? t.levels[0].accent + "22" : "transparent", color: mode === m ? t.levels[0].accent : t.mutedText, border: "1px solid " + (mode === m ? t.levels[0].accent + "55" : "transparent") }}>
              {m === "source" ? <FileText size={12} /> : <GitBranch size={12} />} {m}
            </button>
          ))}
          {readOnly && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium" style={{ color: t.levels[0].accent }}>
              <GitBranch size={12} /> Read Only
            </span>
          )}
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
          {!readOnly && (
            <button onClick={() => setShowSettings((v) => !v)} className="ml-auto p-1.5 cursor-pointer transition-colors"
              style={{ color: showSettings ? t.levels[0].accent : t.mutedText }}>
              <Settings2 size={14} />
            </button>
          )}
          {!readOnly && showSettings && <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />}
        </div>

        {/* Content */}
        {effectiveMode === "source" ? (
          <HighlightedSourceEditor value={text} onChange={handleChange} onKeyDown={handleKeyDown}
            theme={t} textSize={settings.textSize} fontFamily={settings.fontFamily} />
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
                ? tree.map((s) => <SectionBox key={s.id} section={s} depth={0} readOnly />) 
                : editTree.map((s) => (
                  <EditableSectionBox
                    key={s.id}
                    section={s}
                    depth={0}
                    onUpdate={handleUpdateSection}
                    onAddChild={handleAddChildToTree}
                    onDelete={handleDeleteSection}
                    onMoveStep={handleMoveSectionStep}
                    onDragStart={handleSectionDragStart}
                    onDragOver={handleSectionDragOver}
                    onDrop={handleSectionDrop}
                    onDragEnd={resetSectionDrag}
                    draggedSectionId={draggedSectionId}
                    dropTarget={dropTarget}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </SettingsCtx.Provider>
  );
}
