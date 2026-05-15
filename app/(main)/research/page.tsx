import { FileSearch, FolderSearch, Globe2, Rocket, ScanSearch, Sparkles } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function ResearchPage() {
  return (
    <HardcodedHubPage
      eyebrow="Research"
      title="Turn links, files, and messy startup context into structured intelligence."
      description="This hard-coded Research surface frames the future analysis system: URL analysis, file and folder intelligence, competitor scans, AI reports, and generated MVP planning."
      accent="var(--accent-blue)"
      primaryActions={[
        { href: "/research/link-analysis", label: "Link analysis", description: "Paste a company, repo, video, PDF, or docs URL for AI analysis.", icon: Globe2 },
        { href: "/research/files", label: "Files and folders", description: "Explore Drive, docs, pitch decks, and research folders.", icon: FolderSearch },
        { href: "/research/competitors", label: "Competitors", description: "Build market maps, rival sets, and category comparisons.", icon: ScanSearch },
        { href: "/research/mvp-lab", label: "MVP lab", description: "Transform research into landing pages, MVP specs, and product scaffolds.", icon: Rocket },
      ]}
      panels={[
        {
          eyebrow: "AI modes",
          title: "Research agents to add later",
          description: "Research agent, market agent, builder agent, and workspace-aware AI should all plug into this system. For now this page creates the product shell and CTAs.",
          metric: "4 modes",
          actions: [
            { href: "/research/reports", label: "AI reports", description: "Open the placeholder reports surface for structured analysis views.", icon: Sparkles },
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
