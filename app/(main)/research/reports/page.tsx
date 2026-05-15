import { FileCheck2, PanelsTopLeft, ScrollText, Sparkles } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function ResearchReportsPage() {
  return (
    <HardcodedHubPage
      eyebrow="Research / Reports"
      title="AI reports, structured research docs, and saved analysis"
      description="A placeholder page for report views generated from links, files, repos, and startup profiles. This is the long-form analysis layer of the product."
      accent="var(--accent-blue)"
      primaryActions={[
        { href: "/research/link-analysis", label: "New analysis", description: "Start from a URL or startup profile.", icon: Sparkles },
        { href: "/research/files", label: "Folder report", description: "Generate a structured output from a file collection.", icon: PanelsTopLeft },
        { href: "/notes", label: "Save notes", description: "Convert report sections into durable notes.", icon: ScrollText },
        { href: "/vaults", label: "Save to vault", description: "Store polished reports into curated intelligence hubs.", icon: FileCheck2 },
      ]}
      panels={[
        { title: "Report schema", description: "Problem, market, solution, business model, TAM/SAM/SOM, distribution, risks, and MVP plan.", metric: "Schema" },
        { title: "AI controls", description: "Expand, rewrite, generate risks, generate GTM, compare alternatives, and propose execution plans.", metric: "Assist" },
      ]}
    />
  );
}
