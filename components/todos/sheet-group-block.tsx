"use client";

import { useCallback, useEffect, useState } from "react";

import { EditableCell } from "@/components/todos/editable-cell";
import { FieldDropdownEditor } from "@/components/todos/field-dropdown-editor";
import { SheetStatusSection } from "@/components/todos/sheet-status-section";
import type {
  SelectionRange,
  SheetCellKind,
  SheetCoord,
  SheetHistoryEntry,
  TodoCreateInput,
  TodoCustomField,
  TodoDoc,
  TodoGroupOption,
  TodoStatus,
  TodoUpdate,
} from "@/components/todos/sheet-types";

const COLUMN_SEQUENCE: SheetCellKind[] = ["title", "description", "field"];

function parseFieldText(text: string): TodoCustomField[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/[;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const separatorIndex = part.indexOf(":");
      if (separatorIndex === -1) {
        return { key: `Field ${index + 1}`, value: part };
      }
      return {
        key: part.slice(0, separatorIndex).trim() || `Field ${index + 1}`,
        value: part.slice(separatorIndex + 1).trim(),
      };
    });
}

function fieldSummary(fields: TodoCustomField[]) {
  return fields.map((field) => `${field.key}: ${field.value}`).join("; ");
}

function normalizeRange(start: SheetCoord, end: SheetCoord): SelectionRange {
  return {
    groupId: start.groupId,
    startRow: Math.min(start.rowIndex, end.rowIndex),
    endRow: Math.max(start.rowIndex, end.rowIndex),
    startCol: Math.min(start.colIndex, end.colIndex),
    endCol: Math.max(start.colIndex, end.colIndex),
  };
}

export function SheetGroupBlock({
  group,
  statuses,
  tasks,
  columnWidths,
  onResizeColumn,
  onMoveStatus,
  onCreateTodo,
  onUpdateTodo,
  activeCoord,
  selection,
  onActivateCell,
  onNavigateCell,
  onRecordHistory,
}: {
  group: TodoGroupOption;
  statuses: readonly TodoStatus[];
  tasks: TodoDoc[];
  columnWidths: number[];
  onResizeColumn: (columnIndex: number, nextWidth: number) => void;
  onMoveStatus: (statusId: string, direction: "left" | "right") => void;
  onCreateTodo: (input: TodoCreateInput) => Promise<TodoDoc["_id"]>;
  onUpdateTodo: (id: TodoDoc["_id"], updates: TodoUpdate) => Promise<void>;
  activeCoord: SheetCoord | null;
  selection: SelectionRange | null;
  onActivateCell: (coord: SheetCoord, extend: boolean) => void;
  onNavigateCell: (coord: SheetCoord, direction: "left" | "right" | "up" | "down", extend: boolean) => void;
  onRecordHistory: (entries: SheetHistoryEntry[]) => void;
}) {
  const [mouseSelecting, setMouseSelecting] = useState(false);
  const [fillTarget, setFillTarget] = useState<SheetCoord | null>(null);
  const [fillDragging, setFillDragging] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<{ index: number; startX: number; startWidth: number } | null>(null);

  const tasksByStatus = Object.fromEntries(
    statuses.map((status) => [
      status.id,
      tasks.filter((task) => {
        const currentStatus = task.status ?? (task.completed ? "completed" : "todo");
        return currentStatus === status.id;
      }),
    ])
  ) as Record<string, TodoDoc[]>;

  const rowCount = Math.max(1, ...statuses.map((status) => tasksByStatus[status.id].length));

  const cellKey = (rowIndex: number, colIndex: number) => `${group.id}:${rowIndex}:${colIndex}`;

  const focusCell = (coord: SheetCoord) => {
    const element = document.querySelector<HTMLElement>(`[data-sheet-cell="${coord.groupId}:${coord.rowIndex}:${coord.colIndex}"]`);
    element?.focus();
  };

  const navigate = (coord: SheetCoord, direction: "left" | "right" | "up" | "down", extend: boolean) => {
    const next = { ...coord };
    if (direction === "left") next.colIndex -= 1;
    if (direction === "right") next.colIndex += 1;
    if (direction === "up") next.rowIndex -= 1;
    if (direction === "down") next.rowIndex += 1;
    if (next.colIndex < 0 || next.colIndex >= statuses.length * 3 || next.rowIndex < 0 || next.rowIndex >= rowCount) {
      return;
    }
    onNavigateCell(next, direction, extend);
    focusCell(next);
  };

  const getTarget = useCallback((rowIndex: number, colIndex: number) => {
    const statusIndex = Math.floor(colIndex / 3);
    const status = statuses[statusIndex];
    const kind = COLUMN_SEQUENCE[colIndex % 3];
    const todo = tasksByStatus[status.id][rowIndex] ?? null;
    return { status, kind, todo };
  }, [statuses, tasksByStatus]);

  const getDisplayValue = useCallback((rowIndex: number, colIndex: number) => {
    const target = getTarget(rowIndex, colIndex);
    if (!target.todo) return "";
    if (target.kind === "title") return target.todo.title;
    if (target.kind === "description") return target.todo.description ?? "";
    return fieldSummary(target.todo.customFields?.map((field) => ({ key: field.key, value: field.value })) ?? []);
  }, [getTarget]);

  const isSelected = (coord: SheetCoord) => {
    if (!selection || selection.groupId !== coord.groupId) return false;
    return coord.rowIndex >= selection.startRow && coord.rowIndex <= selection.endRow && coord.colIndex >= selection.startCol && coord.colIndex <= selection.endCol;
  };

  const commitCell = useCallback(async (rowIndex: number, colIndex: number, nextValue: string | TodoCustomField[]) => {
    const target = getTarget(rowIndex, colIndex);
    const defaultGroupId = group.id === "no-group" || group.id === "no-team" ? null : group.id;

    if (target.todo) {
      let before: TodoUpdate | null = null;
      let after: TodoUpdate | null = null;
      if (target.kind === "title" && typeof nextValue === "string") {
        before = { title: target.todo.title };
        after = { title: nextValue || target.todo.title };
      }
      if (target.kind === "description" && typeof nextValue === "string") {
        before = { description: target.todo.description ?? "" };
        after = { description: nextValue };
      }
      if (target.kind === "field" && !Array.isArray(nextValue)) {
        before = { customFields: target.todo.customFields?.map((field) => ({ key: field.key, value: field.value })) ?? [] };
        after = { customFields: parseFieldText(nextValue) };
      }
      if (target.kind === "field" && Array.isArray(nextValue)) {
        before = { customFields: target.todo.customFields?.map((field) => ({ key: field.key, value: field.value })) ?? [] };
        after = { customFields: nextValue };
      }
      if (!before || !after) return null;
      await onUpdateTodo(target.todo._id, after);
      return { type: "update", todoId: target.todo._id, before, after } satisfies SheetHistoryEntry;
    }

    const payload: TodoCreateInput = {
      title: target.kind === "title" && typeof nextValue === "string" ? nextValue || "Untitled task" : "Untitled task",
      description: target.kind === "description" && typeof nextValue === "string" ? nextValue : undefined,
      priority: "medium",
      status: target.status.id,
      groupId: defaultGroupId,
      customFields:
        target.kind === "field"
          ? Array.isArray(nextValue)
            ? nextValue
            : parseFieldText(nextValue)
          : undefined,
    };
    const createdId = await onCreateTodo(payload);
    return { type: "create", createdId, payload } satisfies SheetHistoryEntry;
  }, [getTarget, group.id, onCreateTodo, onUpdateTodo]);

  const commitAndRecord = async (rowIndex: number, colIndex: number, nextValue: string | TodoCustomField[]) => {
    const entry = await commitCell(rowIndex, colIndex, nextValue);
    if (entry) onRecordHistory([entry]);
  };

  const applyPasteMatrix = async (coord: SheetCoord, matrix: string[][]) => {
    const entries: SheetHistoryEntry[] = [];
    for (let rowOffset = 0; rowOffset < matrix.length; rowOffset += 1) {
      for (let colOffset = 0; colOffset < matrix[rowOffset].length; colOffset += 1) {
        const nextRow = coord.rowIndex + rowOffset;
        const nextCol = coord.colIndex + colOffset;
        if (nextRow >= rowCount || nextCol >= statuses.length * 3) continue;
        const value = matrix[rowOffset][colOffset]?.trim();
        if (!value) continue;
        const entry = await commitCell(nextRow, nextCol, value);
        if (entry) entries.push(entry);
      }
    }
    if (entries.length) onRecordHistory(entries);
  };

  const applyFill = useCallback(async () => {
    if (!selection || selection.groupId !== group.id || !fillTarget) return;
    const source = selection;
    const target = normalizeRange(
      { groupId: group.id, rowIndex: source.startRow, colIndex: source.startCol },
      fillTarget
    );
    const entries: SheetHistoryEntry[] = [];
    for (let row = target.startRow; row <= target.endRow; row += 1) {
      for (let col = target.startCol; col <= target.endCol; col += 1) {
        const insideSource = row >= source.startRow && row <= source.endRow && col >= source.startCol && col <= source.endCol;
        if (insideSource) continue;
        const sourceRow = source.startRow + ((row - source.startRow) % (source.endRow - source.startRow + 1));
        const sourceCol = source.startCol + ((col - source.startCol) % (source.endCol - source.startCol + 1));
        const value = getDisplayValue(sourceRow, sourceCol);
        const entry = await commitCell(row, col, value);
        if (entry) entries.push(entry);
      }
    }
    if (entries.length) onRecordHistory(entries);
    setFillTarget(null);
  }, [commitCell, fillTarget, getDisplayValue, group.id, onRecordHistory, selection]);

  useEffect(() => {
    const handleMouseUp = () => {
      setMouseSelecting(false);
      if (fillDragging) {
        void applyFill();
      }
      setFillDragging(false);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [fillDragging, applyFill]);

  useEffect(() => {
    if (resizingColumn === null) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const delta = event.clientX - resizingColumn.startX;
      onResizeColumn(resizingColumn.index, Math.max(120, Math.min(480, resizingColumn.startWidth + delta)));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onResizeColumn, resizingColumn]);

  return (
    <>
      <tr>
        <th colSpan={statuses.length * 3} className="border-b px-4 py-4 text-center text-base font-semibold" style={{ borderColor: "var(--hairline-strong)", color: "var(--ink)", backgroundColor: "var(--surface-elevated)" }}>
          {group.label}
        </th>
      </tr>
      <tr>
        {statuses.map((status, statusIndex) => (
          <SheetStatusSection
            key={status.id}
            label={status.label}
            canMoveLeft={statusIndex > 0}
            canMoveRight={statusIndex < statuses.length - 1}
            onMoveLeft={() => onMoveStatus(status.id, "left")}
            onMoveRight={() => onMoveStatus(status.id, "right")}
          />
        ))}
      </tr>
      <tr>
        {statuses.flatMap((_status, statusIndex) =>
          COLUMN_SEQUENCE.map((kind, kindIndex) => {
            const columnIndex = statusIndex * 3 + kindIndex;
            const label = kind === "title" ? "Title" : kind === "description" ? "Description" : "Field";
            return (
              <th key={`${group.id}:${statusIndex}:${kind}`} className="border-b border-r px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ width: columnWidths[columnIndex], minWidth: columnWidths[columnIndex], borderColor: "var(--hairline)", color: "var(--mute)", backgroundColor: "var(--surface-card)" }}>
                <div className="relative flex items-center justify-between gap-2">
                  <span>{label}</span>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setResizingColumn({
                        index: columnIndex,
                        startX: event.clientX,
                        startWidth: columnWidths[columnIndex],
                      });
                    }}
                    className="absolute -right-3 top-1/2 z-20 h-8 w-3 -translate-y-1/2 cursor-col-resize"
                    aria-label={`Resize ${label} column`}
                    title={`Resize ${label} column`}
                  >
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2" style={{ backgroundColor: resizingColumn?.index === columnIndex ? "var(--accent-blue)" : "var(--hairline-strong)" }} />
                  </button>
                </div>
              </th>
            );
          })
        )}
      </tr>

      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={`${group.id}:${rowIndex}`}>
          {statuses.flatMap((status, statusIndex) => {
            const todo = tasksByStatus[status.id][rowIndex] ?? null;
            const baseColIndex = statusIndex * 3;
            const fields = todo?.customFields?.map((field) => ({ key: field.key, value: field.value })) ?? [];

            return [0, 1, 2].map((offset) => {
              const colIndex = baseColIndex + offset;
              const coord = { groupId: group.id, rowIndex, colIndex };
              const active = activeCoord?.groupId === group.id && activeCoord.rowIndex === rowIndex && activeCoord.colIndex === colIndex;
              const selected = isSelected(coord);
              return (
                <td
                  key={`${status.id}:${offset}:${rowIndex}`}
                  className="relative border-b border-r px-3 py-2 align-top"
                  style={{ width: columnWidths[colIndex], minWidth: columnWidths[colIndex], borderColor: fillTarget?.groupId === group.id && fillTarget.rowIndex === rowIndex && fillTarget.colIndex === colIndex ? "var(--accent-blue)" : "var(--hairline)", backgroundColor: selected ? "rgba(59,130,246,0.04)" : "transparent" }}
                  onMouseDown={() => {
                    onActivateCell(coord, false);
                    setMouseSelecting(true);
                  }}
                  onMouseEnter={() => {
                    if (mouseSelecting) onActivateCell(coord, true);
                    if (fillDragging) setFillTarget(coord);
                  }}
                >
                  {offset === 0 ? (
                    <EditableCell
                      cellKey={cellKey(rowIndex, colIndex)}
                      coord={coord}
                      value={todo?.title ?? ""}
                      placeholder="Empty"
                      active={active}
                      selected={selected}
                      onCommit={(value) => commitAndRecord(rowIndex, colIndex, value)}
                      onActivate={onActivateCell}
                      onNavigate={navigate}
                      onPasteMatrix={applyPasteMatrix}
                    />
                  ) : null}
                  {offset === 1 ? (
                    <EditableCell
                      cellKey={cellKey(rowIndex, colIndex)}
                      coord={coord}
                      value={todo?.description ?? ""}
                      placeholder="Empty"
                      active={active}
                      selected={selected}
                      onCommit={(value) => commitAndRecord(rowIndex, colIndex, value)}
                      onActivate={onActivateCell}
                      onNavigate={navigate}
                      onPasteMatrix={applyPasteMatrix}
                    />
                  ) : null}
                  {offset === 2 ? (
                    <>
                      <FieldDropdownEditor
                        cellKey={cellKey(rowIndex, colIndex)}
                        coord={coord}
                        fields={fields}
                        active={active}
                        selected={selected}
                        onSave={(nextFields) => commitAndRecord(rowIndex, colIndex, nextFields)}
                        onActivate={onActivateCell}
                        onNavigate={navigate}
                        onPasteMatrix={applyPasteMatrix}
                      />
                      {fields.length ? <div className="mt-2 text-xs" style={{ color: "var(--mute)" }}>{fieldSummary(fields)}</div> : null}
                    </>
                  ) : null}
                  {active ? (
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setFillDragging(true);
                        setFillTarget(coord);
                      }}
                      className="absolute bottom-0 right-0 h-2.5 w-2.5 translate-x-1/2 translate-y-1/2 rounded-full border"
                      style={{ backgroundColor: "var(--accent-blue)", borderColor: "var(--surface-card)" }}
                      aria-label="Drag to fill"
                    />
                  ) : null}
                </td>
              );
            });
          })}
        </tr>
      ))}

      <tr>
        <td colSpan={statuses.length * 3} className="h-6 border-b" style={{ borderColor: "transparent" }} />
      </tr>
    </>
  );
}
