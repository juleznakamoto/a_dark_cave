import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { gameStateSchema, type GameState } from "@shared/schema";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { buildEventDialogLogEntry, gameEvents } from "./events";
import {
  blackRotEvents,
  blackRotSpoiledFood,
  blackRotSpoiledFoodAmount,
  getBlackRotKeepChance,
  rollBlackRotDeaths,
} from "./eventsBlackRot";
import type { EventChoice } from "./eventTypes";

function baseState(overrides: Record<string, unknown> = {}): GameState {
  return gameStateSchema.parse({
    buildings: { woodenHut: 5 },
    villagers: { free: 6 },
    resources: { food: 1000 },
    cruelMode: false,
    ...overrides,
  });
}

function withOpen(state: GameState, openedAt: number, food = state.resources.food): GameState {
  return gameStateSchema.parse({
    ...state,
    resources: { ...state.resources, food },
    pendingModalEvent: { eventId: "blackRot", openedAt },
  });
}

function choice(id: string): EventChoice {
  const choices = blackRotEvents.blackRot.choices;
  if (!Array.isArray(choices)) throw new Error("blackRot choices should be an array");
  const found = choices.find((c) => c.id === id);
  if (!found) throw new Error(`missing choice ${id}`);
  return found;
}

describe("blackRot", () => {
  const event = blackRotEvents.blackRot;

  beforeAll(async () => {
    await ensureGameplayLocalesLoaded();
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a repeatable dialog event, not a timed tab", () => {
    expect(gameEvents.blackRot).toBe(event);
    expect(event.showAsTimedTab).toBeFalsy();
    expect(event.isTimedChoice).toBeFalsy();
    expect(event.repeatable).toBe(true);
    expect(event.timeProbability).toBe(75);
    expect(event.cooldownPercent).toBe(0.7);
  });

  it("opens at 5 wooden huts, 6 villagers, and 1000 food", () => {
    expect(event.condition(baseState())).toBe(true);
    expect(event.condition(baseState({ buildings: { woodenHut: 4 } }))).toBe(false);
    expect(event.condition(baseState({ villagers: { free: 5 } }))).toBe(false);
    expect(event.condition(baseState({ resources: { food: 999 } }))).toBe(false);
  });

  it("keeps food at 20% + 1% luck, or 15% + 1% luck in cruel mode", () => {
    expect(getBlackRotKeepChance(baseState())).toBeCloseTo(0.2);
    expect(getBlackRotKeepChance(baseState({ cruelMode: true }))).toBeCloseTo(0.15);
    const formula = choice("keepFood").success_formula;
    expect(formula?.stats).toEqual([{ type: "luck", multiplier: 0.01 }]);
    expect(formula?.cmMultiplier).toBe(-0.05);
  });

  it("spoils 20 or 30 percent, stepped down to 500, with a 250 floor", () => {
    expect(blackRotSpoiledFoodAmount(1000, false, false)).toBe(250);
    expect(blackRotSpoiledFoodAmount(1000, false, true)).toBe(250);
    expect(blackRotSpoiledFoodAmount(4000, false, false)).toBe(500);
    expect(blackRotSpoiledFoodAmount(4000, false, true)).toBe(1000);
    expect(blackRotSpoiledFoodAmount(10000, false, false)).toBe(2000);
    expect(blackRotSpoiledFoodAmount(10000, false, true)).toBe(3000);
  });

  it("spoils 25 or 35 percent in cruel mode, with the same 250 floor", () => {
    expect(blackRotSpoiledFoodAmount(1000, true, false)).toBe(250);
    expect(blackRotSpoiledFoodAmount(1000, true, true)).toBe(250);
    expect(blackRotSpoiledFoodAmount(2000, true, false)).toBe(500);
    expect(blackRotSpoiledFoodAmount(10000, true, false)).toBe(2500);
    expect(blackRotSpoiledFoodAmount(10000, true, true)).toBe(3500);
  });

  it("locks the spoiled pile to the open dialog", () => {
    const low = withOpen(baseState(), 2, 10000);
    const high = withOpen(baseState(), 1, 10000);
    expect(blackRotSpoiledFood(low)).toBe(2000);
    expect(blackRotSpoiledFood(high)).toBe(3000);
    const vars = event.i18nVars;
    expect(typeof vars).toBe("function");
    if (typeof vars !== "function") return;
    expect(vars(high)).toEqual({ foodCost: "3'000" });
  });

  it("keeps the spoiled amount in the throw-out tooltip", () => {
    const state = withOpen(baseState(), 1, 10000);
    const entry = buildEventDialogLogEntry(event, state, { openedAt: 1 });
    const choices = entry.choices as EventChoice[];
    expect(choices.find((c) => c.id === "throwAway")?.label).toBe("Throw out");
    expect(choices.find((c) => c.id === "throwAway")?.cost).toBe("3'000 food");
    expect(choices.find((c) => c.id === "keepFood")?.label).toBe("Keep food");
    expect(entry.title).toBe("The Black Rot");
  });

  it("charges the spoiled amount shown on the first open", () => {
    const food = 10000;
    const closed = baseState({ resources: { food } });
    for (const openedAt of [1, 2]) {
      const entry = buildEventDialogLogEntry(event, closed, { openedAt });
      const shown = (entry.choices as EventChoice[]).find(
        (c) => c.id === "throwAway",
      )?.cost;
      const expected = openedAt % 2 === 1 ? 3000 : 2000;
      expect(shown).toBe(expected === 3000 ? "3'000 food" : "2'000 food");
      const result = choice("throwAway").effect(
        withOpen(closed, entry.timestamp, food),
      );
      expect(result.resources?.food).toBe(food - expected);
    }
  });

  it("throws the spoiled food away", () => {
    const state = withOpen(baseState(), 1, 10000);
    const result = choice("throwAway").effect(state);
    expect(result.resources?.food).toBe(7000);
    expect(result._logMessageKey).toBe("outcome0");
    expect(result.villagersKilled).toBeUndefined();
  });

  it("keeps the food when the meal does not sicken anyone", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = withOpen(baseState(), 1, 10000);
    const result = choice("keepFood").effect(state);
    expect(result._logMessageKey).toBe("outcome1");
    expect(result.resources).toBeUndefined();
    expect(result.villagers).toBeUndefined();
  });

  it("kills at least one villager on a failed meal and leaves the food", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0);
    const state = withOpen(baseState(), 1, 10000);
    const result = choice("keepFood").effect(state);
    expect(result._logMessageKey).toBe("outcome2");
    expect(result.resources).toBeUndefined();
    expect(result.villagersKilled).toBe(1);
    expect(result.villagers?.free).toBe(5);
  });

  it("rolls villager deaths from 15-25%, or 25-35% in cruel mode", () => {
    expect(rollBlackRotDeaths(6, false, 0)).toBe(1);
    expect(rollBlackRotDeaths(100, false, 0)).toBe(15);
    expect(rollBlackRotDeaths(100, false, 0.999)).toBe(25);
    expect(rollBlackRotDeaths(100, true, 0)).toBe(25);
    expect(rollBlackRotDeaths(100, true, 0.999)).toBe(35);
    expect(rollBlackRotDeaths(0, false, 0)).toBe(0);
  });
});
