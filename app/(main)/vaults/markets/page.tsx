import { BarChart3, Globe2, Newspaper, ScanLine } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function MarketVaultsPage() {
  return (
    <HardcodedHubPage
      eyebrow="Vaults / Markets"
      title="Market intelligence vaults"
      description="A placeholder home for industry trends, sectors, category maps, startup signals, and AI-generated market opportunities."
      accent="var(--accent-green)"
      primaryActions={[
        { href: "/explore/ai-startups", label: "AI sector feed", description: "Track one fast-moving market deeply.", icon: Globe2 },
        { href: "/research/competitors", label: "Competitive maps", description: "Keep category comparisons and whitespace analysis.", icon: ScanLine },
        { href: "/research/reports", label: "Saved reports", description: "Store strategic industry analysis outputs.", icon: Newspaper },
        { href: "/roadmap", label: "Opportunity roadmap", description: "Turn vault insights into structured execution paths.", icon: BarChart3 },
      ]}
      panels={[
        { title: "What belongs here", description: "Industry trends, regulatory shifts, category winners, recurring risks, and long-term market theses.", metric: "Signals" },
        { title: "Team usage", description: "This is where a workspace can align around one market and build a shared understanding over time.", metric: "Shared" },
      ]}
    />
  );
}
