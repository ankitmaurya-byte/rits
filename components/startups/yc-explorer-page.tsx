"use client";

import { useWorkspace } from "@/lib/use-workspace";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useQuery as useConvexUserQuery } from "convex/react";
import { toast } from "sonner";
import { mockYCStartups, type YCStartup } from "@/lib/yc-startups";
import { FileText, Lightbulb, CheckSquare, Rocket, ExternalLink, Search, Filter, Sparkles, X } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { ThemedSelect } from "@/components/ui/themed-select";

const industries = ["All", ...Array.from(new Set(mockYCStartups.map((s) => s.industry))).sort()];
const batches = ["All", ...Array.from(new Set(mockYCStartups.map((s) => s.batch))).sort()];

export function YcExplorerPage() {
  const { workspaceId, isLoading } = useWorkspace();
  const { user } = useUser();

  const convexUser = useConvexUserQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");

  const createNote = useMutation(api.notes.createNote);
  const createIdea = useMutation(api.ideas.createIdea);
  const createTodo = useMutation(api.todos.createTodo);

  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [batchFilter, setBatchFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(10);
  const [selectedStartup, setSelectedStartup] = useState<YCStartup | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState("Analyze this startup's business model, moat, risks, competitors, and possible startup ideas inspired by it.");
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const filteredStartups = useMemo(() => {
    return mockYCStartups.filter((startup) => {
      const matchesSearch =
        startup.name.toLowerCase().includes(search.toLowerCase()) ||
        startup.description.toLowerCase().includes(search.toLowerCase());
      const matchesIndustry = industryFilter === "All" || startup.industry === industryFilter;
      const matchesBatch = batchFilter === "All" || startup.batch === batchFilter;
      return matchesSearch && matchesIndustry && matchesBatch;
    });
  }, [search, industryFilter, batchFilter]);

  const visibleStartups = filteredStartups.slice(0, visibleCount);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 10, filteredStartups.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    return () => observer.disconnect();
  }, [filteredStartups.length]);

  const handleAddToNotes = async (startup: (typeof mockYCStartups)[0]) => {
    if (!workspaceId) return;
    setLoadingActionId(`${startup.id}-note`);
    try {
      await createNote({
        workspaceId,
        scope: "workspace",
        title: `Research Note: ${startup.name}`,
        content: `# ${startup.name} (${startup.batch})\n\n**Industry:** ${startup.industry}\n\n**Founders:** ${startup.founders.join(", ")}\n\n**Website:** ${startup.website}\n\n## Description\n${startup.description}\n\n## My Thoughts\n...`,
      });
      toast.success(`${startup.name} added to Notes`);
    } catch {
      toast.error("Failed to add note");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleAddToIdeas = async (startup: (typeof mockYCStartups)[0]) => {
    if (!workspaceId || !convexUser) return;
    setLoadingActionId(`${startup.id}-idea`);
    try {
      await createIdea({
        workspaceId,
        scope: "workspace",
        title: `Idea inspired by ${startup.name}`,
        description: `How can we apply the ${startup.name} model to a new industry?\n\nContext: ${startup.description}`,
        tags: ["research", startup.industry.toLowerCase()],
        createdBy: convexUser._id,
      });
      toast.success(`${startup.name} added to Ideas`);
    } catch {
      toast.error("Failed to add idea");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleAddToTodo = async (startup: (typeof mockYCStartups)[0]) => {
    if (!workspaceId) return;
    setLoadingActionId(`${startup.id}-todo`);
    try {
      await createTodo({
        workspaceId,
        scope: "workspace",
        title: `Deep dive research on ${startup.name}'s growth strategy`,
        priority: "medium",
      });
      toast.success(`${startup.name} task added to Todos`);
    } catch {
      toast.error("Failed to add todo");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleAnalyzeStartup = async () => {
    if (!selectedStartup || !analysisPrompt.trim()) return;

    setAnalysisLoading(true);
    try {
      const context = [
        `Startup: ${selectedStartup.name}`,
        `Batch: ${selectedStartup.batch}`,
        `Industry: ${selectedStartup.industry}`,
        `Founders: ${selectedStartup.founders.join(", ")}`,
        `Website: ${selectedStartup.website}`,
        `Description: ${selectedStartup.description}`,
      ].join("\n");

      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: analysisPrompt,
          context,
          contextType: "note",
        }),
      });
      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok || data.error || !data.result) {
        throw new Error(data.error ?? "AI analysis failed.");
      }
      setAnalysisResult(data.result);
      toast.success("Analysis ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI analysis failed.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSaveAnalysisToPrivateNotes = async () => {
    if (!convexUser || !selectedStartup) {
      toast.error("Your account is still loading.");
      return;
    }

    const content = [
      `# ${selectedStartup.name}`,
      ``,
      `Batch: ${selectedStartup.batch}`,
      `Industry: ${selectedStartup.industry}`,
      `Founders: ${selectedStartup.founders.join(", ")}`,
      `Website: ${selectedStartup.website}`,
      ``,
      `## Description`,
      selectedStartup.description,
      analysisResult ? `\n## AI Analysis\n${analysisResult}` : "",
    ].join("\n");

    setLoadingActionId(`${selectedStartup.id}-private-note`);
    try {
      await createNote({
        scope: "private",
        title: `YC Analysis: ${selectedStartup.name}`,
        content,
        createdBy: convexUser._id,
      });
      toast.success("Saved to private notes.");
    } catch {
      toast.error("Failed to save private note.");
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
      <div
        className="absolute top-0 right-1/4 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, var(--accent-purple) 0%, transparent 70%)",
          opacity: 0.15,
        }}
      />

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
              Explore all YC companies with search, filters, and infinite scroll. Save any company into notes, ideas, or research tasks.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 relative z-10">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} style={{ color: "var(--mute)" }} />
          </div>
          <input
            type="text"
            placeholder="Search startups or descriptions..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(10);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none transition-colors"
            style={{ backgroundColor: "var(--surface-elevated)", borderColor: "var(--hairline-strong)", color: "var(--ink)" }}
          />
        </div>
        <div className="flex gap-4">
          <div>
            <ThemedSelect
              value={industryFilter}
              onChange={(e) => {
                setIndustryFilter(e.target.value);
                setVisibleCount(10);
              }}
              className="min-w-[160px]"
              icon={<Filter size={16} />}
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </ThemedSelect>
          </div>

          <div>
            <ThemedSelect
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                setVisibleCount(10);
              }}
              className="min-w-[120px]"
            >
              {batches.map((batch) => (
                <option key={batch} value={batch}>{batch}</option>
              ))}
            </ThemedSelect>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10 mb-8">
        {visibleStartups.map((startup, i) => (
          <div
            key={startup.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedStartup(startup);
              setAnalysisResult("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedStartup(startup);
                setAnalysisResult("");
              }
            }}
            className="feature-card flex cursor-pointer flex-col group relative overflow-hidden"
            style={{ animationDelay: `${i * 50}ms`, padding: "24px" }}
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-medium leading-tight" style={{ color: "var(--ink)" }}>{startup.name}</h3>
                  <span className="badge-pill" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-orange)" }}>{startup.batch}</span>
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--mute)" }}>
                  {startup.industry} • {startup.founders.join(", ")}
                </p>
              </div>
              <a
                href={startup.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-md transition-colors"
                style={{ color: "var(--stone)" }}
                onMouseEnter={(e) => (((e.currentTarget as HTMLElement).style.color = "var(--ink)"), ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-elevated)"))}
                onMouseLeave={(e) => (((e.currentTarget as HTMLElement).style.color = "var(--stone)"), ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent"))}
                aria-label={`Visit ${startup.name} website`}
              >
                <ExternalLink size={18} />
              </a>
            </div>

            <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--charcoal)" }}>
              {startup.description}
            </p>

            <div className="mt-auto pt-5 border-t flex flex-wrap gap-3 items-center" style={{ borderColor: "var(--divider-soft)" }}>
              <span className="text-xs font-medium mr-2" style={{ color: "var(--mute)" }}>SYNC TO</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void handleAddToNotes(startup);
                }}
                disabled={loadingActionId === `${startup.id}-note`}
                className="btn-outline flex items-center gap-2"
                style={{ padding: "6px 12px", height: "32px", fontSize: "12px" }}
              >
                <FileText size={14} />
                {loadingActionId === `${startup.id}-note` ? "Saving..." : "Notes"}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void handleAddToIdeas(startup);
                }}
                disabled={loadingActionId === `${startup.id}-idea` || !convexUser}
                className="btn-outline flex items-center gap-2"
                style={{ padding: "6px 12px", height: "32px", fontSize: "12px" }}
              >
                <Lightbulb size={14} />
                {loadingActionId === `${startup.id}-idea` ? "Saving..." : "Ideas"}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void handleAddToTodo(startup);
                }}
                disabled={loadingActionId === `${startup.id}-todo`}
                className="btn-outline flex items-center gap-2"
                style={{ padding: "6px 12px", height: "32px", fontSize: "12px" }}
              >
                <CheckSquare size={14} />
                {loadingActionId === `${startup.id}-todo` ? "Saving..." : "Todos"}
              </button>
            </div>

            <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "var(--accent-purple)" }} />
          </div>
        ))}
      </div>

      {visibleCount < filteredStartups.length ? (
        <div ref={loaderRef} className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--accent-purple)" }} />
        </div>
      ) : null}

      {filteredStartups.length === 0 ? (
        <div className="text-center py-24 text-sm" style={{ color: "var(--mute)" }}>
          No startups found matching your criteria.
        </div>
      ) : null}

      {selectedStartup ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8"
          style={{ backgroundColor: "rgba(0,0,0,0.68)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedStartup(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl border shadow-2xl"
            style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--hairline-strong)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b px-6 py-5" style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--hairline)" }}>
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-2xl font-medium" style={{ color: "var(--ink)" }}>{selectedStartup.name}</h3>
                  <span className="badge-pill" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-orange)" }}>{selectedStartup.batch}</span>
                </div>
                <p className="text-sm" style={{ color: "var(--charcoal)" }}>
                  {selectedStartup.industry} • {selectedStartup.founders.join(", ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStartup(null)}
                className="rounded-md p-2 transition-colors hover:bg-[var(--surface-elevated)]"
                style={{ color: "var(--stone)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Overview</p>
                  <p className="text-sm leading-7" style={{ color: "var(--body)" }}>{selectedStartup.description}</p>
                  <div className="mt-5 flex flex-wrap gap-3 text-xs" style={{ color: "var(--charcoal)" }}>
                    <span className="badge-pill">{selectedStartup.industry}</span>
                    <span className="badge-pill">Batch {selectedStartup.batch}</span>
                    <a href={selectedStartup.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5" style={{ color: "var(--accent-blue)" }}>
                      <ExternalLink size={13} /> Visit website
                    </a>
                  </div>
                </section>

                <section className="feature-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={16} style={{ color: "var(--accent-purple)" }} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>AI analysis</p>
                  </div>
                  <textarea
                    value={analysisPrompt}
                    onChange={(e) => setAnalysisPrompt(e.target.value)}
                    rows={4}
                    className="input-field min-h-[110px] resize-y"
                    placeholder="Ask AI to analyze this startup..."
                  />
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button onClick={() => void handleAnalyzeStartup()} disabled={analysisLoading || !analysisPrompt.trim()} className="btn-primary">
                      <Sparkles size={15} /> {analysisLoading ? "Analyzing..." : "Analyze with AI"}
                    </button>
                    <button onClick={() => void handleSaveAnalysisToPrivateNotes()} disabled={!analysisResult || loadingActionId === `${selectedStartup.id}-private-note`} className="btn-outline">
                      <FileText size={15} /> {loadingActionId === `${selectedStartup.id}-private-note` ? "Saving..." : "Add in Private Confluence"}
                    </button>
                  </div>
                  <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                    {analysisResult ? (
                      <div className="whitespace-pre-wrap text-sm leading-7" style={{ color: "var(--body)" }}>
                        {analysisResult}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: "var(--charcoal)" }}>
                        Run an AI analysis to generate business, moat, risk, competitor, and idea insights for this company.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Founders</p>
                  <div className="space-y-2">
                    {selectedStartup.founders.map((founder) => (
                      <div key={founder} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}>
                        {founder}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Quick actions</p>
                  <div className="grid gap-3">
                    <button onClick={() => void handleAddToNotes(selectedStartup)} disabled={loadingActionId === `${selectedStartup.id}-note`} className="btn-outline justify-start">
                      <FileText size={15} /> {loadingActionId === `${selectedStartup.id}-note` ? "Saving..." : "Add to workspace notes"}
                    </button>
                    <button onClick={() => void handleAddToIdeas(selectedStartup)} disabled={loadingActionId === `${selectedStartup.id}-idea` || !convexUser} className="btn-outline justify-start">
                      <Lightbulb size={15} /> {loadingActionId === `${selectedStartup.id}-idea` ? "Saving..." : "Add to ideas"}
                    </button>
                    <button onClick={() => void handleAddToTodo(selectedStartup)} disabled={loadingActionId === `${selectedStartup.id}-todo`} className="btn-outline justify-start">
                      <CheckSquare size={15} /> {loadingActionId === `${selectedStartup.id}-todo` ? "Saving..." : "Add to todos"}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
