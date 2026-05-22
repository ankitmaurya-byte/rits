"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Copy, LayoutTemplate, Rocket, Sparkles } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/store/workspace-store";
import { MvpRenderer, parseMvpPayload, type MvpPayload } from "@/components/research/mvp-renderer";

type Scope = "private" | "workspace";

function parseGeneratedPayload(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate) as MvpPayload;
}

export function MvpLabBuilderPage() {
  const { user } = useUser();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const [scope, setScope] = useState<Scope>(selectedWorkspaceId ? "workspace" : "private");
  const [prompt, setPrompt] = useState("");
  const [generatedPayload, setGeneratedPayload] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pages = useQuery(
    api.researchOutputs.listMvpPages,
    user
      ? {
          scope,
          workspaceId: scope === "workspace" ? selectedWorkspaceId ?? undefined : undefined,
        }
      : "skip"
  ) ?? [];
  const createMvpPage = useMutation(api.researchOutputs.createMvpPage);

  const preview = useMemo(() => (generatedPayload ? parseMvpPayload(generatedPayload) : null), [generatedPayload]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Add a landing page prompt first.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: [
            'Return valid JSON only.',
            'Use this exact shape: {"brand":"","heroTitle":"","heroSubtitle":"","primaryCta":"","secondaryCta":"","problem":"","audience":"","features":[{"title":"","body":""}],"testimonials":[{"name":"","role":"","quote":""}],"faqs":[{"question":"","answer":""}]}',
            'Generate concise but polished landing-page content with 3 features, 3 testimonials, and 4 FAQs.',
          ].join(" "),
          context: prompt,
          contextType: "idea",
        }),
      });
      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok || data.error || !data.result) {
        throw new Error(data.error ?? "Landing page generation failed.");
      }

      const payload = parseGeneratedPayload(data.result);
      setGeneratedPayload(JSON.stringify(payload));
      toast.success("Landing page generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Landing page generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedPayload || !preview) {
      toast.error("Generate a landing page first.");
      return;
    }

    if (scope === "workspace" && !selectedWorkspaceId) {
      toast.error("Select a workspace first.");
      return;
    }

    setSaving(true);
    try {
      const id = await createMvpPage({
        scope,
        workspaceId: scope === "workspace" ? selectedWorkspaceId ?? undefined : undefined,
        title: preview.heroTitle,
        prompt,
        payload: generatedPayload,
      });
      const saved = pages.find((item) => item._id === id);
      toast.success(saved ? "Landing page saved." : "Landing page saved. Refresh to see share link.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save landing page.");
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = async (token: string) => {
    const link = `${window.location.origin}/share/mvp/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Share link copied.");
    } catch {
      toast.error("Failed to copy share link.");
    }
  };

  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top, var(--accent-orange-glow) 0%, transparent 70%)", opacity: 0.16 }} />

      <div className="page-header border-b pb-8 mb-8 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl" style={{ color: "var(--ink)" }}>MVP Lab</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setScope("private")} className="btn-outline" style={{ backgroundColor: scope === "private" ? "var(--surface-elevated)" : undefined }}>Private</button>
            <button type="button" onClick={() => setScope("workspace")} className="btn-outline" style={{ backgroundColor: scope === "workspace" ? "var(--surface-elevated)" : undefined }}>Workspace</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[0.9fr_1.1fr] relative z-10">
        <div className="space-y-6">
          <section className="feature-card" style={{ padding: "28px" }}>
            <div className="mb-4 flex items-center gap-2">
              <Rocket size={16} style={{ color: "var(--accent-orange)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Builder Prompt</p>
            </div>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={10} className="input-field resize-y" placeholder="Describe the startup, product, audience, positioning, pricing angle, and CTA you want in the landing page..." />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => void handleGenerate()} disabled={loading} className="btn-primary">
                <Sparkles size={15} /> {loading ? "Generating..." : "Generate landing page"}
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={saving || !preview} className="btn-outline">
                <LayoutTemplate size={15} /> {saving ? "Saving..." : "Save and prepare share link"}
              </button>
            </div>
          </section>

          <section className="feature-card" style={{ padding: "28px" }}>
            <div className="mb-4 flex items-center gap-2">
              <Copy size={16} style={{ color: "var(--accent-blue)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Saved Landing Pages</p>
            </div>
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {pages.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--charcoal)" }}>No saved MVP pages yet in this scope.</p>
              ) : (
                pages.map((page) => (
                  <article key={page._id} className="rounded-xl border p-4" style={{ borderColor: "var(--hairline)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{page.title}</p>
                    <p className="mt-2 text-xs line-clamp-3" style={{ color: "var(--mute)" }}>{page.prompt}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void copyShareLink(page.shareToken)} className="btn-outline">Copy share link</button>
                      <a href={`/share/mvp/${page.shareToken}`} target="_blank" rel="noreferrer" className="btn-outline">Open shared page</a>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="feature-card overflow-hidden" style={{ padding: 0 }}>
          {preview ? <MvpRenderer payload={preview} /> : <div className="p-10 text-sm leading-7" style={{ color: "var(--charcoal)" }}>Generate a landing page to preview it here.</div>}
        </section>
      </div>
    </div>
  );
}
