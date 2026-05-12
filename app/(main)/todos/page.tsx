"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/use-workspace";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, CheckSquare, Trash2, Circle, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";

const PRIORITIES = ["high", "medium", "low"] as const;
type Priority = (typeof PRIORITIES)[number];

const priorityStyles: Record<Priority, { dot: string; color: string }> = {
  high:   { dot: "var(--accent-red)",    color: "var(--accent-red)" },
  medium: { dot: "var(--accent-yellow)", color: "var(--accent-yellow)" },
  low:    { dot: "var(--accent-blue)",   color: "var(--accent-blue)" },
};

export default function TodosPage() {
  const { workspaceId, isLoading } = useWorkspace();

  const todos      = useQuery(api.todos.getTodos, workspaceId ? { workspaceId } : "skip");
  const createTodo = useMutation(api.todos.createTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const toggleTodo = useMutation(api.todos.toggleTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle]       = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [submitting, setSubmitting] = useState(false);

  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleUpdateTodo = async (id: string) => {
    if (!editTitle.trim()) { toast.error("Task title is required"); return; }
    try {
      await updateTodo({ id: id as any, title: editTitle.trim() });
      toast.success("Task updated.");
      setEditingTodoId(null);
    } catch (e) {
      toast.error("Failed to update task.");
    }
  };

  const handleCreate = async () => {
    if (!workspaceId) return;
    if (!title.trim()) { toast.error("Task title is required"); return; }
    
    setSubmitting(true);
    try {
      await createTodo({ workspaceId, title: title.trim(), priority });
      toast.success("Task added.");
      setTitle(""); setPriority("medium"); setShowForm(false);
    } catch (e) {
      toast.error("Failed to add task.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton h-10 w-48 mb-8" />
        <div className="space-y-4">
           {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const pending   = todos?.filter((t) => !t.completed) ?? [];
  const completed = todos?.filter((t) =>  t.completed) ?? [];

  return (
    <div className="page-container animate-fade-in-up relative">
      
      {/* Top Atmospheric Glow */}
      <div 
        className="absolute top-0 right-1/4 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, var(--accent-blue) 0%, transparent 70%)",
          opacity: 0.15
        }}
      />

      {/* Header */}
      <div className="page-header border-b pb-12 mb-12 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div>
          <h2 className="text-3xl font-medium tracking-tight mb-2" style={{ color: "var(--ink)" }}>
            Task Management
          </h2>
          <p className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>
            {pending.length} active tasks · {completed.length} completed
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
        {/* Main List Area */}
        <div className="lg:col-span-8">
           
          {/* Creation Form */}
          {showForm && (
            <div className="feature-card mb-12 animate-fade-in-up">
              <h3 className="text-lg font-medium mb-6" style={{ color: "var(--ink)" }}>Add new task</h3>
              
              <div className="space-y-6">
                <input
                  autoFocus
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="input-field"
                />
                
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: "var(--body)" }}>Priority Level</label>
                  <div className="flex gap-4">
                    {PRIORITIES.map((p) => {
                      const isActive = priority === p;
                      const style = priorityStyles[p];
                      return (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          className="flex-1 py-2 px-3 rounded-md text-sm font-medium capitalize transition-all border flex items-center justify-center gap-2"
                          style={{
                            backgroundColor: isActive ? "var(--surface-elevated)" : "transparent",
                            borderColor: isActive ? "var(--hairline-strong)" : "var(--hairline)",
                            color: isActive ? "var(--ink)" : "var(--charcoal)",
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.dot }} />
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t justify-end" style={{ borderColor: "var(--divider-soft)" }}>
                  <button onClick={() => setShowForm(false)} className="btn-outline">
                    Cancel
                  </button>
                  <button onClick={handleCreate} disabled={submitting} className="btn-primary">
                    {submitting ? "Adding..." : "Add Task"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {todos?.length === 0 && !showForm && (
            <div className="flex flex-col items-center justify-center py-32 text-center border rounded-xl" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-deep)" }}>
              <div className="flex items-center justify-center mb-6">
                <CheckSquare size={32} style={{ color: "var(--accent-blue)" }} />
              </div>
              <h3 className="text-xl font-medium mb-3" style={{ color: "var(--ink)" }}>You're all caught up!</h3>
              <p className="mb-10 max-w-sm" style={{ color: "var(--charcoal)" }}>
                There are no tasks on your plate. Enjoy your free time or add a new task to get started.
              </p>
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={16} /> Create Task
              </button>
            </div>
          )}

          {/* Pending Tasks */}
          {pending.length > 0 && (
            <div className="mb-12">
              <div className="stripe-card p-0 divide-y overflow-hidden" style={{ borderColor: "var(--hairline-strong)", "--tw-divide-color": "var(--divider-soft)" } as React.CSSProperties}>
                {pending.map((todo) => (
                  <div
                    key={todo._id}
                    className="flex items-center gap-4 px-6 py-4 group transition-colors hover:bg-[#101012]"
                  >
                    <button
                      onClick={() => toggleTodo({ id: todo._id })}
                      className="transition-colors flex-shrink-0"
                      style={{ color: "var(--stone)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-green)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}
                    >
                      <Circle size={20} strokeWidth={2} />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      {editingTodoId === todo._id ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateTodo(todo._id);
                            if (e.key === "Escape") setEditingTodoId(null);
                          }}
                          onBlur={() => handleUpdateTodo(todo._id)}
                          className="w-full bg-transparent border-b focus:outline-none text-[15px] font-medium"
                          style={{ color: "var(--ink)", borderColor: "var(--hairline-strong)" }}
                        />
                      ) : (
                        <span className="text-[15px] font-medium block truncate" style={{ color: "var(--ink)" }}>
                          {todo.title}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="badge-pill" style={{ color: priorityStyles[todo.priority as Priority]?.color }}>
                        {todo.priority}
                      </span>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingTodoId(todo._id);
                            setEditTitle(todo.title);
                          }}
                          className="p-1 rounded transition-colors"
                          style={{ color: "var(--stone)" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--ink)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}
                          aria-label="Edit task"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => deleteTodo({ id: todo._id }).then(() => toast.success("Deleted"))}
                          className="p-1 rounded transition-colors"
                          style={{ color: "var(--stone)" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-red)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}
                          aria-label="Delete task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completed.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: "var(--charcoal)" }}>
                <CheckCircle2 size={16} /> Completed
              </h4>
              <div className="stripe-card p-0 divide-y overflow-hidden" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-deep)", "--tw-divide-color": "var(--divider-soft)" } as React.CSSProperties}>
                {completed.map((todo) => (
                  <div
                    key={todo._id}
                    className="flex items-center gap-4 px-6 py-3 group transition-colors hover:bg-[#101012]"
                  >
                    <button
                      onClick={() => toggleTodo({ id: todo._id })}
                      className="transition-colors flex-shrink-0"
                      style={{ color: "var(--accent-green)" }}
                    >
                      <CheckCircle2 size={20} strokeWidth={2} />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] line-through block truncate" style={{ color: "var(--mute)" }}>
                        {todo.title}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => deleteTodo({ id: todo._id }).then(() => toast.success("Deleted"))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                      style={{ color: "var(--stone)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent-red)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info Area */}
        <div className="lg:col-span-4 space-y-6">
           <div className="feature-card" style={{ backgroundColor: "var(--surface-deep)" }}>
             <div className="flex items-start gap-3 mb-4">
                <AlertCircle size={20} style={{ color: "var(--accent-blue)", marginTop: "2px" }} />
                <h4 className="text-base font-medium" style={{ color: "var(--ink)" }}>Task Management</h4>
             </div>
             <p className="text-sm leading-relaxed" style={{ color: "var(--body)" }}>
               Prioritize your work effectively. High priority tasks are highlighted in red.
               Checking off a task moves it to the completed section at the bottom.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
