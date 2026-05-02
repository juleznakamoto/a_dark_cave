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
  /** List price for strikethrough (non-bundles). Bundles omit this; use `bundleComponentsListPriceSumCents`. */
  originalPrice?: number; // in cents
  rewards: ShopItemRewards;
  canPurchaseMultipleTimes: boolean;
  category: "resource" | "weapon" | "tool" | "blessing" | "feast" | "bundle" | "relic";
  activationMessage?: string;
  symbol?: string;
  symbolColor?: string;
  bundleComponents?: string[]; // IDs of component items for bundles
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
    symbolColor: "text-sky-700",
  },

  full_game: {
    id: "full_game",
    name: "Full Game",
    description:
      "Unlock the full game and continue your journey.",
    originalPrice: 1099,
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
    originalPrice: 599, // $5.99
    price: 449, // $4.49
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
    name: "250 Gold",
    description: "A decent amount of gold",
    originalPrice: 149,
    price: 99, // 0.99 €
    rewards: {
      resources: { gold: 250 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "250 Gold have been added to your inventory.",
    symbol: "◉",
    symbolColor: "text-yellow-600",
  },

  gold_1000: {
    id: "gold_1000",
    name: "1'000 Gold",
    description: "A substantial treasure",
    originalPrice: 399,
    price: 299, // 2.99 €
    rewards: {
      resources: { gold: 1000 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "1000 Gold have been added to your inventory.",
    symbol: "◉◉",
    symbolColor: "text-yellow-600",
  },

  gold_5000: {
    id: "gold_5000",
    name: "5'000 Gold",
    description: "A fortune in gold",
    originalPrice: 799,
    price: 599, // 5.99 €
    rewards: {
      resources: { gold: 5000 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "5000 Gold have been added to your inventory.",
    symbol: "◉◉◉",
    symbolColor: "text-yellow-600",
  },

  gold_20000: {
    id: "gold_20000",
    name: "20'000 Gold",
    description: "Unholy amounts of gold",
    originalPrice: 1349,
    price: 999, // 9.99 €
    rewards: {
      resources: { gold: 20000 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "20'000 Gold have been added to your inventory.",
    symbol: "◉◉◉◉",
    symbolColor: "text-yellow-600",
  },

  great_feast_1: {
    id: "great_feast_1",
    name: "1 Great Feast",
    description: `Boost villager production by 5x for ${GREAT_FEAST_DURATION_MS / 60000} minutes`,
    originalPrice: 199,
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
    originalPrice: 399,
    price: 299, // 2.99 €
    rewards: {
      feastActivations: 3,
    },
    canPurchaseMultipleTimes: true,
    category: "feast",
    activationMessage: "A Great Feast has begun!",
    symbol: "✦✦✦",
    symbolColor: "text-orange-600",
  },

  basic_survival_bundle: {
    id: "basic_survival_bundle",
    name: "Fading Wanderer Bundle",
    description: "Basic Bundle with 5'000 Gold and 1 Great Feast",
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
    description: "Uncover dark forgotten truths with the Skull Lantern, Tarnished Compass, and Crow Harness",
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
    description: "Powerful Bundle with 20'000 Gold and 3 Great Feasts",
    price: 1049, // 10.49 €
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
    description:
      "Ultimate Bundle with 20'000 Gold, 3 Great Feasts, Skull Lantern, Tarnished Compass, and Crow Harness",
    price: 1649, // $16.49
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

  skull_lantern: {
    id: "skull_lantern",
    name: "Skull Lantern",
    description:
      "Forged from cursed bone illuminating the deepest depths. Unlocks Skull Lantern storyline.",
    originalPrice: 399,
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
    originalPrice: 399,
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
    originalPrice: 399,
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
};

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