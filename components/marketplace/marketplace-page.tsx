"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Search, ShoppingCart, Truck, Zap } from "lucide-react";
import { toast } from "sonner";

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
    <article className="overflow-hidden rounded-[24px] border transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
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
      <div className="relative z-10 space-y-6">
        <section className="feature-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--mute)" }}>Marketplace</p>
              <h1 className="text-3xl font-medium" style={{ color: "var(--ink)" }}>Buy and sell tech products with marketplace and quick-commerce support.</h1>
              <p className="mt-3 text-sm leading-7" style={{ color: "var(--body)" }}>Upload devices, gadgets, creator tools, AI hardware, and tech accessories. Flag instant-delivery inventory for quick commerce.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/marketplace/cart" className="btn-outline"><ShoppingCart size={15} /> Cart</Link>
              <Link href="/marketplace/sell" className="btn-primary"><Zap size={15} /> Sell product</Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="feature-card p-4"><p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Published</p><p className="mt-2 text-2xl font-semibold" style={{ color: "var(--ink)" }}>{products.length}</p></div>
          <div className="feature-card p-4"><p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Quick commerce</p><p className="mt-2 text-2xl font-semibold" style={{ color: "var(--ink)" }}>{quickCount}</p></div>
          <div className="feature-card p-4"><p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>Payments</p><p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>Stripe checkout ready</p></div>
        </section>

        <section className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex h-11 flex-1 items-center rounded-2xl border" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--charcoal)" }} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, categories, tags" className="h-full w-full bg-transparent pl-11 pr-4 text-sm outline-none" style={{ color: "var(--ink)" }} />
          </div>
          <button type="button" onClick={() => setQuickOnly((value) => !value)} className="btn-outline h-11 px-4">
            <Truck size={15} /> {quickOnly ? "Showing quick only" : "All delivery modes"}
          </button>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {products.length ? products.map((product) => <ProductCard key={product._id} product={product} onAddToCart={() => void handleAddToCart(product._id)} />) : <div className="feature-card col-span-full p-10 text-center text-sm" style={{ color: "var(--charcoal)" }}>No products found yet.</div>}
        </section>
      </div>
    </div>
  );
}
