import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import {
  eventChoiceHasBlockingCost,
  getEventChoiceAffordance,
  getEventVillagerCostTooltipRows,
  getResourceCostsFromCatalogTemplate,
  resolveEventVillagerCostAmount,
} from "./eventAffordance";
import type { GameState } from "@shared/schema";

function makeState(
  resourceOverrides: Partial<GameState["resources"]> = {},
  villagerOverrides: Partial<GameState["villagers"]> = {},
): GameState {
  return {
    resources: {
      gold: 50,
      food: 994,
      wood: 100,
      stone: 100,
      silver: 0,
      bones: 0,
      fur: 0,
      iron: 0,
      coal: 0,
      sulfur: 0,
      steel: 0,
      torch: 0,
      ...resourceOverrides,
    },
    villagers: {
      free: 5,
      gatherer: 0,
      hunter: 0,
      ...villagerOverrides,
    },
  } as GameState;
}

describe("eventAffordance", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("resolves solstice gathering costs from i18n template vars in English", () => {
    const costs = getResourceCostsFromCatalogTemplate(
      "solsticeGathering",
      "hostSolstice",
      { goldCost: 25, foodCost: 250 },
      makeState().resources,
    );

    expect(costs).toEqual([
      { resource: "gold", amount: 25 },
      { resource: "food", amount: 250 },
    ]);
  });

  it("resolves solstice gathering costs from i18n template vars in German", async () => {
    await i18n.changeLanguage("de");

    const affordance = getEventChoiceAffordance(
      { id: "hostSolstice", effect: () => ({}) },
      makeState(),
      {
        catalogId: "solsticeGathering",
        vars: { goldCost: 25, foodCost: 250 },
      },
    );

    expect(affordance.canAfford).toBe(true);
    expect(affordance.costs).toEqual([
      { resource: "gold", amount: 25 },
      { resource: "food", amount: 250 },
    ]);
  });

  it("marks solstice gathering unaffordable when food is too low in German", async () => {
    await i18n.changeLanguage("de");

    const affordance = getEventChoiceAffordance(
      { id: "hostSolstice", effect: () => ({}) },
      makeState({ food: 100 }),
      {
        catalogId: "solsticeGathering",
        vars: { goldCost: 25, foodCost: 250 },
      },
    );

    expect(affordance.canAfford).toBe(false);
    expect(affordance.individualAffordance.food).toBe(false);
    expect(affordance.individualAffordance.gold).toBe(true);
  });

  it("uses merchant trade structured sellResource data", () => {
    const affordance = getEventChoiceAffordance(
      {
        id: "trade1",
        effect: () => ({}),
        sellResource: "food",
        sellAmount: 250,
        cost: "250 Nahrung",
      },
      makeState({ food: 200 }),
    );

    expect(affordance.canAfford).toBe(false);
    expect(affordance.costs).toEqual([{ resource: "food", amount: 250 }]);
  });

  it("requires free villagers for villager event costs", () => {
    const affordance = getEventChoiceAffordance(
      {
        id: "payVillagers",
        effect: () => ({}),
        cost: "20 Villagers",
      },
      makeState({}, { free: 15, gatherer: 10 }),
    );

    expect(affordance.canAfford).toBe(false);
    expect(affordance.individualAffordance.villagers).toBe(false);
  });

  it("allows villager event costs when enough free villagers are available", () => {
    const affordance = getEventChoiceAffordance(
      {
        id: "payVillagers",
        effect: () => ({}),
        cost: "20 Villagers",
      },
      makeState({}, { free: 20, gatherer: 5 }),
    );

    expect(affordance.canAfford).toBe(true);
  });

  it("resolves villager costs from i18n catalog templates", () => {
    const amount = resolveEventVillagerCostAmount(undefined, makeState(), {
      catalogId: "obsidianOrbVisit",
      choiceId: "payVillagers",
    });

    expect(amount).toBe(20);
  });

  it("treats traders_daughter do_not_help as cost-free", () => {
    expect(
      eventChoiceHasBlockingCost(
        { id: "do_not_help", effect: () => ({}) },
        makeState(),
        { catalogId: "traders_daughter" },
      ),
    ).toBe(false);

    expect(
      eventChoiceHasBlockingCost(
        { id: "send_search_party", cost: "500 food, 50 torch", effect: () => ({}) },
        makeState(),
        { catalogId: "traders_daughter" },
      ),
    ).toBe(true);
  });

  it("shows free villager cost in tooltip when unaffordable", () => {
    const rows = getEventVillagerCostTooltipRows(20, makeState({}, { free: 15 }));

    expect(rows).toHaveLength(1);
    expect(rows[0].text).toContain("20");
    expect(rows[0].text).toContain("Free Villager");
    expect(rows[0].satisfied).toBe(false);
  });
});
