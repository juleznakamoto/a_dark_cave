export interface ShopItemRewards {
  resources?: Record<string, number>;
  tools?: string[];
  weapons?: string[];
  blessings?: string[];
  relics?: string[];
  feastActivations?: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  /** Optional list price for future sales (strikethrough when greater than `price`). */
  originalPrice?: number; // in cents
  rewards: ShopItemRewards;
  canPurchaseMultipleTimes: boolean;
  category: "resource" | "weapon" | "tool" | "blessing" | "feast" | "bundle" | "relic";
  activationMessage?: string;
  symbol?: string;
  symbolColor?: string;
  bundleComponents?: string[]; // IDs of component items for bundles
  /** When true, the item is never listed in the Shop dialog (Highlights/filter tabs).
   * It still exists for server pricing/verification and can be sold via a dedicated
   * checkout dialog opened from elsewhere in the UI. */
  hiddenFromShop?: boolean;
  /** When true, rewards/entitlements apply on purchase — no Purchases-tab activation step. */
  grantedOnPurchase?: boolean;
}

/** Duration of an activated Great Feast (shop purchase), in milliseconds. */
export const GREAT_FEAST_DURATION_MS = 30 * 60 * 1000;

export const SHOP_ITEMS: Record<string, ShopItem> = {
  gold_100_free: {
    id: "gold_100_free",
    name: "100 Gold Gift",
    description: "A small daily mercy in a cold world",
    price: 0,
    rewards: {
      resources: { gold: 100 },
    },
    canPurchaseMultipleTimes: false, // Not stored as purchase, claimed immediately
    category: "resource",
    activationMessage: "100 Gold have been added to your inventory as a gift!",
    symbol: "⚵",
    symbolColor: "text-sky-600",
  },

  full_game: {
    id: "full_game",
    name: "Full Game",
    description:
      "Unlock the full game and continue your journey.",
    price: 799, // 7.99 €
    rewards: {},
    canPurchaseMultipleTimes: false,
    category: "blessing",
    activationMessage:
      "Full Game unlocked and activated! The journey continues without restrictions.",
    symbol: "◆",
    symbolColor: "text-emerald-600",
  },

  cruel_mode: {
    id: "cruel_mode",
    name: "Cruel Mode",
    description:
      "A more cruel world, expanded story, more items, deadlier foes. Endure, or vanish.",
    price: 499, // $4.99
    rewards: {},
    canPurchaseMultipleTimes: false,
    category: "blessing",
    activationMessage:
      "Cruel Mode activated! Start a new game to experience the ultimate challenge.",
    symbol: "⛤",
    symbolColor: "text-red-500",
  },

  gold_250: {
    id: "gold_250",
    name: "1'000 Gold",
    description: "A decent amount of Gold",
    price: 149, // 1.49 €
    rewards: {
      resources: { gold: 1000 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "1000 Gold have been added to your inventory.",
    symbol: "🟇",
    symbolColor: "text-yellow-600",
  },

  gold_1000: {
    id: "gold_1000",
    name: "1'000 Gold",
    description: "A decent amount of Gold",
    price: 149, // 1.49 €
    rewards: {
      resources: { gold: 1000 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "1000 Gold have been added to your inventory.",
    symbol: "🟇",
    symbolColor: "text-yellow-600",
  },

  gold_2500: {
    id: "gold_2500",
    name: "2'500 Gold",
    description: "A substantial treasure",
    price: 349, // 3.49 €
    rewards: {
      resources: { gold: 2500 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "2500 Gold have been added to your inventory.",
    symbol: "🟍",
    symbolColor: "text-yellow-600",
  },

  gold_5000: {
    id: "gold_5000",
    name: "5'000 Gold",
    description: "A fortune in Gold",
    price: 549, // 5.49 €
    rewards: {
      resources: { gold: 5000 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "5000 Gold have been added to your inventory.",
    symbol: "🟑",
    symbolColor: "text-yellow-600",
  },

  gold_20000: {
    id: "gold_20000",
    name: "20'000 Gold",
    description: "Unholy amounts of Gold",
    price: 899, // 8.99 €
    rewards: {
      resources: { gold: 20000 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "20'000 Gold have been added to your inventory.",
    symbol: "🟔",
    symbolColor: "text-yellow-600",
  },

  great_feast_1: {
    id: "great_feast_1",
    name: "1 Great Feast",
    description: `Boost villager production by 5x for ${GREAT_FEAST_DURATION_MS / 60000} minutes`,
    price: 149, // 1.49 €
    rewards: {
      feastActivations: 1,
    },
    canPurchaseMultipleTimes: true,
    category: "feast",
    activationMessage: "A Great Feast has begun!",
    symbol: "✦",
    symbolColor: "text-orange-600",
  },

  great_feast_3: {
    id: "great_feast_3",
    name: "3 Great Feasts",
    description: `Boost villager production by 5x for ${GREAT_FEAST_DURATION_MS / 60000} minutes (3 times)`,
    price: 299, // 2.99 €
    rewards: {
      feastActivations: 3,
    },
    canPurchaseMultipleTimes: true,
    category: "feast",
    activationMessage: "A Great Feast has begun!",
    symbol: "✧",
    symbolColor: "text-orange-600",
  },

  skull_lantern: {
    id: "skull_lantern",
    name: "Skull Lantern",
    description:
      "Forged from cursed bone illuminating the deepest depths. Unlocks Skull Lantern storyline.",
    price: 299, // 2.99 €
    rewards: {
      tools: ["skull_lantern"],
    },
    canPurchaseMultipleTimes: false,
    category: "tool",
    activationMessage:
      "The Skull Lantern has been added to your tools! Its eerie light will guide you through the depths.",
    symbol: "❊",
    symbolColor: "text-purple-400",
  },

  tarnished_compass: {
    id: "tarnished_compass",
    name: "Tarnished Compass",
    description:
      "Artifact of the vanished civilization, its needle points to hidden places. Unlocks Compass storyline.",
    price: 299, // 2.99 €
    rewards: {
      relics: ["tarnished_compass"],
    },
    canPurchaseMultipleTimes: false,
    category: "relic",
    activationMessage:
      "The Tarnished Compass has been added to your inventory! Its ancient magic may grant fortune to your endeavors.",
    symbol: "⛯",
    symbolColor: "text-amber-300/90",
  },

  crow_harness: {
    id: "crow_harness",
    name: "Crow Harness",
    description:
      "Specially crafted harness for messenger crows. Unlocks Crow storyline. Adds Fellowship Member.",
    price: 299, // 2.99 €
    rewards: {
      tools: ["crow_harness"],
    },
    canPurchaseMultipleTimes: false,
    category: "tool",
    activationMessage:
      "The Crow Harness has been added to your tools! Now you must seek out a crow to bind to the harness.",
    symbol: "⟑",
    symbolColor: "text-slate-400",
  },

  basic_survival_bundle: {
    id: "basic_survival_bundle",
    name: "Fading Wanderer Bundle",
    description: "",
    price: 649, // 6.49 €
    rewards: {
      resources: { gold: 5000 },
      feastActivations: 1,
    },
    canPurchaseMultipleTimes: true,
    category: "bundle",
    activationMessage:
      "Fading Wanderer Bundle components have been added to your purchases!",
    symbol: "◈",
    symbolColor: "text-purple-600",
    bundleComponents: ["gold_5000", "great_feast_1"], // Component items
  },

  artifact_bundle: {
    id: "artifact_bundle",
    name: "Dark Artifacts Bundle",
    description: "",
    price: 749, // 7.49 €
    rewards: {
      tools: ["skull_lantern", "crow_harness"],
      relics: ["tarnished_compass"],
    },
    canPurchaseMultipleTimes: false,
    category: "bundle",
    activationMessage: "Dark Artifacts Bundle components have been added to your purchases!",
    symbol: "🜋",
    symbolColor: "text-green-600/90",
    bundleComponents: ["skull_lantern", "tarnished_compass", "crow_harness"],
  },

  advanced_bundle: {
    id: "advanced_bundle",
    name: "Pale King's Bundle",
    description: "",
    price: 999, // 9.99 €
    rewards: {
      resources: { gold: 20000 },
      feastActivations: 3,
    },
    canPurchaseMultipleTimes: true,
    category: "bundle",
    activationMessage:
      "Pale King's Bundle components have been added to your purchases!",
    symbol: "✣",
    symbolColor: "text-rose-600",
    bundleComponents: ["gold_20000", "great_feast_3"], // Component items
  },

  ashen_throne_bundle: {
    id: "ashen_throne_bundle",
    name: "Ashen Throne Bundle",
    description: "",
    price: 1499, // 14.99 €
    rewards: {
      resources: { gold: 20000 },
      feastActivations: 3,
      tools: ["skull_lantern", "crow_harness"],
      relics: ["tarnished_compass"],
    },
    canPurchaseMultipleTimes: false,
    category: "bundle",
    activationMessage:
      "Ashen Throne Bundle components have been added to your purchases!",
    symbol: "⯓",
    symbolColor: "text-stone-300",
    bundleComponents: [
      "gold_20000",
      "great_feast_3",
      "skull_lantern",
      "tarnished_compass",
      "crow_harness",
    ],
  },
};

/** One line per component: optional symbol + space + catalog name (e.g. "◉◉◉ 5'000 Gold"). */
function hydrateBundleDescriptions(catalog: Record<string, ShopItem>) {
  for (const item of Object.values(catalog)) {
    if (item.category !== "bundle" || !item.bundleComponents?.length) continue;
    const lines = item.bundleComponents.map((id) => {
      const c = catalog[id];
      if (!c) return "";
      const sym = c.symbol ?? "";
      return sym ? `${sym} ${c.name}` : c.name;
    }).filter((line) => line.length > 0);
    item.description = lines.join("\n");
  }
}

hydrateBundleDescriptions(SHOP_ITEMS);

/** Ordered list of items to show in the "Highlights" tab (replaces old "All" filter).
 * Order is deliberate for conversion optimization.
 */
export const HIGHLIGHTS_ORDER = [
  "gold_100_free", // Free Gift - shown first with special blue border
  "cruel_mode",
  "artifact_bundle", // Dark Artifacts Bundle
  "gold_20000", // 20'000 Gold
  "advanced_bundle", // Pale King's Bundle
  "ashen_throne_bundle",
] as const;

/** Sum of each component's list price (`originalPrice`, else `price`). */
export function bundleComponentsListPriceSumCents(
  componentIds: string[],
  catalog: Record<string, ShopItem> = SHOP_ITEMS,
): number {
  return componentIds.reduce((total, id) => {
    const c = catalog[id];
    return total + (c?.originalPrice ?? c?.price ?? 0);
  }, 0);
}

/** Sum of each component's catalog price (`price`). Used for bundle "Save %" vs buying components separately. */
export function bundleComponentsCatalogPriceSumCents(
  componentIds: string[],
  catalog: Record<string, ShopItem> = SHOP_ITEMS,
): number {
  return componentIds.reduce((total, id) => {
    const c = catalog[id];
    return total + (c?.price ?? 0);
  }, 0);
}

/** Smallest paid gold pack: per-unit baseline for "more value" % and `goldAmountBaselineCatalogCents`. */
export const SMALLEST_GOLD_PACK_ID = "gold_1000" as const;

/**
 * Paid gold currency SKUs (matches Gold-tab packs + legacy `gold_250`).
 * Excludes daily gift `gold_100_free` and bundles that merely contain gold.
 */
export const SHOP_PAID_GOLD_PACK_IDS: ReadonlySet<string> = new Set([
  "gold_250",
  "gold_1000",
  "gold_2500",
  "gold_5000",
  "gold_20000",
]);

export function isShopPaidGoldPackItem(id: string): boolean {
  return SHOP_PAID_GOLD_PACK_IDS.has(id);
}

/**
 * What this much gold would cost at the current catalog per-unit rate using the smallest pack.
 */
export function goldAmountBaselineCatalogCents(
  goldAmount: number,
  catalog: Record<string, ShopItem> = SHOP_ITEMS,
): number | null {
  const small = catalog[SMALLEST_GOLD_PACK_ID];
  const unitGold = small?.rewards.resources?.gold;
  if (!small || unitGold == null || unitGold <= 0) return null;
  const catalogPerPack = small.price;
  if (catalogPerPack <= 0) return null;
  return Math.round((goldAmount / unitGold) * catalogPerPack);
}

/** Catalog price for three single Great Feasts — same activations as `great_feast_3`. */
export function greatFeast3BaselineCatalogCents(
  catalog: Record<string, ShopItem> = SHOP_ITEMS,
): number {
  const one = catalog.great_feast_1;
  return Math.round(3 * one.price);
}

/**
 * Red badge: catalog baseline vs bundle/catalog `price`.
 * Gold: smallest-pack rate; great_feast_3: 3× single feast; bundles: summed component `price`.
 */
export function shopPackageSavingsPercent(
  item: ShopItem,
  catalog: Record<string, ShopItem> = SHOP_ITEMS,
): number | null {
  if (item.price <= 0) return null;

  let baseline: number | null = null;

  const gold = item.rewards.resources?.gold;
  const smallestPackGold =
    catalog[SMALLEST_GOLD_PACK_ID]?.rewards.resources?.gold ?? 0;
  if (
    item.category === "resource" &&
    gold != null &&
    smallestPackGold > 0 &&
    gold > smallestPackGold
  ) {
    baseline = goldAmountBaselineCatalogCents(gold, catalog);
  } else if (item.id === "great_feast_3") {
    baseline = greatFeast3BaselineCatalogCents(catalog);
  } else if (item.category === "bundle" && item.bundleComponents?.length) {
    const sum = bundleComponentsCatalogPriceSumCents(
      item.bundleComponents,
      catalog,
    );
    baseline = sum > 0 ? sum : null;
  } else {
    return null;
  }

  if (baseline == null || baseline <= 0 || item.price >= baseline) return null;
  return Math.max(
    0,
    Math.min(100, Math.round((1 - item.price / baseline) * 100)),
  );
}
