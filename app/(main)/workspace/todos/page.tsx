"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Plus, Users, Circle, Clock, CheckCircle2, MoreHorizontal, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
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

export default function WorkspaceTodosPage() {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();

  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const workspace = useQuery(api.workspaces.getWorkspaceById, selectedWorkspaceId && user ? { workspaceId: selectedWorkspaceId, clerkId: user.id } : "skip");
  const todos = useQuery(api.todos.getTodos, selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip");
  const groups = useQuery(api.todoGroups.getGroups, selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip");
  
  const createTodo = useMutation(api.todos.createTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const createGroup = useMutation(api.todoGroups.createGroup);

  const [creatingInStatus, setCreatingInStatus] = useState<string | null>(null); // formatted as "groupId::statusId"
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState<any>(null);
  
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const isOwner = workspace?.ownerId === convexUser?._id;

  const swimlanes = useMemo(() => {
    const lanes = [];
    if (groups) {
      lanes.push(...groups.map(g => ({ id: g._id, name: g.name })));
    }
    lanes.push({ id: "no-team", name: "No Team" });
    return lanes;
  }, [groups]);

  const toggleCollapse = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (groupId: string, status: string) => {
    if (!selectedWorkspaceId || !newTitle.trim()) { setCreatingInStatus(null); return; }
    try {
      await createTodo({ 
        scope: "workspace", 
        workspaceId: selectedWorkspaceId, 
        title: newTitle.trim(), 
        priority: "medium", 
        status, 
        groupId: groupId === "no-team" ? null : (groupId as any),
        createdBy: convexUser?._id 
      });
      setNewTitle(""); setCreatingInStatus(null); toast.success("Task added.");
    } catch { toast.error("Failed to add task."); }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, newGroupId?: string | null) => {
    try { await updateTodo({ id: id as any, status: newStatus, groupId: newGroupId as any }); }
    catch { toast.error("Failed to move task."); }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const task = todos?.find((t) => t._id === active.id);
    if (!task) return;

    const [overGroupId, overStatus] = String(over.id).split("::");
    const currentGroupId = task.groupId || "no-team";
    const currentStatus = task.status || (task.completed ? "completed" : "todo");
    
    if (currentStatus !== overStatus || currentGroupId !== overGroupId) {
      handleUpdateStatus(
        active.id as string, 
        overStatus, 
        overGroupId === "no-team" ? null : overGroupId
      );
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !selectedWorkspaceId || !user) return;
    try {
      await createGroup({ workspaceId: selectedWorkspaceId, name: newGroupName.trim(), clerkId: user.id });
      setNewGroupName("");
      setShowCreateGroup(false);
      toast.success("Group created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create group");
    }
  };

  if (!selectedWorkspaceId) {
    return (
      <div className="page-container animate-fade-in-up flex flex-col items-center justify-center py-40 text-center">
        <Users size={40} className="mb-6" style={{ color: "var(--stone)" }} />
        <h2 className="text-2xl font-medium mb-3" style={{ color: "var(--ink)" }}>No workspace selected</h2>
        <p style={{ color: "var(--charcoal)" }}>Create or join a workspace using the sidebar to get started.</p>
      </div>
    );
  }

  // Calculate totals for column headers across all groups
  const totalsByStatus = {
    todo: todos?.filter((t) => t.status === "todo" || (!t.status && !t.completed)).length || 0,
    "in-progress": todos?.filter((t) => t.status === "in-progress").length || 0,
    completed: todos?.filter((t) => t.status === "completed" || t.completed).length || 0,
  };

  return (
    <div className="page-container animate-fade-in-up relative h-full flex flex-col max-w-none overflow-hidden">
      <div className="page-header border-b pb-8 mb-8 relative z-10 shrink-0 flex items-center justify-between" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <span className="text-xs uppercase tracking-widest font-medium px-2 py-0.5 rounded" style={{ color: "var(--mute)", backgroundColor: "var(--surface-deep)", border: "1px solid var(--hairline)" }}>
            {workspace?.name ?? "Workspace"}
          </span>
          <h2 className="text-2xl font-semibold tracking-tight mt-2" style={{ color: "var(--ink)" }}>Kanban board</h2>
        </div>
        {isOwner && (
          <button onClick={() => setShowCreateGroup(true)} className="btn-primary text-sm flex items-center gap-2 px-3">
            <Plus size={16} /> Add group
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={(e) => { const task = todos?.find((t) => t._id === e.active.id); if (task) setActiveTask(task); }}
        onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-8 overflow-y-auto overflow-x-auto pb-12 flex-1 relative z-10">
          
          {/* Header Row */}
          <div className="flex gap-6 pl-4 min-w-max">
            {STATUSES.map(status => {
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

          {/* Swimlanes */}
          <div className="flex flex-col gap-6 min-w-max">
            {swimlanes.map(lane => {
              const laneTasks = todos?.filter(t => (t.groupId || "no-team") === lane.id) || [];
              const isCollapsed = collapsedGroups.has(lane.id);

              return (
                <div key={lane.id} className="flex flex-col">
                  {/* Lane Header */}
                  <div 
                    className="flex items-center gap-2 pl-4 mb-3 cursor-pointer select-none group w-fit"
                    onClick={() => toggleCollapse(lane.id)}
                  >
                    <div className="p-0.5 rounded transition-colors group-hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)" }}>
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{lane.name}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--mute)" }}>{laneTasks.length}</span>
                  </div>

                  {/* Lane Columns */}
                  {!isCollapsed && (
                    <div className="flex gap-6 pl-4">
                      {STATUSES.map(status => {
                        const statusTasks = laneTasks.filter(t => {
                          if (status.id === "todo") return t.status === "todo" || (!t.status && !t.completed);
                          if (status.id === "in-progress") return t.status === "in-progress";
                          return t.status === "completed" || t.completed;
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
                            deleteTodo={deleteTodo} 
                            handleUpdateStatus={handleUpdateStatus} 
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
        <DragOverlay>{activeTask ? <TaskCard task={activeTask} isOverlay /> : null}</DragOverlay>
      </DndContext>

      {/* Create Group Dialog */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateGroup(false)}>
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
          <div className="relative w-full max-w-md rounded-xl border p-6 shadow-2xl animate-fade-in-up" style={{ backgroundColor: "var(--surface-elevated)", borderColor: "var(--hairline-strong)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>Create new group</h2>
              <button onClick={() => setShowCreateGroup(false)} className="p-1.5 rounded-md hover:bg-[var(--surface-deep)]" style={{ color: "var(--stone)" }}><X size={16} /></button>
            </div>
            <input autoFocus value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()} placeholder="Group name (e.g. Engineering)" className="input-field mb-4 w-full" />
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

function KanbanColumn({ groupId, status, tasks, creatingInStatus, setCreatingInStatus, newTitle, setNewTitle, handleCreate, deleteTodo, handleUpdateStatus }: any) {
  const droppableId = `${groupId}::${status.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const isCreatingHere = creatingInStatus === droppableId;

  return (
    <div ref={setNodeRef}
      className={`flex-shrink-0 w-[320px] flex flex-col gap-3 rounded-xl p-2 transition-colors duration-200 border border-transparent ${isOver ? "bg-[var(--surface-elevated)] border-[var(--hairline-strong)]" : ""}`}
      style={{ minHeight: "150px" }}>
      <div className="flex flex-col gap-3">
        {tasks.map((task: any) => (
          <DraggableTaskCard key={task._id} task={task} deleteTodo={deleteTodo} handleUpdateStatus={handleUpdateStatus} />
        ))}
        {isCreatingHere ? (
          <div className="feature-card p-3 rounded-xl border shadow-sm" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--accent-blue)" }}>
            <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(groupId, status.id); if (e.key === "Escape") setCreatingInStatus(null); }}
              onBlur={() => handleCreate(groupId, status.id)} placeholder="Task title..."
              className="w-full bg-transparent text-sm outline-none font-medium" style={{ color: "var(--ink)" }} />
          </div>
        ) : (
          <button onClick={() => setCreatingInStatus(droppableId)}
            className="flex items-center gap-2 p-2 w-full rounded-md text-sm transition-colors hover:bg-[var(--surface-elevated)]"
            style={{ color: "var(--mute)" }}>
            <Plus size={16} /> New page
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

function getSourceLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Open source";
  }
}

function TaskCard({ task, isOverlay, deleteTodo, handleUpdateStatus }: any) {
  return (
    <div className={`feature-card p-4 rounded-xl relative border transition-colors bg-[var(--surface-card)] ${isOverlay ? "shadow-2xl scale-105 border-[var(--hairline-strong)] z-50 cursor-grabbing" : "shadow-sm border-[var(--hairline)] hover:border-[var(--hairline-strong)]"}`}>
      {!isOverlay && deleteTodo && (
        <button 
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-[var(--surface-card)] rounded-md shadow-sm border p-1 z-20 hover:bg-[var(--surface-elevated)]" 
          style={{ borderColor: "var(--hairline-strong)", color: "var(--mute)" }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            if (confirm("Are you sure you want to delete this task?")) {
              deleteTodo({ id: task._id }).then(() => toast.success("Deleted"));
            }
          }}
          title="Delete task"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      )}
      <div className="flex items-start gap-2 mb-3 pr-8">
        <span className="text-[14px] font-medium leading-tight select-none" style={{ color: task.status === "completed" || task.completed ? "var(--mute)" : "var(--ink)", textDecoration: task.status === "completed" || task.completed ? "line-through" : "none" }}>{task.title}</span>
      </div>
      {task.sourceDescription ? (
        <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: "var(--charcoal)" }}>
          {task.sourceDescription}
        </p>
      ) : null}
      {task.sourceUrl ? (
        <a
          href={task.sourceUrl}
          target="_blank"
          rel="noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-3"
          style={{ color: "var(--accent-blue)" }}
        >
          <ExternalLinkIcon /> {getSourceLabel(task.sourceUrl)}
        </a>
      ) : null}
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

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}
