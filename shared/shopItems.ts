
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
  },

  weapon_1: {
    id: 'weapon_1',
    name: 'Elven Bow',
    description: 'A masterfully crafted bow from the elven forests',
    price: 199, // 1.99 €
    rewards: {
      weapons: ['elven_bow'],
    },
    canPurchaseMultipleTimes: false,
    category: 'weapon',
  },

  weapon_2: {
    id: 'weapon_2',
    name: 'Frostglass Sword',
    description: 'A legendary blade forged from frozen glass',
    price: 499, // 4.99 €
    rewards: {
      weapons: ['frostglass_sword'],
    },
    canPurchaseMultipleTimes: false,
    category: 'weapon',
  },

  blessing_1: {
    id: 'blessing_1',
    name: "Raven's Mark",
    description: 'A blessing that enhances your luck and knowledge',
    price: 199, // 1.99 €
    rewards: {
      blessings: ['ravens_mark'],
    },
    canPurchaseMultipleTimes: false,
    category: 'blessing',
  },

  blessing_2: {
    id: 'blessing_2',
    name: 'Ashen Embrace',
    description: 'A powerful blessing that grants resilience',
    price: 499, // 4.99 €
    rewards: {
      blessings: ['ashen_embrace'],
    },
    canPurchaseMultipleTimes: false,
    category: 'blessing',
  },

  feast_1: {
    id: 'feast_1',
    name: '1 Great Feast',
    description: 'Activate one Great Feast to boost your village',
    price: 99, // 0.99 €
    rewards: {
      feastActivations: 1,
    },
    canPurchaseMultipleTimes: true,
    category: 'feast',
  },

  feast_5: {
    id: 'feast_5',
    name: '5 Great Feasts',
    description: 'Activate five Great Feasts',
    price: 199, // 1.99 €
    rewards: {
      feastActivations: 5,
    },
    canPurchaseMultipleTimes: true,
    category: 'feast',
  },

  dwarven_hammer: {
    id: 'dwarven_hammer',
    name: 'Dwarven Hammer',
    description: "A legendary blacksmith's hammer that reduces crafting costs",
    price: 499, // 4.99 €
    rewards: {
      tools: ['blacksmith_hammer'],
    },
    canPurchaseMultipleTimes: false,
    category: 'tool',
  },

  natharit_pickaxe: {
    id: 'natharit_pickaxe',
    name: 'Natharit Pickaxe',
    description: 'An adamant pickaxe of exceptional quality',
    price: 299, // 2.99 €
    rewards: {
      tools: ['adamant_pickaxe'],
    },
    canPurchaseMultipleTimes: false,
    category: 'tool',
  },

  xxx_axe: {
    id: 'xxx_axe',
    name: 'Adamant Axe',
    description: 'An unbreakable axe made from the hardest metal',
    price: 199, // 1.99 €
    rewards: {
      tools: ['adamant_axe'],
    },
    canPurchaseMultipleTimes: false,
    category: 'tool',
  },

  ultimate_pack: {
    id: 'ultimate_pack',
    name: 'Ultimate Pack',
    description: 'All premium tools plus 1 Great Feast activation',
    price: 999, // 9.99 €
    rewards: {
      tools: ['blacksmith_hammer', 'adamant_pickaxe', 'adamant_axe', 'adamant_lantern'],
      feastActivations: 1,
    },
    canPurchaseMultipleTimes: false,
    category: 'bundle',
  },
};
