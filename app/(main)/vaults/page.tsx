import { FolderKanban, Lock, Users } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function VaultsPage() {
  return (
    <HardcodedHubPage
      eyebrow="Vaults"
      title="Private and workspace vaults"
      description="Vaults now live inside personal and workspace scope instead of a separate sticky section. Use them to group durable knowledge while also surfacing uploaded note images and saved file or link resources."
      accent="var(--accent-green)"
      primaryActions={[
        { href: "/private/vaults", label: "Private vaults", description: "Keep personal collections, uploads, and assets visible only to you.", icon: Lock },
        { href: "/workspace/vaults", label: "Workspace vaults", description: "Shared vaults are available only to workspace members.", icon: Users },
        { href: "/private/resources", label: "Private resources", description: "Saved files and links also surface inside private vaults.", icon: FolderKanban },
        { href: "/workspace/resources", label: "Workspace resources", description: "Workspace vault pages show team-level assets and links.", icon: FolderKanban },
      ]}
      panels={[
        { title: "Scope-aware access", description: "Private vaults stay personal. Workspace vaults only appear for selected workspace members, so teams share assets without opening them to everyone else.", metric: "Scoped" },
        { title: "Uploads surface here", description: "Images uploaded through notes and saved file or link resources are surfaced directly on the vault pages so media remains visible in one place.", metric: "Assets" },
      ]}
    />
  );
}
