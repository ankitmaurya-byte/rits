"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Plus, Circle, Clock, CheckCircle2, ChevronDown, ChevronRight, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TodoCard } from "@/components/todos/todo-card";
import { TodoExcelSheetsView } from "@/components/todos/todo-excel-sheets-view";
import { SheetView } from "@/components/todos/sheet-view";
import { TodoSheetView } from "@/components/todos/todo-sheet-view";
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
  const workspaces = useQuery(api.workspaces.getMyWorkspaces, user ? { clerkId: user.id } : "skip");
  const createTodo = useMutation(api.todos.createTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const moveTodo = useMutation(api.todos.moveTodo);
  const createGroup = useMutation(api.todoGroups.createPrivateGroup);
  const updatePrivateGroup = useMutation(api.todoGroups.updatePrivateGroup);

  const [creatingInStatus, setCreatingInStatus] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [creatingAiInStatus, setCreatingAiInStatus] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiCreating, setIsAiCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "table" | "sheet" | "excelSheets">("board");
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const laneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const laneHeaderRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [offscreenGroups, setOffscreenGroups] = useState<{ top: Array<{ id: string; name: string }>; bottom: Array<{ id: string; name: string }> }>({ top: [], bottom: [] });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const swimlanes = useMemo(() => {
    const lanes = [] as Array<{ id: string; name: string; statusLabels?: Record<string, string> }>;
    if (groups) {
      lanes.push(...groups.map((group) => ({ id: group._id, name: group.name, statusLabels: group.statusLabels })));
    }
    lanes.push({ id: "no-group", name: "No Group", statusLabels: { todo: "To-do", "in-progress": "In progress", completed: "Complete" } });
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

  const handleCreateFromSheet = async (input: {
    title: string;
    description?: string;
    priority: string;
    status: string;
    groupId?: string | null;
  }) => {
    if (!convexUser) return;
    await createTodo({
      scope: "private",
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: input.status,
      groupId: (input.groupId ?? null) as any,
      createdBy: convexUser._id,
    });
    toast.success("Task added.");
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

  const handleMoveTodo = async (id: string, target: { scope: "private" | "workspace"; workspaceId?: string }) => {
    if (!user) throw new Error("User not loaded");
    await moveTodo({
      id: id as any,
      clerkId: user.id,
      targetScope: target.scope,
      targetWorkspaceId: target.workspaceId as any,
    });
  };

  const workspaceOptions = workspaces?.filter((workspace): workspace is NonNullable<typeof workspace> => Boolean(workspace)).map((workspace) => ({ id: workspace._id, label: workspace.name })) ?? [];

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

  useEffect(() => {
    if (viewMode !== "board") return;

    const container = boardScrollRef.current;
    if (!container) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const top: Array<{ id: string; name: string; offset: number }> = [];
      const bottom: Array<{ id: string; name: string; offset: number }> = [];

      for (const lane of swimlanes) {
        const element = laneHeaderRefs.current[lane.id] ?? laneRefs.current[lane.id];
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.bottom < containerRect.top + 12) {
          top.push({ id: lane.id, name: lane.name, offset: rect.top });
        } else if (rect.top > containerRect.bottom - 12) {
          bottom.push({ id: lane.id, name: lane.name, offset: rect.top });
        }
      }

      top.sort((a, b) => a.offset - b.offset);
      bottom.sort((a, b) => a.offset - b.offset);
      const firstLane = swimlanes[0];
      const topGroups = top.map(({ id, name }) => ({ id, name }));
      if (firstLane && !topGroups.some((group) => group.id === firstLane.id)) {
        topGroups.unshift({ id: firstLane.id, name: firstLane.name });
      }
      setOffscreenGroups({
        top: topGroups,
        bottom: bottom.map(({ id, name }) => ({ id, name })),
      });
    };

    measure();
    container.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      container.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [swimlanes, collapsedGroups, todos, viewMode]);

  const scrollLaneToCenter = (laneId: string) => {
    const container = boardScrollRef.current;
    const element = laneRefs.current[laneId];
    if (!container || !element) return;
    const targetTop = element.offsetTop - container.clientHeight / 2 + element.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  };

  const updateLaneName = async (laneId: string, name: string) => {
    if (!convexUser || laneId === "no-group") return;
    await updatePrivateGroup({ groupId: laneId as any, createdBy: convexUser._id, name });
    toast.success("Group renamed.");
  };

  const updateLaneStatusLabel = async (lane: { id: string; statusLabels?: Record<string, string> }, statusId: string, label: string) => {
    if (!convexUser || lane.id === "no-group") return;
    await updatePrivateGroup({
      groupId: lane.id as any,
      createdBy: convexUser._id,
      statusLabels: { ...(lane.statusLabels ?? {}), [statusId]: label.trim() || statusId },
    });
    toast.success("Column renamed.");
  };

  return (
    <div className="page-container animate-fade-in-up relative h-full flex flex-col max-w-none overflow-hidden" style={{ paddingTop: 12, paddingBottom: 12 }}>
      {/* Header */}
      <div className="page-header border-b pb-4 mb-4 relative z-10 shrink-0 flex items-center justify-between" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>Kanban board</h2>
        </div>
        <div className="flex items-center gap-3">
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
          <button onClick={() => setShowCreateGroup(true)} className="btn-primary text-sm flex items-center gap-2 px-3">
            <Plus size={16} /> Add group
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <TodoSheetView
          todos={todos}
          statuses={STATUSES}
          groupOptions={groups?.map((group) => ({ id: group._id, label: group.name })) ?? []}
          onCreateTodo={async (input) => { await handleCreateFromSheet(input); }}
          onUpdateTodo={(id, updates) => handleUpdateTodo(id, updates)}
          onDeleteTodo={async (id) => { await deleteTodo({ id }); }}
        />
      ) : viewMode === "sheet" ? (
        <SheetView
          todos={todos}
          statuses={STATUSES}
          groupOptions={groups?.map((group) => ({ id: group._id, label: group.name })) ?? []}
          onCreateTodo={async (input) => {
            if (!convexUser) throw new Error("User not loaded");
            const createdId = await createTodo({
              scope: "private",
              title: input.title,
              description: input.description,
              customFields: input.customFields,
              priority: input.priority,
              status: input.status,
              groupId: (input.groupId ?? null) as any,
              createdBy: convexUser._id,
            });
            toast.success("Task added.");
            return createdId;
          }}
          onUpdateTodo={(id, updates) => handleUpdateTodo(id, updates)}
          onDeleteTodo={async (id) => { await deleteTodo({ id }); }}
        />
      ) : viewMode === "excelSheets" ? (
        <TodoExcelSheetsView scope="private" createdBy={convexUser?._id} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={(e) => { const task = todos?.find((t) => t._id === e.active.id); if (task) setActiveTask(task); }}
          onDragCancel={() => setActiveTask(null)}
          onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 flex-1 flex-col gap-3 relative z-10">
            <div className={`flex items-center gap-0 overflow-x-auto pl-4 py-1 transition-all duration-200 ${offscreenGroups.top.length ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"}`} style={{ minHeight: 32 }}>
              {offscreenGroups.top.length
                ? [...offscreenGroups.top].reverse().map((group, index, groups) => (
                  <div key={`top-${group.id}`} className="flex shrink-0 items-center">
                    <button onClick={() => scrollLaneToCenter(group.id)} className="py-1 text-sm font-semibold transition-colors hover:opacity-100" style={{ color: "var(--ink)", opacity: 0.9 }}>
                      {group.name}
                    </button>
                    {index < groups.length - 1 ? <span className="px-2 text-sm" style={{ color: "var(--mute)" }}>|</span> : null}
                  </div>
                ))
                : null}
            </div>

            <div ref={boardScrollRef} className="flex flex-col gap-4 overflow-y-auto overflow-x-auto pb-2 flex-1 min-h-0">
            <div className="flex flex-col gap-6 min-w-max">
              {swimlanes.map((lane) => {
                const laneTasks = todos?.filter((task) => (task.groupId || "no-group") === lane.id) || [];
                const isCollapsed = collapsedGroups.has(lane.id);

                return (
                  <div key={lane.id} className="flex flex-col" ref={(element) => { laneRefs.current[lane.id] = element; }}>
                    <div ref={(element) => { laneHeaderRefs.current[lane.id] = element; }} className="mb-3 flex items-center gap-2">
                      <button className="p-0.5 rounded transition-colors hover:bg-[var(--surface-elevated)]" style={{ color: "var(--ink)" }} onClick={() => toggleCollapse(lane.id)}>
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      </button>
                        {lane.id === "no-group" ? (
                          <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{lane.name}</span>
                        ) : (
                          <input
                            defaultValue={lane.name}
                            onBlur={(event) => {
                              const next = event.target.value.trim();
                              if (next && next !== lane.name) void updateLaneName(lane.id, next);
                            }}
                            className="bg-transparent text-sm font-semibold outline-none"
                            style={{ color: "var(--ink)" }}
                          />
                        )}
                      </div>
                    <div className="sticky top-0 z-20 mb-3 transition-all duration-200" style={{ backgroundColor: "transparent" }}>
                      <div className="flex gap-6 pl-7 min-w-max">
                        {STATUSES.map((status) => {
                          const StatusIcon = status.icon;
                          const count = laneTasks.filter((task) => {
                            if (status.id === "todo") return task.status === "todo" || (!task.status && !task.completed);
                            if (status.id === "in-progress") return task.status === "in-progress";
                            return task.status === "completed" || task.completed;
                          }).length;
                          return (
                            <div key={`${lane.id}-${status.id}-sticky`} className="w-[320px] flex items-center justify-between gap-3 px-3 py-2" style={{ backgroundColor: "var(--surface-deep)" }}>
                              <div className="flex min-w-0 items-center gap-2">
                              <StatusIcon size={16} style={{ color: status.color }} />
                              <div className="flex min-w-0 items-center gap-0">
                                {lane.id === "no-group" ? (
                                  <span className="font-medium text-sm" style={{ color: "var(--ink)" }}>{lane.statusLabels?.[status.id] ?? status.label}</span>
                                ) : (
                                  <input
                                    defaultValue={lane.statusLabels?.[status.id] ?? status.label}
                                    onBlur={(event) => {
                                      const next = event.target.value.trim();
                                      if (next && next !== (lane.statusLabels?.[status.id] ?? status.label)) {
                                        void updateLaneStatusLabel(lane, status.id, next);
                                      }
                                    }}
                                    className="w-full bg-transparent text-sm font-medium outline-none"
                                    style={{ color: "var(--ink)" }}
                                  />
                                )}
                                <span className="text-sm font-medium tabular-nums" style={{ color: "var(--mute)", minWidth: count >= 100 ? "2.25rem" : count >= 10 ? "1.5rem" : undefined }}>
                                  {count}
                                </span>
                              </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    setCreatingAiInStatus(null);
                                    setCreatingInStatus(`${lane.id}::${status.id}`);
                                  }}
                                  className="p-1 rounded hover:bg-[var(--surface-elevated)] transition-colors"
                                  style={{ color: "var(--mute)" }}
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                              statusLabel={lane.statusLabels?.[status.id] ?? status.label}
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
                              handleMoveTodo={handleMoveTodo}
                              groupOptions={groups?.map((group) => ({ id: group._id, name: group.name })) ?? []}
                              workspaceOptions={workspaceOptions}
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

            <div className={`flex items-center gap-0 overflow-x-auto pl-4 py-1 transition-all duration-200 ${offscreenGroups.bottom.length ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"}`} style={{ minHeight: 32 }}>
              {offscreenGroups.bottom.length
                ? offscreenGroups.bottom.map((group, index, groups) => (
                  <div key={`bottom-${group.id}`} className="flex shrink-0 items-center">
                    <button onClick={() => scrollLaneToCenter(group.id)} className="py-1 text-sm font-semibold transition-colors hover:opacity-100" style={{ color: "var(--ink)", opacity: 0.9 }}>
                      {group.name}
                    </button>
                    {index < groups.length - 1 ? <span className="px-2 text-sm" style={{ color: "var(--mute)" }}>|</span> : null}
                  </div>
                ))
                : null}
            </div>
          </div>
          {typeof document !== "undefined"
            ? createPortal(
                <DragOverlay zIndex={9999} dropAnimation={null}>
                  {activeTask ? (
                    <div className="pointer-events-none w-[320px]">
                      <TodoCard task={activeTask} statuses={STATUSES} isOverlay groupOptions={groups?.map((group) => ({ id: group._id, label: group.name })) ?? []} workspaceOptions={workspaceOptions} currentScope="private" />
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body
              )
            : null}
        </DndContext>
      )}

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

function KanbanColumn({ groupId, status, statusLabel, tasks, creatingInStatus, setCreatingInStatus, newTitle, setNewTitle, handleCreate, creatingAiInStatus, setCreatingAiInStatus, aiPrompt, setAiPrompt, handleCreateWithAi, isAiCreating, deleteTodo, handleUpdateTodo, handleMoveTodo, groupOptions, workspaceOptions }: any) {
  const droppableId = `${groupId}::${status.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const isCreatingHere = creatingInStatus === droppableId;
  const isCreatingAiHere = creatingAiInStatus === droppableId;
  const StatusIcon = status.icon;
  return (
    <div ref={setNodeRef}
      className={`flex-shrink-0 w-[320px] flex flex-col gap-3 rounded-xl p-2 transition-colors duration-200 border border-transparent ${isOver ? "bg-[var(--surface-elevated)] border-[var(--hairline-strong)]" : ""}`}
      style={{ minHeight: "200px" }}>
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
        ) : tasks.length === 0 ? (
          <button
            onClick={() => {
              setCreatingAiInStatus(null);
              setCreatingInStatus(droppableId);
            }}
            className="flex items-center gap-2 self-start rounded-md px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-elevated)]"
            style={{ color: "var(--mute)" }}
          >
            <Plus size={16} /> Add new {statusLabel}
          </button>
        ) : null}

        {tasks.map((task: any) => (
          <DraggableTaskCard key={task._id} task={task} deleteTodo={deleteTodo} handleUpdateTodo={handleUpdateTodo} handleMoveTodo={handleMoveTodo} groupOptions={groupOptions} workspaceOptions={workspaceOptions} />
        ))}
      </div>
    </div>
  );
}

function DraggableTaskCard({ task, deleteTodo, handleUpdateTodo, handleMoveTodo, groupOptions, workspaceOptions }: any) {
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
        workspaceOptions={workspaceOptions}
        currentScope="private"
        dragHandleProps={{ attributes, listeners }}
        onDelete={(id) => deleteTodo({ id })}
        onUpdateTodo={(id, updates) => handleUpdateTodo(id, updates)}
        onMoveTodo={(id, target) => handleMoveTodo(id, target)}
      />
    </div>
  );
}

const STATUSES_MAP = [
  { id: "todo", label: "To-do" },
  { id: "in-progress", label: "In progress" },
  { id: "completed", label: "Complete" },
];
