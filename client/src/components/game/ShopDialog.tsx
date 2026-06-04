import React, { useState, useEffect, useMemo } from "react";
import { useCoinHoverParticles } from "@/components/ui/coin-hover-particles";
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
import { ScrollAreaWithIndicator } from "@/components/ui/scroll-area-with-indicator";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGameStore } from "@/game/state";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { supabase } from "@/lib/supabase";
import {
  ensureAnonymousSession,
  getCurrentUser,
  getSessionAccessToken,
  getSessionUser,
  isAnonymousSession,
} from "@/game/auth";
import {
  applyFeastActivationsFromPurchaseRows,
  fetchPurchaseRowsForSessionUser,
  purchaseIdToItemId,
  purchaseIdsFromRows,
} from "@/game/shopPurchases";
import {
  GREAT_FEAST_DURATION_MS,
  SHOP_ITEMS,
  HIGHLIGHTS_ORDER,
  bundleComponentsListPriceSumCents,
  isShopPaidGoldPackItem,
  type ShopItem,
} from "../../../../shared/shopItems";
import {
  getDiscountedShopPriceCents,
  TRADERS_GRATITUDE_DISCOUNT_PERCENT,
  TRADERS_SON_DISCOUNT_PERCENT,
} from "../../../../shared/shopCheckoutPrice";
import { PLAYLIGHT_FIRST_PURCHASE_DISCOUNT_PERCENT } from "@/game/playlightRewards";
import { tailwindToHex } from "@/lib/tailwindColors";
import { getShopGlyphHoverParticleConfig } from "@/components/ui/bubbly-button.particles";
import { getStripeReturnUrlForConfirm } from "@/lib/stripePaymentReturn";
import { StripePoweredBy } from "@/components/game/StripePoweredBy";
import {
  resolveShopItemName,
  resolveShopItemDescription,
  resolveShopActivationMessage,
} from "@/i18n/shopLabels";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const stripePublishableKey = import.meta.env.PROD
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV;

// Defer Stripe loading: Load when shop is opened OR after 60 seconds
let stripePromise: Promise<any> | null = null;

const getStripePromise = async () => {
  if (!stripePromise && stripePublishableKey) {
    const { loadStripe } = await import("@stripe/stripe-js");
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Fallback: Load after 60 seconds even if shop hasn't been opened
setTimeout(() => {
  getStripePromise();
}, 60000);

// Function to get an initialized Supabase client
const getSupabaseClient = async () => {
  // Assuming supabase client is already initialized and ready
  // If there's a more complex initialization logic (e.g., async setup),
  // you would handle it here to ensure the client is ready before use.
  return supabase;
};

function completePaidShopPurchaseInStore() {
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
}

/** Small pill on shop cards (green border / tint); e.g. featured labels. */
const SHOP_CARD_PROMO_TAG_CLASS =
  "ml-1 px-1 py-[1px] leading-tight text-xs text-green-500 font-medium border border-green-500/40 rounded bg-green-500/5";

/** Strikethrough list price; bundles prefer explicit `originalPrice`, else summed component MSRP. */
function shopCardStrikethroughListCents(item: ShopItem): number | null {
  if (item.bundleComponents && item.bundleComponents.length > 0) {
    if (item.originalPrice != null && item.originalPrice > 0) {
      return item.originalPrice;
    }
    const sum = bundleComponentsListPriceSumCents(item.bundleComponents);
    return sum > 0 ? sum : null;
  }
  const o = item.originalPrice;
  return o !== undefined && o > 0 ? o : null;
}

/** Gold tab listings: paid resource packs with gold (excludes free gift + legacy `gold_250`). */
function shopItemMatchesGoldFilterTab(item: ShopItem): boolean {
  return (
    item.id !== "gold_100_free" &&
    item.id !== "gold_250" &&
    item.category === "resource" &&
    item.rewards.resources?.gold !== undefined
  );
}

type ShopCheckoutDiscountOpts = {
  playlightFirstPurchase?: boolean;
  tradersGratitude?: boolean;
  tradersSonGratitude?: boolean;
  cruelModeJourneyComplete?: boolean;
};

function getShopCheckoutDiscountOptions(
  item: ShopItem | undefined,
  gameState: {
    story?: { seen?: Record<string, boolean | number | undefined> };
    hasMadeNonFreePurchase?: boolean;
    tradersGratitudeState?: { accepted?: boolean };
    tradersSonGratitudeState?: { accepted?: boolean };
  },
): ShopCheckoutDiscountOpts {
  if (!item || item.price <= 0) return {};
  const journeySeen = gameState.story?.seen?.cruelModeJourneyCompleteDiscount;
  const journeyEligible = item.id === "cruel_mode" && journeySeen === true;
  return {
    playlightFirstPurchase: !!(
      item.price > 0 &&
      gameState.story?.seen?.playlightFirstPurchaseDiscountActive === true &&
      !gameState.hasMadeNonFreePurchase
    ),
    tradersGratitude: !!(
      item.price > 0 && gameState.tradersGratitudeState?.accepted === true
    ),
    tradersSonGratitude: !!(
      item.price > 0 && gameState.tradersSonGratitudeState?.accepted === true
    ),
    cruelModeJourneyComplete: !!(item.price > 0 && journeyEligible),
  };
}

function getCheckoutPriceBreakdown(
  item: ShopItem,
  gameState: Parameters<typeof getShopCheckoutDiscountOptions>[1],
): {
  listCents: number | null;
  betaDiscountCents: number;
  additionalDiscountCents: number;
  catalogCents: number;
  finalCents: number;
} {
  const catalogCents = item.price;
  const finalCents = getDiscountedShopPriceCents(
    catalogCents,
    getShopCheckoutDiscountOptions(item, gameState),
    item.id,
  );
  const listCents = shopCardStrikethroughListCents(item);
  const betaDiscountCents =
    listCents != null && listCents > catalogCents
      ? listCents - catalogCents
      : 0;
  const additionalDiscountCents =
    catalogCents > finalCents ? catalogCents - finalCents : 0;
  return {
    listCents,
    betaDiscountCents,
    additionalDiscountCents,
    catalogCents,
    finalCents,
  };
}

type ShopArtifactIdForTooltip =
  | "skull_lantern"
  | "tarnished_compass"
  | "crow_harness";

function shopArtifactIdFromShopItemId(
  itemId: string,
): ShopArtifactIdForTooltip | null {
  if (
    itemId === "skull_lantern" ||
    itemId === "tarnished_compass" ||
    itemId === "crow_harness"
  ) {
    return itemId;
  }
  return null;
}

function ArtifactShopTooltipIcon({
  artifact,
  tooltipId,
  variant,
}: {
  artifact: ShopArtifactIdForTooltip;
  tooltipId: string;
  variant: "cardTitle" | "description";
}) {
  const { t } = useTranslation("ui");
  const triggerClass =
    variant === "cardTitle"
      ? "pl-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-white-500 cursor-pointer motion-safe:animate-shop-info-pulse"
      : "ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-white-500 cursor-pointer motion-safe:animate-shop-info-pulse align-text-bottom translate-y-[0.08em]";

  const icon = (
    <span
      className="inline-flex shrink-0 items-center justify-center font-noto-symbols-2 text-sm font-normal leading-none"
      aria-hidden
    >
      🛈
    </span>
  );

  if (artifact === "skull_lantern") {
    return (
      <TooltipWrapper
        tooltip={
          <div className="text-xs">
            <div className="font-bold mb-1">{t("shop.artifactSkullLantern.title")}</div>
            <div className="mt-1 space-y-0.5">
              <div>{t("shop.artifactSkullLantern.caveExploreBonus")}</div>
              <div>{t("shop.artifactSkullLantern.caveExploreCooldown")}</div>
              <div>{t("shop.artifactSkullLantern.miningBonus")}</div>
              <div>{t("shop.artifactSkullLantern.miningCooldown")}</div>
            </div>
          </div>
        }
        tooltipId={tooltipId}
        disabled
        tooltipContentClassName="max-w-xs border border-amber-600"
        className={triggerClass}
      >
        {icon}
      </TooltipWrapper>
    );
  }

  if (artifact === "tarnished_compass") {
    return (
      <TooltipWrapper
        tooltip={
          <div className="text-xs">
            <div className="font-bold mb-1">{t("shop.artifactTarnishedCompass.title")}</div>
            <div className="mt-1 space-y-0.5">
              <div>{t("shop.artifactTarnishedCompass.doubleGain")}</div>
              <div>{t("shop.artifactTarnishedCompass.luck")}</div>
            </div>
          </div>
        }
        tooltipId={tooltipId}
        disabled
        tooltipContentClassName="max-w-[14rem] border border-amber-600"
        className={triggerClass}
      >
        {icon}
      </TooltipWrapper>
    );
  }

  return (
    <TooltipWrapper
      tooltip={
        <div className="text-xs">
          <div className="font-bold mb-1">{t("shop.artifactCrowHarness.title")}</div>
          <div className="mt-1 space-y-0.5">
            <div>{t("shop.artifactCrowHarness.doubleGain")}</div>
          </div>
        </div>
      }
      tooltipId={tooltipId}
      disabled
      tooltipContentClassName="max-w-xs border border-amber-600"
      className={triggerClass}
    >
      {icon}
    </TooltipWrapper>
  );
}

function ShopGlyphForItem({
  item,
  className = "",
  style,
  ariaHidden,
}: {
  item: Pick<ShopItem, "symbol">;
  className?: string;
  style?: React.CSSProperties;
  ariaHidden?: boolean;
}) {
  const glyph = item.symbol;
  if (!glyph) return null;

  const fontClass = "font-noto-symbols-2";
  const isSingleGlyph = Array.from(glyph).length === 1;

  if (isSingleGlyph) {
    return (
      <span
        className={`relative inline-flex h-[1.35em] w-[1.35em] shrink-0 items-center justify-center leading-none ${className}`}
        style={style}
        aria-hidden={ariaHidden}
      >
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 32 32"
          focusable="false"
          aria-hidden
        >
          <text
            x="16"
            y="16.8"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="currentColor"
            className={fontClass}
            fontFamily="Noto Sans Symbols 2"
            fontSize="27"
          >
            {glyph}
          </text>
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`${fontClass} ${className}`}
      style={style}
      aria-hidden={ariaHidden}
    >
      {glyph}
    </span>
  );
}

/** Above `DialogContent` z-[70] so particles match the coin effect but stay visible. */
const SHOP_GOLD_GLYPH_HOVER_PARTICLE_Z = 90;

/** Full-card hover for shop items; burst origin stays on the corner glyph span; tint matches `symbolColor`. */
function ShopItemGlyphParticleScope({
  item,
  children,
}: {
  item: ShopItem;
  children: (ctx: {
    hoverHandlers?: { onMouseEnter: () => void; onMouseLeave: () => void };
    portal: React.ReactNode;
    glyphOriginRef: React.RefObject<HTMLSpanElement | null>;
  }) => React.ReactNode;
}) {
  const particleOriginRef = React.useRef<HTMLSpanElement | null>(null);
  const enabled = Boolean(item.symbol);
  const particleConfig = useMemo(
    () => getShopGlyphHoverParticleConfig(item.symbolColor),
    [item.symbolColor],
  );
  const { hoverHandlers, portal, glyphOriginRef } = useCoinHoverParticles(
    "gold",
    {
      enabled,
      zIndex: SHOP_GOLD_GLYPH_HOVER_PARTICLE_Z,
      particleOriginRef,
      particleConfig,
    },
  );

  return (
    <>
      {children({
        hoverHandlers: enabled ? hoverHandlers : undefined,
        portal: enabled ? portal : null,
        glyphOriginRef,
      })}
    </>
  );
}

function ShopCardCornerGlyph({
  item,
  glyphOriginRef,
  glyphWrapperClassName,
  glyphWrapperStyle,
}: {
  item: ShopItem;
  glyphOriginRef?: React.RefObject<HTMLSpanElement | null>;
  glyphWrapperClassName: string;
  glyphWrapperStyle: React.CSSProperties;
}) {
  const bindOrigin = glyphOriginRef ?? undefined;

  return (
    <span
      ref={bindOrigin as React.Ref<HTMLSpanElement> | undefined}
      className={glyphWrapperClassName}
      style={glyphWrapperStyle}
    >
      <ShopGlyphForItem item={item} />
    </span>
  );
}

/** Bundles: one row per `bundleComponents` entry (colored symbol + name); artifact rows keep info glyphs. */
function ShopItemDescriptionParagraph({ item }: { item: ShopItem }) {
  if (item.category === "bundle" && item.bundleComponents?.length) {
    return (
      <div className="space-y-1">
        {item.bundleComponents.map((componentId) => {
          const c = SHOP_ITEMS[componentId];
          if (!c) return null;
          const artifact = shopArtifactIdFromShopItemId(componentId);
          const hex =
            c.symbol && c.symbolColor
              ? tailwindToHex(c.symbolColor.replace("text-", ""))
              : undefined;
          return (
            <div key={componentId} className="flex items-start gap-1">
              <div className="flex w-[1.35em] min-w-[1.35em] shrink-0 items-center justify-center self-start">
                {c.symbol ? (
                  <ShopGlyphForItem
                    item={c}
                    className="inline-flex items-center justify-center text-center leading-none"
                    style={hex ? { color: hex } : undefined}
                    ariaHidden
                  />
                ) : null}
              </div>
              <span className="inline-flex min-w-0 flex-1 flex-wrap items-baseline gap-x-0.5 leading-tight">
                {resolveShopItemName(c)}
                {artifact ? (
                  <ArtifactShopTooltipIcon
                    artifact={artifact}
                    tooltipId={`${artifact}-info-desc-${item.id}`}
                    variant="description"
                  />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return resolveShopItemDescription(item);
}

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
  displayPriceCents: number;
}

function CheckoutForm({
  itemId,
  onSuccess,
  currency,
  onCancel,
  displayPriceCents,
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
        setErrorMessage(error.message || t("ui:shop.paymentFailed"));
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Verify payment on backend - server creates all purchases
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
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
          },
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
            completePaidShopPurchaseInStore();
          }

          onSuccess();
        } else {
          // Payment succeeded on Stripe but server verification failed (e.g. DB error).
          // Do NOT release discount reservation - user was charged; requires manual intervention.
          setErrorMessage(
            result.error ||
            t("ui:shop.verificationFailed"),
          );
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
          <a
            href="/terms"
            target="_blank"
            className="underline hover:text-foreground"
          >
            {t("ui:shop.termsOfService")}
          </a>{" "}
          and{" "}
          <a
            href="/withdrawal"
            target="_blank"
            className="underline hover:text-foreground"
          >
            {t("ui:shop.rightOfWithdrawal")}
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
            ? t("common:status.processing")
            : t("ui:shop.completePurchaseFor", {
              price:
                displayPriceCents > 0 ? formatPrice(displayPriceCents) : "",
            })}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-2"
          button_id="shop-cancel-payment"
          type="button"
        >
          {t("common:buttons.cancel")}
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
  const { t } = useTranslation(["ui", "common"]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"shop" | "purchases">("shop");
  const [selectedFilter, setSelectedFilter] = useState<
    "gold" | "artifacts" | "boosts" | "bundles" | null
  >(null);
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [showSecurePurchasePrompt, setShowSecurePurchasePrompt] =
    useState(false);
  const detectedCurrency = useGameStore((state) => state.detectedCurrency);
  const setDetectedCurrency = useGameStore(
    (state) => state.setDetectedCurrency,
  );
  const [currency, setCurrency] = useState<"EUR" | "USD">(
    detectedCurrency || "USD",
  );
  const [isDetectingCurrency, setIsDetectingCurrency] = useState(false);
  const gameState = useGameStore();
  const setAuthDialogOpen = useGameStore((state) => state.setAuthDialogOpen);
  const setTimedEventTab = useGameStore((state) => state.setTimedEventTab);
  const shopCruelModeHighlight = useGameStore(
    (state) => state.shopCruelModeHighlight,
  );
  const activatedPurchases = gameState.activatedPurchases || {};
  const { toast } = useToast();

  // Reset filter when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFilter(null);
      setShowSecurePurchasePrompt(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !shopCruelModeHighlight) return;
    const t = window.setTimeout(() => {
      document
        .getElementById("shop-card-cruel_mode")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 450);
    return () => window.clearTimeout(t);
  }, [isOpen, shopCruelModeHighlight]);

  // Initialize component and load user data
  useEffect(() => {
    const initializeShop = async () => {
      if (!isOpen) return;

      // Trigger Stripe loading when shop is opened
      getStripePromise();

      try {
        const user = await getSessionUser();
        setSessionUser(user);

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
      const data = await fetchPurchaseRowsForSessionUser();
      if (!data) {
        return;
      }

      setPurchasedItems(purchaseIdsFromRows(data));
      applyFeastActivationsFromPurchaseRows(data);
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
              message: t("ui:shop.freeGoldCooldownLog", {
                hours: hoursRemaining,
                count: hoursRemaining,
              }),
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
          const freeGoldAmount =
            item.rewards.resources?.gold ?? SHOP_ITEMS.gold_100_free.rewards.resources?.gold ?? 0;
          gameState.addLogEntry({
            id: `free-gold-claimed-${Date.now()}`,
            message: t("ui:shop.freeGoldClaimedLog", { amount: freeGoldAmount }),
            timestamp: Date.now(),
            type: "system",
          });

          toast({
            title: t("common:status.success"),
            description: t("ui:shop.freeGoldAdded", { amount: freeGoldAmount }),
          });

          // Return early - don't save to database
          return;
        }

        // For other free items (non-daily gold), check if already purchased
        if (!item.canPurchaseMultipleTimes) {
          const alreadyPurchased = purchasedItems.some((pid) => {
            return purchaseIdToItemId(pid) === itemId;
          });

          if (alreadyPurchased) {
            gameState.addLogEntry({
              id: `already-claimed-${Date.now()}`,
              message: t("ui:shop.alreadyClaimedItemLog", {
                name: resolveShopItemName(item),
              }),
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
                  cruel_mode: gameState.cruelMode ?? false,
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
                    cruel_mode: gameState.cruelMode ?? false,
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
            cruel_mode: gameState.cruelMode ?? false,
          });

          if (error) throw error;
        }

        // Reload purchases from database to get the correct ID
        await loadPurchasedItems();

        // Set hasMadeNonFreePurchase flag if this is a paid item (even if price is 0, we don't set it)
        if (item.price > 0) {
          completePaidShopPurchaseInStore();
        }

        // Show success message
        const resolvedItemName = resolveShopItemName(item);
        gameState.addLogEntry({
          id: `free-gift-${Date.now()}`,
          message: t("ui:shop.freeItemAdded", { name: resolvedItemName }),
          timestamp: Date.now(),
          type: "system",
        });

        toast({
          title: t("common:status.success"),
          description: t("ui:shop.freeItemAdded", { name: resolvedItemName }),
        });
      } catch (error) {
        logger.error("Error claiming free item:", error);
        gameState.addLogEntry({
          id: `free-gift-error-${Date.now()}`,
          message: t("ui:shop.claimFailedLog", {
            name: resolveShopItemName(item),
          }),
          timestamp: Date.now(),
          type: "system",
        });
      }
      return;
    }

    // For paid items, create payment intent for embedded checkout
    const user = await ensureAnonymousSession();
    setSessionUser(user);
    const tradersGratitudeDiscount =
      gameState.tradersGratitudeState?.accepted === true;
    const tradersSonGratitudeDiscount =
      gameState.tradersSonGratitudeState?.accepted === true;
    const playlightFirstPurchaseDiscount =
      gameState.story?.seen?.playlightFirstPurchaseDiscountActive === true &&
      !gameState.hasMadeNonFreePurchase;
    const cruelModeJourneyCompleteDiscount =
      itemId === "cruel_mode" &&
      gameState.story?.seen?.cruelModeJourneyCompleteDiscount === true;
    const response = await fetch("/api/payment/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        userEmail: user.email || undefined,
        userId: user.id,
        currency: currency.toLowerCase(),
        tradersGratitudeDiscount: tradersGratitudeDiscount || undefined,
        tradersSonGratitudeDiscount: tradersSonGratitudeDiscount || undefined,
        cruelMode: gameState.cruelMode ?? false,
        playlightFirstPurchaseDiscount: playlightFirstPurchaseDiscount
          ? true
          : undefined,
        cruelModeJourneyCompleteDiscount: cruelModeJourneyCompleteDiscount
          ? true
          : undefined,
      }),
    });

    const { clientSecret: secret } = await response.json();
    if (secret) {
      useGameStore.getState().recordCompletePurchaseDialogOpen();
    }
    setClientSecret(secret);
    setSelectedItem(itemId);
    // Keep shop dialog open during payment to maintain game pause
  };

  const handleCancelPayment = () => {
    setClientSecret(null);
    setSelectedItem(null);
    // Shop dialog remains open, just reset payment state
  };

  const handlePurchaseSuccess = async () => {
    const item = SHOP_ITEMS[selectedItem!];

    if (selectedItem === "cruel_mode") {
      useGameStore.setState((s) => ({
        story: {
          ...s.story,
          seen: {
            ...s.story.seen,
            cruelModeJourneyCompleteDiscount: false,
          },
        },
      }));
    }

    // If Trader's Gratitude discount was used, clear it, mark as used, and end the event
    if (gameState.tradersGratitudeState?.accepted) {
      useGameStore.setState((state) => ({
        tradersGratitudeState: { accepted: false },
        triggeredEvents: {
          ...(state.triggeredEvents || {}),
          traders_gratitude_used: true,
        },
      }));
      setTimedEventTab(false);
    }

    if (gameState.tradersSonGratitudeState?.accepted) {
      useGameStore.setState((state) => ({
        tradersSonGratitudeState: { accepted: false },
        triggeredEvents: {
          ...(state.triggeredEvents || {}),
          traders_son_gratitude_used: true,
        },
      }));
      setTimedEventTab(false);
    }

    // Set hasMadeNonFreePurchase flag if this is a paid item
    if (item.price > 0) {
      completePaidShopPurchaseInStore();
    }

    // NOTE: Bundle purchases are already created by the server in the payment verification
    // We don't need to create them again here

    // Reload purchases from database to get the correct IDs
    await loadPurchasedItems();

    // IMPORTANT: After loadPurchasedItems completes, purchasedItems state is updated
    // We need to access the updated state, not the stale closure variable
    const purchaseRows = await fetchPurchaseRowsForSessionUser();
    const updatedPurchasedItems = purchaseRows
      ? purchaseIdsFromRows(purchaseRows)
      : [];

    // If this is a single item (NOT a bundle) with feast activations, set activations from item definition
    if (item.rewards.feastActivations && !item.bundleComponents) {
      // Get the latest purchase for this item (the one just created)
      const latestPurchaseId = updatedPurchasedItems
        .filter((pid) => purchaseIdToItemId(pid) === selectedItem)
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
          const allMatchingPurchases = updatedPurchasedItems.filter(
            (pid) => purchaseIdToItemId(pid) === componentId,
          );

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

    const resolvedPurchaseName = resolveShopItemName(item);
    gameState.addLogEntry({
      id: `purchase-${Date.now()}`,
      message: item.bundleComponents
        ? t("ui:shop.purchaseAddedBundle", { name: resolvedPurchaseName })
        : t("ui:shop.purchaseAddedSingle", { name: resolvedPurchaseName }),
      timestamp: Date.now(),
      type: "system",
    });

    // Show success message
    toast({
      title: t("ui:shop.purchaseSuccessful"),
      description: item.bundleComponents
        ? t("ui:shop.purchaseAddedBundle", { name: resolvedPurchaseName })
        : t("ui:shop.purchaseAddedSingle", { name: resolvedPurchaseName }),
    });

    try {
      const { saveGame } = await import("@/game/save");
      const { buildGameState } = await import("@/game/stateHelpers");
      await saveGame(buildGameState(useGameStore.getState()), false);
    } catch (e) {
      logger.error("[SHOP] Post-purchase save failed:", e);
    }

    setClientSecret(null);
    setSelectedItem(null);

    const anonymousAfterPurchase = await isAnonymousSession();
    if (anonymousAfterPurchase) {
      setShowSecurePurchasePrompt(true);
    } else {
      setActiveTab("purchases");
    }
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
      const endTime = Date.now() + GREAT_FEAST_DURATION_MS;

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
          resolveShopActivationMessage(item) ||
          `A Great Feast has begun! For a while, the villagers manage to set aside the darkness of their minds and celebrate.`,
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
        resolveShopActivationMessage(item) ||
        t("ui:shop.activatedDefaultLog", {
          name: resolveShopItemName(item),
        }),
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

  const checkoutPriceBreakdown =
    clientSecret && selectedItem && SHOP_ITEMS[selectedItem]
      ? getCheckoutPriceBreakdown(SHOP_ITEMS[selectedItem], gameState)
      : null;

  const isPaymentMode = !!(clientSecret && selectedItem);

  const handleShopDialogOpenChange = (open: boolean) => {
    if (!open) {
      setClientSecret(null);
      setSelectedItem(null);
      onClose();
    }
  };

  const handlePaymentDialogOpenChange = (open: boolean) => {
    if (!open) {
      setClientSecret(null);
      setSelectedItem(null);
      // Payment dialog closes but shop dialog stays open
    }
  };

  return (
    <>
      <style>{`
                .bundle-card-glow {
                  animation: bundle-glow-pulse 3.5s ease-in-out infinite;
                }

                .cruel-mode-card-glow {
                  animation: cruel-mode-glow-pulse 3.5s ease-in-out infinite;
                }

              @keyframes bundle-glow-pulse {
                0%, 100% {
                  box-shadow: 0 0 7px 2px rgba(234, 179, 8, 0.25);
                }
                50% {
                  box-shadow: 0 0 0px 0px rgba(234, 179, 8, 0.5);
                }
              }

              @keyframes cruel-mode-glow-pulse {
                0%, 100% {
                  box-shadow: 0 0 7px 2px rgba(220, 38, 38, 0.35);
                }
                50% {
                  box-shadow: 0 0 0px 0px rgba(220, 38, 38, 0.55);
                }
              }

                .shop-3x-value-badge-pulse {
                  animation: shop-3x-value-badge-shadow-pulse 4.75s ease-in-out infinite;
                }

              @keyframes shop-3x-value-badge-shadow-pulse {
                0%, 100% {
                  box-shadow:
                    0 0 10px rgba(239, 68, 68, 0.55),
                    0 0 22px rgba(239, 68, 68, 0.35),
                    0 4px 12px rgba(0, 0, 0, 0.6);
                }
                50% {
                  box-shadow:
                    0 0 17px rgba(239, 68, 68, 0.88),
                    0 0 34px rgba(239, 68, 68, 0.58),
                    0 4px 13px rgba(0, 0, 0, 0.64);
                }
              }
              `}</style>
      <Dialog open={isOpen} onOpenChange={handleShopDialogOpenChange}>
        {!isPaymentMode && (
          <DialogContent
            className={cn(
              showSecurePurchasePrompt
                ? "[--adc-dialog-max-w:28rem] max-h-[80vh] z-[70] gap-2"
                : "[--adc-dialog-max-w:56rem] flex h-[80vh] min-h-0 flex-col gap-3 overflow-hidden z-[70] p-6",
            )}
            style={
              showSecurePurchasePrompt
                ? undefined
                : {
                  height: "80vh",
                  maxHeight: "80vh",
                  minHeight: "80vh",
                }
            }
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader
              className={cn(
                "shrink-0",
                showSecurePurchasePrompt ? "space-y-1 pb-0" : "space-y-1.5",
              )}
            >
              <DialogTitle>{t("ui:shop.title")}</DialogTitle>
              <DialogDescription className="sr-only">
                {t("ui:shop.srDescription")}
              </DialogDescription>
            </DialogHeader>

            {isLoading && (
              <div className="flex shrink-0 justify-center py-8">
                <div className="text-muted-foreground">{t("common:status.loading")}</div>
              </div>
            )}

            {!isLoading && showSecurePurchasePrompt && (
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-amber-600/50 bg-amber-600/10 p-4 space-y-3">
                  <h3 className="text-lg font-semibold">
                    {t("ui:shop.securePurchaseTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("ui:shop.securePurchaseBody")}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    button_id="shop-secure-purchase-sign-up"
                    onClick={() => {
                      setShowSecurePurchasePrompt(false);
                      setAuthDialogOpen(true);
                    }}
                  >
                    {t("ui:shop.securePurchaseSignUp")}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    button_id="shop-secure-purchase-later"
                    onClick={() => {
                      setShowSecurePurchasePrompt(false);
                      setActiveTab("purchases");
                    }}
                  >
                    {t("ui:shop.securePurchaseLater")}
                  </Button>
                </div>
              </div>
            )}

            {!isLoading && !showSecurePurchasePrompt && (
              <Tabs
                value={activeTab}
                onValueChange={(value) =>
                  setActiveTab(value as "shop" | "purchases")
                }
                className="flex min-h-0 w-full flex-1 flex-col"
              >
                {/* Header stays outside ScrollArea: DialogContent uses CSS transform for centering,
                    which breaks position:sticky for descendants; pin tabs/copy via layout instead. */}
                <div className="shrink-0 pb-2 pt-0.5">
                  <TabsList className="grid h-10 w-full grid-cols-2 items-stretch gap-0 overflow-hidden rounded-md border-2 border-foreground/55 bg-muted p-1 shadow-sm dark:border-foreground/65">
                    <TabsTrigger
                      value="shop"
                      className="flex h-full min-h-0 min-w-0 w-full items-center justify-center rounded-sm border border-transparent py-0 data-[state=active]:border-foreground/60 data-[state=active]:shadow-md dark:data-[state=active]:border-foreground/70"
                    >
                      {t("ui:shop.forSale")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="purchases"
                      disabled={!sessionUser}
                      className="flex h-full min-h-0 min-w-0 w-full items-center justify-center rounded-sm border border-transparent py-0 data-[state=active]:border-foreground/60 data-[state=active]:shadow-md dark:data-[state=active]:border-foreground/70"
                    >
                      {t("ui:shop.purchases")}
                    </TabsTrigger>
                  </TabsList>
                  {activeTab === "shop" && (
                    <div className="mt-3 rounded-md border border-green-500/40 bg-green-500/5 px-2 py-2 text-sm text-foreground">
                      <p className="text-md font-medium">
                        {t("ui:shop.betaDiscountTitle", { percent: "40%" })}
                      </p>
                      <p>{t("ui:shop.betaDiscountNote")}</p>
                    </div>
                  )}
                  {activeTab === "purchases" && (
                    <div className="mt-3 rounded-md border border-green-500/40 bg-green-500/5 px-2 py-2 text-sm text-foreground">
                      {purchasedItems.length === 0 &&
                        Object.keys(gameState.feastActivations || {}).length ===
                        0 ? (
                        <>
                          <p className="text-md font-medium">
                            {t("ui:shop.noPurchasesTitle")}
                          </p>
                          <p>{t("ui:shop.noPurchasesHint")}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-md font-medium">
                            {t("ui:shop.activatePurchasesTitle")}
                          </p>
                          <p>{t("ui:shop.activatePurchasesNote")}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <TabsContent
                  value="shop"
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden outline-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=inactive]:hidden"
                >
                  {/* Pinned via flex split below TabsList + intro (sticky breaks under dialog transforms). */}
                  <div className="flex shrink-0 flex-wrap gap-1.5 pb-3">
                    <Button
                      variant={selectedFilter === null ? "default" : "outline"}
                      size="xs"
                      onClick={() => setSelectedFilter(null)}
                      className={
                        selectedFilter === null
                          ? "h-6 text-xs"
                          : "h-6 border border-red-500/50 text-xs"
                      }
                    >
                      {t("ui:shop.highlights")}
                    </Button>
                    <Button
                      variant={
                        selectedFilter === "gold" ? "default" : "outline"
                      }
                      size="xs"
                      onClick={() => setSelectedFilter("gold")}
                      className={
                        selectedFilter === "gold"
                          ? "h-6 text-xs"
                          : "h-6 border border-red-500/50 text-xs"
                      }
                    >
                      {t("ui:shop.gold")}
                    </Button>
                    <Button
                      variant={
                        selectedFilter === "artifacts" ? "default" : "outline"
                      }
                      size="xs"
                      onClick={() => setSelectedFilter("artifacts")}
                      className={
                        selectedFilter === "artifacts"
                          ? "h-6 text-xs"
                          : "h-6 border border-red-500/50 text-xs"
                      }
                    >
                      {t("ui:shop.artifacts")}
                    </Button>
                    <Button
                      variant={
                        selectedFilter === "boosts" ? "default" : "outline"
                      }
                      size="xs"
                      onClick={() => setSelectedFilter("boosts")}
                      className={
                        selectedFilter === "boosts"
                          ? "h-6 text-xs"
                          : "h-6 border border-red-500/50 text-xs"
                      }
                    >
                      {t("ui:shop.boosts")}
                    </Button>
                    <Button
                      variant={
                        selectedFilter === "bundles" ? "default" : "outline"
                      }
                      size="xs"
                      onClick={() => setSelectedFilter("bundles")}
                      className={
                        selectedFilter === "bundles"
                          ? "h-6 text-xs"
                          : "h-6 border border-red-500/50 text-xs"
                      }
                    >
                      {t("ui:shop.bundles")}
                    </Button>
                  </div>
                  <ScrollAreaWithIndicator
                    className="min-h-0 flex-1"
                    scrollAreaId="shop-dialog-for-sale"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {(selectedFilter === null
                        ? HIGHLIGHTS_ORDER.map((id) => SHOP_ITEMS[id]).filter(
                          Boolean,
                        )
                        : Object.values(SHOP_ITEMS)
                      )
                        .filter((item) => {
                          // Hide full_game item when BTP=0
                          if (item.id === "full_game" && gameState.BTP === 0) {
                            return false;
                          }

                          // Apply filter based on selectedFilter
                          if (selectedFilter === "gold") {
                            return shopItemMatchesGoldFilterTab(item);
                          }
                          if (selectedFilter === "artifacts") {
                            // Artifacts are tools, weapons, or relics
                            return (
                              item.category === "tool" ||
                              item.category === "weapon" ||
                              item.category === "relic"
                            );
                          }
                          if (selectedFilter === "boosts") {
                            // Boosts include Great Feasts and other boost items
                            return item.category === "feast";
                          }
                          if (selectedFilter === "bundles") {
                            // Bundles have bundle category
                            return item.category === "bundle";
                          }

                          // For Highlights tab we already filtered by HIGHLIGHTS_ORDER
                          if (selectedFilter === null) return true;

                          return true;
                        })
                        .map((item) => (
                          <ShopItemGlyphParticleScope
                            key={item.id}
                            item={item}
                          >
                            {({ hoverHandlers, portal, glyphOriginRef }) => (
                              <>
                                <Card
                                  {...(hoverHandlers ?? {})}
                                  id={
                                    item.id === "cruel_mode"
                                      ? "shop-card-cruel_mode"
                                      : undefined
                                  }
                                  className={`border-neutral-500 flex flex-col relative ${item.category === "bundle"
                                    ? "border border-amber-600"
                                    : ""
                                    }${item.id === "cruel_mode" &&
                                      shopCruelModeHighlight
                                      ? " border border-red-600"
                                      : ""
                                    }`}
                                >
                                  <CardHeader className="leading-snug p-4 pb-1 relative text-lg ">
                                    {item.symbol && (
                                      <ShopCardCornerGlyph
                                        item={item}
                                        glyphOriginRef={glyphOriginRef}
                                        glyphWrapperClassName={`leading-[0.9] text-right absolute top-4 right-4 inline-flex items-center justify-center${isShopPaidGoldPackItem(item.id)
                                          ? " cursor-default"
                                          : ""
                                          }`}
                                        glyphWrapperStyle={{
                                          color: tailwindToHex(
                                            (item.symbolColor || "").replace(
                                              "text-",
                                              "",
                                            ),
                                          ),
                                          maxWidth: "2.55em",
                                          wordBreak: "break-all",
                                          overflowWrap: "anywhere",
                                        }}
                                      />
                                    )}
                                    <CardTitle className="!m-0 text-md items-center gap-1 pr-6">
                                      {resolveShopItemName(item)}
                                      {item.id === "skull_lantern" && (
                                        <ArtifactShopTooltipIcon
                                          artifact="skull_lantern"
                                          tooltipId="skull-lantern-info"
                                          variant="cardTitle"
                                        />
                                      )}
                                      {item.id === "tarnished_compass" && (
                                        <ArtifactShopTooltipIcon
                                          artifact="tarnished_compass"
                                          tooltipId="tarnished-compass-info"
                                          variant="cardTitle"
                                        />
                                      )}
                                      {item.id === "crow_harness" && (
                                        <ArtifactShopTooltipIcon
                                          artifact="crow_harness"
                                          tooltipId="crow-harness-info"
                                          variant="cardTitle"
                                        />
                                      )}
                                      {item.id === "cruel_mode" && (
                                        <TooltipWrapper
                                          tooltip={
                                            <div className="text-xs">
                                              <div className="font-bold mb-1">
                                                {t("ui:shop.cruelMode.title")}
                                              </div>
                                              <div className="mt-1 space-y-0.5">
                                                <div>
                                                  • {t("ui:shop.cruelMode.moreEvents")}
                                                </div>
                                                <div>
                                                  • {t("ui:shop.cruelMode.moreItems")}
                                                </div>
                                                <div>
                                                  •{" "}
                                                  {t("ui:shop.cruelMode.strongerEnemies")}
                                                </div>
                                                <div>
                                                  •{" "}
                                                  {t("ui:shop.cruelMode.harderChallenges")}
                                                </div>
                                                <div>
                                                  •{" "}
                                                  {t("ui:shop.cruelMode.reusePurchases")}
                                                </div>
                                              </div>
                                            </div>
                                          }
                                          tooltipId="cruel-mode-info"
                                          disabled
                                          tooltipContentClassName="max-w-xs border border-amber-600"
                                          className="pl-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-white-500 cursor-pointer motion-safe:animate-shop-info-pulse"
                                        >
                                          <span
                                            className="inline-flex shrink-0 items-center justify-center font-noto-symbols-2 text-sm font-normal leading-none"
                                            aria-hidden
                                          >
                                            🛈
                                          </span>
                                        </TooltipWrapper>
                                      )}
                                    </CardTitle>
                                    <CardDescription className="!m-0 text-bold flex flex-wrap items-center gap-1">
                                      {(() => {
                                        const listCents =
                                          shopCardStrikethroughListCents(item);
                                        if (
                                          listCents === null ||
                                          (item.price > 0 && listCents <= item.price)
                                        ) {
                                          return null;
                                        }
                                        return (
                                          <span className="text-xs line-through text-muted-foreground">
                                            {formatPrice(listCents)}
                                          </span>
                                        );
                                      })()}
                                      {(() => {
                                        const cruelJourneyDiscountActive =
                                          item.id === "cruel_mode" &&
                                          gameState.story?.seen
                                            ?.cruelModeJourneyCompleteDiscount ===
                                          true;
                                        const tradersGratitudeActive =
                                          gameState.tradersGratitudeState
                                            ?.accepted === true;
                                        const tradersSonGratitudeActive =
                                          gameState.tradersSonGratitudeState
                                            ?.accepted === true;
                                        const playlightFirstPurchaseActive =
                                          gameState.story?.seen
                                            ?.playlightFirstPurchaseDiscountActive ===
                                          true && !gameState.hasMadeNonFreePurchase;
                                        const pctOpts = {
                                          playlightFirstPurchase:
                                            playlightFirstPurchaseActive,
                                          tradersGratitude: tradersGratitudeActive,
                                          tradersSonGratitude:
                                            tradersSonGratitudeActive,
                                        };
                                        const displayPrice =
                                          item.price > 0
                                            ? getDiscountedShopPriceCents(
                                              item.price,
                                              {
                                                ...pctOpts,
                                                cruelModeJourneyComplete:
                                                  cruelJourneyDiscountActive,
                                              },
                                              item.id,
                                            )
                                            : item.price;
                                        const priceWithoutJourneyCents =
                                          item.price > 0 && item.id === "cruel_mode"
                                            ? getDiscountedShopPriceCents(
                                              item.price,
                                              {
                                                ...pctOpts,
                                                cruelModeJourneyComplete: false,
                                              },
                                              item.id,
                                            )
                                            : item.price;
                                        const tradersOnlyCents =
                                          item.price > 0
                                            ? getDiscountedShopPriceCents(
                                              item.price,
                                              {
                                                tradersGratitude: true,
                                              },
                                              item.id,
                                            )
                                            : item.price;
                                        const sonOnlyCents =
                                          item.price > 0
                                            ? getDiscountedShopPriceCents(
                                              item.price,
                                              {
                                                tradersSonGratitude: true,
                                              },
                                              item.id,
                                            )
                                            : item.price;
                                        const playlightOnlyCents =
                                          item.price > 0
                                            ? getDiscountedShopPriceCents(
                                              item.price,
                                              {
                                                playlightFirstPurchase: true,
                                              },
                                              item.id,
                                            )
                                            : item.price;
                                        const discounted =
                                          item.price > 0 && displayPrice < item.price;
                                        const priceClassName = discounted
                                          ? "!font-semibold text-green-500"
                                          : "";
                                        const showTradersGratitudeInfo =
                                          item.price > 0 &&
                                          tradersGratitudeActive &&
                                          displayPrice === tradersOnlyCents &&
                                          displayPrice < item.price;
                                        const showTradersSonInfo =
                                          item.price > 0 &&
                                          tradersSonGratitudeActive &&
                                          displayPrice === sonOnlyCents &&
                                          displayPrice < item.price;
                                        const showPlaylightInfo =
                                          item.price > 0 &&
                                          playlightFirstPurchaseActive &&
                                          displayPrice === playlightOnlyCents &&
                                          displayPrice < item.price;
                                        const showJourneyCompleteInfo =
                                          item.price > 0 &&
                                          cruelJourneyDiscountActive &&
                                          displayPrice < priceWithoutJourneyCents;
                                        return (
                                          <>
                                            <span className={priceClassName}>
                                              {item.price === 0
                                                ? t("common:status.free")
                                                : formatPrice(displayPrice)}
                                            </span>
                                            {showTradersGratitudeInfo && (
                                              <TooltipWrapper
                                                tooltip={
                                                  <div className="text-xs">
                                                    {t("ui:shop.tradersGratitudeDiscount", {
                                                      percent: TRADERS_GRATITUDE_DISCOUNT_PERCENT,
                                                    })}
                                                  </div>
                                                }
                                                tooltipId={`traders-gratitude-${item.id}`}
                                                disabled
                                                tooltipContentClassName="max-w-xs border border-amber-600"
                                                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-foreground cursor-pointer motion-safe:animate-shop-info-pulse"
                                              >
                                                <span
                                                  className="inline-flex shrink-0 items-center justify-center font-noto-symbols-2 text-sm font-normal leading-none"
                                                  aria-hidden
                                                >
                                                  🛈
                                                </span>
                                              </TooltipWrapper>
                                            )}
                                            {showTradersSonInfo && (
                                              <TooltipWrapper
                                                tooltip={
                                                  <div className="text-xs">
                                                    {t("ui:shop.tradersSonDiscount", {
                                                      percent: TRADERS_SON_DISCOUNT_PERCENT,
                                                    })}
                                                  </div>
                                                }
                                                tooltipId={`traders-son-gratitude-${item.id}`}
                                                disabled
                                                tooltipContentClassName="max-w-xs border border-amber-600"
                                                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-foreground cursor-pointer motion-safe:animate-shop-info-pulse"
                                              >
                                                <span
                                                  className="inline-flex shrink-0 items-center justify-center font-noto-symbols-2 text-sm font-normal leading-none"
                                                  aria-hidden
                                                >
                                                  🛈
                                                </span>
                                              </TooltipWrapper>
                                            )}
                                            {showPlaylightInfo && (
                                              <TooltipWrapper
                                                tooltip={
                                                  <div className="text-xs">
                                                    {t("ui:shop.playlightDiscount", {
                                                      percent:
                                                        PLAYLIGHT_FIRST_PURCHASE_DISCOUNT_PERCENT,
                                                    })}
                                                  </div>
                                                }
                                                tooltipId={`playlight-discount-${item.id}`}
                                                disabled
                                                tooltipContentClassName="max-w-xs border border-amber-600"
                                                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-foreground cursor-pointer motion-safe:animate-shop-info-pulse"
                                              >
                                                <span
                                                  className="inline-flex shrink-0 items-center justify-center font-noto-symbols-2 text-sm font-normal leading-none"
                                                  aria-hidden
                                                >
                                                  🛈
                                                </span>
                                              </TooltipWrapper>
                                            )}
                                            {showJourneyCompleteInfo && (
                                              <TooltipWrapper
                                                tooltip={
                                                  <div className="text-xs">
                                                    {t("ui:shop.journeyCompleteDiscount")}
                                                  </div>
                                                }
                                                tooltipId={`journey-complete-cruel-${item.id}`}
                                                disabled
                                                tooltipContentClassName="max-w-xs border border-amber-600"
                                                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-foreground cursor-pointer motion-safe:animate-shop-info-pulse"
                                              >
                                                <span
                                                  className="inline-flex shrink-0 items-center justify-center font-noto-symbols-2 text-sm font-normal leading-none"
                                                  aria-hidden
                                                >
                                                  🛈
                                                </span>
                                              </TooltipWrapper>
                                            )}
                                          </>
                                        );
                                      })()}
                                      {item.id === "advanced_bundle" && (
                                        <span className={SHOP_CARD_PROMO_TAG_CLASS}>
                                          {t("ui:shop.mostPopular")}
                                        </span>
                                      )}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="min-h-16 pl-4 pr-4 pb-2 flex-1">
                                    <div className="leading-tight text-sm opacity-80">
                                      <ShopItemDescriptionParagraph item={item} />
                                    </div>
                                  </CardContent>
                                  <CardFooter className="pl-4 pr-4 pb-4 flex-col gap-2">
                                    <div className="relative z-0 w-full overflow-visible pt-1">
                                      {item.id === "gold_20000" && (
                                        <div
                                          className="shop-3x-value-badge-pulse pointer-events-none absolute right-[-16px] top-[-16px] z-20 flex size-[32px] items-center justify-center rounded-full border border-red-600 bg-red-800"
                                          aria-hidden
                                        >
                                          <span className="flex flex-col items-center gap-px px-0.5 text-[8px] font-medium leading-none text-white">
                                            <span className="text-[10px] font-semibold">
                                              3x
                                            </span>
                                            <span>{t("ui:shop.threeXValue")}</span>
                                          </span>
                                        </div>
                                      )}
                                      <Button
                                        onClick={() => handlePurchaseClick(item.id)}
                                        disabled={
                                          (item.price === 0 &&
                                            item.id !== "gold_100_free" &&
                                            !gameState.isUserSignedIn) ||
                                          (item.id === "gold_100_free" &&
                                            (Date.now() -
                                              (gameState.lastFreeGoldClaim || 0)) /
                                            (1000 * 60 * 60) <
                                            24) ||
                                          (item.id !== "gold_100_free" &&
                                            !item.canPurchaseMultipleTimes &&
                                            purchasedItems.some(
                                              (pid) =>
                                                purchaseIdToItemId(pid) === item.id,
                                            ))
                                        }
                                        className="relative z-10 h-10 w-full"
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
                                                  (gameState.lastFreeGoldClaim ||
                                                    0)) /
                                                (1000 * 60 * 60),
                                              );
                                              return hoursRemaining === 1
                                                ? t("ui:shop.availableInOneHour")
                                                : t("ui:shop.availableInHours", {
                                                  hours: hoursRemaining,
                                                });
                                            })()
                                            : t("common:buttons.claim")
                                          : !item.canPurchaseMultipleTimes &&
                                            purchasedItems.some(
                                              (pid) =>
                                                purchaseIdToItemId(pid) === item.id,
                                            )
                                            ? item.price === 0
                                              ? t("ui:shop.alreadyClaimed")
                                              : t("ui:shop.alreadyPurchased")
                                            : item.price === 0
                                              ? t("common:buttons.claim")
                                              : t("ui:shop.continueCheckout")}
                                      </Button>
                                    </div>
                                  </CardFooter>
                                  {(item.category === "bundle" ||
                                    (item.id === "cruel_mode" &&
                                      shopCruelModeHighlight)) && (
                                      <div
                                        className={`absolute inset-0 -z-10 pointer-events-none rounded-lg ${item.category === "bundle" ? "bundle-card-glow" : "cruel-mode-card-glow"}`}
                                      ></div>
                                    )}
                                </Card>
                                {portal}
                              </>
                            )}
                          </ShopItemGlyphParticleScope>
                        ))}
                    </div>
                  </ScrollAreaWithIndicator>
                </TabsContent>

                <TabsContent
                  value="purchases"
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden outline-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=inactive]:hidden"
                >
                  {!(
                    purchasedItems.length === 0 &&
                    Object.keys(gameState.feastActivations || {}).length === 0
                  ) ? (
                    <ScrollAreaWithIndicator
                      className="min-h-0 flex-1"
                      scrollAreaId="shop-dialog-purchases"
                    >
                      <div className="space-y-2">
                        {Object.entries(gameState.feastActivations || {}).map(
                          ([purchaseId, activationsRemaining]) => {
                            const itemId = purchaseIdToItemId(purchaseId);

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
                                className="flex items-center justify-between rounded-lg border p-3"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {t("ui:shop.feastAvailable", {
                                      name: resolveShopItemName(item),
                                      remaining: activationsRemaining,
                                      total: item.rewards.feastActivations!,
                                    })}{" "}
                                    {/* Display remaining activations */}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {resolveShopItemDescription(item)}
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
                                      ? "border-green-600 bg-green-900/50 text-white"
                                      : ""
                                  }
                                  button_id={`shop-activate-${item.id}`}
                                >
                                  {isGreatFeastActive
                                    ? t("common:status.active")
                                    : activationsRemaining <= 0
                                      ? t("common:status.activated")
                                      : t("common:buttons.activate")}
                                </Button>
                              </div>
                            );
                          },
                        )}

                        {/* Show non-feast, non-bundle purchases */}
                        {purchasedItems
                          .filter((purchaseId) => {
                            const itemId = purchaseIdToItemId(purchaseId);
                            const item = itemId ? SHOP_ITEMS[itemId] : null;
                            return (
                              item &&
                              !item.rewards.feastActivations &&
                              !item.bundleComponents
                            );
                          })
                          .map((purchaseId) => {
                            const itemId = purchaseIdToItemId(purchaseId);
                            const item = itemId ? SHOP_ITEMS[itemId] : null;

                            if (!item) return null;

                            const isActivated =
                              activatedPurchases[purchaseId] || false;
                            const isCruelModeItem = item.id === "cruel_mode";

                            return (
                              <div
                                key={purchaseId}
                                className="flex items-center justify-between rounded-lg border p-3"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {resolveShopItemName(item)}
                                    {isCruelModeItem && (
                                      <span className="text-md ml-2 font-medium">
                                        {t("ui:shop.cruelModeActivateHint")}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {resolveShopItemDescription(item)}
                                  </span>
                                </div>
                                <Button
                                  onClick={() =>
                                    handleActivatePurchase(purchaseId, item.id)
                                  }
                                  disabled={!isCruelModeItem && isActivated}
                                  size="sm"
                                  variant={isActivated ? "outline" : "default"}
                                  button_id={`shop-activate-${item.id}`}
                                >
                                  {isCruelModeItem
                                    ? isActivated
                                      ? t("common:buttons.deactivate")
                                      : t("common:buttons.activate")
                                    : isActivated
                                      ? t("common:status.activated")
                                      : t("common:buttons.activate")}
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                    </ScrollAreaWithIndicator>
                  ) : null}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Payment Dialog - only shown when payment is in progress */}
      {clientSecret && selectedItem && (
        <Dialog open={true} onOpenChange={handlePaymentDialogOpenChange}>
          <DialogContent
            className="[--adc-dialog-max-w:28rem] max-h-[80vh] z-[80] gap-2 [&>button]:hidden"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader className="space-y-1 pb-0">
              <DialogTitle>
                {SHOP_ITEMS[selectedItem]
                  ? resolveShopItemName(SHOP_ITEMS[selectedItem])
                  : ""}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("ui:shop.paymentSrDescription", {
                  name: SHOP_ITEMS[selectedItem]
                    ? resolveShopItemName(SHOP_ITEMS[selectedItem])
                    : "",
                })}
              </DialogDescription>
            </DialogHeader>
            {checkoutPriceBreakdown && (
              <div className="border-b border-border/70 pb-3 text-sm">
                {checkoutPriceBreakdown.listCents != null &&
                  checkoutPriceBreakdown.listCents > 0 && (
                    <div className="flex justify-between gap-4 text-muted-foreground">
                      <span>{t("ui:shop.originalPrice")}</span>
                      <span className="shrink-0 text-right line-through tabular-nums">
                        {formatPrice(checkoutPriceBreakdown.listCents)}
                      </span>
                    </div>
                  )}
                {checkoutPriceBreakdown.betaDiscountCents > 0 && (
                  <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-500">
                    <span>{t("ui:shop.betaDiscount")}</span>
                    <span className="shrink-0 text-right tabular-nums">
                      −{formatPrice(checkoutPriceBreakdown.betaDiscountCents)}
                    </span>
                  </div>
                )}
                {checkoutPriceBreakdown.additionalDiscountCents > 0 && (
                  <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-500">
                    <span>{t("ui:shop.additionalDiscount")}</span>
                    <span className="shrink-0 text-right tabular-nums">
                      −
                      {formatPrice(
                        checkoutPriceBreakdown.additionalDiscountCents,
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-t border-border/50 pt-2 font-semibold">
                  <span>{t("ui:shop.total")}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatPrice(checkoutPriceBreakdown.finalCents)}
                  </span>
                </div>
              </div>
            )}
            <div className="max-h-[calc(85vh-120px)] overflow-y-auto overflow-x-hidden pb-4 scrollbar-hide">
              {stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm
                    itemId={selectedItem!}
                    onSuccess={handlePurchaseSuccess}
                    currency={currency}
                    onCancel={handleCancelPayment}
                    displayPriceCents={checkoutPriceBreakdown?.finalCents ?? 0}
                  />
                </Elements>
              ) : (
                <div className="flex justify-center py-8">
                  <div className="text-muted-foreground">
                    Loading payment system...
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
