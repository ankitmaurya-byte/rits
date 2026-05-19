"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";

export function MarketplaceCartPage() {
  const cart = useQuery(api.marketplace.getCart, {});
  const updateQuantity = useMutation(api.marketplace.updateCartItemQuantity);
  const removeCartItem = useMutation(api.marketplace.removeCartItem);
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  const handleCheckout = async () => {
    if (!shippingName.trim() || !shippingAddress.trim()) {
      toast.error("Shipping name and address are required.");
      return;
    }
    setCheckingOut(true);
    try {
      const response = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingName, shippingPhone, shippingAddress }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Checkout failed.");
      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="page-container animate-fade-in-up space-y-6">
      <section className="feature-card p-5">
        <div className="flex items-center gap-3">
          <ShoppingCart size={18} style={{ color: "var(--accent-orange)" }} />
          <h1 className="text-2xl font-medium" style={{ color: "var(--ink)" }}>Cart and checkout</h1>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {cart === undefined ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-32 rounded-2xl" />) : cart.items.length ? cart.items.map((item) => (
            <div key={item._id} className="feature-card flex items-center gap-4 p-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl" style={{ backgroundColor: "var(--surface-deep)" }}>
                {item.product.coverImageUrl ? <Image src={item.product.coverImageUrl} alt={item.product.title} fill className="object-cover" unoptimized /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium" style={{ color: "var(--ink)" }}>{item.product.title}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--charcoal)" }}>{item.product.formattedPrice}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => void updateQuantity({ cartItemId: item._id, quantity: item.quantity - 1 })} className="btn-outline"><Minus size={14} /></button>
                  <span className="min-w-8 text-center text-sm" style={{ color: "var(--ink)" }}>{item.quantity}</span>
                  <button type="button" onClick={() => void updateQuantity({ cartItemId: item._id, quantity: item.quantity + 1 })} className="btn-outline"><Plus size={14} /></button>
                  <button type="button" onClick={() => void removeCartItem({ cartItemId: item._id })} className="btn-outline ml-2 text-xs">Remove</button>
                </div>
              </div>
            </div>
          )) : <div className="feature-card p-10 text-center text-sm" style={{ color: "var(--charcoal)" }}>Your cart is empty.</div>}
        </div>

        <div className="feature-card p-5 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <h2 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Checkout</h2>
          <input value={shippingName} onChange={(event) => setShippingName(event.target.value)} className="input-field" placeholder="Shipping name" />
          <input value={shippingPhone} onChange={(event) => setShippingPhone(event.target.value)} className="input-field" placeholder="Phone number" />
          <textarea value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} className="input-field min-h-[120px] resize-y" placeholder="Shipping address" />
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Subtotal</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--ink)" }}>{cart?.formattedSubtotal ?? "INR 0.00"}</p>
          </div>
          <button type="button" onClick={() => void handleCheckout()} disabled={checkingOut || !cart?.items.length} className="btn-primary w-full">
            {checkingOut ? "Redirecting..." : "Pay with Stripe"}
          </button>
        </div>
      </div>
    </div>
  );
}
