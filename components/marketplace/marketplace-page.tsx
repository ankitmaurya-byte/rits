"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Search, ShoppingCart, Truck, Zap } from "lucide-react";
import { toast } from "sonner";

import { MarketplaceSellPage } from "./marketplace-sell-page";
import { MarketplaceOrdersPage } from "./marketplace-orders-page";
import { api } from "@/convex/_generated/api";

type MarketplaceListItem = {
  _id: string;
  slug: string;
  title: string;
  category: string;
  shortDescription?: string;
  description: string;
  coverImageUrl?: string;
  formattedPrice: string;
  quickCommerceEnabled: boolean;
  quickCommerceEtaMinutes?: number;
  inventoryCount: number;
};

function ProductCard({
  product,
  onAddToCart,
}: {
  product: MarketplaceListItem;
  onAddToCart: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[12px] border transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
      <Link href={`/marketplace/${product.slug}`} className="block">
        <div className="relative h-52 w-full overflow-hidden" style={{ backgroundColor: "var(--surface-deep)" }}>
          {product.coverImageUrl ? <Image src={product.coverImageUrl} alt={product.title} fill className="object-cover" unoptimized /> : null}
        </div>
      </Link>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>{product.category}</p>
            <Link href={`/marketplace/${product.slug}`} className="mt-2 block text-lg font-medium" style={{ color: "var(--ink)" }}>{product.title}</Link>
          </div>
          {product.quickCommerceEnabled ? <span className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em]" style={{ borderColor: "rgba(17,255,153,0.22)", color: "var(--accent-green)" }}>Quick</span> : null}
        </div>
        <p className="line-clamp-3 text-sm leading-6" style={{ color: "var(--charcoal)" }}>{product.shortDescription || product.description}</p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{product.formattedPrice}</p>
            <p className="text-xs" style={{ color: "var(--mute)" }}>{product.quickCommerceEnabled ? `${product.quickCommerceEtaMinutes ?? 30} min delivery` : `${product.inventoryCount} in stock`}</p>
          </div>
          <button type="button" onClick={onAddToCart} className="btn-primary"><ShoppingCart size={15} /> Add</button>
        </div>
      </div>
    </article>
  );
}

export function MarketplacePage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"shop" | "sell" | "orders">("shop");
  const [search, setSearch] = useState("");
  const [quickOnly, setQuickOnly] = useState(false);
  const productsQuery = useQuery(api.marketplace.listProducts, { search: search.trim() || undefined, quickOnly });
  const products = productsQuery ?? [];
  const addToCart = useMutation(api.marketplace.addToCart);

  const quickCount = useMemo(() => products.filter((product) => product.quickCommerceEnabled).length, [products]);

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      toast.error("Sign in to add products to cart.");
      return;
    }
    try {
      await addToCart({ productId: productId as never, quantity: 1 });
      toast.success("Added to cart.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add to cart.");
    }
  };

  return (
    <div className="page-container animate-fade-in-up relative">
      <div className="absolute right-0 top-0 h-[360px] w-[560px] pointer-events-none" style={{ background: "radial-gradient(circle at top right, var(--accent-green) 0%, transparent 70%)", opacity: 0.12 }} />
      <div className="relative z-10 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b pb-6" style={{ borderColor: "var(--hairline-strong)" }}>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>Amazon Tech Equivalent</p>
            <h1 className="text-4xl md:text-5xl font-medium" style={{ fontFamily: "Domaine Display", color: "var(--ink)", letterSpacing: "-0.96px", fontFeatureSettings: "'ss01', 'liga'" }}>Marketplace.</h1>
            <p className="mt-3 text-sm max-w-xl leading-relaxed" style={{ color: "var(--charcoal)", fontFamily: "ABC Favorit" }}>Buy, sell, and manage tech products in one unified interface. Premium hardware and gadgets, delivered fast.</p>
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex p-1 rounded-full border" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
              {(["shop", "sell", "orders"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? "bg-white text-black" : "text-[var(--charcoal)] hover:text-[var(--ink)]"}`}
                  style={{ fontFamily: activeTab === tab ? "Inter" : "ABC Favorit" }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            {activeTab === "shop" && (
              <Link href="/marketplace/cart" className="btn-primary flex items-center gap-2">
                <ShoppingCart size={15} /> Cart
              </Link>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "shop" && (
          <div className="space-y-6 animate-fade-in">
            <section className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex h-11 flex-1 items-center rounded-lg border" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-card)" }}>
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--charcoal)" }} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search devices, accessories, AI hardware..." className="h-full w-full bg-transparent pl-11 pr-4 text-sm outline-none" style={{ color: "var(--ink)", fontFamily: "Inter" }} />
              </div>
              <button type="button" onClick={() => setQuickOnly((value) => !value)} className="btn-outline h-11 px-4">
                <Truck size={15} /> {quickOnly ? "Quick Commerce Only" : "All Delivery Modes"}
              </button>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {products.length ? products.map((product) => <ProductCard key={product._id} product={product} onAddToCart={() => void handleAddToCart(product._id)} />) : <div className="col-span-full py-16 text-center text-sm" style={{ color: "var(--charcoal)" }}>No tech products found yet.</div>}
            </section>
          </div>
        )}

        {activeTab === "sell" && <MarketplaceSellPage />}
        {activeTab === "orders" && <MarketplaceOrdersPage />}
      </div>
    </div>
  );
}
