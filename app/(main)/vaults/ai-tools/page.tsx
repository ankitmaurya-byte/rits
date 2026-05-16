import { Blocks, Bot, FolderGit2, GraduationCap } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function AiToolsVaultsPage() {
  return (
    <HardcodedHubPage
      eyebrow="Vaults / AI Tools"
      title="AI tools vault"
      description="A curated home for models, repos, frameworks, tutorials, comparisons, and your own internal notes on the AI tooling landscape."
      accent="var(--accent-blue)"
      primaryActions={[
        { href: "/explore/open-source", label: "Open tech feed", description: "Track builder conversations, product signals, and technical discussion.", icon: FolderGit2 },
        { href: "/explore/github-tools", label: "Track frameworks", description: "Maintain a watchlist of agent and developer tooling.", icon: Blocks },
        { href: "/research/reports", label: "Store AI analyses", description: "Save deep comparisons and summary reports.", icon: Bot },
        { href: "/private/resources", label: "Keep references", description: "Preserve docs, videos, and learning material.", icon: GraduationCap },
      ]}
      panels={[
        { title: "Why this matters", description: "AI tool research moves fast. Vaults give you a place to maintain evolving context across repos, startups, and documentation.", metric: "Fast-moving" },
        { title: "Future depth", description: "Expect repo graphs, tutorials, implementation notes, alternatives, and startup use cases to all land here later.", metric: "Curated" },
      ]}
    />
  );
}
