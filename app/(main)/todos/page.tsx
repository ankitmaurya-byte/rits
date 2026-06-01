"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useWorkspace } from "@/lib/use-workspace";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Sparkles, CheckCircle2, Circle, Clock } from "lucide-react";
import { toast } from "sonner";
import { TodoCard } from "@/components/todos/todo-card";
import { TodoExcelSheetsView } from "@/components/todos/todo-excel-sheets-view";
import { SheetView } from "@/components/todos/sheet-view";
import { TodoSheetView } from "@/components/todos/todo-sheet-view";
import { BoardSettingsModal } from "@/components/todos/board-settings-modal";
import { useUser } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ChevronDown, Search, MoreHorizontal, Edit, Trash2, Share, UserPlus, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const { user } = useUser();

  const todos = useQuery(api.todos.getTodos, workspaceId ? { workspaceId } : "skip");
  const groups = useQuery(api.todoGroups.getGroups, workspaceId ? { workspaceId } : "skip");
  const members = (useQuery(api.workspaces.getWorkspaceMembers, workspaceId && user ? { workspaceId, clerkId: user.id } : "skip") ?? []);

  const createTodo = useMutation(api.todos.createTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const createGroup = useMutation(api.todoGroups.createGroup);
  const updateGroup = useMutation(api.todoGroups.updateWorkspaceGroup);
  const deleteGroup = useMutation(api.todoGroups.deleteWorkspaceGroup);

  const [creatingInStatus, setCreatingInStatus] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [creatingAiInStatus, setCreatingAiInStatus] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiCreating, setIsAiCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "table" | "sheet" | "excelSheets">("board");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const activeGroup = groups?.find(g => g._id === activeGroupId) || null;

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
      await createTodo({ workspaceId, scope: "workspace", title: newTitle.trim(), priority: "medium", status, groupId: activeGroupId as any });
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
        groupId: activeGroupId as any,
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

  const filteredTodos = todos?.filter(t => {
    if (activeGroupId && t.groupId !== activeGroupId) return false;
    if (!activeGroupId && t.groupId) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const tasksByStatus = {
    "todo": filteredTodos?.filter((t) => t.status === "todo" || (!t.status && !t.completed)) ?? [],
    "in-progress": filteredTodos?.filter((t) => t.status === "in-progress") ?? [],
    "completed": filteredTodos?.filter((t) => t.status === "completed" || t.completed) ?? [],
  };

  const handleCreateBoard = async () => {
    if (!workspaceId || !user) return;
    const name = prompt("Board name:");
    if (!name?.trim()) return;
    try {
      const id = await createGroup({ workspaceId, name: name.trim(), clerkId: user.id });
      setActiveGroupId(id);
      toast.success("Board created.");
    } catch (e: any) {
      toast.error(e.message || "Failed to create board.");
    }
  };

  const handleEditBoard = async () => {
    if (!activeGroupId || !user) return;
    const name = prompt("New board name:", activeGroup?.name);
    if (!name?.trim()) return;
    try {
      await updateGroup({ groupId: activeGroupId as any, clerkId: user.id, name: name.trim() });
      toast.success("Board updated.");
    } catch (e: any) {
      toast.error(e.message || "Failed to update board.");
    }
  };

  const handleDeleteBoard = async () => {
    if (!activeGroupId || !user) return;
    if (!confirm("Are you sure you want to delete this board? Tasks will become unassigned.")) return;
    try {
      await deleteGroup({ groupId: activeGroupId as any, clerkId: user.id });
      setActiveGroupId(null);
      toast.success("Board deleted.");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete board.");
    }
  };

  return (
    <div className="page-container animate-fade-in-up relative h-full flex flex-col max-w-none overflow-hidden">
      
      {/* Header */}
      <div className="page-header border-b pb-8 mb-8 relative z-10 shrink-0" style={{ borderColor: "var(--hairline-strong)" }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md" style={{ backgroundColor: "var(--accent-orange)", color: "var(--canvas)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </div>
            <div className="flex items-center gap-1">
              <ContextMenu>
                <DropdownMenu>
                  <ContextMenuTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="flex items-center gap-2 text-2xl font-semibold tracking-tight transition-colors hover:opacity-80 outline-none" 
                        style={{ color: "var(--ink)" }}
                        onDoubleClick={handleEditBoard}
                      >
                        {activeGroup ? activeGroup.name : "Main Board"}
                        <ChevronDown size={18} style={{ color: "var(--mute)" }} />
                      </button>
                    </DropdownMenuTrigger>
                  </ContextMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Kanban Boards</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setActiveGroupId(null)}>
                      Main Board
                    </DropdownMenuItem>
                    {groups?.map(g => (
                      <DropdownMenuItem key={g._id} onSelect={() => setActiveGroupId(g._id)}>
                        {g.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleCreateBoard}>
                      <Plus size={14} className="mr-2" /> Create new board
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {activeGroupId && (
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={handleEditBoard}>
                      <Edit size={14} className="mr-2" /> Edit name
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => setSettingsModalOpen(true)}>
                      <Settings size={14} className="mr-2" /> Settings
                    </ContextMenuItem>
                    <ContextMenuItem className="text-red-500" onSelect={handleDeleteBoard}>
                      <Trash2 size={14} className="mr-2" /> Delete board
                    </ContextMenuItem>
                  </ContextMenuContent>
                )}
              </ContextMenu>
              {activeGroupId && (
                <button 
                  className="p-1.5 ml-2 rounded-md hover:bg-[var(--surface-elevated)] transition-colors text-[var(--mute)] hover:text-[var(--ink)]"
                  onClick={() => setSettingsModalOpen(true)}
                  title="Board Settings"
                >
                  <Settings size={18} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search kanban..."
                className="pl-8 w-64 bg-[var(--surface-card)]"
              />
            </div>
            <div className="inline-flex rounded-lg border p-1" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <button onClick={() => setViewMode("board")} className={`rounded-md px-3 py-1.5 text-sm transition-colors ${viewMode === "board" ? "" : "hover:bg-[var(--surface-elevated)]"}`} style={viewMode === "board" ? { backgroundColor: "var(--surface-card)", color: "var(--ink)" } : { color: "var(--mute)" }}>
              Kanban View
            </button>
            <button onClick={() => setViewMode("table")} className={`rounded-md px-3 py-1.5 text-sm transition-colors ${viewMode === "table" ? "" : "hover:bg-[var(--surface-elevated)]"}`} style={viewMode === "table" ? { backgroundColor: "var(--surface-card)", color: "var(--ink)" } : { color: "var(--mute)" }}>
              Table View
            </button>
            <button onClick={() => setViewMode("sheet")} className={`rounded-md px-3 py-1.5 text-sm transition-colors ${viewMode === "sheet" ? "" : "hover:bg-[var(--surface-elevated)]"}`} style={viewMode === "sheet" ? { backgroundColor: "var(--surface-card)", color: "var(--ink)" } : { color: "var(--mute)" }}>
              Sheet View
            </button>
            <button onClick={() => setViewMode("excelSheets")} className={`rounded-md px-3 py-1.5 text-sm transition-colors ${viewMode === "excelSheets" ? "" : "hover:bg-[var(--surface-elevated)]"}`} style={viewMode === "excelSheets" ? { backgroundColor: "var(--surface-card)", color: "var(--ink)" } : { color: "var(--mute)" }}>
              Excel Sheets
            </button>
          </div>
        </div>
      </div>
      </div>

      {viewMode === "table" ? (
        <TodoSheetView
          todos={todos}
          statuses={STATUSES}
          onCreateTodo={async (input) => {
            if (!workspaceId) return;
            await createTodo({ workspaceId, scope: "workspace", title: input.title, description: input.description, priority: input.priority, status: input.status });
          }}
          onUpdateTodo={async (id, updates) => handleUpdateTodo(id, updates as Record<string, unknown>)}
          onDeleteTodo={async (id) => { await deleteTodo({ id }); }}
        />
      ) : viewMode === "sheet" ? (
        <SheetView
          todos={todos}
          statuses={STATUSES}
          onCreateTodo={async (input) => {
            if (!workspaceId) throw new Error("Workspace not loaded");
            const createdId = await createTodo({
              workspaceId,
              scope: "workspace",
              title: input.title,
              description: input.description,
              customFields: input.customFields,
              priority: input.priority,
              status: input.status,
            });
            toast.success("Task added.");
            return createdId;
          }}
          onUpdateTodo={async (id, updates) => handleUpdateTodo(id, updates as Record<string, unknown>)}
          onDeleteTodo={async (id) => { await deleteTodo({ id }); }}
        />
      ) : viewMode === "excelSheets" ? (
        <TodoExcelSheetsView scope="workspace" workspaceId={workspaceId ?? undefined} />
      ) : (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={handleDragStart}
          onDragCancel={() => setActiveTask(null)}
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
                members={members}
              />
            ))}
          </div>

          {typeof document !== "undefined"
            ? createPortal(
                <DragOverlay zIndex={9999} dropAnimation={null}>
                  {activeTask ? (
                    <div className="pointer-events-none w-[320px]">
                      <TodoCard task={activeTask} statuses={STATUSES} currentScope="workspace" members={members as any} isOverlay />
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body
              )
            : null}
        </DndContext>
      )}

      {activeGroupId && activeGroup && (
        <BoardSettingsModal 
          boardId={activeGroupId as any}
          boardType="todoGroups"
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          isPublished={activeGroup.isPublished}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------

function KanbanColumn({ status, tasks, creatingInStatus, setCreatingInStatus, newTitle, setNewTitle, handleCreate, creatingAiInStatus, setCreatingAiInStatus, aiPrompt, setAiPrompt, handleCreateWithAi, isAiCreating, deleteTodo, handleUpdateTodo, members }: any) {
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
            members={members}
          />
        ))}

      </div>
    </div>
  );
}

function DraggableTaskCard({ task, deleteTodo, handleUpdateTodo, members }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: task,
  });

  const style = isDragging
    ? {
        opacity: 0,
      }
    : transform
      ? {
          transform: CSS.Translate.toString(transform),
        }
      : undefined;

  return (
    <div ref={setNodeRef} style={style} className={`relative outline-none ${isDragging ? "pointer-events-none" : ""}`}>
      <TodoCard
        task={task}
        statuses={STATUSES}
        currentScope="workspace"
        members={members}
        dragHandleProps={{ attributes, listeners }}
        onDelete={(id) => deleteTodo({ id })}
        onUpdateTodo={(id, updates) => handleUpdateTodo(id, updates)}
      />
    </div>
  );
}
