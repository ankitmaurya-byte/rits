"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/use-workspace";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, CheckSquare, Trash2, Circle, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PRIORITIES = ["high", "medium", "low"] as const;
type Priority = (typeof PRIORITIES)[number];

const priorityStyles: Record<Priority, { badge: string; dot: string; bg: string; color: string; border: string }> = {
  high:   { badge: "badge-red",   dot: "#ef4444", bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
  medium: { badge: "badge-amber", dot: "#f59e0b", bg: "#fef3c7", color: "#b45309", border: "#fcd34d" },
  low:    { badge: "badge-blue",  dot: "#3b82f6", bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
};

export default function TodosPage() {
  const { workspaceId, isLoading } = useWorkspace();

  const todos      = useQuery(api.todos.getTodos, workspaceId ? { workspaceId } : "skip");
  const createTodo = useMutation(api.todos.createTodo);
  const toggleTodo = useMutation(api.todos.toggleTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle]       = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [submitting, setSubmitting] = useState(false);

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
    <div className="page-container animate-fade-in-up">
      {/* Header */}
      <div className="page-header border-b border-[#e2e8f0] pb-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-[#0f172a] tracking-tight mb-2">
            Task Management
          </h2>
          <p className="text-sm font-medium text-[#64748b]">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main List Area */}
        <div className="lg:col-span-8">
           
          {/* Creation Form */}
          {showForm && (
            <div className="stripe-card p-6 mb-8 bg-white border-[#cbd5e1] shadow-md animate-fade-in-up">
              <h3 className="text-base font-semibold text-[#0f172a] mb-4">Add new task</h3>
              
              <div className="space-y-4">
                <input
                  autoFocus
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="input-field text-base py-3"
                />
                
                <div>
                  <label className="block text-sm font-medium text-[#475569] mb-2">Priority Level</label>
                  <div className="flex gap-3">
                    {PRIORITIES.map((p) => {
                      const isActive = priority === p;
                      const style = priorityStyles[p];
                      return (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium capitalize transition-all border flex items-center justify-center gap-2
                            ${isActive ? 'ring-2 ring-offset-1' : 'hover:bg-[#f8fafc]'}`}
                          style={{
                            backgroundColor: isActive ? style.bg : "white",
                            borderColor: isActive ? style.border : "var(--border)",
                            color: isActive ? style.color : "var(--text-secondary)",
                            "--tw-ring-color": isActive ? style.color : "transparent",
                          } as React.CSSProperties}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.dot }} />
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[#f1f5f9] justify-end">
                  <button onClick={() => setShowForm(false)} className="btn-secondary">
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
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-[#e2e8f0] rounded-xl bg-[#f8fafc]">
              <div className="w-16 h-16 rounded-full bg-[#dbeafe] flex items-center justify-center mb-6 shadow-sm">
                <CheckSquare size={28} className="text-[#2563eb]" />
              </div>
              <h3 className="text-xl font-semibold text-[#0f172a] mb-2">You're all caught up!</h3>
              <p className="text-[#64748b] mb-8 max-w-sm">
                There are no tasks on your plate. Enjoy your free time or add a new task to get started.
              </p>
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={16} /> Create Task
              </button>
            </div>
          )}

          {/* Pending Tasks */}
          {pending.length > 0 && (
            <div className="mb-10">
              <div className="stripe-card divide-y divide-[#f1f5f9] overflow-hidden">
                {pending.map((todo) => (
                  <div
                    key={todo._id}
                    className="flex items-center gap-4 px-6 py-4 group hover:bg-[#f8fafc] transition-colors"
                  >
                    <button
                      onClick={() => toggleTodo({ id: todo._id })}
                      className="text-[#cbd5e1] hover:text-[#10b981] transition-colors flex-shrink-0 focus:outline-none"
                    >
                      <Circle size={22} strokeWidth={2} />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-medium text-[#0f172a] block truncate">
                        {todo.title}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className={`badge ${priorityStyles[todo.priority as Priority]?.badge ?? "badge-blue"}`}>
                        {todo.priority}
                      </span>
                      
                      <button
                        onClick={() => deleteTodo({ id: todo._id }).then(() => toast.success("Deleted"))}
                        className="text-[#cbd5e1] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100 p-1"
                        aria-label="Delete task"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completed.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#64748b] mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} /> Completed
              </h4>
              <div className="stripe-card divide-y divide-[#f1f5f9] overflow-hidden bg-[#f8fafc]">
                {completed.map((todo) => (
                  <div
                    key={todo._id}
                    className="flex items-center gap-4 px-6 py-3 group hover:bg-[#f1f5f9] transition-colors"
                  >
                    <button
                      onClick={() => toggleTodo({ id: todo._id })}
                      className="text-[#10b981] transition-colors flex-shrink-0 focus:outline-none"
                    >
                      <CheckCircle2 size={20} strokeWidth={2} />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] text-[#94a3b8] line-through block truncate">
                        {todo.title}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => deleteTodo({ id: todo._id }).then(() => toast.success("Deleted"))}
                      className="text-[#cbd5e1] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100 p-1"
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
           <div className="stripe-card p-6 bg-[#f8fafc] border-transparent shadow-none">
             <div className="flex items-start gap-3 mb-3">
                <AlertCircle size={20} className="text-[#3b82f6] mt-0.5" />
                <h4 className="text-sm font-semibold text-[#0f172a]">Task Management</h4>
             </div>
             <p className="text-sm text-[#475569] leading-relaxed pl-8">
               Prioritize your work effectively. High priority tasks are highlighted in red.
               Checking off a task moves it to the completed section at the bottom.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
