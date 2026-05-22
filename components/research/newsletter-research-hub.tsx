"use client";

import { useMemo, useState } from "react";
import {
  AtSign,
  BookmarkPlus,
  ExternalLink,
  Mail,
  MessageSquareText,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

type NewsletterIssue = {
  id: string;
  title: string;
  date: string;
  sender: string;
  sourceLink: string;
  credits: string;
  summary: string;
  content: string[];
  saved: boolean;
  comments: Array<{
    id: string;
    author: string;
    role: string;
    body: string;
    upvotes: number;
    postedAt: string;
  }>;
};

type NewsletterSubscription = {
  id: string;
  name: string;
  author: string;
  category: string;
  subscribeLink: string;
  sourceSite: string;
  status: "active" | "syncing";
  lastReceivedAt: string;
  description: string;
  issues: NewsletterIssue[];
};

const ritsInbox = "newsletters@rits.app";

const seededSubscriptions: NewsletterSubscription[] = [
  {
    id: "strictlyvc",
    name: "StrictlyVC",
    author: "Connie Loizos",
    category: "Startups",
    subscribeLink: "https://strictlyvc.com/subscribe",
    sourceSite: "strictlyvc.com",
    status: "active",
    lastReceivedAt: "2h ago",
    description: "Daily startup, venture, and Silicon Valley dispatches with fast-moving funding and company context.",
    issues: [
      {
        id: "strictlyvc-issue-1",
        title: "AI infra deals are speeding up again",
        date: "May 16, 2026",
        sender: "StrictlyVC <hello@strictlyvc.com>",
        sourceLink: "https://strictlyvc.com/example-issue-1",
        credits: "Original newsletter by Connie Loizos / StrictlyVC",
        summary: "Infra startups are seeing new buyer urgency as enterprises move from pilots to production rollouts.",
        content: [
          "Several late-seed and Series A infrastructure companies are seeing tighter sales cycles than they did six months ago.",
          "The strongest demand appears around model ops, observability, retrieval quality, and governance tooling.",
          "A recurring pattern: products that reduce adoption friction for existing enterprise stacks are closing faster than horizontal assistants.",
        ],
        saved: true,
        comments: [
          { id: "c1", author: "Ankit", role: "Workspace", body: "Strong signal for our enterprise research pipeline. Could map these vendors against our competitor page.", upvotes: 12, postedAt: "35m ago" },
          { id: "c2", author: "Rits AI", role: "AI Summary", body: "Main theme: infra wedge > assistant wedge when budgets are tight and deployment clarity matters.", upvotes: 8, postedAt: "28m ago" },
        ],
      },
      {
        id: "strictlyvc-issue-2",
        title: "Consumer AI apps are fighting for retention",
        date: "May 14, 2026",
        sender: "StrictlyVC <hello@strictlyvc.com>",
        sourceLink: "https://strictlyvc.com/example-issue-2",
        credits: "Original newsletter by Connie Loizos / StrictlyVC",
        summary: "The next battle is less acquisition and more product habit formation.",
        content: [
          "Acquisition remains cheap for novelty-driven products, but retention curves are still flattening too quickly.",
          "Teams are adding utility layers, teams features, and workflow hooks to improve repeated use.",
        ],
        saved: false,
        comments: [],
      },
    ],
  },
  {
    id: "not-boring",
    name: "Not Boring",
    author: "Packy McCormick",
    category: "Markets",
    subscribeLink: "https://www.notboring.co/subscribe",
    sourceSite: "notboring.co",
    status: "active",
    lastReceivedAt: "1d ago",
    description: "Long-form market narratives, category framing, and startup ecosystem interpretation.",
    issues: [
      {
        id: "nb-issue-1",
        title: "Who owns the AI application layer?",
        date: "May 15, 2026",
        sender: "Not Boring <hi@notboring.co>",
        sourceLink: "https://www.notboring.co/example-issue-1",
        credits: "Original newsletter by Packy McCormick / Not Boring",
        summary: "Owning distribution plus workflow context is becoming the key moat for AI apps.",
        content: [
          "Large model access is not enough. Durable application winners combine workflow context, brand trust, and integrated action loops.",
          "Vertical products with strong operational surfaces may hold stronger positions than general-purpose shells.",
        ],
        saved: false,
        comments: [
          { id: "c3", author: "Rits AI", role: "AI Summary", body: "Useful angle for product strategy: context ownership is a stronger moat than model novelty.", upvotes: 5, postedAt: "6h ago" },
        ],
      },
    ],
  },
  {
    id: "lenny",
    name: "Lenny's Newsletter",
    author: "Lenny Rachitsky",
    category: "Product",
    subscribeLink: "https://www.lennysnewsletter.com/subscribe",
    sourceSite: "lennysnewsletter.com",
    status: "syncing",
    lastReceivedAt: "Waiting for first issue",
    description: "Product growth, retention, and operator interviews for product and growth teams.",
    issues: [
      {
        id: "lenny-issue-1",
        title: "The retention systems strong product teams actually use",
        date: "May 13, 2026",
        sender: "Lenny's Newsletter <hello@lennysnewsletter.com>",
        sourceLink: "https://www.lennysnewsletter.com/example-issue-1",
        credits: "Original newsletter by Lenny Rachitsky / Lenny's Newsletter",
        summary: "Retention reviews work best when teams pair user segmentation with decision logs, not just dashboards.",
        content: [
          "The best product orgs do more than inspect dashboards; they connect observed retention changes to prior decisions and experiments.",
          "A lightweight operating cadence beats giant quarterly postmortems for most growth-stage teams.",
        ],
        saved: true,
        comments: [],
      },
    ],
  },
];

function allIssuesFor(subscriptions: NewsletterSubscription[]) {
  return subscriptions.flatMap((subscription) =>
    subscription.issues.map((issue) => ({ ...issue, newsletterId: subscription.id, newsletterName: subscription.name, newsletterAuthor: subscription.author, category: subscription.category }))
  );
}

export function NewsletterResearchHub() {
  const [subscriptions, setSubscriptions] = useState(seededSubscriptions);
  const [subscribeLink, setSubscribeLink] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [selectedNewsletterId, setSelectedNewsletterId] = useState(seededSubscriptions[0]!.id);
  const [selectedIssueId, setSelectedIssueId] = useState(seededSubscriptions[0]!.issues[0]!.id);
  const [commentDraft, setCommentDraft] = useState("");

  const filteredSubscriptions = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return subscriptions;
    return subscriptions.filter((subscription) =>
      `${subscription.name} ${subscription.author} ${subscription.category} ${subscription.description}`.toLowerCase().includes(query)
    );
  }, [searchValue, subscriptions]);

  const selectedNewsletter = subscriptions.find((subscription) => subscription.id === selectedNewsletterId) ?? subscriptions[0]!;
  const selectedIssue = selectedNewsletter.issues.find((issue) => issue.id === selectedIssueId) ?? selectedNewsletter.issues[0]!;
  const issueFeed = useMemo(() => allIssuesFor(filteredSubscriptions), [filteredSubscriptions]);

  const handleAddNewsletter = () => {
    const nextLink = subscribeLink.trim();
    if (!nextLink) {
      toast.error("Paste a newsletter subscribe link first.");
      return;
    }

    let hostname = "newsletter";
    try {
      hostname = new URL(nextLink).hostname.replace("www.", "");
    } catch {
      toast.error("Enter a valid newsletter URL.");
      return;
    }

    const slug = hostname.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const newSubscription: NewsletterSubscription = {
      id: `${slug}-${subscriptions.length + 1}`,
      name: hostname.split(".")[0]!.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      author: "Pending source parse",
      category: "Inbox import",
      subscribeLink: nextLink,
      sourceSite: hostname,
      status: "syncing",
      lastReceivedAt: "Waiting for RITS inbox sync",
      description: "RITS will subscribe with the dedicated newsletter inbox, parse the sender, and surface future issues here with full source credit.",
      issues: [],
    };

    setSubscriptions((current) => [newSubscription, ...current]);
    setSelectedNewsletterId(newSubscription.id);
    setSelectedIssueId("");
    setSubscribeLink("");
    toast.success("Newsletter added to the RITS inbox queue.");
  };

  const handleToggleSaveIssue = () => {
    if (!selectedIssue) return;
    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id !== selectedNewsletter.id
          ? subscription
          : {
              ...subscription,
              issues: subscription.issues.map((issue) => issue.id === selectedIssue.id ? { ...issue, saved: !issue.saved } : issue),
            }
      )
    );
  };

  const handleAddComment = () => {
    const body = commentDraft.trim();
    if (!body || !selectedIssue) return;
    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id !== selectedNewsletter.id
          ? subscription
          : {
              ...subscription,
              issues: subscription.issues.map((issue) =>
                issue.id !== selectedIssue.id
                  ? issue
                  : {
                      ...issue,
                      comments: [
                        {
                          id: `comment-${Date.now()}`,
                          author: "You",
                          role: "Workspace",
                          body,
                          upvotes: 1,
                          postedAt: "Just now",
                        },
                        ...issue.comments,
                      ],
                    }
              ),
            }
      )
    );
    setCommentDraft("");
  };

  return (
    <div className="page-container animate-fade-in-up max-w-none relative">
      <div className="absolute inset-x-0 top-0 h-[360px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top, rgba(94,168,255,0.14) 0%, transparent 60%), radial-gradient(ellipse at 70% 15%, rgba(93,240,190,0.12) 0%, transparent 48%)" }} />

      <div className="page-header mb-8 flex-col items-start gap-6 border-b pb-8 xl:flex-row xl:items-end xl:justify-between" style={{ borderColor: "var(--hairline-strong)" }}>
        <div className="max-w-4xl">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl" style={{ color: "var(--ink)" }}>Newsletter Research Hub</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "RITS inbox", value: ritsInbox },
            { label: "Subscriptions", value: `${subscriptions.length}` },
            { label: "Issues tracked", value: `${allIssuesFor(subscriptions).length}` },
            { label: "Saved issues", value: `${allIssuesFor(subscriptions).filter((issue) => issue.saved).length}` },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>{item.label}</p>
              <p className="mt-2 text-sm font-medium break-all" style={{ color: "var(--ink)" }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="feature-card" style={{ padding: "20px" }}>
          <div className="mb-4 flex items-center gap-2">
            <Plus size={16} style={{ color: "var(--accent-blue)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Add Newsletter</p>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={subscribeLink}
              onChange={(event) => setSubscribeLink(event.target.value)}
              className="input-field"
              placeholder="Paste a newsletter subscribe link, e.g. https://newsletter.com/subscribe"
            />
            <button type="button" onClick={handleAddNewsletter} className="btn-primary">
              <Plus size={15} /> Add to RITS Inbox
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}><AtSign size={12} className="mr-1 inline" /> Subscribes with `{ritsInbox}`</span>
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}><ShieldCheck size={12} className="mr-1 inline" /> Private reader, not public reposting</span>
          </div>
        </section>

        <aside className="feature-card" style={{ padding: "20px" }}>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={16} style={{ color: "var(--accent-orange)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>How It Works</p>
          </div>
          <div className="space-y-3 text-sm" style={{ color: "var(--body)" }}>
            <p>1. Paste a subscribe link.</p>
            <p>2. RITS subscribes using the shared newsletter inbox.</p>
            <p>3. Incoming issues get parsed into readable app entries.</p>
            <p>4. Every issue keeps the original sender, author, date, source link, and credit line.</p>
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="feature-card self-start" style={{ padding: "18px" }}>
          <div className="mb-3 flex items-center gap-2">
            <Search size={15} style={{ color: "var(--accent-blue)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Subscriptions</p>
          </div>
          <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} className="input-field mb-3" placeholder="Search newsletters" />
          <div className="space-y-2">
            {filteredSubscriptions.map((subscription) => {
              const active = subscription.id === selectedNewsletter.id;
              return (
                <button
                  key={subscription.id}
                  type="button"
                  onClick={() => {
                    setSelectedNewsletterId(subscription.id);
                    setSelectedIssueId(subscription.issues[0]?.id ?? "");
                  }}
                  className="w-full rounded-xl border px-3 py-3 text-left transition-colors"
                  style={{ borderColor: active ? "var(--hairline-strong)" : "var(--hairline)", backgroundColor: active ? "var(--surface-elevated)" : "var(--surface-card)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{subscription.name}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ backgroundColor: subscription.status === "active" ? "rgba(17,255,153,0.12)" : "rgba(255,194,82,0.12)", color: subscription.status === "active" ? "var(--accent-green)" : "var(--accent-orange)" }}>
                      {subscription.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{subscription.author}</p>
                  <p className="mt-2 text-xs" style={{ color: "var(--charcoal)" }}>{subscription.lastReceivedAt}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="feature-card mb-5" style={{ padding: "20px" }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}>{selectedNewsletter.category}</span>
                  <span className="text-xs" style={{ color: "var(--mute)" }}>{selectedNewsletter.sourceSite}</span>
                </div>
                <h2 className="text-2xl font-medium" style={{ color: "var(--ink)" }}>{selectedNewsletter.name}</h2>
                <p className="mt-2 text-sm leading-7" style={{ color: "var(--body)" }}>{selectedNewsletter.description}</p>
              </div>
              <a href={selectedNewsletter.subscribeLink} target="_blank" rel="noreferrer" className="btn-outline">
                <ExternalLink size={15} /> Original Subscribe Link
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="feature-card" style={{ padding: "18px" }}>
              <div className="mb-3 flex items-center gap-2">
                <Radio size={15} style={{ color: "var(--accent-green)" }} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Issue Feed</p>
              </div>
              <div className="space-y-2">
                {selectedNewsletter.issues.length === 0 ? (
                  <div className="rounded-xl border px-3 py-6 text-center text-sm" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--charcoal)" }}>
                    Waiting for the first issue to land in the RITS inbox.
                  </div>
                ) : (
                  selectedNewsletter.issues.map((issue) => {
                    const active = issue.id === selectedIssue?.id;
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => setSelectedIssueId(issue.id)}
                        className="w-full rounded-xl border px-3 py-3 text-left transition-colors"
                        style={{ borderColor: active ? "var(--hairline-strong)" : "var(--hairline)", backgroundColor: active ? "var(--surface-elevated)" : "var(--surface-card)" }}
                      >
                        <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{issue.title}</p>
                        <p className="mt-1 text-xs" style={{ color: "var(--mute)" }}>{issue.date}</p>
                        <p className="mt-2 text-xs line-clamp-2" style={{ color: "var(--charcoal)" }}>{issue.summary}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="feature-card min-w-0" style={{ padding: "22px" }}>
              {selectedIssue ? (
                <>
                  <div className="border-b pb-5" style={{ borderColor: "var(--hairline)" }}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}>{selectedIssue.date}</span>
                        <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}>{selectedIssue.sender}</span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleToggleSaveIssue} className="btn-outline">
                          <BookmarkPlus size={15} /> {selectedIssue.saved ? "Saved" : "Save issue"}
                        </button>
                        <button type="button" onClick={() => toast.success("Summary queued for Rits AI.")} className="btn-primary">
                          <Sparkles size={15} /> Summarize
                        </button>
                      </div>
                    </div>
                    <h3 className="text-2xl font-medium" style={{ color: "var(--ink)" }}>{selectedIssue.title}</h3>
                    <p className="mt-2 text-sm" style={{ color: "var(--charcoal)" }}>{selectedIssue.summary}</p>
                    <div className="mt-4 rounded-xl border px-4 py-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Source Credit</p>
                      <p className="mt-2 text-sm" style={{ color: "var(--ink)" }}>{selectedIssue.credits}</p>
                      <a href={selectedIssue.sourceLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm" style={{ color: "var(--accent-blue)" }}>
                        Open original issue <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4 text-sm leading-7" style={{ color: "var(--body)" }}>
                    {selectedIssue.content.map((paragraph, index) => (
                      <p key={`${selectedIssue.id}-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border px-4 py-8 text-center" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--charcoal)" }}>
                  Select an issue to read it here.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="feature-card self-start" style={{ padding: "20px" }}>
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareText size={16} style={{ color: "var(--accent-orange)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Issue Discussion</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{selectedIssue ? selectedIssue.title : "No issue selected"}</p>
            <p className="mt-2 text-xs" style={{ color: "var(--charcoal)" }}>Private Reddit-style thread for your workspace or research context.</p>
          </div>

          <div className="mt-4 space-y-3">
            <textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              rows={4}
              className="input-field resize-none"
              placeholder="Add your take, insight, summary, or disagreement..."
            />
            <button type="button" onClick={handleAddComment} className="btn-primary w-full">
              <MessageSquareText size={15} /> Post Comment
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {(selectedIssue?.comments ?? []).map((comment) => (
              <article key={comment.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: "var(--surface-deep)", color: "var(--ink)" }}>
                      <UserRound size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{comment.author}</p>
                      <p className="text-[11px]" style={{ color: "var(--mute)" }}>{comment.role}</p>
                    </div>
                  </div>
                  <span className="text-[11px]" style={{ color: "var(--mute)" }}>{comment.postedAt}</span>
                </div>
                <p className="mt-3 text-sm leading-6" style={{ color: "var(--body)" }}>{comment.body}</p>
                <p className="mt-3 text-xs" style={{ color: "var(--charcoal)" }}>{comment.upvotes} upvotes</p>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
            <div className="mb-3 flex items-center gap-2">
              <Mail size={15} style={{ color: "var(--accent-green)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Recent Inbox Credits</p>
            </div>
            <div className="space-y-2 text-sm">
              {issueFeed.slice(0, 4).map((issue) => (
                <div key={issue.id} className="rounded-xl border px-3 py-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                  <p style={{ color: "var(--ink)" }}>{issue.newsletterName}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--charcoal)" }}>{issue.credits}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
