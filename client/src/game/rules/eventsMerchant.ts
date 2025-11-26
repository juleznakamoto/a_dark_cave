
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { getTotalKnowledge } from "./effectsCalculation";

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
      { resource: "wood", amount: 500 * 0.04 }, // 20 gold worth
      { resource: "stone", amount: 500 * 0.06 }, // 30 gold worth
      { resource: "silver", amount: 500 * 0.16 }, // 80 silver
      { resource: "gold", amount: 500 * 0.04 }, // 20 gold
    ],
  },
  {
    id: "buy_wood_500_early",
    label: "500 Wood",
    give: "wood",
    giveAmount: 500,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    costs: [
      { resource: "food", amount: 500 * 0.04 }, // 20 gold worth
      { resource: "stone", amount: 500 * 0.06 }, // 30 gold worth
      { resource: "silver", amount: 500 * 0.16 }, // 80 silver
      { resource: "gold", amount: 500 * 0.04 }, // 20 gold
    ],
  },
  {
    id: "buy_leather_50_early",
    label: "50 Leather",
    give: "leather",
    giveAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    costs: [
      { resource: "wood", amount: 50 * 0.3 }, // 15 gold worth
      { resource: "stone", amount: 50 * 0.3 / 0.06 }, // ~250 stone
      { resource: "food", amount: 50 * 0.3 / 0.04 }, // 375 food
      { resource: "steel", amount: 50 * 0.3 / 0.4 }, // ~37.5 steel
      { resource: "silver", amount: 50 * 1.2 }, // 60 silver
      { resource: "gold", amount: 50 * 0.3 }, // 15 gold
    ],
  },
  {
    id: "buy_steel_50_early",
    label: "50 Steel",
    give: "steel",
    giveAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    costs: [
      { resource: "wood", amount: 50 * 0.4 / 0.04 }, // 500 wood
      { resource: "stone", amount: 50 * 0.4 / 0.06 }, // ~333 stone
      { resource: "food", amount: 50 * 0.4 / 0.04 }, // 500 food
      { resource: "leather", amount: 50 * 0.4 / 0.3 }, // ~66 leather
      { resource: "silver", amount: 50 * 1.6 }, // 80 silver
      { resource: "gold", amount: 50 * 0.4 }, // 20 gold
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
      { resource: "wood", amount: 1000 * 0.04 }, // 40 gold worth
      { resource: "stone", amount: 1000 * 0.06 }, // 60 gold worth
      { resource: "steel", amount: 1000 * 0.04 / 0.4 }, // 100 steel
      { resource: "silver", amount: 1000 * 0.16 }, // 160 silver
      { resource: "gold", amount: 1000 * 0.04 }, // 40 gold
    ],
  },
  {
    id: "buy_wood_1000_mid1",
    label: "1000 Wood",
    give: "wood",
    giveAmount: 1000,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    costs: [
      { resource: "food", amount: 1000 * 0.04 }, // 40 gold worth
      { resource: "stone", amount: 1000 * 0.06 }, // 60 gold worth
      { resource: "steel", amount: 1000 * 0.04 / 0.4 }, // 100 steel
      { resource: "silver", amount: 1000 * 0.16 }, // 160 silver
      { resource: "gold", amount: 1000 * 0.04 }, // 40 gold
    ],
  },
  {
    id: "buy_stone_500_mid1",
    label: "500 Stone",
    give: "stone",
    giveAmount: 500,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    costs: [
      { resource: "wood", amount: 500 * 0.06 / 0.04 }, // 750 wood
      { resource: "food", amount: 500 * 0.06 / 0.04 }, // 750 food
      { resource: "steel", amount: 500 * 0.06 / 0.4 }, // 75 steel
      { resource: "silver", amount: 500 * 0.24 }, // 120 silver
      { resource: "gold", amount: 500 * 0.06 }, // 30 gold
    ],
  },
  {
    id: "buy_leather_100_mid1",
    label: "100 Leather",
    give: "leather",
    giveAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    costs: [
      { resource: "wood", amount: 100 * 0.3 / 0.04 }, // 750 wood
      { resource: "stone", amount: 100 * 0.3 / 0.06 }, // 500 stone
      { resource: "food", amount: 100 * 0.3 / 0.04 }, // 750 food
      { resource: "steel", amount: 100 * 0.3 / 0.4 }, // 75 steel
      { resource: "silver", amount: 100 * 1.2 }, // 120 silver
      { resource: "gold", amount: 100 * 0.3 }, // 30 gold
    ],
  },
  {
    id: "buy_steel_100_mid1",
    label: "100 Steel",
    give: "steel",
    giveAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    costs: [
      { resource: "wood", amount: 100 * 0.4 / 0.04 }, // 1000 wood
      { resource: "stone", amount: 100 * 0.4 / 0.06 }, // ~666 stone
      { resource: "food", amount: 100 * 0.4 / 0.04 }, // 1000 food
      { resource: "leather", amount: 100 * 0.4 / 0.3 }, // ~133 leather
      { resource: "silver", amount: 100 * 1.6 }, // 160 silver
      { resource: "gold", amount: 100 * 0.4 }, // 40 gold
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
      { resource: "wood", amount: 2000 * 0.04 }, // 80 gold worth
      { resource: "stone", amount: 2000 * 0.06 }, // 120 gold worth
      { resource: "leather", amount: 2000 * 0.04 / 0.3 }, // ~266 leather
      { resource: "steel", amount: 2000 * 0.04 / 0.4 }, // 200 steel
      { resource: "silver", amount: 2000 * 0.16 }, // 320 silver
      { resource: "gold", amount: 2000 * 0.04 }, // 80 gold
    ],
  },
  {
    id: "buy_wood_2000_mid2",
    label: "2000 Wood",
    give: "wood",
    giveAmount: 2000,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    costs: [
      { resource: "food", amount: 2000 * 0.04 }, // 80 gold worth
      { resource: "stone", amount: 2000 * 0.06 }, // 120 gold worth
      { resource: "leather", amount: 2000 * 0.04 / 0.3 }, // ~266 leather
      { resource: "steel", amount: 2000 * 0.04 / 0.4 }, // 200 steel
      { resource: "silver", amount: 2000 * 0.16 }, // 320 silver
      { resource: "gold", amount: 2000 * 0.04 }, // 80 gold
    ],
  },
  {
    id: "buy_stone_1000_mid2",
    label: "1000 Stone",
    give: "stone",
    giveAmount: 1000,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    costs: [
      { resource: "wood", amount: 1000 * 0.06 / 0.04 }, // 1500 wood
      { resource: "food", amount: 1000 * 0.06 / 0.04 }, // 1500 food
      { resource: "leather", amount: 1000 * 0.06 / 0.3 }, // 200 leather
      { resource: "steel", amount: 1000 * 0.06 / 0.4 }, // 150 steel
      { resource: "silver", amount: 1000 * 0.24 }, // 240 silver
      { resource: "gold", amount: 1000 * 0.06 }, // 60 gold
    ],
  },
  {
    id: "buy_leather_100_mid2",
    label: "100 Leather",
    give: "leather",
    giveAmount: 100,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    costs: [
      { resource: "wood", amount: 100 * 0.3 / 0.04 }, // 750 wood
      { resource: "stone", amount: 100 * 0.3 / 0.06 }, // 500 stone
      { resource: "food", amount: 100 * 0.3 / 0.04 }, // 750 food
      { resource: "steel", amount: 100 * 0.3 / 0.4 }, // 75 steel
      { resource: "silver", amount: 100 * 1.2 }, // 120 silver
      { resource: "gold", amount: 100 * 0.3 }, // 30 gold
    ],
  },
  {
    id: "buy_steel_250_mid2",
    label: "250 Steel",
    give: "steel",
    giveAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    costs: [
      { resource: "wood", amount: 250 * 0.4 / 0.04 }, // 2500 wood
      { resource: "stone", amount: 250 * 0.4 / 0.06 }, // ~1666 stone
      { resource: "food", amount: 250 * 0.4 / 0.04 }, // 2500 food
      { resource: "leather", amount: 250 * 0.4 / 0.3 }, // ~333 leather
      { resource: "silver", amount: 250 * 1.6 }, // 400 silver
      { resource: "gold", amount: 250 * 0.4 }, // 100 gold
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
      { resource: "wood", amount: 2000 * 0.04 }, // 80 gold worth
      { resource: "stone", amount: 2000 * 0.06 }, // 120 gold worth
      { resource: "leather", amount: 2000 * 0.04 / 0.3 }, // ~266 leather
      { resource: "steel", amount: 2000 * 0.04 / 0.4 }, // 200 steel
      { resource: "silver", amount: 2000 * 0.16 }, // 320 silver
      { resource: "gold", amount: 2000 * 0.04 }, // 80 gold
    ],
  },
  {
    id: "buy_stone_2500_end",
    label: "2500 Stone",
    give: "stone",
    giveAmount: 2500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    costs: [
      { resource: "wood", amount: 2500 * 0.06 / 0.04 }, // 3750 wood
      { resource: "food", amount: 2500 * 0.06 / 0.04 }, // 3750 food
      { resource: "leather", amount: 2500 * 0.06 / 0.3 }, // 500 leather
      { resource: "steel", amount: 2500 * 0.06 / 0.4 }, // 375 steel
      { resource: "silver", amount: 2500 * 0.24 }, // 600 silver
      { resource: "gold", amount: 2500 * 0.06 }, // 150 gold
    ],
  },
  {
    id: "buy_steel_500_end",
    label: "500 Steel",
    give: "steel",
    giveAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    costs: [
      { resource: "wood", amount: 500 * 0.4 / 0.04 }, // 5000 wood
      { resource: "stone", amount: 500 * 0.4 / 0.06 }, // ~3333 stone
      { resource: "food", amount: 500 * 0.4 / 0.04 }, // 5000 food
      { resource: "leather", amount: 500 * 0.4 / 0.3 }, // ~666 leather
      { resource: "silver", amount: 500 * 1.6 }, // 800 silver
      { resource: "gold", amount: 500 * 0.4 }, // 200 gold
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
      { resource: "wood", amount: Math.round(100 * 0.04 / 0.04) }, // 100 wood
      { resource: "stone", amount: Math.round(100 * 0.04 / 0.06) }, // ~66 stone
      { resource: "leather", amount: Math.round(100 * 0.04 / 0.3) }, // ~13 leather
      { resource: "steel", amount: Math.round(100 * 0.04 / 0.4) }, // 10 steel
      { resource: "silver", amount: Math.round(100 * 0.16) }, // 16 silver
      { resource: "gold", amount: Math.round(100 * 0.04) }, // 4 gold
    ],
  },
  {
    id: "sell_bones_50_early",
    label: "Sell 50 Bones",
    take: "bones",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "wood", amount: Math.round(50 * 0.05 / 0.04) }, // ~62 wood
      { resource: "stone", amount: Math.round(50 * 0.05 / 0.06) }, // ~41 stone
      { resource: "food", amount: Math.round(50 * 0.05 / 0.04) }, // ~62 food
      { resource: "leather", amount: Math.round(50 * 0.05 / 0.3) }, // ~8 leather
      { resource: "steel", amount: Math.round(50 * 0.05 / 0.4) }, // ~6 steel
      { resource: "silver", amount: Math.round(50 * 0.2) }, // 10 silver
      { resource: "gold", amount: Math.round(50 * 0.05) }, // ~2 gold
    ],
  },
  {
    id: "sell_fur_50_early",
    label: "Sell 50 Fur",
    take: "fur",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "wood", amount: Math.round(50 * 0.05 / 0.04) }, // ~62 wood
      { resource: "stone", amount: Math.round(50 * 0.05 / 0.06) }, // ~41 stone
      { resource: "food", amount: Math.round(50 * 0.05 / 0.04) }, // ~62 food
      { resource: "leather", amount: Math.round(50 * 0.05 / 0.3) }, // ~8 leather
      { resource: "steel", amount: Math.round(50 * 0.05 / 0.4) }, // ~6 steel
      { resource: "silver", amount: Math.round(50 * 0.2) }, // 10 silver
      { resource: "gold", amount: Math.round(50 * 0.05) }, // ~2 gold
    ],
  },
  {
    id: "sell_wood_100_early",
    label: "Sell 100 Wood",
    take: "wood",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "food", amount: Math.round(100 * 0.04 / 0.04) }, // 100 food
      { resource: "stone", amount: Math.round(100 * 0.04 / 0.06) }, // ~66 stone
      { resource: "leather", amount: Math.round(100 * 0.04 / 0.3) }, // ~13 leather
      { resource: "steel", amount: Math.round(100 * 0.04 / 0.4) }, // 10 steel
      { resource: "silver", amount: Math.round(100 * 0.16) }, // 16 silver
      { resource: "gold", amount: Math.round(100 * 0.04) }, // 4 gold
    ],
  },
  {
    id: "sell_stone_100_early",
    label: "Sell 100 Stone",
    take: "stone",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "wood", amount: Math.round(100 * 0.06 / 0.04) }, // 150 wood
      { resource: "food", amount: Math.round(100 * 0.06 / 0.04) }, // 150 food
      { resource: "leather", amount: Math.round(100 * 0.06 / 0.3) }, // 20 leather
      { resource: "steel", amount: Math.round(100 * 0.06 / 0.4) }, // 15 steel
      { resource: "silver", amount: Math.round(100 * 0.24) }, // 24 silver
      { resource: "gold", amount: Math.round(100 * 0.06) }, // 6 gold
    ],
  },
  {
    id: "sell_iron_50_early",
    label: "Sell 50 Iron",
    take: "iron",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
    rewards: [
      { resource: "wood", amount: Math.round(50 * 0.06 / 0.04) }, // 75 wood
      { resource: "stone", amount: Math.round(50 * 0.06 / 0.06) }, // 50 stone
      { resource: "food", amount: Math.round(50 * 0.06 / 0.04) }, // 75 food
      { resource: "leather", amount: Math.round(50 * 0.06 / 0.3) }, // 10 leather
      { resource: "steel", amount: Math.round(50 * 0.06 / 0.4) }, // ~7 steel
      { resource: "silver", amount: Math.round(50 * 0.24) }, // 12 silver
      { resource: "gold", amount: Math.round(50 * 0.06) }, // 3 gold
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
      { resource: "wood", amount: Math.round(250 * 0.04 / 0.04) }, // 250 wood
      { resource: "stone", amount: Math.round(250 * 0.04 / 0.06) }, // ~166 stone
      { resource: "leather", amount: Math.round(250 * 0.04 / 0.3) }, // ~33 leather
      { resource: "steel", amount: Math.round(250 * 0.04 / 0.4) }, // 25 steel
      { resource: "silver", amount: Math.round(250 * 0.16) }, // 40 silver
      { resource: "gold", amount: Math.round(250 * 0.04) }, // 10 gold
    ],
  },
  {
    id: "sell_bones_100_mid1",
    label: "Sell 100 Bones",
    take: "bones",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(100 * 0.05 / 0.04) }, // 125 wood
      { resource: "stone", amount: Math.round(100 * 0.05 / 0.06) }, // ~83 stone
      { resource: "food", amount: Math.round(100 * 0.05 / 0.04) }, // 125 food
      { resource: "leather", amount: Math.round(100 * 0.05 / 0.3) }, // ~16 leather
      { resource: "steel", amount: Math.round(100 * 0.05 / 0.4) }, // ~12 steel
      { resource: "silver", amount: Math.round(100 * 0.2) }, // 20 silver
      { resource: "gold", amount: Math.round(100 * 0.05) }, // 5 gold
    ],
  },
  {
    id: "sell_fur_100_mid1",
    label: "Sell 100 Fur",
    take: "fur",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(100 * 0.05 / 0.04) }, // 125 wood
      { resource: "stone", amount: Math.round(100 * 0.05 / 0.06) }, // ~83 stone
      { resource: "food", amount: Math.round(100 * 0.05 / 0.04) }, // 125 food
      { resource: "leather", amount: Math.round(100 * 0.05 / 0.3) }, // ~16 leather
      { resource: "steel", amount: Math.round(100 * 0.05 / 0.4) }, // ~12 steel
      { resource: "silver", amount: Math.round(100 * 0.2) }, // 20 silver
      { resource: "gold", amount: Math.round(100 * 0.05) }, // 5 gold
    ],
  },
  {
    id: "sell_wood_250_mid1",
    label: "Sell 250 Wood",
    take: "wood",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "food", amount: Math.round(250 * 0.04 / 0.04) }, // 250 food
      { resource: "stone", amount: Math.round(250 * 0.04 / 0.06) }, // ~166 stone
      { resource: "leather", amount: Math.round(250 * 0.04 / 0.3) }, // ~33 leather
      { resource: "steel", amount: Math.round(250 * 0.04 / 0.4) }, // 25 steel
      { resource: "silver", amount: Math.round(250 * 0.16) }, // 40 silver
      { resource: "gold", amount: Math.round(250 * 0.04) }, // 10 gold
    ],
  },
  {
    id: "sell_stone_250_mid1",
    label: "Sell 250 Stone",
    take: "stone",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(250 * 0.06 / 0.04) }, // 375 wood
      { resource: "food", amount: Math.round(250 * 0.06 / 0.04) }, // 375 food
      { resource: "leather", amount: Math.round(250 * 0.06 / 0.3) }, // 50 leather
      { resource: "steel", amount: Math.round(250 * 0.06 / 0.4) }, // ~37 steel
      { resource: "silver", amount: Math.round(250 * 0.24) }, // 60 silver
      { resource: "gold", amount: Math.round(250 * 0.06) }, // 15 gold
    ],
  },
  {
    id: "sell_iron_250_mid1",
    label: "Sell 250 Iron",
    take: "iron",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(250 * 0.06 / 0.04) }, // 375 wood
      { resource: "stone", amount: Math.round(250 * 0.06 / 0.06) }, // 250 stone
      { resource: "food", amount: Math.round(250 * 0.06 / 0.04) }, // 375 food
      { resource: "leather", amount: Math.round(250 * 0.06 / 0.3) }, // 50 leather
      { resource: "steel", amount: Math.round(250 * 0.06 / 0.4) }, // ~37 steel
      { resource: "silver", amount: Math.round(250 * 0.24) }, // 60 silver
      { resource: "gold", amount: Math.round(250 * 0.06) }, // 15 gold
    ],
  },
  {
    id: "sell_coal_250_mid1",
    label: "Sell 250 Coal",
    take: "coal",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(250 * 0.06 / 0.04) }, // 375 wood
      { resource: "stone", amount: Math.round(250 * 0.06 / 0.06) }, // 250 stone
      { resource: "food", amount: Math.round(250 * 0.06 / 0.04) }, // 375 food
      { resource: "leather", amount: Math.round(250 * 0.06 / 0.3) }, // 50 leather
      { resource: "steel", amount: Math.round(250 * 0.06 / 0.4) }, // ~37 steel
      { resource: "silver", amount: Math.round(250 * 0.24) }, // 60 silver
      { resource: "gold", amount: Math.round(250 * 0.06) }, // 15 gold
    ],
  },
  {
    id: "sell_sulfur_250_mid1",
    label: "Sell 250 Sulfur",
    take: "sulfur",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(250 * 0.08 / 0.04) }, // 500 wood
      { resource: "stone", amount: Math.round(250 * 0.08 / 0.06) }, // ~333 stone
      { resource: "food", amount: Math.round(250 * 0.08 / 0.04) }, // 500 food
      { resource: "leather", amount: Math.round(250 * 0.08 / 0.3) }, // ~66 leather
      { resource: "steel", amount: Math.round(250 * 0.08 / 0.4) }, // 50 steel
      { resource: "silver", amount: Math.round(250 * 0.32) }, // 80 silver
      { resource: "gold", amount: Math.round(250 * 0.08) }, // 20 gold
    ],
  },
  {
    id: "sell_leather_50_mid1",
    label: "Sell 50 Leather",
    take: "leather",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(50 * 0.3 / 0.04) }, // 375 wood
      { resource: "stone", amount: Math.round(50 * 0.3 / 0.06) }, // 250 stone
      { resource: "food", amount: Math.round(50 * 0.3 / 0.04) }, // 375 food
      { resource: "steel", amount: Math.round(50 * 0.3 / 0.4) }, // ~37 steel
      { resource: "silver", amount: Math.round(50 * 1.2) }, // 60 silver
      { resource: "gold", amount: Math.round(50 * 0.3) }, // 15 gold
    ],
  },
  {
    id: "sell_steel_100_mid1",
    label: "Sell 100 Steel",
    take: "steel",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
    rewards: [
      { resource: "wood", amount: Math.round(100 * 0.4 / 0.04) }, // 1000 wood
      { resource: "stone", amount: Math.round(100 * 0.4 / 0.06) }, // ~666 stone
      { resource: "food", amount: Math.round(100 * 0.4 / 0.04) }, // 1000 food
      { resource: "leather", amount: Math.round(100 * 0.4 / 0.3) }, // ~133 leather
      { resource: "silver", amount: Math.round(100 * 1.6) }, // 160 silver
      { resource: "gold", amount: Math.round(100 * 0.4) }, // 40 gold
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
      { resource: "silver", amount: Math.round(500 * 0.16) }, // 80 silver
      { resource: "gold", amount: Math.round(500 * 0.04) }, // 20 gold
    ],
  },
  {
    id: "sell_bones_250_mid2",
    label: "Sell 250 Bones",
    take: "bones",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(250 * 0.2) }, // 50 silver
      { resource: "gold", amount: Math.round(250 * 0.05) }, // ~12 gold
    ],
  },
  {
    id: "sell_fur_250_mid2",
    label: "Sell 250 Fur",
    take: "fur",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(250 * 0.2) }, // 50 silver
      { resource: "gold", amount: Math.round(250 * 0.05) }, // ~12 gold
    ],
  },
  {
    id: "sell_wood_500_mid2",
    label: "Sell 500 Wood",
    take: "wood",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * 0.16) }, // 80 silver
      { resource: "gold", amount: Math.round(500 * 0.04) }, // 20 gold
    ],
  },
  {
    id: "sell_stone_500_mid2",
    label: "Sell 500 Stone",
    take: "stone",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * 0.24) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * 0.06) }, // 30 gold
    ],
  },
  {
    id: "sell_iron_500_mid2",
    label: "Sell 500 Iron",
    take: "iron",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * 0.24) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * 0.06) }, // 30 gold
    ],
  },
  {
    id: "sell_coal_500_mid2",
    label: "Sell 500 Coal",
    take: "coal",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * 0.24) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * 0.06) }, // 30 gold
    ],
  },
  {
    id: "sell_sulfur_500_mid2",
    label: "Sell 500 Sulfur",
    take: "sulfur",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(500 * 0.32) }, // 160 silver
      { resource: "gold", amount: Math.round(500 * 0.08) }, // 40 gold
    ],
  },
  {
    id: "sell_obsidian_50_mid2",
    label: "Sell 50 Obsidian",
    take: "obsidian",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(50 * 4) }, // 200 silver
      { resource: "gold", amount: Math.round(50 * 1) }, // 50 gold
    ],
  },
  {
    id: "sell_adamant_50_mid2",
    label: "Sell 50 Adamant",
    take: "adamant",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(50 * 4.8) }, // 240 silver
      { resource: "gold", amount: Math.round(50 * 1.2) }, // 60 gold
    ],
  },
  {
    id: "sell_moonstone_50_mid2",
    label: "Sell 50 Moonstone",
    take: "moonstone",
    takeAmount: 50,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(50 * 8) }, // 400 silver
      { resource: "gold", amount: Math.round(50 * 2) }, // 100 gold
    ],
  },
  {
    id: "sell_leather_100_mid2",
    label: "Sell 100 Leather",
    take: "leather",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(100 * 1.2) }, // 120 silver
      { resource: "gold", amount: Math.round(100 * 0.3) }, // 30 gold
    ],
  },
  {
    id: "sell_steel_250_mid2",
    label: "Sell 250 Steel",
    take: "steel",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
    rewards: [
      { resource: "silver", amount: Math.round(250 * 1.6) }, // 400 silver
      { resource: "gold", amount: Math.round(250 * 0.4) }, // 100 gold
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
      { resource: "silver", amount: Math.round(500 * 0.16) }, // 80 silver
      { resource: "gold", amount: Math.round(500 * 0.04) }, // 20 gold
    ],
  },
  {
    id: "sell_bones_250_end",
    label: "Sell 250 Bones",
    take: "bones",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(250 * 0.2) }, // 50 silver
      { resource: "gold", amount: Math.round(250 * 0.05) }, // ~12 gold
    ],
  },
  {
    id: "sell_fur_250_end",
    label: "Sell 250 Fur",
    take: "fur",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(250 * 0.2) }, // 50 silver
      { resource: "gold", amount: Math.round(250 * 0.05) }, // ~12 gold
    ],
  },
  {
    id: "sell_wood_500_end",
    label: "Sell 500 Wood",
    take: "wood",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * 0.16) }, // 80 silver
      { resource: "gold", amount: Math.round(500 * 0.04) }, // 20 gold
    ],
  },
  {
    id: "sell_stone_500_end",
    label: "Sell 500 Stone",
    take: "stone",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * 0.24) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * 0.06) }, // 30 gold
    ],
  },
  {
    id: "sell_iron_500_end",
    label: "Sell 500 Iron",
    take: "iron",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * 0.24) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * 0.06) }, // 30 gold
    ],
  },
  {
    id: "sell_coal_500_end",
    label: "Sell 500 Coal",
    take: "coal",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * 0.24) }, // 120 silver
      { resource: "gold", amount: Math.round(500 * 0.06) }, // 30 gold
    ],
  },
  {
    id: "sell_sulfur_500_end",
    label: "Sell 500 Sulfur",
    take: "sulfur",
    takeAmount: 500,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(500 * 0.32) }, // 160 silver
      { resource: "gold", amount: Math.round(500 * 0.08) }, // 40 gold
    ],
  },
  {
    id: "sell_obsidian_100_end",
    label: "Sell 100 Obsidian",
    take: "obsidian",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(100 * 4) }, // 400 silver
      { resource: "gold", amount: Math.round(100 * 1) }, // 100 gold
    ],
  },
  {
    id: "sell_adamant_100_end",
    label: "Sell 100 Adamant",
    take: "adamant",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(100 * 4.8) }, // 480 silver
      { resource: "gold", amount: Math.round(100 * 1.2) }, // 120 gold
    ],
  },
  {
    id: "sell_moonstone_100_end",
    label: "Sell 100 Moonstone",
    take: "moonstone",
    takeAmount: 100,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(100 * 8) }, // 800 silver
      { resource: "gold", amount: Math.round(100 * 2) }, // 200 gold
    ],
  },
  {
    id: "sell_leather_250_end",
    label: "Sell 250 Leather",
    take: "leather",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(250 * 1.2) }, // 300 silver
      { resource: "gold", amount: Math.round(250 * 0.3) }, // 75 gold
    ],
  },
  {
    id: "sell_steel_250_end",
    label: "Sell 250 Steel",
    take: "steel",
    takeAmount: 250,
    condition: (state: GameState) => state.buildings.stoneHut >= 7,
    rewards: [
      { resource: "silver", amount: Math.round(250 * 1.6) }, // 400 silver
      { resource: "gold", amount: Math.round(250 * 0.4) }, // 100 gold
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
      const costOption = trade.costs[Math.floor(Math.random() * trade.costs.length)];
      const cost = Math.ceil(costOption.amount * (1 - discount));

      console.log('[MERCHANT] Created buy trade:', {
        id: trade.id,
        label: trade.label,
        cost: `${cost} ${costOption.resource}`,
      });

      return {
        id: trade.id,
        label: trade.label,
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

  // Select 2 sell trades
  const availableSellTrades = filteredSellTrades
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .map((trade) => {
      const rewardOption = trade.rewards[Math.floor(Math.random() * trade.rewards.length)];
      const reward = Math.ceil(rewardOption.amount * (1 + discount));

      console.log('[MERCHANT] Created sell trade:', {
        id: trade.id,
        label: trade.label,
        cost: `${trade.takeAmount} ${trade.take}`,
      });

      return {
        id: trade.id,
        label: trade.label,
        cost: `${trade.takeAmount} ${trade.take}`,
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
      const cost = Math.ceil(costOption.amounts[0] * (1 - discount));

      console.log('[MERCHANT] Created tool trade:', {
        id: trade.id,
        label: trade.label,
        cost: `${cost} ${costOption.resource}`,
      });

      return {
        id: trade.id,
        label: trade.label,
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
