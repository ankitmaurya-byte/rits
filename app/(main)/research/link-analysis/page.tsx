import { BriefcaseBusiness, Globe2, Lightbulb, ShieldAlert } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function LinkAnalysisPage() {
  return (
    <HardcodedHubPage
      eyebrow="Research / Link Analysis"
      title="Paste a link, get startup-grade analysis"
      description="This page previews the future link analysis flow: summary, business model, competitors, tech assumptions, risks, and derivative startup ideas from any company, repo, PDF, video, or docs link."
      accent="var(--accent-orange)"
      primaryActions={[
        { href: "/research", label: "Research home", description: "Return to the broader research operating system.", icon: Globe2 },
        { href: "/ideas", label: "Propose idea", description: "Turn a link analysis into a saved startup idea.", icon: Lightbulb },
        { href: "/research/competitors", label: "Competitor view", description: "Jump into category-level comparisons and opportunity maps.", icon: BriefcaseBusiness },
        { href: "/vaults/startups", label: "Save to vault", description: "Keep company analyses and source links in a startup vault.", icon: ShieldAlert },
      ]}
      panels={[
        { title: "Planned tabs", description: "Summary, Business, Tech, Competitors, AI Ideas, Notes, Related Resources, and saved follow-up actions.", metric: "7 tabs" },
        { title: "Targets", description: "Startup websites, YC pages, GitHub repos, YouTube talks, PDFs, tweets, docs, and internal research links.", metric: "Any link" },
      ]}
    />
  );
}
