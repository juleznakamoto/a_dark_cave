import { GameEvent } from "./events";

// Define a type for the villager counts in the state
type VillagerCounts = {
  free: number;
  gatherer: number;
  hunter: number;
  iron_miner: number;
  coal_miner: number;
  sulfur_miner: number;
  gold_miner: number;
  obsidian_miner: number;
  adamant_miner: number;
  moonstone_miner: number;
  steel_forger: number;
  [key: string]: number;
};

// Define a type for the game state
import { getTotalKnowledge } from './effects';

type GameState = {
  villagers: VillagerCounts;
  resources: {
    [key: string]: number;
  };
  buildings: { woodenHut: number; hut: number; altar?: number };
  stats: { strength?: number; luck?: number; knowledge?: number };
  relics: { [key: string]: boolean };
  events: { [key: string]: boolean };
  flags: { [key: string]: boolean };
  tools: { [key: string]: boolean };
  clothing?: { [key: string]: boolean };
  current_population?: number;
};

// Define trade configurations
const resourceTrades = [
  {
    id: "trade_steel_100_wood",
    label: "100 Steel",
    give: "steel",
    giveAmount: 100,
    costs: [
      { resource: "wood", amounts: [750, 1000, 1250] },
      { resource: "stone", amounts: [1000] },
      { resource: "gold", amounts: [10] },
      { resource: "silver", amounts: [5] }
    ]
  },
  {
    id: "trade_steel_50_bones",
    label: "50 Steel",
    give: "steel",
    giveAmount: 50,
    costs: [
      { resource: "bones", amounts: [400, 500, 600] },
      { resource: "wood", amounts: [500, 600] },
      { resource: "fur", amounts: [300, 400, 500] },
      { resource: "leather", amounts: [200, 300, 400] },
      { resource: "stone", amounts: [500] },
      { resource: "gold", amounts: [5] },
      { resource: "silver", amounts: [10] }
    ]
  },
  {
    id: "trade_obsidian_50_wood",
    label: "50 Obsidian",
    give: "obsidian",
    giveAmount: 50,
    costs: [
      { resource: "wood", amounts: [1500, 1750, 2000] },
      { resource: "silver", amounts: [20] },
      { resource: "gold", amounts: [10] }
    ]
  },
  {
    id: "trade_obsidian_25_bones",
    label: "25 Obsidian",
    give: "obsidian",
    giveAmount: 25,
    costs: [
      { resource: "bones", amounts: [1000, 1250, 1500] },
      { resource: "fur", amounts: [1000, 1250, 1500] },
      { resource: "silver", amounts: [10] },
      { resource: "stone", amounts: [1500] }
    ]
  },
  {
    id: "trade_adamant_25_gold",
    label: "25 Adamant",
    give: "adamant",
    giveAmount: 25,
    costs: [
      { resource: "gold", amounts: [10, 15] },
      { resource: "silver", amounts: [30] },
      { resource: "steel", amounts: [100] },
      { resource: "wood", amounts: [2500] },
      { resource: "food", amounts: [500] },
      { resource: "leather", amounts: [600, 700, 800] },
    ]
  },
  {
    id: "trade_wood_500",
    label: "500 Wood",
    give: "wood",
    giveAmount: 500,
    costs: [
      { resource: "silver", amounts: [5] },
      { resource: "iron", amounts: [25] },
      { resource: "steel", amounts: [10] },
      { resource: "food", amounts: [100] }
    ]
  },
  {
    id: "trade_wood_1000",
    label: "1000 Wood",
    give: "wood",
    giveAmount: 1000,
    costs: [
      { resource: "gold", amounts: [5] },
      { resource: "silver", amounts: [10] },
      { resource: "iron", amounts: [50] },
      { resource: "steel", amounts: [25] },
      { resource: "food", amounts: [200] }
    ]
  },
  {
    id: "trade_food_500",
    label: "500 Food",
    give: "food",
    giveAmount: 500,
    costs: [
      { resource: "gold", amounts: [5] },
      { resource: "silver", amounts: [10] }
    ]
  },
  {
    id: "trade_food_1000",
    label: "1000 Food",
    give: "food",
    giveAmount: 1000,
    costs: [
      { resource: "gold", amounts: [10] },
      { resource: "silver", amounts: [20] }
    ]
  },
  {
    id: "trade_gold_25",
    label: "25 Gold",
    give: "gold",
    giveAmount: 25,
    costs: [
      { resource: "steel", amounts: [200] },
      { resource: "wood", amounts: [2500] },
      { resource: "stone", amounts: [1500] },
      { resource: "fur", amounts: [2000] },
      { resource: "food", amounts: [2500] },
      { resource: "leather", amounts: [1200, 1300, 1400] },
    ]
  },
  {
    id: "trade_silver_50",
    label: "50 Silver",
    give: "silver",
    giveAmount: 50,
    costs: [
      { resource: "steel", amounts: [200] },
      { resource: "wood", amounts: [2500] },
      { resource: "stone", amounts: [1500] },
      { resource: "fur", amounts: [2000] },
      { resource: "food", amounts: [2500] }
    ]
  },
  {
    id: "trade_gold_50",
    label: "50 Gold",
    give: "gold",
    giveAmount: 50,
    costs: [
      { resource: "steel", amounts: [500] },
      { resource: "wood", amounts: [5000] },
      { resource: "stone", amounts: [3000] },
      { resource: "fur", amounts: [5000] },
      { resource: "leather", amounts: [3500] },
      { resource: "food", amounts: [5000] },
      { resource: "obsidian", amounts: [100] },
      { resource: "adamant", amounts: [20] }
    ]
  },
  {
    id: "trade_silver_100",
    label: "100 Silver",
    give: "silver",
    giveAmount: 100,
    costs: [
      { resource: "steel", amounts: [500] },
      { resource: "wood", amounts: [5000] },
      { resource: "stone", amounts: [3000] },
      { resource: "fur", amounts: [5000] },
      { resource: "leather", amounts: [3500] },
      { resource: "food", amounts: [5000] },
      { resource: "obsidian", amounts: [100] },
      { resource: "adamant", amounts: [20] }
    ]
  }
];

const toolTrades = [
  {
    id: "trade_reinforced_rope",
    label: "Reinforced Rope",
    give: "tool",
    giveItem: "reinforced_rope",
    costs: [
      { resource: "gold", amounts: [50] }
    ],
    message: "You purchase the reinforced rope. This rope can withstand tremendous strain and reach places in the deepest cave chambers."
  },
  {
    id: "trade_occultist_map",
    label: "Occultists's Map",
    give: "tool",
    giveItem: "occultist_map",
    costs: [
      { resource: "gold", amounts: [50] }
    ],
    message: "As you buy the occultists's map the merchant whispers: 'An old occultist hid his secrets in a chamber deep in the cave. This map will guide you.'"
  },
  {
    id: "trade_giant_trap",
    label: "Giant Trap",
    give: "tool",
    giveItem: "giant_trap",
    costs: [
      { resource: "gold", amounts: [25] }
    ],
    message: "As you purchase the giant trap, the merchant grins: 'This can trap something gigantic in the woods. Use it wisely.'"
  },
  {
    id: "trade_arbalest_schematic",
    label: "Arbalest Schematic",
    give: "schematic",
    giveItem: "arbalest_schematic",
    costs: [
      { resource: "gold", amounts: [500] }
    ],
    message: "You purchase the arbalest schematic. The merchant unfurls an intricate blueprint: 'A design from a master engineer. With this, you can craft a powerful weapon.'"
  },
  {
    id: "trade_nightshade_bow_schematic",
    label: "Nightshade Bow Schematic",
    give: "schematic",
    giveItem: "nightshade_bow_schematic",
    costs: [
      { resource: "gold", amounts: [1000] }
    ],
    message: "You purchase the nightshade bow schematic. The merchant grins darkly: 'This bow's design is cruel. Its arrows will poison your enemies.'"
  }
];

// Function to generate fresh merchant choices
export function generateMerchantChoices(state: GameState): EventChoice[] {
  // Check if we have 5+ stone huts for the 2x multiplier
  const stoneHutMultiplier = state.buildings.stoneHut >= 5 ? 2 : 1;
  
  const availableResourceTrades = resourceTrades
    .sort(() => Math.random() - 0.5) // Shuffle
    .slice(0, 4) // Take first 4
    .map(trade => {
      // Create a fresh choice with new random costs each time
      const knowledge = getTotalKnowledge(state);
      const costOption = trade.costs[Math.floor(Math.random() * trade.costs.length)];
      const baseCost = costOption.amounts[Math.floor(Math.random() * costOption.amounts.length)];
      const cost = Math.ceil(baseCost * Math.max(0.01, 1 - knowledge * 0.01) * stoneHutMultiplier);
      const giveAmount = trade.giveAmount * stoneHutMultiplier;

      return {
        id: `${trade.id}_${Date.now()}_${Math.random()}`, // Unique ID each time
        label: `Buy ${trade.label}`,
        cost: `${cost} ${costOption.resource}`,
        effect: (state: GameState) => {
          if ((state.resources[costOption.resource] || 0) >= cost) {
            return {
              resources: {
                ...state.resources,
                [costOption.resource]: (state.resources[costOption.resource] || 0) - cost,
                [trade.give]: (state.resources[trade.give] || 0) + giveAmount,
              },
            };
          }
          return {};
        },
      };
    });

  const availableToolTrades = toolTrades
    .filter(trade => {
      // Don't offer tools/relics/schematics that the player already owns
      if (trade.give === "tool" && state.tools[trade.giveItem as keyof typeof state.tools]) {
        return false;
      }
      if (trade.give === "relic" && state.relics[trade.giveItem as keyof typeof state.relics]) {
        return false;
      }
      if (trade.give === "schematic" && state.schematics[trade.giveItem as keyof typeof state.schematics]) {
        return false;
      }
      return true;
    })
    .sort(() => Math.random() - 0.5) // Shuffle
    .slice(0, 1) // Take first 1
    .map(trade => {
      // Create a fresh choice with new random costs each time
      const knowledge = getTotalKnowledge(state);
      const costOption = trade.costs[Math.floor(Math.random() * trade.costs.length)];
      const cost = Math.ceil(costOption.amounts[0] * Math.max(0.01, 1 - knowledge * 0.01));

      return {
        id: `${trade.id}_${Date.now()}_${Math.random()}`, // Unique ID each time
        label: `Buy ${trade.label}`,
        cost: `${cost} ${costOption.resource}`,
        effect: (state: GameState) => {
          if ((state.resources[costOption.resource] || 0) >= cost) {
            const result: any = {
              resources: {
                ...state.resources,
                [costOption.resource]: (state.resources[costOption.resource] || 0) - cost,
              },
              _logMessage: trade.message.replace('${cost}', cost.toString()).replace('${selectedCost.type}', costOption.resource),
            };

            if (trade.give === "tool") {
              result.tools = { ...state.tools, [trade.giveItem]: true };
            } else if (trade.give === "relic") {
              result.relics = { ...state.relics, [trade.giveItem]: true };
            } else if (trade.give === "schematic") {
              result.schematics = { ...state.schematics, [trade.giveItem]: true };
            }

            return result;
          }
          return {};
        },
      };
    });

  return [
    ...availableResourceTrades,
    ...availableToolTrades,
    {
      id: "say_goodbye",
      label: "Say goodbye",
      effect: (state: GameState) => {
        return {
          _logMessage: "You bid the merchant farewell. He tips his hat and mutters about the road ahead.",
        };
      },
    },
  ];
}

export const merchantEvents: Record<string, GameEvent> = {
  merchant: {
    id: "merchant",
    condition: (state: GameState) => state.buildings.woodenHut >= 4,
    triggerType: "resource",
    timeProbability: 10,
    title: "The Traveling Merchant",
    message: "A weathered merchant arrives, his cart overflowing with wares. His eyes glint with avarice as he murmurs 'I have rare items for trade'.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [], // Will be populated when event triggers
  },
};