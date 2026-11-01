import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/featureFlags", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/featureFlags")>();
  return { ...actual, PACTS_ENABLED: true };
});
import { gameStateSchema, type GameState } from "@shared/schema";
import { incrementButtonUsage } from "@/game/buttonUpgrades";
import { executeGameAction } from "@/game/actions";
import { getPopulationProduction } from "@/game/population";
import { getJobProductionComposition } from "@/game/jobProductionComposition";
import "@/game/rules";
import { calculateAdjustedCost } from "./costCalculation";
import { generateMerchantChoices } from "./eventsMerchant";
import { getHeartfireProductionPerLevel } from "./pacts";
import { getTotalMerchantDiscount } from "./effectsStats";

function stateOf(partial: Record<string, unknown> = {}): GameState {
  return gameStateSchema.parse(partial);
}

function foodOf(jobId: string, count: number, state: GameState): number {
  return (
    getPopulationProduction(jobId, count, state).find(
      (row) => row.resource === "food",
    )?.totalAmount ?? 0
  );
}

describe("pact production", () => {
  it("gives gatherers extra wood and stone", () => {
    const state = stateOf({ chosenPacts: ["sturdy_hands"] });
    const rows = getPopulationProduction("gatherer", 2, state);
    expect(rows.find((row) => row.resource === "wood")?.totalAmount).toBe(30);
    expect(rows.find((row) => row.resource === "stone")?.totalAmount).toBe(20);
    expect(
      getJobProductionComposition("gatherer", 1, state).filter(
        (line) => line.sourceId === "sturdy_hands",
      ),
    ).toEqual([
      { resource: "wood", sourceId: "sturdy_hands", amount: 5 },
      { resource: "stone", sourceId: "sturdy_hands", amount: 5 },
    ]);
  });

  it("gives free villagers and hunters extra food", () => {
    const state = stateOf({ chosenPacts: ["full_larders"] });
    expect(foodOf("free", 3, state)).toBe(15);
    expect(foodOf("hunter", 2, state)).toBe(20);
  });

  it("gives each scholar one extra insight", () => {
    const state = stateOf({
      chosenPacts: ["avid_apprentices"],
      buildings: { clerksHut: 1 },
    });
    const insight = getPopulationProduction("scholar", 2, state).find(
      (row) => row.resource === "insight",
    );
    expect(insight?.totalAmount).toBe(4);
    expect(
      getJobProductionComposition("scholar", 2, state).filter(
        (line) => line.resource === "insight",
      ),
    ).toEqual([
      { resource: "insight", sourceId: "clerksHut", amount: 2 },
      { resource: "insight", sourceId: "avid_apprentices", amount: 2 },
    ]);
  });

  it("doubles the Heartfire production bonus per level, stacking with Ebon Grace", () => {
    expect(getHeartfireProductionPerLevel(stateOf({}))).toBeCloseTo(0.05);
    expect(
      getHeartfireProductionPerLevel(
        stateOf({ chosenPacts: ["blazesmith"] }),
      ),
    ).toBeCloseTo(0.1);
    expect(
      getHeartfireProductionPerLevel(
        stateOf({
          chosenPacts: ["blazesmith"],
          blessings: { ebon_grace: true },
        }),
      ),
    ).toBeCloseTo(0.15);

    const cursed = stateOf({
      chosenPacts: ["blazesmith"],
      heartfireState: { level: 2, lastLevelDecrease: 0 },
    });
    expect(
      getPopulationProduction("gatherer", 1, cursed).find(
        (row) => row.resource === "wood",
      )?.totalAmount,
    ).toBe(12);
    expect(
      getJobProductionComposition("gatherer", 1, cursed)
        .filter((line) => line.resource === "wood")
        .map((line) => line.sourceId),
    ).toEqual(["base", "heartfire", "blazesmith"]);

    const both = stateOf({
      chosenPacts: ["blazesmith"],
      blessings: { ebon_grace: true },
      heartfireState: { level: 2, lastLevelDecrease: 0 },
    });
    expect(
      getPopulationProduction("gatherer", 1, both).find(
        (row) => row.resource === "wood",
      )?.totalAmount,
    ).toBe(13);
  });
});

describe("pact crafting and trade", () => {
  it("halves bomb crafting costs", () => {
    const plain = stateOf({});
    const cursed = stateOf({ chosenPacts: ["blazesmith"] });
    expect(
      calculateAdjustedCost(
        "craftEmberBomb",
        100,
        true,
        plain,
        "crafting",
        "resources.iron",
      ),
    ).toBe(100);
    expect(
      calculateAdjustedCost(
        "craftEmberBomb",
        100,
        true,
        cursed,
        "crafting",
        "resources.iron",
      ),
    ).toBe(50);
    expect(
      calculateAdjustedCost(
        "craftAshfireBomb",
        15,
        true,
        cursed,
        "crafting",
        "resources.ashfire_dust",
      ),
    ).toBe(7);
    expect(
      calculateAdjustedCost(
        "craftVoidBomb",
        25,
        true,
        cursed,
        "crafting",
        "resources.obsidian",
      ),
    ).toBe(12);
    expect(
      calculateAdjustedCost(
        "tradeGoldForEmberBomb",
        100,
        true,
        cursed,
        undefined,
        "resources.gold",
      ),
    ).toBe(100);
  });

  it("adds 20% to the travelling merchant discount", () => {
    expect(getTotalMerchantDiscount(stateOf({}))).toBe(0);
    expect(
      getTotalMerchantDiscount(stateOf({ chosenPacts: ["cunning_trader"] })),
    ).toBe(0.2);
    expect(
      getTotalMerchantDiscount(
        stateOf({
          chosenPacts: ["cunning_trader"],
          stats: { knowledge: 50 },
          clothing: { ring_of_obedience: true },
        }),
      ),
    ).toBe(0.5);
  });

  it("charges 20% less gold or silver for Trade Post buys", () => {
    const plain = stateOf({
      resources: { gold: 1000, silver: 100, food: 0, ember_bomb: 0 },
      buildings: { tradePost: 1 },
    });
    const cursed = stateOf({
      ...plain,
      chosenPacts: ["cunning_trader"],
    });

    const plainFood = executeGameAction("tradeGoldForFood", plain);
    const cursedFood = executeGameAction("tradeGoldForFood", cursed);
    expect(plainFood.stateUpdates.resources?.food).toBe(250);
    expect(plainFood.stateUpdates.resources?.gold).toBe(990);
    expect(cursedFood.stateUpdates.resources?.food).toBe(250);
    expect(cursedFood.stateUpdates.resources?.gold).toBe(992);

    const plainBomb = executeGameAction("tradeGoldForEmberBomb", plain);
    const cursedBomb = executeGameAction("tradeGoldForEmberBomb", cursed);
    expect(plainBomb.stateUpdates.resources?.ember_bomb).toBe(1);
    expect(plainBomb.stateUpdates.resources?.gold).toBe(900);
    expect(cursedBomb.stateUpdates.resources?.ember_bomb).toBe(1);
    expect(cursedBomb.stateUpdates.resources?.gold).toBe(920);

    const plainSilver = executeGameAction("tradeSilverForGold", plain);
    const cursedSilver = executeGameAction("tradeSilverForGold", cursed);
    expect(plainSilver.stateUpdates.resources?.gold).toBe(1005);
    expect(plainSilver.stateUpdates.resources?.silver).toBe(80);
    expect(cursedSilver.stateUpdates.resources?.gold).toBe(1005);
    expect(cursedSilver.stateUpdates.resources?.silver).toBe(84);

    expect(
      calculateAdjustedCost(
        "tradeGoldForInsightPotion",
        250,
        true,
        cursed,
        undefined,
        "resources.gold",
      ),
    ).toBe(250);
  });

  it("leaves canyon-bridge sales on the normal gold rate", () => {
    const leather = { leather: 500, gold: 0 };
    const plain = executeGameAction(
      "sellLeatherBatch",
      stateOf({ resources: leather }),
    );
    const cursed = executeGameAction(
      "sellLeatherBatch",
      stateOf({
        resources: leather,
        chosenPacts: ["cunning_trader"],
      }),
    );
    expect(plain.stateUpdates.resources?.gold).toBe(50);
    expect(cursed.stateUpdates.resources?.gold).toBe(50);
  });
});

describe("pact merchant stock", () => {
  function resourceBuys(state: GameState): number {
    return generateMerchantChoices(state).filter(
      (choice) => choice.id.startsWith("buy_") && !choice.buyItem,
    ).length;
  }

  it("offers two more resource trades on every visit", () => {
    const resources = { food: 500, wood: 500, stone: 500, gold: 100 };
    const plain = stateOf({
      buildings: { woodenHut: 5, tradePost: 1 },
      resources,
    });
    const cursed = stateOf({
      buildings: { woodenHut: 5, tradePost: 1 },
      resources,
      chosenPacts: ["sturdy_hands"],
    });

    for (let roll = 0; roll < 20; roll += 1) {
      expect(resourceBuys(plain)).toBe(2);
      expect(resourceBuys(cursed)).toBe(4);
    }
  });
});

describe("pact mastery", () => {
  it("fills the next mastery level 20% faster", () => {
    const base = stateOf({
      buttonUpgrades: { mineStone: { clicks: 8, level: 0 } },
    });
    expect(incrementButtonUsage("mineStone", base).updatedUpgrade).toEqual({
      clicks: 9,
      level: 0,
    });
    const cursed = stateOf({
      chosenPacts: ["avid_apprentices"],
      buttonUpgrades: { mineStone: { clicks: 8, level: 0 } },
    });
    expect(incrementButtonUsage("mineStone", cursed).updatedUpgrade).toEqual({
      clicks: 9,
      level: 1,
    });
  });
});
