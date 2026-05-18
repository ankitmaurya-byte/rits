"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQuery as useConvexUserQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  BadgeDollarSign,
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  Lightbulb,
  Link2,
  Search,
  Sparkles,
  Tv,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/lib/use-workspace";
import type { SharkTankPitch } from "@/lib/shark-tank-india";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EMPTY_SEASONS: Array<{ season: number; playlist_title?: string; playlist_link?: string; source_folder: string; pitches: SharkTankPitch[]; comingSoon?: boolean }> = [];

type ExpandableSectionProps = {
  title: string;
  eyebrow?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

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

function getBusinessModel(pitch: SharkTankPitch) {
  if (typeof pitch.company_details?.businessModel === "string" && pitch.company_details.businessModel.trim()) {
    return pitch.company_details.businessModel;
  }
  return "Business model not detected";
}

function getSharkTankDealStatus(pitch: SharkTankPitch) {
  if (typeof pitch.company_details?.sharkTankDealStatus === "string" && pitch.company_details.sharkTankDealStatus.trim()) {
    return pitch.company_details.sharkTankDealStatus;
  }
  return "Deal status not detected";
}

function buildPitchContext(pitch: SharkTankPitch) {
  return [
    `Season: ${pitch.season}`,
    `Episode: ${pitch.episode_number ?? "Unknown"}`,
    `Episode title: ${pitch.episode_title ?? "Unknown"}`,
    `Company: ${pitch.company_name_detected ?? "Unknown"}`,
    `Business Model: ${getBusinessModel(pitch)}`,
    `Shark Tank Deal Status: ${getSharkTankDealStatus(pitch)}`,
  ].join("\n");
}

function buildDisplayJson(pitch: SharkTankPitch) {
  const rest = Object.fromEntries(Object.entries(pitch).filter(([key]) => key !== "transcript"));
  return JSON.stringify(rest, null, 2);
}

function getYouTubeEmbedUrl(link: string) {
  try {
    const url = new URL(link);
    const id = url.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;
    if (url.hostname.includes("youtu.be")) {
      const shortId = url.pathname.replace(/^\//, "");
      return shortId ? `https://www.youtube.com/embed/${shortId}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function formatDetailLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}

function ExpandableSection({ title, eyebrow, defaultOpen = false, children }: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="feature-card p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          {eyebrow ? <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>{eyebrow}</p> : null}
          <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{title}</p>
        </div>
        <span className="rounded-full border p-2" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </section>
  );
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
        <Image src={imageUrl(images[index]!)} alt="Pitch frame" width={1200} height={800} className="h-[300px] w-full object-contain" unoptimized />
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
  const [searchValue, setSearchValue] = useState("");
  const [selectedSeason, setSelectedSeason] = useState(4);

  const activeSeason = useMemo(() => seasons.find((season) => season.season === selectedSeason) ?? null, [selectedSeason, seasons]);
  const filteredPitches = useMemo(() => {
    if (!activeSeason) return [];
    const query = searchValue.trim().toLowerCase();
    if (!query) return activeSeason.pitches;

    return activeSeason.pitches.filter((pitch) => {
      const haystack = [
        pitch.company_name_detected,
        pitch.episode_title,
        pitch.pitch_summary_detected,
        pitch.intro_excerpt,
        ...(pitch.founders_detected ?? []),
        ...pitch.website_links,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeSeason, searchValue]);

  const openPitch = (pitch: SharkTankPitch) => {
    setSelectedPitch(pitch);
    setAnalysisResult("");
    setAnalysisPromptOpen(false);
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
    <div className="page-container animate-fade-in-up relative px-0 py-2 sm:px-0 sm:py-3 lg:px-0">
      <div className="absolute right-0 top-0 h-[260px] w-[420px] pointer-events-none" style={{ background: "radial-gradient(circle at top right, var(--accent-blue) 0%, transparent 70%)", opacity: 0.14 }} />

      <div className="relative z-10 space-y-1">
        <section className="pb-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>Explore</p>
              <h2 className="mt-1 text-xl font-medium" style={{ color: "var(--ink)" }}>Shark Tank India</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:min-w-[560px] lg:max-w-[760px] lg:flex-1 lg:justify-end">
              <div className="relative sm:flex-1 lg:min-w-[420px]">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search Shark Tank pitches"
                  className="input-field h-11 w-full pl-11"
                />
              </div>
              <select
                value={selectedSeason}
                onChange={(event) => setSelectedSeason(Number(event.target.value))}
                className="input-field h-11 w-full sm:w-28"
              >
                {[1, 2, 3, 4, 5].map((season) => (
                  <option key={season} value={season}>Season {season}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {activeSeason ? (
          <section className="overflow-hidden p-0">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 p-0 xl:grid-cols-3">
              {filteredPitches.map((pitch) => (
                <button key={pitch.id} type="button" onClick={() => openPitch(pitch)} className="overflow-hidden rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                  <Image src={imageUrl(pitch.thumbnail)} alt={pitch.company_name_detected ?? pitch.episode_title ?? "Shark Tank pitch"} width={1200} height={700} className="h-44 w-full object-cover" unoptimized />
                  <div className="p-3">
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Episode {pitch.episode_number ?? "?"}</p>
                        <h4 className="mt-2 text-lg font-medium" style={{ color: "var(--ink)" }}>{pitch.company_name_detected || pitch.episode_title || "Pitch"}</h4>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2" style={{ color: "var(--charcoal)" }}><Building2 size={15} className="mt-0.5 shrink-0" /><span className="line-clamp-3">{getBusinessModel(pitch)}</span></div>
                      <div className="flex items-start gap-2" style={{ color: "var(--charcoal)" }}><BadgeDollarSign size={15} className="mt-0.5 shrink-0" /><span className="line-clamp-3">{getSharkTankDealStatus(pitch)}</span></div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredPitches.length === 0 ? (
                <div className="col-span-full rounded-2xl border px-6 py-12 text-center" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--charcoal)" }}>
                  {activeSeason.pitches.length === 0 ? "No Shark Tank data available." : "No Shark Tank pitches match your search."}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      <Dialog open={Boolean(selectedPitch)} onOpenChange={(open) => !open && setSelectedPitch(null)}>
        {selectedPitch ? (
          <DialogContent
            className="!top-[3vh] max-h-[94vh] !-translate-y-0 max-w-7xl overflow-y-auto p-0 sm:max-w-7xl"
            overlayClassName="bg-black/35 supports-backdrop-filter:backdrop-blur-[2px]"
            showCloseButton
          >
            <div className="sticky top-0 z-20 border-b px-6 py-5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
              <DialogHeader>
                <div className="flex flex-col gap-3 pr-12 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <DialogTitle className="text-2xl" style={{ color: "var(--ink)" }}>{selectedPitch.company_name_detected || selectedPitch.episode_title || "Pitch"}</DialogTitle>
                    <DialogDescription className="mt-2" style={{ color: "var(--charcoal)" }}>Season {selectedPitch.season} • Episode {selectedPitch.episode_number ?? "?"}</DialogDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }}>
                      {formatFounders(selectedPitch.founders_detected)}
                    </span>
                    <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--hairline)", color: "var(--accent-orange)" }}>
                      {formatAsk(selectedPitch)}
                    </span>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="grid items-start gap-6 p-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="min-w-0 space-y-6">
                <section className="feature-card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Tv size={16} style={{ color: "var(--accent-blue)" }} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Pitch video</p>
                  </div>
                  {getYouTubeEmbedUrl(selectedPitch.youtube_link) ? (
                    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                      <iframe
                        src={getYouTubeEmbedUrl(selectedPitch.youtube_link)!}
                        title={selectedPitch.company_name_detected ?? "Shark Tank video"}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--charcoal)" }}>
                      Embedded video is unavailable for this pitch.
                    </div>
                  )}
                </section>

                <section className="feature-card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Building2 size={16} style={{ color: "var(--accent-orange)" }} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Pitch overview</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Founders</p>
                      <p className="mt-2 text-sm leading-6" style={{ color: "var(--ink)" }}>{formatFounders(selectedPitch.founders_detected)}</p>
                    </div>
                    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Ask</p>
                      <p className="mt-2 text-sm leading-6" style={{ color: "var(--ink)" }}>{formatAsk(selectedPitch)}</p>
                    </div>
                    <div className="rounded-2xl border p-4 sm:col-span-2" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Summary</p>
                      <p className="mt-2 text-sm leading-7" style={{ color: "var(--body)" }}>
                        {selectedPitch.pitch_summary_detected || selectedPitch.intro_excerpt || "Summary not detected."}
                      </p>
                    </div>
                  </div>
                </section>

                <ExpandableSection title="Product images" eyebrow="Media" defaultOpen>
                  <PitchFrameSlideshow images={selectedPitch.product_images} />
                </ExpandableSection>

                <section className="feature-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={16} style={{ color: "var(--accent-blue)" }} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>AI research</p>
                  </div>
                  <button type="button" onClick={() => setAnalysisPromptOpen((value) => !value)} className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-elevated)", color: "var(--ink)" }}>
                    <div>
                      <p className="text-sm font-medium">AI prompt</p>
                      <p className="mt-1 text-xs" style={{ color: "var(--charcoal)" }}>Expand to edit the research prompt before running AI.</p>
                    </div>
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

              <div className="min-w-0 space-y-6">
                <ExpandableSection title="Links" eyebrow="Resources">
                  <div className="space-y-2">
                    {[selectedPitch.youtube_link, ...selectedPitch.website_links].filter(Boolean).map((link) => (
                      <a key={link} href={link} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6" style={{ borderColor: "var(--hairline)", color: "var(--accent-blue)" }}>
                        <Link2 size={14} className="mt-1 shrink-0" />
                        <span className="break-all">{link}</span>
                      </a>
                    ))}
                  </div>
                </ExpandableSection>

                <ExpandableSection title="Company details" eyebrow="Business details" defaultOpen>
                  {selectedPitch.company_details && Object.keys(selectedPitch.company_details).length > 0 ? (
                    <div className="grid gap-3">
                      {Object.entries(selectedPitch.company_details).map(([key, value]) => (
                        <div key={key} className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>{formatDetailLabel(key)}</p>
                          <div className="mt-2 text-sm leading-7" style={{ color: "var(--body)" }}>
                            {Array.isArray(value) ? value.join(", ") : String(value ?? "Not available")}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--charcoal)" }}>No additional company details available.</p>
                  )}
                </ExpandableSection>

                <ExpandableSection title="Transcript" eyebrow="Raw source">
                  <div className="max-h-[360px] overflow-auto rounded-xl border p-4 text-sm leading-7" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--body)" }}>
                    {selectedPitch.transcript || "Transcript not available."}
                  </div>
                </ExpandableSection>

                <ExpandableSection title="Pitch data JSON" eyebrow="Debug data">
                  <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-all rounded-xl border p-4 text-xs leading-6" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--body)" }}>
                    {buildDisplayJson(selectedPitch)}
                  </pre>
                </ExpandableSection>

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
