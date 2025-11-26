import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { getTotalKnowledge } from "./effectsCalculation";

// Resource prices in gold per unit
const PRICES = {
  food: 0.04,
  bones: 0.05,
  fur: 0.05,
  wood: 0.04,
  stone: 0.06,
  iron: 0.06,
  coal: 0.06,
  sulfur: 0.08,
  obsidian: 1,
  adamant: 1.2,
  moonstone: 2,
  leather: 0.3,
  steel: 0.4,
  torch: 0.3,
  black_powder: 0.5,
  ember_bomb: 50,
  ashfire_dust: 1,
  ashfire_bomb: 100,
  void_bomb: 150,
  silver: 0.25,
  gold: 1,
} as const;

// Round cost according to specified rules
function roundCost(cost: number): number {
  cost = cost * 1.10;
  if (cost < 100) {
    // Round down to next 5-multiple
    return Math.floor(cost / 5) * 5;
  } else if (cost < 1000) {
    // Round down to next 10-multiple
    return Math.floor(cost / 10) * 10;
  } else {
    // Round down to next 50-multiple
    return Math.floor(cost / 50) * 50;
  }
}

// Define trade configurations based on progression tiers
const buyTrades = [
  // Early tier (woodenHuts >= 4 && <= 9)
  {
    id: "buy_food_500_early",
    label: "500 Food",
    give: "food",
    giveAmount: 500,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    costs: [
      { resource: "wood", amount: 500 * PRICES.food / PRICES.wood }, // 20 gold worth
      { resource: "stone", amount: 500 * PRICES.food / PRICES.stone }, // 30 gold worth
      { resource: "silver", amount: 500 * PRICES.food / PRICES.silver }, // 80 silver
      { resource: "gold", amount: 500 * PRICES.food }, // 20 gold
    ],
  },
  {
    id: "buy_wood_500_early",
    label: "500 Wood",
    give: "wood",
    giveAmount: 500,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    costs: [
      { resource: "food", amount: 500 * PRICES.wood / PRICES.food }, // 20 gold worth
      { resource: "stone", amount: 500 * PRICES.wood / PRICES.stone }, // 30 gold worth
      { resource: "silver", amount: 500 * PRICES.wood / PRICES.silver }, // 80 silver
      { resource: "gold", amount: 500 * PRICES.wood }, // 20 gold
    ],
  },
  {
    id: "buy_leather_50_early",
    label: "50 Leather",
    give: "leather",
    giveAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    costs: [
      { resource: "wood", amount: 50 * PRICES.leather / PRICES.wood }, // 15 gold worth
      { resource: "stone", amount: 50 * PRICES.leather / PRICES.stone }, // ~250 stone
      { resource: "food", amount: 50 * PRICES.leather / PRICES.food }, // 375 food
      { resource: "steel", amount: 50 * PRICES.leather / PRICES.steel }, // ~37.5 steel
      { resource: "silver", amount: 50 * PRICES.leather / PRICES.silver }, // 60 silver
      { resource: "gold", amount: 50 * PRICES.leather }, // 15 gold
    ],
  },
  {
    id: "buy_steel_50_early",
    label: "50 Steel",
    give: "steel",
    giveAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    costs: [
      { resource: "wood", amount: 50 * PRICES.steel / PRICES.wood }, // 500 wood
      { resource: "stone", amount: 50 * PRICES.steel / PRICES.stone }, // ~333 stone
      { resource: "food", amount: 50 * PRICES.steel / PRICES.food }, // 500 food
      { resource: "leather", amount: 50 * PRICES.steel / PRICES.leather }, // ~66 leather
      { resource: "silver", amount: 50 * PRICES.steel / PRICES.silver }, // 80 silver
      { resource: "gold", amount: 50 * PRICES.steel }, // 20 gold
    ],
  },

  // Mid 1 tier (woodenHuts >= 7, stoneHuts <= 5)
  {
    id: "buy_food_1000_mid1",
    label: "1000 Food",
    give: "food",
    giveAmount: 1000,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    costs: [
      { resource: "wood", amount: 1000 * PRICES.food / PRICES.wood }, // 40 gold worth
      { resource: "stone", amount: 1000 * PRICES.food / PRICES.stone }, // 60 gold worth
      { resource: "steel", amount: 1000 * PRICES.food / PRICES.steel }, // 100 steel
      { resource: "silver", amount: 1000 * PRICES.food / PRICES.silver }, // 160 silver
      { resource: "gold", amount: 1000 * PRICES.food }, // 40 gold
    ],
  },
  {
    id: "buy_wood_1000_mid1",
    label: "1000 Wood",
    give: "wood",
    giveAmount: 1000,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    costs: [
      { resource: "food", amount: 1000 * PRICES.wood / PRICES.food }, // 40 gold worth
      { resource: "stone", amount: 1000 * PRICES.wood / PRICES.stone }, // 60 gold worth
      { resource: "steel", amount: 1000 * PRICES.wood / PRICES.steel }, // 100 steel
      { resource: "silver", amount: 1000 * PRICES.wood / PRICES.silver }, // 160 silver
      { resource: "gold", amount: 1000 * PRICES.wood }, // 40 gold
    ],
  },
  {
    id: "buy_stone_500_mid1",
    label: "500 Stone",
    give: "stone",
    giveAmount: 500,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    costs: [
      { resource: "wood", amount: 500 * PRICES.stone / PRICES.wood }, // 750 wood
      { resource: "food", amount: 500 * PRICES.stone / PRICES.food }, // 750 food
      { resource: "steel", amount: 500 * PRICES.stone / PRICES.steel }, // 75 steel
      { resource: "silver", amount: 500 * PRICES.stone / PRICES.silver }, // 120 silver
      { resource: "gold", amount: 500 * PRICES.stone }, // 30 gold
    ],
  },
  {
    id: "buy_leather_100_mid1",
    label: "100 Leather",
    give: "leather",
    giveAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    costs: [
      { resource: "wood", amount: 100 * PRICES.leather / PRICES.wood }, // 750 wood
      { resource: "stone", amount: 100 * PRICES.leather / PRICES.stone }, // 500 stone
      { resource: "food", amount: 100 * PRICES.leather / PRICES.food }, // 750 food
      { resource: "steel", amount: 100 * PRICES.leather / PRICES.steel }, // 75 steel
      { resource: "silver", amount: 100 * PRICES.leather / PRICES.silver }, // 120 silver
      { resource: "gold", amount: 100 * PRICES.leather }, // 30 gold
    ],
  },
  {
    id: "buy_steel_100_mid1",
    label: "100 Steel",
    give: "steel",
    giveAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    costs: [
      { resource: "wood", amount: 100 * PRICES.steel / PRICES.wood }, // 1000 wood
      { resource: "stone", amount: 100 * PRICES.steel / PRICES.stone }, // ~666 stone
      { resource: "food", amount: 100 * PRICES.steel / PRICES.food }, // 1000 food
      { resource: "leather", amount: 100 * PRICES.steel / PRICES.leather }, // ~133 leather
      { resource: "silver", amount: 100 * PRICES.steel / PRICES.silver }, // 160 silver
      { resource: "gold", amount: 100 * PRICES.steel }, // 40 gold
    ],
  },

  // Mid 2 tier (stoneHuts >= 3 && <= 8)
  {
    id: "buy_food_2000_mid2",
    label: "2000 Food",
    give: "food",
    giveAmount: 2000,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    costs: [
      { resource: "wood", amount: 2000 * PRICES.food / PRICES.wood }, // 80 gold worth
      { resource: "stone", amount: 2000 * PRICES.food / PRICES.stone }, // 120 gold worth
      { resource: "leather", amount: 2000 * PRICES.food / PRICES.leather }, // ~266 leather
      { resource: "steel", amount: 2000 * PRICES.food / PRICES.steel }, // 200 steel
      { resource: "silver", amount: 2000 * PRICES.food / PRICES.silver }, // 320 silver
      { resource: "gold", amount: 2000 * PRICES.food }, // 80 gold
    ],
  },
  {
    id: "buy_wood_2000_mid2",
    label: "2000 Wood",
    give: "wood",
    giveAmount: 2000,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    costs: [
      { resource: "food", amount: 2000 * PRICES.wood / PRICES.food }, // 80 gold worth
      { resource: "stone", amount: 2000 * PRICES.wood / PRICES.stone }, // 120 gold worth
      { resource: "leather", amount: 2000 * PRICES.wood / PRICES.leather }, // ~266 leather
      { resource: "steel", amount: 2000 * PRICES.wood / PRICES.steel }, // 200 steel
      { resource: "silver", amount: 2000 * PRICES.wood / PRICES.silver }, // 320 silver
      { resource: "gold", amount: 2000 * PRICES.wood }, // 80 gold
    ],
  },
  {
    id: "buy_stone_1000_mid2",
    label: "1000 Stone",
    give: "stone",
    giveAmount: 1000,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    costs: [
      { resource: "wood", amount: 1000 * PRICES.stone / PRICES.wood }, // 1500 wood
      { resource: "food", amount: 1000 * PRICES.stone / PRICES.food }, // 1500 food
      { resource: "leather", amount: 1000 * PRICES.stone / PRICES.leather }, // 200 leather
      { resource: "steel", amount: 1000 * PRICES.stone / PRICES.steel }, // 150 steel
      { resource: "silver", amount: 1000 * PRICES.stone / PRICES.silver }, // 240 silver
      { resource: "gold", amount: 1000 * PRICES.stone }, // 60 gold
    ],
  },
  {
    id: "buy_leather_100_mid2",
    label: "100 Leather",
    give: "leather",
    giveAmount: 100,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    costs: [
      { resource: "wood", amount: 100 * PRICES.leather / PRICES.wood }, // 750 wood
      { resource: "stone", amount: 100 * PRICES.leather / PRICES.stone }, // 500 stone
      { resource: "food", amount: 100 * PRICES.leather / PRICES.food }, // 750 food
      { resource: "steel", amount: 100 * PRICES.leather / PRICES.steel }, // 75 steel
      { resource: "silver", amount: 100 * PRICES.leather / PRICES.silver }, // 120 silver
      { resource: "gold", amount: 100 * PRICES.leather }, // 30 gold
    ],
  },
  {
    id: "buy_steel_250_mid2",
    label: "250 Steel",
    give: "steel",
    giveAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    costs: [
      { resource: "wood", amount: 250 * PRICES.steel / PRICES.wood }, // 2500 wood
      { resource: "stone", amount: 250 * PRICES.steel / PRICES.stone }, // ~1666 stone
      { resource: "food", amount: 250 * PRICES.steel / PRICES.food }, // 2500 food
      { resource: "leather", amount: 250 * PRICES.steel / PRICES.leather }, // ~333 leather
      { resource: "silver", amount: 250 * PRICES.steel / PRICES.silver }, // 400 silver
      { resource: "gold", amount: 250 * PRICES.steel }, // 100 gold
    ],
  },

  // End tier (stoneHuts >= 7)
  {
    id: "buy_food_2000_end",
    label: "2000 Food",
    give: "food",
    giveAmount: 2000,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    costs: [
      { resource: "wood", amount: 2000 * PRICES.food / PRICES.wood }, // 80 gold worth
      { resource: "stone", amount: 2000 * PRICES.food / PRICES.stone }, // 120 gold worth
      { resource: "leather", amount: 2000 * PRICES.food / PRICES.leather }, // ~266 leather
      { resource: "steel", amount: 2000 * PRICES.food / PRICES.steel }, // 200 steel
      { resource: "silver", amount: 2000 * PRICES.food / PRICES.silver }, // 320 silver
      { resource: "gold", amount: 2000 * PRICES.food }, // 80 gold
    ],
  },
  {
    id: "buy_stone_2500_end",
    label: "2500 Stone",
    give: "stone",
    giveAmount: 2500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    costs: [
      { resource: "wood", amount: 2500 * PRICES.stone / PRICES.wood }, // 3750 wood
      { resource: "food", amount: 2500 * PRICES.stone / PRICES.food }, // 3750 food
      { resource: "leather", amount: 2500 * PRICES.stone / PRICES.leather }, // 500 leather
      { resource: "steel", amount: 2500 * PRICES.stone / PRICES.steel }, // 375 steel
      { resource: "silver", amount: 2500 * PRICES.stone / PRICES.silver }, // 600 silver
      { resource: "gold", amount: 2500 * PRICES.stone }, // 150 gold
    ],
  },
  {
    id: "buy_steel_500_end",
    label: "500 Steel",
    give: "steel",
    giveAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    costs: [
      { resource: "wood", amount: 500 * PRICES.steel / PRICES.wood }, // 5000 wood
      { resource: "stone", amount: 500 * PRICES.steel / PRICES.stone }, // ~3333 stone
      { resource: "food", amount: 500 * PRICES.steel / PRICES.food }, // 5000 food
      { resource: "leather", amount: 500 * PRICES.steel / PRICES.leather }, // ~666 leather
      { resource: "silver", amount: 500 * PRICES.steel / PRICES.silver }, // 800 silver
      { resource: "gold", amount: 500 * PRICES.steel }, // 200 gold
    ],
  },
];

const sellTrades = [
  // Early tier (woodenHuts >= 4 && <= 9)
  {
    id: "sell_food_100_early",
    label: "Sell 100 Food",
    take: "food",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "wood", amount: Math.round(100 * PRICES.food / PRICES.wood) }, // 100 wood
      { resource: "stone", amount: Math.round(100 * PRICES.food / PRICES.stone) }, // ~66 stone
      { resource: "leather", amount: Math.round(100 * PRICES.food / PRICES.leather) }, // ~13 leather
      { resource: "steel", amount: Math.round(100 * PRICES.food / PRICES.steel) }, // 10 steel
      { resource: "silver", amount: Math.round(100 * PRICES.food / PRICES.silver * 4) }, // 16 silver
      { resource: "gold", amount: Math.round(100 * PRICES.food) }, // 4 gold
    ],
  },
  {
    id: "sell_bones_50_early",
    label: "Sell 50 Bones",
    take: "bones",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "wood", amount: Math.round(50 * PRICES.bones / PRICES.wood) }, // ~62 wood
      { resource: "stone", amount: Math.round(50 * PRICES.bones / PRICES.stone) }, // ~41 stone
      { resource: "food", amount: Math.round(50 * PRICES.bones / PRICES.food) }, // ~62 food
      { resource: "leather", amount: Math.round(50 * PRICES.bones / PRICES.leather) }, // ~8 leather
      { resource: "steel", amount: Math.round(50 * PRICES.bones / PRICES.steel) }, // ~6 steel
      { resource: "silver", amount: Math.round(50 * PRICES.bones / PRICES.silver * 4) }, // 10 silver
      { resource: "gold", amount: Math.round(50 * PRICES.bones) }, // ~2 gold
    ],
  },
  {
    id: "sell_fur_50_early",
    label: "Sell 50 Fur",
    take: "fur",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "wood", amount: Math.round(50 * PRICES.fur / PRICES.wood) }, // ~62 wood
      { resource: "stone", amount: Math.round(50 * PRICES.fur / PRICES.stone) }, // ~41 stone
      { resource: "food", amount: Math.round(50 * PRICES.fur / PRICES.food) }, // ~62 food
      { resource: "leather", amount: Math.round(50 * PRICES.fur / PRICES.leather) }, // ~8 leather
      { resource: "steel", amount: Math.round(50 * PRICES.fur / PRICES.steel) }, // ~6 steel
      { resource: "silver", amount: Math.round(50 * PRICES.fur / PRICES.silver * 4) }, // 10 silver
      { resource: "gold", amount: Math.round(50 * PRICES.fur) }, // ~2 gold
    ],
  },
  {
    id: "sell_wood_100_early",
    label: "Sell 100 Wood",
    take: "wood",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "food", amount: Math.round(100 * PRICES.wood / PRICES.food) }, // 100 food
      { resource: "stone", amount: Math.round(100 * PRICES.wood / PRICES.stone) }, // ~66 stone
      { resource: "leather", amount: Math.round(100 * PRICES.wood / PRICES.leather) }, // ~13 leather
      { resource: "steel", amount: Math.round(100 * PRICES.wood / PRICES.steel) }, // 10 steel
      { resource: "silver", amount: Math.round(100 * PRICES.wood / PRICES.silver * 4) }, // 16 silver
      { resource: "gold", amount: Math.round(100 * PRICES.wood) }, // 4 gold
    ],
  },
  {
    id: "sell_stone_100_early",
    label: "Sell 100 Stone",
    take: "stone",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "wood", amount: Math.round(100 * PRICES.stone / PRICES.wood) }, // 150 wood
      { resource: "food", amount: Math.round(100 * PRICES.stone / PRICES.food) }, // 150 food
      { resource: "leather", amount: Math.round(100 * PRICES.stone / PRICES.leather) }, // 20 leather
      { resource: "steel", amount: Math.round(100 * PRICES.stone / PRICES.steel) }, // 15 steel
      { resource: "silver", amount: Math.round(100 * PRICES.stone / PRICES.silver * 4) }, // 24 silver
      { resource: "gold", amount: Math.round(100 * PRICES.stone) }, // 6 gold
    ],
  },
  {
    id: "sell_iron_50_early",
    label: "Sell 50 Iron",
    take: "iron",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "wood", amount: Math.round(50 * PRICES.iron / PRICES.wood) }, // 75 wood
      { resource: "stone", amount: Math.round(50 * PRICES.iron / PRICES.stone) }, // 50 stone
      { resource: "food", amount: Math.round(50 * PRICES.iron / PRICES.food) }, // 75 food
      { resource: "leather", amount: Math.round(50 * PRICES.iron / PRICES.leather) }, // 10 leather
      { resource: "steel", amount: Math.round(50 * PRICES.iron / PRICES.steel) }, // ~7 steel
      { resource: "silver", amount: Math.round(50 * PRICES.iron / PRICES.silver * 4) }, // 12 silver
      { resource: "gold", amount: Math.round(50 * PRICES.iron) }, // 3 gold
    ],
  },

  // Mid 1 tier (woodenHuts >= 7, stoneHuts <= 5)
  {
    id: "sell_food_250_mid1",
    label: "Sell 250 Food",
    take: "food",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(250 * PRICES.food / PRICES.wood) }, // 250 wood
      { resource: "stone", amount: Math.round(250 * PRICES.food / PRICES.stone) }, // ~166 stone
      { resource: "leather", amount: Math.round(250 * PRICES.food / PRICES.leather) }, // ~33 leather
      { resource: "steel", amount: Math.round(250 * PRICES.food / PRICES.steel) }, // 25 steel
      { resource: "silver", amount: Math.round(250 * PRICES.food / PRICES.silver * 4) }, // 40 silver
      { resource: "gold", amount: Math.round(250 * PRICES.food) }, // 10 gold
    ],
  },
  {
    id: "sell_bones_100_mid1",
    label: "Sell 100 Bones",
    take: "bones",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(100 * PRICES.bones / PRICES.wood) }, // 125 wood
      { resource: "stone", amount: Math.round(100 * PRICES.bones / PRICES.stone) }, // ~83 stone
      { resource: "food", amount: Math.round(100 * PRICES.bones / PRICES.food) }, // 125 food
      { resource: "leather", amount: Math.round(100 * PRICES.bones / PRICES.leather) }, // ~16 leather
      { resource: "steel", amount: Math.round(100 * PRICES.bones / PRICES.steel) }, // ~12 steel
      { resource: "silver", amount: Math.round(100 * PRICES.bones / PRICES.silver * 4) }, // 20 silver
      { resource: "gold", amount: Math.round(100 * PRICES.bones) }, // 5 gold
    ],
  },
  {
    id: "sell_fur_100_mid1",
    label: "Sell 100 Fur",
    take: "fur",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(100 * PRICES.fur / PRICES.wood) }, // 125 wood
      { resource: "stone", amount: Math.round(100 * PRICES.fur / PRICES.stone) }, // ~83 stone
      { resource: "food", amount: Math.round(100 * PRICES.fur / PRICES.food) }, // 125 food
      { resource: "leather", amount: Math.round(100 * PRICES.fur / PRICES.leather) }, // ~16 leather
      { resource: "steel", amount: Math.round(100 * PRICES.fur / PRICES.steel) }, // ~12 steel
      { resource: "silver", amount: Math.round(100 * PRICES.fur / PRICES.silver * 4) }, // 20 silver
      { resource: "gold", amount: Math.round(100 * PRICES.fur) }, // 5 gold
    ],
  },
  {
    id: "sell_wood_250_mid1",
    label: "Sell 250 Wood",
    take: "wood",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "food", amount: Math.round(250 * PRICES.wood / PRICES.food) }, // 250 food
      { resource: "stone", amount: Math.round(250 * PRICES.wood / PRICES.stone) }, // ~166 stone
      { resource: "leather", amount: Math.round(250 * PRICES.wood / PRICES.leather) }, // ~33 leather
      { resource: "steel", amount: Math.round(250 * PRICES.wood / PRICES.steel) }, // 25 steel
      { resource: "silver", amount: Math.round(250 * PRICES.wood / PRICES.silver * 4) }, // 40 silver
      { resource: "gold", amount: Math.round(250 * PRICES.wood) }, // 10 gold
    ],
  },
  {
    id: "sell_stone_250_mid1",
    label: "Sell 250 Stone",
    take: "stone",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(250 * PRICES.stone / PRICES.wood) }, // 375 wood
      { resource: "food", amount: Math.round(250 * PRICES.stone / PRICES.food) }, // 375 food
      { resource: "leather", amount: Math.round(250 * PRICES.stone / PRICES.leather) }, // 50 leather
      { resource: "steel", amount: Math.round(250 * PRICES.stone / PRICES.steel) }, // ~37 steel
      { resource: "silver", amount: Math.round(250 * PRICES.stone / PRICES.silver * 4) }, // 60 silver
      { resource: "gold", amount: Math.round(250 * PRICES.stone) }, // 15 gold
    ],
  },
  {
    id: "sell_iron_250_mid1",
    label: "Sell 250 Iron",
    take: "iron",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(250 * PRICES.iron / PRICES.wood) }, // 375 wood
      { resource: "stone", amount: Math.round(250 * PRICES.iron / PRICES.stone) }, // 250 stone
      { resource: "food", amount: Math.round(250 * PRICES.iron / PRICES.food) }, // 375 food
      { resource: "leather", amount: Math.round(250 * PRICES.iron / PRICES.leather) }, // 50 leather
      { resource: "steel", amount: Math.round(250 * PRICES.iron / PRICES.steel) }, // ~37 steel
      { resource: "silver", amount: Math.round(250 * PRICES.iron / PRICES.silver * 4) }, // 60 silver
      { resource: "gold", amount: Math.round(250 * PRICES.iron) }, // 15 gold
    ],
  },
  {
    id: "sell_coal_250_mid1",
    label: "Sell 250 Coal",
    take: "coal",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(250 * PRICES.coal / PRICES.wood) }, // 375 wood
      { resource: "stone", amount: Math.round(250 * PRICES.coal / PRICES.stone) }, // 250 stone
      { resource: "food", amount: Math.round(250 * PRICES.coal / PRICES.food) }, // 375 food
      { resource: "leather", amount: Math.round(250 * PRICES.coal / PRICES.leather) }, // 50 leather
      { resource: "steel", amount: Math.round(250 * PRICES.coal / PRICES.steel) }, // ~37 steel
      { resource: "silver", amount: Math.round(250 * PRICES.coal / PRICES.silver * 4) }, // 60 silver
      { resource: "gold", amount: Math.round(250 * PRICES.coal) }, // 15 gold
    ],
  },
  {
    id: "sell_sulfur_250_mid1",
    label: "Sell 250 Sulfur",
    take: "sulfur",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(250 * PRICES.sulfur / PRICES.wood) }, // 500 wood
      { resource: "stone", amount: Math.round(250 * PRICES.sulfur / PRICES.stone) }, // ~333 stone
      { resource: "food", amount: Math.round(250 * PRICES.sulfur / PRICES.food) }, // 500 food
      { resource: "leather", amount: Math.round(250 * PRICES.sulfur / PRICES.leather) }, // ~66 leather
      { resource: "steel", amount: Math.round(250 * PRICES.sulfur / PRICES.steel) }, // 50 steel
      { resource: "silver", amount: Math.round(250 * PRICES.sulfur / PRICES.silver * 4) }, // 80 silver
      { resource: "gold", amount: Math.round(250 * PRICES.sulfur) }, // 20 gold
    ],
  },
  {
    id: "sell_leather_50_mid1",
    label: "Sell 50 Leather",
    take: "leather",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(50 * PRICES.leather / PRICES.wood) }, // 375 wood
      { resource: "stone", amount: Math.round(50 * PRICES.leather / PRICES.stone) }, // 250 stone
      { resource: "food", amount: Math.round(50 * PRICES.leather / PRICES.food) }, // 375 food
      { resource: "steel", amount: Math.round(50 * PRICES.leather / PRICES.steel) }, // ~37 steel
      { resource: "silver", amount: Math.round(50 * PRICES.leather / PRICES.silver * 4) }, // 60 silver
      { resource: "gold", amount: Math.round(50 * PRICES.leather) }, // 15 gold
    ],
  },
  {
    id: "sell_steel_100_mid1",
    label: "Sell 100 Steel",
    take: "steel",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(100 * PRICES.steel / PRICES.wood) }, // 1000 wood
      { resource: "stone", amount: Math.round(100 * PRICES.steel / PRICES.stone) }, // ~666 stone
      { resource: "food", amount: Math.round(100 * PRICES.steel / PRICES.food) }, // 1000 food
      { resource: "leather", amount: Math.round(100 * PRICES.steel / PRICES.leather) }, // ~133 leather
      { resource: "silver", amount: Math.round(100 * PRICES.steel / PRICES.silver * 4) }, // 160 silver
      { resource: "gold", amount: Math.round(100 * PRICES.steel) }, // 40 gold
    ],
  },

  // Mid 2 tier (stoneHuts >= 3 && <= 8)
  {
    id: "sell_food_500_mid2",
    label: "Sell 500 Food",
    take: "food",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.food / PRICES.silver * 4) }, // 80 silver
      { resource: "gold", amount: Math.round(500 * PRICES.food) }, // 20 gold
    ],
  },
  {
    id: "sell_bones_250_mid2",
    label: "Sell 250 Bones",
    take: "bones",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(250 * PRICES.bones / PRICES.silver * 4) }, // 50 silver
      { resource: "gold", amount: Math.round(250 * PRICES.bones) }, // ~12 gold
    ],
  },
  {
    id: "sell_fur_250_mid2",
    label: "Sell 250 Fur",
    take: "fur",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(250 * PRICES.fur / PRICES.silver * 4) }, // 50 silver
      { resource: "gold", amount: Math.round(250 * PRICES.fur) }, // ~12 gold
    ],
  },
  {
    id: "sell_wood_500_mid2",
    label: "Sell 500 Wood",
    take: "wood",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.wood / PRICES.silver * 4) }, // 80 silver
      { resource: "gold", amount: Math.round(500 * PRICES.wood) }, // 20 gold
    ],
  },
  {
    id: "sell_stone_500_mid2",
    label: "Sell 500 Stone",
    take: "stone",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.stone / PRICES.silver * 4) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * PRICES.stone) }, // 30 gold
    ],
  },
  {
    id: "sell_iron_500_mid2",
    label: "Sell 500 Iron",
    take: "iron",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.iron / PRICES.silver * 4) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * PRICES.iron) }, // 30 gold
    ],
  },
  {
    id: "sell_coal_500_mid2",
    label: "Sell 500 Coal",
    take: "coal",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.coal / PRICES.silver * 4) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * PRICES.coal) }, // 30 gold
    ],
  },
  {
    id: "sell_sulfur_500_mid2",
    label: "Sell 500 Sulfur",
    take: "sulfur",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.sulfur / PRICES.silver * 4) }, // 160 silver
      { resource: "gold", amount: Math.round(500 * PRICES.sulfur) }, // 40 gold
    ],
  },
  {
    id: "sell_obsidian_50_mid2",
    label: "Sell 50 Obsidian",
    take: "obsidian",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(50 * PRICES.obsidian / PRICES.silver * 4) }, // 200 silver
      { resource: "gold", amount: Math.round(50 * PRICES.obsidian) }, // 50 gold
    ],
  },
  {
    id: "sell_adamant_50_mid2",
    label: "Sell 50 Adamant",
    take: "adamant",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(50 * PRICES.adamant / PRICES.silver * 4) }, // 240 silver
      { resource: "gold", amount: Math.round(50 * PRICES.adamant) }, // 60 gold
    ],
  },
  {
    id: "sell_moonstone_50_mid2",
    label: "Sell 50 Moonstone",
    take: "moonstone",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(50 * PRICES.moonstone / PRICES.silver * 4) }, // 400 silver
      { resource: "gold", amount: Math.round(50 * PRICES.moonstone) }, // 100 gold
    ],
  },
  {
    id: "sell_leather_100_mid2",
    label: "Sell 100 Leather",
    take: "leather",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(100 * PRICES.leather / PRICES.silver * 4) }, // 120 silver
      { resource: "gold", amount: Math.round(100 * PRICES.leather) }, // 30 gold
    ],
  },
  {
    id: "sell_steel_250_mid2",
    label: "Sell 250 Steel",
    take: "steel",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(250 * PRICES.steel / PRICES.silver * 4) }, // 400 silver
      { resource: "gold", amount: Math.round(250 * PRICES.steel) }, // 100 gold
    ],
  },

  // End tier (stoneHuts >= 7)
  {
    id: "sell_food_500_end",
    label: "Sell 500 Food",
    take: "food",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.food / PRICES.silver * 4) }, // 80 silver
      { resource: "gold", amount: Math.round(500 * PRICES.food) }, // 20 gold
    ],
  },
  {
    id: "sell_bones_250_end",
    label: "Sell 250 Bones",
    take: "bones",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(250 * PRICES.bones / PRICES.silver * 4) }, // 50 silver
      { resource: "gold", amount: Math.round(250 * PRICES.bones) }, // ~12 gold
    ],
  },
  {
    id: "sell_fur_250_end",
    label: "Sell 250 Fur",
    take: "fur",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(250 * PRICES.fur / PRICES.silver * 4) }, // 50 silver
      { resource: "gold", amount: Math.round(250 * PRICES.fur) }, // ~12 gold
    ],
  },
  {
    id: "sell_wood_500_end",
    label: "Sell 500 Wood",
    take: "wood",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.wood / PRICES.silver * 4) }, // 80 silver
      { resource: "gold", amount: Math.round(500 * PRICES.wood) }, // 20 gold
    ],
  },
  {
    id: "sell_stone_500_end",
    label: "Sell 500 Stone",
    take: "stone",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.stone / PRICES.silver * 4) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * PRICES.stone) }, // 30 gold
    ],
  },
  {
    id: "sell_iron_500_end",
    label: "Sell 500 Iron",
    take: "iron",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.iron / PRICES.silver * 4) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * PRICES.iron) }, // 30 gold
    ],
  },
  {
    id: "sell_coal_500_end",
    label: "Sell 500 Coal",
    take: "coal",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.coal / PRICES.silver * 4) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * PRICES.coal) }, // 30 gold
    ],
  },
  {
    id: "sell_sulfur_500_end",
    label: "Sell 500 Sulfur",
    take: "sulfur",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * PRICES.sulfur / PRICES.silver * 4) }, // 160 silver
      { resource: "gold", amount: Math.round(500 * PRICES.sulfur) }, // 40 gold
    ],
  },
  {
    id: "sell_obsidian_100_end",
    label: "Sell 100 Obsidian",
    take: "obsidian",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(100 * PRICES.obsidian / PRICES.silver * 4) }, // 400 silver
      { resource: "gold", amount: Math.round(100 * PRICES.obsidian) }, // 100 gold
    ],
  },
  {
    id: "sell_adamant_100_end",
    label: "Sell 100 Adamant",
    take: "adamant",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(100 * PRICES.adamant / PRICES.silver * 4) }, // 480 silver
      { resource: "gold", amount: Math.round(100 * PRICES.adamant) }, // 120 gold
    ],
  },
  {
    id: "sell_moonstone_100_end",
    label: "Sell 100 Moonstone",
    take: "moonstone",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(100 * PRICES.moonstone / PRICES.silver * 4) }, // 800 silver
      { resource: "gold", amount: Math.round(100 * PRICES.moonstone) }, // 200 gold
    ],
  },
  {
    id: "sell_leather_250_end",
    label: "Sell 250 Leather",
    take: "leather",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(250 * PRICES.leather / PRICES.silver * 4) }, // 300 silver
      { resource: "gold", amount: Math.round(250 * PRICES.leather) }, // 75 gold
    ],
  },
  {
    id: "sell_steel_250_end",
    label: "Sell 250 Steel",
    take: "steel",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(250 * PRICES.steel / PRICES.silver * 4) }, // 400 silver
      { resource: "gold", amount: Math.round(250 * PRICES.steel) }, // 100 gold
    ],
  },
];

const toolTrades = [
  {
    id: "trade_reinforced_rope",
    label: "Reinforced Rope",
    give: "tool",
    giveItem: "reinforced_rope",
    condition: (state: GameState) => state.buildings.woodenHut >= 4,
    costs: [{ resource: "gold", amounts: [150] }],
    message:
      "You purchase the reinforced rope. This rope can withstand tremendous strain and reach places in the deepest cave chambers.",
  },
  {
    id: "trade_occultist_map",
    label: "Occultists's Map",
    give: "tool",
    giveItem: "occultist_map",
    condition: (state: GameState) => state.buildings.woodenHut >= 5,
    costs: [{ resource: "gold", amounts: [200] }],
    message:
      "As you buy the occultists's map the merchant whispers: 'An old occultist hid his secrets in a chamber deep in the cave. This map will guide you.'",
  },
  {
    id: "trade_giant_trap",
    label: "Giant Trap",
    give: "tool",
    giveItem: "giant_trap",
    condition: (state: GameState) => state.buildings.woodenHut >= 6,
    costs: [{ resource: "gold", amounts: [250] }],
    message:
      "As you purchase the giant trap, the merchant grins: 'This can trap something gigantic in the woods. Use it wisely.'",
  },
  {
    id: "trade_arbalest_schematic",
    label: "Arbalest Schematic",
    give: "schematic",
    giveItem: "arbalest_schematic",
    condition: (state: GameState) => state.buildings.woodenHut >= 7,
    costs: [{ resource: "gold", amounts: [500] }],
    message:
      "You purchase the arbalest schematic. The merchant unfurls an intricate blueprint: 'A design from a master engineer. With this, you can craft a powerful weapon.'",
  },
  {
    id: "trade_compound_bow",
    label: "Compound Bow",
    give: "weapon",
    giveItem: "compound_bow",
    condition: (state: GameState) => state.buildings.stoneHut >= 2,
    costs: [{ resource: "gold", amounts: [1500] }],
    message:
      "You purchase the compound bow. The merchant nods approvingly: 'High precision weapon from the vanished civilization. It will serve you well.'",
  },
  {
    id: "trade_natharit_pickaxe",
    label: "Natharit Pickaxe",
    give: "tool",
    giveItem: "natharit_pickaxe",
    condition: (state: GameState) => state.buildings.stoneHut >= 4,
    costs: [{ resource: "gold", amounts: [2000] }],
    message:
      "You purchase the natharit pickaxe. The merchant hands you the sturdy tool: 'Extremely durable pickaxe of unknown material. Its quality is exceptional.'",
  },
  {
    id: "trade_nightshade_bow_schematic",
    label: "Nightshade Bow Schematic",
    give: "schematic",
    giveItem: "nightshade_bow_schematic",
    condition: (state: GameState) => state.buildings.stoneHut >= 6,
    costs: [{ resource: "gold", amounts: [1000] }],
    message:
      "You purchase the nightshade bow schematic. The merchant grins darkly: 'This bow's design is cruel. Its arrows will poison your enemies.'",
  },
  {
    id: "trade_book_of_war",
    label: "Book of War",
    give: "book",
    giveItem: "book_of_war",
    condition: (state: GameState) =>
      state.story.seen.firstWolfAttack &&
      state.buildings.scriptorium >= 1 &&
      state.buildings.darkEstate >= 1 &&
      !state.books.book_of_war,
    costs: [{ resource: "gold", amounts: [500] }],
    message:
      "You purchase the Book of War. The merchant nods gravely: 'Military knowledge from a long gone kingdom in the far east. With this, you will better understand the outcomes of your choices.'",
  },
];

// Function to generate fresh merchant choices
export function generateMerchantChoices(state: GameState): EventChoice[] {
  console.log('[MERCHANT] Generating merchant choices', {
    woodenHuts: state.buildings.woodenHut,
    stoneHuts: state.buildings.stoneHut,
  });

  const knowledge = getTotalKnowledge(state);

  // Calculate stepped discount: 5% per 10 knowledge, max 25%
  let discount = 0;
  if (knowledge >= 10) discount = 0.05;
  if (knowledge >= 20) discount = 0.1;
  if (knowledge >= 30) discount = 0.15;
  if (knowledge >= 40) discount = 0.2;
  if (knowledge >= 50) discount = 0.25;

  console.log('[MERCHANT] Total buy trades:', buyTrades.length);

  // Check which buy trades pass the condition
  const filteredBuyTrades = buyTrades.filter((trade) => {
    const passes = trade.condition(state);
    console.log('[MERCHANT] Buy trade', trade.id, 'condition:', passes);
    return passes;
  });

  console.log('[MERCHANT] Filtered buy trades:', filteredBuyTrades.length);

  // Select 3 buy trades
  const availableBuyTrades = filteredBuyTrades
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((trade) => {
      // Filter out cost options that are the same as the resource being bought
      const validCosts = trade.costs.filter(c => c.resource !== trade.give);
      const costOption = validCosts[Math.floor(Math.random() * validCosts.length)];
      const rawCost = Math.ceil(costOption.amount * (1 - discount));
      const cost = roundCost(rawCost);

      console.log('[MERCHANT] Created buy trade:', {
        id: trade.id,
        label: trade.label,
        cost: `${cost} ${costOption.resource}`,
      });

      return {
        id: trade.id,
        label: `Buy ${trade.label}`,
        cost: `${cost} ${costOption.resource}`,
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

  console.log('[MERCHANT] Total sell trades:', sellTrades.length);

  // Check which sell trades pass the condition
  const filteredSellTrades = sellTrades.filter((trade) => {
    const passes = trade.condition(state);
    console.log('[MERCHANT] Sell trade', trade.id, 'condition:', passes);
    return passes;
  });

  console.log('[MERCHANT] Filtered sell trades:', filteredSellTrades.length);

  // Select 3 sell trades
  const availableSellTrades = filteredSellTrades
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((trade) => {
      // Filter out reward options that are the same as the resource being sold
      const validRewards = trade.rewards.filter(r => r.resource !== trade.take);
      const rewardOption = validRewards[Math.floor(Math.random() * validRewards.length)];
      const rawReward = Math.ceil(rewardOption.amount * (1 + discount));
      const reward = roundCost(rawReward);

      // Format take resource name for display
      const takeResourceName = trade.take
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      console.log('[MERCHANT] Created sell trade:', {
        id: trade.id,
        label: trade.label,
        take: trade.take,
        rewardResource: rewardOption.resource,
        cost: `${trade.takeAmount} ${trade.take}`,
      });

      return {
        id: trade.id,
        label: `Sell ${trade.takeAmount} ${takeResourceName}`,
        cost: `${reward} ${rewardOption.resource}`,
        effect: (state: GameState) => {
          if ((state.resources[trade.take] || 0) >= trade.takeAmount) {
            return {
              resources: {
                ...state.resources,
                [trade.take]: (state.resources[trade.take] || 0) - trade.takeAmount,
                [rewardOption.resource]: (state.resources[rewardOption.resource] || 0) + reward,
              },
            };
          }
          return {};
        },
      };
    });

  console.log('[MERCHANT] Total tool trades:', toolTrades.length);

  // Check which tool trades pass filters
  const filteredToolTrades = toolTrades.filter((trade) => {
    const conditionPasses = trade.condition(state);
    const alreadyOwned = 
      (trade.give === "tool" && state.tools[trade.giveItem as keyof typeof state.tools]) ||
      (trade.give === "weapon" && state.weapons[trade.giveItem as keyof typeof state.weapons]) ||
      (trade.give === "schematic" && state.schematics[trade.giveItem as keyof typeof state.schematics]) ||
      (trade.give === "book" && state.books[trade.giveItem as keyof typeof state.books]);

    console.log('[MERCHANT] Tool trade', trade.id, {
      conditionPasses,
      alreadyOwned,
      passes: conditionPasses && !alreadyOwned,
    });

    return conditionPasses && !alreadyOwned;
  });

  console.log('[MERCHANT] Filtered tool trades:', filteredToolTrades.length);

  // Select 1 tool trade
  const availableToolTrades = filteredToolTrades
    .sort(() => Math.random() - 0.5)
    .slice(0, 1)
    .map((trade) => {
      const costOption = trade.costs[0];
      const rawCost = Math.ceil(costOption.amounts[0] * (1 - discount));
      const cost = roundCost(rawCost);

      console.log('[MERCHANT] Created tool trade:', {
        id: trade.id,
        label: trade.label,
        cost: `${cost} ${costOption.resource}`,
      });

      return {
        id: trade.id,
        label: `Buy ${trade.label}`,
        cost: `${cost} ${costOption.resource}`,
        effect: (state: GameState) => {
          if ((state.resources[costOption.resource] || 0) >= cost) {
            const result: any = {
              resources: {
                ...state.resources,
                [costOption.resource]: (state.resources[costOption.resource] || 0) - cost,
              },
              _logMessage: trade.message,
            };

            if (trade.give === "tool") {
              result.tools = { ...state.tools, [trade.giveItem]: true };
            } else if (trade.give === "weapon") {
              result.weapons = { ...state.weapons, [trade.giveItem]: true };
            } else if (trade.give === "schematic") {
              result.schematics = { ...state.schematics, [trade.giveItem]: true };
            } else if (trade.give === "book") {
              result.books = { ...state.books, [trade.giveItem]: true };
            }

            return result;
          }
          return {};
        },
      };
    });

  const finalChoices = [
    ...availableBuyTrades,
    ...availableSellTrades,
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

  console.log('[MERCHANT] Final choices generated:', finalChoices.length, finalChoices.map(c => ({ id: c.id, label: c.label })));

  return finalChoices;
}

export const merchantEvents: Record<string, GameEvent> = {
  merchant: {
    id: "merchant",
    condition: (state: GameState) => state.buildings.woodenHut >= 4,
    triggerType: "resource",
    timeProbability: 0.10,
    title: "The Traveling Merchant",
    message:
      "A weathered merchant arrives, his cart overflowing with wares. His eyes glint with avarice as he murmurs 'I have rare items for sale'.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [],
  },
};