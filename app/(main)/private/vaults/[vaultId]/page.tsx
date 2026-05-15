import { VaultsPage } from "@/components/vaults/vaults-page";

export default async function PrivateVaultDetailPage({
  params,
}: {
  params: Promise<{ vaultId: string }>;
}) {
  const { vaultId } = await params;
  return <VaultsPage scope="private" vaultId={vaultId} />;
}
