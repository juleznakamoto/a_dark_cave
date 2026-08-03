import { verifyPaymentWithRetry } from "@/lib/paymentVerify";
import { getSessionUser } from "@/game/auth";
import {
  applyShopDiscountConsumptionFromPaymentMetadata,
  completePaidShopPurchaseInStore,
} from "@/game/shopPostPurchaseState";
import { rehydratePurchasesFromSupabase } from "@/game/shopPurchases";
import { toast } from "@/hooks/use-toast";
import { useGameStore } from "@/game/state";
import { SHOP_ITEMS } from "../../../shared/shopItems";
import { FIRST_PURCHASE_INSIGHT_BONUS } from "@shared/firstPurchaseInsightBonus";
import { INSIGHT_GLYPH } from "@/game/villagerCapUpgrades";
import { formatNumber } from "@/lib/utils";
import { logger } from "@/lib/logger";
import i18n from "@/i18n";
import { stripStripeReturnParamsFromUrl } from "@/game/startupUrlCleanup";

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

  const user = await getSessionUser();
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
    const result = await verifyPaymentWithRetry(paymentIntentId, user.id);
    if (result.success && result.itemId) {
      const item = SHOP_ITEMS[result.itemId];
      let grantedFirstPurchaseInsight = false;
      if (item && item.price > 0) {
        grantedFirstPurchaseInsight =
          completePaidShopPurchaseInStore().grantedFirstPurchaseInsight;
      }
      applyShopDiscountConsumptionFromPaymentMetadata(result.discountMetadata);
      await rehydratePurchasesFromSupabase();
      try {
        const { saveGame } = await import("@/game/save");
        const { buildGameState } = await import("@/game/stateHelpers");
        await saveGame(buildGameState(useGameStore.getState()), false);
      } catch (e) {
        logger.error("[Stripe] Post-return save failed:", e);
      }
      stripStripeReturnParamsFromUrl();
      const baseDescription = item?.name
        ? `${item.name} is now available.`
        : "Thank you for your purchase.";
      const insightBonusMessage = grantedFirstPurchaseInsight
        ? i18n.t("ui:shop.firstPurchaseInsightGranted", {
          amount: formatNumber(FIRST_PURCHASE_INSIGHT_BONUS),
          glyph: INSIGHT_GLYPH,
          defaultValue: "First purchase gift: +{{amount}} {{glyph}} Insight",
        })
        : null;
      toast({
        title: "Purchase complete",
        description: insightBonusMessage
          ? `${baseDescription} ${insightBonusMessage}`
          : baseDescription,
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
