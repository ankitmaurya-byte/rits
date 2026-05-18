"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQuery as useConvexUserQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  BadgeDollarSign,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Lightbulb,
  Link2,
  Sparkles,
  Tv,
  Users,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/lib/use-workspace";
import type { SharkTankPitch } from "@/lib/shark-tank-india";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EMPTY_SEASONS: Array<{ season: number; playlist_title?: string; playlist_link?: string; source_folder: string; pitches: SharkTankPitch[] }> = [];

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
    `Summary: ${pitch.pitch_summary_detected ?? "Not detected"}`,
    `Intro excerpt: ${pitch.intro_excerpt ?? "Not detected"}`,
    `Transcript:\n${pitch.transcript}`,
  ].join("\n");
}

function buildDisplayJson(pitch: SharkTankPitch) {
  const rest = Object.fromEntries(Object.entries(pitch).filter(([key]) => key !== "transcript"));
  return JSON.stringify(rest, null, 2);
}

function imageUrl(file: string) {
  if (file.startsWith("http://") || file.startsWith("https://")) {
    return file;
  }
  return `/api/sharktank/media?file=${encodeURIComponent(file)}`;
}

function buildNoteContent(pitch: SharkTankPitch, analysisResult: string) {
  return [
    `# ${pitch.company_name_detected ?? "Shark Tank Pitch"}`,
    "",
    `Season: ${pitch.season}`,
    `Episode: ${pitch.episode_number ?? "Unknown"}`,
    `Episode title: ${pitch.episode_title ?? "Unknown"}`,
    `Founders: ${formatFounders(pitch.founders_detected)}`,
    `Ask: ${formatAsk(pitch)}`,
    `YouTube: ${pitch.youtube_link}`,
    "",
    "## Summary",
    pitch.pitch_summary_detected ?? "Not detected",
    analysisResult ? `\n## AI Research\n${analysisResult}` : "",
  ].join("\n");
}

function PitchFrameSlideshow({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--charcoal)" }}>
        No product frames available.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
        <Image src={imageUrl(images[index]!)} alt="Pitch frame" width={1200} height={800} className="h-[260px] w-full object-cover" unoptimized />
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {images.map((_, itemIndex) => (
          <span key={itemIndex} className="h-2 w-2 rounded-full" style={{ backgroundColor: itemIndex === index ? "var(--accent-orange)" : "var(--hairline-strong)" }} />
        ))}
      </div>
    </div>
  );
}

export function SharkTankExplorerPage() {
  const { workspaceId, isLoading } = useWorkspace();
  const { user } = useUser();
  const seasons = useQuery(api.sharkTank.getExplorerSeasons, {}) ?? EMPTY_SEASONS;
  const convexUser = useConvexUserQuery(api.users.getUser, user ? { clerkId: user.id } : "skip");
  const createNote = useMutation(api.notes.createNote);
  const createIdea = useMutation(api.ideas.createIdea);

  const [selectedPitch, setSelectedPitch] = useState<SharkTankPitch | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState("Research this Shark Tank pitch: evaluate the business model, market, founder strengths, risks, growth potential, and startup opportunities.");
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [analysisPromptOpen, setAnalysisPromptOpen] = useState(false);

  const seasonFour = useMemo(() => seasons.find((season) => season.season === 4) ?? null, [seasons]);
  const seasonCards = [1, 2, 3, 4, 5].map((season) => ({
    season,
    live: season === 4,
    data: seasons.find((item) => item.season === season) ?? null,
  }));

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
        body: JSON.stringify({ prompt: analysisPrompt, context: buildPitchContext(selectedPitch), contextType: "note" }),
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
    if (!selectedPitch || !convexUser || !workspaceId) {
      toast.error("Select a workspace and wait for your account to load.");
      return;
    }
    setLoadingActionId("note");
    try {
      await createNote({ scope: "workspace", workspaceId, title: `${selectedPitch.company_name_detected ?? "Shark Tank Pitch"} research`, content: buildNoteContent(selectedPitch, analysisResult), createdBy: convexUser._id });
      toast.success("Added to notes.");
    } catch {
      toast.error("Failed to create note.");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleAddToIdeas = async () => {
    if (!selectedPitch || !convexUser || !workspaceId) {
      toast.error("Select a workspace and wait for your account to load.");
      return;
    }
    const description = [
      `Company: ${selectedPitch.company_name_detected ?? "Unknown"}`,
      `Season ${selectedPitch.season}, Episode ${selectedPitch.episode_number ?? "Unknown"}`,
      `Founders: ${formatFounders(selectedPitch.founders_detected)}`,
      `Ask: ${formatAsk(selectedPitch)}`,
      `YouTube: ${selectedPitch.youtube_link}`,
      "",
      selectedPitch.pitch_summary_detected ?? selectedPitch.intro_excerpt ?? "No summary detected.",
      analysisResult ? `\nAI Research:\n${analysisResult}` : "",
    ].join("\n");

    setLoadingActionId("idea");
    try {
      await createIdea({ scope: "workspace", workspaceId, title: `Idea from ${selectedPitch.company_name_detected ?? "Shark Tank pitch"}`, description, tags: ["shark-tank", `season-${selectedPitch.season}`], createdBy: convexUser._id });
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
          {[...Array(4)].map((_, index) => <div key={index} className="skeleton h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="absolute right-0 top-0 h-[360px] w-[560px] pointer-events-none" style={{ background: "radial-gradient(circle at top right, var(--accent-blue) 0%, transparent 70%)", opacity: 0.18 }} />

      <div className="relative z-10 space-y-6">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {seasonCards.map((card) => (
            <div key={card.season} className="feature-card p-5" style={{ backgroundColor: card.live ? "var(--surface-card)" : "var(--surface-deep)", opacity: card.live ? 1 : 0.82 }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Season {card.season}</p>
                <span className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em]" style={{ borderColor: "var(--hairline)", color: card.live ? "var(--accent-green)" : "var(--mute)" }}>
                  {card.live ? "Live" : "Coming soon"}
                </span>
              </div>
            </div>
          ))}
        </section>

        {seasonFour ? (
          <section className="feature-card overflow-hidden p-0">
            <div className="border-b px-6 py-5" style={{ borderColor: "var(--divider-soft)" }}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>Season 4</p>
                  <h3 className="text-2xl font-medium" style={{ color: "var(--ink)" }}>{seasonFour.playlist_title ?? seasonFour.source_folder}</h3>
                </div>
                <a href={seasonFour.playlist_link} target="_blank" rel="noreferrer" className="btn-outline"><ExternalLink size={15} /> Playlist</a>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-6 xl:grid-cols-2">
              {seasonFour.pitches.map((pitch) => (
                <button key={pitch.id} type="button" onClick={() => openPitch(pitch)} className="overflow-hidden rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                  <Image src={imageUrl(pitch.thumbnail)} alt={pitch.company_name_detected ?? pitch.episode_title ?? "Shark Tank pitch"} width={1200} height={700} className="h-44 w-full object-cover" unoptimized />
                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Episode {pitch.episode_number ?? "?"}</p>
                        <h4 className="mt-2 text-lg font-medium" style={{ color: "var(--ink)" }}>{pitch.company_name_detected || pitch.episode_title || "Pitch"}</h4>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2" style={{ color: "var(--charcoal)" }}><Users size={15} className="mt-0.5 shrink-0" /><span>{formatFounders(pitch.founders_detected)}</span></div>
                      <div className="flex items-start gap-2" style={{ color: "var(--charcoal)" }}><BadgeDollarSign size={15} className="mt-0.5 shrink-0" /><span>{formatAsk(pitch)}</span></div>
                      <div className="flex items-start gap-2" style={{ color: "var(--charcoal)" }}><Tv size={15} className="mt-0.5 shrink-0" /><span>{pitch.episode_title || "Episode title not detected"}</span></div>
                      <p className="line-clamp-4 leading-6" style={{ color: "var(--body)" }}>{pitch.pitch_summary_detected || pitch.intro_excerpt || "Summary not detected"}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <Dialog open={Boolean(selectedPitch)} onOpenChange={(open) => !open && setSelectedPitch(null)}>
        {selectedPitch ? (
          <DialogContent
            className="!top-[4vh] max-h-[92vh] !-translate-y-0 max-w-6xl overflow-y-auto p-0 sm:max-w-6xl"
            overlayClassName="bg-black/35 supports-backdrop-filter:backdrop-blur-[2px]"
            showCloseButton
          >
            <div className="border-b px-6 py-5" style={{ borderColor: "var(--hairline)" }}>
              <DialogHeader>
                <DialogTitle className="text-2xl" style={{ color: "var(--ink)" }}>{selectedPitch.company_name_detected || selectedPitch.episode_title || "Pitch"}</DialogTitle>
                <DialogDescription style={{ color: "var(--charcoal)" }}>Season {selectedPitch.season} • Episode {selectedPitch.episode_number ?? "?"}</DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Season 4 frames</p>
                  <PitchFrameSlideshow images={selectedPitch.product_images} />
                </section>

                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Pitch overview</p>
                  <div className="space-y-3 text-sm leading-7" style={{ color: "var(--body)" }}>
                    <p><strong>Founders:</strong> {formatFounders(selectedPitch.founders_detected)}</p>
                    <p><strong>Ask:</strong> {formatAsk(selectedPitch)}</p>
                    <p><strong>Episode title:</strong> {selectedPitch.episode_title || "Not detected"}</p>
                    <p><strong>YouTube:</strong> <a href={selectedPitch.youtube_link} target="_blank" rel="noreferrer" style={{ color: "var(--accent-blue)" }}>{selectedPitch.youtube_link}</a></p>
                  </div>
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
                  {analysisPromptOpen ? <textarea value={analysisPrompt} onChange={(event) => setAnalysisPrompt(event.target.value)} rows={4} className="input-field mt-3 min-h-[110px] resize-y" placeholder="Ask AI to research this pitch..." /> : null}
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button onClick={() => void handleAnalyzePitch()} disabled={analysisLoading || !analysisPrompt.trim()} className="btn-primary"><Sparkles size={15} /> {analysisLoading ? "Researching..." : "Research with AI"}</button>
                  </div>
                  <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                    {analysisResult ? <div className="whitespace-pre-wrap text-sm leading-7" style={{ color: "var(--body)" }}>{analysisResult}</div> : <p className="text-sm" style={{ color: "var(--charcoal)" }}>Run AI research to generate market, founder, moat, risk, and idea insights for this pitch.</p>}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Links</p>
                  <div className="space-y-2">
                    {[selectedPitch.youtube_link, ...selectedPitch.website_links].map((link) => (
                      <a key={link} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--hairline)", color: "var(--accent-blue)" }}>
                        <Link2 size={14} /> {link}
                      </a>
                    ))}
                  </div>
                </section>

                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Pitch data JSON</p>
                  <pre className="max-h-[420px] overflow-auto rounded-xl border p-4 text-xs leading-6" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--body)" }}>
                    {buildDisplayJson(selectedPitch)}
                  </pre>
                </section>

                <section className="feature-card p-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Quick actions</p>
                  <div className="grid gap-3">
                    <button onClick={() => void handleAddToNotes()} disabled={loadingActionId === "note"} className="btn-outline justify-start"><FileText size={15} /> {loadingActionId === "note" ? "Saving..." : "Add in notes"}</button>
                    <button onClick={() => void handleAddToIdeas()} disabled={loadingActionId === "idea"} className="btn-outline justify-start"><Lightbulb size={15} /> {loadingActionId === "idea" ? "Saving..." : "Add in ideas"}</button>
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
