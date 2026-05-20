import { Suspense } from "react";
import { MarketplacePage } from "@/components/marketplace/marketplace-page";

export default function MarketplaceRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: "var(--charcoal)" }}>Loading marketplace...</div>}>
      <MarketplacePage />
    </Suspense>
  );
}
