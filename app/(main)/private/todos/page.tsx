"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Plus, Lock, Circle, Clock, CheckCircle2, ChevronDown, ChevronRight, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TodoCard } from "@/components/todos/todo-card";
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
  const groups = useQuery(
    api.todoGroups.getPrivateGroups,
    convexUser ? { createdBy: convexUser._id } : "skip"
  );
  const createTodo = useMutation(api.todos.createTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const createGroup = useMutation(api.todoGroups.createPrivateGroup);

  const [creatingInStatus, setCreatingInStatus] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [creatingAiInStatus, setCreatingAiInStatus] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiCreating, setIsAiCreating] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const swimlanes = useMemo(() => {
    const lanes = [] as Array<{ id: string; name: string }>;
    if (groups) {
      lanes.push(...groups.map((group) => ({ id: group._id, name: group.name })));
    }
    lanes.push({ id: "no-group", name: "No Group" });
    return lanes;
  }, [groups]);

  const toggleCollapse = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (groupId: string, status: string) => {
    if (!convexUser || !newTitle.trim()) { setCreatingInStatus(null); return; }
    try {
      await createTodo({ scope: "private", title: newTitle.trim(), priority: "medium", status, groupId: groupId === "no-group" ? null : (groupId as any), createdBy: convexUser._id });
      setNewTitle(""); setCreatingInStatus(null); toast.success("Task added.");
    } catch { toast.error("Failed to add task."); }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, newGroupId?: string | null) => {
    try { await updateTodo({ id: id as any, status: newStatus, groupId: newGroupId as any }); }
    catch { toast.error("Failed to move task."); }
  };

  const handleUpdateTodo = async (id: string, updates: Record<string, unknown>) => {
    try {
      await updateTodo({ id: id as any, ...updates });
    } catch (error) {
      throw error;
    }
  };

  const handleCreateWithAi = async (groupId: string, status: string) => {
    if (!convexUser || !aiPrompt.trim()) {
      setCreatingAiInStatus(null);
      return;
    }
    setIsAiCreating(true);
    try {
      const response = await fetch("/api/ai/todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "build", prompt: aiPrompt }),
      });
      const data = (await response.json()) as {
        todo?: {
          title: string;
          description: string;
          priority: string;
          customFields: Array<{ key: string; value: string }>;
        };
        error?: string;
      };
      if (!response.ok || data.error || !data.todo) {
        throw new Error(data.error ?? "Failed to generate todo.");
      }
      await createTodo({
        scope: "private",
        title: data.todo.title,
        description: data.todo.description,
        customFields: data.todo.customFields,
        priority: data.todo.priority,
        status,
        groupId: groupId === "no-group" ? null : (groupId as any),
        createdBy: convexUser._id,
      });
      setAiPrompt("");
      setCreatingAiInStatus(null);
      toast.success("AI todo created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create AI todo.");
    } finally {
      setIsAiCreating(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const task = todos?.find((t) => t._id === active.id);
    if (!task) return;

    const [overGroupId, overStatus] = String(over.id).split("::");
    const currentGroupId = task.groupId || "no-group";
    const currentStatus = task.status || (task.completed ? "completed" : "todo");

    if (currentStatus !== overStatus || currentGroupId !== overGroupId) {
      handleUpdateStatus(active.id as string, overStatus, overGroupId === "no-group" ? null : overGroupId);
    }
  };

  const totalsByStatus = {
    todo: todos?.filter((t) => t.status === "todo" || (!t.status && !t.completed)).length ?? 0,
    "in-progress": todos?.filter((t) => t.status === "in-progress").length ?? 0,
    completed: todos?.filter((t) => t.status === "completed" || t.completed).length ?? 0,
  };

  const handleCreateGroup = async () => {
    if (!convexUser || !newGroupName.trim()) return;
    try {
      await createGroup({ name: newGroupName.trim(), createdBy: convexUser._id });
      setNewGroupName("");
      setShowCreateGroup(false);
      toast.success("Group created");
    } catch {
      toast.error("Failed to create group");
    }
  };

  return (
    <div className="page-container animate-fade-in-up relative h-full flex flex-col max-w-none overflow-hidden">
      {/* Header */}
      <div className="page-header border-b pb-8 mb-8 relative z-10 shrink-0 flex items-center justify-between" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lock size={13} style={{ color: "var(--mute)" }} />
            <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--mute)" }}>Private</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>Kanban board</h2>
        </div>
        <button onClick={() => setShowCreateGroup(true)} className="btn-primary text-sm flex items-center gap-2 px-3">
          <Plus size={16} /> Add group
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={(e) => { const task = todos?.find((t) => t._id === e.active.id); if (task) setActiveTask(task); }}
        onDragCancel={() => setActiveTask(null)}
        onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-8 overflow-y-auto overflow-x-auto pb-12 flex-1 relative z-10">
          <div className="flex gap-6 pl-4 min-w-max">
            {STATUSES.map((status) => {
              const StatusIcon = status.icon;
              return (
                <div key={status.id} className="w-[320px] flex items-center gap-2 p-2 rounded-xl" style={{ backgroundColor: "var(--surface-deep)", border: "1px solid var(--hairline)" }}>
                  <StatusIcon size={16} style={{ color: status.color }} />
                  <span className="font-medium text-sm" style={{ color: "var(--ink)" }}>{status.label}</span>
                  <span className="text-sm font-medium ml-1" style={{ color: "var(--mute)" }}>{totalsByStatus[status.id as keyof typeof totalsByStatus]}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-6 min-w-max">
            {swimlanes.map((lane) => {
              const laneTasks = todos?.filter((task) => (task.groupId || "no-group") === lane.id) || [];
              const isCollapsed = collapsedGroups.has(lane.id);

              return (
                <div key={lane.id} className="flex flex-col">
                  <div className="flex items-center gap-2 pl-4 mb-3 cursor-pointer select-none group w-fit" onClick={() => toggleCollapse(lane.id)}>
                    <div className="p-0.5 rounded transition-colors group-hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)" }}>
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{lane.name}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--mute)" }}>{laneTasks.length}</span>
                  </div>

                  {!isCollapsed && (
                    <div className="flex gap-6 pl-4">
                      {STATUSES.map((status) => {
                        const statusTasks = laneTasks.filter((task) => {
                          if (status.id === "todo") return task.status === "todo" || (!task.status && !task.completed);
                          if (status.id === "in-progress") return task.status === "in-progress";
                          return task.status === "completed" || task.completed;
                        });
                        return (
                          <KanbanColumn
                            key={`${lane.id}::${status.id}`}
                            groupId={lane.id}
                            status={status}
                            tasks={statusTasks}
                            creatingInStatus={creatingInStatus}
                            setCreatingInStatus={setCreatingInStatus}
                           newTitle={newTitle}
                           setNewTitle={setNewTitle}
                           handleCreate={handleCreate}
                           creatingAiInStatus={creatingAiInStatus}
                           setCreatingAiInStatus={setCreatingAiInStatus}
                           aiPrompt={aiPrompt}
                           setAiPrompt={setAiPrompt}
                           handleCreateWithAi={handleCreateWithAi}
                           isAiCreating={isAiCreating}
                           deleteTodo={deleteTodo}
                           handleUpdateStatus={handleUpdateStatus}
                           handleUpdateTodo={handleUpdateTodo}
                           groupOptions={groups?.map((group) => ({ id: group._id, name: group.name })) ?? []}
                         />
                       );
                     })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {typeof document !== "undefined"
          ? createPortal(
              <DragOverlay zIndex={9999} dropAnimation={null}>
                {activeTask ? (
                  <div className="pointer-events-none w-[320px]">
                    <TodoCard task={activeTask} statuses={STATUSES} isOverlay groupOptions={groups?.map((group) => ({ id: group._id, label: group.name })) ?? []} />
                  </div>
                ) : null}
              </DragOverlay>,
              document.body
            )
          : null}
      </DndContext>

      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateGroup(false)}>
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
          <div className="relative w-full max-w-md rounded-xl border p-6 shadow-2xl animate-fade-in-up" style={{ backgroundColor: "var(--surface-elevated)", borderColor: "var(--hairline-strong)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>Create new group</h2>
              <button onClick={() => setShowCreateGroup(false)} className="p-1.5 rounded-md hover:bg-[var(--surface-deep)]" style={{ color: "var(--stone)" }}><X size={16} /></button>
            </div>
            <input autoFocus value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()} placeholder="Group name" className="input-field mb-4 w-full" />
            <div className="flex gap-3">
              <button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="btn-primary flex-1">Create</button>
              <button onClick={() => setShowCreateGroup(false)} className="btn-outline px-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ groupId, status, tasks, creatingInStatus, setCreatingInStatus, newTitle, setNewTitle, handleCreate, creatingAiInStatus, setCreatingAiInStatus, aiPrompt, setAiPrompt, handleCreateWithAi, isAiCreating, deleteTodo, handleUpdateTodo, groupOptions }: any) {
  const droppableId = `${groupId}::${status.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const isCreatingHere = creatingInStatus === droppableId;
  const isCreatingAiHere = creatingAiInStatus === droppableId;
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
          <button onClick={() => setCreatingInStatus(droppableId)} className="p-1 rounded hover:bg-[var(--surface-elevated)] transition-colors" style={{ color: "var(--mute)" }}><Plus size={16} /></button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {isCreatingHere ? (
          <div className="feature-card p-3 rounded-xl border shadow-sm" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--accent-blue)" }}>
            <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(groupId, status.id); if (e.key === "Escape") setCreatingInStatus(null); }}
              onBlur={() => handleCreate(groupId, status.id)}
              placeholder="Task title..." className="w-full bg-transparent text-sm outline-none font-medium" style={{ color: "var(--ink)" }} />
          </div>
        ) : isCreatingAiHere ? (
          <div className="feature-card rounded-xl border p-3 shadow-sm" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--accent-blue)" }}>
            <textarea autoFocus value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void handleCreateWithAi(groupId, status.id); if (e.key === "Escape") setCreatingAiInStatus(null); }}
              placeholder="Describe the task and let AI generate the full todo..." rows={4} className="input-field min-h-[100px] resize-y" />
            <div className="mt-3 flex gap-2">
              <button onClick={() => void handleCreateWithAi(groupId, status.id)} disabled={isAiCreating || !aiPrompt.trim()} className="btn-primary text-xs">{isAiCreating ? "Generating..." : "Create with AI"}</button>
              <button onClick={() => setCreatingAiInStatus(null)} className="btn-outline text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setCreatingAiInStatus(null); setCreatingInStatus(droppableId); }}
              className="flex items-center gap-2 p-2 w-full rounded-md text-sm transition-colors hover:bg-[var(--surface-elevated)]"
              style={{ color: "var(--mute)" }}>
              <Plus size={16} /> New task
            </button>
            <button onClick={() => { setCreatingInStatus(null); setCreatingAiInStatus(droppableId); }}
              className="flex items-center gap-2 rounded-md px-3 text-sm transition-colors hover:bg-[var(--surface-elevated)]"
              style={{ color: "var(--mute)" }}>
              <Sparkles size={14} /> AI
            </button>
          </div>
        )}

        {tasks.map((task: any) => (
          <DraggableTaskCard key={task._id} task={task} deleteTodo={deleteTodo} handleUpdateTodo={handleUpdateTodo} groupOptions={groupOptions} />
        ))}
      </div>
    </div>
  );
}

function DraggableTaskCard({ task, deleteTodo, handleUpdateTodo, groupOptions }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task._id, data: task });
  const style = isDragging
    ? { opacity: 0 }
    : transform
      ? { transform: CSS.Translate.toString(transform) }
      : undefined;
  return (
    <div ref={setNodeRef} style={style} className={`relative outline-none ${isDragging ? "pointer-events-none" : ""}`}>
      <TodoCard
        task={task}
        statuses={STATUSES_MAP}
        groupOptions={groupOptions?.map((option: { id: string; name: string }) => ({ id: option.id, label: option.name }))}
        dragHandleProps={{ attributes, listeners }}
        onDelete={(id) => deleteTodo({ id })}
        onUpdateTodo={(id, updates) => handleUpdateTodo(id, updates)}
      />
    </div>
  );
}

const STATUSES_MAP = [
  { id: "todo", label: "To-do" },
  { id: "in-progress", label: "In progress" },
  { id: "completed", label: "Complete" },
];
