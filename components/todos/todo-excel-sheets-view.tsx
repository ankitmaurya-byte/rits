"use client";

import { useMemo, useState } from "react";
import { Download, Plus, RotateCcw, RotateCw, Upload } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type ExcelSheet = Doc<"todoExcelSheets">;
type ExcelRow = Doc<"todoExcelRows">;

type CellCoord = { rowIndex: number; colIndex: number };
type CellRange = { startRow: number; endRow: number; startCol: number; endCol: number };
type CellUpdate = { rowIndex: number; columnKey: string; before: string; after: string };

function columnLabel(index: number) {
  let value = "";
  let current = index;
  while (current >= 0) {
    value = String.fromCharCode((current % 26) + 65) + value;
    current = Math.floor(current / 26) - 1;
  }
  return value;
}

function normalizeRange(start: CellCoord, end: CellCoord): CellRange {
  return {
    startRow: Math.min(start.rowIndex, end.rowIndex),
    endRow: Math.max(start.rowIndex, end.rowIndex),
    startCol: Math.min(start.colIndex, end.colIndex),
    endCol: Math.max(start.colIndex, end.colIndex),
  };
}

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

export function TodoExcelSheetsView({
  scope,
  workspaceId,
  clerkId,
  createdBy,
}: {
  scope: "private" | "workspace";
  workspaceId?: Id<"workspaces">;
  clerkId?: string;
  createdBy?: Id<"users">;
}) {
  const sheets = useQuery(
    scope === "workspace" ? api.todoExcelSheets.getWorkspaceSheets : api.todoExcelSheets.getPrivateSheets,
    scope === "workspace"
      ? workspaceId ? { workspaceId } : "skip"
      : createdBy ? { createdBy } : "skip"
  ) as ExcelSheet[] | undefined;

  const [activeSheetId, setActiveSheetId] = useState<Id<"todoExcelSheets"> | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<CellCoord | null>(null);
  const [selection, setSelection] = useState<CellRange | null>(null);
  const [activeCell, setActiveCell] = useState<CellCoord | null>(null);
  const [historyPast, setHistoryPast] = useState<CellUpdate[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<CellUpdate[][]>([]);
  const [newSheetName, setNewSheetName] = useState("");
  const [renamingSheetId, setRenamingSheetId] = useState<Id<"todoExcelSheets"> | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const createWorkspaceSheet = useMutation(api.todoExcelSheets.createWorkspaceSheet);
  const createPrivateSheet = useMutation(api.todoExcelSheets.createPrivateSheet);
  const renameSheet = useMutation(api.todoExcelSheets.renameSheet);
  const addRow = useMutation(api.todoExcelSheets.addRow);
  const addColumn = useMutation(api.todoExcelSheets.addColumn);
  const updateCell = useMutation(api.todoExcelSheets.updateCell);
  const batchUpdateCells = useMutation(api.todoExcelSheets.batchUpdateCells);

  const resolvedActiveSheetId = sheets?.length
    ? activeSheetId && sheets.some((sheet) => sheet._id === activeSheetId)
      ? activeSheetId
      : sheets[0]._id
    : null;

  const activeSheet = sheets?.find((sheet) => sheet._id === resolvedActiveSheetId) ?? null;
  const rows = useQuery(api.todoExcelSheets.getSheetRows, resolvedActiveSheetId ? { sheetId: resolvedActiveSheetId } : "skip") as ExcelRow[] | undefined;

  const rowsByIndex = useMemo(() => new Map((rows ?? []).map((row) => [row.rowIndex, row])), [rows]);

  const commitBatch = async (updates: Array<{ rowIndex: number; colIndex: number; value: string }>, recordHistory = true) => {
    if (!resolvedActiveSheetId) return;
    const payload = updates.map((update) => ({ rowIndex: update.rowIndex, columnKey: columnLabel(update.colIndex), value: update.value }));
    if (recordHistory) {
      const history = updates.map((update) => ({
        rowIndex: update.rowIndex,
        columnKey: columnLabel(update.colIndex),
        before: rowsByIndex.get(update.rowIndex)?.cells[columnLabel(update.colIndex)] ?? "",
        after: update.value,
      }));
      setHistoryPast((current) => [...current, history]);
      setHistoryFuture([]);
    }
    await batchUpdateCells({ sheetId: resolvedActiveSheetId, updates: payload });
  };

  const focusCell = (coord: CellCoord) => {
    const element = document.querySelector<HTMLElement>(`[data-excel-cell="${coord.rowIndex}:${coord.colIndex}"]`);
    element?.focus();
  };

  const activate = (coord: CellCoord, extend: boolean) => {
    setActiveCell(coord);
    if (!extend || !selectionAnchor) {
      setSelectionAnchor(coord);
      setSelection(normalizeRange(coord, coord));
      return;
    }
    setSelection(normalizeRange(selectionAnchor, coord));
  };

  const navigate = (coord: CellCoord, direction: "left" | "right" | "up" | "down", extend: boolean) => {
    if (!activeSheet) return;
    const next = { ...coord };
    if (direction === "left") next.colIndex -= 1;
    if (direction === "right") next.colIndex += 1;
    if (direction === "up") next.rowIndex -= 1;
    if (direction === "down") next.rowIndex += 1;
    if (next.rowIndex < 0 || next.colIndex < 0 || next.rowIndex >= activeSheet.rowCount || next.colIndex >= activeSheet.columnCount) {
      return;
    }
    activate(next, extend);
    focusCell(next);
  };

  const createSheet = async () => {
    if (scope === "workspace") {
      if (!workspaceId || !clerkId) return;
      const id = await createWorkspaceSheet({ workspaceId, clerkId, name: newSheetName || `Sheet ${(sheets?.length ?? 0) + 1}` });
      setActiveSheetId(id);
    } else {
      if (!createdBy) return;
      const id = await createPrivateSheet({ createdBy, name: newSheetName || `Sheet ${(sheets?.length ?? 0) + 1}` });
      setActiveSheetId(id);
    }
    setNewSheetName("");
    toast.success("Sheet created.");
  };

  const handleUndo = async () => {
    if (!resolvedActiveSheetId) return;
    const batch = historyPast[historyPast.length - 1];
    if (!batch) return;
    await batchUpdateCells({
      sheetId: resolvedActiveSheetId,
      updates: batch.map((entry) => ({ rowIndex: entry.rowIndex, columnKey: entry.columnKey, value: entry.before })),
    });
    setHistoryPast((current) => current.slice(0, -1));
    setHistoryFuture((current) => [batch, ...current]);
  };

  const handleRedo = async () => {
    if (!resolvedActiveSheetId) return;
    const [batch, ...rest] = historyFuture;
    if (!batch) return;
    await batchUpdateCells({
      sheetId: resolvedActiveSheetId,
      updates: batch.map((entry) => ({ rowIndex: entry.rowIndex, columnKey: entry.columnKey, value: entry.after })),
    });
    setHistoryFuture(rest);
    setHistoryPast((current) => [...current, batch]);
  };

  const exportCsv = () => {
    if (!activeSheet) return;
    const lines: string[] = [];
    for (let rowIndex = 0; rowIndex < activeSheet.rowCount; rowIndex += 1) {
      const row = rowsByIndex.get(rowIndex);
      const values = Array.from({ length: activeSheet.columnCount }, (_, colIndex) => csvEscape(row?.cells[columnLabel(colIndex)] ?? ""));
      lines.push(values.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeSheet.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    if (!activeSheet) return;
    const matrix = parseCsv(await file.text());
    const requiredRows = matrix.length;
    const requiredCols = Math.max(0, ...matrix.map((row) => row.length));
    if (requiredRows > activeSheet.rowCount) {
      await addRow({ sheetId: activeSheet._id, count: requiredRows - activeSheet.rowCount });
    }
    if (requiredCols > activeSheet.columnCount) {
      await addColumn({ sheetId: activeSheet._id, count: requiredCols - activeSheet.columnCount });
    }
    const updates = matrix.flatMap((row, rowIndex) => row.map((value, colIndex) => ({ rowIndex, colIndex, value })));
    await commitBatch(updates);
    toast.success("CSV imported.");
  };

  if (!sheets) {
    return <div className="flex-1 rounded-2xl border p-4" style={{ borderColor: "var(--hairline-strong)" }}>Loading sheets...</div>;
  }

  if (!sheets.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <div className="text-lg font-semibold" style={{ color: "var(--ink)" }}>No Excel sheets yet</div>
        <div className="text-sm" style={{ color: "var(--mute)" }}>Create a separate saved spreadsheet for this {scope === "workspace" ? "workspace" : "private space"}.</div>
        <div className="flex items-center gap-2">
          <input value={newSheetName} onChange={(event) => setNewSheetName(event.target.value)} placeholder="Sheet 1" className="input-field w-48" />
          <button onClick={() => void createSheet()} className="btn-primary"><Plus size={14} /> Create sheet</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-full flex-col overflow-hidden rounded-2xl border" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex flex-wrap items-center gap-2">
          {sheets.map((sheet) => (
            <div key={sheet._id} className="flex items-center">
              {renamingSheetId === sheet._id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={() => {
                    void renameSheet({ sheetId: sheet._id, name: renameValue || sheet.name });
                    setRenamingSheetId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  className="input-field h-9 w-32"
                />
              ) : (
                <button
                  onClick={() => setActiveSheetId(sheet._id)}
                  onDoubleClick={() => {
                    setRenamingSheetId(sheet._id);
                    setRenameValue(sheet.name);
                  }}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={sheet._id === resolvedActiveSheetId ? { backgroundColor: "var(--surface-elevated)", color: "var(--ink)" } : { color: "var(--mute)" }}
                >
                  {sheet.name}
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input value={newSheetName} onChange={(event) => setNewSheetName(event.target.value)} placeholder={`Sheet ${(sheets.length ?? 0) + 1}`} className="input-field h-9 w-32" />
            <button onClick={() => void createSheet()} className="btn-outline text-xs"><Plus size={12} /> Add sheet</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => activeSheet && void addRow({ sheetId: activeSheet._id, count: 10 })} className="btn-outline text-xs">+ 10 rows</button>
          <button onClick={() => activeSheet && void addColumn({ sheetId: activeSheet._id, count: 3 })} className="btn-outline text-xs">+ 3 cols</button>
          <button onClick={() => void handleUndo()} disabled={!historyPast.length} className="btn-outline text-xs"><RotateCcw size={12} /> Undo</button>
          <button onClick={() => void handleRedo()} disabled={!historyFuture.length} className="btn-outline text-xs"><RotateCw size={12} /> Redo</button>
          <input id="excel-import" type="file" accept=".csv" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void importCsv(file);
            event.currentTarget.value = "";
          }} />
          <label htmlFor="excel-import" className="btn-outline cursor-pointer text-xs"><Upload size={12} /> Import CSV</label>
          <button onClick={exportCsv} className="btn-outline text-xs"><Download size={12} /> Export CSV</button>
        </div>
      </div>

      {activeSheet ? (
        <div className="flex-1 overflow-auto">
          <table className="min-w-max border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 border-b border-r px-3 py-2" style={{ backgroundColor: "var(--surface-elevated)", borderColor: "var(--hairline)" }} />
                {Array.from({ length: activeSheet.columnCount }, (_, colIndex) => (
                  <th key={colIndex} className="sticky top-0 z-10 border-b border-r px-3 py-2 text-center text-xs font-semibold uppercase" style={{ minWidth: 140, backgroundColor: "var(--surface-elevated)", borderColor: "var(--hairline)", color: "var(--mute)" }}>
                    {columnLabel(colIndex)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: activeSheet.rowCount }, (_, rowIndex) => {
                const row = rowsByIndex.get(rowIndex);
                return (
                  <tr key={rowIndex}>
                    <th className="sticky left-0 z-10 border-b border-r px-3 py-2 text-right text-xs font-semibold" style={{ backgroundColor: "var(--surface-elevated)", borderColor: "var(--hairline)", color: "var(--mute)" }}>
                      {rowIndex + 1}
                    </th>
                    {Array.from({ length: activeSheet.columnCount }, (_, colIndex) => {
                      const key = columnLabel(colIndex);
                      const coord = { rowIndex, colIndex };
                      const isActive = activeCell?.rowIndex === rowIndex && activeCell.colIndex === colIndex;
                      const isSelected = selection && rowIndex >= selection.startRow && rowIndex <= selection.endRow && colIndex >= selection.startCol && colIndex <= selection.endCol;
                      return (
                        <td key={colIndex} className="border-b border-r p-0" style={{ borderColor: "var(--hairline)", backgroundColor: isSelected ? "rgba(59,130,246,0.06)" : "transparent" }}>
                          <input
                            data-excel-cell={`${rowIndex}:${colIndex}`}
                            defaultValue={row?.cells[key] ?? ""}
                            onFocus={() => activate(coord, false)}
                            onMouseDown={() => activate(coord, false)}
                            onMouseEnter={(event) => {
                              if (event.buttons === 1) activate(coord, true);
                            }}
                            onBlur={(event) => {
                              const after = event.currentTarget.value;
                              const before = row?.cells[key] ?? "";
                              if (after === before || !resolvedActiveSheetId) return;
                              void updateCell({ sheetId: resolvedActiveSheetId, rowIndex, columnKey: key, value: after }).then(() => {
                                setHistoryPast((current) => [...current, [{ rowIndex, columnKey: key, before, after }]]);
                                setHistoryFuture([]);
                              });
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "ArrowLeft") { event.preventDefault(); navigate(coord, "left", event.shiftKey); }
                              if (event.key === "ArrowRight") { event.preventDefault(); navigate(coord, "right", event.shiftKey); }
                              if (event.key === "ArrowUp") { event.preventDefault(); navigate(coord, "up", event.shiftKey); }
                              if (event.key === "ArrowDown") { event.preventDefault(); navigate(coord, "down", event.shiftKey); }
                              if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); navigate(coord, "down", false); }
                              if (event.key === "Tab") { event.preventDefault(); event.currentTarget.blur(); navigate(coord, event.shiftKey ? "left" : "right", false); }
                            }}
                            onPaste={(event) => {
                              const text = event.clipboardData.getData("text/plain");
                              if (!text.includes("\t") && !text.includes("\n")) return;
                              event.preventDefault();
                              const matrix = text.replace(/\r/g, "").split("\n").filter(Boolean).map((item) => item.split("\t"));
                              void commitBatch(matrix.flatMap((matrixRow, rowOffset) => matrixRow.map((value, colOffset) => ({ rowIndex: rowIndex + rowOffset, colIndex: colIndex + colOffset, value }))));
                            }}
                            className="h-10 w-full min-w-[140px] bg-transparent px-3 text-sm outline-none"
                            style={{ color: "var(--ink)", boxShadow: isActive ? "inset 0 0 0 1px var(--accent-blue)" : undefined }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
