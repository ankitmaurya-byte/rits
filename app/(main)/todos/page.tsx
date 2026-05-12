"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/use-workspace";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CheckSquare, Trash2, Circle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const PRIORITIES = ["low", "medium", "high"] as const;

export default function TodosPage() {
  const { workspaceId, isLoading } = useWorkspace();

  const todos = useQuery(
    api.todos.getTodos,
    workspaceId ? { workspaceId } : "skip"
  );

  const createTodo = useMutation(api.todos.createTodo);
  const toggleTodo = useMutation(api.todos.toggleTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const handleCreate = async () => {
    if (!workspaceId) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    await createTodo({ workspaceId, title: title.trim(), priority });
    toast.success("Todo added!");
    setTitle("");
    setPriority("medium");
    setOpen(false);
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "text-red-500 bg-red-50 dark:bg-red-950";
    if (p === "medium") return "text-amber-500 bg-amber-50 dark:bg-amber-950";
    return "text-zinc-500 bg-zinc-100 dark:bg-zinc-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  const pending = todos?.filter((t) => !t.completed) ?? [];
  const completed = todos?.filter((t) => t.completed) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Todos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {pending.length} pending · {completed.length} done
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Todo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Todo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                      priority === p
                        ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <Button onClick={handleCreate} className="w-full">
                Add Todo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {todos?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckSquare className="w-12 h-12 text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium">No todos yet</p>
          <p className="text-zinc-400 text-sm">Click "New Todo" to get started</p>
        </div>
      )}

      <div className="space-y-2">
        {pending.map((todo) => (
          <div
            key={todo._id}
            className="flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-zinc-900 hover:shadow-sm transition-shadow group"
          >
            <button
              onClick={() => toggleTodo({ id: todo._id })}
              className="text-zinc-300 hover:text-green-500 transition-colors flex-shrink-0"
            >
              <Circle className="w-5 h-5" />
            </button>
            <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">{todo.title}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColor(todo.priority)}`}
            >
              {todo.priority}
            </span>
            <button
              onClick={() => deleteTodo({ id: todo._id }).then(() => toast.success("Deleted"))}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {completed.length > 0 && (
          <>
            <p className="text-xs text-zinc-400 pt-4 pb-1 font-medium uppercase tracking-wide">
              Completed ({completed.length})
            </p>
            {completed.map((todo) => (
              <div
                key={todo._id}
                className="flex items-center gap-3 p-3 rounded-xl border bg-zinc-50 dark:bg-zinc-900/50 opacity-70 group"
              >
                <button
                  onClick={() => toggleTodo({ id: todo._id })}
                  className="text-green-500 flex-shrink-0"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <span className="flex-1 text-sm text-zinc-500 line-through">{todo.title}</span>
                <button
                  onClick={() => deleteTodo({ id: todo._id }).then(() => toast.success("Deleted"))}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
