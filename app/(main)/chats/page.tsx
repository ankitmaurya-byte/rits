import { Bot, MessagesSquare, Users2, Workflow } from "lucide-react";
import { HardcodedHubPage } from "@/components/product/hardcoded-hub";

export default function ChatsPage() {
  return (
    <HardcodedHubPage
      eyebrow="Chats"
      title="Shared AI conversations for startup work"
      description="This placeholder page positions chats as more than a floating assistant: workspace-aware threads connected to ideas, notes, files, research, and startup execution context."
      accent="var(--accent-blue)"
      primaryActions={[
        { href: "/dashboard", label: "Workspace overview", description: "Anchor chat usage back to the operating dashboard.", icon: Workflow },
        { href: "/research", label: "Research chats", description: "Use AI threads as the narrative layer around analysis.", icon: Bot },
        { href: "/vaults", label: "Vault chats", description: "Attach shared AI context to curated collections later.", icon: MessagesSquare },
        { href: "/workspace/members", label: "Team context", description: "Shared chats should eventually support workspace collaboration and mentions.", icon: Users2 },
      ]}
      panels={[
        { title: "Planned abilities", description: "Workspace threads, mentions, AI memory, report-aware prompts, startup analysis discussions, and task extraction.", metric: "Threads" },
        { title: "Why this matters", description: "If Rits becomes the startup OS, chat becomes the conversational layer over all other objects, not a detached chatbot.", metric: "AI layer" },
      ]}
    />
  );
}
