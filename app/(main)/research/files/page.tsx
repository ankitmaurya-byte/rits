import { FileStack, FolderSearch, Presentation, TableProperties } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function ResearchFilesPage() {
  return (
    <HardcodedHubPage
      eyebrow="Research / Files"
      title="Analyze folders, decks, docs, and startup files"
      description="A hard-coded shell for Google Drive, docs, PDFs, spreadsheets, and pitch folder analysis. This is where Rits becomes a knowledge explorer instead of only a notes app."
      accent="var(--accent-green)"
      primaryActions={[
        { href: "/vaults", label: "Open vaults", description: "Store curated folders, documents, and file intelligence together.", icon: FolderSearch },
        { href: "/integrations", label: "Connect integrations", description: "Later this will route into Drive, Dropbox, Notion, and GitHub.", icon: FileStack },
        { href: "/research/reports", label: "Generate report", description: "Turn a folder into a structured research output.", icon: Presentation },
        { href: "/notes", label: "Extract notes", description: "Move key file insights into durable workspace notes.", icon: TableProperties },
      ]}
      panels={[
        { title: "Planned file targets", description: "Pitch decks, investor updates, research PDFs, founder docs, product specs, repo folders, and spreadsheet packs.", metric: "Folder AI" },
        { title: "AI outputs", description: "Missing slides, weak metrics, investor readiness, risk scans, and data-backed startup recommendations.", metric: "Outputs" },
      ]}
    />
  );
}
