import { Code2, LayoutTemplate, Rocket, WandSparkles } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function MvpLabPage() {
  return (
    <HardcodedHubPage
      eyebrow="Research / MVP Lab"
      title="Generate MVPs, landing pages, and product specs"
      description="This hard-coded Builder surface represents where Rits turns research into execution: landing copy, product specs, waitlists, React scaffolds, and deployable startup assets."
      accent="var(--accent-orange)"
      primaryActions={[
        { href: "/ideas", label: "Choose idea", description: "Start from an existing idea to generate execution assets.", icon: Rocket },
        { href: "/research/reports", label: "Use research report", description: "Feed analyzed context into the builder flow.", icon: WandSparkles },
        { href: "/notes", label: "Write spec", description: "Open notes for generated product requirements and task breakdowns.", icon: Code2 },
        { href: "/vaults/startups", label: "Save launch assets", description: "Store generated materials inside a startup vault.", icon: LayoutTemplate },
      ]}
      panels={[
        { title: "Assets to generate", description: "Hero copy, pricing, feature tables, FAQs, waitlists, pitch docs, feature specs, and Next.js landing skeletons.", metric: "Builder" },
        { title: "Future integrations", description: "Later this should connect to GitHub repo creation, coding agents, and deployment flows.", metric: "Deploy" },
      ]}
    />
  );
}
