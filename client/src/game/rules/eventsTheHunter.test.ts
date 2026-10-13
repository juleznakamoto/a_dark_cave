import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "@shared/schema";
import type { ActionResult } from "@/game/types";
import { createInitialState } from "@/game/store/createInitialState";
import { theHunterEvents } from "./eventsTheHunter";
import {
  forestWoodenCabinActions,
  handleWoodenCabin,
} from "./forestWoodenCabin";
import { BOW_HIERARCHY, getDisplayTools, getTotalStrength } from "./effectsCalculation";
import { weaponEffects } from "./effects";
import { getPopulationProduction } from "@/game/population";
import {
  getItemMadnessAmount,
  isItemAbsolvableSource,
} from "@/game/itemAbsolution";
import { wanderingCollectorEvents } from "./eventsWanderingCollector";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { resolveEventMessage } from "@/i18n/eventText";
import "@/game/rules";

const TRADES = [
  { id: "theHunter1", huts: 3, bones: 100, food: 50 },
  { id: "theHunter2", huts: 4, bones: 250, food: 125 },
  { id: "theHunter3", huts: 5, bones: 500, food: 250 },
  { id: "theHunter4", huts: 6, bones: 750, food: 500 },
  { id: "theHunter5", huts: 7, bones: 1000, food: 750 },
] as const;

function state(patch: Partial<GameState> = {}): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...patch,
    buildings: { ...base.buildings, ...patch.buildings },
    resources: { ...base.resources, ...patch.resources },
    weapons: { ...base.weapons, ...patch.weapons },
    villagers: { ...base.villagers, ...patch.villagers },
    theHunterState: patch.theHunterState ?? base.theHunterState,
    triggeredEvents: { ...base.triggeredEvents, ...patch.triggeredEvents },
    story: {
      ...base.story,
      ...patch.story,
      seen: { ...base.story.seen, ...patch.story?.seen },
    },
  };
}

function choiceEffect(
  eventId: string,
  choiceId: string,
  game: GameState,
): Partial<GameState> {
  const event = theHunterEvents[eventId];
  const choices = event.choices;
  if (!Array.isArray(choices)) throw new Error("expected choices array");
  const choice = choices.find((entry) => entry.id === choiceId);
  if (!choice?.effect) throw new Error(choiceId);
  return choice.effect(game);
}

describe("the hunter trades", () => {
  it("opens each visit only after the previous sale and the hut gate", () => {
    for (const [index, trade] of TRADES.entries()) {
      const event = theHunterEvents[trade.id];
      expect(event.timeProbability).toBe(20);
      expect(event.cooldownPercent).toBe(0.7);
      expect(event.showAsTimedTab).toBe(true);
      expect(
        event.condition!(
          state({
            buildings: { woodenHut: trade.huts - 1 } as GameState["buildings"],
            theHunterState: { lastAcceptedLevel: index },
          }),
        ),
      ).toBe(false);
      expect(
        event.condition!(
          state({
            buildings: { woodenHut: trade.huts } as GameState["buildings"],
            theHunterState: { lastAcceptedLevel: Math.max(0, index - 1) },
          }),
        ),
      ).toBe(index === 0);
      expect(
        event.condition!(
          state({
            buildings: { woodenHut: trade.huts } as GameState["buildings"],
            theHunterState: { lastAcceptedLevel: index },
          }),
        ),
      ).toBe(true);
      expect(
        event.condition!(
          state({
            buildings: { woodenHut: trade.huts } as GameState["buildings"],
            theHunterState: { lastAcceptedLevel: index + 1 },
          }),
        ),
      ).toBe(false);
    }
  });

  it("trades bones for food and advances the visit", () => {
    for (const [index, trade] of TRADES.entries()) {
      const game = state({
        resources: { bones: 5000, food: 10 } as GameState["resources"],
        theHunterState: { lastAcceptedLevel: index },
      });
      const next = choiceEffect(trade.id, "giveBones", game);
      expect(next.resources?.bones).toBe(5000 - trade.bones);
      expect(next.resources?.food).toBe(10 + trade.food);
      expect(next.theHunterState?.lastAcceptedLevel).toBe(index + 1);
    }
  });

  it("does not advance the visit when refused", () => {
    const game = state({ theHunterState: { lastAcceptedLevel: 0 } });
    const next = choiceEffect("theHunter1", "refuse", game);
    expect(next.theHunterState).toBeUndefined();
    expect(next.triggeredEvents?.theHunter1_seen).toBe(true);
    expect(next.triggeredEvents?.theHunter1).toBeUndefined();
  });
});

describe("the cabin report", () => {
  const event = theHunterEvents.theHunterCabin;

  it("waits until the last sale, then unlocks the forest action", () => {
    expect(event.timeProbability).toBe(15);
    expect(event.cooldownPercent).toBe(0.5);
    expect(event.showAsTimedTab).toBeUndefined();
    expect(event.fallbackChoice).toBeUndefined();
    const choices = event.choices;
    expect(Array.isArray(choices) && choices.map((choice) => choice.id)).toEqual([
      "continue",
    ]);
    expect(
      event.condition!(state({ theHunterState: { lastAcceptedLevel: 4 } })),
    ).toBe(false);
    expect(
      event.condition!(state({ theHunterState: { lastAcceptedLevel: 5 } })),
    ).toBe(true);
    const next = choiceEffect(
      "theHunterCabin",
      "continue",
      state({ theHunterState: { lastAcceptedLevel: 5 } }),
    );
    expect(next.story?.seen?.woodenCabinUnlocked).toBe(true);
    expect(
      event.condition!(
        state({
          theHunterState: { lastAcceptedLevel: 5 },
          story: { seen: { woodenCabinUnlocked: true } } as GameState["story"],
        }),
      ),
    ).toBe(false);
  });
});

describe("wooden cabin expedition", () => {
  const action = forestWoodenCabinActions.woodenCabin;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is 30% plus 1% per strength, and traps do not change it", () => {
    expect(action.minVillagers).toBe(8);
    expect(action.expeditionVillagersRequired?.(state())).toBe(8);
    expect(action.cost?.["resources.food"]).toBe(1000);
    expect(action.executionTime).toBe(150);

    const bare = state();
    const trapped = state({
      buildings: { traps: 1, improvedTraps: 1 } as GameState["buildings"],
    });
    expect(action.success_chance?.(trapped)).toBe(action.success_chance?.(bare));
    expect(action.success_chance?.(bare)).toBeCloseTo(
      0.3 + getTotalStrength(bare) * 0.01,
    );

    const strong = state({
      weapons: { manhunter_bow: true } as GameState["weapons"],
    });
    expect(getTotalStrength(strong)).toBe(getTotalStrength(bare) + 4);
    expect(action.success_chance?.(strong)).toBeCloseTo(
      0.3 + getTotalStrength(strong) * 0.01,
    );

    const cruel = state({ cruelMode: true });
    expect(action.success_chance?.(cruel)).toBeCloseTo(
      0.2 + getTotalStrength(cruel) * 0.01,
    );
  });

  it("reveals the manhunter bow on success", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const game = state({
      resources: { food: 5000 } as GameState["resources"],
      story: { seen: { woodenCabinUnlocked: true } } as GameState["story"],
    });
    const result: ActionResult = { stateUpdates: {}, logEntries: [] };
    handleWoodenCabin(game, result);
    expect(result.stateUpdates.weapons?.manhunter_bow).toBe(true);
    expect(result.stateUpdates.story?.seen?.woodenCabinExplored).toBe(true);
    expect(result.stateUpdates.resources?.food).toBe(4000);
    expect(result.logEntries?.[0]?.message).toMatch(/hunting people/);
    expect(result.logEntries?.[0]?.message).toMatch(/their flesh/);
  });

  it("kills 2 to 4 villagers on failure, and 4 to 6 in cruel mode", () => {
    const game = state({
      resources: { food: 5000 } as GameState["resources"],
      villagers: { free: 30 } as GameState["villagers"],
      current_population: 30,
    });
    vi.spyOn(Math, "random").mockImplementation(() => 0.99);
    const high: ActionResult = { stateUpdates: {}, logEntries: [] };
    handleWoodenCabin(game, high);
    expect(high.stateUpdates.villagers?.free).toBe(26);
    expect(high.stateUpdates.story?.seen?.woodenCabinExplored).toBeUndefined();
    expect(high.stateUpdates.weapons?.manhunter_bow).toBeUndefined();
    expect(high.logEntries?.[0]?.message).toMatch(/arrowheads are bone/);
    expect(high.stateUpdates.resources?.food).toBe(4000);

    let roll = 0;
    vi.spyOn(Math, "random").mockImplementation(() => {
      roll += 1;
      return roll === 1 ? 0.99 : 0;
    });
    const low: ActionResult = { stateUpdates: {}, logEntries: [] };
    handleWoodenCabin(game, low);
    expect(low.stateUpdates.villagers?.free).toBe(28);

    const cruel = state({
      ...game,
      cruelMode: true,
      villagers: { free: 30 } as GameState["villagers"],
    });
    vi.spyOn(Math, "random").mockImplementation(() => 0.99);
    const cruelHigh: ActionResult = { stateUpdates: {}, logEntries: [] };
    handleWoodenCabin(cruel, cruelHigh);
    expect(cruelHigh.stateUpdates.villagers?.free).toBe(24);

    roll = 0;
    vi.spyOn(Math, "random").mockImplementation(() => {
      roll += 1;
      return roll === 1 ? 0.99 : 0;
    });
    const cruelLow: ActionResult = { stateUpdates: {}, logEntries: [] };
    handleWoodenCabin(cruel, cruelLow);
    expect(cruelLow.stateUpdates.villagers?.free).toBe(26);
  });
});

describe("manhunter bow", () => {
  it("stacks beside crafted bows and adds hunt, strength, madness, and hunter food", () => {
    expect(BOW_HIERARCHY).not.toContain("manhunter_bow");
    const effect = weaponEffects.manhunter_bow;
    expect(effect.bonuses.actionBonuses?.hunt?.resourceMultiplier).toBe(2);
    expect(effect.bonuses.actionBonuses?.hunter?.resourceBonus?.food).toBe(1);
    expect(effect.bonuses.generalBonuses?.strength).toBe(4);
    expect(effect.bonuses.generalBonuses?.madness).toBe(3);

    const owned = state({
      weapons: {
        crude_bow: true,
        manhunter_bow: true,
      } as GameState["weapons"],
    });
    const displayed = getDisplayTools(owned);
    expect(displayed.crude_bow).toBe(true);
    expect(displayed.manhunter_bow).toBe(true);

    const without = getPopulationProduction("hunter", 2, state());
    const withBow = getPopulationProduction("hunter", 2, owned);
    const food = (rows: { resource: string; totalAmount: number }[]) =>
      rows.find((row) => row.resource === "food")?.totalAmount ?? 0;
    expect(food(withBow) - food(without)).toBe(2);

    expect(
      isItemAbsolvableSource(
        "manhunter_bow",
        getItemMadnessAmount(owned, "manhunter_bow"),
      ),
    ).toBe(true);
  });

  it("can be sold to the wandering collector", () => {
    const event = wanderingCollectorEvents.wandering_collector;
    const game = state({
      buildings: { woodenHut: 6 } as GameState["buildings"],
      weapons: { manhunter_bow: true } as GameState["weapons"],
    });
    const choices = event.choices;
    if (typeof choices !== "function") throw new Error("expected choice fn");
    const sell = choices(game).find((entry) => entry.id === "sell_manhunter_bow");
    expect(sell?.label).toBe("Manhunter Bow");
    const sold = sell?.effect?.(game);
    expect(sold?.weapons?.manhunter_bow).toBe(false);
    expect(sold?.resources?.gold).toBeGreaterThan(0);
  });
});

describe("the hunter english copy", () => {
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded();
  });

  it("foreshadows the meat and saves the reveal for the cabin", () => {
    const game = state();
    for (const trade of TRADES) {
      const event = theHunterEvents[trade.id];
      const text = resolveEventMessage(
        "theHunter",
        event.message,
        game,
        event.i18nVars,
      );
      expect(text).toContain("Food");
      expect(text.toLowerCase()).not.toMatch(/\bhuman\b|\bpeople\b/);
    }
    const first = resolveEventMessage(
      "theHunter",
      theHunterEvents.theHunter1.message,
      game,
      theHunterEvents.theHunter1.i18nVars,
    );
    expect(first.toLowerCase()).toContain("arrowhead");
    const repeat = resolveEventMessage(
      "theHunter",
      theHunterEvents.theHunter1.message,
      state({ triggeredEvents: { theHunter1_seen: true } }),
      theHunterEvents.theHunter1.i18nVars,
    );
    expect(repeat.toLowerCase()).toContain("no hide");
    expect(repeat.toLowerCase()).not.toMatch(/\bhuman\b|\bpeople\b/);

    const report = resolveEventMessage(
      "theHunterCabin",
      theHunterEvents.theHunterCabin.message,
      game,
    );
    expect(report.toLowerCase()).toContain("slaughterhouse");
    expect(report.toLowerCase()).not.toMatch(/\bhuman\b|\bpeople\b/);
  });
});
