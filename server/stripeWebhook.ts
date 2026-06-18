import type Stripe from "stripe";
import { SHOP_ITEMS } from "../shared/shopItems";
import { getStripeClient, getStripeWebhookSecret, verifyPayment } from "./stripe";

export type StripeWebhookResult =
  | { status: 200; body: { received: true; processed: boolean } }
  | { status: 400; body: { error: string } }
  | { status: 500; body: { error: string } };

/**
 * Fulfill shop purchases from Stripe `payment_intent.succeeded` webhooks.
 * Uses the same idempotent `verifyPayment()` path as client `/api/payment/verify`.
 */
export async function handleStripePaymentWebhook(
  rawBody: Buffer,
  signature: string | undefined,
  supabase: Parameters<typeof verifyPayment>[2],
): Promise<StripeWebhookResult> {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return {
      status: 400,
      body: { error: "Stripe webhook secret not configured" },
    };
  }
  if (!signature) {
    return { status: 400, body: { error: "Missing stripe-signature header" } };
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[Stripe webhook] Invalid signature:", error);
    return { status: 400, body: { error: "Invalid webhook signature" } };
  }

  if (event.type !== "payment_intent.succeeded") {
    return { status: 200, body: { received: true, processed: false } };
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const userId = paymentIntent.metadata?.userId?.trim();
  const itemId = paymentIntent.metadata?.itemId?.trim();

  if (!userId) {
    console.error(
      "[Stripe webhook] payment_intent.succeeded missing metadata.userId:",
      paymentIntent.id,
    );
    return { status: 200, body: { received: true, processed: false } };
  }

  if (!itemId || !SHOP_ITEMS[itemId]) {
    console.error(
      "[Stripe webhook] payment_intent.succeeded missing or invalid metadata.itemId:",
      paymentIntent.id,
      itemId,
    );
    return { status: 200, body: { received: true, processed: false } };
  }

  try {
    const result = await verifyPayment(paymentIntent.id, userId, supabase);
    if (result.success) {
      console.log(
        "[Stripe webhook] Purchase fulfilled:",
        paymentIntent.id,
        result.itemId,
      );
      return { status: 200, body: { received: true, processed: true } };
    }

    console.error(
      "[Stripe webhook] verifyPayment returned failure:",
      paymentIntent.id,
      result.error,
    );
    return { status: 200, body: { received: true, processed: false } };
  } catch (error) {
    console.error(
      "[Stripe webhook] verifyPayment threw:",
      paymentIntent.id,
      error,
    );
    return {
      status: 500,
      body: { error: "Failed to fulfill payment" },
    };
  }
}
