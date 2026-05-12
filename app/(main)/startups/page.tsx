"use client";

import { useWorkspace } from "@/lib/use-workspace";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useQuery as useConvexUserQuery } from "convex/react";
import { toast } from "sonner";
import { mockYCStartups } from "@/lib/yc-startups";
import { FileText, Lightbulb, CheckSquare, Rocket, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function StartupsPage() {
  const { workspaceId, isLoading } = useWorkspace();
  const { user } = useUser();

  const convexUser = useConvexUserQuery(
    api.users.getUser,
    user ? { clerkId: user.id } : "skip"
  );

  const createNote = useMutation(api.notes.createNote);
  const createIdea = useMutation(api.ideas.createIdea);
  const createTodo = useMutation(api.todos.createTodo);

  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const handleAddToNotes = async (startup: typeof mockYCStartups[0]) => {
    if (!workspaceId) return;
    setLoadingActionId(`${startup.id}-note`);
    try {
      await createNote({
        workspaceId,
        title: `Research Note: ${startup.name}`,
        content: `# ${startup.name} (${startup.batch})\n\n**Industry:** ${startup.industry}\n\n**Founders:** ${startup.founders.join(", ")}\n\n**Website:** ${startup.website}\n\n## Description\n${startup.description}\n\n## My Thoughts\n...`,
      });
      toast.success(`${startup.name} added to Notes`);
    } catch (e) {
      toast.error("Failed to add note");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleAddToIdeas = async (startup: typeof mockYCStartups[0]) => {
    if (!workspaceId || !convexUser) return;
    setLoadingActionId(`${startup.id}-idea`);
    try {
      await createIdea({
        workspaceId,
        title: `Idea inspired by ${startup.name}`,
        description: `How can we apply the ${startup.name} model to a new industry?\n\nContext: ${startup.description}`,
        tags: ["research", startup.industry.toLowerCase()],
        createdBy: convexUser._id,
      });
      toast.success(`${startup.name} added to Ideas`);
    } catch (e) {
      toast.error("Failed to add idea");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleAddToTodo = async (startup: typeof mockYCStartups[0]) => {
    if (!workspaceId) return;
    setLoadingActionId(`${startup.id}-todo`);
    try {
      await createTodo({
        workspaceId,
        title: `Deep dive research on ${startup.name}'s growth strategy`,
        priority: "medium",
      });
      toast.success(`${startup.name} task added to Todos`);
    } catch (e) {
      toast.error("Failed to add todo");
    } finally {
      setLoadingActionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in-up relative">
      
      {/* Top Atmospheric Glow */}
      <div 
        className="absolute top-0 right-1/4 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, var(--accent-purple) 0%, transparent 70%)",
          opacity: 0.15
        }}
      />

      {/* Header */}
      <div className="page-header border-b pb-12 mb-12 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--hairline-strong)" }}>
             <Rocket size={24} style={{ color: "var(--accent-purple)" }} />
          </div>
          <div>
            <h2 className="text-3xl font-medium tracking-tight mb-2" style={{ color: "var(--ink)" }}>
              YC Startup Directory
            </h2>
            <p className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>
              Research successful companies, save them as notes, ideas, or research tasks.
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
        {mockYCStartups.map((startup, i) => (
          <div
            key={startup.id}
            className="feature-card flex flex-col group relative overflow-hidden"
            style={{ animationDelay: `${i * 50}ms`, padding: "24px" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-medium leading-tight" style={{ color: "var(--ink)" }}>
                    {startup.name}
                  </h3>
                  <span className="badge-pill" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-orange)" }}>
                    {startup.batch}
                  </span>
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--mute)" }}>
                  {startup.industry} • {startup.founders.join(", ")}
                </p>
              </div>
              <a 
                href={startup.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-md transition-colors"
                style={{ color: "var(--stone)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--ink)", (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-elevated)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--stone)", (e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                aria-label={`Visit ${startup.name} website`}
              >
                <ExternalLink size={18} />
              </a>
            </div>

            {/* Description */}
            <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--charcoal)" }}>
              {startup.description}
            </p>

            {/* Actions Footer */}
            <div className="mt-auto pt-5 border-t flex flex-wrap gap-3 items-center" style={{ borderColor: "var(--divider-soft)" }}>
              <span className="text-xs font-medium mr-2" style={{ color: "var(--mute)" }}>SYNC TO</span>
              
              <button
                onClick={() => handleAddToNotes(startup)}
                disabled={loadingActionId === `${startup.id}-note`}
                className="btn-outline flex items-center gap-2"
                style={{ padding: "6px 12px", height: "32px", fontSize: "12px" }}
              >
                <FileText size={14} />
                {loadingActionId === `${startup.id}-note` ? "Saving..." : "Notes"}
              </button>
              
              <button
                onClick={() => handleAddToIdeas(startup)}
                disabled={loadingActionId === `${startup.id}-idea` || !convexUser}
                className="btn-outline flex items-center gap-2"
                style={{ padding: "6px 12px", height: "32px", fontSize: "12px" }}
              >
                <Lightbulb size={14} />
                {loadingActionId === `${startup.id}-idea` ? "Saving..." : "Ideas"}
              </button>

              <button
                onClick={() => handleAddToTodo(startup)}
                disabled={loadingActionId === `${startup.id}-todo`}
                className="btn-outline flex items-center gap-2"
                style={{ padding: "6px 12px", height: "32px", fontSize: "12px" }}
              >
                <CheckSquare size={14} />
                {loadingActionId === `${startup.id}-todo` ? "Saving..." : "Todos"}
              </button>
            </div>
            
            {/* Subtle top border accent */}
            <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "var(--accent-purple)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
