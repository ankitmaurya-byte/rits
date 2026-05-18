"use client";

import { useState } from "react";
import { useMutation, useQuery as useConvexUserQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  BadgeDollarSign,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderOpen,
  Lightbulb,
  Sparkles,
  Tv,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/lib/use-workspace";
import type { SharkTankPitch, SharkTankSeason } from "@/lib/shark-tank-india";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatAsk(pitch: SharkTankPitch) {
  if (pitch.ask_text) return pitch.ask_text;

  if (pitch.ask_amount_value && pitch.ask_amount_unit) {
    const equity = pitch.ask_equity_percent ? ` for ${pitch.ask_equity_percent}% equity` : "";
    return `${pitch.ask_amount_value} ${pitch.ask_amount_unit}${equity}`;
  }

  return "Ask not detected";
}

function formatFounders(founders: string[] | null) {
  if (!founders?.length) return "Founder details not detected";
  return founders.join(", ");
}

function buildPitchContext(pitch: SharkTankPitch) {
  return [
    `Season: ${pitch.season}`,
    `Episode: ${pitch.episode_number ?? "Unknown"}`,
    `Episode title: ${pitch.episode_title ?? "Unknown"}`,
    `Company: ${pitch.company_name_detected ?? "Unknown"}`,
    `Founders: ${formatFounders(pitch.founders_detected)}`,
    `Ask: ${formatAsk(pitch)}`,
    `Air date: ${pitch.air_date ?? "Unknown"}`,
    `Summary: ${pitch.pitch_summary_detected ?? "Not detected"}`,
    `Intro excerpt: ${pitch.intro_excerpt ?? "Not detected"}`,
  ].join("\n");
}

function buildNoteContent(pitch: SharkTankPitch, analysisResult: string) {
  return [
    `# ${pitch.company_name_detected ?? "Shark Tank Pitch"}`,
    "",
    `Season: ${pitch.season}`,
    `Episode: ${pitch.episode_number ?? "Unknown"}`,
    `Episode title: ${pitch.episode_title ?? "Unknown"}`,
    `Air date: ${pitch.air_date ?? "Unknown"}`,
    `Founders: ${formatFounders(pitch.founders_detected)}`,
    `Ask: ${formatAsk(pitch)}`,
    "",
    "## Pitch Summary",
    pitch.pitch_summary_detected ?? "Not detected",
    "",
    "## Intro Excerpt",
    pitch.intro_excerpt ?? "Not detected",
    analysisResult ? `\n## AI Research\n${analysisResult}` : "",
  ].join("\n");
}

export function SharkTankExplorerPage({ seasons }: { seasons: SharkTankSeason[] }) {
  const { workspaceId, isLoading } = useWorkspace();
  const { user } = useUser();
  const convexUser = useConvexUserQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const createNote = useMutation(api.notes.createNote);
  const createIdea = useMutation(api.ideas.createIdea);

  const [selectedPitch, setSelectedPitch] = useState<SharkTankPitch | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState(
    "Research this Shark Tank pitch: evaluate the business model, market, founder strengths, risks, growth potential, and possible startup ideas inspired by it."
  );
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [analysisPromptOpen, setAnalysisPromptOpen] = useState(false);

  const totalPitches = seasons.reduce((sum, season) => sum + season.detected_pitch_count, 0);
  const totalEpisodes = seasons.reduce((sum, season) => sum + season.episode_file_count, 0);

  const openPitch = (pitch: SharkTankPitch) => {
    setSelectedPitch(pitch);
    setAnalysisResult("");
  };

  const handleAnalyzePitch = async () => {
    if (!selectedPitch || !analysisPrompt.trim()) return;

    setAnalysisLoading(true);
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: analysisPrompt,
          context: buildPitchContext(selectedPitch),
          contextType: "note",
        }),
      });

      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok || data.error || !data.result) {
        throw new Error(data.error ?? "AI research failed.");
      }

      setAnalysisResult(data.result);
      toast.success("AI research ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI research failed.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleAddToNotes = async () => {
    if (!selectedPitch) return;
    if (!convexUser) {
      toast.error("Your account is still loading.");
      return;
    }
    if (!workspaceId) {
      toast.error("Select a workspace first.");
      return;
    }

    setLoadingActionId("note");
    try {
      await createNote({
        scope: "workspace",
        workspaceId,
        title: `${selectedPitch.company_name_detected ?? "Shark Tank Pitch"} research`,
        content: buildNoteContent(selectedPitch, analysisResult),
        createdBy: convexUser._id,
      });
      toast.success("Added to notes.");
    } catch {
      toast.error("Failed to create note.");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleAddToIdeas = async () => {
    if (!selectedPitch) return;
    if (!convexUser) {
      toast.error("Your account is still loading.");
      return;
    }
    if (!workspaceId) {
      toast.error("Select a workspace first.");
      return;
    }

    const description = [
      `Company: ${selectedPitch.company_name_detected ?? "Unknown"}`,
      `Season ${selectedPitch.season}, Episode ${selectedPitch.episode_number ?? "Unknown"}`,
      `Founders: ${formatFounders(selectedPitch.founders_detected)}`,
      `Ask: ${formatAsk(selectedPitch)}`,
      "",
      selectedPitch.pitch_summary_detected ?? selectedPitch.intro_excerpt ?? "No summary detected.",
      analysisResult ? `\nAI Research:\n${analysisResult}` : "",
    ].join("\n");

    setLoadingActionId("idea");
    try {
      await createIdea({
        scope: "workspace",
        workspaceId,
        title: `Idea from ${selectedPitch.company_name_detected ?? "Shark Tank pitch"}`,
        description,
        tags: ["shark-tank", `season-${selectedPitch.season}`],
        createdBy: convexUser._id,
      });
      toast.success("Added to ideas.");
    } catch {
      toast.error("Failed to create idea.");
    } finally {
      setLoadingActionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="skeleton mb-8 h-10 w-48" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="skeleton h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in-up relative">
      <div
        className="absolute right-0 top-0 h-[360px] w-[560px] pointer-events-none"
        style={{
          background: "radial-gradient(circle at top right, var(--accent-blue) 0%, transparent 70%)",
          opacity: 0.18,
        }}
      />

      <div className="page-header border-b pb-12 mb-12 relative z-10" style={{ borderColor: "var(--hairline-strong)" }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--mute)" }}>
          Explore / Shark Tank
        </p>
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-medium tracking-tight mb-4" style={{ color: "var(--ink)" }}>
              Shark Tank India pitch explorer
            </h2>
            <p className="text-base leading-7" style={{ color: "var(--body)" }}>
              Open any pitch to research it with AI, then save the result into workspace notes or idea capture.
            </p>
          </div>
          <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="feature-card p-4">
              <div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-blue)" }}>
                <FolderOpen size={16} />
              </div>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Seasons</p>
              <p className="mt-2 text-2xl font-medium" style={{ color: "var(--ink)" }}>{seasons.length}</p>
            </div>
            <div className="feature-card p-4">
              <div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-blue)" }}>
                <CalendarDays size={16} />
              </div>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Episodes</p>
              <p className="mt-2 text-2xl font-medium" style={{ color: "var(--ink)" }}>{totalEpisodes}</p>
            </div>
            <div className="feature-card p-4">
              <div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-blue)" }}>
                <BadgeDollarSign size={16} />
              </div>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Detected Pitches</p>
              <p className="mt-2 text-2xl font-medium" style={{ color: "var(--ink)" }}>{totalPitches}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-8">
        {seasons.map((season) => (
          <section key={season.season} className="feature-card overflow-hidden p-0">
            <div className="border-b px-7 py-6" style={{ borderColor: "var(--divider-soft)" }}>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>
                    Season {season.season}
                  </p>
                  <h3 className="text-2xl font-medium" style={{ color: "var(--ink)" }}>
                    {season.source_folder}
                  </h3>
                  <p className="mt-3 text-sm leading-6" style={{ color: "var(--charcoal)" }}>
                    {season.extraction_note}
                  </p>
                </div>
                <div className="grid min-w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[420px] lg:max-w-[460px]">
                  <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Episodes</p>
                    <p className="mt-2 text-xl font-medium" style={{ color: "var(--ink)" }}>{season.episode_file_count}</p>
                  </div>
                  <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Pitches</p>
                    <p className="mt-2 text-xl font-medium" style={{ color: "var(--ink)" }}>{season.detected_pitch_count}</p>
                  </div>
                  <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Generated</p>
                    <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
                      {new Date(season.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-7 py-6 xl:grid-cols-2">
              {season.pitches.map((pitch, index) => (
                <button
                  key={`${season.season}-${pitch.episode_number}-${pitch.pitch_index_in_episode}-${index}`}
                  type="button"
                  onClick={() => openPitch(pitch)}
                  className="cursor-pointer rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)]"
                  style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface)" }}
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>
                        Episode {pitch.episode_number ?? "?"} / Pitch {pitch.pitch_index_in_episode ?? index + 1}
                      </p>
                      <h4 className="mt-2 text-lg font-medium" style={{ color: "var(--ink)" }}>
                        {pitch.company_name_detected || "Company not detected"}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2" style={{ color: "var(--charcoal)" }}>
                      <Users size={15} className="mt-0.5 shrink-0" />
                      <span>{formatFounders(pitch.founders_detected)}</span>
                    </div>
                    <div className="flex items-start gap-2" style={{ color: "var(--charcoal)" }}>
                      <BadgeDollarSign size={15} className="mt-0.5 shrink-0" />
                      <span>{formatAsk(pitch)}</span>
                    </div>
                    <div className="flex items-start gap-2" style={{ color: "var(--charcoal)" }}>
                      <Tv size={15} className="mt-0.5 shrink-0" />
                      <span>{pitch.episode_title || "Episode title not detected"}</span>
                    </div>
                    <p className="line-clamp-4 leading-6" style={{ color: "var(--body)" }}>
                      {pitch.pitch_summary_detected || pitch.intro_excerpt || "Summary not detected"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={Boolean(selectedPitch)} onOpenChange={(open) => !open && setSelectedPitch(null)}>
        {selectedPitch ? (
          <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto p-0 sm:max-w-6xl" showCloseButton>
            <div className="border-b px-6 py-5" style={{ borderColor: "var(--hairline)" }}>
              <DialogHeader>
                <DialogTitle className="text-2xl" style={{ color: "var(--ink)" }}>
                  {selectedPitch.company_name_detected || "Company not detected"}
                </DialogTitle>
                <DialogDescription style={{ color: "var(--charcoal)" }}>
                  Season {selectedPitch.season} • Episode {selectedPitch.episode_number ?? "?"} • {selectedPitch.episode_title || "Episode title not detected"}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Pitch overview</p>
                  <div className="space-y-3 text-sm leading-7" style={{ color: "var(--body)" }}>
                    <p><strong>Founders:</strong> {formatFounders(selectedPitch.founders_detected)}</p>
                    <p><strong>Ask:</strong> {formatAsk(selectedPitch)}</p>
                    <p><strong>Air date:</strong> {selectedPitch.air_date || "Not detected"}</p>
                    <p><strong>Source file:</strong> {selectedPitch.source_file}</p>
                  </div>
                </section>

                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Transcript summary</p>
                  <p className="text-sm leading-7" style={{ color: "var(--body)" }}>
                    {selectedPitch.pitch_summary_detected || selectedPitch.intro_excerpt || "Summary not detected"}
                  </p>
                </section>

                <section className="feature-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={16} style={{ color: "var(--accent-blue)" }} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>AI research</p>
                  </div>
                  <button type="button" onClick={() => setAnalysisPromptOpen((value) => !value)} className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)", color: "var(--ink)" }}>
                    <span className="text-sm font-medium">AI prompt</span>
                    {analysisPromptOpen ? <ChevronUp size={14} style={{ color: "var(--mute)" }} /> : <ChevronDown size={14} style={{ color: "var(--mute)" }} />}
                  </button>
                  {analysisPromptOpen ? (
                    <textarea
                      value={analysisPrompt}
                      onChange={(event) => setAnalysisPrompt(event.target.value)}
                      rows={4}
                      className="input-field mt-3 min-h-[110px] resize-y"
                      placeholder="Ask AI to research this pitch..."
                    />
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button onClick={() => void handleAnalyzePitch()} disabled={analysisLoading || !analysisPrompt.trim()} className="btn-primary">
                      <Sparkles size={15} /> {analysisLoading ? "Researching..." : "Research with AI"}
                    </button>
                  </div>
                  <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                    {analysisResult ? (
                      <div className="whitespace-pre-wrap text-sm leading-7" style={{ color: "var(--body)" }}>
                        {analysisResult}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: "var(--charcoal)" }}>
                        Run AI research to generate market, founder, moat, risk, and idea insights for this pitch.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Quick actions</p>
                  <div className="grid gap-3">
                    <button onClick={() => void handleAddToNotes()} disabled={loadingActionId === "note"} className="btn-outline justify-start">
                      <FileText size={15} /> {loadingActionId === "note" ? "Saving..." : "Add in notes"}
                    </button>
                    <button onClick={() => void handleAddToIdeas()} disabled={loadingActionId === "idea"} className="btn-outline justify-start">
                      <Lightbulb size={15} /> {loadingActionId === "idea" ? "Saving..." : "Add in ideas"}
                    </button>
                  </div>
                </section>

                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Detected founders</p>
                  <div className="space-y-2">
                    {(selectedPitch.founders_detected?.length ? selectedPitch.founders_detected : ["Founder details not detected"]).map((founder) => (
                      <div key={founder} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}>
                        {founder}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Pitch metadata</p>
                  <div className="space-y-3 text-sm" style={{ color: "var(--charcoal)" }}>
                    <p>Pitch index: {selectedPitch.pitch_index_in_episode ?? "Not detected"}</p>
                    <p>Ask amount INR: {selectedPitch.ask_amount_in_inr?.toLocaleString("en-IN") ?? "Not detected"}</p>
                    <p>Ask equity: {selectedPitch.ask_equity_percent ?? "Not detected"}</p>
                  </div>
                </section>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
