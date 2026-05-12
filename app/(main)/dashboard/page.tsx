"use client";

import { useWorkspace } from "@/lib/use-workspace";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import {
  Lightbulb,
  CheckSquare,
  FileText,
  TrendingUp,
  ArrowRight,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { workspaceId, isLoading } = useWorkspace();
  const { user } = useUser();

  const ideas = useQuery(api.ideas.getIdeas, workspaceId ? { workspaceId } : "skip");
  const todos = useQuery(api.todos.getTodos, workspaceId ? { workspaceId } : "skip");
  const notes = useQuery(api.notes.getNotes, workspaceId ? { workspaceId } : "skip");

  if (isLoading) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="skeleton h-80 rounded-xl" />
           <div className="skeleton h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const completedTodos = todos?.filter((t) => t.completed).length ?? 0;
  const pendingTodos   = (todos?.length ?? 0) - completedTodos;
  const completionRate = todos?.length ? Math.round((completedTodos / todos.length) * 100) : 0;

  const stats = [
    {
      label: "Active Ideas",
      value: ideas?.length ?? 0,
      icon: Lightbulb,
      color: "var(--warning)",
      bg: "var(--warning-bg)",
      href: "/ideas",
      meta: "Needs action",
    },
    {
      label: "Pending Tasks",
      value: pendingTodos,
      icon: CheckSquare,
      color: "var(--info)",
      bg: "var(--info-bg)",
      href: "/todos",
      meta: `${completedTodos} completed today`,
    },
    {
      label: "Task Completion",
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: "var(--success)",
      bg: "var(--success-bg)",
      href: "/todos",
      meta: completionRate > 50 ? "On track" : "Needs attention",
    },
    {
      label: "Document Notes",
      value: notes?.length ?? 0,
      icon: FileText,
      color: "#7e22ce",
      bg: "#f3e8ff",
      href: "/notes",
      meta: "Drafts and final",
    },
  ];

  const firstName = user?.firstName ?? user?.username ?? "Founder";

  return (
    <div className="page-container animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#0f172a] tracking-tight mb-2">
          Welcome back, {firstName}
        </h2>
        <p className="text-[#475569]">
          Here's what's happening in your startup workspace today.
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="stat-card group relative overflow-hidden transition-all hover:border-[#cbd5e1] hover:-translate-y-0.5">
               <div className="flex items-start justify-between mb-4">
                 <div className="p-2.5 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                   <Icon size={20} style={{ color: s.color }} />
                 </div>
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-[#e2e8f0] rounded-full p-1 shadow-sm">
                   <ArrowRight size={14} className="text-[#64748b]" />
                 </div>
               </div>
               
               <div>
                  <div className="text-3xl font-bold text-[#0f172a] tracking-tight mb-1">
                    {s.value}
                  </div>
                  <div className="text-sm font-medium text-[#475569]">
                    {s.label}
                  </div>
               </div>

               <div className="mt-4 pt-3 border-t border-[#f1f5f9] text-xs font-medium text-[#64748b]">
                  {s.meta}
               </div>
            </Link>
          );
        })}
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Ideas */}
        <div className="stripe-card flex flex-col">
          <div className="px-6 py-5 border-b border-[#f1f5f9] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-[#fef3c7]">
                <Lightbulb size={16} className="text-[#d97706]" />
              </div>
              <h3 className="text-base font-semibold text-[#0f172a]">Recent Ideas</h3>
            </div>
            <Link href="/ideas" className="text-sm font-medium text-[#635bff] hover:text-[#544de8] transition-colors">
              View all
            </Link>
          </div>

          <div className="p-2 flex-1">
            {ideas?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <Lightbulb size={32} className="text-[#cbd5e1] mb-3" />
                <p className="text-sm text-[#64748b]">No ideas captured yet.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {ideas?.slice(0, 5).map((idea) => (
                  <li key={idea._id}>
                    <Link href={`/ideas`} className="flex items-start gap-4 p-4 rounded-lg hover:bg-[#f8fafc] transition-colors group">
                      <div className="w-2 h-2 rounded-full bg-[#f59e0b] mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0f172a] truncate mb-0.5">{idea.title}</p>
                        <p className="text-xs text-[#64748b] truncate">{idea.description || "No description provided."}</p>
                      </div>
                      <MoreHorizontal size={16} className="text-[#cbd5e1] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Actionable Todos */}
        <div className="stripe-card flex flex-col">
          <div className="px-6 py-5 border-b border-[#f1f5f9] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-[#dbeafe]">
                <CheckSquare size={16} className="text-[#2563eb]" />
              </div>
              <h3 className="text-base font-semibold text-[#0f172a]">Active Tasks</h3>
            </div>
            <Link href="/todos" className="text-sm font-medium text-[#635bff] hover:text-[#544de8] transition-colors">
              Manage
            </Link>
          </div>

          <div className="p-2 flex-1">
             {todos?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <CheckSquare size={32} className="text-[#cbd5e1] mb-3" />
                <p className="text-sm text-[#64748b]">You're all caught up!</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {todos?.filter(t => !t.completed).slice(0, 5).map((todo) => (
                  <li key={todo._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8fafc] transition-colors">
                    <div className="w-5 h-5 rounded border-2 border-[#cbd5e1] flex-shrink-0" />
                    <span className="text-sm text-[#0f172a] flex-1 truncate font-medium">{todo.title}</span>
                    <span className={`badge ${
                      todo.priority === "high" ? "badge-red" : 
                      todo.priority === "medium" ? "badge-amber" : "badge-blue"
                    }`}>
                      {todo.priority}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
