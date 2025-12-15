import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { getTotalKnowledge } from "./effectsCalculation";
import { calculateMerchantDiscount } from "./effectsStats";

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
  moonstone: 1.5,
  leather: 0.5,
  steel: 0.6,
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
function roundCost(cost: number, direction: "up" | "down" = "down"): number {
  cost = cost * 1.1;
  const roundFn = direction === "up" ? Math.ceil : Math.floor;

  if (cost < 100) {
    // Round to next 5-multiple
    return roundFn(cost / 5) * 5;
  } else if (cost < 1000) {
    // Round to next 10-multiple
    return roundFn(cost / 10) * 10;
  } else {
    // Round to next 50-multiple
    return roundFn(cost / 50) * 50;
  }
}

// Helper to calculate cost amounts
const cost = (
  giveAmount: number,
  giveResource: keyof typeof PRICES,
  costResource: keyof typeof PRICES,
) => (giveAmount * PRICES[giveResource]) / PRICES[costResource];

// Helper to generate cost array
const generateCosts = (
  amount: number,
  give: keyof typeof PRICES,
  costResources: (keyof typeof PRICES)[],
) =>
  costResources.map((resource) => ({
    resource,
    amount: cost(amount, give, resource),
  }));

// Helper to generate rewards array
const generateRewards = (
  amount: number,
  take: keyof typeof PRICES,
  rewardResources: (keyof typeof PRICES)[],
) =>
  rewardResources.map((resource) => ({
    resource,
    amount: Math.round((amount * PRICES[take]) / PRICES[resource]),
  }));

// Helper to generate buy trade object
const createBuyTrade = (
  id: string,
  resource: keyof typeof PRICES,
  amount: number,
  condition: (state: GameState) => boolean,
  costResources: (keyof typeof PRICES)[],
) => ({
  id,
  label: `${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1).replace(/_/g, " ")}`,
  give: resource,
  giveAmount: amount,
  condition,
  costs: generateCosts(amount, resource, costResources),
});

// Helper to generate sell trade object
const createSellTrade = (
  id: string,
  resource: keyof typeof PRICES,
  amount: number,
  condition: (state: GameState) => boolean,
  rewardResources: (keyof typeof PRICES)[],
) => ({
  id,
  label: `Sell ${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1).replace(/_/g, " ")}`,
  take: resource,
  takeAmount: amount,
  condition,
  rewards: generateRewards(amount, resource, rewardResources),
});

// Define tier conditions once
const TIER_CONDITIONS = {
  veryEarly: (state: GameState) =>
    state.buildings.woodenHut >= 3 && state.buildings.woodenHut <= 6,
  early: (state: GameState) =>
    state.buildings.woodenHut >= 5 && state.buildings.woodenHut <= 9,
  mid1: (state: GameState) =>
    state.buildings.woodenHut >= 7 && state.buildings.stoneHut <= 5,
  mid2: (state: GameState) =>
    state.buildings.stoneHut >= 3 && state.buildings.stoneHut <= 8,
  end: (state: GameState) => state.buildings.stoneHut >= 7,
  sellEarly: (state: GameState) =>
    state.buildings.woodenHut >= 4 && state.buildings.woodenHut <= 9,
};

// Define trade configurations based on progression tiers
const buyTrades = [
  // Very Early tier
  createBuyTrade("buy_food_250_early", "food", 250, TIER_CONDITIONS.veryEarly, [
    "wood",
    "stone",
    "silver",
    "gold",
  ]),
  createBuyTrade("buy_wood_250_early", "wood", 250, TIER_CONDITIONS.veryEarly, [
    "food",
    "stone",
    "silver",
    "gold",
  ]),
  createBuyTrade(
    "buy_stone_250_early",
    "stone",
    250,
    TIER_CONDITIONS.veryEarly,
    ["food", "wood", "silver", "gold"],
  ),
  createBuyTrade(
    "buy_leather_50_early",
    "leather",
    50,
    TIER_CONDITIONS.veryEarly,
    ["wood", "stone", "food", "steel", "silver", "gold"],
  ),

  // Early tier
  createBuyTrade("buy_food_500_early", "food", 500, TIER_CONDITIONS.early, [
    "wood",
    "stone",
    "silver",
    "gold",
  ]),
  createBuyTrade("buy_wood_500_early", "wood", 500, TIER_CONDITIONS.early, [
    "food",
    "stone",
    "silver",
    "gold",
  ]),
  createBuyTrade("buy_stone_500_early", "stone", 500, TIER_CONDITIONS.early, [
    "food",
    "wood",
    "silver",
    "gold",
  ]),
  createBuyTrade(
    "buy_leather_50_early",
    "leather",
    100,
    TIER_CONDITIONS.early,
    ["wood", "stone", "food", "steel", "silver", "gold"],
  ),
  createBuyTrade("buy_steel_50_early", "steel", 50, TIER_CONDITIONS.early, [
    "wood",
    "stone",
    "food",
    "leather",
    "silver",
    "gold",
  ]),

  // Mid 1 tier
  createBuyTrade("buy_food_1000_mid1", "food", 1000, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "steel",
    "silver",
    "gold",
  ]),
  createBuyTrade("buy_wood_1000_mid1", "wood", 1000, TIER_CONDITIONS.mid1, [
    "food",
    "stone",
    "steel",
    "silver",
    "gold",
  ]),
  createBuyTrade("buy_stone_500_mid1", "stone", 500, TIER_CONDITIONS.mid1, [
    "wood",
    "food",
    "steel",
    "silver",
    "gold",
  ]),
  createBuyTrade("buy_leather_150_mid1", "leather", 150, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "food",
    "steel",
    "silver",
    "gold",
  ]),
  createBuyTrade("buy_steel_150_mid1", "steel", 150, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "food",
    "leather",
    "silver",
    "gold",
  ]),

  // Mid 2 tier
  createBuyTrade("buy_food_2000_mid2", "food", 2000, TIER_CONDITIONS.mid2, [
    "wood",
    "stone",
    "leather",
    "steel",
    "gold",
  ]),
  createBuyTrade("buy_wood_2000_mid2", "wood", 2000, TIER_CONDITIONS.mid2, [
    "food",
    "stone",
    "leather",
    "steel",
    "gold",
  ]),
  createBuyTrade("buy_stone_1000_mid2", "stone", 1000, TIER_CONDITIONS.mid2, [
    "wood",
    "food",
    "leather",
    "steel",
    "gold",
  ]),
  createBuyTrade("buy_leather_100_mid2", "leather", 100, TIER_CONDITIONS.mid2, [
    "wood",
    "stone",
    "food",
    "steel",
    "gold",
  ]),
  createBuyTrade("buy_steel_250_mid2", "steel", 250, TIER_CONDITIONS.mid2, [
    "wood",
    "stone",
    "food",
    "leather",
    "gold",
  ]),

  // End tier
  createBuyTrade("buy_food_2000_end", "food", 2000, TIER_CONDITIONS.end, [
    "wood",
    "stone",
    "leather",
    "steel",
    "gold",
  ]),
  createBuyTrade("buy_stone_2500_end", "stone", 2500, TIER_CONDITIONS.end, [
    "wood",
    "food",
    "leather",
    "steel",
    "gold",
  ]),
  createBuyTrade("buy_steel_500_end", "steel", 500, TIER_CONDITIONS.end, [
    "wood",
    "stone",
    "food",
    "leather",
    "gold",
  ]),
];

const sellTrades = [
  // Early tier
  createSellTrade(
    "sell_food_100_early",
    "food",
    100,
    TIER_CONDITIONS.sellEarly,
    ["wood", "stone", "leather", "steel", "gold"],
  ),
  createSellTrade(
    "sell_bones_100_early",
    "bones",
    100,
    TIER_CONDITIONS.sellEarly,
    ["wood", "stone", "food", "leather", "steel", "gold"],
  ),
  createSellTrade("sell_fur_100_early", "fur", 100, TIER_CONDITIONS.sellEarly, [
    "wood",
    "stone",
    "food",
    "leather",
    "steel",
    "gold",
  ]),
  createSellTrade(
    "sell_wood_250_early",
    "wood",
    250,
    TIER_CONDITIONS.sellEarly,
    ["food", "stone", "leather", "steel", "gold"],
  ),
  createSellTrade(
    "sell_stone_100_early",
    "stone",
    100,
    TIER_CONDITIONS.sellEarly,
    ["wood", "food", "leather", "steel", "gold"],
  ),
  createSellTrade(
    "sell_iron_100_early",
    "iron",
    100,
    TIER_CONDITIONS.sellEarly,
    ["wood", "stone", "food", "leather", "steel", "gold"],
  ),

  // Mid 1 tier
  createSellTrade("sell_food_250_mid1", "food", 250, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "leather",
    "steel",
    "gold",
  ]),
  createSellTrade("sell_bones_250_mid1", "bones", 250, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "food",
    "leather",
    "steel",
    "gold",
  ]),
  createSellTrade("sell_fur_250_mid1", "fur", 250, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "food",
    "leather",
    "steel",
    "gold",
  ]),
  createSellTrade("sell_wood_250_mid1", "wood", 250, TIER_CONDITIONS.mid1, [
    "food",
    "stone",
    "leather",
    "steel",
    "gold",
  ]),
  createSellTrade("sell_stone_250_mid1", "stone", 250, TIER_CONDITIONS.mid1, [
    "wood",
    "food",
    "leather",
    "steel",
    "gold",
  ]),
  createSellTrade("sell_iron_250_mid1", "iron", 250, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "food",
    "leather",
    "steel",
    "gold",
  ]),
  createSellTrade("sell_coal_250_mid1", "coal", 250, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "food",
    "leather",
    "steel",
    "gold",
  ]),
  createSellTrade("sell_sulfur_250_mid1", "sulfur", 250, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "food",
    "leather",
    "steel",
    "gold",
  ]),
  createSellTrade("sell_leather_50_mid1", "leather", 50, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "food",
    "steel",
    "gold",
  ]),
  createSellTrade("sell_steel_250_mid1", "steel", 250, TIER_CONDITIONS.mid1, [
    "wood",
    "stone",
    "food",
    "leather",
    "gold",
  ]),

  // Mid 2 tier
  createSellTrade("sell_food_500_mid2", "food", 500, TIER_CONDITIONS.mid2, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_bones_250_mid2", "bones", 250, TIER_CONDITIONS.mid2, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_fur_250_mid2", "fur", 250, TIER_CONDITIONS.mid2, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_wood_500_mid2", "wood", 500, TIER_CONDITIONS.mid2, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_stone_500_mid2", "stone", 500, TIER_CONDITIONS.mid2, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_iron_500_mid2", "iron", 500, TIER_CONDITIONS.mid2, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_coal_500_mid2", "coal", 500, TIER_CONDITIONS.mid2, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_sulfur_500_mid2", "sulfur", 500, TIER_CONDITIONS.mid2, [
    "silver",
    "gold",
  ]),
  createSellTrade(
    "sell_obsidian_50_mid2",
    "obsidian",
    50,
    TIER_CONDITIONS.mid2,
    ["silver", "gold"],
  ),
  createSellTrade("sell_adamant_50_mid2", "adamant", 50, TIER_CONDITIONS.mid2, [
    "silver",
    "gold",
  ]),
  createSellTrade(
    "sell_moonstone_50_mid2",
    "moonstone",
    50,
    TIER_CONDITIONS.mid2,
    ["silver", "gold"],
  ),
  createSellTrade(
    "sell_leather_100_mid2",
    "leather",
    100,
    TIER_CONDITIONS.mid2,
    ["silver", "gold"],
  ),
  createSellTrade("sell_steel_250_mid2", "steel", 250, TIER_CONDITIONS.mid2, [
    "silver",
    "gold",
  ]),

  // End tier
  createSellTrade("sell_food_500_end", "food", 500, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_bones_250_end", "bones", 250, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_fur_250_end", "fur", 250, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_wood_500_end", "wood", 500, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_stone_500_end", "stone", 500, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_iron_500_end", "iron", 500, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_coal_500_end", "coal", 500, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_sulfur_500_end", "sulfur", 500, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
  createSellTrade(
    "sell_obsidian_100_end",
    "obsidian",
    100,
    TIER_CONDITIONS.end,
    ["silver", "gold"],
  ),
  createSellTrade("sell_adamant_100_end", "adamant", 100, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
  createSellTrade(
    "sell_moonstone_100_end",
    "moonstone",
    100,
    TIER_CONDITIONS.end,
    ["silver", "gold"],
  ),
  createSellTrade("sell_leather_250_end", "leather", 250, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
  createSellTrade("sell_steel_250_end", "steel", 250, TIER_CONDITIONS.end, [
    "silver",
    "gold",
  ]),
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
  {
    id: "trade_book_of_trials",
    label: "Book of Trials",
    give: "book",
    giveItem: "book_of_trials",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 && !state.books.book_of_trials,
    costs: [{ resource: "gold", amounts: [250] }],
    message:
      "You purchase the Book of Trials. The merchant smiles knowingly: 'A guide for those who seek to track their journey.'",
  },
  {
    id: "trade_stormglass_halberd_schematic",
    label: "Stormglass Halberd Schematic",
    give: "schematic",
    giveItem: "stormglass_halberd_schematic",
    condition: (state: GameState) => state.buildings.stoneHut >= 6,
    costs: [{ resource: "gold", amounts: [1500] }],
    message:
      "You purchase the stormglass halberd schematic. The merchant reveals the faded plans: 'With this design, you can forge a halberd of tremendous power.'",
  },
];

// Helper function to select trades (used for both buy and sell)
function selectTrades(
  trades: any[],
  numTrades: number,
  discount: number,
  usedResourcePairs: Set<string>,
  usedRewardTypes: Set<string>,
  isBuyTrade: boolean,
): EventChoice[] {
  const selected: EventChoice[] = [];
  const availableTrades = [...trades];

  // Track how many trades have gold/silver as buy resource (what player receives)
  let goldSilverBuyCount = 0;
  const MAX_GOLD_SILVER_BUY = 3;

  // Shuffle the available trades
  availableTrades.sort(() => Math.random() - 0.5);

  for (const trade of availableTrades) {
    if (selected.length >= numTrades) break;

    // Define buyResource and sellResource at the beginning
    let buyResource: string;
    let buyAmount: number;
    let sellResource: string;
    let sellAmount: number;
    let validOptions: any[];

    if (isBuyTrade) {
      // Buy trade: give is what user receives (buys), costs are what user pays (sells)
      buyResource = trade.give;
      buyAmount = trade.giveAmount;
      sellResource = "";
      sellAmount = 0;
      validOptions = trade.costs.filter((c: any) => c.resource !== trade.give);
    } else {
      // Sell trade: take is what user pays (sells), rewards are what user receives (buys)
      sellResource = trade.take;
      sellAmount = trade.takeAmount;
      buyResource = "";
      buyAmount = 0;
      validOptions = trade.rewards.filter(
        (r: any) => r.resource !== trade.take,
      );
    }

    // Filter out silver/gold if we've already used them (but only for buy trades)
    // For sell trades, it's fine to have multiple trades rewarding gold/silver
    if (isBuyTrade) {
      validOptions = validOptions.filter((option: any) => {
        if (option.resource === "silver" && usedRewardTypes.has("silver"))
          return false;
        if (option.resource === "gold" && usedRewardTypes.has("gold"))
          return false;
        return true;
      });
    }

    // Skip this trade if no valid options remain
    if (validOptions.length === 0) continue;

    // Try each valid option to find one that doesn't conflict
    let foundValidOption = false;
    const shuffledOptions = [...validOptions].sort(() => Math.random() - 0.5);

    for (const selectedOption of shuffledOptions) {
      let testBuyResource = buyResource;
      let testSellResource = sellResource;

      if (isBuyTrade) {
        testSellResource = selectedOption.resource;
      } else {
        testBuyResource = selectedOption.resource;
      }

      // Create a unique key for this resource pair (sorted to catch both directions)
      const resourcePair = [testBuyResource, testSellResource].sort().join("-");

      // Check if this pair is already used
      if (!usedResourcePairs.has(resourcePair)) {
        // Found a valid option!
        buyResource = testBuyResource;
        sellResource = testSellResource;
        buyAmount = isBuyTrade ? trade.giveAmount : selectedOption.amount;
        sellAmount = isBuyTrade ? selectedOption.amount : trade.takeAmount;

        // Check if this buy resource is gold or silver and if we've reached the limit
        if (
          isBuyTrade &&
          (buyResource === "gold" || buyResource === "silver")
        ) {
          if (goldSilverBuyCount >= MAX_GOLD_SILVER_BUY) {
            continue; // Skip this option if limit is reached
          }
          goldSilverBuyCount++; // Increment count for gold/silver buy trades
        }

        usedResourcePairs.add(resourcePair);

        // Track silver and gold usage for buy trades only
        if (isBuyTrade) {
          if (buyResource === "silver" || buyResource === "gold")
            usedRewardTypes.add(buyResource);
          if (sellResource === "silver" || sellResource === "gold")
            usedRewardTypes.add(sellResource);
        }

        foundValidOption = true;
        break;
      }
    }

    if (!foundValidOption) continue;

    // Apply 75% reduction if player receives gold or silver
    if (buyResource === "silver" || buyResource === "gold") {
      buyAmount = Math.ceil(buyAmount * 0.5);
    }

    //  Apply Knowledge Discount
    sellAmount = Math.ceil(sellAmount * (1 - discount));

    // Round numbers
    buyAmount = roundCost(buyAmount, "up");
    sellAmount = roundCost(sellAmount, "down");

    // Format resource names for display
    const formatResourceName = (res: string) =>
      res
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    const buyFormatted = formatResourceName(buyResource);
    const sellFormatted = formatResourceName(sellResource);

    // Create label and cost
    // Buy trade: label = what you get (from trade.label), cost = what you pay
    // Sell trade: label = what you get (buyAmount buyResource), cost = what you pay (sellAmount sellResource)
    const label = `+${buyAmount} ${buyFormatted}`;
    const cost = `${sellAmount} ${sellFormatted}`;

    selected.push({
      id: trade.id,
      label,
      cost,
      effect: (state: GameState) => {
        if ((state.resources[sellResource] || 0) >= sellAmount) {
          return {
            resources: {
              ...state.resources,
              [sellResource]: (state.resources[sellResource] || 0) - sellAmount,
              [buyResource]: (state.resources[buyResource] || 0) + buyAmount,
            },
          };
        }
        return {};
      },
    });
  }

  return selected;
}

// Function to generate fresh merchant choices
export function generateMerchantChoices(state: GameState): EventChoice[] {
  const knowledge = getTotalKnowledge(state);

  // Calculate merchant discount using centralized function
  const discount = calculateMerchantDiscount(knowledge);

  // Shared resource pair tracking
  const usedResourcePairs = new Set<string>();
  const usedRewardTypes = new Set<string>();

  // Filter buy trades
  const filteredBuyTrades = buyTrades.filter((trade) => {
    return trade.condition(state);
  });

  // Determine number of buy trades based on buildings (check highest tier first)
  let numBuyTrades = 2;
  let numSellTrades = 1;
  if (state.buildings.merchantsGuild >= 1) {
    numBuyTrades = 3;
    numSellTrades = 3;
  } else if (state.buildings.grandBazaar >= 1) {
    numBuyTrades = 3;
    numSellTrades = 2;
  } else if (state.buildings.tradePost >= 1) {
    numBuyTrades = 2;
    numSellTrades = 2;
  }

  const availableBuyTrades = selectTrades(
    filteredBuyTrades,
    numBuyTrades,
    discount,
    usedResourcePairs,
    usedRewardTypes,
    true,
  );

  // Filter sell trades (use separate resource pair tracking)
  const filteredSellTrades = sellTrades.filter((trade) => {
    return trade.condition(state);
  });

  const sellUsedResourcePairs = new Set<string>();
  const sellUsedRewardTypes = new Set<string>();

  const availableSellTrades = selectTrades(
    filteredSellTrades,
    numSellTrades,
    discount,
    sellUsedResourcePairs,
    sellUsedRewardTypes,
    false,
  );

  // Check which tool trades pass filters
  const filteredToolTrades = toolTrades.filter((trade) => {
    const conditionPasses = trade.condition(state);
    const alreadyOwned =
      (trade.give === "tool" &&
        state.tools[trade.giveItem as keyof typeof state.tools]) ||
      (trade.give === "weapon" &&
        state.weapons[trade.giveItem as keyof typeof state.weapons]) ||
      (trade.give === "schematic" &&
        state.schematics[trade.giveItem as keyof typeof state.schematics]) ||
      (trade.give === "book" &&
        state.books[trade.giveItem as keyof typeof state.books]);

    return conditionPasses && !alreadyOwned;
  });

  // Select 1 tool trade
  const availableToolTrades = filteredToolTrades
    .sort(() => Math.random() - 0.5)
    .slice(0, 1)
    .map((trade) => {
      const costOption = trade.costs[0];
      const rawCost = Math.ceil(costOption.amounts[0] * (1 - discount));
      const cost = roundCost(rawCost);

      return {
        id: trade.id,
        label: `${trade.label}`,
        cost: `${cost} ${costOption.resource}`,
        effect: (state: GameState) => {
          if ((state.resources[costOption.resource] || 0) >= cost) {
            const result: any = {
              resources: {
                ...state.resources,
                [costOption.resource]:
                  (state.resources[costOption.resource] || 0) - cost,
              },
              _logMessage: trade.message,
            };

            if (trade.give === "tool") {
              result.tools = { ...state.tools, [trade.giveItem]: true };
            } else if (trade.give === "weapon") {
              result.weapons = { ...state.weapons, [trade.giveItem]: true };
            } else if (trade.give === "schematic") {
              result.schematics = {
                ...state.schematics,
                [trade.giveItem]: true,
              };
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
          _logMessage:
            "You bid the merchant farewell. He tips his hat and mutters about the road ahead.",
        };
      },
    },
  ];

  return finalChoices;
}

export const merchantEvents: Record<string, GameEvent> = {
  merchant: {
    id: "merchant",
    condition: (state: GameState) => state.buildings.woodenHut >= 3,
    triggerType: "resource",
    timeProbability: (state: GameState) =>
      
      0,

    title: "Traveling Merchant",
    message:
      "A weathered merchant arrives, his cart overflowing with wares. His eyes glint with avarice as he murmurs 'I have rare items for sale'.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [],
  },
};
