"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Search, ShoppingCart, Truck, Zap, Minus, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { MarketplaceSellPage } from "./marketplace-sell-page";
import { MarketplaceOrdersPage } from "./marketplace-orders-page";
import { MarketplaceDetailPage } from "./marketplace-detail-page";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
  _creationTime: number;
};

function ProductCard({
  product,
  cartItem,
  onAddToCart,
  onUpdateQuantity,
  onRemove,
}: {
  product: MarketplaceListItem;
  cartItem?: { _id: string; quantity: number };
  onAddToCart: () => void;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[12px] border transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)] flex flex-col h-full" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-card)" }}>
      <Link href={`?product=${product.slug}`} className="block shrink-0" scroll={false}>
        <div className="relative h-52 w-full overflow-hidden" style={{ backgroundColor: "var(--surface-deep)" }}>
          {product.coverImageUrl ? <Image src={product.coverImageUrl} alt={product.title} fill className="object-cover" unoptimized /> : null}
        </div>
      </Link>
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>{product.category}</p>
            <Link href={`?product=${product.slug}`} className="mt-2 block text-lg font-medium" style={{ color: "var(--ink)" }} scroll={false}>{product.title}</Link>
          </div>
          {product.quickCommerceEnabled ? <span className="shrink-0 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em]" style={{ borderColor: "rgba(17,255,153,0.22)", color: "var(--accent-green)" }}>Quick</span> : null}
        </div>
        <p className="line-clamp-3 text-sm leading-6 mb-4" style={{ color: "var(--charcoal)" }}>{product.shortDescription || product.description}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4 border-t" style={{ borderColor: "var(--hairline)" }}>
          <div>
            <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{product.formattedPrice}</p>
            <p className="text-xs mt-1" style={{ color: "var(--mute)" }}>{product.quickCommerceEnabled ? `${product.quickCommerceEtaMinutes ?? 30} min delivery` : `${product.inventoryCount} in stock`}</p>
          </div>
          {cartItem ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => cartItem.quantity > 1 ? onUpdateQuantity(cartItem.quantity - 1) : onRemove()} className="btn-outline px-2">
                {cartItem.quantity > 1 ? <Minus size={14} /> : <Trash2 size={14} style={{ color: "var(--accent-red)" }} />}
              </button>
              <span className="min-w-[20px] text-center text-sm font-medium" style={{ color: "var(--ink)" }}>{cartItem.quantity}</span>
              <button type="button" onClick={() => onUpdateQuantity(cartItem.quantity + 1)} disabled={cartItem.quantity >= product.inventoryCount} title={cartItem.quantity >= product.inventoryCount ? "Max stock reached" : ""} className={`btn-outline px-2 ${cartItem.quantity >= product.inventoryCount ? "opacity-50 cursor-not-allowed" : ""}`}>
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={onAddToCart} className="btn-primary"><ShoppingCart size={15} /> Add</button>
          )}
        </div>
      </div>
    </article>
  );
}

export function MarketplacePage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const activeTab = (searchParams?.get("tab") as "shop" | "sell" | "orders") || "shop";
  const productSlug = searchParams?.get("product");
  
  const [quickOnly, setQuickOnly] = useState(false);
  const search = searchParams?.get("q") || "";
  const aiSearch = searchParams?.get("ai") || "";
  const productsQuery = useQuery(api.marketplace.listProducts, { search: search.trim() || undefined, quickOnly });
  const products = productsQuery ?? [];
  const cart = useQuery(api.marketplace.getCart, {});
  const addToCart = useMutation(api.marketplace.addToCart);
  const updateQuantity = useMutation(api.marketplace.updateCartItemQuantity);
  const removeCartItem = useMutation(api.marketplace.removeCartItem);

  const [category, setCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("new");

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (category && category !== "all") {
      result = result.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (maxPrice) {
      const priceVal = parseInt(maxPrice);
      if (!isNaN(priceVal)) result = result.filter(p => p.priceInPaise <= priceVal * 100);
    }
    if (sort === "new") result.sort((a,b) => b._creationTime - a._creationTime);
    if (sort === "price_asc") result.sort((a,b) => a.priceInPaise - b.priceInPaise);
    if (sort === "price_desc") result.sort((a,b) => b.priceInPaise - a.priceInPaise);
    if (sort === "popular" || sort === "rated") result.sort((a,b) => a.inventoryCount - b.inventoryCount);

    if (aiSearch) {
      // Very basic client-side AI filtering simulation for demo purposes
      const query = aiSearch.toLowerCase();
      result = result.filter(p => {
        const haystack = [p.title, p.category, p.description, p.shortDescription].join(" ").toLowerCase();
        // Allow fuzzy matching or broad keyword searching to simulate an AI context
        const keywords = query.split(" ").filter(k => k.length > 2);
        return keywords.some(k => haystack.includes(k));
      });
    }

    return result;
  }, [products, category, maxPrice, sort, aiSearch]);

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
    <div className="space-y-8">
      {/* Tab Content */}
        {activeTab === "shop" && (
          <div className="flex flex-col md:flex-row gap-6 animate-fade-in items-start">
            {/* Sidebar Filter */}
            <aside className="w-full md:w-64 flex-shrink-0 space-y-4 md:sticky md:top-24 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar">
              <div className="feature-card p-4 space-y-4">
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Filters</p>

                <button type="button" onClick={() => setQuickOnly((value) => !value)} className={`w-full flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${quickOnly ? "bg-[var(--accent-green)] text-black border-transparent" : ""}`} style={{ borderColor: quickOnly ? "transparent" : "var(--hairline)", color: quickOnly ? "#000" : "var(--ink)" }}>
                  <Truck size={14} /> {quickOnly ? "Quick Delivery" : "All Delivery"}
                </button>

                <div className="pt-4 border-t space-y-4" style={{ borderColor: "var(--hairline)" }}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: "var(--charcoal)" }}>Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}>
                      <option value="all">All categories</option>
                      <option value="laptop">Laptops</option>
                      <option value="phone">Phones</option>
                      <option value="tablet">Tablets</option>
                      <option value="audio">Audio</option>
                      <option value="accessories">Accessories</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: "var(--charcoal)" }}>Sort by</label>
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}>
                      <option value="new">Newest Arrivals</option>
                      <option value="popular">Most Popular</option>
                      <option value="rated">Top Rated</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: "var(--charcoal)" }}>Max Price (INR)</label>
                    <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="e.g. 50000" className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--hairline)", color: "var(--ink)" }} />
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Feed (Reddit style infinite scroll view) */}
            <main className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.length ? filteredProducts.map((product) => {
                  const cartItem = cart?.items.find((item) => item.product._id === product._id);
                  return (
                    <ProductCard 
                      key={product._id} 
                      product={product} 
                      cartItem={cartItem}
                      onAddToCart={() => void handleAddToCart(product._id)} 
                      onUpdateQuantity={(quantity) => cartItem && void updateQuantity({ cartItemId: cartItem._id, quantity })}
                      onRemove={() => cartItem && void removeCartItem({ cartItemId: cartItem._id })}
                    />
                  );
                }) : <div className="py-16 text-center text-sm" style={{ color: "var(--charcoal)" }}>No tech products found yet.</div>}
              </div>
            </main>
          </div>
        )}

        {activeTab === "sell" && <MarketplaceSellPage />}
        {activeTab === "orders" && <MarketplaceOrdersPage />}

        <Dialog open={!!productSlug} onOpenChange={(open) => { if (!open) { const params = new URLSearchParams(searchParams?.toString() ?? ""); params.delete("product"); router.push(params.toString() ? `?${params.toString()}` : "/marketplace", { scroll: false }); } }}>
          <DialogContent overlayClassName="bg-black/60 backdrop-blur-sm" className="w-full sm:max-w-5xl p-0 overflow-hidden border-[var(--hairline)] max-h-[90vh]" style={{ backgroundColor: "var(--canvas)" }}>
            <DialogTitle className="sr-only">Product Details</DialogTitle>
            <div className="overflow-y-auto max-h-[90vh] p-6">
              {productSlug && <MarketplaceDetailPage slug={productSlug} />}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
