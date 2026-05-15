"use client";

import { useWorkspace } from "@/lib/use-workspace";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { IdeaDescription } from "@/components/ideas/idea-text";
import {
  Compass,
  Lightbulb,
  CheckSquare,
  FileText,
  TrendingUp,
  ArrowRight,
  FolderKanban,
  FlaskConical,
  PlugZap,
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
      color: "var(--accent-yellow)",
      href: "/ideas",
      meta: "Needs action",
    },
    {
      label: "Pending Tasks",
      value: pendingTodos,
      icon: CheckSquare,
      color: "var(--accent-blue)",
      href: "/todos",
      meta: `${completedTodos} completed today`,
    },
    {
      label: "Task Completion",
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: "var(--accent-green)",
      href: "/todos",
      meta: completionRate > 50 ? "On track" : "Needs attention",
    },
    {
      label: "Document Notes",
      value: notes?.length ?? 0,
      icon: FileText,
      color: "var(--primary)",
      href: "/notes",
      meta: "Drafts and final",
    },
  ];

  const firstName = user?.firstName ?? user?.username ?? "Founder";

  const productLaunchers = [
    {
      title: "Explore",
      description: "Discover YC companies, Shark Tank startups, open-source ecosystems, and GitHub tools.",
      href: "/explore",
      icon: Compass,
      color: "var(--accent-orange)",
    },
    {
      title: "Research",
      description: "Analyze links, folders, competitors, and market reports with AI-assisted workflows.",
      href: "/research",
      icon: FlaskConical,
      color: "var(--accent-blue)",
    },
    {
      title: "Vaults",
      description: "Curate startup intelligence, AI tools, and market collections in reusable knowledge spaces.",
      href: "/vaults",
      icon: FolderKanban,
      color: "var(--accent-green)",
    },
    {
      title: "Integrations",
      description: "Prepare for Gmail, Calendar, GitHub, Drive, and other connected startup systems.",
      href: "/integrations",
      icon: PlugZap,
      color: "var(--primary)",
    },
  ];

  return (
    <div className="page-container animate-fade-in-up relative">
      
      {/* Top Atmospheric Glow */}
      <div 
        className="absolute top-0 right-0 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top right, var(--accent-orange-glow) 0%, transparent 70%)"
        }}
      />

      {/* Header */}
      <div className="mb-12 relative z-10">
        <h2 className="text-3xl font-medium tracking-tight mb-3" style={{ color: "var(--ink)", fontFamily: "'Geist Mono', monospace, sans-serif" }}>
          Welcome back, {firstName}.
        </h2>
        <p className="text-base" style={{ color: "var(--body)" }}>
          Here is the status of your workspace today.
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="feature-card group relative overflow-hidden transition-all hover:bg-[var(--surface-elevated)]">
               <div className="flex items-start justify-between mb-8">
                 <div className="p-0 flex items-center justify-center">
                   <Icon size={20} style={{ color: s.color }} />
                 </div>
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowRight size={16} style={{ color: "var(--charcoal)" }} />
                 </div>
               </div>
               
               <div>
                  <div className="text-3xl font-medium tracking-tight mb-1" style={{ color: "var(--ink)", fontFamily: "'Geist Mono', monospace" }}>
                    {s.value}
                  </div>
                  <div className="text-sm font-medium" style={{ color: "var(--body)" }}>
                    {s.label}
                  </div>
               </div>

               <div className="mt-4 pt-4 border-t text-xs font-medium" style={{ borderColor: "var(--divider-soft)", color: "var(--ash)" }}>
                  {s.meta}
               </div>
            </Link>
          );
        })}
      </div>

      {/* Main Content Areas */}
      <div className="mb-12 relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-2" style={{ color: "var(--mute)" }}>New product surface</p>
            <h3 className="text-xl font-medium" style={{ color: "var(--ink)" }}>Startup research OS</h3>
          </div>
          <Link href="/explore" className="text-sm font-medium hover:underline" style={{ color: "var(--body)" }}>
            Open all hubs
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {productLaunchers.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href} className="feature-card group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)]">
                <div className="mb-6 flex items-center justify-between">
                  <div className="rounded-lg p-2" style={{ backgroundColor: "var(--surface-deep)", color: item.color }}>
                    <Icon size={18} />
                  </div>
                  <ArrowRight size={15} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--charcoal)" }} />
                </div>
                <h4 className="text-base font-medium mb-2" style={{ color: "var(--ink)" }}>{item.title}</h4>
                <p className="text-sm leading-6" style={{ color: "var(--charcoal)" }}>{item.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        
        {/* Recent Ideas */}
        <div className="feature-card flex flex-col p-0">
          <div className="px-8 py-6 border-b flex items-center justify-between" style={{ borderColor: "var(--divider-soft)" }}>
            <div className="flex items-center gap-3">
              <Lightbulb size={16} style={{ color: "var(--accent-yellow)" }} />
              <h3 className="text-base font-medium" style={{ color: "var(--ink)" }}>Recent Ideas</h3>
            </div>
            <Link href="/ideas" className="text-sm font-medium hover:underline" style={{ color: "var(--body)" }}>
              View all
            </Link>
          </div>

          <div className="p-2 flex-1">
            {ideas?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <Lightbulb size={24} style={{ color: "var(--stone)", marginBottom: "12px" }} />
                <p className="text-sm" style={{ color: "var(--charcoal)" }}>No ideas captured yet.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {ideas?.slice(0, 5).map((idea) => (
                  <li key={idea._id}>
                    <Link href={`/ideas`} className="flex items-start gap-4 p-4 rounded-md transition-colors group hover:bg-[var(--surface-elevated)]">
                      <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "var(--accent-yellow)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate mb-1" style={{ color: "var(--ink)" }}>{idea.title}</p>
                        {idea.description ? (
                          <IdeaDescription className="text-xs line-clamp-2" style={{ color: "var(--charcoal)" }} description={idea.description} />
                        ) : (
                          <p className="text-xs truncate" style={{ color: "var(--charcoal)" }}>No description provided.</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Actionable Todos */}
        <div className="feature-card flex flex-col p-0">
          <div className="px-8 py-6 border-b flex items-center justify-between" style={{ borderColor: "var(--divider-soft)" }}>
            <div className="flex items-center gap-3">
              <CheckSquare size={16} style={{ color: "var(--accent-blue)" }} />
              <h3 className="text-base font-medium" style={{ color: "var(--ink)" }}>Active Tasks</h3>
            </div>
            <Link href="/todos" className="text-sm font-medium hover:underline" style={{ color: "var(--body)" }}>
              Manage
            </Link>
          </div>

          <div className="p-2 flex-1">
             {todos?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <CheckSquare size={24} style={{ color: "var(--stone)", marginBottom: "12px" }} />
                <p className="text-sm" style={{ color: "var(--charcoal)" }}>You&apos;re all caught up!</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {todos?.filter(t => !t.completed).slice(0, 5).map((todo) => (
                  <li key={todo._id} className="flex items-center gap-3 p-4 rounded-md transition-colors hover:bg-[var(--surface-elevated)]">
                    <div className="w-4 h-4 rounded border flex-shrink-0" style={{ borderColor: "var(--mute)" }} />
                    <span className="text-sm flex-1 truncate font-medium" style={{ color: "var(--ink)" }}>{todo.title}</span>
                    <span className="badge-pill" style={{ 
                      color: todo.priority === 'high' ? 'var(--accent-red)' : todo.priority === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-blue)',
                      backgroundColor: "var(--surface-deep)",
                      border: "1px solid var(--hairline-strong)"
                    }}>
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
