import type { Doc, Id } from "@/convex/_generated/dataModel";

export type TodoDoc = Doc<"todos">;

export type TodoStatus = {
  id: string;
  label: string;
};

export type TodoGroupOption = {
  id: string;
  label: string;
};

export type TodoCustomField = {
  key: string;
  value: string;
};

export type TodoUpdate = {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  groupId?: Id<"todoGroups"> | null;
  customFields?: TodoCustomField[];
};

export type TodoCreateInput = {
  title: string;
  description?: string;
  priority: string;
  status: string;
  groupId?: string | null;
  customFields?: TodoCustomField[];
};

export type SheetCellKind = "title" | "description" | "field";

export type SheetCoord = {
  groupId: string;
  rowIndex: number;
  colIndex: number;
};

export type SelectionRange = {
  groupId: string;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};

export type SheetHistoryEntry =
  | {
      type: "update";
      todoId: Id<"todos">;
      before: TodoUpdate;
      after: TodoUpdate;
    }
  | {
      type: "create";
      createdId: Id<"todos">;
      payload: TodoCreateInput;
    };
