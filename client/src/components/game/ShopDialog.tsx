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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  const [consentWithdrawal, setConsentWithdrawal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!consentWithdrawal) {
      setErrorMessage(
        "You must agree to the required terms to complete the purchase.",
      );
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

      <div className="space-y-2 border-t pt-4 mt-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="consent-withdrawal"
            checked={consentWithdrawal}
            onCheckedChange={(checked) =>
              setConsentWithdrawal(checked as boolean)
            }
          />
          <Label
            htmlFor="consent-withdrawal"
            className="text-xs cursor-pointer"
          >
            I agree that the delivery of the digital item begins immediately and acknowledge that I thereby lose my right of withdrawal.
          </Label>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          For more information, please see our{" "}
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
        disabled={
          !stripe || isProcessing || !consentWithdrawal
        }
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

    // If this is a feast item, track it individually
    if (item.category === "feast" && item.rewards.feastActivations) {
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

    // For feast items, use individual purchase tracking
    if (item.category === "feast") {
      const purchase = gameState.feastPurchases?.[purchaseId];
      if (!purchase || purchase.activationsRemaining <= 0) return;

      // Activate a Great Feast
      const feastDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
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
          `A Great Feast has begun! The village celebrates with exceptional vigor for the next 30 minutes.`,
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
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
            </TabsList>

            <TabsContent value="shop" className="mt-4">
              <ScrollArea className="h-[calc(80vh-180px)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-4">
                  {Object.values(SHOP_ITEMS).map((item) => (
                    <Card key={item.id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {item.name}
                            {item.symbol && (
                              <span className={item.symbolColor}>{item.symbol}</span>
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
                      {/* Show individual feast purchases */}
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

                      {/* Show non-feast purchases */}
                      {purchasedItems
                        .filter(
                          (itemId) => SHOP_ITEMS[itemId]?.category !== "feast",
                        )
                        .map((itemId) => {
                          const item = SHOP_ITEMS[itemId];
                          if (!item) return null;

                          const isActivated = activatedPurchases[itemId] || false;

                          return (
                            <div
                              key={itemId}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {item.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              </div>
                              <Button
                                onClick={() =>
                                  handleActivatePurchase(itemId, itemId)
                                }
                                disabled={isActivated}
                                size="sm"
                                variant={isActivated ? "outline" : "default"}
                              >
                                {isActivated ? "Activated" : "Activate"}
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