import { FolderKanban, LibraryBig, Newspaper, Users } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function VaultsPage() {
  return (
    <HardcodedHubPage
      eyebrow="Vaults"
      title="Curated knowledge spaces for startup intelligence"
      description="Vaults are the long-term memory system of Rits: collections that combine links, files, notes, AI chat, saved research, startup profiles, events, and market monitoring."
      accent="var(--accent-green)"
      primaryActions={[
        { href: "/vaults/startups", label: "Startup vaults", description: "Track startups, founders, funding, competitors, and internal notes.", icon: FolderKanban },
        { href: "/vaults/ai-tools", label: "AI tools vault", description: "Curate repos, docs, tutorials, and comparisons.", icon: LibraryBig },
        { href: "/vaults/markets", label: "Market vaults", description: "Keep industry trends, research, and ecosystem snapshots together.", icon: Newspaper },
        { href: "/chats", label: "Vault chats", description: "Future shared AI conversations attached to each vault.", icon: Users },
      ]}
      panels={[
        { title: "Vault anatomy", description: "Every vault should eventually include notes, AI chat, files, links, resources, tags, members, and an activity feed.", metric: "Knowledge OS" },
        { title: "Why vaults matter", description: "This is the strongest bridge between one-off research and reusable startup intelligence. It is how Rits becomes a system, not a scratchpad.", metric: "Strategic" },
      ]}
    />
  );
}
