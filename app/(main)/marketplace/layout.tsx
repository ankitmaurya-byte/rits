import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="absolute right-0 top-0 h-[360px] w-[560px] pointer-events-none" style={{ background: "radial-gradient(circle at top right, var(--accent-green) 0%, transparent 70%)", opacity: 0.12 }} />
      <div className="relative z-10">
        <MarketplaceHeader />
        {children}
      </div>
    </div>
  );
}
