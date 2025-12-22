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
import { loadStripe } from "@stripe/stripe-js";
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

const stripePublishableKey = import.meta.env.PROD
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV;

const stripePromise = loadStripe(stripePublishableKey || "");

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
}

function CheckoutForm({ onSuccess, currency, onCancel }: CheckoutFormProps) {
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

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "Payment failed");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      const user = await getCurrentUser();
      if (!user) {
        setErrorMessage("User not authenticated");
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
        useGameStore.setState({ hasMadeNonFreePurchase: true });
        onSuccess();
      }
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <span>Powered by</span>
        <svg
          className="h-4"
          viewBox="0 0 60 25"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
        >
          <path
            d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z"
            fillRule="evenodd"
          />
        </svg>
      </div>

      <div className="space-y-2 border-t pt-4 mt-4">
        <p className="text-[10px] text-muted-foreground">
          By completing this purchase, you agree that the delivery of the
          digital item begins immediately and acknowledge that you thereby lose
          your right of withdrawal. For more information, please see our{" "}
          <a
            href="/terms"
            target="_blank"
            className="underline hover:text-foreground"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/withdrawal"
            target="_blank"
            className="underline hover:text-foreground"
          >
            Right of Withdrawal
          </a>
          .
        </p>
      </div>

      {errorMessage && (
        <div className="text-red-500 text-sm">{errorMessage}</div>
      )}

      <div className="flex gap-3 justify-center">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-auto px-6"
          button_id="full-game-complete-purchase"
        >
          {isProcessing
            ? "Processing..."
            : `Complete Purchase for ${item?.price ? formatPrice(item.price) : ""}`}
        </Button>
      </div>
    </form>
  );
}

interface FullGamePurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FullGamePurchaseDialog({
  isOpen,
  onClose,
}: FullGamePurchaseDialogProps) {
  const gameState = useGameStore();
  // Always require purchase - dialog should only close after successful purchase
  const requiresPurchase = true;
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

  useEffect(() => {
    const initializeDialog = async () => {
      if (!isOpen) return;

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
    const response = await fetch("/api/payment/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: "full_game",
        userEmail: user?.email,
        userId: user?.id,
        currency: currency.toLowerCase(),
      }),
    });

    const { clientSecret } = await response.json();
    setClientSecret(clientSecret);
  };

  const handlePurchaseSuccess = async () => {
    useGameStore.setState({
      hasMadeNonFreePurchase: true,
      BTP: 0, // Deactivate BTP mode
    });

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
        useGameStore.setState((state) => ({
          activatedPurchases: {
            ...state.activatedPurchases,
            [purchaseId]: true,
          },
        }));
      }
    }

    toast({
      title: "Purchase Successful!",
      description:
        "Full Game unlocked! You can now continue your journey without restrictions.",
    });

    setClientSecret(null);
    onClose();
  };

  const formatPrice = (cents: number) => {
    const amount = (cents / 100).toFixed(2);
    return currency === "EUR" ? `${amount} €` : `$${amount}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={undefined}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {!clientSecret ? "The Journey Continues" : "Complete Your Purchase"}
          </DialogTitle>
          {!clientSecret && (
            <DialogDescription className="text-sm text-gray-400 mt-2">
              You have reached the end of the trial. The full journey awaits
              beyond this point.
            </DialogDescription>
          )}
        </DialogHeader>
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
                    {item.originalPrice && (
                      <span className="line-through text-muted-foreground mr-2 text-lg">
                        {formatPrice(item.originalPrice)}
                      </span>
                    )}
                    {formatPrice(item.price)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    One time purchase. No subscriptions. No microtransactions.
                  </p>
                </div>
                <div className="text-sm text-muted-foreground border-t border-border pt-4">
                  <ul className="space-y-1">
                    <li>• ~14 hours of gameplay</li>
                    <li>• 100+ structures</li>
                    <li>
                      • 250+ items, fellowship members, books, blessings...
                    </li>
                    <li>• 50+ achievements</li>
                    <li>• Dark and challenging story based on your choices</li>
                  </ul>
                </div>
              </div>
            </div>
            {!currentUser && (
              <div className="bg-red-600/10 border border-red-600/50 rounded-lg p-3">
                <p className="text-sm text-red-200">
                  Please sign in to purchase the Full Game.
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
                Continue the Journey
              </Button>
            </div>

            <div className="bg-gray-600/10 border border-gray-600/50 rounded-lg p-3">
              <p className="text-sm text-gray-400">
                Your progress is saved. You can return at any time and continue
                where you left off.
              </p>
            </div>
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              onSuccess={handlePurchaseSuccess}
              currency={currency}
              onCancel={() => setClientSecret(null)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
