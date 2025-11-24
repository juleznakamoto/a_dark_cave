import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
import { SHOP_ITEMS, type ShopItem } from "../../../../shared/shopItems";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { renderItemTooltip } from "@/game/rules/itemTooltips";
import { Info } from "lucide-react";
import { tailwindToHex } from "@/lib/tailwindColors";

const stripePublishableKey = import.meta.env.PROD
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV;

const stripePromise = loadStripe(stripePublishableKey || "");

// Function to get an initialized Supabase client
const getSupabaseClient = async () => {
  // Assuming supabase client is already initialized and ready
  // If there's a more complex initialization logic (e.g., async setup),
  // you would handle it here to ensure the client is ready before use.
  return supabase;
};

interface CheckoutFormProps {
  itemId: string;
  onSuccess: () => void;
}

function CheckoutForm({ itemId, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      // Verify payment on backend and grant rewards
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });

      const result = await response.json();
      if (result.success) {
        // Save purchase to Supabase (same as free items)
        try {
          const user = await getCurrentUser();
          if (user) {
            const item = SHOP_ITEMS[result.itemId];
            const client = await getSupabaseClient();
            const { error } = await client.from("purchases").insert({
              user_id: user.id,
              item_id: result.itemId,
              item_name: item.name,
              price_paid: item.price,
              purchased_at: new Date().toISOString(),
            });

            if (error) {
              console.error("Error saving purchase to Supabase:", error);
            }

            // Set hasMadeNonFreePurchase flag if this is a paid item
            if (item.price > 0) {
              useGameStore.setState({ hasMadeNonFreePurchase: true });
            }
          }
        } catch (error) {
          console.error("Exception saving purchase to Supabase:", error);
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

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        button_id="shop-complete-purchase"
      >
        {isProcessing ? "Processing..." : "Complete Purchase"}
      </Button>
    </form>
  );
}

interface ShopDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShopDialog({ isOpen, onClose }: ShopDialogProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const gameState = useGameStore();
  const activatedPurchases = gameState.activatedPurchases || {};

  const loadPurchasedItems = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const client = await getSupabaseClient();
      const { data, error } = await client
        .from("purchases")
        .select("item_id")
        .eq("user_id", user.id);

      if (error) throw error;
      if (data) {
        setPurchasedItems(data.map((p) => p.item_id));
      }
    } catch (error) {
      console.error("Error loading purchased items:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      // Check if user is authenticated
      const user = await getCurrentUser();
      setCurrentUser(user);

      // Load user's purchases from database
      if (user) {
        await loadPurchasedItems();
      }

      setIsLoading(false);
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handlePurchaseClick = async (itemId: string) => {
    const item = SHOP_ITEMS[itemId];

    // For free items, skip payment but save to Supabase
    if (item.price === 0) {
      try {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Save purchase to Supabase
        const client = await getSupabaseClient();
        const { error } = await client.from("purchases").insert({
          user_id: user.id,
          item_id: itemId,
          item_name: item.name,
          price_paid: item.price,
          purchased_at: new Date().toISOString(),
        });

        if (error) throw error;

        // Add to purchased items list
        setPurchasedItems((prev) => [...prev, itemId]);

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

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 10000);
      } catch (error) {
        console.error("Error claiming free item:", error);
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
    const response = await fetch("/api/payment/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });

    const { clientSecret } = await response.json();
    setClientSecret(clientSecret);
    setSelectedItem(itemId);
  };

  const handlePurchaseSuccess = async () => {
    const item = SHOP_ITEMS[selectedItem!];

    // Save purchase to database is now handled by verifyPurchase
    // Add to purchased items list
    setPurchasedItems((prev) => [...prev, selectedItem!]);

    // Set hasMadeNonFreePurchase flag if this is a paid item
    if (item.price > 0) {
      useGameStore.setState({ hasMadeNonFreePurchase: true });
    }

    // If this item has feast activations (feast or bundle), track it individually
    if (item.rewards.feastActivations) {
      const purchaseId = `feast-purchase-${Date.now()}`;
      useGameStore.setState((state) => ({
        feastPurchases: {
          ...state.feastPurchases,
          [purchaseId]: {
            itemId: selectedItem!,
            activationsRemaining: item.rewards.feastActivations!,
            totalActivations: item.rewards.feastActivations!,
            purchasedAt: Date.now(),
          },
        },
      }));
    }

    gameState.addLogEntry({
      id: `purchase-${Date.now()}`,
      message: `Purchase successful! ${item.name} has been added to your purchases. You can activate it from the Purchases section.`,
      timestamp: Date.now(),
      type: "system",
    });

    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 10000);

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
      const purchase = gameState.feastPurchases?.[purchaseId];
      if (!purchase || purchase.activationsRemaining <= 0) return;

      // Grant resources if this is a bundle
      if (item.rewards.resources) {
        Object.entries(item.rewards.resources).forEach(([resource, amount]) => {
          gameState.updateResource(resource as any, amount);
        });
      }

      // Activate a Great Feast
      const feastDuration = 60 * 60 * 1000; // 60 minutes in milliseconds
      const endTime = Date.now() + feastDuration;

      useGameStore.setState((state) => ({
        feastPurchases: {
          ...state.feastPurchases,
          [purchaseId]: {
            ...purchase,
            activationsRemaining: purchase.activationsRemaining - 1,
          },
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
        [itemId]: true,
      },
      hasMadeNonFreePurchase: state.hasMadeNonFreePurchase || item.price > 0,
    }));
  };

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toFixed(2)} €`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Shop</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            All in-game purchases are currently 50 % off during the
            Beta phase.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        )}

        {!isLoading && showSuccess && (
          <div className="bg-green-800 text-gray-100 px-4 py-3 rounded-md mb-4">
            Purchase successful! Check the Purchases tab to activate your items.
          </div>
        )}

        {!isLoading && !currentUser && (
          <div className="bg-red-900 text-gray-100 px-4 py-3 rounded-md text-center">
            Sign in or create an account to purchase items.
          </div>
        )}

        {!isLoading && !clientSecret ? (
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pr-4">
                  {Object.values(SHOP_ITEMS).map((item) => (
                    <Card key={item.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-md flex items-center gap-2">
                            {item.name}
                            {item.symbol && (
                              <span
                                className="text-lg"
                                style={{
                                  color: tailwindToHex(
                                    item.symbolColor.replace("text-", ""),
                                  ),
                                }}
                              >
                                {item.symbol}
                              </span>
                            )}
                          </CardTitle>
                          {(item.rewards.weapons ||
                            item.rewards.tools ||
                            item.rewards.blessings) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 text-muted-foreground cursor-pointer flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-2">
                                    {item.rewards.weapons?.map((weapon) => (
                                      <div key={weapon}>
                                        {renderItemTooltip(weapon, "weapon")}
                                      </div>
                                    ))}
                                    {item.rewards.tools?.map((tool) => (
                                      <div key={tool}>
                                        {renderItemTooltip(tool, "tool")}
                                      </div>
                                    ))}
                                    {item.rewards.blessings?.map((blessing) => (
                                      <div key={blessing}>
                                        {renderItemTooltip(
                                          blessing,
                                          "blessing",
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <CardDescription className="text-bold">
                          {item.originalPrice && (
                            <span className="line-through text-muted-foreground mr-2">
                              {formatPrice(item.originalPrice)}
                            </span>
                          )}
                          {formatPrice(item.price)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </CardContent>
                      <CardFooter className="flex-col gap-2">
                        <Button
                          onClick={() => handlePurchaseClick(item.id)}
                          disabled={
                            !currentUser ||
                            (!item.canPurchaseMultipleTimes &&
                              purchasedItems.includes(item.id))
                          }
                          className="w-full"
                          button_id={`shop-purchase-${item.id}`}
                        >
                          {!item.canPurchaseMultipleTimes &&
                          purchasedItems.includes(item.id)
                            ? "Already Purchased"
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
                Object.keys(gameState.feastPurchases || {}).length === 0 ? (
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
                      {/* Show individual feast purchases and bundles */}
                      {Object.entries(gameState.feastPurchases || {}).map(
                        ([purchaseId, purchase]) => {
                          const item = SHOP_ITEMS[purchase.itemId];
                          if (!item) return null;

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
                                  {item.name} ({purchase.activationsRemaining}/
                                  {purchase.totalActivations} available)
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              </div>
                              <Button
                                onClick={() =>
                                  handleActivatePurchase(
                                    purchaseId,
                                    purchase.itemId,
                                  )
                                }
                                disabled={
                                  purchase.activationsRemaining <= 0 ||
                                  isGreatFeastActive
                                }
                                size="sm"
                                variant={
                                  isGreatFeastActive ? "outline" : "default"
                                }
                                className={
                                  isGreatFeastActive
                                    ? "bg-green-900/50 text-white border-green-600"
                                    : ""
                                }
                                button_id={`shop-activate-${purchase.itemId}`}
                              >
                                {isGreatFeastActive ? "Active" : "Activate"}
                              </Button>
                            </div>
                          );
                        },
                      )}

                      {/* Show non-feast, non-bundle purchases */}
                      {purchasedItems
                        .filter((itemId) => {
                          const item = SHOP_ITEMS[itemId];
                          return item && !item.rewards.feastActivations;
                        })
                        .map((itemId) => {
                          const item = SHOP_ITEMS[itemId];
                          if (!item) return null;

                          const isActivated =
                            activatedPurchases[itemId] || false;
                          const isCruelModeItem = itemId === "cruel_mode";

                          return (
                            <div
                              key={itemId}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {item.name}
                                  {isCruelModeItem && (
                                    <span className="text-md  font-medium  ml-2">
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
                                  handleActivatePurchase(itemId, itemId)
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
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : clientSecret ? (
          <ScrollArea className="max-h-[calc(80vh-80px)]">
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-4">
                Complete Purchase: {SHOP_ITEMS[selectedItem!]?.name}
              </h3>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  itemId={selectedItem!}
                  onSuccess={handlePurchaseSuccess}
                />
              </Elements>
              <Button
                variant="outline"
                onClick={() => setClientSecret(null)}
                className="w-full mt-4"
                button_id="shop-cancel-payment"
              >
                Cancel
              </Button>
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
