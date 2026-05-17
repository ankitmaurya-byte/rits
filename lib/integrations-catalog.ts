import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Briefcase,
  Calendar,
  FileText,
  FolderKanban,
  GitBranch,
  Globe,
  Mail,
  MessageSquareText,
  MessagesSquare,
  ShoppingCart,
  Video,
  Wallet,
  Webhook,
  Workflow,
} from "lucide-react";

export type IntegrationItem = {
  id: string;
  name: string;
  icon: LucideIcon;
  summary: string;
  category: string;
  status: "Coming soon";
  syncs: string[];
  value: string[];
  examples: string[];
};

export type IntegrationGroup = {
  id: string;
  title: string;
  description: string;
  metric: string;
  items: IntegrationItem[];
};

export const integrationGroups: IntegrationGroup[] = [
  {
    id: "workspace-research",
    title: "Workspace and research connectors",
    description: "Pull operating context from the systems teams already use every day.",
    metric: "Core",
    items: [
      { id: "gmail", name: "Gmail", icon: Mail, category: "Email and inbox", status: "Coming soon", summary: "Sync founder emails, partner conversations, and inbox context.", syncs: ["emails", "newsletter threads", "sales conversations", "founder replies"], value: ["turn email into notes", "extract follow-ups", "summarize conversations"], examples: ["Investor thread -> workspace note", "Founder inbox -> startup research brief"] },
      { id: "calendar", name: "Calendar", icon: Calendar, category: "Meetings", status: "Coming soon", summary: "Turn meetings into notes, prep docs, and follow-up tasks.", syncs: ["events", "attendees", "meeting metadata", "follow-up context"], value: ["auto prep docs", "meeting note generation", "next-step tracking"], examples: ["Customer call -> action list", "Weekly sync -> agenda + recap"] },
      { id: "slack", name: "Slack", icon: MessagesSquare, category: "Communication", status: "Coming soon", summary: "Capture team decisions, links, and async discussion context.", syncs: ["channels", "threads", "links", "decision snippets"], value: ["preserve team memory", "extract signals", "link research to chat"], examples: ["Launch thread -> startup note", "Support escalation -> todo"] },
      { id: "google-drive", name: "Google Drive", icon: FolderKanban, category: "Documents and knowledge", status: "Coming soon", summary: "Import decks, docs, research folders, and interview files.", syncs: ["docs", "slides", "folders", "transcripts"], value: ["search external docs", "use files in AI context", "organize research input"], examples: ["Research folder -> notes", "Deck library -> vault context"] },
      { id: "notion", name: "Notion", icon: FileText, category: "Knowledge", status: "Coming soon", summary: "Bring existing company docs and internal knowledge into Rits.", syncs: ["pages", "databases", "docs", "linked references"], value: ["migrate knowledge", "search old docs", "ground AI in historical context"], examples: ["Notion PRD -> roadmap", "Database notes -> research summary"] },
      { id: "zoom-meet", name: "Zoom / Meet", icon: Video, category: "Meetings", status: "Coming soon", summary: "Connect transcripts and call takeaways to research records.", syncs: ["transcripts", "recordings", "speakers", "meeting summaries"], value: ["convert calls into insights", "reduce note-taking load", "improve follow-up quality"], examples: ["User interview -> research memo", "Advisory call -> action items"] },
    ],
  },
  {
    id: "execution",
    title: "Execution systems",
    description: "Connect execution tools so research can turn into tracked action faster.",
    metric: "Build",
    items: [
      { id: "github", name: "GitHub", icon: GitBranch, category: "Developer systems", status: "Coming soon", summary: "Track repos, issue flow, and technical product momentum.", syncs: ["repos", "issues", "pull requests", "release activity"], value: ["technical trend tracking", "repo research", "execution visibility"], examples: ["Repo activity -> startup signal", "PR stream -> product velocity note"] },
      { id: "linear", name: "Linear", icon: Workflow, category: "Project management", status: "Coming soon", summary: "Translate findings into product execution and delivery planning.", syncs: ["issues", "cycles", "projects", "roadmaps"], value: ["research to execution", "faster prioritization", "shared planning"], examples: ["Competitor insight -> Linear issue", "Research theme -> sprint task"] },
      { id: "jira", name: "Jira", icon: Briefcase, category: "Enterprise execution", status: "Coming soon", summary: "Map enterprise task systems into roadmap and reporting layers.", syncs: ["tickets", "epics", "boards", "team workflows"], value: ["cross-team traceability", "enterprise planning visibility", "execution sync"], examples: ["Report insight -> Jira epic", "Roadmap step -> engineering issue"] },
      { id: "product-hunt", name: "Product Hunt", icon: ShoppingCart, category: "Launch discovery", status: "Coming soon", summary: "Monitor launches, ranks, and startup discovery signals.", syncs: ["launch listings", "votes", "comments", "categories"], value: ["startup discovery", "category monitoring", "launch research"], examples: ["Launch feed -> startup hunt", "Top comments -> product sentiment"] },
      { id: "hubspot", name: "HubSpot", icon: Banknote, category: "Revenue systems", status: "Coming soon", summary: "Add revenue and customer pipeline context into research.", syncs: ["contacts", "deals", "notes", "customer pipeline"], value: ["connect customer reality", "revenue-informed planning", "better GTM insight"], examples: ["Deal risk -> founder memo", "Pipeline trend -> market note"] },
      { id: "webhooks-api", name: "Webhooks / API", icon: Webhook, category: "Custom integrations", status: "Coming soon", summary: "Connect any internal or external system into Rits flows.", syncs: ["custom payloads", "events", "internal tools", "3rd-party apps"], value: ["no vendor lock-in", "connect anything", "automation-ready ingestion"], examples: ["Custom CRM -> Rits", "Internal analytics -> research dashboard"] },
    ],
  },
  {
    id: "market-finance",
    title: "Market and finance",
    description: "Use Rits as the context layer for broader intelligence, not just startup notes.",
    metric: "Signals",
    items: [
      { id: "trading-account", name: "Trading account", icon: Wallet, category: "Finance and trading", status: "Coming soon", summary: "Portfolio, watchlist, and market movement tied into research notes.", syncs: ["positions", "watchlists", "pnl snapshots", "market movements"], value: ["portfolio research", "decision journaling", "market-aware notes"], examples: ["Watchlist move -> thesis update", "Trading note -> research card"] },
      { id: "banking", name: "Banking", icon: Banknote, category: "Finance and trading", status: "Coming soon", summary: "Cash, spend, and finance snapshots connected to execution plans.", syncs: ["cash flow", "spend categories", "account snapshots", "finance metrics"], value: ["cash-aware planning", "resource allocation", "operating visibility"], examples: ["Spend spike -> action plan", "Finance summary -> workspace memo"] },
      { id: "social-and-web", name: "Social and web", icon: Globe, category: "Market signals", status: "Coming soon", summary: "X, LinkedIn, Reddit, and websites for market signal collection.", syncs: ["posts", "profiles", "threads", "web pages"], value: ["market discovery", "founder tracking", "sentiment research"], examples: ["Founder post -> insight", "Trend thread -> startup opportunity"] },
      { id: "crm-support", name: "CRM and support", icon: MessageSquareText, category: "Customer context", status: "Coming soon", summary: "Customer questions and objections becoming product research input.", syncs: ["tickets", "crm notes", "customer objections", "support history"], value: ["voice-of-customer research", "faster issue synthesis", "better prioritization"], examples: ["Support pain point -> roadmap item", "CRM objection -> pricing research"] },
    ],
  },
];

export const integrationOverviewCards = [
  { id: "email", title: "Email and inbox", description: "Gmail, newsletters, and support threads flowing into Rits context.", icon: Mail },
  { id: "docs", title: "Documents and knowledge", description: "Drive, Notion, docs, and cloud files becoming searchable research input.", icon: FolderKanban },
  { id: "dev", title: "Developer systems", description: "GitHub, Linear, Jira, and release velocity feeding research and execution.", icon: GitBranch },
  { id: "finance", title: "Finance and trading", description: "Brokerage, banking, revenue, and portfolio signals linked into analysis workflows.", icon: Wallet },
];

export const allIntegrations = integrationGroups.flatMap((group) => group.items);

export function getIntegrationById(id: string) {
  return allIntegrations.find((item) => item.id === id) ?? null;
}
