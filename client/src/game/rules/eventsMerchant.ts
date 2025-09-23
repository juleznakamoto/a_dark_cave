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
type GameState = {
  villagers: VillagerCounts;
  resources: {
    [key: string]: number;
  };
  buildings: { woodenHut: number; hut: number; shrine?: number };
  stats: { strength?: number; luck?: number; knowledge?: number };
  relics: { [key: string]: boolean };
  events: { [key: string]: boolean };
  flags: { [key: string]: boolean };
  tools: { [key: string]: boolean };
  clothing?: { [key: string]: boolean };
  current_population?: number;
};

// Helper function to get total knowledge from various sources
function getTotalKnowledge(state: GameState): number {
  return (state.stats.knowledge || 0);
}

// Define trade configurations
const resourceTrades = [
  {
    id: "trade_steel_100_wood",
    label: "Buy 100 Steel for Wood",
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
    label: "Buy 50 Steel for Bones/Fur/etc",
    give: "steel",
    giveAmount: 50,
    costs: [
      { resource: "bones", amounts: [400, 500, 600] },
      { resource: "wood", amounts: [500, 600] },
      { resource: "fur", amounts: [300, 400, 500] },
      { resource: "stone", amounts: [500] },
      { resource: "gold", amounts: [5] },
      { resource: "silver", amounts: [10] }
    ]
  },
  {
    id: "trade_obsidian_50_wood",
    label: "Buy 50 Obsidian for Wood/Silver/Gold",
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
    label: "Buy 25 Obsidian for Bones/Fur/etc",
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
    label: "Buy 25 Adamant",
    give: "adamant",
    giveAmount: 25,
    costs: [
      { resource: "gold", amounts: [10, 15] },
      { resource: "silver", amounts: [30] },
      { resource: "steel", amounts: [100] },
      { resource: "wood", amounts: [2500] },
      { resource: "food", amounts: [500] }
    ]
  },
  {
    id: "trade_wood_500",
    label: "Buy 500 Wood",
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
    label: "Buy 1000 Wood",
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
    label: "Buy 500 Food",
    give: "food",
    giveAmount: 500,
    costs: [
      { resource: "gold", amounts: [5] },
      { resource: "silver", amounts: [10] }
    ]
  },
  {
    id: "trade_food_1000",
    label: "Buy 1000 Food",
    give: "food",
    giveAmount: 1000,
    costs: [
      { resource: "gold", amounts: [10] },
      { resource: "silver", amounts: [20] }
    ]
  },
  {
    id: "trade_gold_25",
    label: "Buy 25 Gold",
    give: "gold",
    giveAmount: 25,
    costs: [
      { resource: "steel", amounts: [200] },
      { resource: "wood", amounts: [2500] },
      { resource: "stone", amounts: [1500] },
      { resource: "fur", amounts: [2000] },
      { resource: "food", amounts: [2500] }
    ]
  },
  {
    id: "trade_silver_50",
    label: "Buy 50 Silver",
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
    label: "Buy 50 Gold",
    give: "gold",
    giveAmount: 50,
    costs: [
      { resource: "steel", amounts: [500] },
      { resource: "wood", amounts: [5000] },
      { resource: "stone", amounts: [3000] },
      { resource: "fur", amounts: [5000] },
      { resource: "food", amounts: [5000] },
      { resource: "obsidian", amounts: [100] },
      { resource: "adamant", amounts: [20] }
    ]
  },
  {
    id: "trade_silver_100",
    label: "Buy 100 Silver",
    give: "silver",
    giveAmount: 100,
    costs: [
      { resource: "steel", amounts: [500] },
      { resource: "wood", amounts: [5000] },
      { resource: "stone", amounts: [3000] },
      { resource: "fur", amounts: [5000] },
      { resource: "food", amounts: [5000] },
      { resource: "obsidian", amounts: [100] },
      { resource: "adamant", amounts: [20] }
    ]
  }
];

const toolTrades = [
  {
    id: "trade_reinforced_rope",
    label: "Buy Reinforced Rope",
    give: "tool",
    giveItem: "reinforced_rope",
    costs: [
      { resource: "silver", amounts: [50] },
      { resource: "gold", amounts: [25] }
    ],
    message: "You purchase the reinforced rope. The merchant explains that this rope can withstand tremendous strain and reach places in the deepest cave chambers."
  },
  {
    id: "trade_alchemist_map",
    label: "Buy Alchemist's Map",
    give: "tool",
    giveItem: "alchemist_map",
    costs: [
      { resource: "silver", amounts: [100] },
      { resource: "gold", amounts: [50] }
    ],
    message: "You buy the alchemist's map. The merchant whispers: 'An old alchemist hid his secrets in a chamber deep in the cave, sealed by a dorr that looks like stone. This map will guide you.'"
  },
  {
    id: "trade_murmuring_cube",
    label: "Buy Murmuring Cube",
    give: "relic",
    giveItem: "murmuring_cube",
    costs: [
      { resource: "silver", amounts: [150] },
      { resource: "gold", amounts: [75] }
    ],
    message: "You purchase a cube made of an unknown polished metal. The strange geometric object hums with an otherworldly energy, its purpose mysterious but its power unmistakable."
  },
  {
    id: "trade_giant_trap",
    label: "Buy Giant Trap",
    give: "tool",
    giveItem: "giant_trap",
    costs: [
      { resource: "silver", amounts: [20] },
      { resource: "gold", amounts: [10] }
    ],
    message: "You purchase the giant trap. The merchant grins: 'This can trap something gigantic in the woods. Use it wisely - there are creatures out there that dwarf ordinary beasts.'"
  }
];

// Helper function to create resource trade choices
function createResourceTradeChoice(trade: typeof resourceTrades[0], state: GameState) {
  const knowledge = getTotalKnowledge(state);

  // Select random cost option
  const costOption = trade.costs[Math.floor(Math.random() * trade.costs.length)];
  const cost = Math.ceil(costOption.amounts[Math.floor(Math.random() * costOption.amounts.length)] * Math.max(0.01, 1 - knowledge * 0.01));

  return {
    id: trade.id,
    label: `Buy ${trade.giveAmount} ${trade.give}`,
    effect: (state: GameState) => {
      if ((state.resources[costOption.resource] || 0) >= cost) {
        return {
          resources: {
            ...state.resources,
            [costOption.resource]: (state.resources[costOption.resource] || 0) - cost,
            [trade.give]: (state.resources[trade.give] || 0) + trade.giveAmount,
          },
        };
      }
      return {};
    },
  };
}

// Helper function to create tool/relic trade choices
function createToolTradeChoice(trade: typeof toolTrades[0], state: GameState) {
  const knowledge = getTotalKnowledge(state);

  // Select random cost option
  const costOption = trade.costs[Math.floor(Math.random() * trade.costs.length)];
  const cost = Math.ceil(costOption.amounts[0] * Math.max(0.01, 1 - knowledge * 0.01));

  return {
    id: trade.id,
    label: `${trade.label}`,
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
        }
        if (trade.give === "relic") {
          result.relics = { ...state.relics, [trade.giveItem]: true };
        }

        return result;
      }
      return {};
    },
  };
}

// Function to generate fresh merchant choices
export function generateMerchantChoices(state: GameState): EventChoice[] {
  const availableResourceTrades = resourceTrades
    .sort(() => Math.random() - 0.5) // Shuffle
    .slice(0, 4) // Take first 4
    .map(trade => {
      // Create a fresh choice with new random costs each time
      const knowledge = getTotalKnowledge(state);
      const costOption = trade.costs[Math.floor(Math.random() * trade.costs.length)];
      const cost = Math.ceil(costOption.amounts[Math.floor(Math.random() * costOption.amounts.length)] * Math.max(0.01, 1 - knowledge * 0.01));
      
      return {
        id: `${trade.id}_${Date.now()}_${Math.random()}`, // Unique ID each time
        label: `Buy ${trade.giveAmount} ${trade.give} for ${cost} ${costOption.resource}`,
        effect: (state: GameState) => {
          if ((state.resources[costOption.resource] || 0) >= cost) {
            return {
              resources: {
                ...state.resources,
                [costOption.resource]: (state.resources[costOption.resource] || 0) - cost,
                [trade.give]: (state.resources[trade.give] || 0) + trade.giveAmount,
              },
            };
          }
          return {};
        },
      };
    });

  const availableToolTrades = toolTrades
    .filter(trade => {
      // Don't offer tools/relics that the player already owns
      if (trade.give === "tool" && state.tools[trade.giveItem as keyof typeof state.tools]) {
        return false;
      }
      if (trade.give === "relic" && state.relics[trade.giveItem as keyof typeof state.relics]) {
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
        label: `${trade.label} for ${cost} ${costOption.resource}`,
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
            }
            if (trade.give === "relic") {
              result.relics = { ...state.relics, [trade.giveItem]: true };
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
    timeProbability: 0.14,
    title: "The Traveling Merchant",
    message: "A weathered merchant arrives, his cart overflowing with wares. His eyes glint with avarice as he murmurs 'I have rare items for trade'.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [], // Will be populated when event triggers
  },
};