"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

export function MarketplaceOrdersPage() {
  const orders = useQuery(api.marketplace.listBuyerOrders, {}) ?? [];

  return (
    <div className="page-container animate-fade-in-up space-y-6">
      <section className="feature-card p-5">
        <h1 className="text-2xl font-medium" style={{ color: "var(--ink)" }}>Order history</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--charcoal)" }}>Track payments, fulfillment, and quick-commerce deliveries for your purchases.</p>
      </section>

      <div className="space-y-4">
        {orders.length ? orders.map((order) => (
          <section key={order._id} className="feature-card p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{order.seller?.name ?? "Marketplace seller"}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--charcoal)" }}>{order.formattedTotal} · payment {order.paymentStatus} · fulfillment {order.fulfillmentStatus}</p>
              </div>
              <div className="text-xs" style={{ color: "var(--mute)" }}>{new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {order.items.map((item) => (
                <div key={item._id} className="rounded-2xl border p-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-deep)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{item.titleSnapshot}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--charcoal)" }}>Qty {item.quantity} · INR {(item.priceInPaise / 100).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </section>
        )) : <div className="feature-card p-10 text-center text-sm" style={{ color: "var(--charcoal)" }}>No orders yet.</div>}
      </div>
    </div>
  );
}
