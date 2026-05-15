import { Cpu, Github, SearchCode, Workflow } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function GithubToolsExplorePage() {
  return (
    <HardcodedHubPage
      eyebrow="Explore / GitHub Tools"
      title="GitHub tools and agent framework radar"
      description="This hard-coded page frames Rits as a way to track trending repos, indie hacker tools, AI frameworks, and startup-ready infrastructure that teams can monitor over time."
      accent="var(--primary)"
      primaryActions={[
        { href: "/explore/open-source", label: "Open-source explorer", description: "Zoom out to broader repo ecosystems and alternatives.", icon: Github },
        { href: "/research/link-analysis", label: "Analyze repo", description: "Convert any GitHub link into a saved tool analysis.", icon: SearchCode },
        { href: "/research/mvp-lab", label: "Builder mode", description: "Turn a repo insight into an MVP or landing page brief.", icon: Workflow },
        { href: "/vaults/ai-tools", label: "AI tools vault", description: "Save frameworks, tutorials, and category notes.", icon: Cpu },
      ]}
      panels={[
        { title: "Tool categories", description: "Agent frameworks, devtools, frontend stacks, inference tooling, and startup accelerators should all become filterable categories later.", metric: "Categories" },
        { title: "Market opportunity layer", description: "Rits should eventually attach market analysis to repositories, not just technical summaries.", metric: "Opportunity" },
      ]}
    />
  );
}
