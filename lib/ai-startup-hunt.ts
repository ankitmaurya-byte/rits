export type StartupPricing = "Free" | "Freemium" | "Paid" | "Open Source";

export type StartupItem = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logo: string;
  websiteUrl: string;
  categories: string[];
  pricing: StartupPricing;
  founderName: string;
  launchDate: string;
  votes: number;
  commentsCount: number;
  media: string[];
  createdAt: string;
};

export type StartupComment = {
  id: string;
  startupId: string;
  parentId?: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  votes: number;
  createdAt: string;
};

export type FounderThread = {
  id: string;
  title: string;
  authorName: string;
  votes: number;
  commentsCount: number;
  createdAt: string;
};

export const STARTUP_STORAGE_KEY = "rits-ai-startup-hunt:startups";
export const STARTUP_VOTES_KEY = "rits-ai-startup-hunt:votes";
export const STARTUP_COMMENTS_KEY = "rits-ai-startup-hunt:comments";
export const STARTUP_BANNER_KEY = "rits-ai-startup-hunt:banner-dismissed";
export const STARTUP_NEWSLETTER_KEY = "rits-ai-startup-hunt:newsletter-signups";

const today = new Date();

function daysAgo(value: number) {
  const date = new Date(today);
  date.setDate(date.getDate() - value);
  return date.toISOString();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const startupCategories = [
  "AI Agents",
  "Developer Tools",
  "Marketing",
  "Productivity",
  "Finance",
  "Design",
  "SaaS",
  "Research",
  "Video",
  "Sales",
];

export const founderThreads: FounderThread[] = [
  { id: "t1", title: "How are founders pricing agent products in 2026?", authorName: "Maya Chen", votes: 84, commentsCount: 21, createdAt: daysAgo(0) },
  { id: "t2", title: "Best GTM playbook for AI devtools right now", authorName: "Rahul Singh", votes: 67, commentsCount: 18, createdAt: daysAgo(1) },
  { id: "t3", title: "Is open source still the best wedge for AI infra?", authorName: "Nina Park", votes: 59, commentsCount: 12, createdAt: daysAgo(2) },
  { id: "t4", title: "What retention metric matters most for copilots?", authorName: "Omar Idris", votes: 42, commentsCount: 9, createdAt: daysAgo(3) },
  { id: "t5", title: "Show us your launch-day dashboard stack", authorName: "Lena Ortiz", votes: 38, commentsCount: 14, createdAt: daysAgo(4) },
  { id: "t6", title: "Founders: what AI workflow users pay for fastest?", authorName: "Ethan Cole", votes: 35, commentsCount: 7, createdAt: daysAgo(6) },
];

export const baseComments: StartupComment[] = [
  { id: "c1", startupId: "vectorloop", authorName: "Ankit", text: "Strong positioning. The developer onboarding looks faster than most eval tools.", votes: 18, createdAt: daysAgo(0) },
  { id: "c2", startupId: "vectorloop", parentId: "c1", authorName: "Maya Chen", text: "Agree. The product story is much clearer than the average infra launch.", votes: 7, createdAt: daysAgo(0) },
  { id: "c3", startupId: "salesforge-ai", authorName: "Rahul S", text: "This feels like a real sales team wedge instead of another generic assistant.", votes: 11, createdAt: daysAgo(1) },
  { id: "c4", startupId: "framepilot", authorName: "Nina Park", text: "The motion design use case is compelling. Curious about retention after the novelty effect.", votes: 9, createdAt: daysAgo(5) },
];

export const sampleStartups: StartupItem[] = [
  {
    id: "vectorloop",
    slug: "vectorloop",
    name: "VectorLoop",
    tagline: "AI eval workflows for production RAG teams.",
    description: "VectorLoop helps AI product teams test retrieval quality, benchmark prompts, and monitor regressions with clear run history and team-ready analysis.",
    logo: "VL",
    websiteUrl: "https://vectorloop.ai",
    categories: ["AI Agents", "Developer Tools", "Research"],
    pricing: "Freemium",
    founderName: "Maya Chen",
    launchDate: daysAgo(0),
    votes: 184,
    commentsCount: 12,
    media: ["Eval dashboards", "Prompt reports", "Regression insights"],
    createdAt: daysAgo(0),
  },
  {
    id: "salesforge-ai",
    slug: "salesforge-ai",
    name: "SalesForge AI",
    tagline: "Prospecting copilots for fast-moving B2B teams.",
    description: "SalesForge AI turns CRM notes, call transcripts, and web context into prospecting sequences, objection handling prep, and territory insights.",
    logo: "SF",
    websiteUrl: "https://salesforge.ai",
    categories: ["Sales", "AI Agents", "SaaS"],
    pricing: "Paid",
    founderName: "Rahul Singh",
    launchDate: daysAgo(0),
    votes: 151,
    commentsCount: 9,
    media: ["Lead summaries", "Outbound sequences", "CRM sync"],
    createdAt: daysAgo(0),
  },
  {
    id: "ledgerbeam",
    slug: "ledgerbeam",
    name: "LedgerBeam",
    tagline: "Finance ops automation for startup controllers.",
    description: "LedgerBeam automates monthly close workflows, flags anomalies, and keeps finance teams ahead of reporting bottlenecks.",
    logo: "LB",
    websiteUrl: "https://ledgerbeam.com",
    categories: ["Finance", "Productivity", "SaaS"],
    pricing: "Paid",
    founderName: "Ethan Cole",
    launchDate: daysAgo(0),
    votes: 118,
    commentsCount: 6,
    media: ["Close checklist", "Variance alerts"],
    createdAt: daysAgo(0),
  },
  {
    id: "foundersignal",
    slug: "foundersignal",
    name: "FounderSignal",
    tagline: "AI startup intelligence built for founders and operators.",
    description: "FounderSignal tracks launches, category movements, pricing patterns, and founder sentiment across the AI startup ecosystem.",
    logo: "FS",
    websiteUrl: "https://foundersignal.io",
    categories: ["Research", "Startups", "Productivity"],
    pricing: "Freemium",
    founderName: "Nina Park",
    launchDate: daysAgo(0),
    votes: 95,
    commentsCount: 4,
    media: ["Trend radar", "Category maps"],
    createdAt: daysAgo(0),
  },
  {
    id: "codepilot-studio",
    slug: "codepilot-studio",
    name: "CodePilot Studio",
    tagline: "Build internal AI tools without rewriting your stack.",
    description: "CodePilot Studio gives engineering teams a fast way to wrap internal docs, APIs, and workflows into task-specific AI apps.",
    logo: "CP",
    websiteUrl: "https://codepilot.studio",
    categories: ["Developer Tools", "AI Agents", "Open Source"],
    pricing: "Open Source",
    founderName: "Lena Ortiz",
    launchDate: daysAgo(1),
    votes: 133,
    commentsCount: 13,
    media: ["Connectors", "Workflow builder"],
    createdAt: daysAgo(1),
  },
  {
    id: "briefmesh",
    slug: "briefmesh",
    name: "BriefMesh",
    tagline: "Turn research chaos into startup-ready briefs.",
    description: "BriefMesh converts interviews, links, memos, and CRM fragments into crisp internal briefs teams can act on.",
    logo: "BM",
    websiteUrl: "https://briefmesh.app",
    categories: ["Productivity", "Research", "SaaS"],
    pricing: "Freemium",
    founderName: "Ava Kim",
    launchDate: daysAgo(1),
    votes: 104,
    commentsCount: 5,
    media: ["Brief generation", "Source linking"],
    createdAt: daysAgo(1),
  },
  {
    id: "mailmint-ai",
    slug: "mailmint-ai",
    name: "MailMint AI",
    tagline: "AI-first lifecycle marketing for lean teams.",
    description: "MailMint AI generates campaign variants, maps user states, and helps startup growth teams move faster with smaller headcount.",
    logo: "MM",
    websiteUrl: "https://mailmint.ai",
    categories: ["Marketing", "Productivity", "SaaS"],
    pricing: "Freemium",
    founderName: "Derek Hall",
    launchDate: daysAgo(1),
    votes: 87,
    commentsCount: 3,
    media: ["Lifecycle maps", "Campaign drafts"],
    createdAt: daysAgo(1),
  },
  {
    id: "framepilot",
    slug: "framepilot",
    name: "FramePilot",
    tagline: "Generate product motion design from rough product intent.",
    description: "FramePilot helps design teams create polished motion studies, demo cuts, and launch visuals from product specs and wireframes.",
    logo: "FP",
    websiteUrl: "https://framepilot.design",
    categories: ["Design", "Video", "AI Agents"],
    pricing: "Paid",
    founderName: "Ivy Brooks",
    launchDate: daysAgo(5),
    votes: 126,
    commentsCount: 15,
    media: ["Motion generation", "Demo scenes"],
    createdAt: daysAgo(5),
  },
  {
    id: "docrelay",
    slug: "docrelay",
    name: "DocRelay",
    tagline: "Agent-ready document pipelines for enterprise teams.",
    description: "DocRelay ingests docs, cleans structure, enriches metadata, and prepares enterprise knowledge for search and agent workflows.",
    logo: "DR",
    websiteUrl: "https://docrelay.ai",
    categories: ["Developer Tools", "Research", "AI Agents"],
    pricing: "Paid",
    founderName: "Omar Idris",
    launchDate: daysAgo(6),
    votes: 119,
    commentsCount: 8,
    media: ["Parsing pipeline", "Metadata extraction"],
    createdAt: daysAgo(6),
  },
  {
    id: "sprintpilot",
    slug: "sprintpilot",
    name: "SprintPilot",
    tagline: "AI sprint planning for product and engineering leads.",
    description: "SprintPilot translates roadmap context, bugs, and launch goals into suggested sprint plans and weekly execution summaries.",
    logo: "SP",
    websiteUrl: "https://sprintpilot.dev",
    categories: ["Productivity", "Developer Tools", "SaaS"],
    pricing: "Freemium",
    founderName: "Mina Patel",
    launchDate: daysAgo(7),
    votes: 109,
    commentsCount: 6,
    media: ["Sprint plans", "Weekly recaps"],
    createdAt: daysAgo(7),
  },
  {
    id: "vidprompt",
    slug: "vidprompt",
    name: "VidPrompt",
    tagline: "Prompt-to-demo videos for startup launches.",
    description: "VidPrompt helps startup teams generate launch videos and product explainers without a full in-house motion workflow.",
    logo: "VP",
    websiteUrl: "https://vidprompt.ai",
    categories: ["Video", "Marketing", "Design"],
    pricing: "Freemium",
    founderName: "Jordan Lee",
    launchDate: daysAgo(10),
    votes: 94,
    commentsCount: 4,
    media: ["Launch trailers", "Explainers"],
    createdAt: daysAgo(10),
  },
  {
    id: "stackaudit",
    slug: "stackaudit",
    name: "StackAudit",
    tagline: "AI software buying intelligence for startup CTOs.",
    description: "StackAudit helps teams review SaaS stack overlap, renewal risks, and underused product spend using internal workspace context.",
    logo: "SA",
    websiteUrl: "https://stackaudit.io",
    categories: ["Finance", "Developer Tools", "SaaS"],
    pricing: "Paid",
    founderName: "Neil Carter",
    launchDate: daysAgo(12),
    votes: 89,
    commentsCount: 7,
    media: ["Spend review", "Overlap analysis"],
    createdAt: daysAgo(12),
  },
  {
    id: "agentgraph",
    slug: "agentgraph",
    name: "AgentGraph",
    tagline: "Visual orchestration for multi-agent product workflows.",
    description: "AgentGraph helps product and platform teams build composable AI workflows with visibility into state, tools, and handoffs.",
    logo: "AG",
    websiteUrl: "https://agentgraph.ai",
    categories: ["AI Agents", "Developer Tools", "Open Source"],
    pricing: "Open Source",
    founderName: "Priya Desai",
    launchDate: daysAgo(14),
    votes: 142,
    commentsCount: 19,
    media: ["Flow editor", "Observability"],
    createdAt: daysAgo(14),
  },
  {
    id: "foundrycrm",
    slug: "foundrycrm",
    name: "FoundryCRM",
    tagline: "AI-native CRM for startup revenue teams.",
    description: "FoundryCRM keeps pipeline context fresh by auto-summarizing interactions, extracting risks, and suggesting next actions.",
    logo: "FC",
    websiteUrl: "https://foundrycrm.com",
    categories: ["Sales", "Productivity", "SaaS"],
    pricing: "Paid",
    founderName: "Sasha Reed",
    launchDate: daysAgo(16),
    votes: 76,
    commentsCount: 5,
    media: ["Pipeline health", "Meeting summaries"],
    createdAt: daysAgo(16),
  },
  {
    id: "launchscope",
    slug: "launchscope",
    name: "LaunchScope",
    tagline: "Market visibility for startup launches and category shifts.",
    description: "LaunchScope maps product launches, market response, and category saturation so startup teams can choose better timing and messaging.",
    logo: "LS",
    websiteUrl: "https://launchscope.ai",
    categories: ["Research", "Marketing", "Startups"],
    pricing: "Free",
    founderName: "Harper Jin",
    launchDate: daysAgo(18),
    votes: 68,
    commentsCount: 4,
    media: ["Market tracker", "Narrative shifts"],
    createdAt: daysAgo(18),
  },
  {
    id: "briefforge",
    slug: "briefforge",
    name: "BriefForge",
    tagline: "Pitch, memo, and research deck generation for startup teams.",
    description: "BriefForge helps founders and operators turn rough notes into polished memos, decks, and investor-ready communication assets.",
    logo: "BF",
    websiteUrl: "https://briefforge.app",
    categories: ["Productivity", "Design", "SaaS"],
    pricing: "Freemium",
    founderName: "Camila Roe",
    launchDate: daysAgo(21),
    votes: 91,
    commentsCount: 11,
    media: ["Deck drafts", "Memo builder"],
    createdAt: daysAgo(21),
  },
  {
    id: "signalops",
    slug: "signalops",
    name: "SignalOps",
    tagline: "AI ops command center for support and product signals.",
    description: "SignalOps turns support transcripts and product telemetry into prioritized product signals and ops recommendations.",
    logo: "SO",
    websiteUrl: "https://signalops.io",
    categories: ["AI Agents", "Productivity", "Research"],
    pricing: "Paid",
    founderName: "Leo Grant",
    launchDate: daysAgo(24),
    votes: 73,
    commentsCount: 6,
    media: ["Signal clustering", "Ops actions"],
    createdAt: daysAgo(24),
  },
  {
    id: "gridmemo",
    slug: "gridmemo",
    name: "GridMemo",
    tagline: "Visual notes for operators who think in systems.",
    description: "GridMemo gives founders and operators a visual note layer to connect ideas, tasks, and market observations faster.",
    logo: "GM",
    websiteUrl: "https://gridmemo.app",
    categories: ["Productivity", "Design", "Startups"],
    pricing: "Free",
    founderName: "Sana Malik",
    launchDate: daysAgo(26),
    votes: 64,
    commentsCount: 3,
    media: ["Graph notes", "Connected context"],
    createdAt: daysAgo(26),
  },
  {
    id: "copilotlane",
    slug: "copilotlane",
    name: "CopilotLane",
    tagline: "Embedded copilots for SaaS workflows with audit trails.",
    description: "CopilotLane helps product teams ship secure embedded AI assistants with policy controls and user-level auditability.",
    logo: "CL",
    websiteUrl: "https://copilotlane.ai",
    categories: ["AI Agents", "Developer Tools", "SaaS"],
    pricing: "Paid",
    founderName: "Victor Hale",
    launchDate: daysAgo(28),
    votes: 112,
    commentsCount: 17,
    media: ["Embedded AI", "Audit logs"],
    createdAt: daysAgo(28),
  },
  {
    id: "promptdock",
    slug: "promptdock",
    name: "PromptDock",
    tagline: "Prompt versioning and release workflows for product teams.",
    description: "PromptDock lets teams collaborate on prompts, compare outputs, and ship model behavior updates with more confidence.",
    logo: "PD",
    websiteUrl: "https://promptdock.dev",
    categories: ["Developer Tools", "AI Agents", "Open Source"],
    pricing: "Open Source",
    founderName: "Milo Quinn",
    launchDate: daysAgo(29),
    votes: 107,
    commentsCount: 14,
    media: ["Version history", "Release diffs"],
    createdAt: daysAgo(29),
  },
];

export function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getSectionedStartups(startups: StartupItem[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = startOfToday - 24 * 60 * 60 * 1000;
  const weekStart = startOfToday - 7 * 24 * 60 * 60 * 1000;
  const monthStart = startOfToday - 30 * 24 * 60 * 60 * 1000;

  const sortByVotes = (items: StartupItem[]) => [...items].sort((a, b) => b.votes - a.votes);

  return {
    today: sortByVotes(startups.filter((item) => new Date(item.launchDate).getTime() >= startOfToday)),
    yesterday: sortByVotes(startups.filter((item) => {
      const time = new Date(item.launchDate).getTime();
      return time >= yesterdayStart && time < startOfToday;
    })),
    week: sortByVotes(startups.filter((item) => {
      const time = new Date(item.launchDate).getTime();
      return time >= weekStart && time < yesterdayStart;
    })),
    month: sortByVotes(startups.filter((item) => {
      const time = new Date(item.launchDate).getTime();
      return time >= monthStart && time < weekStart;
    })),
  };
}

export function buildSubmittedStartup(values: {
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  logo: string;
  categories: string[];
  founderName: string;
  pricing: StartupPricing;
  media: string[];
}): StartupItem {
  const slug = slugify(values.name);
  const now = new Date().toISOString();
  return {
    id: `${slug}-${Date.now()}`,
    slug,
    name: values.name.trim(),
    tagline: values.tagline.trim(),
    description: values.description.trim(),
    logo: values.logo.trim() || values.name.trim().slice(0, 2).toUpperCase(),
    websiteUrl: values.websiteUrl.trim(),
    categories: values.categories,
    pricing: values.pricing,
    founderName: values.founderName.trim(),
    launchDate: now,
    votes: 1,
    commentsCount: 0,
    media: values.media.filter(Boolean),
    createdAt: now,
  };
}
