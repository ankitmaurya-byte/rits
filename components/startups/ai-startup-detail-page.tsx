"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUp, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  STARTUP_COMMENTS_KEY,
  STARTUP_STORAGE_KEY,
  STARTUP_VOTES_KEY,
  baseComments,
  readJsonStorage,
  sampleStartups,
  type StartupComment,
  type StartupItem,
  writeJsonStorage,
} from "@/lib/ai-startup-hunt";

type Review = { id: string; author: string; text: string; rating: number };

const sampleReviews: Review[] = [
  { id: "r1", author: "Maya Chen", text: "Strong launch polish and clear positioning.", rating: 5 },
  { id: "r2", author: "Nina Park", text: "Good wedge. Would love more screenshots and proof points.", rating: 4 },
];

export function AiStartupDetailPage({ slug }: { slug: string }) {
  const [startups, setStartups] = useState<StartupItem[]>(() => readJsonStorage<StartupItem[]>(STARTUP_STORAGE_KEY, sampleStartups));
  const [comments, setComments] = useState<StartupComment[]>(() => readJsonStorage<StartupComment[]>(STARTUP_COMMENTS_KEY, baseComments));
  const [upvotedIds, setUpvotedIds] = useState<string[]>(() => readJsonStorage<string[]>(STARTUP_VOTES_KEY, []));
  const [commentInput, setCommentInput] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "comments" | "reviews" | "similar">("overview");

  useEffect(() => {
    writeJsonStorage(STARTUP_COMMENTS_KEY, comments);
  }, [comments]);

  useEffect(() => {
    writeJsonStorage(STARTUP_VOTES_KEY, upvotedIds);
  }, [upvotedIds]);

  const startup = startups.find((item) => item.slug === slug) ?? null;
  const startupComments = useMemo(() => comments.filter((item) => item.startupId === startup?.id), [comments, startup?.id]);
  const rootComments = startupComments.filter((item) => !item.parentId);
  const similar = useMemo(() => startups.filter((item) => item.slug !== slug && item.categories.some((category) => startup?.categories.includes(category))).slice(0, 4), [slug, startup?.categories, startups]);

  if (!startup) {
    return (
      <div className="page-container animate-fade-in-up">
        <div className="rounded-2xl border px-5 py-10 text-center" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--charcoal)" }}>
          Startup not found.
        </div>
      </div>
    );
  }

  const ranking = [...startups].sort((a, b) => b.votes - a.votes).findIndex((item) => item.id === startup.id) + 1;

  const handleUpvote = () => {
    const already = upvotedIds.includes(startup.id);
    const next = startups.map((item) => item.id === startup.id ? { ...item, votes: item.votes + (already ? -1 : 1) } : item);
    setStartups(next);
    setUpvotedIds((current) => already ? current.filter((id) => id !== startup.id) : [...current, startup.id]);
  };

  const handleComment = () => {
    const text = commentInput.trim();
    if (!text) return;
    const nextComment: StartupComment = {
      id: `comment-${Date.now()}`,
      startupId: startup.id,
      parentId: replyTargetId ?? undefined,
      authorName: "You",
      text,
      votes: 1,
      createdAt: new Date().toISOString(),
    };
    setComments((current) => [nextComment, ...current]);
    setCommentInput("");
    setReplyTargetId(null);
    toast.success("Comment added.");
  };

  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="rounded-[24px] border p-5" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border text-lg font-semibold" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--ink)" }}>{startup.logo}</div>
                <div>
                  <h1 className="text-3xl font-medium" style={{ color: "var(--ink)" }}>{startup.name}</h1>
                  <p className="mt-2 text-base" style={{ color: "var(--charcoal)" }}>{startup.tagline}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {startup.categories.map((category) => <span key={category} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}>{category}</span>)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={startup.websiteUrl} target="_blank" rel="noreferrer" className="btn-outline"><ExternalLink size={15} /> Website</a>
                <button type="button" onClick={handleUpvote} className="btn-primary"><ArrowUp size={15} /> {startup.votes}</button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
              {([
                { key: "overview", label: "Overview" },
                { key: "comments", label: "Comments" },
                { key: "reviews", label: "Reviews" },
                { key: "similar", label: "Similar Startups" },
              ] as const).map((item) => (
                <button key={item.key} type="button" onClick={() => setActiveTab(item.key)} className="rounded-full border px-3 py-1.5 text-sm font-medium" style={{ borderColor: activeTab === item.key ? "var(--hairline-strong)" : "var(--hairline)", backgroundColor: activeTab === item.key ? "var(--surface-elevated)" : "var(--surface-card)", color: activeTab === item.key ? "var(--ink)" : "var(--mute)" }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "overview" ? (
            <div className="rounded-[24px] border p-5" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
              <h2 className="text-xl font-medium" style={{ color: "var(--ink)" }}>Overview</h2>
              <p className="mt-4 text-sm leading-7" style={{ color: "var(--body)" }}>{startup.description}</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {startup.media.map((media) => (
                  <div key={media} className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{media}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Founder / product intro</p>
                <p className="mt-2 text-sm leading-7" style={{ color: "var(--charcoal)" }}>{startup.founderName} is building {startup.name} for teams that need faster execution, sharper context, and AI workflows that feel usable in real operations.</p>
              </div>
            </div>
          ) : null}

          {activeTab === "comments" ? (
            <div id="comments" className="rounded-[24px] border p-5" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
              <h2 className="text-xl font-medium" style={{ color: "var(--ink)" }}>Comments</h2>
              <textarea value={commentInput} onChange={(event) => setCommentInput(event.target.value)} rows={4} className="input-field mt-4 resize-none" placeholder="What do you think?" />
              <div className="mt-3 flex justify-between">
                <p className="text-sm" style={{ color: "var(--mute)" }}>{replyTargetId ? "Replying to a comment" : "Add your take"}</p>
                <button type="button" onClick={handleComment} className="btn-primary">Post comment</button>
              </div>
              <div className="mt-6 space-y-4">
                {rootComments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                    <div className="flex items-start gap-3">
                      <Avatar className="size-9"><AvatarFallback>{comment.authorName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium" style={{ color: "var(--ink)" }}>{comment.authorName}</span>
                          <span style={{ color: "var(--mute)" }}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-2 text-sm leading-7" style={{ color: "var(--body)" }}>{comment.text}</p>
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => setComments((current) => current.map((item) => item.id === comment.id ? { ...item, votes: item.votes + 1 } : item))} className="btn-outline"><ArrowUp size={14} /> {comment.votes}</button>
                          <button type="button" onClick={() => setReplyTargetId(comment.id)} className="btn-outline">Reply</button>
                        </div>
                        <div className="mt-4 space-y-3">
                          {startupComments.filter((item) => item.parentId === comment.id).map((reply) => (
                            <div key={reply.id} className="rounded-xl border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium" style={{ color: "var(--ink)" }}>{reply.authorName}</span>
                                <span style={{ color: "var(--mute)" }}>{new Date(reply.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="mt-2 text-sm leading-6" style={{ color: "var(--body)" }}>{reply.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "reviews" ? (
            <div className="rounded-[24px] border p-5" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
              <h2 className="text-xl font-medium" style={{ color: "var(--ink)" }}>Reviews</h2>
              <div className="mt-4 space-y-4">
                {sampleReviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium" style={{ color: "var(--ink)" }}>{review.author}</p>
                      <div className="flex gap-1">{Array.from({ length: review.rating }).map((_, index) => <Star key={index} size={14} style={{ color: "var(--accent-orange)" }} fill="currentColor" />)}</div>
                    </div>
                    <p className="mt-2 text-sm leading-7" style={{ color: "var(--body)" }}>{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "similar" ? (
            <div className="rounded-[24px] border p-5" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
              <h2 className="text-xl font-medium" style={{ color: "var(--ink)" }}>Similar Startups</h2>
              <div className="mt-4 space-y-3">
                {similar.map((item) => (
                  <Link key={item.id} href={`/startups/${item.slug}`} className="flex items-center gap-3 rounded-2xl border p-4 transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border text-sm font-semibold" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--ink)" }}>{item.logo}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{item.name}</p>
                      <p className="truncate text-xs" style={{ color: "var(--mute)" }}>{item.tagline}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--mute)" }}>Launching Today</p>
            <p className="mt-2 text-3xl font-medium" style={{ color: "var(--ink)" }}>#{ranking || 1}</p>
            <button type="button" onClick={handleUpvote} className="btn-primary mt-4 w-full"><ArrowUp size={15} /> {startup.votes} upvotes</button>
          </div>

          <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
            <p className="text-base font-medium" style={{ color: "var(--ink)" }}>Startup info</p>
            <div className="mt-4 space-y-3 text-sm">
              <div><span style={{ color: "var(--mute)" }}>Website:</span> <a href={startup.websiteUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-blue)" }}>{startup.websiteUrl}</a></div>
              <div><span style={{ color: "var(--mute)" }}>Founder:</span> <span style={{ color: "var(--ink)" }}> {startup.founderName}</span></div>
              <div><span style={{ color: "var(--mute)" }}>Launch date:</span> <span style={{ color: "var(--ink)" }}> {new Date(startup.launchDate).toLocaleDateString()}</span></div>
              <div><span style={{ color: "var(--mute)" }}>Pricing:</span> <span style={{ color: "var(--ink)" }}> {startup.pricing}</span></div>
              <div><span style={{ color: "var(--mute)" }}>Platform:</span> <span style={{ color: "var(--ink)" }}> Web</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
