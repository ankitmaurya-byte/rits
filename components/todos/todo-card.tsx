"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { MoreVertical, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type TodoDoc = Doc<"todos">;

type TodoStatus = {
  id: string;
  label: string;
};

type TodoCustomField = {
  key: string;
  value: string;
};

type TodoGroupOption = {
  id: string;
  label: string;
};

type DragHandleProps = {
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
};

type ModalSection = "details" | "ai" | "move";

type TodoUpdate = {
  title: string;
  description: string;
  priority: string;
  status: string;
  groupId?: Id<"todoGroups"> | null;
  customFields: TodoCustomField[];
};

interface TodoCardProps {
  task: TodoDoc;
  statuses: readonly TodoStatus[];
  groupOptions?: TodoGroupOption[];
  isOverlay?: boolean;
  dragHandleProps?: DragHandleProps;
  onDelete?: (id: Id<"todos">) => Promise<void>;
  onUpdateTodo?: (id: Id<"todos">, update: TodoUpdate) => Promise<void>;
}

function normalizeFields(fields: TodoDoc["customFields"]): TodoCustomField[] {
  return (fields ?? []).map((field) => ({ key: field.key, value: field.value }));
}

export function TodoCard({
  task,
  statuses,
  groupOptions,
  isOverlay,
  dragHandleProps,
  onDelete,
  onUpdateTodo,
}: TodoCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalSection, setModalSection] = useState<ModalSection>("details");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? task.sourceDescription ?? "");
  const [priority, setPriority] = useState(task.priority ?? "medium");
  const [status, setStatus] = useState(task.status ?? (task.completed ? "completed" : "todo"));
  const [groupId, setGroupId] = useState<string>(task.groupId ?? "");
  const [customFields, setCustomFields] = useState<TodoCustomField[]>(normalizeFields(task.customFields));
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState<"describe" | "build" | null>(null);
  const aiPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const moveStatusRef = useRef<HTMLSelectElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  const createdAt = format(task.createdAt, "MMM d, yyyy p");
  const updatedAt = format(task.updatedAt ?? task.createdAt, "MMM d, yyyy p");
  const compactDescription = description.trim() || task.sourceDescription?.trim() || "";

  useEffect(() => {
    if (!modalOpen) return;
    const focusTarget =
      modalSection === "ai"
        ? aiPromptRef.current
        : modalSection === "move"
          ? moveStatusRef.current
          : titleRef.current;
    focusTarget?.focus();
  }, [modalOpen, modalSection]);

  const resetDraft = () => {
    setTitle(task.title);
    setDescription(task.description ?? task.sourceDescription ?? "");
    setPriority(task.priority ?? "medium");
    setStatus(task.status ?? (task.completed ? "completed" : "todo"));
    setGroupId(task.groupId ?? "");
    setCustomFields(normalizeFields(task.customFields));
  };

  const handleSave = async () => {
    if (!onUpdateTodo) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Todo title cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await onUpdateTodo(task._id, {
        title: trimmedTitle,
        description: description.trim(),
        priority,
        status,
        groupId: groupOptions ? ((groupId || null) as Id<"todoGroups"> | null) : undefined,
        customFields: customFields
          .map((field) => ({ key: field.key.trim(), value: field.value.trim() }))
          .filter((field) => field.key || field.value),
      });
      toast.success("Task updated.");
      setModalOpen(false);
    } catch {
      toast.error("Failed to update task.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("Delete this task?")) return;
    try {
      await onDelete(task._id);
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete task.");
    }
  };

  const openModal = (section: ModalSection) => {
    resetDraft();
    setMenuOpen(false);
    setModalSection(section);
    setModalOpen(true);
  };

  const handleAi = async (mode: "describe" | "build") => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast.error("Enter an AI prompt first.");
      return;
    }
    setAiBusy(mode);
    try {
      const response = await fetch("/api/ai/todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt,
          todo: {
            title,
            description,
            priority,
            customFields,
          },
        }),
      });
      const data = (await response.json()) as {
        description?: string;
        todo?: {
          title: string;
          description: string;
          priority: string;
          customFields: TodoCustomField[];
        };
        error?: string;
      };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "AI request failed.");
      }
      if (mode === "describe") {
        setDescription(data.description ?? "");
        toast.success("Description drafted.");
      } else if (data.todo) {
        setTitle(data.todo.title);
        setDescription(data.todo.description);
        setPriority(data.todo.priority);
        setCustomFields(data.todo.customFields ?? []);
        toast.success("Todo draft generated.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI request failed.");
    } finally {
      setAiBusy(null);
    }
  };

  if (isOverlay) {
    return (
      <div className="feature-card rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface-card)] p-4 shadow-2xl">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[14px] font-medium leading-tight" style={{ color: "var(--ink)" }}>
              {task.title}
            </p>
          </div>
          <MoreVertical size={14} style={{ color: "var(--mute)" }} />
        </div>
        {compactDescription ? (
          <p className="line-clamp-3 text-xs leading-relaxed" style={{ color: "var(--charcoal)" }}>
            {compactDescription}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div
        className="feature-card cursor-pointer rounded-xl border border-[var(--hairline)] bg-[var(--surface-card)] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--hairline-strong)] hover:shadow-lg"
        {...(dragHandleProps?.listeners ?? {})}
        {...(dragHandleProps?.attributes ?? {})}
        onClick={() => {
          openModal("details");
        }}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="text-[14px] font-medium leading-tight"
                  style={{
                    color: task.status === "completed" || task.completed ? "var(--mute)" : "var(--ink)",
                    textDecoration:
                      task.status === "completed" || task.completed ? "line-through" : "none",
                  }}
                >
                  {title}
                </p>
                {compactDescription ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--charcoal)" }}>
                    {compactDescription}
                  </p>
                ) : null}
              </div>
              <div className="relative flex items-center gap-1" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className="rounded-md bg-[var(--surface-elevated)] p-1.5 transition-colors hover:bg-[var(--surface-deep)]"
                  onClick={() => setMenuOpen((current) => !current)}
                  aria-label="Open task menu"
                  style={{ color: "var(--mute)" }}
                >
                  <MoreVertical size={12} />
                </button>
                {menuOpen ? (
                  <div
                    className="absolute right-0 top-9 z-20 min-w-[160px] rounded-xl border p-1 shadow-xl"
                    style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--hairline-strong)" }}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openModal("details")}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
                      style={{ color: "var(--ink)" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal("ai")}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
                      style={{ color: "var(--ink)" }}
                    >
                      AI prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal("move")}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
                      style={{ color: "var(--ink)" }}
                    >
                      Move
                    </button>
                    {onDelete ? (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
                        style={{ color: "var(--accent-red)" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium" style={{ color: "var(--mute)" }}>
              <span className="rounded-md bg-[var(--surface-elevated)] px-2 py-1">
                {priority}
              </span>
              <span>{format(task.createdAt, "MMM d, yyyy")}</span>
            </div>
          </div>
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => {
            setMenuOpen(false);
            setModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl border p-6 shadow-2xl"
            style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--hairline-strong)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--mute)" }}>
                  Todo details
                </p>
                <h3 className="mt-1 text-lg font-semibold" style={{ color: "var(--ink)" }}>
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md bg-[var(--surface-elevated)] p-2 transition-colors hover:bg-[var(--surface-deep)]"
                aria-label="Close details"
                style={{ color: "var(--mute)" }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)" }}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink)" }}>
                  <Sparkles size={12} /> AI
                </div>
                <textarea
                  ref={aiPromptRef}
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  placeholder="Describe the task you want, or ask AI to improve the description..."
                  rows={3}
                  className="input-field min-h-[90px] resize-y"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleAi("describe");
                    }}
                    disabled={aiBusy !== null}
                    className="btn-outline text-xs"
                  >
                    {aiBusy === "describe" ? "Writing..." : "Write description"}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleAi("build");
                    }}
                    disabled={aiBusy !== null}
                    className="btn-primary text-xs"
                  >
                    {aiBusy === "build" ? "Generating..." : "Fill whole todo"}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium" style={{ color: "var(--body)" }}>
                  Title
                </label>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium" style={{ color: "var(--body)" }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  className="input-field min-h-[130px] resize-y"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium" style={{ color: "var(--body)" }}>
                    Status
                  </label>
                  <select
                    ref={moveStatusRef}
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="input-field"
                  >
                    {statuses.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium" style={{ color: "var(--body)" }}>
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                    className="input-field"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {groupOptions ? (
                <div>
                  <label className="mb-2 block text-xs font-medium" style={{ color: "var(--body)" }}>
                    Group
                  </label>
                  <select
                    value={groupId}
                    onChange={(event) => setGroupId(event.target.value)}
                    className="input-field"
                  >
                    <option value="">No group</option>
                    {groupOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium" style={{ color: "var(--body)" }}>
                    Custom fields
                  </label>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setCustomFields((fields) => [...fields, { key: "", value: "" }]);
                    }}
                    className="btn-outline text-xs"
                  >
                    Add field
                  </button>
                </div>
                <div className="space-y-2">
                  {customFields.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--mute)" }}>
                      No custom fields yet.
                    </p>
                  ) : null}
                  {customFields.map((field, index) => (
                    <div key={`${index}-${field.key}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        value={field.key}
                        onChange={(event) => {
                          const next = [...customFields];
                          next[index] = { ...next[index], key: event.target.value };
                          setCustomFields(next);
                        }}
                        placeholder="Field name"
                        className="input-field"
                      />
                      <input
                        value={field.value}
                        onChange={(event) => {
                          const next = [...customFields];
                          next[index] = { ...next[index], value: event.target.value };
                          setCustomFields(next);
                        }}
                        placeholder="Value"
                        className="input-field"
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCustomFields((fields) => fields.filter((_, fieldIndex) => fieldIndex !== index));
                        }}
                        className="btn-outline px-3 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>
                <p>Created: {createdAt}</p>
                <p className="mt-1">Updated: {updatedAt}</p>
                {task.sourceUrl ? <p className="mt-1 break-all">Source: {task.sourceUrl}</p> : null}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleSave();
                  }}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    resetDraft();
                  }}
                  className="btn-outline"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
