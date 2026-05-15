import { VaultsPage } from "@/components/vaults/vaults-page";

export default async function WorkspaceVaultDetailPage({
  params,
}: {
  params: Promise<{ vaultId: string }>;
}) {
  const { vaultId } = await params;
  return <VaultsPage scope="workspace" vaultId={vaultId} />;
}
