import { createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function verifyStripeSignature(payload: string, signatureHeader: string) {
  if (!stripeWebhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  const pairs = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = pairs.find((part) => part.startsWith("t="))?.slice(2);
  const signature = pairs.find((part) => part.startsWith("v1="))?.slice(3);

  if (!timestamp || !signature) {
    throw new Error("Invalid Stripe signature header.");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", stripeWebhookSecret).update(signedPayload).digest("hex");
  const valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!valid) {
    throw new Error("Stripe signature verification failed.");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
    }

    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature." }, { status: 400 });
    }

    verifyStripeSignature(payload, signature);
    const event = JSON.parse(payload) as {
      type: string;
      data?: { object?: { id?: string; payment_intent?: string } };
    };

    const sessionId = event.data?.object?.id;
    if (!sessionId) {
      return NextResponse.json({ received: true });
    }

    const convex = new ConvexHttpClient(convexUrl);
    if (event.type === "checkout.session.completed") {
      await convex.mutation(api.marketplace.confirmOrdersPaidFromCheckoutSession, {
        checkoutSessionId: sessionId,
        paymentIntentId: event.data?.object?.payment_intent,
        paymentStatus: "paid",
      });
    }

    if (event.type === "checkout.session.expired") {
      await convex.mutation(api.marketplace.confirmOrdersPaidFromCheckoutSession, {
        checkoutSessionId: sessionId,
        paymentStatus: "cancelled",
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
