"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Bot, MessageSquareText, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  STARTUP_BANNER_KEY,
  STARTUP_COMMENTS_KEY,
  STARTUP_NEWSLETTER_KEY,
  STARTUP_STORAGE_KEY,
  STARTUP_VOTES_KEY,
  baseComments,
  buildSubmittedStartup,
  founderThreads,
  getSectionedStartups,
  readJsonStorage,
  sampleStartups,
  startupCategories,
  type StartupComment,
  type StartupItem,
  type StartupPricing,
  writeJsonStorage,
} from "@/lib/ai-startup-hunt";

type SortMode = "most-voted" | "most-commented" | "newest" | "trending";
type LaunchFilter = "all" | "today" | "yesterday" | "week" | "month";

function StartupRowCard({
  startup,
  rank,
  upvoted,
  onUpvote,
}: {
  startup: StartupItem;
  rank: number;
  upvoted: boolean;
  onUpvote: () => void;
}) {
  return (
    <article className="rounded-2xl border px-4 py-4 transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
      <div className="flex items-start gap-3">
        <div className="flex w-7 shrink-0 justify-center pt-1 text-sm font-medium" style={{ color: "var(--mute)" }}>#{rank}</div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--ink)" }}>
          {startup.logo}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/startups/${startup.slug}`} className="block">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium" style={{ color: "var(--ink)" }}>{startup.name}</p>
                <p className="mt-1 text-sm leading-6" style={{ color: "var(--charcoal)" }}>{startup.tagline}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/startups/${startup.slug}#comments`} className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "var(--hairline)", color: "var(--mute)" }}>
                  <MessageSquareText size={13} /> {startup.commentsCount}
                </Link>
                <button type="button" onClick={(event) => { event.preventDefault(); onUpvote(); }} className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: upvoted ? "rgba(255,128,31,0.28)" : "var(--hairline)", backgroundColor: upvoted ? "rgba(255,128,31,0.1)" : "var(--surface-deep)", color: upvoted ? "var(--accent-orange)" : "var(--ink)" }}>
                  <ArrowUp size={13} /> {startup.votes}
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {startup.categories.map((category) => <span key={category} className="rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}>{category}</span>)}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--mute)" }}>
              <span>{startup.founderName}</span>
              <span>{startup.pricing}</span>
              <span>{new Date(startup.launchDate).toLocaleDateString()}</span>
            </div>
          </Link>
        </div>
      </div>
    </article>
  );
}

function StartupListSection({
  title,
  startups,
  upvotedIds,
  onUpvote,
  footerLabel,
}: {
  title: string;
  startups: StartupItem[];
  upvotedIds: string[];
  onUpvote: (startupId: string) => void;
  footerLabel: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-medium" style={{ color: "var(--ink)" }}>{title}</h2>
        <span className="text-sm" style={{ color: "var(--mute)" }}>{startups.length} startups</span>
      </div>
      <div className="space-y-3">
        {startups.length === 0 ? (
          <div className="rounded-2xl border px-4 py-8 text-center text-sm" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--charcoal)" }}>
            No launches in this bucket yet.
          </div>
        ) : startups.map((startup, index) => (
          <StartupRowCard key={startup.id} startup={startup} rank={index + 1} upvoted={upvotedIds.includes(startup.id)} onUpvote={() => onUpvote(startup.id)} />
        ))}
      </div>
      <div className="flex justify-center">
        <button type="button" className="rounded-full border px-5 py-2.5 text-sm font-medium" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)", color: "var(--ink)" }}>
          {footerLabel}
        </button>
      </div>
    </section>
  );
}

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  const handleSubmit = () => {
    const normalized = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      toast.error("Enter a valid email.");
      return;
    }
    const current = readJsonStorage<string[]>(STARTUP_NEWSLETTER_KEY, []);
    writeJsonStorage(STARTUP_NEWSLETTER_KEY, Array.from(new Set([...current, normalized])));
    setSignedUp(true);
    setEmail("");
    toast.success("Signed up for startup updates.");
  };

  return (
    <div className="rounded-[24px] border p-5" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
      <p className="text-lg font-medium" style={{ color: "var(--ink)" }}>Get the best startups directly in your inbox.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input value={email} onChange={(event) => setEmail(event.target.value)} className="input-field flex-1" placeholder="name@company.com" />
        <button type="button" onClick={handleSubmit} className="btn-primary">Sign up</button>
      </div>
      {signedUp ? <p className="mt-3 text-sm" style={{ color: "var(--accent-green)" }}>You’re on the list.</p> : null}
    </div>
  );
}

function StartupSidebar({
  startups,
}: {
  startups: StartupItem[];
}) {
  const topLaunches = useMemo(() => [...startups].sort((a, b) => b.votes - a.votes).slice(0, 5), [startups]);
  const recommended = useMemo(() => [...startups].sort((a, b) => b.commentsCount - a.commentsCount).slice(5, 10), [startups]);

  return (
    <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <div className="flex items-center justify-between">
          <p className="text-base font-medium" style={{ color: "var(--ink)" }}>Trending Founder Threads</p>
          <button type="button" className="text-sm" style={{ color: "var(--accent-blue)" }}>View all</button>
        </div>
        <div className="mt-4 space-y-3">
          {founderThreads.slice(0, 5).map((thread) => (
            <div key={thread.id} className="rounded-2xl border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <p className="text-xs" style={{ color: "var(--mute)" }}>{thread.authorName}</p>
              <p className="mt-1 text-sm font-medium" style={{ color: "var(--ink)" }}>{thread.title}</p>
              <div className="mt-2 flex gap-3 text-xs" style={{ color: "var(--charcoal)" }}>
                <span>{thread.votes} upvotes</span>
                <span>{thread.commentsCount} comments</span>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-outline mt-4 w-full">Start new thread</button>
      </div>

      <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <p className="text-base font-medium" style={{ color: "var(--ink)" }}>You’re on a 3 day streak</p>
        <div className="mt-4 flex gap-2">
          {[0, 1, 2, 3, 4].map((index) => <span key={index} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: index < 3 ? "var(--accent-orange)" : "var(--surface-deep)" }} />)}
        </div>
        <button type="button" className="mt-4 text-sm" style={{ color: "var(--accent-blue)" }}>View visit streak ranking</button>
      </div>

      <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <div className="flex items-center justify-between">
          <p className="text-base font-medium" style={{ color: "var(--ink)" }}>Launching Today</p>
          <button type="button" className="text-sm" style={{ color: "var(--accent-blue)" }}>View all launches</button>
        </div>
        <div className="mt-4 space-y-3">
          {topLaunches.map((startup, index) => (
            <Link key={startup.id} href={`/startups/${startup.slug}`} className="flex items-center gap-3 rounded-2xl border p-3 transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--mute)" }}>#{index + 1}</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-semibold" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--ink)" }}>{startup.logo}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{startup.name}</p>
                <p className="truncate text-xs" style={{ color: "var(--mute)" }}>{startup.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
        <p className="text-base font-medium" style={{ color: "var(--ink)" }}>Recommended Startups</p>
        <div className="mt-4 space-y-3">
          {recommended.map((startup) => (
            <Link key={startup.id} href={`/startups/${startup.slug}`} className="flex items-center gap-3 rounded-2xl border p-3 transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-semibold" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--ink)" }}>{startup.logo}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>{startup.name}</p>
                <p className="truncate text-xs" style={{ color: "var(--mute)" }}>{startup.categories[0]}</p>
              </div>
              <span className="text-xs" style={{ color: "var(--charcoal)" }}>{startup.votes}</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}

function StartupSubmitModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (startup: StartupItem) => void;
}) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [founderName, setFounderName] = useState("");
  const [pricing, setPricing] = useState<StartupPricing>("Freemium");
  const [media, setMedia] = useState("");
  const [categories, setCategories] = useState<string[]>([startupCategories[0]!]);

  const toggleCategory = (category: string) => {
    setCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  };

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Startup name is required.");
    if (!tagline.trim()) return toast.error("Tagline is required.");
    if (!/^https?:\/\//.test(websiteUrl.trim())) return toast.error("Enter a valid website URL.");
    if (categories.length === 0) return toast.error("Select at least one category.");

    onSubmit(buildSubmittedStartup({
      name,
      tagline,
      description,
      websiteUrl,
      logo,
      categories,
      founderName,
      pricing,
      media: media.split(",").map((item) => item.trim()).filter(Boolean),
    }));

    setName("");
    setTagline("");
    setDescription("");
    setWebsiteUrl("");
    setLogo("");
    setFounderName("");
    setMedia("");
    setCategories([startupCategories[0]!]);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Startup</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input value={name} onChange={(event) => setName(event.target.value)} className="input-field" placeholder="Startup name" />
          <input value={tagline} onChange={(event) => setTagline(event.target.value)} className="input-field" placeholder="Tagline" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="input-field resize-none" placeholder="Description" />
          <input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} className="input-field" placeholder="https://startup.com" />
          <input value={logo} onChange={(event) => setLogo(event.target.value)} className="input-field" placeholder="Logo initials or URL" />
          <input value={founderName} onChange={(event) => setFounderName(event.target.value)} className="input-field" placeholder="Founder name" />
          <select value={pricing} onChange={(event) => setPricing(event.target.value as StartupPricing)} className="input-field">
            {(["Free", "Freemium", "Paid", "Open Source"] as StartupPricing[]).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input value={media} onChange={(event) => setMedia(event.target.value)} className="input-field" placeholder="Media URLs, comma separated" />
          <div className="flex flex-wrap gap-2">
            {startupCategories.map((category) => (
              <button key={category} type="button" onClick={() => toggleCategory(category)} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: categories.includes(category) ? "var(--hairline-strong)" : "var(--hairline)", backgroundColor: categories.includes(category) ? "var(--surface-elevated)" : "var(--surface-card)", color: "var(--ink)" }}>
                {category}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="button" onClick={handleSubmit} className="btn-primary">Submit</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AiStartupHuntPage() {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [bannerVisible, setBannerVisible] = useState(() => !readJsonStorage<boolean>(STARTUP_BANNER_KEY, false));
  const [submitOpen, setSubmitOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [pricingFilter, setPricingFilter] = useState<string>("All");
  const [launchFilter, setLaunchFilter] = useState<LaunchFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("most-voted");
  const [startups, setStartups] = useState<StartupItem[]>(() => readJsonStorage<StartupItem[]>(STARTUP_STORAGE_KEY, sampleStartups));
  const [upvotedIds, setUpvotedIds] = useState<string[]>(() => readJsonStorage<string[]>(STARTUP_VOTES_KEY, []));
  const [comments] = useState<StartupComment[]>(() => readJsonStorage<StartupComment[]>(STARTUP_COMMENTS_KEY, baseComments));

  useEffect(() => {
    writeJsonStorage(STARTUP_STORAGE_KEY, startups);
  }, [startups]);

  useEffect(() => {
    writeJsonStorage(STARTUP_VOTES_KEY, upvotedIds);
  }, [upvotedIds]);

  const startupsWithCounts = useMemo(
    () => startups.map((startup) => ({ ...startup, commentsCount: comments.filter((comment) => comment.startupId === startup.id).length })),
    [comments, startups]
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return startupsWithCounts
      .filter((startup) => {
        const matchesQuery = !query || `${startup.name} ${startup.tagline} ${startup.description} ${startup.categories.join(" ")} ${startup.founderName}`.toLowerCase().includes(query);
        const matchesCategory = categoryFilter === "All" || startup.categories.includes(categoryFilter);
        const matchesPricing = pricingFilter === "All" || startup.pricing === pricingFilter;
        const launchAge = (now - new Date(startup.launchDate).getTime()) / (1000 * 60 * 60 * 24);
        const matchesLaunch = launchFilter === "all" || (launchFilter === "today" && launchAge < 1) || (launchFilter === "yesterday" && launchAge >= 1 && launchAge < 2) || (launchFilter === "week" && launchAge <= 7) || (launchFilter === "month" && launchAge <= 30);
        return matchesQuery && matchesCategory && matchesPricing && matchesLaunch;
      })
      .sort((left, right) => {
        if (sortMode === "most-commented") return right.commentsCount - left.commentsCount;
        if (sortMode === "newest") return new Date(right.launchDate).getTime() - new Date(left.launchDate).getTime();
        if (sortMode === "trending") return (right.votes + right.commentsCount * 2) - (left.votes + left.commentsCount * 2);
        return right.votes - left.votes;
      });
  }, [categoryFilter, launchFilter, now, pricingFilter, searchQuery, sortMode, startupsWithCounts]);

  const sections = useMemo(() => getSectionedStartups(filtered), [filtered]);

  const handleUpvote = (startupId: string) => {
    const already = upvotedIds.includes(startupId);
    setUpvotedIds((current) => already ? current.filter((id) => id !== startupId) : [...current, startupId]);
    setStartups((current) => current.map((startup) => startup.id === startupId ? { ...startup, votes: startup.votes + (already ? -1 : 1) } : startup));
  };

  const handleSubmitStartup = (startup: StartupItem) => {
    setStartups((current) => [startup, ...current]);
    setUpvotedIds((current) => Array.from(new Set([...current, startup.id])));
    toast.success("Startup submitted.");
    setSubmitOpen(false);
    router.push(`/startups/${startup.slug}`);
  };

  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--mute)" }} />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") toast.success("Search updated."); }} placeholder="Search startups, tools, founders..." className="input-field pl-9" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => toast.success(searchQuery.trim() ? `AI suggestions for ${searchQuery}` : "Ask AI about startup trends.")} className="btn-outline"><Bot size={15} /> Ask AI</button>
                <button type="button" onClick={() => setSubmitOpen(true)} className="btn-primary"><Plus size={15} /> Submit Startup</button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="input-field min-w-0 w-full px-3">
                <option value="All">All categories</option>
                {startupCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select value={pricingFilter} onChange={(event) => setPricingFilter(event.target.value)} className="input-field min-w-0 w-full px-3">
                {(["All", "Free", "Freemium", "Paid", "Open Source"] as const).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={launchFilter} onChange={(event) => setLaunchFilter(event.target.value as LaunchFilter)} className="input-field min-w-0 w-full px-3">
                <option value="all">All periods</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
              </select>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="input-field min-w-0 w-full px-3">
                <option value="most-voted">Most voted</option>
                <option value="most-commented">Most commented</option>
                <option value="newest">Newest</option>
                <option value="trending">Trending</option>
              </select>
            </div>
          </div>

          {bannerVisible ? (
            <div className="rounded-[24px] border px-4 py-3" style={{ borderColor: "rgba(255,128,31,0.22)", backgroundColor: "rgba(255,128,31,0.08)" }}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm" style={{ color: "var(--ink)" }}>Welcome to Startup Hunt — discover, rank, and discuss new startups.</p>
                <button type="button" onClick={() => { setBannerVisible(false); writeJsonStorage(STARTUP_BANNER_KEY, true); }} style={{ color: "var(--mute)" }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : null}

          <StartupListSection title="Top Startups Launching Today" startups={sections.today} upvotedIds={upvotedIds} onUpvote={handleUpvote} footerLabel="See all of today’s startups" />
          <NewsletterSignup />
          <StartupListSection title="Yesterday’s Top Startups" startups={sections.yesterday} upvotedIds={upvotedIds} onUpvote={handleUpvote} footerLabel="See all of yesterday’s startups" />
          <StartupListSection title="Last Week’s Top Startups" startups={sections.week} upvotedIds={upvotedIds} onUpvote={handleUpvote} footerLabel="See all of last week’s startups" />
          <StartupListSection title="Last Month’s Top Startups" startups={sections.month} upvotedIds={upvotedIds} onUpvote={handleUpvote} footerLabel="See all of last month’s startups" />
        </div>

        <StartupSidebar startups={startupsWithCounts} />
      </div>

      <StartupSubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} onSubmit={handleSubmitStartup} />
    </div>
  );
}
