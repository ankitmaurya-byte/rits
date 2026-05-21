"use client";

import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

import type { Doc, Id } from "@/convex/_generated/dataModel";

type TodoDoc = Doc<"todos">;

type TodoStatus = {
  id: string;
  label: string;
};

type TodoGroupOption = {
  id: string;
  label: string;
};

type TodoSheetUpdate = {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  groupId?: Id<"todoGroups"> | null;
};

type TodoCreateInput = {
  title: string;
  description?: string;
  priority: string;
  status: string;
  groupId?: Id<"todoGroups"> | null;
};

const PRIORITIES = ["low", "medium", "high"] as const;

export function TodoSheetView({
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
  onCreateTodo: (input: TodoCreateInput) => Promise<void>;
  onUpdateTodo: (id: Id<"todos">, updates: TodoSheetUpdate) => Promise<void>;
  onDeleteTodo: (id: Id<"todos">) => Promise<void>;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [newStatus, setNewStatus] = useState(statuses[0]?.id ?? "todo");
  const [newGroupId, setNewGroupId] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle || creating) {
      return;
    }

    setCreating(true);
    try {
      await onCreateTodo({
        title: trimmedTitle,
        description: newDescription.trim() || undefined,
        priority: newPriority,
        status: newStatus,
        groupId: groupOptions ? ((newGroupId || null) as Id<"todoGroups"> | null) : undefined,
      });
      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      setNewStatus(statuses[0]?.id ?? "todo");
      setNewGroupId("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative z-10 flex-1 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
      <div className="h-full overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: "var(--surface-elevated)" }}>
            <tr>
              <SheetHeader>Task</SheetHeader>
              <SheetHeader>Description</SheetHeader>
              <SheetHeader>Status</SheetHeader>
              <SheetHeader>Priority</SheetHeader>
              {groupOptions ? <SheetHeader>Group</SheetHeader> : null}
              <SheetHeader>Updated</SheetHeader>
              <SheetHeader>Actions</SheetHeader>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: "var(--surface-deep)" }}>
              <SheetCell>
                <input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleCreate();
                    }
                  }}
                  placeholder="New task"
                  className="w-full bg-transparent outline-none"
                  style={{ color: "var(--ink)" }}
                />
              </SheetCell>
              <SheetCell>
                <input
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  placeholder="Optional notes"
                  className="w-full bg-transparent outline-none"
                  style={{ color: "var(--ink)" }}
                />
              </SheetCell>
              <SheetCell>
                <select value={newStatus} onChange={(event) => setNewStatus(event.target.value)} className="w-full bg-transparent outline-none" style={{ color: "var(--ink)" }}>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
              </SheetCell>
              <SheetCell>
                <select value={newPriority} onChange={(event) => setNewPriority(event.target.value as (typeof PRIORITIES)[number])} className="w-full bg-transparent outline-none" style={{ color: "var(--ink)" }}>
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </SheetCell>
              {groupOptions ? (
                <SheetCell>
                  <select value={newGroupId} onChange={(event) => setNewGroupId(event.target.value)} className="w-full bg-transparent outline-none" style={{ color: "var(--ink)" }}>
                    <option value="">No group</option>
                    {groupOptions.map((group) => (
                      <option key={group.id} value={group.id}>{group.label}</option>
                    ))}
                  </select>
                </SheetCell>
              ) : null}
              <SheetCell>
                <span style={{ color: "var(--mute)" }}>New row</span>
              </SheetCell>
              <SheetCell>
                <button onClick={() => void handleCreate()} disabled={!newTitle.trim() || creating} className="btn-primary px-3 py-1 text-xs">
                  {creating ? "Adding..." : "Add"}
                </button>
              </SheetCell>
            </tr>

            {(todos ?? []).map((todo) => (
              <TodoSheetRow
                key={`${todo._id}:${todo.updatedAt ?? todo.createdAt}`}
                todo={todo}
                statuses={statuses}
                groupOptions={groupOptions}
                onUpdateTodo={onUpdateTodo}
                onDeleteTodo={onDeleteTodo}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TodoSheetRow({
  todo,
  statuses,
  groupOptions,
  onUpdateTodo,
  onDeleteTodo,
}: {
  todo: TodoDoc;
  statuses: readonly TodoStatus[];
  groupOptions?: TodoGroupOption[];
  onUpdateTodo: (id: Id<"todos">, updates: TodoSheetUpdate) => Promise<void>;
  onDeleteTodo: (id: Id<"todos">) => Promise<void>;
}) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? "");
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);

  const currentStatus = todo.status ?? (todo.completed ? "completed" : "todo");
  const currentPriority = todo.priority ?? "medium";
  const currentGroupId = todo.groupId ?? "";

  const commitText = async (field: "title" | "description") => {
    const nextValue = field === "title" ? title.trim() : description.trim();
    const currentValue = field === "title" ? todo.title : (todo.description ?? "");
    if (nextValue === currentValue.trim()) {
      if (field === "title") setTitle(todo.title);
      if (field === "description") setDescription(todo.description ?? "");
      return;
    }

    if (field === "title" && !nextValue) {
      setTitle(todo.title);
      return;
    }

    if (field === "title") setSavingTitle(true);
    else setSavingDescription(true);

    try {
      await onUpdateTodo(
        todo._id,
        field === "title"
          ? { title: nextValue }
          : { description: nextValue }
      );
    } finally {
      if (field === "title") setSavingTitle(false);
      else setSavingDescription(false);
    }
  };

  const updatedAt = new Date(todo.updatedAt ?? todo.createdAt).toLocaleString();

  return (
    <tr className="align-top" style={{ backgroundColor: "var(--surface-card)" }}>
      <SheetCell>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => void commitText("title")}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setTitle(todo.title);
              event.currentTarget.blur();
            }
          }}
          className="w-full bg-transparent outline-none"
          style={{ color: "var(--ink)", opacity: savingTitle ? 0.6 : 1 }}
        />
      </SheetCell>
      <SheetCell>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => void commitText("description")}
          className="min-h-[64px] w-full resize-y bg-transparent outline-none"
          style={{ color: "var(--charcoal)", opacity: savingDescription ? 0.6 : 1 }}
        />
      </SheetCell>
      <SheetCell>
        <select
          value={currentStatus}
          onChange={(event) => void onUpdateTodo(todo._id, { status: event.target.value })}
          className="w-full bg-transparent outline-none"
          style={{ color: "var(--ink)" }}
        >
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </select>
      </SheetCell>
      <SheetCell>
        <select
          value={currentPriority}
          onChange={(event) => void onUpdateTodo(todo._id, { priority: event.target.value })}
          className="w-full bg-transparent outline-none"
          style={{ color: "var(--ink)" }}
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>{priority}</option>
          ))}
        </select>
      </SheetCell>
      {groupOptions ? (
        <SheetCell>
          <select
            value={currentGroupId}
            onChange={(event) => void onUpdateTodo(todo._id, { groupId: (event.target.value || null) as Id<"todoGroups"> | null })}
            className="w-full bg-transparent outline-none"
            style={{ color: "var(--ink)" }}
          >
            <option value="">No group</option>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>{group.label}</option>
            ))}
          </select>
        </SheetCell>
      ) : null}
      <SheetCell>
        <span className="block whitespace-nowrap text-xs" style={{ color: "var(--mute)" }}>{updatedAt}</span>
      </SheetCell>
      <SheetCell>
        <button onClick={() => void onDeleteTodo(todo._id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--stone)" }} aria-label="Delete task">
          <Trash2 size={14} />
        </button>
      </SheetCell>
    </tr>
  );
}

function SheetHeader({ children }: { children: ReactNode }) {
  return (
    <th className="border-b px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ borderColor: "var(--hairline-strong)", color: "var(--mute)" }}>
      {children}
    </th>
  );
}

function SheetCell({ children }: { children: ReactNode }) {
  return (
    <td className="border-b px-4 py-3 align-top" style={{ borderColor: "var(--hairline)" }}>
      {children}
    </td>
  );
}
