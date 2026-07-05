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
import { getCurrentUser } from "@/game/auth";
import { SHOP_ITEMS } from "../../../../shared/shopItems";
import { logger } from "@/lib/logger";
import { useGameStore } from "@/game/state";
import { getStripeReturnUrlForConfirm } from "@/lib/stripePaymentReturn";
import { StripePoweredBy } from "@/components/game/StripePoweredBy";
import { useTranslation } from "react-i18next";

const stripePublishableKey = import.meta.env.PROD
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV;

// Lazy load Stripe: Load when needed OR after 60 seconds
let stripePromise: Promise<any> | null = null;
const getStripePromise = async () => {
  if (!stripePromise && stripePublishableKey) {
    const { loadStripe } = await import("@stripe/stripe-js");
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Fallback: Load after 60 seconds
setTimeout(() => {
  getStripePromise();
}, 60000);

// EU countries with Euro as main currency
const EU_EURO_COUNTRIES = [
  "AT",
  "BE",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
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

  const item = SHOP_ITEMS.full_game;
  const formatPrice = (cents: number) => {
    const amount = (cents / 100).toFixed(2);
    return currency === "EUR" ? `${amount} €` : `$${amount}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

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
        setErrorMessage(error.message || t("ui:fullGame.paymentFailed"));
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        const user = await getCurrentUser();
        if (!user) {
          setErrorMessage(t("ui:fullGame.notAuthenticated"));
          setIsProcessing(false);
          return;
        }

        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            userId: user.id,
          }),
        });

        const result = await response.json();
        if (result.success) {
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
          onSuccess();
        }
        setIsProcessing(false);
      }
    } catch (e: any) {
      logger.error("Payment submission error:", e);
      // Don't set isProcessing to false if it's the "Element unmounted" error 
      // during a legitimate redirect or success cleanup, 
      // but here we catch actual exceptions.
      if (e.message?.indexOf("mounted") === -1) {
        setIsProcessing(false);
        setErrorMessage(e.message || t("ui:fullGame.unexpectedError"));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <StripePoweredBy />

      <div className="space-y-2 border-t pt-4 mt-4">
        <p className="text-xxs text-muted-foreground">
          {t("ui:fullGame.legalConsent")}{" "}
          <a
            href="/terms"
            target="_blank"
            className="underline hover:text-foreground"
          >
            {t("ui:fullGame.termsOfService")}
          </a>{" "}
          •{" "}
          <a
            href="/withdrawal"
            target="_blank"
            className="underline hover:text-foreground"
          >
            {t("ui:fullGame.rightOfWithdrawal")}
          </a>
        </p>
      </div>

      {errorMessage && (
        <div className="text-red-500 text-sm">{errorMessage}</div>
      )}

      <div className="flex gap-3 pt-1 justify-center">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-auto px-6"
          button_id="full-game-complete-purchase"
        >
          {isProcessing
            ? t("common:status.processing")
            : t("ui:fullGame.completePurchaseFor", {
              price: chargeAmountCents ? formatPrice(chargeAmountCents) : "",
            })}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-auto px-6"
          button_id="full-game-back-to-details"
          type="button"
          disabled={isProcessing}
        >
          {t("common:buttons.back")}
        </Button>
      </div>
    </form>
  );
}

interface FullGamePurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  openedFromFooter?: boolean;
}

export default function FullGamePurchaseDialog({
  isOpen,
  onClose,
  openedFromFooter = false,
}: FullGamePurchaseDialogProps) {
  const { t } = useTranslation(["ui", "common"]);
  const gameState = useGameStore();
  // Only require purchase if NOT opened from footer (i.e., opened due to BTP mode)
  const requiresPurchase = !openedFromFooter;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"EUR" | "USD">("USD");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const detectedCurrency = gameState.detectedCurrency;
  const setDetectedCurrency = gameState.setDetectedCurrency;
  const { toast } = useToast();

  const item = SHOP_ITEMS.full_game;
  // Shop discounts (Playlight first purchase, traders' gratitude) do not apply to the full game price.
  const fullGameChargeCents = item.price;

  useEffect(() => {
    const initializeDialog = async () => {
      if (!isOpen) return;

      // Trigger Stripe loading when dialog is opened
      getStripePromise();

      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        logger.error("Error initializing full game dialog:", error);
      }
    };

    initializeDialog();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !detectedCurrency) {
      detectCurrency().then((detectedCurr) => {
        setCurrency(detectedCurr);
        setDetectedCurrency(detectedCurr);
      });
    } else if (isOpen && detectedCurrency) {
      setCurrency(detectedCurrency);
    }
  }, [isOpen, detectedCurrency, setDetectedCurrency]);

  const handlePurchaseClick = async () => {
    const user = await getCurrentUser();
    const state = useGameStore.getState();

    const response = await fetch("/api/payment/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: "full_game",
        userEmail: user?.email,
        userId: user?.id,
        currency: currency.toLowerCase(),
        cruelMode: state.cruelMode ?? false,
      }),
    });

    const { clientSecret } = await response.json();
    if (clientSecret) {
      useGameStore.getState().recordCompletePurchaseDialogOpen();
    }
    setClientSecret(clientSecret);
  };

  const handlePurchaseSuccess = async () => {
    logger.log('[FULL GAME] Purchase success - setting state before changes');

    const stateBefore = useGameStore.getState();
    logger.log('[FULL GAME] State before:', {
      BTP: stateBefore.BTP,
      isPaused: stateBefore.isPaused,
      isPausedPreviously: stateBefore.isPausedPreviously,
      fullGamePurchaseDialogOpen: stateBefore.fullGamePurchaseDialogOpen,
    });

    useGameStore.setState((s) => ({
      hasMadeNonFreePurchase: true,
      BTP: 0, // Deactivate BTP mode
      isPaused: false, // Explicitly unpause the game
      isPausedPreviously: false, // Clear previous pause state to resume playTime
      story: {
        ...s.story,
        seen: {
          ...s.story.seen,
          playlightFirstPurchaseDiscountActive: false,
        },
      },
    }));

    logger.log('[FULL GAME] State updated, BTP=0, isPaused=false');

    // Mark as activated
    const { getSupabaseClient } = await import("@/lib/supabase");
    const supabase = await getSupabaseClient();
    const user = await getCurrentUser();

    if (user) {
      const { data } = await supabase
        .from("purchases")
        .select("id, item_id")
        .eq("user_id", user.id)
        .eq("item_id", "full_game")
        .order("purchased_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const purchaseId = `purchase-full_game-${data.id}`;
        logger.log('[FULL GAME] Auto-activating purchase:', purchaseId);
        useGameStore.setState((state) => ({
          activatedPurchases: {
            ...state.activatedPurchases,
            [purchaseId]: true,
          },
        }));
      } else {
        logger.log('[FULL GAME] No purchase data found in database');
      }
    }

    const stateAfter = useGameStore.getState();
    logger.log('[FULL GAME] State after:', {
      BTP: stateAfter.BTP,
      isPaused: stateAfter.isPaused,
      isPausedPreviously: stateAfter.isPausedPreviously,
      fullGamePurchaseDialogOpen: stateAfter.fullGamePurchaseDialogOpen,
      activatedPurchases: stateAfter.activatedPurchases,
    });

    toast({
      title: t("ui:fullGame.purchaseSuccessful"),
      description: t("ui:fullGame.purchaseSuccessfulDesc"),
    });

    setClientSecret(null);
    logger.log('[FULL GAME] Closing dialog');
    onClose();

    // Log state after dialog close
    setTimeout(() => {
      const finalState = useGameStore.getState();
      logger.log('[FULL GAME] Final state after close:', {
        BTP: finalState.BTP,
        isPaused: finalState.isPaused,
        isPausedPreviously: finalState.isPausedPreviously,
        fullGamePurchaseDialogOpen: finalState.fullGamePurchaseDialogOpen,
      });
    }, 100);
  };

  const formatPrice = (cents: number) => {
    const amount = (cents / 100).toFixed(2);
    return currency === "EUR" ? `${amount} €` : `$${amount}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={requiresPurchase ? undefined : onClose}>
      <DialogContent
        className={`[--adc-dialog-max-w:28rem] ${requiresPurchase ? '[&>button]:hidden' : ''}`}
        onEscapeKeyDown={(e) => requiresPurchase && e.preventDefault()}
        onPointerDownOutside={(e) => requiresPurchase && e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {!clientSecret
              ? t("ui:fullGame.titleTrial")
              : t("ui:fullGame.titleCheckout")}
          </DialogTitle>
          {!clientSecret && (
            <DialogDescription className="text-sm text-gray-400 mt-2">
              {t("ui:fullGame.trialDesc")}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="max-h-[85vh] overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div className="px-6 pb-6">
            {!clientSecret ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-3">
                        {item.description}
                      </p>
                      <div className="text-2xl font-bold">
                        {item.originalPrice != null &&
                          item.originalPrice > item.price && (
                            <span className="line-through text-muted-foreground mr-2 text-lg">
                              {formatPrice(item.originalPrice)}
                            </span>
                          )}
                        {formatPrice(fullGameChargeCents)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("ui:fullGame.oneTimePurchase")}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground border-t border-border pt-4">
                      <ul className="space-y-1">
                        <li>• {t("ui:fullGame.featureHours")}</li>
                        <li>• {t("ui:fullGame.featureStructures")}</li>
                        <li>• {t("ui:fullGame.featureItems")}</li>
                        <li>• {t("ui:fullGame.featureAchievements")}</li>
                        <li>• {t("ui:fullGame.featureStory")}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                {!currentUser && (
                  <div className="bg-red-600/10 border border-red-600/50 rounded-lg p-3">
                    <p className="text-sm text-red-200">
                      {t("ui:fullGame.signInRequired")}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 justify-center pt-2">
                  <Button
                    onClick={handlePurchaseClick}
                    disabled={!currentUser}
                    className="w-full"
                    button_id="full-game-purchase"
                  >
                    {t("ui:fullGame.continueJourney")}
                  </Button>
                </div>

                <div className="bg-gray-600/10 border border-gray-600/50 rounded-lg p-3">
                  <p className="text-sm text-gray-400">
                    {t("ui:fullGame.progressSaved")}
                  </p>
                </div>
              </div>
            ) : stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  onSuccess={handlePurchaseSuccess}
                  currency={currency}
                  onCancel={() => setClientSecret(null)}
                  chargeAmountCents={fullGameChargeCents}
                />
              </Elements>
            ) : (
              <div className="flex justify-center py-8">
                <div className="text-muted-foreground">{t("ui:fullGame.loadingPayment")}</div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
