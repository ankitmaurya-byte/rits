"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { FileText, Globe2, Layers3, Sparkles } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/store/workspace-store";

type Scope = "private" | "workspace";

export function AnalysisPage() {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const convexUser = useQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const [scope, setScope] = useState<Scope>(selectedWorkspaceId ? "workspace" : "private");
  const [title, setTitle] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [prompt, setPrompt] = useState("Analyze this material in a structured startup-grade format: summary, core insight, market context, risks, opportunities, recommendations, and concrete next steps.");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reports = useQuery(
    api.researchOutputs.listReports,
    user
      ? {
          scope,
          workspaceId: scope === "workspace" ? selectedWorkspaceId ?? undefined : undefined,
        }
      : "skip"
  ) ?? [];
  const createReport = useMutation(api.researchOutputs.createReport);

  const handleGenerate = async () => {
    if (!sourceInput.trim() || !prompt.trim()) {
      toast.error("Add material and a prompt first.");
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
      });
      toast.success("Analysis saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save analysis.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top, var(--accent-blue-glow) 0%, transparent 70%)", opacity: 0.16 }} />

      <div className="page-header border-b pb-12 mb-12 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--mute)" }}>Research / Analysis</p>
            <h2 className="text-4xl font-medium tracking-tight mb-4" style={{ color: "var(--ink)" }}>One place for links, files, docs, notes, and any analysis</h2>
            <p className="text-base leading-7" style={{ color: "var(--body)" }}>
              This unified analysis surface replaces separate file and link analysis flows. Paste anything you want analyzed, generate structured output, and keep all saved analyses in one maintained list.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setScope("private")} className="btn-outline" style={{ backgroundColor: scope === "private" ? "var(--surface-elevated)" : undefined }}>Private</button>
            <button type="button" onClick={() => setScope("workspace")} className="btn-outline" style={{ backgroundColor: scope === "workspace" ? "var(--surface-elevated)" : undefined }}>Workspace</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[0.95fr_1.05fr] relative z-10">
        <div className="space-y-6">
          <section className="feature-card" style={{ padding: "28px" }}>
            <div className="mb-4 flex items-center gap-2">
              <Layers3 size={16} style={{ color: "var(--accent-blue)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Analysis Input</p>
            </div>
            <div className="space-y-4">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-field" placeholder="Analysis title" />
              <textarea value={sourceInput} onChange={(event) => setSourceInput(event.target.value)} rows={10} className="input-field resize-y" placeholder="Paste links, files text, research notes, transcripts, repo details, or any raw material here..." />
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

          <section className="feature-card" style={{ padding: "28px" }}>
            <div className="mb-4 flex items-center gap-2">
              <Globe2 size={16} style={{ color: "var(--accent-green)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Saved Analysis</p>
            </div>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {reports.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--charcoal)" }}>No saved analyses yet in this scope.</p>
              ) : (
                reports.map((report) => (
                  <article key={report._id} className="rounded-xl border p-4" style={{ borderColor: "var(--hairline)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{report.title}</p>
                    <p className="mt-2 text-xs line-clamp-3" style={{ color: "var(--mute)" }}>{report.content}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="feature-card" style={{ padding: "28px" }}>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={16} style={{ color: "var(--accent-orange)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Generated Analysis</p>
          </div>
          <div className="rounded-xl border p-5 min-h-[680px] whitespace-pre-wrap text-sm leading-7" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)", color: "var(--body)" }}>
            {result || "Run an analysis to see structured output here. Good prompts usually ask for summary, evidence, risks, opportunities, comparisons, and next steps."}
          </div>
        </section>
      </div>
    </div>
  );
}
