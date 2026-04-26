import { getCurrentUser } from "@/game/auth";
import { toast } from "@/hooks/use-toast";
import { useGameStore } from "@/game/state";
import { SHOP_ITEMS } from "../../../shared/shopItems";
import { logger } from "@/lib/logger";

/**
 * Return URL for Stripe `confirmPayment` (required for PayPal and other redirect methods).
 * Strips any prior Stripe return params so we do not stack duplicate query keys.
 */
export function getStripeReturnUrlForConfirm(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("payment_intent");
  url.searchParams.delete("payment_intent_client_secret");
  url.searchParams.delete("redirect_status");
  return url.toString();
}

function stripStripeReturnParamsFromUrl(): void {
  const url = new URL(window.location.href);
  if (
    !url.searchParams.get("redirect_status") &&
    !url.searchParams.get("payment_intent")
  ) {
    return;
  }
  url.searchParams.delete("payment_intent");
  url.searchParams.delete("payment_intent_client_secret");
  url.searchParams.delete("redirect_status");
  const qs = url.searchParams.toString();
  const next = url.pathname + (qs ? `?${qs}` : "") + url.hash;
  window.history.replaceState({}, document.title, next);
}

function applyStoreAfterVerifiedPurchase(): void {
  useGameStore.setState((s) => ({
    hasMadeNonFreePurchase: true,
    story: {
      ...s.story,
      seen: {
        ...s.story.seen,
        playlightFirstPurchaseDiscountActive: false,
      },
    },
  }));
}

/**
 * If the URL contains Stripe redirect result params (e.g. after PayPal), verify the
 * PaymentIntent on the server and update client state. Call after the game store has
 * been loaded or initialized.
 */
export async function processStripePaymentReturn(): Promise<void> {
  const searchParams = new URLSearchParams(window.location.search);
  const redirectStatus = searchParams.get("redirect_status");
  const paymentIntentId = searchParams.get("payment_intent");
  if (!redirectStatus || !paymentIntentId) {
    return;
  }

  if (redirectStatus === "failed") {
    stripStripeReturnParamsFromUrl();
    toast({
      title: "Payment failed",
      description:
        "The payment was not completed. You can try again from the shop.",
      variant: "destructive",
    });
    return;
  }

  if (redirectStatus === "processing") {
    stripStripeReturnParamsFromUrl();
    toast({
      title: "Payment processing",
      description:
        "Your payment is still being processed. Purchases will appear when complete.",
    });
    return;
  }

  if (redirectStatus !== "succeeded") {
    stripStripeReturnParamsFromUrl();
    logger.log("[Stripe] Unknown redirect_status:", redirectStatus);
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    stripStripeReturnParamsFromUrl();
    toast({
      title: "Sign in required",
      description:
        "Sign in to finish linking your purchase to your account.",
      variant: "destructive",
    });
    return;
  }

  try {
    const response = await fetch("/api/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId,
        userId: user.id,
      }),
    });
    const result = (await response.json()) as {
      success: boolean;
      itemId?: string;
      error?: string;
    };
    if (result.success && result.itemId) {
      const item = SHOP_ITEMS[result.itemId];
      if (item && item.price > 0) {
        applyStoreAfterVerifiedPurchase();
      }
      stripStripeReturnParamsFromUrl();
      toast({
        title: "Purchase complete",
        description: item?.name
          ? `${item.name} is now available.`
          : "Thank you for your purchase.",
      });
    } else {
      stripStripeReturnParamsFromUrl();
      toast({
        title: "Verification failed",
        description:
          result.error ||
          "We could not confirm your payment. If you were charged, contact support.",
        variant: "destructive",
      });
    }
  } catch (e) {
    logger.error("[Stripe] Return verify error:", e);
    stripStripeReturnParamsFromUrl();
    toast({
      title: "Verification failed",
      description:
        "Could not reach the server. Check your connection and your purchases in the shop.",
      variant: "destructive",
    });
  }
}
