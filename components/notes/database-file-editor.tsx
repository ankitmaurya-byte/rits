"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  Check,
  Circle,
  Copy,
  Diamond,
  Download,
  History,
  Image as ImageIcon,
  Link2,
  Mail,
  Maximize2,
  MoreHorizontal,
  Move,
  Phone,
  Plus,
  Redo2,
  Square,
  Tag,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DATABASE_FILE_TYPE = "rits.database-file";
const DATABASE_VERSION = 1;
const MIN_BLOCK_SIZE = 36;

type DatabaseBlockKind = "text" | "textarea" | "url" | "image" | "email" | "phone" | "badge";
type DatabaseBlockShape = "rectangle" | "rounded" | "pill" | "circle" | "diamond";
type DatabaseEditorMode = "view" | "design";
type DatabaseImportMode = "append" | "replace" | "merge";
type DatabaseKeyRole = "primary" | "foreign";

type DatabaseBlock = {
  id: string;
  label: string;
  fieldKey: string;
  kind: DatabaseBlockKind;
  shape: DatabaseBlockShape;
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  keyRole?: DatabaseKeyRole;
  foreignReference?: string;
  stored?: boolean;
};

type DatabaseRow = {
  id: string;
  values: Record<string, string>;
};

export type DatabaseFileContent = {
  ritsFileType: typeof DATABASE_FILE_TYPE;
  version: number;
  rowWidth: number;
  rowHeight: number;
  rowGap: number;
  fitRows: boolean;
  blocks: DatabaseBlock[];
  rows: DatabaseRow[];
};

type DatabaseFileEditorProps = {
  content: string;
  onChange: (content: string) => void;
};

type BlockInteraction = {
  blockIds: string[];
  mode: "move" | "resize" | "marquee";
  startClientX: number;
  startClientY: number;
  startBlocks: DatabaseBlock[];
  startDatabase: DatabaseFileContent;
  startSelectedIds?: Set<string>;
};

type CellContextMenu = {
  rowId: string;
  blockId: string;
  x: number;
  y: number;
};

type ImportedRow = {
  id?: string;
  values: Record<string, string>;
};

const BLOCK_KIND_OPTIONS: Array<{ kind: DatabaseBlockKind; label: string; icon: typeof Type }> = [
  { kind: "text", label: "Text", icon: Type },
  { kind: "textarea", label: "Area", icon: Type },
  { kind: "url", label: "URL", icon: Link2 },
  { kind: "image", label: "Image", icon: ImageIcon },
  { kind: "email", label: "Email", icon: Mail },
  { kind: "phone", label: "Phone", icon: Phone },
  { kind: "badge", label: "Badge", icon: Tag },
];

const SHAPE_OPTIONS: Array<{ shape: DatabaseBlockShape; label: string; icon: typeof Square }> = [
  { shape: "rectangle", label: "Box", icon: Square },
  { shape: "rounded", label: "Soft", icon: Square },
  { shape: "pill", label: "Pill", icon: Maximize2 },
  { shape: "circle", label: "Circle", icon: Circle },
  { shape: "diamond", label: "Diamond", icon: Diamond },
];

const ACCENTS = [
  "var(--accent-blue)",
  "var(--accent-green)",
  "var(--accent-orange)",
  "var(--accent-yellow)",
  "var(--accent-purple)",
  "var(--accent-red)",
  "var(--charcoal)",
];

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function slugify(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "field";
}

function uniqueFieldKey(label: string, blocks: DatabaseBlock[]) {
  const base = slugify(label);
  const used = new Set(blocks.map((block) => block.fieldKey));
  if (!used.has(base)) return base;

  let index = 2;
  while (used.has(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}

function checkOverlap(b1: { x: number; y: number; w: number; h: number }, b2: { x: number; y: number; w: number; h: number }) {
  return b1.x < b2.x + b2.w && b1.x + b1.w > b2.x && b1.y < b2.y + b2.h && b1.y + b1.h > b2.y;
}

function findFreeSpot(blocks: DatabaseBlock[], ignoreId: string, startX: number, startY: number, w: number, h: number) {
  let x = Math.max(0, startX);
  let y = Math.max(0, startY);

  let colliding = true;
  let iters = 0;
  while (colliding && iters < 100) {
    colliding = false;
    for (const b of blocks) {
      if (b.id === ignoreId) continue;
      if (checkOverlap({ x, y, w, h }, b)) {
        colliding = true;
        const pushRight = b.x + b.w - x;
        const pushLeft = x + w - b.x;
        const pushDown = b.y + b.h - y;
        const pushUp = y + h - b.y;

        const min = Math.min(pushRight, pushLeft, pushDown, pushUp);
        if (min === pushRight) x = b.x + b.w + 1;
        else if (min === pushLeft) x = Math.max(0, b.x - w - 1);
        else if (min === pushDown) y = b.y + b.h + 1;
        else if (min === pushUp) y = Math.max(0, b.y - h - 1);
      }
    }
    iters++;
  }
  return { x: Math.round(x), y: Math.round(y) };
}

function getSnap(val: number, size: number, max: number, blocks: DatabaseBlock[], ignoreId: string, isX: boolean) {
  const threshold = 12;
  const targets = new Set<number>([0, max / 2]);

  for (const b of blocks) {
    if (b.id === ignoreId) continue;
    if (isX) {
      targets.add(b.x);
      targets.add(b.x + b.w / 2);
      targets.add(b.x + b.w);
      targets.add(b.x + b.w + 16);
      targets.add(b.x - 16);
    } else {
      targets.add(b.y);
      targets.add(b.y + b.h / 2);
      targets.add(b.y + b.h);
      targets.add(b.y + b.h + 16);
      targets.add(b.y - 16);
    }
  }

  let bestVal = val;
  let snapLine: number | undefined;
  let minDist = threshold;

  for (const t of targets) {
    if (Math.abs(val - t) < minDist) {
      minDist = Math.abs(val - t);
      bestVal = t;
      snapLine = t;
    }
  }
  const center = val + size / 2;
  for (const t of targets) {
    if (Math.abs(center - t) < minDist) {
      minDist = Math.abs(center - t);
      bestVal = t - size / 2;
      snapLine = t;
    }
  }
  const right = val + size;
  for (const t of targets) {
    if (Math.abs(right - t) < minDist) {
      minDist = Math.abs(right - t);
      bestVal = t - size;
      snapLine = t;
    }
  }
  return { value: bestVal, line: snapLine };
}

function serializeDatabaseContent(database: DatabaseFileContent) {
  return JSON.stringify({
    ...database,
    ritsFileType: DATABASE_FILE_TYPE,
    version: DATABASE_VERSION,
  });
}

function createDefaultDatabase(): DatabaseFileContent {
  const blocks: DatabaseBlock[] = [
    { id: createId("block"), label: "Name", fieldKey: "name", kind: "text", shape: "rounded", x: 16, y: 16, w: 204, h: 44, accent: "var(--accent-blue)", keyRole: "primary" },
    { id: createId("block"), label: "LinkedIn", fieldKey: "linkedin", kind: "url", shape: "rounded", x: 232, y: 16, w: 612, h: 44, accent: "var(--accent-blue)" },
    { id: createId("block"), label: "Notes", fieldKey: "notes", kind: "textarea", shape: "rectangle", x: 16, y: 76, w: 190, h: 168, accent: "var(--charcoal)" },
    { id: createId("block"), label: "Email", fieldKey: "email", kind: "email", shape: "pill", x: 222, y: 78, w: 168, h: 48, accent: "var(--accent-green)" },
    { id: createId("block"), label: "Phone", fieldKey: "phone", kind: "phone", shape: "pill", x: 402, y: 78, w: 150, h: 48, accent: "var(--accent-orange)" },
    { id: createId("block"), label: "YC", fieldKey: "yc", kind: "badge", shape: "rounded", x: 222, y: 140, w: 330, h: 72, accent: "var(--accent-yellow)" },
    { id: createId("block"), label: "Co-founder match", fieldKey: "cofounder_matching", kind: "url", shape: "diamond", x: 586, y: 84, w: 116, h: 116, accent: "var(--accent-purple)" },
    { id: createId("block"), label: "Other link", fieldKey: "other_link", kind: "url", shape: "diamond", x: 724, y: 84, w: 116, h: 116, accent: "var(--accent-blue)" },
    { id: createId("block"), label: "Avatar", fieldKey: "avatar", kind: "image", shape: "rounded", x: 586, y: 216, w: 254, h: 46, accent: "var(--accent-green)" },
    { id: createId("block"), label: "Tags", fieldKey: "tags", kind: "badge", shape: "rounded", x: 222, y: 224, w: 330, h: 38, accent: "var(--accent-red)" },
  ];

  return {
    ritsFileType: DATABASE_FILE_TYPE,
    version: DATABASE_VERSION,
    rowWidth: 860,
    rowHeight: 280,
    rowGap: 18,
    fitRows: true,
    blocks,
    rows: [
      {
        id: createId("row"),
        values: {
          name: "Founder name",
          linkedin: "https://linkedin.com/in/founder",
          notes: "Short context, status, intro notes, or anything else you want visible for this person.",
          email: "founder@example.com",
          phone: "+1 555 012 3400",
          yc: "YC S24",
          cofounder_matching: "https://www.ycombinator.com/co-founder-matching",
          other_link: "https://example.com",
          avatar: "",
          tags: "AI, B2B, warm intro",
        },
      },
    ],
  };
}

function normalizeDatabaseContent(value: Partial<DatabaseFileContent> | null): DatabaseFileContent {
  const fallback = createDefaultDatabase();
  if (!value || value.ritsFileType !== DATABASE_FILE_TYPE) return fallback;

  const blocks = Array.isArray(value.blocks) && value.blocks.length > 0
    ? value.blocks.map((block, index) => ({
      id: typeof block.id === "string" ? block.id : createId("block"),
      label: typeof block.label === "string" ? block.label : `Field ${index + 1}`,
      fieldKey: typeof block.fieldKey === "string" ? block.fieldKey : `field_${index + 1}`,
      kind: isBlockKind(block.kind) ? block.kind : "text",
      shape: isBlockShape(block.shape) ? block.shape : "rounded",
      x: Math.max(0, Number(block.x) || 0),
      y: Math.max(0, Number(block.y) || 0),
      w: Math.max(MIN_BLOCK_SIZE, Number(block.w) || MIN_BLOCK_SIZE),
      h: Math.max(MIN_BLOCK_SIZE, Number(block.h) || MIN_BLOCK_SIZE),
      accent: typeof block.accent === "string" ? block.accent : ACCENTS[index % ACCENTS.length],
      keyRole: isKeyRole(block.keyRole) ? block.keyRole : undefined,
      foreignReference: typeof block.foreignReference === "string" ? block.foreignReference : undefined,
      stored: Boolean(block.stored),
    }))
    : fallback.blocks;

  const rows = Array.isArray(value.rows)
    ? value.rows.map((row) => ({
      id: typeof row.id === "string" ? row.id : createId("row"),
      values: row.values && typeof row.values === "object" ? row.values : {},
    }))
    : fallback.rows;

  return {
    ritsFileType: DATABASE_FILE_TYPE,
    version: DATABASE_VERSION,
    rowWidth: Math.max(360, Number(value.rowWidth) || 860),
    rowHeight: Math.max(160, Number(value.rowHeight) || 280),
    rowGap: clampNumber(Number(value.rowGap), 6, 96),
    fitRows: typeof value.fitRows === "boolean" ? value.fitRows : true,
    blocks,
    rows,
  };
}

function isBlockKind(value: unknown): value is DatabaseBlockKind {
  return value === "text" || value === "textarea" || value === "url" || value === "image" || value === "email" || value === "phone" || value === "badge";
}

function isBlockShape(value: unknown): value is DatabaseBlockShape {
  return value === "rectangle" || value === "rounded" || value === "pill" || value === "circle" || value === "diamond";
}

function isKeyRole(value: unknown): value is DatabaseKeyRole {
  return value === "primary" || value === "foreign";
}

export function parseDatabaseContent(content: string) {
  if (!content.trim()) return createDefaultDatabase();

  try {
    return normalizeDatabaseContent(JSON.parse(content) as Partial<DatabaseFileContent>);
  } catch {
    return createDefaultDatabase();
  }
}

export function isDatabaseFileContent(content: string) {
  if (!content.trim().startsWith("{")) return false;

  try {
    const parsed = JSON.parse(content) as Partial<DatabaseFileContent>;
    return parsed.ritsFileType === DATABASE_FILE_TYPE;
  } catch {
    return false;
  }
}

export function createDefaultDatabaseContent() {
  return serializeDatabaseContent(createDefaultDatabase());
}

export function getDatabasePreviewText(content: string) {
  const database = parseDatabaseContent(content);
  const rowCount = database.rows.length;
  const fields = database.blocks.slice(0, 4).map((block) => block.label).join(", ");
  return `${rowCount} ${rowCount === 1 ? "row" : "rows"} · ${fields || "Database"}`;
}

function toHref(value: string, kind: DatabaseBlockKind) {
  const trimmed = value.trim();
  if (!trimmed) return "#";
  if (kind === "email") return trimmed.startsWith("mailto:") ? trimmed : `mailto:${trimmed}`;
  if (kind === "phone") return trimmed.startsWith("tel:") ? trimmed : `tel:${trimmed.replace(/\s+/g, "")}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatUrlLabel(value: string) {
  return value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

function getShapeStyle(shape: DatabaseBlockShape): CSSProperties {
  if (shape === "rectangle") return { borderRadius: "0px" };
  if (shape === "rounded") return { borderRadius: "8px" };
  if (shape === "pill") return { borderRadius: "999px" };
  if (shape === "circle") return { borderRadius: "999px", aspectRatio: "1 / 1" };
  return { borderRadius: "0px", clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" };
}

function safeBackgroundUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return `url("${trimmed.replace(/"/g, "%22")}")`;
}

function getBlockPositionStyle(block: DatabaseBlock): CSSProperties {
  return {
    left: `${block.x}px`,
    top: `${block.y}px`,
    width: `${block.w}px`,
    height: `${block.h}px`,
  };
}

function getBlockTextStyle(block: DatabaseBlock): CSSProperties {
  const lineHeight = 16;
  const maxLines = Math.max(1, Math.floor(Math.max(lineHeight, block.h - 12) / lineHeight));

  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: maxLines,
    lineHeight: `${lineHeight}px`,
    maxWidth: "100%",
    overflow: "hidden",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: block.kind === "textarea" ? "pre-wrap" : "normal",
  };
}

function valueToString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getUniqueHeaders(records: Array<Record<string, unknown>>) {
  const headers: string[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (key === "_rowId" || seen.has(key)) continue;
      seen.add(key);
      headers.push(key);
    }
  }

  return headers;
}

function inferKindFromHeader(header: string): DatabaseBlockKind {
  const normalized = header.toLowerCase();
  if (normalized.includes("url") || normalized.includes("link") || normalized.includes("linkedin") || normalized.includes("website")) return "url";
  if (normalized.includes("email")) return "email";
  if (normalized.includes("phone") || normalized.includes("mobile") || normalized.includes("whatsapp")) return "phone";
  if (normalized.includes("image") || normalized.includes("avatar") || normalized.includes("photo")) return "image";
  if (normalized.includes("tag") || normalized.includes("status") || normalized.includes("batch")) return "badge";
  if (normalized.includes("note") || normalized.includes("description") || normalized.includes("bio")) return "textarea";
  return "text";
}

function findBlockForHeader(blocks: DatabaseBlock[], header: string) {
  const normalized = slugify(header);
  return blocks.find((block) => (
    block.fieldKey === header ||
    block.fieldKey === normalized ||
    block.label === header ||
    slugify(block.label) === normalized
  ));
}

function createBlockForHeader(header: string, fieldKey: string, index: number, rowWidth: number): DatabaseBlock {
  const kind = inferKindFromHeader(header);
  const columns = 3;
  const gap = 12;
  const y = 16 + Math.floor(index / columns) * 64;
  const w = 180;
  const x = 16 + (index % columns) * 200;
  const h = kind === "textarea" ? 92 : kind === "image" ? 76 : 48;

  return {
    id: createId("block"),
    label: header,
    fieldKey,
    kind,
    shape: kind === "badge" ? "pill" : "rounded",
    x,
    y,
    w,
    h,
    accent: ACCENTS[index % ACCENTS.length],
  };
}

function ensureBlocksForHeaders(blocks: DatabaseBlock[], headers: string[], rowWidth: number) {
  const nextBlocks = [...blocks];
  const headerToFieldKey = new Map<string, string>();

  for (const header of headers) {
    const existing = findBlockForHeader(nextBlocks, header);
    if (existing) {
      headerToFieldKey.set(header, existing.fieldKey);
      continue;
    }

    const fieldKey = uniqueFieldKey(header, nextBlocks);
    const block = createBlockForHeader(header, fieldKey, nextBlocks.length, rowWidth);
    nextBlocks.push(block);
    headerToFieldKey.set(header, fieldKey);
  }

  return { blocks: nextBlocks, headerToFieldKey };
}

function ensureBlocksForImportedBlocks(blocks: DatabaseBlock[], importedBlocks: DatabaseBlock[], rowWidth: number) {
  const nextBlocks = [...blocks];
  const fieldKeyMap = new Map<string, string>();

  for (const importedBlock of importedBlocks) {
    const existing = findBlockForHeader(nextBlocks, importedBlock.fieldKey) ?? findBlockForHeader(nextBlocks, importedBlock.label);
    if (existing) {
      fieldKeyMap.set(importedBlock.fieldKey, existing.fieldKey);
      continue;
    }

    const fieldKey = nextBlocks.some((block) => block.fieldKey === importedBlock.fieldKey)
      ? uniqueFieldKey(importedBlock.label, nextBlocks)
      : importedBlock.fieldKey;
    const importedKeyRole = importedBlock.keyRole === "primary" && nextBlocks.some((block) => block.keyRole === "primary")
      ? undefined
      : importedBlock.keyRole;

    nextBlocks.push({
      ...importedBlock,
      id: createId("block"),
      fieldKey,
      keyRole: importedKeyRole,
      x: Math.max(0, importedBlock.x),
    });
    fieldKeyMap.set(importedBlock.fieldKey, fieldKey);
  }

  return { blocks: nextBlocks, fieldKeyMap };
}

function ensureRowHeight(database: DatabaseFileContent) {
  const requiredHeight = database.blocks.reduce((height, block) => Math.max(height, block.y + block.h + 16), database.rowHeight);
  return { ...database, rowHeight: Math.max(database.rowHeight, requiredHeight) };
}

function remapRowValues(values: Record<string, string>, fieldKeyMap: Map<string, string>) {
  const nextValues: Record<string, string> = {};
  for (const [fieldKey, value] of Object.entries(values)) {
    nextValues[fieldKeyMap.get(fieldKey) ?? fieldKey] = value;
  }
  return nextValues;
}

function getPrimaryFieldKey(blocks: DatabaseBlock[]) {
  return blocks.find((block) => block.keyRole === "primary")?.fieldKey;
}

function mergeRows(currentRows: DatabaseRow[], importedRows: ImportedRow[], primaryFieldKey?: string) {
  const rows = currentRows.map((row) => ({ ...row, values: { ...row.values } }));
  const indexById = new Map(rows.map((row, index) => [row.id, index]));
  const indexByPrimary = new Map<string, number>();

  if (primaryFieldKey) {
    rows.forEach((row, index) => {
      const value = row.values[primaryFieldKey]?.trim().toLowerCase();
      if (value && !indexByPrimary.has(value)) indexByPrimary.set(value, index);
    });
  }

  for (const importedRow of importedRows) {
    const primaryValue = primaryFieldKey ? importedRow.values[primaryFieldKey]?.trim().toLowerCase() : "";
    const existingIndex = importedRow.id && indexById.has(importedRow.id)
      ? indexById.get(importedRow.id)
      : primaryValue ? indexByPrimary.get(primaryValue) : undefined;

    if (existingIndex !== undefined) {
      const existing = rows[existingIndex];
      const nonEmptyValues = Object.fromEntries(Object.entries(importedRow.values).filter(([, value]) => value !== ""));
      rows[existingIndex] = { ...existing, values: { ...existing.values, ...nonEmptyValues } };
      continue;
    }

    const rowId = importedRow.id && !indexById.has(importedRow.id) ? importedRow.id : createId("row");
    indexById.set(rowId, rows.length);
    if (primaryValue) indexByPrimary.set(primaryValue, rows.length);
    rows.push({ id: rowId, values: importedRow.values });
  }

  return rows;
}

function applyImportedRows(current: DatabaseFileContent, importedRows: ImportedRow[], importMode: DatabaseImportMode, primaryFieldKey?: string) {
  if (importMode === "replace") {
    return ensureRowHeight({ ...current, rows: importedRows.map((row) => ({ id: row.id ?? createId("row"), values: row.values })) });
  }

  if (importMode === "merge") {
    return ensureRowHeight({ ...current, rows: mergeRows(current.rows, importedRows, primaryFieldKey) });
  }

  return ensureRowHeight({
    ...current,
    rows: [
      ...current.rows,
      ...importedRows.map((row) => ({ id: createId("row"), values: row.values })),
    ],
  });
}

function recordsToImportedRows(records: Array<Record<string, unknown>>, headers: string[], headerToFieldKey: Map<string, string>) {
  return records.map((record) => ({
    id: typeof record._rowId === "string" && record._rowId.trim() ? record._rowId.trim() : undefined,
    values: Object.fromEntries(headers.map((header) => [headerToFieldKey.get(header) ?? slugify(header), valueToString(record[header])])),
  }));
}

function applyRecordImport(current: DatabaseFileContent, records: Array<Record<string, unknown>>, importMode: DatabaseImportMode) {
  const headers = getUniqueHeaders(records);
  if (headers.length === 0) throw new Error("No import columns found.");

  const { blocks, headerToFieldKey } = ensureBlocksForHeaders(current.blocks, headers, current.rowWidth);
  const importedFieldKeys = new Set(headerToFieldKey.values());
  const currentPrimaryFieldKey = getPrimaryFieldKey(blocks);
  const primaryFieldKey = currentPrimaryFieldKey && importedFieldKeys.has(currentPrimaryFieldKey)
    ? currentPrimaryFieldKey
    : headerToFieldKey.get(headers[0]);
  const importedRows = recordsToImportedRows(records, headers, headerToFieldKey);

  return applyImportedRows({ ...current, blocks }, importedRows, importMode, primaryFieldKey);
}

function applyDatabaseImport(current: DatabaseFileContent, imported: DatabaseFileContent, importMode: DatabaseImportMode) {
  if (importMode === "replace") return ensureRowHeight(imported);

  const { blocks, fieldKeyMap } = ensureBlocksForImportedBlocks(current.blocks, imported.blocks, current.rowWidth);
  const importedPrimaryFieldKey = getPrimaryFieldKey(imported.blocks);
  const currentPrimaryFieldKey = getPrimaryFieldKey(blocks);
  const importedMappedFieldKeys = new Set(fieldKeyMap.values());
  const primaryFieldKey = importedPrimaryFieldKey
    ? fieldKeyMap.get(importedPrimaryFieldKey)
    : currentPrimaryFieldKey && importedMappedFieldKeys.has(currentPrimaryFieldKey)
      ? currentPrimaryFieldKey
      : undefined;
  const importedRows = imported.rows.map((row) => ({
    id: row.id,
    values: remapRowValues(row.values, fieldKeyMap),
  }));

  return applyImportedRows({ ...current, blocks }, importedRows, importMode, primaryFieldKey);
}

function applyJsonImport(current: DatabaseFileContent, text: string, importMode: DatabaseImportMode) {
  const parsed = JSON.parse(text) as unknown;

  if (Array.isArray(parsed)) {
    return applyRecordImport(current, parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)), importMode);
  }

  if (!parsed || typeof parsed !== "object") throw new Error("JSON import must be an object or array.");
  const record = parsed as Record<string, unknown>;

  if (Array.isArray(record.rows) || Array.isArray(record.blocks) || record.ritsFileType === DATABASE_FILE_TYPE) {
    return applyDatabaseImport(current, normalizeDatabaseContent({ ...record, ritsFileType: DATABASE_FILE_TYPE } as Partial<DatabaseFileContent>), importMode);
  }

  return applyRecordImport(current, [record], importMode);
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function databaseToCsv(database: DatabaseFileContent) {
  const headers = ["_rowId", ...database.blocks.map((block) => block.label || block.fieldKey)];
  const lines = [
    headers,
    ...database.rows.map((row) => [
      row.id,
      ...database.blocks.map((block) => row.values[block.fieldKey] ?? ""),
    ]),
  ];

  return lines.map((line) => line.map((cell) => escapeCsvCell(valueToString(cell))).join(",")).join("\n");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((item) => item.some((value) => value.trim() !== ""));
}

function csvToRecords(text: string) {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error("CSV file is empty.");

  const headers = rows[0].map((header, index) => header.trim() || `field_${index + 1}`);
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function applyCsvImport(current: DatabaseFileContent, text: string, importMode: DatabaseImportMode) {
  return applyRecordImport(current, csvToRecords(text), importMode);
}

function downloadTextFile(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function timestampForFilename() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function DatabaseFileEditor({ content, onChange }: DatabaseFileEditorProps) {
  const [editorState, setEditorState] = useState(() => ({
    sourceContent: content,
    database: parseDatabaseContent(content),
  }));
  const [mode, setMode] = useState<DatabaseEditorMode>("view");
  const [importDialogFormat, setImportDialogFormat] = useState<"json" | "csv" | null>(null);
  const [importDialogMode, setImportDialogMode] = useState<DatabaseImportMode>("append");
  const [importDialogFile, setImportDialogFile] = useState<File | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set(editorState.database.blocks[0] ? [editorState.database.blocks[0].id] : []));
  const [marquee, setMarquee] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<CellContextMenu | null>(null);
  const [cellDraftState, setCellDraftState] = useState({ key: "", value: "" });
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [snapGuides, setSnapGuides] = useState<{ x?: number, y?: number } | null>(null);
  const [history, setHistory] = useState<{ past: { db: DatabaseFileContent, desc: string }[], future: { db: DatabaseFileContent, desc: string }[] }>({ past: [], future: [] });
  const [widthInput, setWidthInput] = useState(editorState.database.rowWidth?.toString() || "360");
  const [heightInput, setHeightInput] = useState(editorState.database.rowHeight?.toString() || "160");
  const [storeHovered, setStoreHovered] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const databaseRef = useRef(editorState.database);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<BlockInteraction | null>(null);
  const openLinkTimerRef = useRef<number | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setWidthInput(editorState.database.rowWidth?.toString() || "360");
    setHeightInput(editorState.database.rowHeight?.toString() || "160");
  }, [editorState.database.rowWidth, editorState.database.rowHeight]);
  let database = editorState.database;
  if (editorState.sourceContent !== content) {
    const next = parseDatabaseContent(content);
    database = next;
    setEditorState({ sourceContent: content, database: next });
  }

  useEffect(() => {
    databaseRef.current = database;
  }, [database]);

  useEffect(() => {
    return () => {
      if (openLinkTimerRef.current) window.clearTimeout(openLinkTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menu = contextMenuRef.current;
      if (menu && event.target instanceof Node && menu.contains(event.target)) return;
      setContextMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContextMenu(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);


  const selectedBlock = useMemo(
    () => {
      if (selectedBlockIds.size === 0) return null;
      const firstId = Array.from(selectedBlockIds)[0];
      return database.blocks.find((block) => block.id === firstId) ?? null;
    },
    [database.blocks, selectedBlockIds],
  );

  const activeCell = useMemo(() => {
    if (!contextMenu) return null;
    const row = database.rows.find((item) => item.id === contextMenu.rowId) ?? null;
    const block = database.blocks.find((item) => item.id === contextMenu.blockId) ?? null;
    if (!row || !block) return null;
    return { row, block, value: row.values[block.fieldKey] ?? "" };
  }, [contextMenu, database.blocks, database.rows]);

  const cellDraftKey = activeCell ? `${activeCell.row.id}:${activeCell.block.id}:${activeCell.value}` : "";
  const cellDraft = cellDraftState.key === cellDraftKey ? cellDraftState.value : activeCell?.value ?? "";
  const setCellDraft = (value: string) => setCellDraftState({ key: cellDraftKey, value });

  const openCellContextMenu = (event: ReactMouseEvent<HTMLDivElement>, block: DatabaseBlock, row?: DatabaseRow) => {
    if (mode !== "view" || !row) return;
    event.preventDefault();
    event.stopPropagation();
    clearPendingLinkOpen();
    setContextMenu({
      rowId: row.id,
      blockId: block.id,
      x: Math.max(12, Math.min(event.clientX, window.innerWidth - 336)),
      y: Math.max(12, Math.min(event.clientY, window.innerHeight - 440)),
    });
  };

  const clearPendingLinkOpen = () => {
    if (!openLinkTimerRef.current) return;
    window.clearTimeout(openLinkTimerRef.current);
    openLinkTimerRef.current = null;
  };

  const scheduleBlockLinkOpen = (block: DatabaseBlock, row: DatabaseRow) => {
    if (block.kind !== "url" && block.kind !== "email" && block.kind !== "phone") return;

    const value = (row.values[block.fieldKey] ?? "").trim();
    if (!value) return;

    clearPendingLinkOpen();
    openLinkTimerRef.current = window.setTimeout(() => {
      const href = toHref(value, block.kind);
      if (block.kind === "url") {
        window.open(href, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = href;
      }
      openLinkTimerRef.current = null;
    }, 220);
  };

  const updateDatabase = useCallback((updater: (current: DatabaseFileContent) => DatabaseFileContent, commitDesc: string | false = "Update database") => {
    setEditorState((prev) => {
      const next = updater(prev.database);
      if (commitDesc) {
        setHistory(h => ({ past: [...h.past, { db: prev.database, desc: commitDesc }].slice(-50), future: [] }));
      }
      databaseRef.current = next;
      return { ...prev, database: next };
    });
  }, []);

  const applyCanvasResize = () => {
    const w = parseInt(widthInput, 10);
    const h = parseInt(heightInput, 10);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;

    if (w !== databaseRef.current.rowWidth || h !== databaseRef.current.rowHeight) {
      updateDatabase((current) => {
        let nextBlocks = [...current.blocks];
        nextBlocks = nextBlocks.map(b => {
          if (!b.stored && (b.x + b.w > w || b.y + b.h > h)) {
            return { ...b, stored: true };
          }
          return b;
        });
        return { ...current, rowWidth: w, rowHeight: h, blocks: nextBlocks };
      }, "Resize canvas");
    }
  };

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      const currentDb = databaseRef.current;
      databaseRef.current = prev.db;
      setEditorState(e => ({ ...e, database: prev.db }));
      return {
        past: h.past.slice(0, -1),
        future: [{ db: currentDb, desc: prev.desc }, ...h.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      const currentDb = databaseRef.current;
      databaseRef.current = next.db;
      setEditorState(e => ({ ...e, database: next.db }));
      return {
        past: [...h.past, { db: currentDb, desc: next.desc }],
        future: h.future.slice(1)
      };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "SELECT") return;

      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const handleExportJson = () => {
    downloadTextFile(`rits-database-${timestampForFilename()}.json`, JSON.stringify(database, null, 2), "application/json;charset=utf-8");
  };

  const handleExportCsv = () => {
    downloadTextFile(`rits-database-${timestampForFilename()}.csv`, databaseToCsv(database), "text/csv;charset=utf-8");
  };

  const openImportDialog = (format: "json" | "csv") => {
    setImportDialogFormat(format);
    setImportDialogMode("append");
    setImportDialogFile(null);
  };

  const closeImportDialog = () => {
    setImportDialogFormat(null);
    setImportDialogFile(null);
  };

  const handleImportFile = async (file: File | undefined, format: "json" | "csv", selectedImportMode: DatabaseImportMode) => {
    if (!file) return;

    try {
      const text = await file.text();
      updateDatabase((current) => (
        format === "json"
          ? applyJsonImport(current, text, selectedImportMode)
          : applyCsvImport(current, text, selectedImportMode)
      ));
      closeImportDialog();
      toast.success(`${format.toUpperCase()} imported with ${selectedImportMode}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to import ${format.toUpperCase()}.`);
    }
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      const canvas = canvasRef.current;
      if (!interaction || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scale = databaseRef.current.rowWidth / Math.max(rect.width, 1);

      if (interaction.mode === "marquee") {
        const startX = (interaction.startClientX - rect.left) * scale;
        const startY = (interaction.startClientY - rect.top) * scale;
        const currentX = (event.clientX - rect.left) * scale;
        const currentY = (event.clientY - rect.top) * scale;

        const mqX = Math.min(startX, currentX);
        const mqY = Math.min(startY, currentY);
        const mqW = Math.abs(currentX - startX);
        const mqH = Math.abs(currentY - startY);

        setMarquee({ x: mqX, y: mqY, w: mqW, h: mqH });

        const newSelection = new Set(interaction.startSelectedIds || []);
        for (const b of databaseRef.current.blocks) {
          if (b.stored) continue;
          if (
            b.x < mqX + mqW &&
            b.x + b.w > mqX &&
            b.y < mqY + mqH &&
            b.y + b.h > mqY
          ) {
            newSelection.add(b.id);
          }
        }
        setSelectedBlockIds(newSelection);
        return;
      }

      const dx = (event.clientX - interaction.startClientX) * scale;
      const dy = event.clientY - interaction.startClientY;

      let nextSnapGuides: { x?: number, y?: number } | null = null;

      const storeElem = document.getElementById("store-area");
      let isStoreHovered = false;
      if (storeElem) {
        const sr = storeElem.getBoundingClientRect();
        isStoreHovered = event.clientX >= sr.left && event.clientX <= sr.right && event.clientY >= sr.top && event.clientY <= sr.bottom;
      }
      setStoreHovered(isStoreHovered);

      updateDatabase((current) => {
        const nextBlocks = current.blocks.map(b => ({ ...b }));

        if (interaction.mode === "move") {
          const maxW = current.rowWidth;
          const maxH = current.rowHeight;

          let deltaX = dx;
          let deltaY = dy;

          if (interaction.startBlocks.length === 1) {
            const sb = interaction.startBlocks[0];
            let targetX = clampNumber(sb.x + dx, 0, maxW - sb.w);
            let targetY = clampNumber(sb.y + dy, 0, maxH - sb.h);
            const snapX = getSnap(targetX, sb.w, maxW, current.blocks, sb.id, true);
            const snapY = getSnap(targetY, sb.h, maxH, current.blocks, sb.id, false);
            if (snapX.line !== undefined || snapY.line !== undefined) {
              nextSnapGuides = { x: snapX.line, y: snapY.line };
            }
            deltaX = clampNumber(snapX.value, 0, maxW - sb.w) - sb.x;
            deltaY = clampNumber(snapY.value, 0, maxH - sb.h) - sb.y;
          }

          const draggedIndices = new Set<number>();

          interaction.startBlocks.forEach(sb => {
            const idx = nextBlocks.findIndex(b => b.id === sb.id);
            if (idx >= 0) {
              draggedIndices.add(idx);
              let targetX = sb.x + deltaX;
              let targetY = sb.y + deltaY;

              targetX = clampNumber(targetX, 0, maxW - sb.w);
              targetY = clampNumber(targetY, 0, maxH - sb.h);

              nextBlocks[idx] = { ...nextBlocks[idx], x: targetX, y: targetY };
            }
          });

          let resolvedAll = false;
          let iters = 0;
          while (!resolvedAll && iters < 20) {
            resolvedAll = true;
            for (let i = 0; i < nextBlocks.length; i++) {
              if (draggedIndices.has(i)) continue;
              const b = nextBlocks[i];
              const free = findFreeSpot(nextBlocks, b.id, b.x, b.y, b.w, b.h);
              if (free.x !== b.x || free.y !== b.y) {
                nextBlocks[i] = { ...b, x: free.x, y: free.y };
                resolvedAll = false;
              }
            }
            iters++;
          }
        } else {
          const sb = interaction.startBlocks[0];
          if (!sb) return current;
          const draggedIndex = nextBlocks.findIndex(b => b.id === sb.id);
          if (draggedIndex < 0) return current;

          const targetW = Math.max(MIN_BLOCK_SIZE, sb.w + dx);
          const targetH = Math.max(MIN_BLOCK_SIZE, sb.h + dy);

          let bestW = targetW;
          let bestH = targetH;
          let minDW = 12;
          let minDH = 12;
          let snapXLine: number | undefined;
          let snapYLine: number | undefined;

          for (const b of current.blocks) {
            if (b.id === sb.id) continue;
            for (const t of [b.x, b.x + b.w]) {
              if (Math.abs(sb.x + targetW - t) < minDW) {
                minDW = Math.abs(sb.x + targetW - t);
                bestW = t - sb.x;
                snapXLine = t;
              }
            }
            for (const t of [b.y, b.y + b.h]) {
              if (Math.abs(sb.y + targetH - t) < minDH) {
                minDH = Math.abs(sb.y + targetH - t);
                bestH = t - sb.y;
                snapYLine = t;
              }
            }
          }

          if (snapXLine !== undefined || snapYLine !== undefined) {
            nextSnapGuides = { x: snapXLine, y: snapYLine };
          }

          nextBlocks[draggedIndex] = {
            ...nextBlocks[draggedIndex],
            w: Math.max(MIN_BLOCK_SIZE, bestW),
            h: Math.max(MIN_BLOCK_SIZE, bestH),
          };
        }

        return { ...current, blocks: nextBlocks };
      }, false);

      if (interaction.mode !== "move" || interaction.startBlocks.length === 1) {
        setSnapGuides(nextSnapGuides);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!interactionRef.current) return;
      const { startDatabase, blockIds, mode } = interactionRef.current;

      if (mode === "marquee") {
        interactionRef.current = null;
        setMarquee(null);
        return;
      }

      const storeElem = document.getElementById("store-area");
      let droppedInStore = false;
      if (storeElem) {
        const sr = storeElem.getBoundingClientRect();
        droppedInStore = event.clientX >= sr.left && event.clientX <= sr.right && event.clientY >= sr.top && event.clientY <= sr.bottom;
      }

      if (droppedInStore) {
        updateDatabase((current) => {
          return { ...current, blocks: current.blocks.map(b => blockIds.includes(b.id) ? { ...b, stored: true } : b) };
        }, "Store block");
      } else {
        setHistory(h => ({ past: [...h.past, { db: startDatabase, desc: mode === "move" ? "Move block" : "Resize block" }].slice(-50), future: [] }));
      }

      interactionRef.current = null;
      setSnapGuides(null);
      setStoreHovered(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onChange, updateDatabase]);

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== "design") return;
    if (event.target !== canvasRef.current) return;

    event.preventDefault();

    if (!event.ctrlKey && !event.metaKey) {
      setSelectedBlockIds(new Set());
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const scale = databaseRef.current.rowWidth / Math.max(rect.width, 1);
    const startX = (event.clientX - rect.left) * scale;
    const startY = (event.clientY - rect.top) * scale;

    setMarquee({ x: startX, y: startY, w: 0, h: 0 });

    interactionRef.current = {
      blockIds: [],
      mode: "marquee",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBlocks: [],
      startDatabase: databaseRef.current,
      startSelectedIds: event.ctrlKey || event.metaKey ? new Set(selectedBlockIds) : new Set()
    };
  };

  const startBlockInteraction = (event: ReactPointerEvent<HTMLDivElement>, block: DatabaseBlock, interactionMode: "move" | "resize") => {
    if (mode !== "design") return;
    event.preventDefault();
    event.stopPropagation();

    let newSelection = new Set(selectedBlockIds);
    if (interactionMode === "move") {
      if (event.ctrlKey || event.metaKey) {
        if (newSelection.has(block.id)) newSelection.delete(block.id);
        else newSelection.add(block.id);
      } else if (!newSelection.has(block.id)) {
        newSelection = new Set([block.id]);
      }
    } else {
      newSelection = new Set([block.id]);
    }

    setSelectedBlockIds(newSelection);

    const interactIds = Array.from(newSelection.has(block.id) ? newSelection : new Set([block.id]));

    interactionRef.current = {
      blockIds: interactIds,
      mode: interactionMode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBlocks: databaseRef.current.blocks.filter(b => interactIds.includes(b.id)),
      startDatabase: databaseRef.current,
    };
  };

  const startStoreBlockDrag = (event: ReactPointerEvent<HTMLDivElement>, block: DatabaseBlock) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = databaseRef.current.rowWidth / Math.max(rect.width, 1);

    const initialX = (event.clientX - rect.left) * scale - (block.w / 2);
    const initialY = (event.clientY - rect.top) * scale - (block.h / 2);

    const startDb = databaseRef.current;

    updateDatabase((current) => {
      return { ...current, blocks: current.blocks.map(b => b.id === block.id ? { ...b, stored: false, x: initialX, y: initialY } : b) };
    }, false);

    interactionRef.current = {
      blockIds: [block.id],
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBlocks: [{ ...block, x: initialX, y: initialY }],
      mode: "move",
      startDatabase: startDb,
    };
    setSelectedBlockIds(new Set([block.id]));
  };

  const addBlock = (kind: DatabaseBlockKind) => {
    const option = BLOCK_KIND_OPTIONS.find((item) => item.kind === kind);
    const label = option?.label ?? "Field";
    updateDatabase((current) => {
      const fieldKey = uniqueFieldKey(label, current.blocks);
      const computedRowHeight = Math.max(160, ...current.blocks.map(b => b.y + b.h + 24));
      const targetX = 24 + ((current.blocks.length * 28) % Math.max(120, 800));
      const targetY = 24 + ((current.blocks.length * 24) % Math.max(80, computedRowHeight - 90));
      const targetW = kind === "textarea" ? 220 : kind === "image" ? 160 : 180;
      const targetH = kind === "textarea" ? 120 : kind === "image" ? 120 : 52;

      const free = findFreeSpot(current.blocks, "", targetX, targetY, targetW, targetH);

      const block: DatabaseBlock = {
        id: createId("block"),
        label,
        fieldKey,
        kind,
        shape: kind === "image" ? "rounded" : kind === "badge" ? "pill" : "rounded",
        x: free.x,
        y: free.y,
        w: targetW,
        h: targetH,
        accent: ACCENTS[current.blocks.length % ACCENTS.length],
      };

      setSelectedBlockIds(new Set([block.id]));
      return {
        ...current,
        blocks: [...current.blocks, block],
        rows: current.rows.map((row) => ({ ...row, values: { ...row.values, [fieldKey]: "" } })),
      };
    });
  };

  const updateBlock = (blockId: string, patch: Partial<DatabaseBlock>) => {
    updateDatabase((current) => ({
      ...current,
      blocks: current.blocks.map((block) => block.id === blockId ? { ...block, ...patch } : block),
    }));
  };

  const updateBlockKeyRole = (blockId: string, keyRole?: DatabaseKeyRole) => {
    updateDatabase((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.id === blockId) {
          return {
            ...block,
            keyRole,
            foreignReference: keyRole === "foreign" ? block.foreignReference : undefined,
          };
        }

        if (keyRole === "primary" && block.keyRole === "primary") {
          return { ...block, keyRole: undefined, foreignReference: undefined };
        }

        return block;
      }),
    }));
  };

  const duplicateBlocks = (blockIds: string[]) => {
    if (blockIds.length === 0) return;
    updateDatabase((current) => {
      let nextBlocks = [...current.blocks];
      let nextRows = [...current.rows];
      const newSelectedIds = new Set<string>();

      for (const id of blockIds) {
        const block = current.blocks.find(b => b.id === id);
        if (!block) continue;
        const fieldKey = uniqueFieldKey(`${block.label} copy`, nextBlocks);
        const clone: DatabaseBlock = {
          ...block,
          id: createId("block"),
          label: `${block.label} copy`,
          fieldKey,
          keyRole: undefined,
          foreignReference: undefined,
          x: Math.max(0, block.x + 24),
          y: Math.max(0, block.y + 24),
        };
        const free = findFreeSpot(nextBlocks, "", clone.x, clone.y, clone.w, clone.h);
        clone.x = free.x;
        clone.y = free.y;

        nextBlocks.push(clone);
        newSelectedIds.add(clone.id);

        nextRows = nextRows.map(row => ({ ...row, values: { ...row.values, [fieldKey]: row.values[block.fieldKey] ?? "" } }));
      }
      setSelectedBlockIds(newSelectedIds);
      return { ...current, blocks: nextBlocks, rows: nextRows };
    });
  };

  const deleteBlocks = (blockIds: string[]) => {
    if (blockIds.length === 0) return;
    const idSet = new Set(blockIds);
    updateDatabase((current) => {
      const removedFieldKeys = current.blocks.filter(b => idSet.has(b.id)).map(b => b.fieldKey);
      return {
        ...current,
        blocks: current.blocks.filter((item) => !idSet.has(item.id)),
        rows: current.rows.map((row) => {
          const values = Object.fromEntries(Object.entries(row.values).filter(([fieldKey]) => !removedFieldKeys.includes(fieldKey)));
          return { ...row, values };
        }),
      };
    });
    setSelectedBlockIds(prev => {
      const next = new Set(prev);
      blockIds.forEach(id => next.delete(id));
      return next;
    });
  };

  const addRow = () => {
    updateDatabase((current) => ({
      ...current,
      rows: [
        ...current.rows,
        {
          id: createId("row"),
          values: Object.fromEntries(current.blocks.map((block) => [block.fieldKey, ""])),
        },
      ],
    }));
  };

  const duplicateRow = (rowId: string) => {
    updateDatabase((current) => {
      const index = current.rows.findIndex((row) => row.id === rowId);
      if (index < 0) return current;
      const row = current.rows[index];
      const clone = { id: createId("row"), values: { ...row.values } };
      return {
        ...current,
        rows: [...current.rows.slice(0, index + 1), clone, ...current.rows.slice(index + 1)],
      };
    });
    toast.success("Row cloned.");
  };

  const deleteRow = (rowId: string) => {
    updateDatabase((current) => ({
      ...current,
      rows: current.rows.filter((row) => row.id !== rowId),
    }));
    setContextMenu(null);
    toast.success("Row deleted.");
  };

  const updateRowValue = (rowId: string, fieldKey: string, value: string) => {
    updateDatabase((current) => ({
      ...current,
      rows: current.rows.map((row) => row.id === rowId ? { ...row, values: { ...row.values, [fieldKey]: value } } : row),
    }));
  };

  const copyRow = async (row: DatabaseRow) => {
    const labelByField = new Map(database.blocks.map((block) => [block.fieldKey, block.label]));
    const rowData = Object.fromEntries(Object.entries(row.values).map(([fieldKey, value]) => [labelByField.get(fieldKey) ?? fieldKey, value]));
    await navigator.clipboard.writeText(JSON.stringify(rowData, null, 2));
    toast.success("Row copied.");
  };

  const copyCellValue = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Value copied.");
  };

  const updateActiveCellValue = (value: string) => {
    if (!activeCell) return;
    setCellDraft(value);
    updateRowValue(activeCell.row.id, activeCell.block.fieldKey, value);
  };

  const renderBlockValue = (block: DatabaseBlock, row?: DatabaseRow, compact = false) => {
    const value = (row?.values[block.fieldKey] ?? "").trim();
    const placeholder = mode === "design" ? block.label : block.label;

    const textStyle = compact ? {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "block",
      maxWidth: "100%",
    } : getBlockTextStyle(block);

    if (block.kind === "image") {
      return (
        <div className={`flex items-center justify-center overflow-hidden text-xs ${compact ? "h-6 w-6 rounded bg-[var(--surface-elevated)]" : "h-full w-full"}`} style={{ color: value ? "transparent" : "var(--mute)", backgroundImage: safeBackgroundUrl(value), backgroundSize: "cover", backgroundPosition: "center" }}>
          {value ? null : <ImageIcon size={compact ? 12 : 16} />}
        </div>
      );
    }

    if (!value) {
      return <span className="text-xs" style={{ ...textStyle, color: "var(--mute)" }}>{placeholder}</span>;
    }

    if (block.kind === "url" || block.kind === "email" || block.kind === "phone") {
      return (
        <span className="text-xs font-medium underline-offset-2 group-hover/database-block:underline" style={textStyle}>
          {block.kind === "url" ? formatUrlLabel(value) : value}
        </span>
      );
    }

    if (block.kind === "badge") {
      return <span className="truncate text-xs font-semibold uppercase tracking-[0.08em]" style={compact ? textStyle : undefined}>{value}</span>;
    }

    return <span className="text-xs" style={textStyle}>{value}</span>;
  };

  const renderBlock = (block: DatabaseBlock, row?: DatabaseRow) => {
    const isSelected = selectedBlockIds.has(block.id);
    if (block.stored) return null;

    const isEditableCell = mode === "view" && row;
    const blockStyle: CSSProperties = {
      ...getBlockPositionStyle(block),
      ...getShapeStyle(block.shape),
      borderColor: isSelected && mode === "design" ? block.accent : "var(--hairline-strong)",
      color: block.accent,
      backgroundColor: block.kind === "badge" ? "color-mix(in srgb, var(--surface-elevated) 72%, transparent)" : "var(--surface-card)",
      boxShadow: isSelected && mode === "design" ? `0 0 0 2px ${block.accent}` : undefined,
    };

    return (
      <div
        key={block.id}
        role={mode === "design" ? "button" : undefined}
        tabIndex={mode === "design" ? 0 : undefined}
        className={`group/database-block absolute flex items-center justify-center overflow-hidden border px-3 text-center transition-colors ${mode === "design" ? "cursor-grab hover:bg-[var(--surface-elevated)]" : isEditableCell ? "cursor-pointer hover:bg-[var(--surface-elevated)]" : ""}`}
        style={blockStyle}
        onPointerDown={(event) => startBlockInteraction(event, block, "move")}
        onContextMenu={(event) => openCellContextMenu(event, block, row)}
        onClick={(e) => {
          if (mode === "design") {
            if (e.ctrlKey || e.metaKey) {
              setSelectedBlockIds(prev => {
                const next = new Set(prev);
                if (next.has(block.id)) next.delete(block.id);
                else next.add(block.id);
                return next;
              });
            } else {
              setSelectedBlockIds(new Set([block.id]));
            }
            return;
          }
          if (row) scheduleBlockLinkOpen(block, row);
        }}
      >
        {mode === "design" ? (
          <span className="pointer-events-none absolute left-2 top-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: "var(--mute)" }}>
            <Move size={11} /> {block.kind}
          </span>
        ) : null}
        {block.keyRole ? (
          <span
            className="pointer-events-none absolute right-1.5 top-1.5 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
            style={{
              borderColor: block.keyRole === "primary" ? "var(--accent-yellow)" : "var(--accent-purple)",
              backgroundColor: "color-mix(in srgb, var(--surface-card) 86%, transparent)",
              color: block.keyRole === "primary" ? "var(--accent-yellow)" : "var(--accent-purple)",
            }}
            title={block.keyRole === "primary" ? "Primary key" : `Foreign key${block.foreignReference ? `: ${block.foreignReference}` : ""}`}
          >
            {block.keyRole === "primary" ? "PK" : "FK"}
          </span>
        ) : null}
        {renderBlockValue(block, row)}
        {mode === "design" ? (
          <div
            className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize border-l border-t bg-[var(--surface-elevated)] opacity-0 transition-opacity group-hover/database-block:opacity-100"
            style={{ borderColor: "var(--hairline-strong)" }}
            onPointerDown={(event) => startBlockInteraction(event, block, "resize")}
          />
        ) : null}
      </div>
    );
  };

  const rowGridStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: `${database.rowGap}px`,
    minWidth: "max-content",
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--canvas)]">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)" }}>
          <button type="button" onClick={() => setMode("view")} className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium ${mode === "view" ? "bg-[var(--ink)] text-[var(--canvas)]" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}>
            <Check size={14} /> View database
          </button>
          <button type="button" onClick={() => setMode("design")} className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium ${mode === "design" ? "bg-[var(--ink)] text-[var(--canvas)]" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}>
            <Move size={14} /> Design row
          </button>
        </div>

        {mode === "design" ? (
          <div className="flex items-center gap-1 border-l pl-3" style={{ borderColor: "var(--hairline-strong)" }}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--mute)" }}>W</span>
              <input
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyCanvasResize(); }}
                className="h-8 w-16 rounded-md border bg-transparent px-2 text-xs font-medium outline-none"
                style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
              />
            </div>
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-xs font-medium" style={{ color: "var(--mute)" }}>H</span>
              <input
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyCanvasResize(); }}
                className="h-8 w-16 rounded-md border bg-transparent px-2 text-xs font-medium outline-none"
                style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
              />
            </div>
            {widthInput !== database.rowWidth.toString() || heightInput !== database.rowHeight.toString() ? (
              <button
                type="button"
                onClick={applyCanvasResize}
                className="flex h-8 w-8 items-center justify-center rounded-md border bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-[var(--charcoal)] hover:text-[var(--ink)] transition-colors ml-1"
                style={{ borderColor: "var(--hairline)" }}
                title="Apply dimensions"
              >
                <Check size={14} />
              </button>
            ) : null}
          </div>
        ) : null}

        <button type="button" onClick={addRow} className="btn-outline h-9 px-3 text-xs ml-auto">
          <Plus size={14} /> Add row
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="btn-outline h-9 px-3 text-xs">
              <History size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs font-semibold text-[var(--mute)]">Past</div>
            {history.past.length === 0 ? <div className="px-2 py-1 text-xs text-[var(--mute)]">No past history</div> : null}
            {[...history.past].reverse().slice(0, 10).map((h, i) => (
              <DropdownMenuItem key={i} onSelect={undo}>
                <Undo2 size={14} className="mr-2" /> {h.desc}
              </DropdownMenuItem>
            ))}
            {history.future.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-[var(--mute)]">Future</div>
                {history.future.slice(0, 10).map((h, i) => (
                  <DropdownMenuItem key={i} onSelect={redo}>
                    <Redo2 size={14} className="mr-2" /> {h.desc}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="btn-outline h-9 px-3 text-xs">
              <Download size={14} /> Export
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onSelect={handleExportJson}><Download size={14} /> JSON</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExportCsv}><Download size={14} /> CSV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="btn-outline h-9 px-3 text-xs">
              <Upload size={14} /> Import
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onSelect={() => openImportDialog("json")}><Upload size={14} /> JSON</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openImportDialog("csv")}><Upload size={14} /> CSV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button type="button" onClick={() => { onChange(serializeDatabaseContent(database)); toast.success("Changes applied."); }} className="btn-primary h-9 px-4 text-xs font-semibold">
          Apply
        </button>
      </div>

      {mode === "design" ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto bg-[var(--surface)] p-6 md:p-12">
            <div className="mb-4 flex flex-wrap gap-2">
              {BLOCK_KIND_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button key={option.kind} type="button" onClick={() => addBlock(option.kind)} className="btn-outline h-9 px-3 text-xs">
                    <Icon size={14} /> {option.label}
                  </button>
                );
              })}
            </div>

            <div
              ref={canvasRef}
              className="relative mx-auto rounded-lg border-2 border-dashed bg-[var(--canvas)] shadow-sm"
              style={{
                width: `${database.rowWidth}px`,
                maxWidth: "none",
                height: `${database.rowHeight}px`,
                borderColor: "var(--hairline-strong)",
              }}
              onPointerDown={handleCanvasPointerDown}
            >
              {database.blocks.map((block) => renderBlock(block))}

              {marquee && (
                <div
                  className="absolute border bg-blue-500/20 z-50 pointer-events-none"
                  style={{ borderColor: "var(--accent-blue)", left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
                />
              )}

              {snapGuides?.x !== undefined && (
                <div className="pointer-events-none absolute bottom-0 top-0 z-40 border-l border-dashed border-[var(--accent-blue)]" style={{ left: snapGuides.x }} />
              )}
              {snapGuides?.y !== undefined && (
                <div className="pointer-events-none absolute left-0 right-0 z-40 border-t border-dashed border-[var(--accent-blue)]" style={{ top: snapGuides.y }} />
              )}
            </div>
          </div>

          <aside className={`min-h-0 shrink-0 overflow-auto border-l bg-[var(--surface-card)] transition-all ${isSidebarExpanded ? "w-[320px] p-4 max-lg:border-l-0 max-lg:border-t" : "w-14 p-2 flex flex-col items-center"}`} style={{ borderColor: "var(--hairline-strong)" }}>
            <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--charcoal)] hover:bg-[var(--surface-elevated)]" title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}>
              {isSidebarExpanded ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>

            {!isSidebarExpanded && selectedBlock && (
              <div className="flex w-full flex-col gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-[var(--surface-elevated)] text-[var(--ink)]" title="Type" style={{ borderColor: "var(--hairline)" }}>
                      {(() => { const Icon = BLOCK_KIND_OPTIONS.find(o => o.kind === selectedBlock.kind)?.icon || Type; return <Icon size={16} />; })()}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" align="start">
                    {BLOCK_KIND_OPTIONS.map(option => {
                      const Icon = option.icon;
                      return <DropdownMenuItem key={option.kind} onSelect={() => updateBlock(selectedBlock.id, { kind: option.kind })}><Icon size={14} className="mr-2" /> {option.label}</DropdownMenuItem>
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-[var(--surface-elevated)] text-[var(--charcoal)]" title="Shape" style={{ borderColor: "var(--hairline)" }}>
                      {(() => { const Icon = SHAPE_OPTIONS.find(o => o.shape === selectedBlock.shape)?.icon || Square; return <Icon size={16} />; })()}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" align="start">
                    {SHAPE_OPTIONS.map(option => {
                      const Icon = option.icon;
                      return <DropdownMenuItem key={option.shape} onSelect={() => updateBlock(selectedBlock.id, { shape: option.shape })}><Icon size={14} className="mr-2" /> {option.label}</DropdownMenuItem>
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-[var(--surface-elevated)]" title="Color" style={{ borderColor: "var(--hairline)" }}>
                      <div className="h-5 w-5 rounded-full" style={{ backgroundColor: selectedBlock.accent }} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" align="start" className="flex w-36 flex-wrap gap-2 p-2">
                    {ACCENTS.map(accent => (
                      <button key={accent} type="button" onClick={() => updateBlock(selectedBlock.id, { accent })} className="h-6 w-6 rounded-full border" style={{ backgroundColor: accent, borderColor: selectedBlock.accent === accent ? "var(--ink)" : "var(--hairline-strong)" }} />
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-[var(--surface-elevated)] text-[10px] font-bold uppercase tracking-wider" title="Key Role" style={{ borderColor: "var(--hairline)", color: selectedBlock.keyRole === "primary" ? "var(--accent-yellow)" : selectedBlock.keyRole === "foreign" ? "var(--accent-purple)" : "var(--charcoal)" }}>
                      {selectedBlock.keyRole === "primary" ? "PK" : selectedBlock.keyRole === "foreign" ? "FK" : "-"}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" align="start">
                    <DropdownMenuItem onSelect={() => updateBlockKeyRole(selectedBlock.id, undefined)}>None</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => updateBlockKeyRole(selectedBlock.id, "primary")}>Primary Key</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => updateBlockKeyRole(selectedBlock.id, "foreign")}>Foreign Key</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button type="button" onClick={() => duplicateBlocks(Array.from(selectedBlockIds))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-[var(--surface-elevated)] text-[var(--charcoal)] hover:text-[var(--ink)]" title="Clone selected block(s)" style={{ borderColor: "var(--hairline)" }}>
                  <Copy size={16} />
                </button>
                <button type="button" onClick={() => deleteBlocks(Array.from(selectedBlockIds))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-[var(--surface-elevated)] text-[var(--accent-red)]" title="Delete selected block(s)" style={{ borderColor: "var(--hairline)" }}>
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {isSidebarExpanded && selectedBlock ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Block</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => duplicateBlocks(Array.from(selectedBlockIds))} className="rounded-md p-2 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--charcoal)" }} title="Clone selected block(s)">
                      <Copy size={14} />
                    </button>
                    <button type="button" onClick={() => deleteBlocks(Array.from(selectedBlockIds))} className="rounded-md p-2 hover:bg-[var(--surface-elevated)]" style={{ color: "var(--accent-red)" }} title="Delete selected block(s)">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <label className="block text-xs" style={{ color: "var(--mute)" }}>
                  Label
                  <input value={selectedBlock.label} onChange={(event) => updateBlock(selectedBlock.id, { label: event.target.value })} className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-elevated)] px-3 text-sm text-[var(--ink)] outline-none" style={{ borderColor: "var(--hairline)" }} />
                </label>

                <label className="block text-xs" style={{ color: "var(--mute)" }}>
                  Type
                  <select value={selectedBlock.kind} onChange={(event) => updateBlock(selectedBlock.id, { kind: event.target.value as DatabaseBlockKind })} className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-elevated)] px-3 text-sm text-[var(--ink)] outline-none" style={{ borderColor: "var(--hairline)" }}>
                    {BLOCK_KIND_OPTIONS.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}
                  </select>
                </label>

                <div>
                  <span className="text-xs" style={{ color: "var(--mute)" }}>Key</span>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {([
                      [undefined, "None"],
                      ["primary", "Primary"],
                      ["foreign", "Foreign"],
                    ] as const).map(([role, label]) => {
                      const active = selectedBlock.keyRole === role || (!role && !selectedBlock.keyRole);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => updateBlockKeyRole(selectedBlock.id, role)}
                          className="flex h-9 items-center justify-center rounded-md border px-2 text-xs font-medium"
                          style={{
                            borderColor: active ? selectedBlock.accent : "var(--hairline)",
                            backgroundColor: active ? "var(--surface-elevated)" : "transparent",
                            color: active ? selectedBlock.accent : "var(--charcoal)",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedBlock.keyRole === "foreign" ? (
                    <label className="mt-2 block text-xs" style={{ color: "var(--mute)" }}>
                      References
                      <input
                        value={selectedBlock.foreignReference ?? ""}
                        onChange={(event) => updateBlock(selectedBlock.id, { foreignReference: event.target.value })}
                        placeholder="database.field"
                        className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-elevated)] px-3 text-sm text-[var(--ink)] outline-none"
                        style={{ borderColor: "var(--hairline)" }}
                      />
                    </label>
                  ) : null}
                </div>

                <div>
                  <span className="text-xs" style={{ color: "var(--mute)" }}>Shape</span>
                  <div className="mt-2 grid grid-cols-5 gap-1">
                    {SHAPE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const active = selectedBlock.shape === option.shape;
                      return (
                        <button key={option.shape} type="button" onClick={() => updateBlock(selectedBlock.id, { shape: option.shape })} className="flex h-9 items-center justify-center rounded-md border" style={{ borderColor: active ? selectedBlock.accent : "var(--hairline)", backgroundColor: active ? "var(--surface-elevated)" : "transparent", color: active ? selectedBlock.accent : "var(--charcoal)" }} title={option.label}>
                          <Icon size={15} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-xs" style={{ color: "var(--mute)" }}>Color</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ACCENTS.map((accent) => (
                      <button key={accent} type="button" onClick={() => updateBlock(selectedBlock.id, { accent })} className="h-7 w-7 rounded-full border" style={{ backgroundColor: accent, borderColor: selectedBlock.accent === accent ? "var(--ink)" : "var(--hairline-strong)" }} aria-label={`Use ${accent}`} />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["x", "X"],
                    ["y", "Y"],
                    ["w", "W"],
                    ["h", "H"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="text-xs" style={{ color: "var(--mute)" }}>
                      {label}
                      <input
                        type="number"
                        value={Math.round(selectedBlock[key])}
                        onChange={(event) => updateBlock(selectedBlock.id, { [key]: Number(event.target.value) } as Partial<DatabaseBlock>)}
                        className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-elevated)] px-2 text-sm text-[var(--ink)] outline-none"
                        style={{ borderColor: "var(--hairline)" }}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-8 border-t pt-4" style={{ borderColor: "var(--hairline-strong)" }}>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>
                    Store Area
                  </span>

                  <div
                    id="store-area"
                    className={`mt-4 flex min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${storeHovered ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10' : 'border-[var(--hairline-strong)]'}`}
                  >
                    {database.blocks.filter(b => b.stored).length === 0 ? (
                      <span className="text-xs font-semibold text-center px-4" style={{ color: "var(--mute)" }}>Drag items here to store</span>
                    ) : (
                      <div className="flex w-full flex-col gap-2 p-2">
                        {database.blocks.filter(b => b.stored).map((b) => (
                          <div
                            key={b.id}
                            className="group flex cursor-grab items-center gap-2 rounded-md border bg-[var(--canvas)] p-2 text-xs active:cursor-grabbing"
                            style={{ borderColor: "var(--hairline)" }}
                            onPointerDown={(e) => startStoreBlockDrag(e, b)}
                          >
                            <span className="flex-1 truncate font-medium text-[var(--ink)]">{b.label}</span>
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); duplicateBlocks([b.id]); }}
                                className="text-[var(--charcoal)] hover:text-[var(--ink)]"
                                title="Clone block"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); deleteBlocks([b.id]); }}
                                className="text-[var(--accent-red)] hover:text-[var(--accent-red)]"
                                title="Delete block"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateDatabase((current) => {
                                    const free = findFreeSpot(current.blocks.filter(x => !x.stored), b.id, 0, 0, b.w, b.h);
                                    return { ...current, blocks: current.blocks.map(x => x.id === b.id ? { ...x, stored: false, x: free.x, y: free.y } : x) };
                                  }, "Restore block");
                                }}
                                className="text-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
                                title="Add to canvas"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : isSidebarExpanded ? (
              <div className="py-10 text-center text-sm" style={{ color: "var(--charcoal)" }}>No block selected.</div>
            ) : null}
          </aside>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div style={rowGridStyle}>
            {database.rows.map((row, index) => {
              const isCollapsed = collapsedRows.has(row.id);
              const prevIsCollapsed = index > 0 && collapsedRows.has(database.rows[index - 1].id);
              const showHeader = isCollapsed && !prevIsCollapsed;

              return (
                <div key={row.id} className="flex flex-col gap-1">
                  {showHeader ? (
                    <div className="flex items-center gap-3">
                      <div className="sticky left-0 z-30 w-8 shrink-0 bg-[var(--canvas)]" />
                      <div className="flex flex-1 gap-4 border-b pb-2 pt-4" style={{ borderColor: "var(--hairline-strong)" }}>
                        {database.blocks.map((b) => (
                          <div key={b.id} className="w-48 shrink-0 truncate text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--mute)" }}>
                            {b.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-stretch gap-3">
                    <div className="sticky left-0 z-30 flex w-8 shrink-0 flex-col bg-[var(--canvas)]">
                      <button
                        type="button"
                        onClick={() => setCollapsedRows((prev) => {
                          const next = new Set(prev);
                          if (next.has(row.id)) next.delete(row.id);
                          else next.add(row.id);
                          return next;
                        })}
                        className="flex flex-1 items-center justify-center rounded-md text-xs font-medium hover:bg-[var(--surface-elevated)]"
                        style={{ color: "var(--mute)" }}
                        title={isCollapsed ? "Expand row" : "Collapse row"}
                      >
                        {index + 1}
                      </button>
                    </div>

                    {isCollapsed ? (
                      <div className="group/database-row flex flex-1 items-center gap-4 border-b py-2 transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)" }}>
                        {database.blocks.map((b) => (
                          <div
                            key={b.id}
                            className="w-48 shrink-0 cursor-pointer"
                            onContextMenu={(event) => openCellContextMenu(event, b, row)}
                            onClick={() => scheduleBlockLinkOpen(b, row)}
                          >
                            {renderBlockValue(b, row, true)}
                          </div>
                        ))}
                        <div className="ml-4 opacity-0 transition-opacity group-hover/database-row:opacity-100">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="rounded-md border bg-[var(--surface-card)] p-1 text-[var(--charcoal)] hover:text-[var(--ink)]" style={{ borderColor: "var(--hairline-strong)" }}>
                                <MoreHorizontal size={14} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onSelect={() => duplicateRow(row.id)}><Copy size={14} /> Clone row</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void copyRow(row)}><Copy size={14} /> Copy row</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => deleteRow(row.id)}><Trash2 size={14} /> Delete row</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="group/database-row relative shrink-0 border bg-[var(--surface-deep)] shadow-sm"
                        style={{
                          width: `${database.rowWidth}px`,
                          maxWidth: "none",
                          height: `${database.rowHeight}px`,
                          borderColor: "var(--hairline-strong)",
                        }}
                      >
                        <div className="absolute right-2 top-2 z-20 opacity-0 transition-opacity group-hover/database-row:opacity-100">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="rounded-md border bg-[var(--surface-card)] p-1.5 text-[var(--charcoal)] shadow-sm hover:text-[var(--ink)]" style={{ borderColor: "var(--hairline-strong)" }} aria-label={`Row ${index + 1} actions`}>
                                <MoreHorizontal size={14} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onSelect={() => duplicateRow(row.id)}><Copy size={14} /> Clone row</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void copyRow(row)}><Copy size={14} /> Copy row</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => deleteRow(row.id)}><Trash2 size={14} /> Delete row</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {database.blocks.map((block) => renderBlock(block, row))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {database.rows.length === 0 ? (
            <div className="flex h-full min-h-[220px] items-center justify-center">
              <button type="button" onClick={addRow} className="btn-primary">
                <Plus size={15} /> Add row
              </button>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={Boolean(importDialogFormat)} onOpenChange={(open) => { if (!open) closeImportDialog(); }}>
        {importDialogFormat ? (
          <DialogContent className="max-w-lg gap-0 overflow-hidden p-0" overlayClassName="bg-black/35 supports-backdrop-filter:backdrop-blur-[2px]">
            <div className="border-b px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
              <DialogHeader>
                <DialogTitle style={{ color: "var(--ink)" }}>Import {importDialogFormat.toUpperCase()}</DialogTitle>
              </DialogHeader>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "var(--mute)" }}>Mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["append", "merge", "replace"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setImportDialogMode(option)}
                      className={`h-9 rounded-md border px-3 text-xs font-medium capitalize transition-colors ${importDialogMode === option ? "bg-[var(--ink)] text-[var(--canvas)]" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}
                      style={{ borderColor: importDialogMode === option ? "var(--ink)" : "var(--hairline-strong)" }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "var(--mute)" }}>File</span>
                <input
                  type="file"
                  accept={importDialogFormat === "json" ? ".json,application/json" : ".csv,text/csv"}
                  onChange={(event) => setImportDialogFile(event.currentTarget.files?.[0] ?? null)}
                  className="block w-full rounded-md border bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--ink)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--ink)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--canvas)]"
                  style={{ borderColor: "var(--hairline)" }}
                />
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeImportDialog} className="btn-outline">Cancel</button>
                <button
                  type="button"
                  disabled={!importDialogFile}
                  onClick={() => void handleImportFile(importDialogFile ?? undefined, importDialogFormat, importDialogMode)}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Import
                </button>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      {activeCell && contextMenu ? (
        <div
          ref={contextMenuRef}
          className="fixed z-[130] w-80 rounded-xl border p-3 shadow-[0_18px_50px_rgba(0,0,0,0.32)]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            borderColor: "var(--hairline-strong)",
            backgroundColor: "var(--surface-card)",
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="min-w-0 flex flex-1 items-center gap-2">
              <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{activeCell.block.label}</p>
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>
                {activeCell.block.kind}
              </span>
            </div>
            <button type="button" onClick={() => void copyCellValue(cellDraft)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }} aria-label="Copy value" title="Copy value">
              <Copy size={14} />
            </button>
            <button type="button" onClick={() => setContextMenu(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }} aria-label="Close" title="Close">
              <X size={14} />
            </button>
          </div>

          {activeCell.block.kind === "textarea" ? (
            <textarea
              autoFocus
              value={cellDraft}
              onChange={(event) => updateActiveCellValue(event.target.value)}
              rows={5}
              className="w-full resize-none rounded-md border bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
              style={{ borderColor: "var(--hairline)" }}
            />
          ) : (
            <input
              autoFocus
              value={cellDraft}
              onChange={(event) => updateActiveCellValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                setContextMenu(null);
              }}
              className="h-10 w-full rounded-md border bg-[var(--surface-elevated)] px-3 text-sm text-[var(--ink)] outline-none"
              style={{ borderColor: "var(--hairline)" }}
            />
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn-outline h-9 text-xs"
              onClick={() => {
                updateRowValue(activeCell.row.id, activeCell.block.fieldKey, "");
                setContextMenu(null);
              }}
            >
              <Trash2 size={14} /> Clear value
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
