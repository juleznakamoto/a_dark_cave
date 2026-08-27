import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  getCollectorDepartureLogKey,
  shouldEndCollectorVisitAfterTrade,
  wanderingCollectorEvents,
} from "./eventsWanderingCollector";
import {
  COLLECTOR_ITEMS,
  COLLECTOR_MAX_OFFERS,
  collectorRejectedSeenKey,
  getRejectedCollectorItems,
  markCollectorItemRejectedInSeen,
  selectCollectorOfferItems,
} from "./collectorRejectedItems";

function baseState(overrides: Partial<GameState> = {}): GameState {
  const initial = createInitialState() as GameState;
  return {
    ...initial,
    ...overrides,
    buildings: { ...initial.buildings, ...(overrides.buildings || {}) },
    resources: { ...initial.resources, ...(overrides.resources || {}) },
    clothing: { ...initial.clothing, ...(overrides.clothing || {}) },
    relics: { ...initial.relics, ...(overrides.relics || {}) },
    story: {
      ...initial.story,
      ...(overrides.story || {}),
      seen: {
        ...initial.story.seen,
        ...(overrides.story?.seen || {}),
      },
    },
  };
}

describe("collector departure whispers", () => {
  it("uses special lore after 1st, 3rd, and 5th visits", () => {
    expect(getCollectorDepartureLogKey(1)).toBe("whisper0");
    expect(getCollectorDepartureLogKey(3)).toBe("whisper1");
    expect(getCollectorDepartureLogKey(5)).toBe("whisper2");
  });

  it("uses the short generic line on other visits", () => {
    expect(getCollectorDepartureLogKey(2)).toBe("whisperGeneric");
    expect(getCollectorDepartureLogKey(4)).toBe("whisperGeneric");
    expect(getCollectorDepartureLogKey(6)).toBe("whisperGeneric");
    expect(getCollectorDepartureLogKey(7)).toBe("whisperGeneric");
  });
});

describe("collectorRejectedItems", () => {
  it("tracks rejected items and excludes owned ones", () => {
    const state = baseState({
      story: {
        seen: markCollectorItemRejectedInSeen(
          { collectorRejected_bone_dice: true },
          "shadow_flute",
        ),
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
      relics: { bone_dice: true, shadow_flute: false } as any,
    });

    expect(getRejectedCollectorItems(state)).toEqual(["shadow_flute"]);
  });

  it("selects up to max offers deterministically", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect(selectCollectorOfferItems(items, 0, COLLECTOR_MAX_OFFERS)).toHaveLength(
      COLLECTOR_MAX_OFFERS,
    );
  });

  it("lists every collector tradeable item", () => {
    expect([...COLLECTOR_ITEMS]).toEqual([
      "bloodstained_belt",
      "tarnished_amulet",
      "fang_charm",
      "muttering_amulet",
      "cracked_crown",
      "ring_of_drowned",
      "red_mask",
      "bone_necklace",
      "wooden_figure",
      "bone_dice",
      "blackened_mirror",
      "shadow_flute",
      "hollow_king_scepter",
      "unnamed_book",
    ]);
  });
});

describe("wandering_collector buy/sell", () => {
  const event = wanderingCollectorEvents.wandering_collector;

  it("returns on a 25-minute average with a 50% cooldown", () => {
    expect(event.timeProbability).toBe(25);
    expect(event.cooldownPercent).toBe(0.5);
  });

  it("offers rejected items for goldCost and owned items for reward", () => {
    const state = baseState({
      buildings: { woodenHut: 6 } as any,
      resources: { gold: 500 } as any,
      clothing: { bloodstained_belt: true } as any,
      story: {
        seen: {
          [collectorRejectedSeenKey("bone_dice")]: true,
          [collectorRejectedSeenKey("shadow_flute")]: true,
        },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });

    expect(event.condition(state)).toBe(true);
    expect(event.message?.(state as any)).toBe("visit0_both");

    const vars =
      typeof event.i18nVars === "function" ? event.i18nVars(state) : {};
    expect(vars).toEqual({ reward: 100, goldCost: 200 });

    const choices =
      typeof event.choices === "function" ? event.choices(state) : [];
    expect(choices.filter((c) => c.id.startsWith("buy_")).length).toBeGreaterThan(
      0,
    );
    expect(choices.some((c) => c.id === "sell_bloodstained_belt")).toBe(true);
  });

  it("can arrive with only owned items to sell (no buy section stock)", () => {
    const state = baseState({
      buildings: { woodenHut: 6 } as any,
      clothing: { bloodstained_belt: true } as any,
    });

    expect(event.condition(state)).toBe(true);
    expect(event.message?.(state as any)).toBe("visit0");
    const choices =
      typeof event.choices === "function" ? event.choices(state) : [];
    expect(choices.filter((c) => c.id.startsWith("buy_"))).toHaveLength(0);
    expect(choices.some((c) => c.id.startsWith("sell_"))).toBe(true);
  });

  it("uses visit1 copy for all return visits", () => {
    const state = baseState({
      buildings: { woodenHut: 10, stoneHut: 10 } as any,
      clothing: { bloodstained_belt: true } as any,
      story: {
        seen: { collectorVisitCount: 4 },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });
    expect(event.message?.(state as any)).toBe("visit1");
  });

  it("can arrive with only rejected items to buy (no sell section stock)", () => {
    const state = baseState({
      buildings: { woodenHut: 6 } as any,
      story: {
        seen: { [collectorRejectedSeenKey("bone_dice")]: true },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });

    expect(event.condition(state)).toBe(true);
    expect(event.message?.(state as any)).toBe("visit0_buy");
    const choices =
      typeof event.choices === "function" ? event.choices(state) : [];
    expect(choices.some((c) => c.id === "buy_bone_dice")).toBe(true);
    expect(
      choices.filter((c) => c.id.startsWith("sell_") && c.id !== "sell_nothing"),
    ).toHaveLength(0);
  });

  it("does not end visit after first trade when both sides are available", () => {
    const state = {
      ...baseState({
        buildings: { woodenHut: 6 } as any,
        resources: { gold: 500 } as any,
        clothing: { bloodstained_belt: true } as any,
        story: {
          seen: { [collectorRejectedSeenKey("bone_dice")]: true },
          merchantPurchases: 0,
          heavySleeperHours: 0,
        },
      }),
      timedEventTab: {
        collectorBuyAvailable: true,
        collectorSellAvailable: true,
        collectorBuyDone: false,
        collectorSellDone: false,
      },
    } as any;

    expect(shouldEndCollectorVisitAfterTrade(state, "buy")).toBe(false);
    expect(shouldEndCollectorVisitAfterTrade(state, "sell")).toBe(false);

    const buyChoice = (
      typeof event.choices === "function" ? event.choices(state) : []
    ).find((c) => c.id === "buy_bone_dice")!;
    const afterBuy = buyChoice.effect(state);
    expect((afterBuy.story?.seen as any)?.collectorVisitCount).toBeUndefined();
  });

  it("trade effects never increment visit count (leave choice does that)", () => {
    const state = {
      ...baseState({
        buildings: { woodenHut: 6 } as any,
        resources: { gold: 500 } as any,
        story: {
          seen: { [collectorRejectedSeenKey("bone_dice")]: true },
          merchantPurchases: 0,
          heavySleeperHours: 0,
        },
      }),
      timedEventTab: {
        collectorBuyAvailable: true,
        collectorSellAvailable: false,
        collectorBuyDone: false,
        collectorSellDone: false,
      },
    } as any;

    expect(shouldEndCollectorVisitAfterTrade(state, "buy")).toBe(true);
    const buyChoice = (
      typeof event.choices === "function" ? event.choices(state) : []
    ).find((c) => c.id === "buy_bone_dice")!;
    const afterBuy = buyChoice.effect(state);
    expect((afterBuy.story?.seen as any)?.collectorVisitCount).toBeUndefined();
    expect((afterBuy as any)._logMessageKey).toBeUndefined();

    const leave = event.fallbackChoice!.effect(state);
    expect((leave.story?.seen as any)?.collectorVisitCount).toBe(1);
  });

  it("gates 6th and 7th visits on 4th and 8th wave victories", () => {
    const afterHuts = baseState({
      buildings: { woodenHut: 10, stoneHut: 10 } as any,
      clothing: { bloodstained_belt: true } as any,
      story: {
        seen: { collectorVisitCount: 5 },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });
    expect(event.condition(afterHuts)).toBe(false);

    const afterFourth = baseState({
      buildings: { woodenHut: 10, stoneHut: 10 } as any,
      clothing: { bloodstained_belt: true } as any,
      story: {
        seen: { collectorVisitCount: 5, fourthWaveVictory: true },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });
    expect(event.condition(afterFourth)).toBe(true);

    const afterEighth = baseState({
      buildings: { woodenHut: 10, stoneHut: 10 } as any,
      clothing: { bloodstained_belt: true } as any,
      story: {
        seen: {
          collectorVisitCount: 6,
          fourthWaveVictory: true,
          eighthWaveVictory: true,
        },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });
    expect(event.condition(afterEighth)).toBe(true);

    const done = baseState({
      buildings: { woodenHut: 10, stoneHut: 10 } as any,
      clothing: { bloodstained_belt: true } as any,
      story: {
        seen: {
          collectorVisitCount: 7,
          fourthWaveVictory: true,
          eighthWaveVictory: true,
        },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });
    expect(event.condition(done)).toBe(false);
  });

  it("scales buy cost +50 gold per visit", () => {
    const state = baseState({
      buildings: { woodenHut: 10 } as any,
      clothing: { bloodstained_belt: true } as any,
      story: {
        seen: {
          collectorVisitCount: 1,
          [collectorRejectedSeenKey("bone_dice")]: true,
        },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });

    const vars =
      typeof event.i18nVars === "function" ? event.i18nVars(state) : {};
    expect(vars).toEqual({ reward: 150, goldCost: 300 }); // sell: 200 + 100*1
  });
});
