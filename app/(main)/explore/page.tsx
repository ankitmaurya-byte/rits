import { Bot, Compass, Flame, Rocket, SearchCode, Telescope } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function ExplorePage() {
  return (
    <HardcodedHubPage
      eyebrow="Explorer"
      title="Discover startups, tools, and ecosystems before everyone else."
      description="This hard-coded Explore surface frames Rits as the discovery layer of your startup OS: YC companies, Shark Tank outcomes, GitHub tools, AI startups, and trend-driven research collections."
      accent="var(--accent-orange)"
      primaryActions={[
        { href: "/explore/yc", label: "YC explorer", description: "Browse batches, sectors, founder patterns, and startup profiles.", icon: Rocket },
        { href: "/explore/sharktank", label: "Shark Tank", description: "Review pitch histories, investor signals, and outcome analysis.", icon: Telescope },
        { href: "/explore/github-tools", label: "GitHub tools", description: "Track agent frameworks, indie repos, and tool ecosystems.", icon: SearchCode },
      ]}
      panels={[
        {
          eyebrow: "Signals",
          title: "What Explore should surface",
          description: "The goal is not a static directory. It is a startup intelligence graph that connects categories, companies, repos, competitors, and opportunities.",
          metric: "6 feeds",
          actions: [
            { href: "/explore/ai-startups", label: "AI startups", description: "Curated AI-native companies, categories, and execution patterns.", icon: Bot },
            { href: "/startups", label: "Startup directory", description: "Use the current directory as the general discovery feed until richer explorers ship.", icon: Compass },
          ],
        },
        {
          eyebrow: "Saved research",
          title: "Explorer-to-research handoff",
          description: "Every card here should eventually connect into research reports, saved notes, vault entries, and AI-led startup analysis. For now, these routes establish the shell.",
          metric: "Ready",
          actions: [
            { href: "/research", label: "Open Research", description: "Turn an explored company or repo into a saved analysis flow.", icon: Flame },
            { href: "/vaults", label: "Open Vaults", description: "Save discoveries into curated knowledge collections.", icon: Compass },
          ],
        },
      ]}
    />
  );
}
