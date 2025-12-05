export interface ShopItemRewards {
  resources?: Record<string, number>;
  tools?: string[];
  weapons?: string[];
  blessings?: string[];
  feastActivations?: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  originalPrice?: number; // in cents, for showing crossed-out prices
  rewards: ShopItemRewards;
  canPurchaseMultipleTimes: boolean;
  category: "resource" | "weapon" | "tool" | "blessing" | "feast" | "bundle";
  activationMessage?: string;
  symbol?: string;
  symbolColor?: string;
  bundleComponents?: string[]; // IDs of component items for bundles
}

export const SHOP_ITEMS: Record<string, ShopItem> = {
  gold_100_free: {
    id: "gold_100_free",
    name: "100 Gold (Daily Free Gift)",
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

  cruel_mode: {
    id: "cruel_mode",
    name: "Cruel Mode",
    description:
      "Experience a cruel world, with expanded story, more items, more lore and deadlier foes. Endure, or vanish.",
    originalPrice: 799,
    price: 399, // 3.99 €
    rewards: {},
    canPurchaseMultipleTimes: false,
    category: "blessing",
    activationMessage:
      "Cruel Mode unlocked! Start a new game to experience the ultimate challenge.",
    symbol: "⛤",
    symbolColor: "text-red-600",
  },

  gold_250: {
    id: "gold_250",
    name: "250 Gold",
    description: "A decent amount of gold",
    originalPrice: 199,
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
    name: "1000 Gold",
    description: "A substantial treasure",
    originalPrice: 499,
    price: 249, // 2.99 €
    rewards: {
      resources: { gold: 1000 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "100 Gold have been added to your inventory.",
    symbol: "◉◉",
    symbolColor: "text-yellow-600",
  },

  gold_5000: {
    id: "gold_5000",
    name: "5000 Gold",
    description: "A fortune in gold",
    originalPrice: 999,
    price: 499, // 4.99 €
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
    name: "20000 Gold",
    description: "Unholy amounts of gold",
    originalPrice: 1999,
    price: 999, // 9.99 €
    rewards: {
      resources: { gold: 20000 },
    },
    canPurchaseMultipleTimes: true,
    category: "resource",
    activationMessage: "20000 Gold have been added to your inventory.",
    symbol: "◉◉◉◉",
    symbolColor: "text-yellow-600",
  },

  great_feast_1: {
    id: "great_feast_1",
    name: "1 Great Feast",
    description: "Boost village production by 4x for 30 minutes",
    originalPrice: 299,
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
    description: "Boost village production by 4x for 30 minutes (3 times)",
    originalPrice: 599,
    price: 299, // 2.99 €
    rewards: {
      feastActivations: 5,
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
    description: "Basic Bundle with 5000 Gold and 1 Great Feast",
    originalPrice: 1199, // 11.99 €
    price: 599, // 5.99 €
    rewards: {
      resources: { gold: 5000 },
      feastActivations: 1,
    },
    canPurchaseMultipleTimes: true,
    category: "bundle",
    activationMessage: "Fading Wanderer Bundle components have been added to your purchases!",
    symbol: "◈",
    symbolColor: "text-purple-600",
    bundleComponents: ["gold_5000", "great_feast_1"], // Component items
  },

  pale_kings_bundle: {
    id: "pale_kings_bundle",
    name: "Pale King's Bundle",
    description: "A powerful pack with 20000 Gold and 3 Great Feasts",
    originalPrice: 2399, // 23.99 €
    price: 1199, // 11.99 €
    rewards: {
      resources: { gold: 20000 },
      feastActivations: 5,
    },
    canPurchaseMultipleTimes: true,
    category: "bundle",
    activationMessage: "Pale King's Bundle components have been added to your purchases!",
    symbol: "♔",
    symbolColor: "text-slate-400",
    bundleComponents: ["gold_20000", "great_feast_3"], // Component items
  },

  // dwarven_hammer: {
  //   id: 'dwarven_hammer',
  //   name: 'Dwarven Hammer',
  //   description: "A legendary blacksmith's hammer that reduces crafting costs",
  //   price: 499, // 4.99 €
  //   rewards: {
  //     tools: ['blacksmith_hammer'],
  //   },
  //   canPurchaseMultipleTimes: false,
  //   category: 'tool',
  //   activationMessage: 'Activated Dwarven Hammer! Rewards have been added to your inventory.',
  // },

  // xxx_axe: {
  //   id: 'xxx_axe',
  //   name: 'Adamant Axe',
  //   description: 'An unbreakable axe made from the hardest metal',
  //   price: 199, // 1.99 €
  //   rewards: {
  //     tools: ['adamant_axe'],
  //   },
  //   canPurchaseMultipleTimes: false,
  //   category: 'tool',
  //   activationMessage: 'Activated Adamant Axe! Rewards have been added to your inventory.',
  // },
};