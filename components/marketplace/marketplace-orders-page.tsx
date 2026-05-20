"use client";

import { useQuery } from "convex/react";
import Image from "next/image";
import { Package, Truck, CheckCircle2, Clock, Ban } from "lucide-react";

import { api } from "@/convex/_generated/api";

function StatusBadge({ status, type }: { status: string, type: "payment" | "fulfillment" }) {
  if (type === "payment") {
    switch (status) {
      case "paid": return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[rgba(17,255,153,0.1)] text-[var(--accent-green)] border border-[rgba(17,255,153,0.22)]">Paid</span>;
      case "pending": return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[rgba(255,197,61,0.1)] text-[var(--accent-yellow)] border border-[rgba(255,197,61,0.22)]">Pending</span>;
      case "failed": return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[rgba(255,32,71,0.1)] text-[var(--accent-red)] border border-[rgba(255,32,71,0.22)]">Failed</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[var(--surface-deep)] text-[var(--charcoal)] border border-[var(--hairline)]">{status}</span>;
    }
  } else {
    switch (status) {
      case "delivered": return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[rgba(17,255,153,0.1)] text-[var(--accent-green)] border border-[rgba(17,255,153,0.22)] flex items-center gap-1"><CheckCircle2 size={10} /> Delivered</span>;
      case "shipped": return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[rgba(59,158,255,0.1)] text-[var(--accent-blue)] border border-[rgba(59,158,255,0.22)] flex items-center gap-1"><Truck size={10} /> Shipped</span>;
      case "processing": return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[rgba(255,197,61,0.1)] text-[var(--accent-yellow)] border border-[rgba(255,197,61,0.22)] flex items-center gap-1"><Package size={10} /> Processing</span>;
      case "cancelled": return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[rgba(255,32,71,0.1)] text-[var(--accent-red)] border border-[rgba(255,32,71,0.22)] flex items-center gap-1"><Ban size={10} /> Cancelled</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[var(--surface-deep)] text-[var(--charcoal)] border border-[var(--hairline)] flex items-center gap-1"><Clock size={10} /> {status}</span>;
    }
  }
}

export function MarketplaceOrdersPage() {
  const orders = useQuery(api.marketplace.listBuyerOrders, {}) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        {orders.length ? orders.map((order) => (
          <section key={order._id} className="feature-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b pb-4 mb-4" style={{ borderColor: "var(--hairline)" }}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Order from {order.seller?.name ?? "Marketplace seller"}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-deep)] text-[var(--mute)]">ID: {order._id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.paymentStatus} type="payment" />
                  <StatusBadge status={order.fulfillmentStatus} type="fulfillment" />
                  <span className="text-xs font-medium ml-2" style={{ color: "var(--ink)" }}>{order.formattedTotal}</span>
                </div>
              </div>
              <div className="text-xs text-right" style={{ color: "var(--mute)" }}>
                <p>Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                <p className="mt-1">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            
            <div className="grid gap-3 md:grid-cols-2">
              {order.items.map((item) => (
                <div key={item._id} className="rounded-xl border p-3 flex items-center gap-4 transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                  <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden" style={{ backgroundColor: "var(--surface-card)" }}>
                    {item.coverImageUrl ? <Image src={item.coverImageUrl} alt={item.titleSnapshot} fill className="object-cover" unoptimized /> : <div className="absolute inset-0 flex items-center justify-center"><Package size={20} style={{ color: "var(--mute)" }} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{item.titleSnapshot}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs" style={{ color: "var(--charcoal)" }}>Qty: {item.quantity}</p>
                      <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>INR {(item.priceInPaise / 100).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-4 sm:justify-between text-xs" style={{ borderColor: "var(--hairline-strong)" }}>
              <div>
                <p className="font-medium mb-1" style={{ color: "var(--ink)" }}>Shipping Details</p>
                <p style={{ color: "var(--charcoal)" }}>{order.shippingName}</p>
                <p style={{ color: "var(--mute)" }} className="truncate max-w-[250px]">{order.shippingAddress}, {order.shippingCity}</p>
              </div>
              {order.quickCommerce && (
                <div className="bg-[rgba(17,255,153,0.05)] border border-[rgba(17,255,153,0.2)] rounded-lg p-2 flex items-start gap-2 max-w-[200px]">
                  <Clock size={14} className="mt-0.5 shrink-0" style={{ color: "var(--accent-green)" }} />
                  <p className="text-[10px]" style={{ color: "var(--accent-green)" }}>Quick Commerce order. Expected within minutes of confirmation.</p>
                </div>
              )}
            </div>
          </section>
        )) : <div className="feature-card p-10 text-center text-sm" style={{ color: "var(--charcoal)" }}>No orders yet.</div>}
      </div>
    </div>
  );
}
