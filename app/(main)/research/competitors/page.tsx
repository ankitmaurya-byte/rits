import { Crosshair, Radar, Rows3, Swords } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function ResearchCompetitorsPage() {
  return (
    <HardcodedHubPage
      eyebrow="Research / Competitors"
      title="Map rivals, alternatives, and open market space"
      description="A structured shell for competitor comparison, category mapping, startup positioning, and AI-generated market opportunity summaries."
      accent="var(--primary)"
      primaryActions={[
        { href: "/explore/yc", label: "Compare YC companies", description: "Use explorer signals to build market maps.", icon: Rows3 },
        { href: "/explore/open-source", label: "Compare OSS tools", description: "Contrast repos, ecosystems, and product layers.", icon: Swords },
        { href: "/roadmap", label: "Build roadmap", description: "Turn whitespace into a structured product or learning roadmap.", icon: Crosshair },
        { href: "/vaults/markets", label: "Save market map", description: "Preserve competitor research in a market vault.", icon: Radar },
      ]}
      panels={[
        { title: "Views to add", description: "Matrix view, SWOT view, business model comparisons, pricing comparisons, feature wedges, and distribution patterns.", metric: "Comparison" },
        { title: "AI opportunity layer", description: "Rits should later suggest under-built segments and startup opportunities from crowded spaces.", metric: "Wedges" },
      ]}
    />
  );
}
