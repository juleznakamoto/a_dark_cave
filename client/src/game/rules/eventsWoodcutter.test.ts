import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/store/createInitialState";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import {
  resolveEventChoiceLabel,
  resolveEventLogMessage,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
import { CRUEL_MODE } from "../cruelMode";
import { crossingPathsEvents } from "./eventsCrossingPaths";
import { gameEvents } from "./events";
import {
  getWoodcutterAttackSuccessChance,
  rollWoodcutterAttackDeaths,
  woodcutterEvents,
  woodcutterRemains,
} from "./eventsWoodcutter";

function state(patch: Partial<GameState> = {}): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...patch,
    resources: { ...base.resources, ...patch.resources },
    buildings: { ...base.buildings, ...patch.buildings },
    villagers: { ...base.villagers, ...patch.villagers },
    tools: { ...base.tools, ...patch.tools },
    weapons: { ...base.weapons, ...patch.weapons },
    story: {
      ...base.story,
      ...patch.story,
      seen: { ...base.story.seen, ...patch.story?.seen },
    },
  };
}

function choiceIds(level: number, game: GameState): string[] {
  const choices = woodcutterEvents[`woodcutter${level}`].choices;
  if (typeof choices !== "function") throw new Error("expected choice function");
  return choices(game).map((choice) => choice.id);
}

function attack(level: number, game: GameState) {
  const choices = woodcutterEvents[`woodcutter${level}`].choices;
  if (typeof choices !== "function") throw new Error("expected choice function");
  const choice = choices(game).find((entry) => entry.id === "attack");
  if (!choice) throw new Error("attack choice missing");
  return choice.effect(game);
}

describe("cruel woodcutter attack", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("offers the attack only in cruel mode", () => {
    expect(choiceIds(1, state())).toEqual(["acceptServices", "denyServices"]);
    expect(choiceIds(4, state({ cruelMode: true }))).toEqual([
      "acceptServices",
      "denyServices",
      "attack",
    ]);
  });

  it("uses 25% plus 1% per Strength, without the cruel success penalty", () => {
    const cruel = state({ cruelMode: true });
    expect(getWoodcutterAttackSuccessChance(cruel)).toBeCloseTo(0.25);
    const armed = state({
      cruelMode: true,
      weapons: { crude_bow: true },
    });
    expect(getWoodcutterAttackSuccessChance(armed)).toBeCloseTo(0.26);
    const formula = woodcutterAttackFormula();
    expect(formula.cmMultiplier).toBe(0);
  });

  it("scales lost-fight deaths from 1-2 on the first visit to 6-12 on the last", () => {
    expect(rollWoodcutterAttackDeaths(1, () => 0)).toBe(1);
    expect(rollWoodcutterAttackDeaths(1, () => 0.99)).toBe(2);
    expect(rollWoodcutterAttackDeaths(3, () => 0)).toBe(3);
    expect(rollWoodcutterAttackDeaths(3, () => 0.99)).toBe(6);
    expect(rollWoodcutterAttackDeaths(6, () => 0)).toBe(6);
    expect(rollWoodcutterAttackDeaths(6, () => 0.999)).toBe(12);
  });

  it("killing him gives the axe and 50 gold per visit, and ends the offers", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const game = state({
      cruelMode: true,
      resources: { gold: 10, food: 100 } as GameState["resources"],
      villagers: { free: 8 },
      buildings: { woodenHut: 2 },
    });
    const next = attack(1, game);
    const perVisit = CRUEL_MODE.woodcutter.attack.goldPerVisit;

    expect(next.tools?.woodcutter_axe).toBe(true);
    expect(next.resources?.gold).toBe(10 + perVisit);
    expect(attack(6, game).resources?.gold).toBe(10 + perVisit * 6);
    expect(next.resources?.food).toBe(100);
    expect(next.story?.seen?.woodcutterEnded).toBe(true);
    expect(next.story?.seen?.woodcutterFightLost).toBeUndefined();
    expect(next.story?.seen?.woodcutterBetrayed).toBeUndefined();
    expect(next.villagersKilled).toBeUndefined();
    expect(woodcutterEvents.woodcutter2.condition!(merged(game, next))).toBe(false);
    expect(crossingPathsEvents.crossingPathsAgain.condition!(merged(game, next))).toBe(
      false,
    );
  });

  it("losing the fight kills villagers for that visit and stops the offers", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const game = state({
      cruelMode: true,
      resources: { gold: 40 } as GameState["resources"],
      villagers: { free: 20 },
      buildings: { woodenHut: 6 },
    });
    const next = attack(5, game);

    expect(next.tools?.woodcutter_axe).toBeUndefined();
    expect(next.resources?.gold).toBeUndefined();
    expect(next.villagersKilled).toBe(10);
    expect(next.villagers?.free).toBe(10);
    expect(next.story?.seen?.woodcutterFightLost).toBe(true);
    expect(next.story?.seen?.woodcutterEnded).toBe(true);
    expect(next.story?.seen?.woodcutterBetrayed).toBeUndefined();

    const after = merged(game, next);
    expect(woodcutterEvents.woodcutter6.condition!(after)).toBe(false);
    expect(crossingPathsEvents.crossingPathsAgain.condition!(after)).toBe(false);
    expect(woodcutterRemains.condition!(after)).toBe(true);
  });

  it("still opens Crossing Paths Again when he betrays in cruel mode", () => {
    const betrayed = state({
      cruelMode: true,
      buildings: { woodenHut: 10 },
      story: { seen: { woodcutterBetrayed: true } } as GameState["story"],
    });
    expect(crossingPathsEvents.crossingPathsAgain.condition!(betrayed)).toBe(true);
    expect(woodcutterRemains.condition!(betrayed)).toBe(false);
  });
});

describe("woodcutter remains", () => {
  it("waits 39 minutes, then averages 60, and the only choice is the axe", () => {
    expect(gameEvents.woodcutterRemains).toBe(woodcutterRemains);
    expect(woodcutterRemains.timeProbability).toBe(60);
    expect(woodcutterRemains.earliestMinutes).toBe(39);
    expect(woodcutterRemains.showAsTimedTab).toBeUndefined();
    expect(woodcutterRemains.condition!(state({ cruelMode: true }))).toBe(false);

    const lost = state({
      cruelMode: true,
      resources: { gold: 15 } as GameState["resources"],
      story: { seen: { woodcutterFightLost: true } } as GameState["story"],
    });
    expect(woodcutterRemains.condition!(lost)).toBe(true);

    const choices = woodcutterRemains.choices;
    if (!Array.isArray(choices)) throw new Error("expected one choice");
    expect(choices.map((choice) => choice.id)).toEqual(["takeAxe"]);
    const next = choices[0].effect(lost);
    expect(next.tools?.woodcutter_axe).toBe(true);
    expect(next.resources).toBeUndefined();
    expect(next.story?.seen?.woodcutterRemainsTaken).toBe(true);
    expect(woodcutterRemains.condition!(merged(lost, next))).toBe(false);
    expect(
      crossingPathsEvents.crossingPathsAgain.condition!(merged(lost, next)),
    ).toBe(false);
  });
});

describe("cruel woodcutter english copy", () => {
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded();
  });

  it("names the attack and the body in the forest", () => {
    expect(resolveEventChoiceLabel("woodcutter", "attack")).toBe("Attack him");
    expect(resolveEventLogMessage("woodcutter", "attackWin", { gold: 100 })).toContain(
      "100 gold",
    );
    expect(resolveEventLogMessage("woodcutter", "attackLose", { deaths: 4 })).toContain(
      "4 villagers",
    );
    expect(resolveEventTitle("woodcutterRemains")).toBe("What the Forest Kept");
    expect(resolveEventMessage("woodcutterRemains")).toContain("attacked and killed");
    expect(resolveEventChoiceLabel("woodcutterRemains", "takeAxe")).toBe(
      "Take axe",
    );
    expect(resolveEventLogMessage("woodcutterRemains", "take")).toContain("axe");
  });

  it("has an attack label and a body scene in every locale", async () => {
    await ensureGameplayLocalesLoaded();
    for (const lang of SUPPORTED_LOCALES) {
      await i18n.changeLanguage(lang);
      expect(resolveEventChoiceLabel("woodcutter", "attack").trim(), lang).not.toBe("");
      expect(resolveEventChoiceLabel("woodcutterRemains", "takeAxe").trim(), lang).not.toBe("");
      expect(resolveEventTitle("woodcutterRemains").trim(), lang).not.toBe("");
      expect(resolveEventMessage("woodcutterRemains"), lang).not.toBe("");
      expect(resolveEventLogMessage("woodcutter", "attackWin", { gold: 100 }), lang).toContain(
        "100",
      );
      expect(resolveEventLogMessage("woodcutter", "attackLose", { deaths: 4 }), lang).toContain(
        "4",
      );
    }
    await i18n.changeLanguage("en");
  });
});

function woodcutterAttackFormula() {
  const choices = woodcutterEvents.woodcutter1.choices;
  if (typeof choices !== "function") throw new Error("expected choice function");
  const attackChoice = choices(state({ cruelMode: true })).find(
    (choice) => choice.id === "attack",
  );
  if (!attackChoice?.success_formula) throw new Error("missing formula");
  return attackChoice.success_formula;
}

function merged(game: GameState, next: Partial<GameState>): GameState {
  return {
    ...game,
    ...next,
    resources: next.resources ?? game.resources,
    tools: next.tools ?? game.tools,
    villagers: next.villagers ?? game.villagers,
    story: next.story ?? game.story,
  };
}
