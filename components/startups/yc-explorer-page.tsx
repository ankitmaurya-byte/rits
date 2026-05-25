"use client";

import { useWorkspace } from "@/lib/use-workspace";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useQuery as useConvexUserQuery } from "convex/react";
import { ArrowRight, BarChart3, Box, CheckSquare, ChevronDown, ChevronUp, ExternalLink, FileText, Filter, Lightbulb, Rocket, Search, Sparkles, Users, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { mockYCStartups, type YCStartup } from "@/lib/yc-startups";
import { ThemedSelect } from "@/components/ui/themed-select";

const industries = ["All", ...Array.from(new Set(mockYCStartups.map((s) => s.industry))).sort()];
const batches = ["All", ...Array.from(new Set(mockYCStartups.map((s) => s.batch))).sort()];
const INITIAL_VISIBLE_STARTUPS = 12;
const VISIBLE_STARTUPS_STEP = 12;

type InsightCopy = {
  title: string;
  body: string;
};

type StartupProfile = {
  product: InsightCopy;
  revenue: InsightCopy;
  market: InsightCopy;
  team: InsightCopy;
  moat: string;
  risks: string[];
  more: string[];
};

const REVENUE_BY_INDUSTRY: Record<string, InsightCopy> = {
  AI: { title: "Usage-based platform revenue", body: "Usually monetized through API usage, data workflows, model operations, enterprise contracts, or managed services." },
  Analytics: { title: "SaaS subscriptions", body: "Typically driven by seat-based, event-volume, or usage-tiered subscriptions for product and data teams." },
  Biotech: { title: "Platform partnerships", body: "Often built around research partnerships, milestone payments, licensing, and long-cycle commercial programs." },
  "Cloud Storage": { title: "Freemium subscriptions", body: "Usually combines free adoption with paid storage, team collaboration, security, and admin controls." },
  Crypto: { title: "Transaction and platform fees", body: "Common revenue streams include trading fees, marketplace fees, custody, subscriptions, and developer services." },
  Delivery: { title: "Marketplace take rate", body: "Usually monetized through order commissions, delivery fees, merchant services, ads, and subscriptions." },
  "E-commerce": { title: "Marketplace and seller fees", body: "Typically earns through take rates, payment fees, seller tools, logistics, and promoted placement." },
  Fintech: { title: "Transaction and financial services revenue", body: "Often combines processing fees, interchange, SaaS tools, lending economics, and platform services." },
  "HR & Payroll": { title: "Per-employee SaaS", body: "Usually monetized by monthly subscriptions tied to employees, contractors, payroll runs, and add-on HR modules." },
  Logistics: { title: "Service margin and platform fees", body: "Typically earns on managed freight, software subscriptions, financing, customs, or marketplace coordination." },
  Media: { title: "Ads, subscriptions, and creator economics", body: "Common models include advertising, premium subscriptions, commerce, sponsorships, and revenue share." },
  Social: { title: "Advertising and premium layers", body: "Typically monetized through ads, premium memberships, data/API products, commerce, and promoted content." },
  Travel: { title: "Marketplace take rate", body: "Usually earns from booking fees, host/guest service fees, payments, and adjacent travel services." },
};

const MARKET_BY_INDUSTRY: Record<string, InsightCopy> = {
  AI: { title: "Fast-moving enterprise demand", body: "Demand is strong but crowded; the durable edge usually comes from workflow ownership, proprietary data, and trust." },
  Analytics: { title: "Mission-critical but tool-heavy", body: "Buyers already have many dashboards, so winning products need clearer decisions, better instrumentation, or lower implementation drag." },
  Biotech: { title: "Large upside, long cycles", body: "Market value can be high, but validation, regulation, sales cycles, and capital intensity shape the pace." },
  "Cloud Storage": { title: "Horizontal category with switching costs", body: "The market is mature, so growth depends on collaboration workflows, ecosystem depth, and enterprise trust." },
  Crypto: { title: "Cyclical and trust-sensitive", body: "Demand can expand quickly, but regulation, security, liquidity, and user confidence define the ceiling." },
  Delivery: { title: "Huge local operations market", body: "The opportunity is broad, but margins, density, labor, and supply reliability matter more than simple demand." },
  "E-commerce": { title: "Large market with margin pressure", body: "Distribution, seller quality, logistics, and repeat purchase behavior usually decide whether scale compounds." },
  Fintech: { title: "Large regulated infrastructure market", body: "The prize is big because money movement is universal, but trust, compliance, and partner depth are core constraints." },
  "HR & Payroll": { title: "Recurring operational budget", body: "Businesses keep paying when payroll, compliance, onboarding, and identity workflows become system-of-record products." },
  Logistics: { title: "Massive fragmented market", body: "Opportunity comes from reducing coordination costs, but operations quality and network density are hard to fake." },
  Media: { title: "Attention market with platform effects", body: "Growth depends on creator supply, audience habits, content liquidity, and monetization that does not hurt retention." },
  Social: { title: "Network-effect market", body: "The upside is very high when retention and community loops compound, but moderation and monetization become central." },
  Travel: { title: "Large cyclical marketplace", body: "Travel demand is broad, but trust, supply quality, regulation, and seasonality shape defensibility." },
};

const COMPANY_REVENUE_OVERRIDES: Record<string, InsightCopy> = {
  Airbnb: { title: "Booking marketplace fees", body: "Revenue is primarily associated with guest and host service fees around completed stays and experiences." },
  Stripe: { title: "Payment infrastructure fees", body: "Revenue is tied to payment processing, billing, tax, treasury, identity, and platform products." },
  Dropbox: { title: "Storage and collaboration subscriptions", body: "Revenue generally comes from paid personal, team, and enterprise plans layered on top of file sync and sharing." },
  Coinbase: { title: "Trading, custody, and subscription revenue", body: "Revenue is linked to trading activity, custody, staking, subscriptions, and institutional services." },
  Reddit: { title: "Ads, premium, and data licensing", body: "Revenue is associated with advertising, premium memberships, commerce experiments, and data/API licensing." },
  DoorDash: { title: "Marketplace commissions and fees", body: "Revenue comes from merchant commissions, consumer delivery/service fees, subscriptions, ads, and logistics services." },
  Instacart: { title: "Marketplace, ads, and subscriptions", body: "Revenue is commonly tied to retailer partnerships, delivery/service fees, ads, and membership subscriptions." },
  Twitch: { title: "Subscriptions, ads, and commerce share", body: "Revenue is connected to creator subscriptions, advertising, bits/commerce, and platform partnerships." },
};

function normalizeWebsiteUrl(website: string) {
  const compact = website.trim().replace(/\s+/g, "");
  if (!compact) return "#";
  return compact.startsWith("http://") || compact.startsWith("https://") ? compact : `https://${compact}`;
}

function getWebsiteHost(website: string) {
  try {
    return new URL(normalizeWebsiteUrl(website)).hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^https?:\/\//, "").replace(/\s+/g, "");
  }
}

function pluralizeFounders(count: number) {
  return count === 1 ? "1 founder" : `${count} founders`;
}

function buildStartupProfile(startup: YCStartup): StartupProfile {
  const revenue = COMPANY_REVENUE_OVERRIDES[startup.name] ?? REVENUE_BY_INDUSTRY[startup.industry] ?? {
    title: "Revenue model to research",
    body: "Use the product, customer, and pricing motion to validate whether this is usage, subscription, marketplace, ads, or services revenue.",
  };
  const market = MARKET_BY_INDUSTRY[startup.industry] ?? {
    title: "Market needs validation",
    body: "Assess buyer urgency, existing alternatives, budget ownership, switching costs, and whether distribution can compound.",
  };

  return {
    product: {
      title: "Core product",
      body: startup.description,
    },
    revenue,
    market,
    team: {
      title: pluralizeFounders(startup.founders.length),
      body: startup.founders.join(", "),
    },
    moat: `${startup.industry} companies usually defend with distribution, trust, workflow depth, data advantage, brand, or marketplace liquidity.`,
    risks: [
      "Validate whether growth depends on paid acquisition, founder-led sales, partnerships, or a repeatable self-serve loop.",
      "Check regulatory, platform, margin, or supply-side constraints before copying the model.",
      "Look for switching costs and frequency of use; low-frequency products need stronger trust or aggregation.",
    ],
    more: [
      `Website signal: ${getWebsiteHost(startup.website)}`,
      `Batch context: ${startup.batch}`,
      `Research angle: compare ${startup.name} with newer ${startup.industry.toLowerCase()} startups and incumbents.`,
    ],
  };
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mb-3 mt-5 text-[16px] font-semibold first:mt-0" style={{ color: "var(--ink)" }}>{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-4 text-[14px] font-semibold first:mt-0" style={{ color: "var(--ink)" }}>{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-4 text-[13px] font-semibold first:mt-0" style={{ color: "var(--ink)" }}>{children}</h3>,
        p: ({ children }) => <p className="mb-3 text-[13.5px] leading-7 last:mb-0" style={{ color: "var(--body)" }}>{children}</p>,
        ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1.5" style={{ color: "var(--body)" }}>{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1.5" style={{ color: "var(--body)" }}>{children}</ol>,
        li: ({ children }) => <li className="text-[13.5px] leading-7">{children}</li>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:opacity-80" style={{ color: "var(--accent-blue)" }}>{children}</a>,
        code: ({ children }) => <code className="rounded px-1.5 py-0.5 text-[12px]" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--ink)", border: "1px solid var(--hairline)" }}>{children}</code>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function MetricTile({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="min-h-[132px] rounded-lg border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
      <div className="mb-3 flex items-center gap-2" style={{ color: "var(--mute)" }}>
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="text-sm font-medium leading-5" style={{ color: "var(--ink)" }}>{value}</p>
      <p className="mt-2 text-xs leading-5" style={{ color: "var(--charcoal)" }}>{detail}</p>
    </div>
  );
}

function DetailSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="border-t pt-6" style={{ borderColor: "var(--hairline)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>{eyebrow}</p>
      <h4 className="mt-2 text-lg font-medium" style={{ color: "var(--ink)" }}>{title}</h4>
      <div className="mt-3 text-sm leading-7" style={{ color: "var(--body)" }}>{children}</div>
    </section>
  );
}

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
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_STARTUPS);
  const [selectedStartup, setSelectedStartup] = useState<YCStartup | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState("Analyze this startup's business model, revenue model, market, product, team, moat, risks, competitors, and possible startup ideas inspired by it.");
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false);
  const [analysisPromptOpen, setAnalysisPromptOpen] = useState(false);
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
          setVisibleCount((prev) => Math.min(prev + VISIBLE_STARTUPS_STEP, filteredStartups.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    return () => observer.disconnect();
  }, [filteredStartups.length]);

  const selectedProfile = selectedStartup ? buildStartupProfile(selectedStartup) : null;

  const openStartup = (startup: YCStartup) => {
    setSelectedStartup(startup);
    setAnalysisResult("");
    setAnalysisPanelOpen(false);
    setAnalysisPromptOpen(false);
  };

  const closeStartup = () => {
    setSelectedStartup(null);
    setAnalysisPanelOpen(false);
    setAnalysisPromptOpen(false);
  };

  const handleAddToNotes = async (startup: (typeof mockYCStartups)[0]) => {
    if (!workspaceId) return;
    setLoadingActionId(`${startup.id}-note`);
    try {
      await createNote({
        workspaceId,
        scope: "workspace",
        title: `Research Note: ${startup.name}`,
        content: `# ${startup.name} (${startup.batch})\n\n**Industry:** ${startup.industry}\n\n**Founders:** ${startup.founders.join(", ")}\n\n**Website:** ${normalizeWebsiteUrl(startup.website)}\n\n## Description\n${startup.description}\n\n## My Thoughts\n...`,
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
      const profile = buildStartupProfile(selectedStartup);
      const context = [
        `Startup: ${selectedStartup.name}`,
        `Batch: ${selectedStartup.batch}`,
        `Industry: ${selectedStartup.industry}`,
        `Founders: ${selectedStartup.founders.join(", ")}`,
        `Website: ${normalizeWebsiteUrl(selectedStartup.website)}`,
        `Description: ${selectedStartup.description}`,
        `Product: ${profile.product.title} - ${profile.product.body}`,
        `Revenue: ${profile.revenue.title} - ${profile.revenue.body}`,
        `Market sense: ${profile.market.title} - ${profile.market.body}`,
        `Team: ${profile.team.title} - ${profile.team.body}`,
        `Moat: ${profile.moat}`,
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

    const profile = buildStartupProfile(selectedStartup);
    const content = [
      `# ${selectedStartup.name}`,
      ``,
      `Batch: ${selectedStartup.batch}`,
      `Industry: ${selectedStartup.industry}`,
      `Founders: ${selectedStartup.founders.join(", ")}`,
      `Website: ${normalizeWebsiteUrl(selectedStartup.website)}`,
      ``,
      `## Description`,
      selectedStartup.description,
      ``,
      `## Revenue`,
      profile.revenue.body,
      ``,
      `## Market Sense`,
      profile.market.body,
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
      <div className="page-container animate-fade-in-up px-0 py-2 sm:px-0 sm:py-3 lg:px-0">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-3 w-20 rounded-full" />
            <div className="skeleton h-7 w-48 rounded-xl" />
          </div>
          <div className="skeleton hidden h-11 w-80 rounded-xl sm:block" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in-up relative px-0 py-2 sm:px-0 sm:py-3 lg:px-0">
      <div className="relative z-10 space-y-6">
        <div className="border-b pb-7" style={{ borderColor: "var(--hairline)" }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>Explore</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg border" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)", color: "var(--accent-orange)" }}>
                  <Rocket size={20} />
                </span>
                <h2 className="text-2xl font-medium sm:text-3xl" style={{ color: "var(--ink)" }}>
                  YC Startup Directory
                </h2>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:min-w-[620px] lg:max-w-[780px] lg:flex-1 lg:justify-end">
              <div
                className="relative flex h-11 items-center rounded-lg border sm:flex-1 lg:min-w-[360px]"
                style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}
              >
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--charcoal)" }} />
                <input
                  type="text"
                  placeholder="Search startups or descriptions"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setVisibleCount(INITIAL_VISIBLE_STARTUPS);
                  }}
                  className="h-full w-full bg-transparent pl-11 pr-4 text-sm outline-none placeholder:text-[color:var(--mute)]"
                  style={{ color: "var(--ink)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <ThemedSelect
                  value={industryFilter}
                  onChange={(e) => {
                    setIndustryFilter(e.target.value);
                    setVisibleCount(INITIAL_VISIBLE_STARTUPS);
                  }}
                  className="min-w-0 sm:min-w-[160px]"
                  icon={<Filter size={16} />}
                >
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </ThemedSelect>
                <ThemedSelect
                  value={batchFilter}
                  onChange={(e) => {
                    setBatchFilter(e.target.value);
                    setVisibleCount(INITIAL_VISIBLE_STARTUPS);
                  }}
                  className="min-w-0 sm:min-w-[120px]"
                >
                  {batches.map((batch) => (
                    <option key={batch} value={batch}>{batch}</option>
                  ))}
                </ThemedSelect>
              </div>
            </div>
          </div>
          <div>
            <p className="mt-4 text-sm" style={{ color: "var(--charcoal)" }}>
              {filteredStartups.length} companies across {industries.length - 1} industries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleStartups.map((startup) => {
            const profile = buildStartupProfile(startup);
            return (
              <article
                key={startup.id}
                className="group flex min-h-[252px] flex-col overflow-hidden rounded-lg border p-4 transition-colors hover:bg-[var(--surface-elevated)]"
                style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-medium leading-tight" style={{ color: "var(--ink)" }}>{startup.name}</h3>
                      <span className="badge-pill" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-orange)" }}>{startup.batch}</span>
                    </div>
                    <p className="text-xs font-medium leading-5" style={{ color: "var(--mute)" }}>
                      {startup.industry} / {startup.founders.join(", ")}
                    </p>
                  </div>
                  <a
                    href={normalizeWebsiteUrl(startup.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-2 transition-colors hover:bg-[var(--surface-card)]"
                    style={{ color: "var(--stone)" }}
                    aria-label={`Visit ${startup.name} website`}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-6" style={{ color: "var(--charcoal)" }}>
                  {startup.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border px-3 py-2" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }}>
                    <p className="font-medium" style={{ color: "var(--ink)" }}>Revenue</p>
                    <p className="mt-1 line-clamp-2 leading-5">{profile.revenue.title}</p>
                  </div>
                  <div className="rounded-md border px-3 py-2" style={{ borderColor: "var(--hairline)", color: "var(--charcoal)" }}>
                    <p className="font-medium" style={{ color: "var(--ink)" }}>Market</p>
                    <p className="mt-1 line-clamp-2 leading-5">{profile.market.title}</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
                  <div className="flex items-center gap-1.5" style={{ color: "var(--mute)" }}>
                    <Users size={14} />
                    <span className="text-xs">{pluralizeFounders(startup.founders.length)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openStartup(startup)}
                    className="btn-outline h-8 px-3 text-xs"
                  >
                    Open <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {visibleCount < filteredStartups.length ? (
          <div ref={loaderRef} className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2" style={{ borderColor: "var(--accent-orange)" }} />
          </div>
        ) : null}

        {filteredStartups.length === 0 ? (
          <div className="py-24 text-center text-sm" style={{ color: "var(--mute)" }}>
            No startups found matching your criteria.
          </div>
        ) : null}
      </div>

      {selectedStartup && selectedProfile ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 pt-5 sm:p-5"
          style={{ backgroundColor: "rgba(0,0,0,0.68)", backdropFilter: "blur(4px)" }}
          onClick={closeStartup}
        >
          <div
            className="relative w-full max-w-6xl overflow-hidden rounded-xl border shadow-2xl"
            style={{ backgroundColor: "var(--canvas)", borderColor: "var(--hairline-strong)", maxHeight: "92vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sticky top-0 z-20 border-b px-4 py-4 sm:px-6" style={{ backgroundColor: "var(--canvas)", borderColor: "var(--hairline)" }}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-pill" style={{ backgroundColor: "var(--surface-deep)", color: "var(--accent-orange)" }}>{selectedStartup.batch}</span>
                    <span className="badge-pill">{selectedStartup.industry}</span>
                    <a href={normalizeWebsiteUrl(selectedStartup.website)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--accent-blue)" }}>
                      <ExternalLink size={13} /> {getWebsiteHost(selectedStartup.website)}
                    </a>
                  </div>
                  <h3 className="mt-3 text-2xl font-medium leading-tight sm:text-3xl" style={{ color: "var(--ink)" }}>{selectedStartup.name}</h3>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--charcoal)" }}>
                    {selectedStartup.founders.join(", ")}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] xl:inline-flex" style={{ color: "var(--mute)" }}>Quick actions</span>
                  <button onClick={() => void handleAddToNotes(selectedStartup)} disabled={loadingActionId === `${selectedStartup.id}-note`} className="btn-outline h-9 px-3 text-xs">
                    <FileText size={14} /> {loadingActionId === `${selectedStartup.id}-note` ? "Saving" : "Notes"}
                  </button>
                  <button onClick={() => void handleAddToIdeas(selectedStartup)} disabled={loadingActionId === `${selectedStartup.id}-idea` || !convexUser} className="btn-outline h-9 px-3 text-xs">
                    <Lightbulb size={14} /> {loadingActionId === `${selectedStartup.id}-idea` ? "Saving" : "Ideas"}
                  </button>
                  <button onClick={() => void handleAddToTodo(selectedStartup)} disabled={loadingActionId === `${selectedStartup.id}-todo`} className="btn-outline h-9 px-3 text-xs">
                    <CheckSquare size={14} /> {loadingActionId === `${selectedStartup.id}-todo` ? "Saving" : "Todos"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalysisPanelOpen((value) => !value)}
                    className={analysisPanelOpen ? "btn-primary h-9 px-3 text-xs" : "btn-outline h-9 px-3 text-xs"}
                  >
                    <Sparkles size={14} /> AI analysis
                  </button>
                  <button
                    type="button"
                    onClick={closeStartup}
                    className="rounded-md border p-2 transition-colors hover:bg-[var(--surface-elevated)]"
                    style={{ borderColor: "var(--hairline)", color: "var(--stone)" }}
                    aria-label="Close startup details"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile icon={<WalletCards size={15} />} label="Revenue" value={selectedProfile.revenue.title} detail={selectedProfile.revenue.body} />
                <MetricTile icon={<BarChart3 size={15} />} label="Market Sense" value={selectedProfile.market.title} detail={selectedProfile.market.body} />
                <MetricTile icon={<Box size={15} />} label="Product" value={selectedProfile.product.title} detail={selectedProfile.product.body} />
                <MetricTile icon={<Users size={15} />} label="Team" value={selectedProfile.team.title} detail={selectedProfile.team.body} />
              </div>

              {analysisPanelOpen ? (
                <section className="mt-6 border-t pt-6" style={{ borderColor: "var(--hairline)" }}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} style={{ color: "var(--accent-orange)" }} />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>AI analysis</p>
                      </div>
                      <h4 className="mt-2 text-lg font-medium" style={{ color: "var(--ink)" }}>Research brief</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setAnalysisPromptOpen((value) => !value)} className="btn-outline h-9 px-3 text-xs">
                        {analysisPromptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Prompt
                      </button>
                      <button onClick={() => void handleAnalyzeStartup()} disabled={analysisLoading || !analysisPrompt.trim()} className="btn-primary h-9 px-3 text-xs">
                        <Sparkles size={14} /> {analysisLoading ? "Analyzing" : "Run AI"}
                      </button>
                      <button onClick={() => void handleSaveAnalysisToPrivateNotes()} disabled={!analysisResult || loadingActionId === `${selectedStartup.id}-private-note`} className="btn-outline h-9 px-3 text-xs">
                        <FileText size={14} /> {loadingActionId === `${selectedStartup.id}-private-note` ? "Saving" : "Save AI"}
                      </button>
                    </div>
                  </div>
                  {analysisPromptOpen ? (
                    <textarea
                      value={analysisPrompt}
                      onChange={(e) => setAnalysisPrompt(e.target.value)}
                      rows={4}
                      className="input-field mt-4 min-h-[110px] resize-y"
                      placeholder="Ask AI to analyze this startup..."
                    />
                  ) : null}
                  <div className="mt-4 rounded-lg border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
                    {analysisResult ? (
                      <MarkdownBlock content={analysisResult} />
                    ) : (
                      <p className="text-sm" style={{ color: "var(--charcoal)" }}>
                        Run AI to generate business, revenue, market, moat, risk, competitor, and idea insights.
                      </p>
                    )}
                  </div>
                </section>
              ) : null}

              <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                  <DetailSection eyebrow="Overview" title={selectedStartup.name}>
                    <p>{selectedStartup.description}</p>
                  </DetailSection>

                  <DetailSection eyebrow="Revenue" title={selectedProfile.revenue.title}>
                    <p>{selectedProfile.revenue.body}</p>
                  </DetailSection>

                  <DetailSection eyebrow="Market Sense" title={selectedProfile.market.title}>
                    <p>{selectedProfile.market.body}</p>
                  </DetailSection>

                  <DetailSection eyebrow="Product" title={selectedProfile.product.title}>
                    <p>{selectedProfile.product.body}</p>
                  </DetailSection>
                </div>

                <div className="space-y-6">
                  <DetailSection eyebrow="Team" title={selectedProfile.team.title}>
                    <div className="flex flex-wrap gap-2">
                      {selectedStartup.founders.map((founder) => (
                        <span key={founder} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)", color: "var(--ink)" }}>
                          {founder}
                        </span>
                      ))}
                    </div>
                  </DetailSection>

                  <DetailSection eyebrow="Moat" title="Defensibility lens">
                    <p>{selectedProfile.moat}</p>
                  </DetailSection>

                  <DetailSection eyebrow="Risk" title="Research checks">
                    <ul className="ml-4 list-disc space-y-2">
                      {selectedProfile.risks.map((risk) => (
                        <li key={risk}>{risk}</li>
                      ))}
                    </ul>
                  </DetailSection>

                  <DetailSection eyebrow="More" title="Extra context">
                    <ul className="ml-4 list-disc space-y-2">
                      {selectedProfile.more.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </DetailSection>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
