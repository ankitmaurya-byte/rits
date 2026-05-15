import { CalendarRange, Github, PlugZap, Slack } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function IntegrationsPage() {
  return (
    <HardcodedHubPage
      eyebrow="Integrations"
      title="Connect the systems around your startup workflow"
      description="This hard-coded integrations hub frames how Rits will ingest context from email, calendar, Meet, Slack, GitHub, Drive, Notion, and other external tools."
      accent="var(--primary)"
      primaryActions={[
        { href: "/research/files", label: "Drive and docs", description: "Prepare for file ingestion and folder intelligence.", icon: PlugZap },
        { href: "/explore/github-tools", label: "GitHub", description: "Route repo signals into research and startup monitoring.", icon: Github },
        { href: "/notes", label: "Meeting notes", description: "Link future calendar or Meet insights to workspace notes.", icon: CalendarRange },
        { href: "/vaults", label: "Save external context", description: "Vaults will become the home for integrated intelligence.", icon: Slack },
      ]}
      panels={[
        { title: "Planned connectors", description: "Gmail, Calendar, Meet, Slack, GitHub, Notion, Drive, Linear, Jira, and other execution tools.", metric: "Connectors" },
        { title: "AI value", description: "Extract investor conversations, meeting context, tasks, deadlines, code velocity, and startup opportunities from connected systems.", metric: "Context" },
      ]}
    />
  );
}
