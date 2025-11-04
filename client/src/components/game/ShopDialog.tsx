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
import { weaponEffects, toolEffects, clothingEffects } from "@/game/rules/effects";
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
    if (!item || activatedPurchases[itemId]) return;

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

    if (item.rewards.feastActivations) {
      // Add feast activations to a counter or grant them directly
      gameState.addLogEntry({
        id: `feast-${Date.now()}`,
        message: `Received ${item.rewards.feastActivations} Great Feast activation(s)! Use them wisely.`,
        timestamp: Date.now(),
        type: "system",
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
                                <div className="text-xs whitespace-pre-line">
                                  {item.rewards.weapons?.map((weapon) => {
                                    const effect = weaponEffects[weapon];
                                    return (
                                      <div key={weapon}>
                                        {effect && (
                                          <>
                                            {effect.name && (
                                              <div className="font-bold mb-1">{effect.name}</div>
                                            )}
                                            {effect.description && (
                                              <div className="text-gray-400 mb-1 max-w-xs whitespace-normal text-wrap">{effect.description}</div>
                                            )}
                                            {effect.bonuses && (
                                              <div className="mt-1 space-y-0.5">
                                                {effect.bonuses.actionBonuses && Object.entries(effect.bonuses.actionBonuses).map(([action, bonus]) => {
                                                  const parts = [];
                                                  if (bonus.resourceMultiplier) {
                                                    parts.push(`+${Math.round((bonus.resourceMultiplier - 1) * 100)}% ${action}`);
                                                  }
                                                  if (bonus.cooldownReduction) {
                                                    parts.push(`-${bonus.cooldownReduction}s cooldown`);
                                                  }
                                                  return parts.length > 0 ? <div key={action}>{parts.join(", ")}</div> : null;
                                                })}
                                                {effect.bonuses.generalBonuses?.strength && (
                                                  <div>+{effect.bonuses.generalBonuses.strength} Damage</div>
                                                )}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {item.rewards.tools?.map((tool) => {
                                    const effect = toolEffects[tool];
                                    return (
                                      <div key={tool}>
                                        {effect && (
                                          <>
                                            {effect.name && (
                                              <div className="font-bold mb-1">{effect.name}</div>
                                            )}
                                            {effect.description && (
                                              <div className="text-gray-400 mb-1 max-w-xs whitespace-normal text-wrap">{effect.description}</div>
                                            )}
                                            {effect.bonuses && (
                                              <div className="mt-1 space-y-0.5">
                                                {effect.bonuses.actionBonuses && Object.entries(effect.bonuses.actionBonuses).map(([action, bonus]) => {
                                                  const parts = [];
                                                  if (bonus.resourceMultiplier) {
                                                    parts.push(`+${Math.round((bonus.resourceMultiplier - 1) * 100)}% ${action}`);
                                                  }
                                                  if (bonus.cooldownReduction) {
                                                    parts.push(`-${bonus.cooldownReduction}s cooldown`);
                                                  }
                                                  return parts.length > 0 ? <div key={action}>{parts.join(", ")}</div> : null;
                                                })}
                                                {effect.bonuses.generalBonuses?.caveExploreMultiplier && (
                                                  <div>+{Math.round((effect.bonuses.generalBonuses.caveExploreMultiplier - 1) * 100)}% Cave Explore</div>
                                                )}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {item.rewards.blessings?.map((blessing) => {
                                    const effect = clothingEffects[blessing];
                                    return (
                                      <div key={blessing}>
                                        {effect && (
                                          <>
                                            {effect.name && (
                                              <div className="font-bold mb-1">{effect.name}</div>
                                            )}
                                            {effect.description && (
                                              <div className="text-gray-400 mb-1 max-w-xs whitespace-normal text-wrap">{effect.description}</div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
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

              {purchasedItems.length > 0 && (
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
                        <Card key={itemId}>
                          <CardHeader>
                            <CardTitle className="text-sm">
                              {item.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-xs">
                              {item.rewards.resources && (
                                <div>
                                  {Object.entries(item.rewards.resources)
                                    .map(([r, a]) => `${a} ${r}`)
                                    .join(", ")}
                                </div>
                              )}
                              {item.rewards.tools && (
                                <div>
                                  {item.rewards.tools.map((tool) => {
                                    const effect = toolEffects[tool];
                                    const toolName = effect?.name || tool.replace(/_/g, " ");

                                    return (
                                      <div key={tool} className="flex items-start gap-1 mb-1">
                                        <span className="font-semibold">{toolName}:</span>
                                        {effect && (
                                          <span className="text-muted-foreground">
                                            {effect.bonuses?.actionBonuses && Object.entries(effect.bonuses.actionBonuses).map(([action, bonus]) => {
                                              const parts = [];
                                              if (bonus.resourceMultiplier) {
                                                parts.push(`+${Math.round((bonus.resourceMultiplier - 1) * 100)}% ${action}`);
                                              }
                                              if (bonus.cooldownReduction) {
                                                parts.push(`-${bonus.cooldownReduction}s cooldown`);
                                              }
                                              return parts.join(", ");
                                            }).join("; ")}
                                            {effect.bonuses?.generalBonuses?.caveExploreMultiplier && (
                                              `+${Math.round((effect.bonuses.generalBonuses.caveExploreMultiplier - 1) * 100)}% Cave Explore`
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {item.rewards.weapons && (
                                <div>
                                  {item.rewards.weapons.map((weapon) => {
                                    const effect = weaponEffects[weapon];
                                    const weaponName = effect?.name || weapon.replace(/_/g, " ");

                                    return (
                                      <div key={weapon} className="flex items-start gap-1 mb-1">
                                        <span className="font-semibold">{weaponName}:</span>
                                        {effect && (
                                          <span className="text-muted-foreground">
                                            {effect.bonuses?.actionBonuses?.hunt?.resourceMultiplier && (
                                              `+${Math.round((effect.bonuses.actionBonuses.hunt.resourceMultiplier - 1) * 100)}% Hunt`
                                            )}
                                            {effect.bonuses?.generalBonuses?.strength && (
                                              ` +${effect.bonuses.generalBonuses.strength} Damage`
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {item.rewards.blessings && (
                                <div>
                                  {item.rewards.blessings.map((blessing) => {
                                    const effect = clothingEffects[blessing];
                                    const blessingName = effect?.name || blessing.replace(/_/g, " ");

                                    return (
                                      <div key={blessing} className="flex items-start gap-1 mb-1">
                                        <span className="font-semibold">{blessingName}:</span>
                                        {effect?.description && (
                                          <span className="text-muted-foreground">{effect.description}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {item.rewards.feastActivations && (
                                <div>
                                  {item.rewards.feastActivations} Great Feast Activation{item.rewards.feastActivations > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button
                              onClick={() => handleActivatePurchase(itemId)}
                              disabled={isActivated}
                              className="w-full"
                              variant={isActivated ? "outline" : "default"}
                            >
                              {isActivated ? "Activated" : "Activate"}
                            </Button>
                          </CardFooter>
                        </Card>
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