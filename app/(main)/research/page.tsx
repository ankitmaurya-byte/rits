import { FileSearch, FolderSearch, Layers3, Rocket, ScanSearch, Sparkles } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function ResearchPage() {
  return (
    <HardcodedHubPage
      eyebrow="Research"
      title="Turn anything into structured analysis and execution assets."
      description="Use one maintained analysis surface for links, files, docs, transcripts, notes, and mixed research context, then move the output into MVP generation and execution workflows."
      accent="var(--accent-blue)"
      primaryActions={[
        { href: "/research/reports", label: "Analysis", description: "Paste links, files, docs, notes, or any raw material into one unified analysis surface.", icon: Layers3 },
        { href: "/research/reports", label: "Analyze anything", description: "Run structured AI analysis across mixed source material in one place.", icon: FolderSearch },
        { href: "/research/competitors", label: "Competitors", description: "Build market maps, rival sets, and category comparisons.", icon: ScanSearch },
        { href: "/research/mvp-lab", label: "MVP lab", description: "Transform research into landing pages, MVP specs, and product scaffolds.", icon: Rocket },
      ]}
      panels={[
        {
          eyebrow: "AI modes",
            title: "Unified analysis flow",
            description: "Files and links no longer need separate analysis surfaces. Everything now routes into one maintained analysis layer with saved outputs.",
            metric: "4 modes",
            actions: [
             { href: "/research/reports", label: "Analysis", description: "Open the working analysis surface for structured AI output and saved reports.", icon: Sparkles },
             { href: "/chats", label: "Research chats", description: "Use shared AI conversations as the narrative layer over reports.", icon: FileSearch },
            ],
          },
        {
          eyebrow: "Save outputs",
          title: "Research should flow into the rest of Rits",
          description: "Every analysis should eventually connect to ideas, notes, tasks, vaults, and workspace chats so research becomes executable work.",
          metric: "Connected",
          actions: [
            { href: "/vaults", label: "Open Vaults", description: "Save reports and curated sources into vault collections.", icon: FolderSearch },
            { href: "/ideas", label: "Turn into idea", description: "Convert research into startup ideas or opportunity docs.", icon: Rocket },
          ],
        },
      ]}
    />
  );
}
