"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";

export function MarketplaceCartPage() {
  const cart = useQuery(api.marketplace.getCart, {});
  const upsellProducts = useQuery(api.marketplace.getUpsellProducts, {});
  const contacts = useQuery(api.marketplace.listContacts, {});
  const addContactMutation = useMutation(api.marketplace.addContact);
  const updateQuantity = useMutation(api.marketplace.updateCartItemQuantity);
  const removeCartItem = useMutation(api.marketplace.removeCartItem);
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [saveAsNewContact, setSaveAsNewContact] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const handleSelectContact = (contact: any) => {
    setSelectedContactId(contact._id);
    setShippingName(contact.name);
    setShippingPhone(contact.phone || "");
    setShippingCity(contact.city);
    setShippingAddress(contact.address);
    setSaveAsNewContact(false);
  };

  const handleCheckout = async () => {
    if (!shippingName.trim() || !shippingCity.trim() || !shippingAddress.trim()) {
      toast.error("Shipping name, city, and address are required.");
      return;
    }

    if (saveAsNewContact) {
      try {
        await addContactMutation({
          name: shippingName,
          phone: shippingPhone || undefined,
          city: shippingCity,
          address: shippingAddress,
        });
      } catch (err) {
        // Silently fail contact save if it throws
      }
    }

    setCheckingOut(true);
    try {
      const response = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingName, shippingPhone, shippingCity, shippingAddress }),
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
    <div className="space-y-6">
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
                  <button type="button" onClick={() => item.quantity > 1 ? void updateQuantity({ cartItemId: item._id, quantity: item.quantity - 1 }) : void removeCartItem({ cartItemId: item._id })} className="btn-outline px-2">
                    {item.quantity > 1 ? <Minus size={14} /> : <Trash2 size={14} style={{ color: "var(--accent-red)" }} />}
                  </button>
                  <span className="min-w-[20px] text-center text-sm font-medium" style={{ color: "var(--ink)" }}>{item.quantity}</span>
                  <button type="button" onClick={() => void updateQuantity({ cartItemId: item._id, quantity: item.quantity + 1 })} disabled={item.quantity >= item.product.inventoryCount} title={item.quantity >= item.product.inventoryCount ? "Max stock reached" : ""} className={`btn-outline px-2 ${item.quantity >= item.product.inventoryCount ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <Plus size={14} />
                  </button>
                  <button type="button" onClick={() => void removeCartItem({ cartItemId: item._id })} className="btn-ghost ml-2 text-xs h-7 px-3">Remove</button>
                </div>
              </div>
            </div>
          )) : <div className="feature-card p-10 text-center text-sm" style={{ color: "var(--charcoal)" }}>Your cart is empty.</div>}
        </div>

        <div className="feature-card p-5 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium" style={{ color: "var(--ink)" }}>Checkout</h2>
            <Link href="/marketplace" className="text-sm" style={{ color: "var(--accent-blue)" }}>Order history</Link>
          </div>

          {/* Contact Selector */}
          {contacts && contacts.length > 0 && (
            <div className="space-y-2 mb-2">
              <label className="text-xs font-medium" style={{ color: "var(--charcoal)" }}>Saved Contacts</label>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {contacts.map((contact) => (
                  <button 
                    key={contact._id} 
                    type="button"
                    onClick={() => handleSelectContact(contact)}
                    className={`flex-shrink-0 text-left rounded-xl border p-3 min-w-[140px] transition-colors ${selectedContactId === contact._id ? "border-[var(--ink)] bg-[var(--surface-elevated)]" : "hover:bg-[var(--surface-elevated)]"}`}
                    style={{ borderColor: selectedContactId === contact._id ? "var(--ink)" : "var(--hairline)" }}
                  >
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{contact.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--charcoal)" }}>{contact.city}</p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContactId(null);
                    setShippingName("");
                    setShippingPhone("");
                    setShippingCity("");
                    setShippingAddress("");
                    setSaveAsNewContact(true);
                  }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center rounded-xl border border-dashed p-3 min-w-[100px] transition-colors hover:bg-[var(--surface-elevated)]`}
                  style={{ borderColor: "var(--hairline-strong)" }}
                >
                  <Plus size={16} className="mb-1" style={{ color: "var(--charcoal)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--charcoal)" }}>New</span>
                </button>
              </div>
            </div>
          )}

          <input value={shippingName} onChange={(e) => { setShippingName(e.target.value); setSelectedContactId(null); }} className="input-field" placeholder="Shipping name" />
          <input value={shippingPhone} onChange={(e) => { setShippingPhone(e.target.value); setSelectedContactId(null); }} className="input-field" placeholder="Phone number" />
          <input value={shippingCity} onChange={(e) => { setShippingCity(e.target.value); setSelectedContactId(null); }} className="input-field" placeholder="City for delivery validation" />
          <textarea value={shippingAddress} onChange={(e) => { setShippingAddress(e.target.value); setSelectedContactId(null); }} className="input-field min-h-[100px] resize-y" placeholder="Shipping address" />
          
          {!selectedContactId && (
            <label className="flex items-center gap-2 cursor-pointer mt-2 group">
              <input type="checkbox" checked={saveAsNewContact} onChange={(e) => setSaveAsNewContact(e.target.checked)} className="peer sr-only" />
              <div className="w-4 h-4 rounded-sm border flex items-center justify-center transition-colors peer-checked:bg-[var(--ink)] peer-checked:border-[var(--ink)]" style={{ borderColor: "var(--charcoal)" }}>
                {saveAsNewContact && <Minus size={10} style={{ color: "var(--canvas)" }} />}
              </div>
              <span className="text-xs transition-colors group-hover:text-[var(--ink)]" style={{ color: "var(--charcoal)" }}>Save as a new contact for future orders</span>
            </label>
          )}
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mute)" }}>Subtotal</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--ink)" }}>{cart?.formattedSubtotal ?? "INR 0.00"}</p>
          </div>
          <button type="button" onClick={() => void handleCheckout()} disabled={checkingOut || !cart?.items.length} className="btn-primary w-full">
            {checkingOut ? "Redirecting..." : "Pay with Stripe"}
          </button>

          <div className="mt-4 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-elevated)" }}>
            <div className="text-xs" style={{ color: "var(--charcoal)" }}>
              <p className="font-medium mb-0.5" style={{ color: "var(--ink)" }}>Stripe Test Card</p>
              <p>For testing payments</p>
            </div>
            <button 
              type="button" 
              onClick={() => { 
                navigator.clipboard.writeText("4000003560000008"); 
                toast.success("Card number copied!"); 
              }}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-card)]"
              style={{ backgroundColor: "var(--surface-deep)", color: "var(--ink)", border: "1px solid var(--hairline-strong)" }}
              title="Click to copy"
            >
              4000 0035 6000 0008
            </button>
          </div>
        </div>
      </div>

      {/* Upsell / Cross-sell Products */}
      {upsellProducts?.length ? (
        <section className="feature-card p-5 mt-6">
          <h2 className="text-lg font-medium mb-4" style={{ color: "var(--ink)" }}>You might also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {upsellProducts.map(p => (
              <Link href={`/marketplace/${p.slug}`} key={p._id} className="block group">
                <div className="relative h-32 rounded-xl overflow-hidden mb-2" style={{ backgroundColor: "var(--surface-deep)" }}>
                  {p.coverImageUrl ? <Image src={p.coverImageUrl} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform" /> : null}
                </div>
                <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{p.title}</p>
                <p className="text-xs" style={{ color: "var(--charcoal)" }}>{p.formattedPrice}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
