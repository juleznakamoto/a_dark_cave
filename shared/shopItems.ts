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
  rewards: ShopItemRewards;
  canPurchaseMultipleTimes: boolean;
  category: 'resource' | 'weapon' | 'tool' | 'blessing' | 'feast' | 'bundle';
  activationMessage?: string;
  symbol?: string;
  symbolColor?: string;
}

export const SHOP_ITEMS: Record<string, ShopItem> = {
  gold_50: {
    id: 'gold_50',
    name: '50 Gold',
    description: 'A small pouch of gold coins',
    price: 99, // 0.99 €
    rewards: {
      resources: { gold: 50 },
    },
    canPurchaseMultipleTimes: true,
    category: 'resource',
    activationMessage: '50 Gold have been added to your inventory.',
    symbol: '◉',
    symbolColor: 'text-yellow-600',
  },

  gold_250: {
    id: 'gold_250',
    name: '250 Gold',
    description: 'A decent amount of gold',
    price: 199, // 1.99 €
    rewards: {
      resources: { gold: 250 },
    },
    canPurchaseMultipleTimes: true,
    category: 'resource',
    activationMessage: '250 Gold have been added to your inventory.',
    symbol: '◉◉',
    symbolColor: 'text-yellow-600',
  },

  gold_1000: {
    id: 'gold_1000',
    name: '1000 Gold',
    description: 'A substantial treasure',
    price: 499, // 4.99 €
    rewards: {
      resources: { gold: 1000 },
    },
    canPurchaseMultipleTimes: true,
    category: 'resource',
    activationMessage: '1000 Gold have been added to your inventory.',
    symbol: '◉◉◉',
    symbolColor: 'text-yellow-600',
  },

  gold_5000: {
    id: 'gold_5000',
    name: '5000 Gold',
    description: 'A fortune in gold',
    price: 999, // 9.99 €
    rewards: {
      resources: { gold: 5000 },
    },
    canPurchaseMultipleTimes: true,
    category: 'resource',
    activationMessage: '5000 Gold have been added to your inventory.',
    symbol: '◉◉◉◉◉',
    symbolColor: 'text-yellow-600',
  },

  // weapon_2: {
  //   id: 'weapon_2',
  //   name: 'Frostglass Sword',
  //   description: 'A legendary blade forged from frozen glass',
  //   price: 499, // 4.99 €
  //   rewards: {
  //     weapons: ['frostglass_sword'],
  //   },
  //   canPurchaseMultipleTimes: false,
  //   category: 'weapon',
  //   activationMessage: 'Frostglass Sword has been added to your inventory.',
  // },

  // blessing_1: {
  //   id: 'blessing_1',
  //   name: "Raven's Mark",
  //   description: 'A blessing that enhances your luck and knowledge',
  //   price: 199, // 1.99 €
  //   rewards: {
  //     blessings: ['ravens_mark'],
  //   },
  //   canPurchaseMultipleTimes: false,
  //   category: 'blessing',
  //   activationMessage: "Activated Raven's Mark! Rewards have been added to your inventory.",
  // },

  // blessing_2: {
  //   id: 'blessing_2',
  //   name: 'Ashen Embrace',
  //   description: 'A powerful blessing that grants resilience',
  //   price: 499, // 4.99 €
  //   rewards: {
  //     blessings: ['ashen_embrace'],
  //   },
  //   canPurchaseMultipleTimes: false,
  //   category: 'blessing',
  //   activationMessage: 'Activated Ashen Embrace! Rewards have been added to your inventory.',
  // },

  great_feast_1: {
    id: 'great_feast_1',
    name: '1 Great Feast',
    description: 'Boost the production of your village by 4x for 30 minutes',
    price: 99, // 0.99 €
    rewards: {
      feastActivations: 1,
    },
    canPurchaseMultipleTimes: true,
    category: 'feast',
    activationMessage: 'A Great Feast has begun! The village celebrates with exceptional vigor for the next 30 minutes.',
    symbol: '✦',
    symbolColor: 'text-orange-600',
  },

  great_feast_5: {
    id: 'great_feast_5',
    name: '5 Great Feasts',
    description: 'Boost the production of your village by 4x for 30 minutes (5 times)',
    price: 249, // 2.49 €
    rewards: {
      feastActivations: 5,
    },
    canPurchaseMultipleTimes: true,
    category: 'feast',
    activationMessage: 'A Great Feast has begun! The village celebrates with exceptional vigor for the next 30 minutes.',
    symbol: '✦✦✦✦✦',
    symbolColor: 'text-orange-600',
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

  compound_bow: {
    id: 'compound_bow',
    name: 'Compound Bow',
    description: 'High precision weapon from the vanished civilization',
    price: 199, // 1.99 €
    rewards: {
      weapons: ['compound_bow'],
    },
    canPurchaseMultipleTimes: false,
    category: 'weapon',
    activationMessage: 'Compound Bow has been added to your inventory.',
    symbol: '➳',
    symbolColor: 'text-green-600',
  },
  
  natharit_pickaxe: {
    id: 'natharit_pickaxe',
    name: 'Natharit Pickaxe',
    description: 'Extremely sturdy pickaxe of unknown material with exceptional quality',
    price: 299, // 2.99 €
    rewards: {
      tools: ['natharit_pickaxe'],
    },
    canPurchaseMultipleTimes: false,
    category: 'tool',
    activationMessage: 'Natharit Pickaxe has been added to your inventory.',
    symbol: '⛏',
    symbolColor: 'text-purple-600',
  },

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

  // ultimate_pack: {
  //   id: 'ultimate_pack',
  //   name: 'Ultimate Pack',
  //   description: 'All premium tools plus 1 Great Feast activation',
  //   price: 999, // 9.99 €
  //   rewards: {
  //     tools: ['blacksmith_hammer', 'adamant_pickaxe', 'adamant_axe', 'adamant_lantern'],
  //     feastActivations: 1,
  //   },
  //   canPurchaseMultipleTimes: false,
  //   category: 'bundle',
  //   activationMessage: 'Activated Ultimate Pack! Rewards have been added to your inventory.',
  //   symbol: '⬢',
  //   symbolColor: 'text-purple-400',
  // },
};