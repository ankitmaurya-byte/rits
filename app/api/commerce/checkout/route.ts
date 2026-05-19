import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function requireConfig() {
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
  if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    requireConfig();
    const body = (await request.json()) as {
      shippingName: string;
      shippingPhone?: string;
      shippingAddress: string;
      shippingCity: string;
    };

    const convex = new ConvexHttpClient(convexUrl!);
    const snapshot = await convex.query(api.marketplace.getCheckoutSnapshotByClerkId, { clerkId: userId });

    if (!snapshot || snapshot.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${request.nextUrl.origin}/marketplace/cart?checkout=success`);
    params.append("cancel_url", `${request.nextUrl.origin}/marketplace/cart?checkout=cancelled`);

    snapshot.items.forEach((item, index) => {
      params.append(`line_items[${index}][quantity]`, String(item.quantity));
      params.append(`line_items[${index}][price_data][currency]`, item.currency.toLowerCase());
      params.append(`line_items[${index}][price_data][unit_amount]`, String(item.priceInPaise));
      params.append(`line_items[${index}][price_data][product_data][name]`, item.title);
      if (item.coverImageUrl) {
        params.append(`line_items[${index}][price_data][product_data][images][0]`, item.coverImageUrl);
      }
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey!}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const session = (await stripeResponse.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };

    if (!stripeResponse.ok || !session.url || !session.id) {
      throw new Error(session.error?.message ?? "Failed to create Stripe checkout session.");
    }

    await convex.mutation(api.marketplace.createPendingOrdersFromCart, {
      clerkId: userId,
      shippingName: body.shippingName,
      shippingPhone: body.shippingPhone,
      shippingAddress: body.shippingAddress,
      shippingCity: body.shippingCity,
      checkoutProvider: "stripe",
      checkoutSessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
