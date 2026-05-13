"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Plus, Lock, Circle, Clock, CheckCircle2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverlay, useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const STATUSES = [
  { id: "todo", label: "To-do", icon: Circle, color: "var(--charcoal)" },
  { id: "in-progress", label: "In progress", icon: Clock, color: "var(--accent-blue)" },
  { id: "completed", label: "Complete", icon: CheckCircle2, color: "var(--accent-green)" },
] as const;

export default function PrivateTodosPage() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");

  const todos = useQuery(
    api.todos.getPrivateTodos,
    convexUser ? { createdBy: convexUser._id } : "skip"
  );
  const createTodo = useMutation(api.todos.createTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  const [creatingInStatus, setCreatingInStatus] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState<any | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleCreate = async (status: string) => {
    if (!convexUser || !newTitle.trim()) { setCreatingInStatus(null); return; }
    try {
      await createTodo({ scope: "private", title: newTitle.trim(), priority: "medium", status, createdBy: convexUser._id });
      setNewTitle(""); setCreatingInStatus(null); toast.success("Task added.");
    } catch { toast.error("Failed to add task."); }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try { await updateTodo({ id: id as any, status: newStatus }); }
    catch { toast.error("Failed to move task."); }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const task = todos?.find((t) => t._id === active.id);
    if (!task) return;
    const currentStatus = task.status || (task.completed ? "completed" : "todo");
    if (currentStatus !== over.id) handleUpdateStatus(active.id as string, over.id as string);
  };

  const tasksByStatus = {
    todo: todos?.filter((t) => t.status === "todo" || (!t.status && !t.completed)) ?? [],
    "in-progress": todos?.filter((t) => t.status === "in-progress") ?? [],
    completed: todos?.filter((t) => t.status === "completed" || t.completed) ?? [],
  };

  return (
    <div className="page-container animate-fade-in-up relative h-full flex flex-col max-w-none overflow-hidden">
      {/* Header */}
      <div className="page-header border-b pb-8 mb-8 relative z-10 shrink-0" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lock size={13} style={{ color: "var(--mute)" }} />
            <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--mute)" }}>Private</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>Kanban board</h2>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={(e) => { const task = todos?.find((t) => t._id === e.active.id); if (task) setActiveTask(task); }}
        onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-8 flex-1 items-start relative z-10 min-h-[500px]">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={tasksByStatus[status.id as keyof typeof tasksByStatus]}
              creatingInStatus={creatingInStatus}
              setCreatingInStatus={setCreatingInStatus}
              newTitle={newTitle}
              setNewTitle={setNewTitle}
              handleCreate={handleCreate}
              deleteTodo={deleteTodo}
              handleUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
        <DragOverlay>{activeTask ? <TaskCard task={activeTask} isOverlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({ status, tasks, creatingInStatus, setCreatingInStatus, newTitle, setNewTitle, handleCreate, deleteTodo, handleUpdateStatus }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const StatusIcon = status.icon;
  return (
    <div ref={setNodeRef}
      className={`flex-shrink-0 w-[320px] flex flex-col gap-3 rounded-xl p-2 transition-colors duration-200 border border-transparent ${isOver ? "bg-[var(--surface-elevated)] border-[var(--hairline-strong)]" : ""}`}
      style={{ minHeight: "200px" }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <StatusIcon size={16} style={{ color: status.color }} />
          <span className="font-medium text-sm" style={{ color: "var(--ink)" }}>{status.label}</span>
          <span className="text-sm font-medium ml-1" style={{ color: "var(--mute)" }}>{tasks.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-[var(--surface-elevated)] transition-colors" style={{ color: "var(--mute)" }}><MoreHorizontal size={16} /></button>
          <button onClick={() => setCreatingInStatus(status.id)} className="p-1 rounded hover:bg-[var(--surface-elevated)] transition-colors" style={{ color: "var(--mute)" }}><Plus size={16} /></button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {tasks.map((task: any) => (
          <DraggableTaskCard key={task._id} task={task} deleteTodo={deleteTodo} handleUpdateStatus={handleUpdateStatus} />
        ))}
        {creatingInStatus === status.id ? (
          <div className="feature-card p-3 rounded-xl border shadow-sm" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--accent-blue)" }}>
            <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(status.id); if (e.key === "Escape") setCreatingInStatus(null); }}
              onBlur={() => handleCreate(status.id)}
              placeholder="Task title..." className="w-full bg-transparent text-sm outline-none font-medium" style={{ color: "var(--ink)" }} />
          </div>
        ) : (
          <button onClick={() => setCreatingInStatus(status.id)}
            className="flex items-center gap-2 p-2 w-full rounded-md text-sm transition-colors hover:bg-[var(--surface-elevated)]"
            style={{ color: "var(--mute)" }}>
            <Plus size={16} /> New task
          </button>
        )}
      </div>
    </div>
  );
}

function DraggableTaskCard({ task, deleteTodo, handleUpdateStatus }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task._id, data: task });
  const style = transform ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="relative group cursor-grab active:cursor-grabbing outline-none">
      <TaskCard task={task} deleteTodo={deleteTodo} handleUpdateStatus={handleUpdateStatus} />
    </div>
  );
}

const STATUSES_MAP = [
  { id: "todo", label: "To-do" },
  { id: "in-progress", label: "In progress" },
  { id: "completed", label: "Complete" },
];

function TaskCard({ task, isOverlay, deleteTodo, handleUpdateStatus }: any) {
  return (
    <div className={`feature-card p-4 rounded-xl relative border transition-colors bg-[var(--surface-card)] ${isOverlay ? "shadow-2xl scale-105 border-[var(--hairline-strong)] z-50 cursor-grabbing" : "shadow-sm border-[var(--hairline)] hover:border-[var(--hairline-strong)]"}`}>
      {!isOverlay && deleteTodo && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[var(--surface-card)] rounded-md shadow-sm border p-0.5 z-20" style={{ borderColor: "var(--hairline-strong)" }}>
          <select value="" onChange={(e) => {
            if (e.target.value === "delete") deleteTodo({ id: task._id }).then(() => toast.success("Deleted"));
            else if (e.target.value) handleUpdateStatus(task._id, e.target.value);
          }} className="appearance-none bg-transparent text-xs pl-2 pr-6 py-1 outline-none cursor-pointer" style={{ color: "var(--ink)" }}
            onPointerDown={(e) => e.stopPropagation()}>
            <option value="" disabled>Move to...</option>
            {STATUSES_MAP.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            <option value="delete">Delete</option>
          </select>
          <div className="absolute right-2 pointer-events-none">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>
      )}
      <div className="flex items-start gap-2 mb-3 pr-8">
        <span className="text-[14px] font-medium leading-tight select-none" style={{ color: task.status === "completed" || task.completed ? "var(--mute)" : "var(--ink)", textDecoration: task.status === "completed" || task.completed ? "line-through" : "none" }}>{task.title}</span>
      </div>
      <div className="flex items-center gap-3 mt-4 text-xs font-medium select-none" style={{ color: "var(--mute)" }}>
        <span className="flex items-center gap-1.5 bg-[var(--surface-elevated)] px-2 py-1 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.priority === "high" ? "var(--accent-red)" : task.priority === "medium" ? "var(--accent-yellow)" : "var(--accent-blue)" }} />
          {task.priority}
        </span>
        <span>{format(task.createdAt, "MMM d, yyyy")}</span>
      </div>
    </div>
  );
}
