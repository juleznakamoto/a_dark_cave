
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
  [key: string]: number; // Allows for other villager types if added later
};

// Define a type for the game state
type GameState = {
  villagers: VillagerCounts;
  resources: {
    food: number;
    iron: number;
    wood?: number;
    stone?: number;
    gold?: number;
    silver?: number;
    bones?: number;
    fur?: number;
    steel?: number;
    obsidian?: number;
    adamant?: number;
    food?: number;
    [key: string]: number | undefined; // Allows for other resources
  };
  buildings: { woodenHut: number; hut: number; shrine?: number };
  stats: { strength?: number; luck?: number; knowledge?: number };
  relics: {
    ravenfeather_mantle?: boolean;
    whispering_amulet?: boolean;
    blackened_mirror?: boolean;
    wooden_figure?: boolean;
    alphas_hide?: boolean;
    elder_scroll?: boolean;
    ebony_ring?: boolean;
    cracked_crown?: boolean;
    murmuring_cube?: boolean;
    blacksmith_hammer?: boolean;
  };
  events: {
    trinketDrunk?: boolean;
    dream_morrowind?: boolean;
    dream_oblivion?: boolean;
    dream_skyrim?: boolean;
    elder_scroll_found?: boolean;
    blacksmith_hammer_found?: boolean;
    trinket_found?: boolean;
  };
  flags: { trinketDrunk?: boolean; forestUnlocked?: boolean };
  tools: { blacksmith_hammer?: boolean; reinforced_rope?: boolean; alchemist_map?: boolean; giant_trap?: boolean };
  clothing?: { tarnished_amulet?: boolean };
  current_population?: number;
};

// Helper function to get total knowledge from various sources
function getTotalKnowledge(state: GameState): number {
  return (state.stats.knowledge || 0);
}

export const merchantEvents: Record<string, GameEvent> = {
  merchant: {
    id: "merchant",
    condition: (state: GameState) => state.buildings.woodenHut >= 3,
    triggerType: "resource",
    timeProbability: 120,
    title: "The Traveling Merchant",
    message: "A weathered merchant approaches your village, his pack filled with exotic goods and strange contraptions. His eyes gleam with avarice as he surveys your settlement. 'I have rare items for trade,' he says with a crooked smile.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      // Resource trades (4 random ones selected)
      {
        id: "trade_steel_100_wood",
        label: "Buy 100 Steel for Wood",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const woodCosts = [750, 1000, 1250];
          const cost = Math.ceil(woodCosts[Math.floor(Math.random() * woodCosts.length)] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.wood >= cost) {
            return {
              resources: {
                ...state.resources,
                wood: state.resources.wood - cost,
                steel: state.resources.steel + 100,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_steel_50_bones",
        label: "Buy 50 Steel for Bones",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const boneCosts = [400, 500, 600];
          const cost = Math.ceil(boneCosts[Math.floor(Math.random() * boneCosts.length)] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.bones >= cost) {
            return {
              resources: {
                ...state.resources,
                bones: state.resources.bones - cost,
                steel: state.resources.steel + 50,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_steel_50_wood",
        label: "Buy 50 Steel for Wood",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const woodCosts = [400, 500, 600];
          const cost = Math.ceil(woodCosts[Math.floor(Math.random() * woodCosts.length)] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.wood >= cost) {
            return {
              resources: {
                ...state.resources,
                wood: state.resources.wood - cost,
                steel: state.resources.steel + 50,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_obsidian_50_wood",
        label: "Buy 50 Obsidian for Wood",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const woodCosts = [1500, 1750, 2000];
          const cost = Math.ceil(woodCosts[Math.floor(Math.random() * woodCosts.length)] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.wood >= cost) {
            return {
              resources: {
                ...state.resources,
                wood: state.resources.wood - cost,
                obsidian: state.resources.obsidian + 50,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_obsidian_25_bones",
        label: "Buy 25 Obsidian for Bones",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const boneCosts = [1000, 1250, 1500];
          const cost = Math.ceil(boneCosts[Math.floor(Math.random() * boneCosts.length)] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.bones >= cost) {
            return {
              resources: {
                ...state.resources,
                bones: state.resources.bones - cost,
                obsidian: state.resources.obsidian + 25,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_adamant_25_gold",
        label: "Buy 25 Adamant for Gold",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const goldCosts = [10, 15];
          const cost = Math.ceil(goldCosts[Math.floor(Math.random() * goldCosts.length)] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.gold >= cost) {
            return {
              resources: {
                ...state.resources,
                gold: state.resources.gold - cost,
                adamant: state.resources.adamant + 25,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_adamant_25_silver",
        label: "Buy 25 Adamant for Silver",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const silverCosts = [30];
          const cost = Math.ceil(silverCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.silver >= cost) {
            return {
              resources: {
                ...state.resources,
                silver: state.resources.silver - cost,
                adamant: state.resources.adamant + 25,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_wood_500_silver",
        label: "Buy 500 Wood for Silver",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const silverCosts = [5];
          const cost = Math.ceil(silverCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.silver >= cost) {
            return {
              resources: {
                ...state.resources,
                silver: state.resources.silver - cost,
                wood: state.resources.wood + 500,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_wood_1000_gold",
        label: "Buy 1000 Wood for Gold",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const goldCosts = [5];
          const cost = Math.ceil(goldCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.gold >= cost) {
            return {
              resources: {
                ...state.resources,
                gold: state.resources.gold - cost,
                wood: state.resources.wood + 1000,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_food_500_gold",
        label: "Buy 500 Food for Gold",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const goldCosts = [5];
          const cost = Math.ceil(goldCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.gold >= cost) {
            return {
              resources: {
                ...state.resources,
                gold: state.resources.gold - cost,
                food: state.resources.food + 500,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_food_1000_silver",
        label: "Buy 1000 Food for Silver",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const silverCosts = [20];
          const cost = Math.ceil(silverCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.silver >= cost) {
            return {
              resources: {
                ...state.resources,
                silver: state.resources.silver - cost,
                food: state.resources.food + 1000,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_gold_25_steel",
        label: "Buy 25 Gold for Steel",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const steelCosts = [200];
          const cost = Math.ceil(steelCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.steel >= cost) {
            return {
              resources: {
                ...state.resources,
                steel: state.resources.steel - cost,
                gold: state.resources.gold + 25,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_gold_25_wood",
        label: "Buy 25 Gold for Wood",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const woodCosts = [2500];
          const cost = Math.ceil(woodCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.wood >= cost) {
            return {
              resources: {
                ...state.resources,
                wood: state.resources.wood - cost,
                gold: state.resources.gold + 25,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_silver_50_steel",
        label: "Buy 50 Silver for Steel",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const steelCosts = [500];
          const cost = Math.ceil(steelCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.steel >= cost) {
            return {
              resources: {
                ...state.resources,
                steel: state.resources.steel - cost,
                silver: state.resources.silver + 50,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_silver_50_wood",
        label: "Buy 50 Silver for Wood",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const woodCosts = [5000];
          const cost = Math.ceil(woodCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.wood >= cost) {
            return {
              resources: {
                ...state.resources,
                wood: state.resources.wood - cost,
                silver: state.resources.silver + 50,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_gold_50_steel",
        label: "Buy 50 Gold for Steel",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const steelCosts = [500];
          const cost = Math.ceil(steelCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.steel >= cost) {
            return {
              resources: {
                ...state.resources,
                steel: state.resources.steel - cost,
                gold: state.resources.gold + 50,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_gold_50_obsidian",
        label: "Buy 50 Gold for Obsidian",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const obsidianCosts = [100];
          const cost = Math.ceil(obsidianCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.obsidian >= cost) {
            return {
              resources: {
                ...state.resources,
                obsidian: state.resources.obsidian - cost,
                gold: state.resources.gold + 50,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_silver_100_steel",
        label: "Buy 100 Silver for Steel",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const steelCosts = [500];
          const cost = Math.ceil(steelCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.steel >= cost) {
            return {
              resources: {
                ...state.resources,
                steel: state.resources.steel - cost,
                silver: state.resources.silver + 100,
              },
            };
          }
          return {};
        },
      },
      {
        id: "trade_silver_100_obsidian",
        label: "Buy 100 Silver for Obsidian",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const obsidianCosts = [100];
          const cost = Math.ceil(obsidianCosts[0] * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources.obsidian >= cost) {
            return {
              resources: {
                ...state.resources,
                obsidian: state.resources.obsidian - cost,
                silver: state.resources.silver + 100,
              },
            };
          }
          return {};
        },
      },
      // Tool/Relic trades (2 random ones selected)
      {
        id: "trade_reinforced_rope",
        label: "Buy Reinforced Rope",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const costs = [
            { type: 'silver', amount: 50 },
            { type: 'gold', amount: 25 }
          ];
          const selectedCost = costs[Math.floor(Math.random() * costs.length)];
          const cost = Math.ceil(selectedCost.amount * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources[selectedCost.type] >= cost) {
            return {
              resources: {
                ...state.resources,
                [selectedCost.type]: state.resources[selectedCost.type] - cost,
              },
              tools: {
                ...state.tools,
                reinforced_rope: true,
              },
              _logMessage: `You purchase the reinforced rope for ${cost} ${selectedCost.type}. The merchant explains that this rope can withstand tremendous strain and reach places previously inaccessible in the deepest cave chambers.`,
            };
          }
          return {};
        },
      },
      {
        id: "trade_alchemist_map",
        label: "Buy Alchemist's Map",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const costs = [
            { type: 'silver', amount: 100 },
            { type: 'gold', amount: 50 }
          ];
          const selectedCost = costs[Math.floor(Math.random() * costs.length)];
          const cost = Math.ceil(selectedCost.amount * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources[selectedCost.type] >= cost) {
            return {
              resources: {
                ...state.resources,
                [selectedCost.type]: state.resources[selectedCost.type] - cost,
              },
              tools: {
                ...state.tools,
                alchemist_map: true,
              },
              _logMessage: `You purchase the alchemist's map for ${cost} ${selectedCost.type}. The merchant whispers: 'An old alchemist, close to death, hid his secrets and possessions within a part of the cave. He covered the entrance with rock that locks like a door. This map will guide you there.'`,
            };
          }
          return {};
        },
      },
      {
        id: "trade_murmuring_cube",
        label: "Buy Murmuring Cube",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const costs = [
            { type: 'silver', amount: 150 },
            { type: 'gold', amount: 75 }
          ];
          const selectedCost = costs[Math.floor(Math.random() * costs.length)];
          const cost = Math.ceil(selectedCost.amount * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources[selectedCost.type] >= cost) {
            return {
              resources: {
                ...state.resources,
                [selectedCost.type]: state.resources[selectedCost.type] - cost,
              },
              relics: {
                ...state.relics,
                murmuring_cube: true,
              },
              _logMessage: `You purchase the murmuring cube for ${cost} ${selectedCost.type}. The strange geometric object hums with an otherworldly energy, its purpose mysterious but its power unmistakable.`,
            };
          }
          return {};
        },
      },
      {
        id: "trade_giant_trap",
        label: "Buy Giant Trap",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const costs = [
            { type: 'silver', amount: 20 },
            { type: 'gold', amount: 10 }
          ];
          const selectedCost = costs[Math.floor(Math.random() * costs.length)];
          const cost = Math.ceil(selectedCost.amount * Math.max(0.01, 1 - knowledge * 0.01));

          if (state.resources[selectedCost.type] >= cost) {
            return {
              resources: {
                ...state.resources,
                [selectedCost.type]: state.resources[selectedCost.type] - cost,
              },
              tools: {
                ...state.tools,
                giant_trap: true,
              },
              _logMessage: `You purchase the giant trap for ${cost} ${selectedCost.type}. The merchant grins: 'This can trap something gigantic in the woods. Use it wisely - there are creatures out there that dwarf ordinary beasts.'`,
            };
          }
          return {};
        },
      },
      {
        id: "decline_trade",
        label: "Decline all trades",
        effect: (state: GameState) => {
          return {
            _logMessage: "You politely decline the merchant's offers. He shrugs and continues on his way, muttering about missed opportunities.",
          };
        },
      },
    ],
  },
};
