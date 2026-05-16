import { BookOpen, FolderGit2, GitFork, Sparkles } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function OpenSourceExplorePage() {
  return (
    <HardcodedHubPage
      eyebrow="Explore / Open Source"
      title="Open-source ecosystem explorer"
      description="A hard-coded shell for the future OSS explorer: repository summaries, ecosystem graphs, architecture breakdowns, alternatives, tutorials, and startup ideas built on top of strong developer platforms."
      accent="var(--accent-green)"
      primaryActions={[
        { href: "/explore/github-tools", label: "GitHub tools", description: "Jump into practical tool and framework discovery.", icon: FolderGit2 },
        { href: "/research/link-analysis", label: "Analyze repo URL", description: "Turn a GitHub link into a research report shell.", icon: Sparkles },
        { href: "/roadmap", label: "Generate roadmap", description: "Turn strong repos into a structured build or learning roadmap.", icon: GitFork },
        { href: "/vaults/ai-tools", label: "Save to AI tools vault", description: "Curate repos and docs into a reusable vault.", icon: BookOpen },
      ]}
      panels={[
        { title: "Repo profile", description: "Later this should show stars, forks, architecture, alternatives, docs quality, and product opportunities unlocked by the repo.", metric: "Repos" },
        { title: "Idea engine", description: "This is one of the strongest future loops for Rits: discover a repo, understand it fast, and turn it into a business idea or MVP path.", metric: "Ideas" },
      ]}
    />
  );
}
