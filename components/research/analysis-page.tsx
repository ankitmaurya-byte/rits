"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Copy, FileUp, FileText, Globe2, Layers3, Link2, Search, Share2, Sparkles, Upload } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/store/workspace-store";

type Scope = "private" | "workspace";
type ImportSource = "yc" | "sharktank" | "github" | "tech_feed" | "startup";

const SOURCE_OPTIONS: Array<{ key: ImportSource; label: string }> = [
  { key: "yc", label: "YC" },
  { key: "sharktank", label: "SharkTank" },
  { key: "github", label: "GitHub" },
  { key: "tech_feed", label: "Tech Feed" },
  { key: "startup", label: "Startup" },
];

export function AnalysisPage() {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const [scope, setScope] = useState<Scope>(selectedWorkspaceId ? "workspace" : "private");
  const [title, setTitle] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [contextAttachmentName, setContextAttachmentName] = useState("");
  const [contextOrigin, setContextOrigin] = useState("manual");
  const [prompt, setPrompt] = useState("Analyze this material in a structured startup-grade format: summary, core insight, market context, risks, opportunities, recommendations, and concrete next steps.");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<"recent" | "all">("recent");
  const [importSource, setImportSource] = useState<ImportSource>("yc");
  const [importSearch, setImportSearch] = useState("");

  const reports = useQuery(
    api.researchOutputs.listReports,
    user
      ? {
          scope,
          workspaceId: scope === "workspace" ? selectedWorkspaceId ?? undefined : undefined,
        }
      : "skip"
  ) ?? [];
  const publishedReports = useQuery(api.researchOutputs.listPublishedReports, { limit: 18 }) ?? [];
  const contextMap = useQuery(
    api.researchOutputs.getContextMap,
    user
      ? {
          scope,
          workspaceId: scope === "workspace" ? selectedWorkspaceId ?? undefined : undefined,
        }
      : "skip"
  );
  const importRecords = useQuery(api.researchOutputs.listAnalysisImportRecords, {
    sourceType: importSource,
    search: importSearch.trim() || undefined,
  }) ?? [];

  const createReport = useMutation(api.researchOutputs.createReport);
  const publishReport = useMutation(api.researchOutputs.publishReport);

  const recentReports = reports.slice(0, 6);
  const visibleReports = activeList === "recent" ? recentReports : reports;

  const generatedSummary = useMemo(() => {
    return result.trim().split("\n").find((line) => line.trim())?.slice(0, 200) ?? "";
  }, [result]);

  const appendContext = (nextBlock: string, origin: string, attachmentName?: string) => {
    setSourceInput((current) => current.trim() ? `${current.trim()}\n\n---\n\n${nextBlock.trim()}` : nextBlock.trim());
    setContextOrigin(origin);
    if (attachmentName) setContextAttachmentName(attachmentName);
  };

  const handleUploadContext = async (file: File) => {
    const content = await file.text();
    appendContext(`# Uploaded context: ${file.name}\n\n${content}`, "upload", file.name);
    toast.success("Context uploaded.");
  };

  const handleUseContextMap = () => {
    if (!contextMap?.summary) {
      toast.error("No deployed context map available yet.");
      return;
    }
    appendContext(`# Deployed context map\n\n${contextMap.summary}`, "context_map");
    toast.success("Context map added.");
  };

  const handleImportRecord = (record: { title: string; content: string; meta: string; sourceType: string }) => {
    appendContext(`# Imported from ${record.sourceType}\nTitle: ${record.title}\nMeta: ${record.meta}\n\n${record.content}`, record.sourceType);
    toast.success("Record imported into analysis context.");
  };

  const handleGenerate = async () => {
    if (!sourceInput.trim() || !prompt.trim()) {
      toast.error("Add context and a prompt first.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context: sourceInput,
          contextType: "note",
        }),
      });
      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok || data.error || !data.result) {
        throw new Error(data.error ?? "Analysis failed.");
      }
      setResult(data.result);
      toast.success("Analysis ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!convexUser || !result.trim()) {
      toast.error("Generate an analysis first.");
      return;
    }

    if (scope === "workspace" && !selectedWorkspaceId) {
      toast.error("Select a workspace first.");
      return;
    }

    setSaving(true);
    try {
      await createReport({
        scope,
        workspaceId: scope === "workspace" ? selectedWorkspaceId ?? undefined : undefined,
        title: title.trim() || "Untitled analysis",
        prompt,
        context: sourceInput,
        content: result,
        summary: generatedSummary,
        sourceType: importSource,
        sourceFilters: [importSource],
        contextOrigin,
        contextAttachmentName: contextAttachmentName || undefined,
      });
      toast.success("Analysis saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save analysis.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (reportId: string, publish: boolean) => {
    setPublishingId(reportId);
    try {
      await publishReport({ reportId: reportId as never, publish });
      toast.success(publish ? "Analysis published." : "Analysis unpublished.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update publish state.");
    } finally {
      setPublishingId(null);
    }
  };

  const copyShareLink = async (shareToken?: string) => {
    if (!shareToken) {
      toast.error("Publish this analysis first.");
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/share/analysis/${shareToken}`);
    toast.success("Share link copied.");
  };

  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="absolute top-0 right-1/4 h-[420px] w-[680px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top, var(--accent-blue-glow) 0%, transparent 72%)", opacity: 0.16 }} />

      <div className="page-header border-b pb-8 mb-8 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl" style={{ color: "var(--ink)" }}>Analysis</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setScope("private")} className="btn-outline" style={{ backgroundColor: scope === "private" ? "var(--surface-elevated)" : undefined }}>Private</button>
            <button type="button" onClick={() => setScope("workspace")} className="btn-outline" style={{ backgroundColor: scope === "workspace" ? "var(--surface-elevated)" : undefined }}>Workspace</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.05fr_0.95fr] relative z-10">
        <div className="space-y-6">
          <section className="feature-card" style={{ padding: 28 }}>
            <div className="mb-4 flex items-center gap-2">
              <Layers3 size={16} style={{ color: "var(--accent-blue)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Context Pipeline</p>
            </div>

            <div className="space-y-4">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-field" placeholder="Analysis title" />

              <div className="flex flex-wrap gap-3">
                <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void handleUploadContext(file);
                  event.currentTarget.value = "";
                }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-outline"><Upload size={15} /> Upload context</button>
                <button type="button" onClick={handleUseContextMap} className="btn-outline"><Link2 size={15} /> Use deployed context map</button>
              </div>

              {contextMap ? (
                <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)", color: "var(--charcoal)" }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium" style={{ color: "var(--ink)" }}>Deployed context map</span>
                    <span style={{ color: "var(--mute)" }}>{contextMap.counts.ideas} ideas · {contextMap.counts.todos} todos · {contextMap.counts.notes} notes · {contextMap.counts.resources} resources</span>
                  </div>
                  <p className="line-clamp-4 whitespace-pre-wrap">{contextMap.summary}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)" }}>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>Import analysis source</span>
                  <select value={importSource} onChange={(event) => setImportSource(event.target.value as ImportSource)} className="input-field h-10 w-[180px]">
                    {SOURCE_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                  <div className="relative min-w-[220px] flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
                    <input value={importSearch} onChange={(event) => setImportSearch(event.target.value)} className="input-field pl-9" placeholder="Filter imported records" />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {importRecords.map((record) => (
                    <button key={record.id} type="button" onClick={() => handleImportRecord(record)} className="rounded-xl border p-4 text-left transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)" }}>
                      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{record.title}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--mute)" }}>{record.meta}</p>
                      <p className="mt-2 line-clamp-3 text-xs" style={{ color: "var(--charcoal)" }}>{record.content}</p>
                    </button>
                  ))}
                </div>
              </div>

              <textarea value={sourceInput} onChange={(event) => setSourceInput(event.target.value)} rows={12} className="input-field resize-y" placeholder="Your uploaded context, deployed context map, and imported datasets land here before analysis runs..." />
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} className="input-field resize-y" placeholder="How should AI analyze this?" />
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void handleGenerate()} disabled={loading} className="btn-primary">
                  <Sparkles size={15} /> {loading ? "Analyzing..." : "Run Analysis"}
                </button>
                <button type="button" onClick={() => void handleSave()} disabled={saving || !result.trim()} className="btn-outline">
                  <FileText size={15} /> {saving ? "Saving..." : "Save Analysis"}
                </button>
              </div>
            </div>
          </section>

          <section className="feature-card" style={{ padding: 28 }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe2 size={16} style={{ color: "var(--accent-green)" }} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Saved Analysis</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-outline text-xs" style={{ backgroundColor: activeList === "recent" ? "var(--surface-elevated)" : undefined }} onClick={() => setActiveList("recent")}>Recent</button>
                <button className="btn-outline text-xs" style={{ backgroundColor: activeList === "all" ? "var(--surface-elevated)" : undefined }} onClick={() => setActiveList("all")}>All analyses</button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {visibleReports.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--charcoal)" }}>No saved analyses yet in this scope.</p>
              ) : (
                visibleReports.map((report) => (
                  <article key={report._id} className="rounded-xl border p-4" style={{ borderColor: "var(--hairline)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{report.title}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--mute)" }}>{report.sourceType ?? "manual"} · {report.contextOrigin ?? "manual"}</p>
                      </div>
                      <span className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em]" style={{ borderColor: report.published ? "rgba(74,222,128,0.35)" : "var(--hairline)", color: report.published ? "var(--accent-green)" : "var(--mute)" }}>{report.published ? "Published" : "Draft"}</span>
                    </div>
                    <p className="mt-3 text-xs line-clamp-5" style={{ color: "var(--charcoal)" }}>{report.summary ?? report.content}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void togglePublish(report._id, !report.published)} disabled={publishingId === report._id} className="btn-outline text-xs">
                        <Share2 size={12} /> {publishingId === report._id ? "Updating..." : report.published ? "Unpublish" : "Publish analysis"}
                      </button>
                      <button type="button" onClick={() => void copyShareLink(report.shareToken)} className="btn-outline text-xs">
                        <Copy size={12} /> Share
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="feature-card" style={{ padding: 28 }}>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} style={{ color: "var(--accent-orange)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Generated Analysis</p>
            </div>
            <div className="rounded-xl border p-5 min-h-[520px] whitespace-pre-wrap text-sm leading-7" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)", color: "var(--body)" }}>
              {result || "Load context, optionally import market records, then run analysis to see structured output here."}
            </div>
          </section>

          <section className="feature-card" style={{ padding: 28 }}>
            <div className="mb-4 flex items-center gap-2">
              <FileUp size={16} style={{ color: "var(--accent-blue)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Published Analysis</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {publishedReports.map((report) => (
                <article key={report._id} className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)" }}>
                  <p className="text-lg font-medium" style={{ color: "var(--ink)" }}>{report.title}</p>
                  <p className="mt-2 text-sm line-clamp-5" style={{ color: "var(--charcoal)" }}>{report.summary ?? report.content}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--mute)" }}>{report.sourceType ?? "analysis"}</span>
                    {report.shareToken ? (
                      <a href={`/share/analysis/${report.shareToken}`} className="btn-outline text-xs">Explore</a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
