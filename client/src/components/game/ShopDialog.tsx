import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { renderItemTooltip } from "@/game/rules/itemTooltips";
import { Info } from "lucide-react";

const stripePublishableKey = import.meta.env.PROD
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV;

const stripePromise = loadStripe(stripePublishableKey || "");

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
        onSuccess();
      }
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
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

  useEffect(() => {
    const loadData = async () => {
      // Check if user is authenticated
      const user = await getCurrentUser();
      setCurrentUser(user);

      // Load user's purchases from database
      if (user) {
        const { data: purchases, error } = await supabase
          .from("purchases")
          .select("item_id")
          .eq("user_id", user.id);

        if (!error && purchases) {
          setPurchasedItems(purchases.map((p) => p.item_id));
        }
      }

      setIsLoading(false);
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handlePurchaseClick = async (itemId: string) => {
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

    // Save purchase to database
    const currentUser = await getCurrentUser();
    if (currentUser) {
      const { error } = await supabase.from("purchases").insert({
        user_id: currentUser.id,
        item_id: selectedItem!,
        item_name: item.name,
        price_paid: item.price,
        purchased_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Failed to save purchase:", error);
      }
    }

    // Add to purchased items list
    setPurchasedItems((prev) => [...prev, selectedItem!]);

    gameState.addLogEntry({
      id: `purchase-${Date.now()}`,
      message: `Purchase successful! ${item.name} has been added to your purchases. You can activate it once per game from the Purchases section.`,
      timestamp: Date.now(),
      type: "system",
    });

    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 10000);

    setClientSecret(null);
    setSelectedItem(null);
  };

  const handleActivatePurchase = (itemId: string) => {
    const item = SHOP_ITEMS[itemId];
    if (!item) return;

    // For feast items, check if there are any activations available
    if (item.category === 'feast') {
      const currentActivations = gameState.greatFeastActivations || 0;
      if (currentActivations <= 0) return;

      // Activate a Great Feast
      const feastDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
      const endTime = Date.now() + feastDuration;

      useGameStore.setState((state) => ({
        greatFeastActivations: (state.greatFeastActivations || 0) - 1,
        greatFeastState: {
          isActive: true,
          endTime: endTime,
        },
      }));

      gameState.addLogEntry({
        id: `great-feast-${Date.now()}`,
        message: `A Great Feast has begun! The village celebrates with exceptional vigor for the next 30 minutes.`,
        timestamp: Date.now(),
        type: "system",
      });
      return;
    }

    // For non-feast items, check if already activated
    if (activatedPurchases[itemId]) return;

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
        gameState.blessings[blessing as keyof typeof gameState.blessings] = true;
      });
    }

    gameState.addLogEntry({
      id: `activate-${Date.now()}`,
      message: `Activated ${item.name}! Rewards have been added to your inventory.`,
      timestamp: Date.now(),
      type: "system",
    });

    // Mark as activated in game state
    useGameStore.setState((state) => ({
      activatedPurchases: {
        ...state.activatedPurchases,
        [itemId]: true,
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
        </DialogHeader>

        <ScrollArea className="max-h-[calc(80vh-80px)]">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          )}

          {!isLoading && showSuccess && (
            <div className="bg-green-800 text-gray-100 px-4 py-3 rounded-md mb-4">
              Purchase successful! Check the Purchases section below to activate
              your items.
            </div>
          )}

          {!isLoading && !currentUser && (
            <div className="bg-red-800 text-gray-100 px-4 py-3 rounded-md mb-4 text-center">
              Sign in or create an account to purchase items.
            </div>
          )}

          {!isLoading && !clientSecret ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {Object.values(SHOP_ITEMS).map((item) => (
                  <Card key={item.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        {(item.rewards.weapons || item.rewards.tools || item.rewards.blessings) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-muted-foreground cursor-pointer flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-2">
                                  {item.rewards.weapons?.map((weapon) => (
                                    <div key={weapon}>{renderItemTooltip(weapon, "weapon")}</div>
                                  ))}
                                  {item.rewards.tools?.map((tool) => (
                                    <div key={tool}>{renderItemTooltip(tool, "tool")}</div>
                                  ))}
                                  {item.rewards.blessings?.map((blessing) => (
                                    <div key={blessing}>{renderItemTooltip(blessing, "blessing")}</div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <CardDescription className="text-bold">
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

              {(purchasedItems.length > 0) && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Purchases</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Activate your purchases to receive rewards. Each purchase
                    can only be activated once per game.
                  </p>
                  <div className="space-y-2">
                    {purchasedItems.map((itemId) => {
                      const item = SHOP_ITEMS[itemId];
                      if (!item) return null;

                      const isActivated = activatedPurchases[itemId] || false;

                      return (
                        <div key={itemId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {item.name}
                              {item.category === 'feast' && item.rewards.feastActivations && 
                                ` (${item.rewards.feastActivations} available)`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          </div>
                          <Button
                            onClick={() => handleActivatePurchase(itemId)}
                            disabled={item.category === 'feast' ? ((gameState.greatFeastActivations || 0) <= 0 || (gameState.greatFeastState?.isActive && gameState.greatFeastState.endTime > Date.now())) : isActivated}
                            size="sm"
                            variant={item.category === 'feast' ? ((gameState.greatFeastState?.isActive && gameState.greatFeastState.endTime > Date.now()) ? "outline" : "default") : (isActivated ? "outline" : "default")}
                          >
                            {item.category === 'feast' 
                              ? ((gameState.greatFeastState?.isActive && gameState.greatFeastState.endTime > Date.now()) ? "Active" : "Activate")
                              : (isActivated ? "Activated" : "Activate")}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : clientSecret ? (
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
          ) : null}
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}