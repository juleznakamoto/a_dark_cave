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
              console.error('Error saving purchase to Supabase:', error);
            }
          }
        } catch (error) {
          console.error('Exception saving purchase to Supabase:', error);
        }
        
        onSuccess();
      }
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <div className="space-y-2 border-t pt-4 mt-4">
        <p className="text-[10px] text-muted-foreground">
          By completing this purchase, you agree that the delivery of the digital item begins immediately and acknowledge that you thereby lose your right of withdrawal. For more information, please see our{" "}
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

// Helper function to get combined rewards from bundle items
const getBundleRewards = (bundleItemIds: string[]): ShopItemRewards => {
  const combinedRewards: ShopItemRewards = {};

  bundleItemIds.forEach(itemId => {
    const item = SHOP_ITEMS[itemId];
    if (!item) return;

    // Combine resources
    if (item.rewards.resources) {
      if (!combinedRewards.resources) {
        combinedRewards.resources = {};
      }
      Object.entries(item.rewards.resources).forEach(([resource, amount]) => {
        combinedRewards.resources![resource] = (combinedRewards.resources![resource] || 0) + amount;
      });
    }

    // Combine tools
    if (item.rewards.tools) {
      if (!combinedRewards.tools) {
        combinedRewards.tools = [];
      }
      combinedRewards.tools.push(...item.rewards.tools);
    }

    // Combine weapons
    if (item.rewards.weapons) {
      if (!combinedRewards.weapons) {
        combinedRewards.weapons = [];
      }
      combinedRewards.weapons.push(...item.rewards.weapons);
    }

    // Combine blessings
    if (item.rewards.blessings) {
      if (!combinedRewards.blessings) {
        combinedRewards.blessings = [];
      }
      combinedRewards.blessings.push(...item.rewards.blessings);
    }

    // Combine feast activations
    if (item.rewards.feastActivations) {
      combinedRewards.feastActivations = (combinedRewards.feastActivations || 0) + item.rewards.feastActivations;
    }
  });

  return combinedRewards;
};

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

    // For paid items, create payment intent
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

    // Get actual rewards (from bundleItems if it's a bundle, otherwise from item.rewards)
    const actualRewards = item.bundleItems ? getBundleRewards(item.bundleItems) : item.rewards;

    // If this item has feast activations (feast or bundle), track it individually
    if (actualRewards.feastActivations) {
      const purchaseId = `feast-purchase-${Date.now()}`;
      useGameStore.setState((state) => ({
        feastPurchases: {
          ...state.feastPurchases,
          [purchaseId]: {
            itemId: selectedItem!,
            activationsRemaining: actualRewards.feastActivations!,
            totalActivations: actualRewards.feastActivations!,
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
          : (item.activationMessage ||
            "Cruel Mode activated! Start a new game to experience the ultimate challenge."),
        timestamp: Date.now(),
        type: "system",
      });

      return;
    }

    // Get actual rewards (from bundleItems if it's a bundle, otherwise from item.rewards)
    const actualRewards = item.bundleItems ? getBundleRewards(item.bundleItems) : item.rewards;

    // For items with feast activations (feast or bundle), use individual purchase tracking
    if (actualRewards.feastActivations) {
      const purchase = gameState.feastPurchases?.[purchaseId];
      if (!purchase || purchase.activationsRemaining <= 0) return;

      // Grant resources if this is a bundle
      if (actualRewards.resources) {
        Object.entries(actualRewards.resources).forEach(([resource, amount]) => {
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
    if (actualRewards.resources) {
      Object.entries(actualRewards.resources).forEach(([resource, amount]) => {
        gameState.updateResource(resource as any, amount);
      });
    }

    if (actualRewards.tools) {
      actualRewards.tools.forEach((tool) => {
        gameState.tools[tool as keyof typeof gameState.tools] = true;
      });
    }

    if (actualRewards.weapons) {
      actualRewards.weapons.forEach((weapon) => {
        gameState.weapons[weapon as keyof typeof gameState.weapons] = true;
      });
    }

    if (actualRewards.blessings) {
      actualRewards.blessings.forEach((blessing) => {
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

    // Mark as activated in game state
    useGameStore.setState((state) => ({
      activatedPurchases: {
        ...state.activatedPurchases,
        [purchaseId]: true,
      },
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
          <DialogDescription className="sr-only">
            Purchase items and manage your purchases
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
          <div className="bg-red-950 text-gray-100 px-4 py-3 rounded-md mb-4 text-center">
            Sign in or create an account to purchase items.
          </div>
        )}

        {!isLoading && !clientSecret ? (
          <Tabs defaultValue="shop" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shop">For Sale</TabsTrigger>
              <TabsTrigger value="purchases" disabled={!currentUser}>Purchases</TabsTrigger>
            </TabsList>

            <TabsContent value="shop" className="mt-4">
              <ScrollArea className="h-[calc(80vh-180px)]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pr-4">
                  {Object.values(SHOP_ITEMS).map((item) => (
                    <Card key={item.id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-md flex items-center gap-2">
                            {item.name}
                            {item.symbol && (
                              <span className="text-lg" style={{ color: tailwindToHex(item.symbolColor.replace('text-', '')) }}>
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
                                          {renderItemTooltip(blessing, "blessing")}
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
                      <CardFooter>
                        <Button
                          onClick={() => handlePurchaseClick(item.id)}
                          disabled={
                            !currentUser ||
                            (!item.canPurchaseMultipleTimes &&
                              purchasedItems.includes(item.id))
                          }
                          className="w-full"
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
              <ScrollArea className="h-[calc(80vh-180px)]">
                {purchasedItems.length === 0 &&
                Object.keys(gameState.feastPurchases || {}).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No purchases yet. Visit the For Sale tab to buy items.
                  </div>
                ) : (
                  <div className="pr-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Activate your purchases to receive rewards. Each purchase
                      can only be activated once per game.
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
                              >
                                {isGreatFeastActive ? "Active" : "Activate"}
                              </Button>
                            </div>
                          );
                        },
                      )}

                      {/* Show non-feast, non-bundle purchases */}
                      {purchasedItems
                        .filter(
                          (itemId) => {
                            const item = SHOP_ITEMS[itemId];
                            return item && !item.rewards.feastActivations;
                          }
                        )
                        .map((itemId) => {
                          const item = SHOP_ITEMS[itemId];
                          if (!item) return null;

                          const isActivated = activatedPurchases[itemId] || false;
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
                              >
                                {isCruelModeItem 
                                  ? (isActivated ? "Deactivate" : "Activate")
                                  : (isActivated ? "Activated" : "Activate")
                                }
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