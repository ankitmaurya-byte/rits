"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/use-workspace";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Sparkles, CheckCircle2, Circle, Clock } from "lucide-react";
import { toast } from "sonner";
import { TodoCard } from "@/components/todos/todo-card";

import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const STATUSES = [
  { id: "todo", label: "To-do", icon: Circle, color: "var(--charcoal)" },
  { id: "in-progress", label: "In progress", icon: Clock, color: "var(--accent-blue)" },
  { id: "completed", label: "Complete", icon: CheckCircle2, color: "var(--accent-green)" }
] as const;

export default function TodosPage() {
  const { workspaceId, isLoading } = useWorkspace();

  const todos = useQuery(api.todos.getTodos, workspaceId ? { workspaceId } : "skip");
  const createTodo = useMutation(api.todos.createTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  const [creatingInStatus, setCreatingInStatus] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [creatingAiInStatus, setCreatingAiInStatus] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiCreating, setIsAiCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px drag distance to activate, prevents accidental drags when clicking
      },
    })
  );

  const handleCreate = async (status: string) => {
    if (!workspaceId || !newTitle.trim()) {
      setCreatingInStatus(null);
      return;
    }
    
    try {
      await createTodo({ workspaceId, scope: "workspace", title: newTitle.trim(), priority: "medium", status });
      setNewTitle("");
      setCreatingInStatus(null);
      toast.success("Task added.");
    } catch {
      toast.error("Failed to add task.");
    }
  };

  const handleCreateWithAi = async (status: string) => {
    if (!workspaceId || !aiPrompt.trim()) {
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
        workspaceId,
        scope: "workspace",
        title: data.todo.title,
        description: data.todo.description,
        customFields: data.todo.customFields,
        priority: data.todo.priority,
        status,
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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateTodo({ id: id as any, status: newStatus });
    } catch {
      toast.error("Failed to move task.");
    }
  };

  const handleUpdateTodo = async (id: string, updates: Record<string, unknown>) => {
    try {
      await updateTodo({ id: id as any, ...updates });
    } catch (e) {
      throw e;
    }
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const task = todos?.find(t => t._id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    
    const task = todos?.find(t => t._id === taskId);
    if (!task) return;

    const currentStatus = task.status || (task.completed ? "completed" : "todo");
    
    if (currentStatus !== newStatus) {
      // Optimistic visual update happens naturally because Convex is very fast
      handleUpdateStatus(taskId, newStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton h-10 w-48 mb-8" />
        <div className="flex gap-6">
           {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-[500px] flex-1 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const tasksByStatus = {
    "todo": todos?.filter((t) => t.status === "todo" || (!t.status && !t.completed)) ?? [],
    "in-progress": todos?.filter((t) => t.status === "in-progress") ?? [],
    "completed": todos?.filter((t) => t.status === "completed" || t.completed) ?? [],
  };

  return (
    <div className="page-container animate-fade-in-up relative h-full flex flex-col max-w-none overflow-hidden">
      
      {/* Header */}
      <div className="page-header border-b pb-8 mb-8 relative z-10 shrink-0" style={{ borderColor: "var(--hairline-strong)" }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md" style={{ backgroundColor: "var(--accent-orange)", color: "var(--canvas)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
            Kanban board
          </h2>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
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
              creatingAiInStatus={creatingAiInStatus}
              setCreatingAiInStatus={setCreatingAiInStatus}
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              handleCreateWithAi={handleCreateWithAi}
              isAiCreating={isAiCreating}
              deleteTodo={deleteTodo}
              handleUpdateStatus={handleUpdateStatus}
              handleUpdateTodo={handleUpdateTodo}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TodoCard task={activeTask} statuses={STATUSES} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------

function KanbanColumn({ status, tasks, creatingInStatus, setCreatingInStatus, newTitle, setNewTitle, handleCreate, creatingAiInStatus, setCreatingAiInStatus, aiPrompt, setAiPrompt, handleCreateWithAi, isAiCreating, deleteTodo, handleUpdateTodo }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  const StatusIcon = status.icon;
  const isCreatingHere = creatingInStatus === status.id;
  const isCreatingAiHere = creatingAiInStatus === status.id;

  return (
    <div 
      ref={setNodeRef}
      className={`flex-shrink-0 w-[320px] flex flex-col gap-3 rounded-xl p-2 transition-colors duration-200 border border-transparent ${isOver ? 'bg-[var(--surface-elevated)] border-[var(--hairline-strong)]' : ''}`}
      style={{ minHeight: "200px" }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <StatusIcon size={16} style={{ color: status.color }} />
          <span className="font-medium text-sm" style={{ color: "var(--ink)" }}>{status.label}</span>
          <span className="text-sm font-medium ml-1" style={{ color: "var(--mute)" }}>{tasks.length}</span>
        </div>
        <button 
          onClick={() => setCreatingInStatus(status.id)}
          className="p-1 rounded hover:bg-[var(--surface-elevated)] transition-colors" 
          style={{ color: "var(--mute)" }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Tasks List */}
      <div className="flex flex-col gap-3">
        {isCreatingHere ? (
          <div className="feature-card p-3 rounded-xl border shadow-sm" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--accent-blue)" }}>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate(status.id);
                if (e.key === "Escape") setCreatingInStatus(null);
              }}
              onBlur={() => handleCreate(status.id)}
              placeholder="Task title..."
              className="w-full bg-transparent text-sm outline-none font-medium"
               style={{ color: "var(--ink)" }}
             />
           </div>
        ) : isCreatingAiHere ? (
          <div className="feature-card rounded-xl border p-3 shadow-sm" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--accent-blue)" }}>
            <textarea
              autoFocus
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void handleCreateWithAi(status.id);
                if (e.key === "Escape") setCreatingAiInStatus(null);
              }}
              placeholder="Describe the task and let AI generate the full todo..."
              rows={4}
              className="input-field min-h-[100px] resize-y"
            />
            <div className="mt-3 flex gap-2">
              <button onClick={() => void handleCreateWithAi(status.id)} disabled={isAiCreating || !aiPrompt.trim()} className="btn-primary text-xs">
                {isAiCreating ? "Generating..." : "Create with AI"}
              </button>
              <button onClick={() => setCreatingAiInStatus(null)} className="btn-outline text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setCreatingAiInStatus(null);
                setCreatingInStatus(status.id);
              }}
              className="flex items-center gap-2 p-2 w-full rounded-md text-sm transition-colors hover:bg-[var(--surface-elevated)]"
              style={{ color: "var(--mute)" }}
            >
              <Plus size={16} /> New task
            </button>
            <button
              onClick={() => {
                setCreatingInStatus(null);
                setCreatingAiInStatus(status.id);
              }}
              className="flex items-center gap-2 rounded-md px-3 text-sm transition-colors hover:bg-[var(--surface-elevated)]"
              style={{ color: "var(--mute)" }}
            >
              <Sparkles size={14} /> AI
            </button>
          </div>
        )}

        {tasks.map((task: any) => (
          <DraggableTaskCard 
            key={task._id} 
            task={task} 
            deleteTodo={deleteTodo} 
            handleUpdateTodo={handleUpdateTodo}
          />
        ))}

      </div>
    </div>
  );
}

function DraggableTaskCard({ task, deleteTodo, handleUpdateTodo }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: task,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} className="relative outline-none">
      <TodoCard
        task={task}
        statuses={STATUSES}
        dragHandleProps={{ attributes, listeners }}
        onDelete={(id) => deleteTodo({ id })}
        onUpdateTodo={(id, updates) => handleUpdateTodo(id, updates)}
      />
    </div>
  );
}
