import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  ensureAnonymousSession,
  getSessionAccessToken,
  getSessionUser,
} from "@/game/auth";
import { SHOP_ITEMS } from "../../../../shared/shopItems";
import { logger } from "@/lib/logger";
import { useGameStore } from "@/game/state";
import { getStripeReturnUrlForConfirm } from "@/lib/stripePaymentReturn";
import { StripePoweredBy } from "@/components/game/StripePoweredBy";
import { resolveShopItemName } from "@/i18n/shopLabels";
import { useTranslation } from "react-i18next";

const PRESET_SLOTS_ITEM_ID = "additional_preset_slots";

const stripePublishableKey = import.meta.env.PROD
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV;

let stripePromise: Promise<any> | null = null;
const getStripePromise = async () => {
  if (!stripePromise && stripePublishableKey) {
    const { loadStripe } = await import("@stripe/stripe-js");
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// EU countries with Euro as main currency
const EU_EURO_COUNTRIES = [
  "AT", "BE", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES",
];

async function detectCurrency(): Promise<"EUR" | "USD"> {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    const countryCode = data.country_code;
    if (countryCode && EU_EURO_COUNTRIES.includes(countryCode)) {
      return "EUR";
    }
  } catch (error) {
    logger.error("Failed to detect location:", error);
  }
  return "USD";
}

interface CheckoutFormProps {
  onSuccess: () => void;
  currency: "EUR" | "USD";
  onCancel: () => void;
  chargeAmountCents: number;
}

function CheckoutForm({
  onSuccess,
  currency,
  onCancel,
  chargeAmountCents,
}: CheckoutFormProps) {
  const { t } = useTranslation(["ui", "common"]);
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const formatPrice = (cents: number) => {
    const amount = (cents / 100).toFixed(2);
    return currency === "EUR" ? `${amount} €` : `$${amount}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: getStripeReturnUrlForConfirm(),
        },
      });

      if (error) {
        setErrorMessage(error.message || t("ui:shop.paymentFailed"));
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        const user = await getSessionUser();
        if (!user) {
          setErrorMessage(t("ui:shop.notAuthenticated"));
          setIsProcessing(false);
          return;
        }

        const accessToken = await getSessionAccessToken();
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            userId: user.id,
          }),
        });

        const result = await response.json();
        if (result.success) {
          onSuccess();
        } else {
          setErrorMessage(result.error || t("ui:shop.verificationFailed"));
        }
        setIsProcessing(false);
      }
    } catch (e: any) {
      logger.error("Payment submission error:", e);
      if (e.message?.indexOf("mounted") === -1) {
        setIsProcessing(false);
        setErrorMessage(e.message || t("ui:shop.unexpectedError"));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <PaymentElement />

      <StripePoweredBy className="py-0.5" />

      <div className="space-y-2 border-t pt-3 mt-2">
        <p className="text-[11px] leading-tight text-muted-foreground">
          {t("ui:shop.legalConsent")}{" "}
          <a href="/terms" target="_blank" className="underline hover:text-foreground">
            {t("ui:shop.termsOfService")}
          </a>{" "}
          •{" "}
          <a href="/withdrawal" target="_blank" className="underline hover:text-foreground">
            {t("ui:shop.rightOfWithdrawal")}
          </a>
        </p>
      </div>

      {errorMessage && <div className="text-red-500 text-sm">{errorMessage}</div>}

      <div className="flex gap-3 pt-1 justify-center">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 font-bold"
          button_id="preset-slots-complete-purchase"
        >
          {isProcessing
            ? t("common:status.processing")
            : t("ui:shop.completePurchaseFor", {
              price: chargeAmountCents > 0 ? formatPrice(chargeAmountCents) : "",
            })}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-2"
          button_id="preset-slots-cancel-payment"
          type="button"
          disabled={isProcessing}
        >
          {t("common:buttons.cancel")}
        </Button>
      </div>
    </form>
  );
}

interface PresetSlotsPurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PresetSlotsPurchaseDialog({
  isOpen,
  onClose,
}: PresetSlotsPurchaseDialogProps) {
  const { t } = useTranslation(["ui", "common"]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"EUR" | "USD">("USD");
  const detectedCurrency = useGameStore((s) => s.detectedCurrency);
  const setDetectedCurrency = useGameStore((s) => s.setDetectedCurrency);
  const grantAdditionalPresetSlots = useGameStore(
    (s) => s.grantAdditionalPresetSlots,
  );
  const { toast } = useToast();

  const item = SHOP_ITEMS[PRESET_SLOTS_ITEM_ID];
  // No stacking discounts here: the catalog price already bakes in the Beta discount.
  const catalogCents = item.price;
  const listCents = item.originalPrice ?? null;
  const betaDiscountCents =
    listCents != null && listCents > catalogCents ? listCents - catalogCents : 0;

  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null);
      return;
    }
    getStripePromise();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !detectedCurrency) {
      detectCurrency().then((detected) => {
        setCurrency(detected);
        setDetectedCurrency(detected);
      });
    } else if (isOpen && detectedCurrency) {
      setCurrency(detectedCurrency);
    }
  }, [isOpen, detectedCurrency, setDetectedCurrency]);

  const formatPrice = (cents: number) => {
    const amount = (cents / 100).toFixed(2);
    return currency === "EUR" ? `${amount} €` : `$${amount}`;
  };

  const startCheckout = async () => {
    const user = await ensureAnonymousSession();
    const response = await fetch("/api/payment/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: PRESET_SLOTS_ITEM_ID,
        userEmail: user.email || undefined,
        userId: user.id,
        currency: currency.toLowerCase(),
        cruelMode: useGameStore.getState().cruelMode ?? false,
      }),
    });
    const { clientSecret: secret } = await response.json();
    if (secret) {
      useGameStore.getState().recordCompletePurchaseDialogOpen();
      setClientSecret(secret);
    }
  };

  // Open the Stripe payment form as soon as the dialog opens.
  useEffect(() => {
    if (isOpen && !clientSecret) {
      void startCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currency]);

  const handleSuccess = async () => {
    grantAdditionalPresetSlots();
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

    toast({
      title: t("ui:shop.purchaseSuccessful"),
      description: t("ui:shop.purchaseAddedSingle", {
        name: resolveShopItemName(item),
      }),
    });

    try {
      const { saveGame } = await import("@/game/save");
      const { buildGameState } = await import("@/game/stateHelpers");
      await saveGame(buildGameState(useGameStore.getState()), false);
    } catch (e) {
      logger.error("[PRESET SLOTS] Post-purchase save failed:", e);
    }

    setClientSecret(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="[--adc-dialog-max-w:28rem] max-h-[80vh] z-[80] gap-2"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1 pb-0">
          <DialogTitle>{resolveShopItemName(item)}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("ui:shop.paymentSrDescription", {
              name: resolveShopItemName(item),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border/70 pb-3 text-sm">
          {listCents != null && listCents > 0 && (
            <div className="flex justify-between gap-4 text-muted-foreground">
              <span>{t("ui:shop.originalPrice")}</span>
              <span className="shrink-0 text-right line-through tabular-nums">
                {formatPrice(listCents)}
              </span>
            </div>
          )}
          {betaDiscountCents > 0 && (
            <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-500">
              <span>{t("ui:shop.betaDiscount")}</span>
              <span className="shrink-0 text-right tabular-nums">
                −{formatPrice(betaDiscountCents)}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-border/50 pt-2 font-semibold">
            <span>{t("ui:shop.total")}</span>
            <span className="shrink-0 tabular-nums">{formatPrice(catalogCents)}</span>
          </div>
        </div>

        <div className="max-h-[calc(85vh-160px)] overflow-y-auto overflow-x-hidden pb-4 scrollbar-hide">
          {clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                onSuccess={handleSuccess}
                currency={currency}
                onCancel={onClose}
                chargeAmountCents={catalogCents}
              />
            </Elements>
          ) : (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">
                {t("ui:fullGame.loadingPayment")}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
