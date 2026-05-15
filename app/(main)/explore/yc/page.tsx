import { Building2, Filter, Layers3, Rocket } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function YcExplorePage() {
  return (
    <HardcodedHubPage
      eyebrow="Explore / YC"
      title="YC company explorer"
      description="A hard-coded preview of how YC exploration should look inside Rits: batch views, founder signals, startup summaries, saved notes, competitor maps, and AI analysis lanes."
      accent="var(--accent-orange)"
      primaryActions={[
        { href: "/startups", label: "Open current directory", description: "Use the existing startup directory as the temporary master feed.", icon: Building2 },
        { href: "/research/link-analysis", label: "Analyze company URL", description: "Send a startup website into the research pipeline.", icon: Rocket },
        { href: "/vaults/startups", label: "Save to startup vault", description: "Pin batches, startups, and notes into a curated vault.", icon: Layers3 },
        { href: "/research/competitors", label: "Compare competitors", description: "Generate competitor views and market positioning from YC entries.", icon: Filter },
      ]}
      panels={[
        {
          title: "Views to implement later",
          description: "Batch filters, industry slices, AI-first founders, B2B SaaS cohorts, fintech maps, and team-saved watchlists.",
          metric: "Batches",
        },
        {
          title: "Profile structure",
          description: "Each startup profile should eventually show founders, description, website, funding hints, inferred stack, competitor set, internal notes, and saved research history.",
          metric: "Profiles",
        },
      ]}
    />
  );
}
