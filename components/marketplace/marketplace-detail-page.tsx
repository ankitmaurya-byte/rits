"use client";

import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { ShoppingCart, Truck, Video } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";

export function MarketplaceDetailPage({ slug }: { slug: string }) {
  const { user } = useUser();
  const product = useQuery(api.marketplace.getProductBySlug, { slug });
  const addToCart = useMutation(api.marketplace.addToCart);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      toast.error("Sign in to add products to cart.");
      return;
    }
    try {
      await addToCart({ productId: product._id, quantity: 1 });
      toast.success("Added to cart.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add to cart.");
    }
  };

  if (product === undefined) {
    return <div className="page-container"><div className="skeleton h-96 rounded-3xl" /></div>;
  }

  if (!product) {
    return <div className="page-container"><div className="feature-card p-10 text-center text-sm" style={{ color: "var(--charcoal)" }}>Product not found.</div></div>;
  }

  return (
    <div className="page-container animate-fade-in-up space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <section className="feature-card p-5">
          <div className="grid gap-4">
            <div className="relative h-[420px] overflow-hidden rounded-3xl" style={{ backgroundColor: "var(--surface-deep)" }}>
              {product.coverImageUrl ? <Image src={product.coverImageUrl} alt={product.title} fill className="object-cover" unoptimized /> : null}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {product.imageUrls.slice(0, 3).map((url) => (
                <div key={url} className="relative h-28 overflow-hidden rounded-2xl" style={{ backgroundColor: "var(--surface-deep)" }}>
                  <Image src={url} alt={product.title} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="feature-card p-5 space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>{product.category}</p>
            <h1 className="mt-2 text-3xl font-medium" style={{ color: "var(--ink)" }}>{product.title}</h1>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--body)" }}>{product.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => <span key={tag} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)", color: "var(--mute)" }}>{tag}</span>)}
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
            <p className="text-3xl font-semibold" style={{ color: "var(--ink)" }}>{product.formattedPrice}</p>
            <p className="mt-2 text-sm" style={{ color: "var(--charcoal)" }}>{product.quickCommerceEnabled ? `${product.quickCommerceEtaMinutes ?? 30} minute delivery available in ${product.shippingCity ?? "supported cities"}` : `${product.inventoryCount} in stock`}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Seller</p>
              <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>{product.seller?.name ?? "Marketplace seller"}</p>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Delivery</p>
              <p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>{product.quickCommerceEnabled ? <span className="inline-flex items-center gap-2"><Truck size={14} /> Quick commerce</span> : "Standard shipping"}</p>
            </div>
          </div>
          {product.videoUrls.length ? (
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
              <p className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}><Video size={14} /> Product videos</p>
              <div className="space-y-2">
                {product.videoUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-sm" style={{ color: "var(--accent-blue)" }}>{url}</a>)}
              </div>
            </div>
          ) : null}
          <button type="button" onClick={() => void handleAddToCart()} className="btn-primary w-full"><ShoppingCart size={15} /> Add to cart</button>
        </section>
      </div>
    </div>
  );
}
