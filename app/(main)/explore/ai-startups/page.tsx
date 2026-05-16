import { Bot, Compass, Radar, TrendingUp } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function AiStartupsExplorePage() {
  return (
    <HardcodedHubPage
      eyebrow="Explore / AI Startups"
      title="AI startup tracker"
      description="A placeholder explorer for AI-native companies, categories, product patterns, and trends that matter to startup builders and researchers."
      accent="var(--accent-blue)"
      primaryActions={[
        { href: "/research/reports", label: "AI startup reports", description: "Save summaries, opportunities, and risk scans.", icon: Bot },
        { href: "/roadmap", label: "Opportunity roadmap", description: "Turn patterns into structured product and execution paths.", icon: TrendingUp },
        { href: "/vaults/markets", label: "Market vault", description: "Keep AI sector notes, links, and competitor maps together.", icon: Compass },
        { href: "/research/competitors", label: "Compare categories", description: "Inspect crowded vs. open AI segments.", icon: Radar },
      ]}
      panels={[
        { title: "Category intelligence", description: "Later this page can branch into horizontal assistants, vertical copilots, agent infra, models, evaluation tooling, and distribution patterns.", metric: "AI maps" },
        { title: "Signal collection", description: "The goal is a living radar, not a static list: track momentum, clones, funding narratives, and buildable gaps.", metric: "Signals" },
      ]}
    />
  );
}
