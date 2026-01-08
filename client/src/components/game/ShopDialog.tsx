import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGameStore } from "@/game/state";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/game/auth";
import { SHOP_ITEMS } from "../../../../shared/shopItems";
import { tailwindToHex } from "@/lib/tailwindColors";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";

const stripePublishableKey = import.meta.env.PROD
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV;

// Defer Stripe loading: Load when shop is opened OR after 15 seconds
let stripePromise: Promise<any> | null = null;

const getStripePromise = () => {
  if (!stripePromise && stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Fallback: Load after 15 seconds even if shop hasn't been opened
setTimeout(() => {
  getStripePromise();
}, 15000);

// Function to get an initialized Supabase client
const getSupabaseClient = async () => {
  // Assuming supabase client is already initialized and ready
  // If there's a more complex initialization logic (e.g., async setup),
  // you would handle it here to ensure the client is ready before use.
  return supabase;
};

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

// Detect user's country and currency
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

  // Default to USD
  return "USD";
}

interface CheckoutFormProps {
  itemId: string;
  onSuccess: () => void;
  currency: "EUR" | "USD";
  onCancel: () => void;
}

function CheckoutForm({
  itemId,
  onSuccess,
  currency,
  onCancel,
}: CheckoutFormProps) {
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
      // Verify payment on backend - server creates all purchases
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
        const item = SHOP_ITEMS[result.itemId];

        // Set hasMadeNonFreePurchase flag if this is a paid item
        if (item.price > 0) {
          useGameStore.setState({ hasMadeNonFreePurchase: true });
        }

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
          className="flex-1 font-bold"
          button_id="shop-complete-purchase"
        >
          {isProcessing
            ? "Processing..."
            : `Complete Purchase for ${SHOP_ITEMS[itemId]?.price ? formatPrice(SHOP_ITEMS[itemId].price) : ""}`}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-2"
          button_id="shop-cancel-payment"
          type="button"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface ShopDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function ShopDialog({ isOpen, onClose, onOpen }: ShopDialogProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const detectedCurrency = useGameStore((state) => state.detectedCurrency);
  const setDetectedCurrency = useGameStore(
    (state) => state.setDetectedCurrency,
  );
  const [currency, setCurrency] = useState<"EUR" | "USD">(
    detectedCurrency || "USD",
  );
  const [isDetectingCurrency, setIsDetectingCurrency] = useState(false);
  const gameState = useGameStore();
  const activatedPurchases = gameState.activatedPurchases || {};
  const { toast } = useToast();
  const mobileTooltip = useMobileTooltip();

  // Initialize component and load user data
  useEffect(() => {
    const initializeShop = async () => {
      if (!isOpen) return;

      // Trigger Stripe loading when shop is opened
      getStripePromise();

      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

        if (user) {
          await loadPurchasedItems();
        }
      } catch (error) {
        logger.error("Error initializing shop:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeShop();
  }, [isOpen]);

  const loadPurchasedItems = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return;
      }

      const client = await getSupabaseClient();
      const { data, error } = await client
        .from("purchases")
        .select("id, item_id")
        .eq("user_id", user.id);

      if (error) throw error;
      if (data) {
        // Use numeric database ID as the unique purchase identifier
        // Format: purchase-{itemId}-{numericDbId}
        const purchaseIds = data.map((p) => `purchase-${p.item_id}-${p.id}`);

        setPurchasedItems(purchaseIds);

        // Initialize feast activations for any feast purchases that don't have them yet
        const currentFeastActivations = gameState.feastActivations || {};
        const newFeastActivations = { ...currentFeastActivations };
        let hasNewActivations = false;

        data.forEach((purchase) => {
          const purchaseId = `purchase-${purchase.item_id}-${purchase.id}`;
          const item = SHOP_ITEMS[purchase.item_id];

          // If this item has feast activations and doesn't already have them set up in state
          // BUT skip bundles - only track activations for bundle components
          if (
            item?.rewards.feastActivations &&
            !item.bundleComponents &&
            !currentFeastActivations[purchaseId]
          ) {
            newFeastActivations[purchaseId] = item.rewards.feastActivations;
            hasNewActivations = true;
          }
        });

        // Update state if we added any new activations
        if (hasNewActivations) {
          useGameStore.setState({ feastActivations: newFeastActivations });
        }
      }
    } catch (error) {
      logger.error("Error loading purchased items:", error);
    }
  };

  // Detect currency on mount (only if not already detected)
  useEffect(() => {
    if (isOpen && !detectedCurrency) {
      setIsDetectingCurrency(true);
      detectCurrency()
        .then((detectedCurr) => {
          setCurrency(detectedCurr);
          setDetectedCurrency(detectedCurr); // Persist to game state
        })
        .finally(() => {
          setIsDetectingCurrency(false);
        });
    } else if (isOpen && detectedCurrency) {
      // Use already detected currency
      setCurrency(detectedCurrency);
    }
  }, [isOpen, detectedCurrency, setDetectedCurrency]);

  const handlePurchaseClick = async (itemId: string) => {
    const item = SHOP_ITEMS[itemId];

    // For free items, handle them directly
    if (item.price === 0) {
      try {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Special handling for daily free gold - claim immediately without saving to DB
        if (itemId === "gold_100_free") {
          const lastClaim = gameState.lastFreeGoldClaim || 0;
          const now = Date.now();
          const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);

          if (hoursSinceLastClaim < 24) {
            const hoursRemaining = Math.ceil(24 - hoursSinceLastClaim);
            gameState.addLogEntry({
              id: `free-gold-cooldown-${Date.now()}`,
              message: `You can claim free gold again in ${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}.`,
              timestamp: Date.now(),
              type: "system",
            });
            return;
          }

          // Grant the gold immediately
          if (item.rewards.resources) {
            Object.entries(item.rewards.resources).forEach(
              ([resource, amount]) => {
                gameState.updateResource(resource as any, amount);
              },
            );
          }

          // Update lastFreeGoldClaim timestamp
          useGameStore.setState({ lastFreeGoldClaim: Date.now() });

          // Show success message
          gameState.addLogEntry({
            id: `free-gold-claimed-${Date.now()}`,
            message: `You claimed 100 Gold. Come back tomorrow if you endure the night.`,
            timestamp: Date.now(),
            type: "system",
          });

          toast({
            title: "Success!",
            description: `100 Gold has been added to your resources!`,
          });

          // Return early - don't save to database
          return;
        }

        // For other free items (non-daily gold), check if already purchased
        if (!item.canPurchaseMultipleTimes) {
          const alreadyPurchased = purchasedItems.some((pid) => {
            // Extract item ID from purchase ID
            // Format: purchase-{itemId}-{uuid} or purchase-{itemId}-temp-{timestamp}
            if (!pid.startsWith("purchase-")) return false;

            const withoutPrefix = pid.substring("purchase-".length);
            // Check if it's a temp ID
            if (withoutPrefix.includes("-temp-")) {
              return (
                withoutPrefix.substring(0, withoutPrefix.indexOf("-temp-")) ===
                itemId
              );
            }
            // For real IDs with UUID, remove the last 5 dash-separated segments (UUID)
            const parts = withoutPrefix.split("-");
            const purchasedItemId = parts.slice(0, -5).join("-");
            return purchasedItemId === itemId;
          });

          if (alreadyPurchased) {
            gameState.addLogEntry({
              id: `already-claimed-${Date.now()}`,
              message: `You have already claimed ${item.name}.`,
              timestamp: Date.now(),
              type: "system",
            });
            return;
          }
        }

        // Save purchase to Supabase for other free items (non-daily gold)
        const client = await getSupabaseClient();

        // If this is a bundle with components, create individual purchases for each component
        if (item.bundleComponents && item.bundleComponents.length > 0) {
          try {
            const user = await getCurrentUser();
            if (user) {
              const client = await getSupabaseClient();

              // First, create the bundle purchase itself
              const { error: bundleError } = await client
                .from("purchases")
                .insert({
                  user_id: user.id,
                  item_id: itemId,
                  item_name: item.name,
                  price_paid: item.price,
                  bundle_id: null, // Bundle itself has no parent bundle
                  purchased_at: new Date().toISOString(),
                });

              if (bundleError) {
                logger.error(
                  "Error saving bundle purchase to Supabase:",
                  bundleError,
                );
              }

              // Then create purchase records for each component
              for (const componentId of item.bundleComponents) {
                const componentItem = SHOP_ITEMS[componentId];
                if (componentItem) {
                  const { error } = await client.from("purchases").insert({
                    user_id: user.id,
                    item_id: componentId,
                    item_name: componentItem.name,
                    price_paid: 0, // Components from bundle are "free"
                    bundle_id: itemId, // Reference to parent bundle
                    purchased_at: new Date().toISOString(),
                  });

                  if (error) {
                    logger.error(
                      "Error saving component purchase to Supabase:",
                      error,
                    );
                  }
                }
              }
            }
          } catch (error) {
            logger.error("Exception saving bundle component purchases:", error);
          }
        } else {
          // Single item purchase
          const { error } = await client.from("purchases").insert({
            user_id: user.id,
            item_id: itemId,
            item_name: item.name,
            price_paid: item.price,
            purchased_at: new Date().toISOString(),
          });

          if (error) throw error;
        }

        // Reload purchases from database to get the correct ID
        await loadPurchasedItems();

        // Set hasMadeNonFreePurchase flag if this is a paid item (even if price is 0, we don't set it)
        if (item.price > 0) {
          useGameStore.setState({ hasMadeNonFreePurchase: true });
        }

        // Show success message
        gameState.addLogEntry({
          id: `free-gift-${Date.now()}`,
          message: `${item.name} has been added to your purchases! You can activate it from the Purchases section.`,
          timestamp: Date.now(),
          type: "system",
        });

        toast({
          title: "Success!",
          description: `${item.name} has been added to your purchases. Check the Purchases tab to activate it.`,
        });
      } catch (error) {
        logger.error("Error claiming free item:", error);
        gameState.addLogEntry({
          id: `free-gift-error-${Date.now()}`,
          message: `Failed to claim ${item.name}. Please try again.`,
          timestamp: Date.now(),
          type: "system",
        });
      }
      return;
    }

    // For paid items, create payment intent for embedded checkout
    const user = await getCurrentUser();
    const response = await fetch("/api/payment/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        userEmail: user?.email,
        userId: user?.id,
        currency: currency.toLowerCase(),
      }),
    });

    const { clientSecret } = await response.json();
    setClientSecret(clientSecret);
    setSelectedItem(itemId);
    onClose(); // Close shop dialog when payment starts
  };

  const handleCancelPayment = () => {
    setClientSecret(null);
    setSelectedItem(null);
    onOpen(); // Explicitly reopen the shop dialog
  };

  const handlePurchaseSuccess = async () => {
    const item = SHOP_ITEMS[selectedItem!];

    // Set hasMadeNonFreePurchase flag if this is a paid item
    if (item.price > 0) {
      useGameStore.setState({ hasMadeNonFreePurchase: true });
    }

    // NOTE: Bundle purchases are already created by the server in the payment verification
    // We don't need to create them again here

    // Reload purchases from database to get the correct IDs
    await loadPurchasedItems();

    // IMPORTANT: After loadPurchasedItems completes, purchasedItems state is updated
    // We need to access the updated state, not the stale closure variable
    const updatedPurchasedItems = await (async () => {
      const user = await getCurrentUser();
      if (!user) return [];

      const client = await getSupabaseClient();
      const { data, error } = await client
        .from("purchases")
        .select("id, item_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const purchaseIds = data
        ? data.map((p) => `purchase-${p.item_id}-${p.id}`)
        : [];

      return purchaseIds;
    })();

    // If this is a single item (NOT a bundle) with feast activations, set activations from item definition
    if (item.rewards.feastActivations && !item.bundleComponents) {
      // Get the latest purchase for this item (the one just created)
      const latestPurchaseId = updatedPurchasedItems
        .filter((pid) => {
          const itemId = pid.startsWith("purchase-")
            ? pid.substring("purchase-".length, pid.lastIndexOf("-"))
            : pid;
          return itemId === selectedItem;
        })
        .pop(); // Get the last one (newest)

      if (latestPurchaseId) {
        useGameStore.setState((state) => ({
          feastActivations: {
            ...state.feastActivations,
            [latestPurchaseId]: item.rewards.feastActivations!,
          },
        }));
      }
    }

    // Handle bundle component feast purchases
    if (item.bundleComponents) {
      // After reload, find the newly created component purchases
      item.bundleComponents.forEach((componentId) => {
        const componentItem = SHOP_ITEMS[componentId];

        if (componentItem?.rewards.feastActivations) {
          // Find the latest purchase for this component
          const allMatchingPurchases = updatedPurchasedItems.filter((pid) => {
            const itemId = pid.startsWith("purchase-")
              ? pid.substring("purchase-".length, pid.lastIndexOf("-"))
              : pid;
            return itemId === componentId;
          });

          const componentPurchaseId = allMatchingPurchases.pop();

          if (componentPurchaseId) {
            useGameStore.setState((state) => ({
              feastActivations: {
                ...state.feastActivations,
                [componentPurchaseId]: componentItem.rewards.feastActivations!,
              },
            }));
          }
        }
      });
    }

    gameState.addLogEntry({
      id: `purchase-${Date.now()}`,
      message: item.bundleComponents
        ? `Purchase successful! ${item.name} components have been added to your purchases. You can activate them from the Purchases section.`
        : `Purchase successful! ${item.name} has been added to your purchases. You can activate it from the Purchases section.`,
      timestamp: Date.now(),
      type: "system",
    });

    // Show success message
    toast({
      title: "Purchase Successful!",
      description: item.bundleComponents
        ? `${item.name} components have been added to your purchases. Check the Purchases tab to activate them.`
        : `${item.name} has been added to your purchases. Check the Purchases tab to activate it.`,
    });

    setClientSecret(null);
    setSelectedItem(null);
  };

  const handleActivatePurchase = (purchaseId: string, itemId: string) => {
    const item = SHOP_ITEMS[itemId];
    if (!item) return;

    // Handle Cruel Mode activation/deactivation
    if (itemId === "cruel_mode") {
      const isCurrentlyActivated = activatedPurchases[purchaseId] || false;

      // Toggle activation state
      useGameStore.setState((state) => ({
        activatedPurchases: {
          ...state.activatedPurchases,
          [purchaseId]: !isCurrentlyActivated,
        },
      }));

      gameState.addLogEntry({
        id: `toggle-cruel-mode-${Date.now()}`,
        message: isCurrentlyActivated
          ? "Cruel Mode deactivated. New games will use normal difficulty."
          : item.activationMessage ||
            "Cruel Mode activated! Start a new game to experience the ultimate challenge.",
        timestamp: Date.now(),
        type: "system",
      });

      return;
    }

    // For items with feast activations (feast or bundle), use individual purchase tracking
    if (item.rewards.feastActivations) {
      const purchase = gameState.feastActivations?.[purchaseId]; // Changed from feastPurchases to feastActivations
      if (!purchase || purchase <= 0) return; // Check if purchase exists and activationsRemaining > 0

      // Grant resources if this is a bundle
      if (item.rewards.resources) {
        Object.entries(item.rewards.resources).forEach(([resource, amount]) => {
          gameState.updateResource(resource as any, amount);
        });
      }

      // Activate a Great Feast
      const feastDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
      const endTime = Date.now() + feastDuration;

      useGameStore.setState((state) => ({
        feastActivations: {
          // Changed from feastPurchases to feastActivations
          ...state.feastActivations,
          [purchaseId]: purchase - 1, // Decrement activationsRemaining
        },
        greatFeastState: {
          isActive: true,
          endTime: endTime,
        },
      }));

      gameState.addLogEntry({
        id: `great-feast-${Date.now()}`,
        message:
          item.activationMessage ||
          `A Great Feast has begun! The village celebrates with exceptional vigor for the next 60 minutes.`,
        timestamp: Date.now(),
        type: "system",
      });
      return;
    }

    // For non-feast items, check if already activated (purchaseId is the same as itemId for non-feast)
    if (activatedPurchases[purchaseId]) return;

    // Grant rewards
    if (item.rewards.resources) {
      Object.entries(item.rewards.resources).forEach(([resource, amount]) => {
        gameState.updateResource(resource as any, amount);
      });
    }

    if (item.rewards.tools) {
      item.rewards.tools.forEach((tool) => {
        gameState.tools[tool as keyof typeof gameState.tools] = true;
      });
    }

    if (item.rewards.weapons) {
      item.rewards.weapons.forEach((weapon) => {
        gameState.weapons[weapon as keyof typeof gameState.weapons] = true;
      });
    }

    if (item.rewards.blessings) {
      item.rewards.blessings.forEach((blessing) => {
        gameState.blessings[blessing as keyof typeof gameState.blessings] =
          true;
      });
    }

    if (item.rewards.relics) {
      item.rewards.relics.forEach((relic) => {
        gameState.relics[relic as keyof typeof gameState.relics] = true;
      });
    }

    gameState.addLogEntry({
      id: `activate-${Date.now()}`,
      message:
        item.activationMessage ||
        `Activated ${item.name}! Rewards have been added to your inventory.`,
      timestamp: Date.now(),
      type: "system",
    });

    // Mark item as activated and set non-free purchase flag if applicable
    useGameStore.setState((state) => ({
      activatedPurchases: {
        ...state.activatedPurchases,
        [purchaseId]: true,
      },
      hasMadeNonFreePurchase: state.hasMadeNonFreePurchase || item.price > 0,
    }));
  };

  const formatPrice = (cents: number) => {
    const amount = (cents / 100).toFixed(2);
    return currency === "EUR" ? `${amount} €` : `$${amount}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] z-[70]" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Shop</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        )}

        {!isLoading && !currentUser && (
          <div className="bg-red-600/5 border border-red-600/50 rounded-lg p-3 text-center">
            <p className="text-md font-medium text-red-600">
              Sign in or create an account to purchase items.
            </p>
          </div>
        )}

        {!isLoading && (
          <Tabs defaultValue="shop" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shop">For Sale</TabsTrigger>
              <TabsTrigger value="purchases" disabled={!currentUser}>
                Purchases
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shop" className="mt-4">
              <ScrollArea
                className={
                  !currentUser ? "h-[calc(80vh-260px)]" : "h-[calc(80vh-180px)]"
                }
              >
                {" "}
                <div className="pb-4 text-muted-foreground text-sm">
                  <p className="text-md font-medium">
                    All in-game purchases are currently 50 % off during Beta
                    phase.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.values(SHOP_ITEMS)
                    .filter((item) => {
                      // Hide full_game item when BTP=0
                      if (item.id === 'full_game' && gameState.BTP === 0) {
                        return false;
                      }
                      return true;
                    })
                    .map((item) => (
                    <Card key={item.id} className="flex flex-col">
                      <CardHeader className="leading-snug p-3 md:p-6 pb-2 md:pb-3 relative">
                        {item.symbol && (
                          <span
                            className="leading-[0.9] text-lg text-right absolute top-3 right-3 md:top-6 md:right-6"
                            style={{
                              color: tailwindToHex(
                                item.symbolColor.replace("text-", ""),
                              ),
                              maxWidth: "2.2em",
                              wordBreak: "break-all",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {item.symbol}
                          </span>
                        )}
                        <CardTitle className="!m-0 text-md pr-6 flex items-center gap-1">
                          {item.name}
                          {item.id === "skull_lantern" && (
                            <TooltipProvider>
                              <Tooltip
                                open={mobileTooltip.isTooltipOpen(
                                  "skull-lantern-info",
                                )}
                              >
                                <TooltipTrigger asChild>
                                  <button
                                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground text-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (mobileTooltip.isMobile) {
                                        mobileTooltip.handleTooltipClick(
                                          "skull-lantern-info",
                                          e,
                                        );
                                      }
                                    }}
                                  >
                                    ⓘ
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="text-xs">
                                    <div className="font-bold mb-1">
                                      Skull Lantern
                                    </div>

                                    <div className="mt-1 space-y-0.5">
                                      <div>Cave Explore: +200% Bonus</div>
                                      <div>Cave Explore: -5s Cooldown</div>
                                      <div>Mining: +200% Bonus</div>
                                      <div>Mining: -5s Cooldown</div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {item.id === "tarnished_compass" && (
                            <TooltipProvider>
                              <Tooltip
                                open={mobileTooltip.isTooltipOpen(
                                  "tarnished-compass-info",
                                )}
                              >
                                <TooltipTrigger asChild>
                                  <button
                                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground text-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (mobileTooltip.isMobile) {
                                        mobileTooltip.handleTooltipClick(
                                          "tarnished-compass-info",
                                          e,
                                        );
                                      }
                                    }}
                                  >
                                    ⓘ
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[14rem]">
                                  <div className="text-xs">
                                    <div className="font-bold mb-1">
                                      Tarnished Compass
                                    </div>

                                    <div className="mt-1 space-y-0.5">
                                      <div>+5 Luck</div>
                                      <div>10% chance to double gains from all actions</div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </CardTitle>
                        <CardDescription className="text-bold">
                          {item.originalPrice && (
                            <span className="line-through text-muted-foreground mr-2">
                              {formatPrice(item.originalPrice)}
                            </span>
                          )}
                          {formatPrice(item.price)}
                          {item.bundleComponents && item.bundleComponents.length > 0 && (() => {
                            const componentsCost = item.bundleComponents.reduce((total, componentId) => {
                              return total + SHOP_ITEMS[componentId].price;
                            }, 0);
                            const savings = componentsCost - item.price;
                            const savingsPercent = Math.round((savings / componentsCost) * 100);
                            return (
                              <span className="ml-2 px-1 py-[1px] text-xs text-green-600 font-semibold border border-green-800 rounded bg-green-950/50">
                                - {savingsPercent}%
                              </span>
                            );
                          })()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="min-h-16 pl-3 pr-3 md:pl-6 md:pr-6 pb-3 md:pb-4 flex-1">
                        <p className="leading-snug text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </CardContent>
                      <CardFooter className="pl-3 pr-3 md:pl-6 md:pr-6 pb-4 md:pb-6 flex-col gap-2">
                        <Button
                          onClick={() => handlePurchaseClick(item.id)}
                          disabled={
                            !currentUser ||
                            (item.id === "gold_100_free" &&
                              (Date.now() -
                                (gameState.lastFreeGoldClaim || 0)) /
                                (1000 * 60 * 60) <
                                24) ||
                            (item.id !== "gold_100_free" &&
                              !item.canPurchaseMultipleTimes &&
                              purchasedItems.some((pid) => {
                                if (!pid.startsWith("purchase-")) return false;
                                const withoutPrefix = pid.substring(
                                  "purchase-".length,
                                );
                                if (withoutPrefix.includes("-temp-")) {
                                  return (
                                    withoutPrefix.substring(
                                      0,
                                      withoutPrefix.indexOf("-temp-"),
                                    ) === item.id
                                  );
                                }
                                const parts = withoutPrefix.split("-");
                                return parts.slice(0, -5).join("-") === item.id;
                              }))
                          }
                          className="h-8 md:h-10 w-full"
                          button_id={`shop-purchase-${item.id}`}
                        >
                          {item.id === "gold_100_free"
                            ? (Date.now() -
                                (gameState.lastFreeGoldClaim || 0)) /
                                (1000 * 60 * 60) <
                              24
                              ? (() => {
                                  const hoursRemaining = Math.ceil(
                                    24 -
                                      (Date.now() -
                                        (gameState.lastFreeGoldClaim || 0)) /
                                        (1000 * 60 * 60),
                                  );
                                  return hoursRemaining === 1
                                    ? "Available in 1 hour"
                                    : `Available in ${hoursRemaining} hours`;
                                })()
                              : "Claim"
                            : !item.canPurchaseMultipleTimes &&
                                purchasedItems.some((pid) => {
                                  if (!pid.startsWith("purchase-"))
                                    return false;
                                  const withoutPrefix = pid.substring(
                                    "purchase-".length,
                                  );
                                  if (withoutPrefix.includes("-temp-")) {
                                    return (
                                      withoutPrefix.substring(
                                        0,
                                        withoutPrefix.indexOf("-temp-"),
                                      ) === item.id
                                    );
                                  }
                                  const parts = withoutPrefix.split("-");
                                  return (
                                    parts.slice(0, -5).join("-") === item.id
                                  );
                                })
                              ? item.price === 0
                                ? "Already Claimed"
                                : "Already Purchased"
                              : item.price === 0
                                ? "Claim"
                                : "Purchase"}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="purchases" className="mt-4">
              <ScrollArea
                className={
                  !currentUser ? "h-[calc(80vh-250px)]" : "h-[calc(80vh-180px)]"
                }
              >
                {purchasedItems.length === 0 &&
                Object.keys(gameState.feastActivations || {}).length === 0 ? ( // Changed feastPurchases to feastActivations
                  <div className="text-center py-8 text-muted-foreground">
                    No purchases yet. Visit the For Sale tab to buy items.
                  </div>
                ) : (
                  <div className="pr-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Activate your purchases to receive rewards. Each purchase
                      can be activated once per game.
                    </p>
                    <div className="space-y-2">
                      {Object.entries(gameState.feastActivations || {}).map(
                        ([purchaseId, activationsRemaining]) => {
                          let itemId = null;
                          if (purchaseId.startsWith("purchase-")) {
                            const withoutPrefix = purchaseId.substring(
                              "purchase-".length,
                            );
                            const parts = withoutPrefix.split("-");
                            itemId = parts.slice(0, -5).join("-");
                          }

                          const item = itemId ? SHOP_ITEMS[itemId] : null;

                          if (!item) {
                            return null;
                          }

                          // Skip bundles - only show bundle components
                          if (item.bundleComponents) {
                            return null;
                          }

                          const isGreatFeastActive =
                            gameState.greatFeastState?.isActive &&
                            gameState.greatFeastState.endTime > Date.now();

                          return (
                            <div
                              key={purchaseId}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {item.name} ({activationsRemaining}/
                                  {item.rewards.feastActivations!} available){" "}
                                  {/* Display remaining activations */}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              </div>
                              <Button
                                onClick={() =>
                                  handleActivatePurchase(
                                    purchaseId,
                                    item.id, // Use item.id for the itemId argument
                                  )
                                }
                                disabled={
                                  activationsRemaining <= 0 || // Check remaining activations
                                  isGreatFeastActive
                                }
                                size="sm"
                                variant={
                                  isGreatFeastActive ||
                                  activationsRemaining <= 0
                                    ? "outline"
                                    : "default"
                                }
                                className={
                                  isGreatFeastActive
                                    ? "bg-green-900/50 text-white border-green-600"
                                    : ""
                                }
                                button_id={`shop-activate-${item.id}`}
                              >
                                {isGreatFeastActive
                                  ? "Active"
                                  : activationsRemaining <= 0
                                    ? "Activated"
                                    : "Activate"}
                              </Button>
                            </div>
                          );
                        },
                      )}

                      {/* Show non-feast, non-bundle purchases */}
                      {purchasedItems
                        .filter((purchaseId) => {
                          // Extract itemId from purchaseId (format: purchase-{itemId}-{uuid})
                          let itemId = purchaseId;
                          if (purchaseId.startsWith("purchase-")) {
                            const withoutPrefix = purchaseId.substring(
                              "purchase-".length,
                            );
                            const parts = withoutPrefix.split("-");
                            // Extract itemId by removing the UUID parts
                            itemId = parts.slice(0, -5).join("-");
                          }
                          const item = SHOP_ITEMS[itemId];
                          return (
                            item &&
                            !item.rewards.feastActivations &&
                            !item.bundleComponents
                          );
                        })
                        .map((purchaseId) => {
                          // Extract itemId from purchaseId (format: purchase-{itemId}-{uuid})
                          let itemId = purchaseId;
                          if (purchaseId.startsWith("purchase-")) {
                            const withoutPrefix = purchaseId.substring(
                              "purchase-".length,
                            );
                            const parts = withoutPrefix.split("-");
                            // Remove the last 5 parts (UUID segments)
                            itemId = parts.slice(0, -5).join("-");
                          }
                          const item = SHOP_ITEMS[itemId];

                          if (!item) return null;

                          const isActivated =
                            activatedPurchases[purchaseId] || false;
                          const isCruelModeItem = itemId === "cruel_mode";

                          return (
                            <div
                              key={purchaseId}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {item.name}
                                  {isCruelModeItem && (
                                    <span className="text-md  font-medium ml-2">
                                      (to play activate and start a new game)
                                    </span>
                                  )}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              </div>
                              <Button
                                onClick={() =>
                                  handleActivatePurchase(purchaseId, itemId)
                                }
                                disabled={!isCruelModeItem && isActivated}
                                size="sm"
                                variant={isActivated ? "outline" : "default"}
                                button_id={`shop-activate-${itemId}`}
                              >
                                {isCruelModeItem
                                  ? isActivated
                                    ? "Deactivate"
                                    : "Activate"
                                  : isActivated
                                    ? "Activated"
                                    : "Activate"}
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                <ScrollBar orientation="vertical overflow-auto" />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>

      {/* Payment Dialog - only shown when payment is in progress */}
      {clientSecret && selectedItem && (
        <Dialog open={true} onOpenChange={undefined}>
          <DialogContent
            className="max-w-md max-h-[80vh] z-[80] [&>button]:hidden"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                Complete Purchase: {SHOP_ITEMS[selectedItem]?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(85vh-120px)] overflow-y-auto scrollbar-visible px-6 pb-6">
              <Elements stripe={getStripePromise()} options={{ clientSecret }}>
                <CheckoutForm
                  itemId={selectedItem}
                  onSuccess={handlePurchaseSuccess}
                  currency={currency}
                  onCancel={handleCancelPayment}
                />
              </Elements>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}