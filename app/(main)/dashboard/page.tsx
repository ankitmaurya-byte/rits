"use client";

import { useWorkspace } from "@/lib/use-workspace";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckSquare, Lightbulb, FileText, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { workspaceId, isLoading } = useWorkspace();

  const ideas = useQuery(
    api.ideas.getIdeas,
    workspaceId ? { workspaceId } : "skip"
  );
  const todos = useQuery(
    api.todos.getTodos,
    workspaceId ? { workspaceId } : "skip"
  );
  const notes = useQuery(
    api.notes.getNotes,
    workspaceId ? { workspaceId } : "skip"
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500 text-sm animate-pulse">Loading workspace...</div>
      </div>
    );
  }

  const completedTodos = todos?.filter((t) => t.completed).length ?? 0;
  const pendingTodos = (todos?.length ?? 0) - completedTodos;

  const stats = [
    {
      label: "Ideas",
      value: ideas?.length ?? 0,
      icon: Lightbulb,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: "Pending Todos",
      value: pendingTodos,
      icon: CheckSquare,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Completed",
      value: completedTodos,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-950",
    },
    {
      label: "Notes",
      value: notes?.length ?? 0,
      icon: FileText,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950",
    },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Overview of your workspace</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border bg-white dark:bg-zinc-900 p-5 flex items-center gap-4 shadow-sm"
            >
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stat.value}
                </div>
                <div className="text-xs text-zinc-500">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent ideas */}
        <div className="rounded-xl border bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" /> Recent Ideas
          </h2>
          {ideas?.length === 0 && (
            <p className="text-sm text-zinc-400">No ideas yet. Add one!</p>
          )}
          <ul className="space-y-2">
            {ideas?.slice(0, 5).map((idea) => (
              <li key={idea._id} className="text-sm">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{idea.title}</span>
                <p className="text-zinc-500 text-xs truncate">{idea.description}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent todos */}
        <div className="rounded-xl border bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-500" /> Recent Todos
          </h2>
          {todos?.length === 0 && (
            <p className="text-sm text-zinc-400">No todos yet. Create one!</p>
          )}
          <ul className="space-y-2">
            {todos?.slice(0, 5).map((todo) => (
              <li key={todo._id} className="text-sm flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    todo.completed ? "bg-green-500" : "bg-zinc-300"
                  }`}
                />
                <span
                  className={`${
                    todo.completed
                      ? "line-through text-zinc-400"
                      : "text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {todo.title}
                </span>
                <span className="ml-auto text-xs text-zinc-400 capitalize">
                  {todo.priority}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
