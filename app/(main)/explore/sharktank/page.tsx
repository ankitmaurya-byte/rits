import { BadgeDollarSign, BarChart3, Lightbulb, Tv } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function SharkTankExplorePage() {
  return (
    <HardcodedHubPage
      eyebrow="Explore / Shark Tank"
      title="Shark Tank outcome explorer"
      description="A visual shell for founder pitches, investor decisions, post-show outcomes, and AI commentary on why startups won, stalled, or turned into durable companies."
      accent="var(--accent-blue)"
      primaryActions={[
        { href: "/research/reports", label: "Pitch summaries", description: "Save AI-generated episode or company reports.", icon: Tv },
        { href: "/research/competitors", label: "Outcome comparisons", description: "Compare Shark Tank companies against modern category leaders.", icon: BarChart3 },
        { href: "/ideas", label: "Fork ideas", description: "Turn promising concepts into saved product ideas.", icon: Lightbulb },
        { href: "/vaults/markets", label: "Store sectors", description: "Keep sector-level lessons in a market vault.", icon: BadgeDollarSign },
      ]}
      panels={[
        { title: "Episode intelligence", description: "Episode cards should expose deal size, investors, founder story, traction snapshots, and why the panel reacted the way it did.", metric: "Deals" },
        { title: "AI insights", description: "Rits should later generate success signals, failure patterns, comparable startups, and market openings from each pitch.", metric: "Insights" },
      ]}
    />
  );
}
