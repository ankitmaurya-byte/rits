import { BookMarked, BriefcaseBusiness, Building2, WalletCards } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function StartupVaultsPage() {
  return (
    <HardcodedHubPage
      eyebrow="Vaults / Startups"
      title="Startup vaults"
      description="A hard-coded shell for company intelligence collections: startup profiles, founders, funding, notes, competitors, AI reports, and saved execution plans."
      accent="var(--accent-orange)"
      primaryActions={[
        { href: "/explore/yc", label: "Save YC companies", description: "Seed startup vaults from explorer discoveries.", icon: Building2 },
        { href: "/research/link-analysis", label: "Analyze website", description: "Turn company links into saved intelligence.", icon: BriefcaseBusiness },
        { href: "/notes", label: "Add notes", description: "Capture founder calls, partner insights, and private thoughts.", icon: BookMarked },
        { href: "/integrations", label: "Connect signals", description: "Future email and calendar integrations will enrich vault records.", icon: WalletCards },
      ]}
      panels={[
        { title: "Key entities", description: "Founders, funding, links, competitors, analysis tabs, team notes, and AI-generated execution ideas.", metric: "Entities" },
        { title: "Use cases", description: "Track target companies, watchlist markets, investor research, or partner-facing startup collections.", metric: "Collections" },
      ]}
    />
  );
}
