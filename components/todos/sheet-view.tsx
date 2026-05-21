"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Download, RotateCcw, RotateCw, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { SheetGroupBlock } from "@/components/todos/sheet-group-block";
import type { SelectionRange, SheetCoord, SheetHistoryEntry, TodoCreateInput, TodoDoc, TodoGroupOption, TodoStatus, TodoUpdate } from "@/components/todos/sheet-types";

const DEFAULT_COLUMN_WIDTHS = [160, 220, 200];

function csvEscape(value: string) {
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replaceAll("\"", '""')}"`;
  }
  return value;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if (char === "\n" && !inQuotes) {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    if (char !== "\r") current += char;
  }

  row.push(current);
  rows.push(row);
  return rows.filter((currentRow) => currentRow.some((cell) => cell.trim().length > 0));
}

function normalizeSelection(start: SheetCoord, end: SheetCoord): SelectionRange {
  return {
    groupId: start.groupId,
    startRow: Math.min(start.rowIndex, end.rowIndex),
    endRow: Math.max(start.rowIndex, end.rowIndex),
    startCol: Math.min(start.colIndex, end.colIndex),
    endCol: Math.max(start.colIndex, end.colIndex),
  };
}

export function SheetView({
  todos,
  statuses,
  groupOptions,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo,
}: {
  todos: TodoDoc[] | undefined;
  statuses: readonly TodoStatus[];
  groupOptions?: TodoGroupOption[];
  onCreateTodo: (input: TodoCreateInput) => Promise<TodoDoc["_id"]>;
  onUpdateTodo: (id: TodoDoc["_id"], updates: TodoUpdate) => Promise<void>;
  onDeleteTodo: (id: TodoDoc["_id"]) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusOrder, setStatusOrder] = useState<TodoStatus[]>([...statuses]);
  const [columnWidths, setColumnWidths] = useState<number[]>([...statuses].flatMap(() => DEFAULT_COLUMN_WIDTHS));
  const [activeCoord, setActiveCoord] = useState<SheetCoord | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<SheetCoord | null>(null);
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [historyPast, setHistoryPast] = useState<SheetHistoryEntry[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<SheetHistoryEntry[][]>([]);
  const [filterText, setFilterText] = useState("");
  const [sortKey, setSortKey] = useState<"none" | "title" | "description">("none");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const orderedStatuses = useMemo(() => {
    const knownIds = new Set(statuses.map((status) => status.id));
    const next = statusOrder.filter((status) => knownIds.has(status.id));
    for (const status of statuses) {
      if (!next.some((item) => item.id === status.id)) next.push(status);
    }
    return next;
  }, [statusOrder, statuses]);

  const groups = useMemo(() => {
    const options = groupOptions?.length ? [...groupOptions] : [{ id: "no-group", label: "No Group" }];
    const seen = new Set(options.map((group) => group.id));
    for (const todo of todos ?? []) {
      const todoGroupId = todo.groupId ?? "no-group";
      if (seen.has(todoGroupId)) continue;
      seen.add(todoGroupId);
      options.push({ id: todoGroupId, label: todoGroupId === "no-group" || todoGroupId === "no-team" ? "No Group" : todoGroupId });
    }
    return options;
  }, [groupOptions, todos]);

  const filteredTodos = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    const source = [...(todos ?? [])];
    const filtered = query
      ? source.filter((todo) => {
          const fields = todo.customFields?.map((field) => `${field.key} ${field.value}`).join(" ") ?? "";
          return [todo.title, todo.description ?? "", fields].join(" ").toLowerCase().includes(query);
        })
      : source;
    if (sortKey === "none") return filtered;
    filtered.sort((left, right) => {
      const leftValue = (sortKey === "title" ? left.title : left.description ?? "").toLowerCase();
      const rightValue = (sortKey === "title" ? right.title : right.description ?? "").toLowerCase();
      if (leftValue === rightValue) return 0;
      const order = leftValue < rightValue ? -1 : 1;
      return sortDirection === "asc" ? order : -order;
    });
    return filtered;
  }, [filterText, sortDirection, sortKey, todos]);

  const moveStatus = (statusId: string, direction: "left" | "right") => {
    setStatusOrder((current) => {
      const index = current.findIndex((status) => status.id === statusId);
      if (index === -1) return current;
      const nextIndex = direction === "left" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const recordHistory = (entries: SheetHistoryEntry[]) => {
    if (!entries.length) return;
    setHistoryPast((current) => [...current, entries]);
    setHistoryFuture([]);
  };

  const applyHistoryEntry = async (entry: SheetHistoryEntry, direction: "undo" | "redo") => {
    if (entry.type === "update") {
      await onUpdateTodo(entry.todoId, direction === "undo" ? entry.before : entry.after);
      return;
    }

    if (direction === "undo") {
      await onDeleteTodo(entry.createdId);
      return;
    }
    await onCreateTodo(entry.payload);
  };

  const undo = async () => {
    const batch = historyPast[historyPast.length - 1];
    if (!batch) return;
    for (const entry of [...batch].reverse()) {
      await applyHistoryEntry(entry, "undo");
    }
    setHistoryPast((current) => current.slice(0, -1));
    setHistoryFuture((current) => [batch, ...current]);
    toast.success("Undid last sheet change.");
  };

  const redo = async () => {
    const [batch, ...rest] = historyFuture;
    if (!batch) return;
    for (const entry of batch) {
      await applyHistoryEntry(entry, "redo");
    }
    setHistoryFuture(rest);
    setHistoryPast((current) => [...current, batch]);
    toast.success("Redid sheet change.");
  };

  const activateCell = (coord: SheetCoord, extend: boolean) => {
    setActiveCoord(coord);
    if (!extend || !selectionAnchor || selectionAnchor.groupId !== coord.groupId) {
      setSelectionAnchor(coord);
      setSelection(normalizeSelection(coord, coord));
      return;
    }
    setSelection(normalizeSelection(selectionAnchor, coord));
  };

  const navigateCell = (coord: SheetCoord, _direction: "left" | "right" | "up" | "down", extend: boolean) => {
    setActiveCoord(coord);
    if (!extend) {
      setSelectionAnchor(coord);
      setSelection(normalizeSelection(coord, coord));
      return;
    }
    const anchor = selectionAnchor && selectionAnchor.groupId === coord.groupId ? selectionAnchor : coord;
    setSelectionAnchor(anchor);
    setSelection(normalizeSelection(anchor, coord));
  };

  const exportCsv = () => {
    const rows = ["group,status,title,description,fields"];
    for (const todo of filteredTodos) {
      const groupLabel = groups.find((group) => group.id === (todo.groupId ?? "no-group"))?.label ?? "No Group";
      const statusLabel = orderedStatuses.find((status) => status.id === (todo.status ?? (todo.completed ? "completed" : "todo")))?.label ?? "Todo";
      rows.push([
        csvEscape(groupLabel),
        csvEscape(statusLabel),
        csvEscape(todo.title),
        csvEscape(todo.description ?? ""),
        csvEscape(JSON.stringify(todo.customFields ?? [])),
      ].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kanban-sheet.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    const [, ...dataRows] = rows;
    const historyEntries: SheetHistoryEntry[] = [];
    for (const row of dataRows) {
      const [groupLabel, statusLabel, title, description, fields] = row;
      if (!title?.trim()) continue;
      const matchedGroup = groups.find((group) => group.label.toLowerCase() === (groupLabel ?? "").trim().toLowerCase());
      const matchedStatus = orderedStatuses.find((status) => status.label.toLowerCase() === (statusLabel ?? "").trim().toLowerCase() || status.id.toLowerCase() === (statusLabel ?? "").trim().toLowerCase());
      const payload: TodoCreateInput = {
        title: title.trim(),
        description: description?.trim() || undefined,
        priority: "medium",
        status: matchedStatus?.id ?? orderedStatuses[0]?.id ?? "todo",
        groupId: matchedGroup?.id ?? null,
        customFields: fields ? JSON.parse(fields) as Array<{ key: string; value: string }> : undefined,
      };
      const createdId = await onCreateTodo(payload);
      historyEntries.push({ type: "create", createdId, payload });
    }
    recordHistory(historyEntries);
    toast.success("CSV imported.");
  };

  return (
    <div className="relative z-10 flex h-full flex-col overflow-hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Sheet View</h3>
          <p className="text-xs" style={{ color: "var(--mute)" }}>Single Excel-like sheet for all groups, backed by the same Kanban cards.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border px-2 py-1" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
            <Search size={14} style={{ color: "var(--mute)" }} />
            <input value={filterText} onChange={(event) => setFilterText(event.target.value)} placeholder="Filter rows" className="w-32 bg-transparent text-sm outline-none" style={{ color: "var(--ink)" }} />
            {filterText ? <button onClick={() => setFilterText("")} style={{ color: "var(--mute)" }}><X size={12} /></button> : null}
          </div>
          <button onClick={() => { setSortKey("title"); setSortDirection((current) => current === "asc" ? "desc" : "asc"); }} className="btn-outline text-xs">
            {sortDirection === "asc" ? <ArrowDownAZ size={12} /> : <ArrowUpAZ size={12} />} Sort title
          </button>
          <button onClick={() => { setSortKey("description"); setSortDirection((current) => current === "asc" ? "desc" : "asc"); }} className="btn-outline text-xs">
            {sortDirection === "asc" ? <ArrowDownAZ size={12} /> : <ArrowUpAZ size={12} />} Sort description
          </button>
          <button onClick={() => void undo()} disabled={historyPast.length === 0} className="btn-outline text-xs">
            <RotateCcw size={12} /> Undo
          </button>
          <button onClick={() => void redo()} disabled={historyFuture.length === 0} className="btn-outline text-xs">
            <RotateCw size={12} /> Redo
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void importCsv(file);
            event.currentTarget.value = "";
          }} />
          <button onClick={() => fileInputRef.current?.click()} className="btn-outline text-xs">
            <Upload size={12} /> Import CSV
          </button>
          <button onClick={exportCsv} className="btn-outline text-xs">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-4">
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
          <table className="min-w-max border-separate border-spacing-0">
            <tbody>
              {groups.map((group) => (
                <SheetGroupBlock
                  key={group.id}
                  group={group}
                  statuses={orderedStatuses}
                  tasks={filteredTodos.filter((todo) => (todo.groupId ?? "no-group") === group.id || ((group.id === "no-group" || group.id === "no-team") && !todo.groupId))}
                  columnWidths={columnWidths}
                  onResizeColumn={(columnIndex, nextWidth) => {
                    setColumnWidths((current) => {
                      const next = [...current];
                      next[columnIndex] = nextWidth;
                      return next;
                    });
                  }}
                  onMoveStatus={moveStatus}
                  onCreateTodo={onCreateTodo}
                  onUpdateTodo={onUpdateTodo}
                  activeCoord={activeCoord}
                  selection={selection}
                  onActivateCell={activateCell}
                  onNavigateCell={navigateCell}
                  onRecordHistory={recordHistory}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
