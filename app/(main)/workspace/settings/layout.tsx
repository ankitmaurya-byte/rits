import { WorkspaceSettingsShell } from "@/components/workspace/workspace-settings-shell";

export default function WorkspaceSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceSettingsShell>{children}</WorkspaceSettingsShell>;
}
