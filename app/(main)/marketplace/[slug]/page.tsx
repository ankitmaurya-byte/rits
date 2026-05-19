import { MarketplaceDetailPage } from "@/components/marketplace/marketplace-detail-page";

export default async function MarketplaceDetailRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <MarketplaceDetailPage slug={slug} />;
}
