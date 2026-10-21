import { describe, expect, it, vi, afterEach } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { shouldShowAction } from "./index";
import {
  calculateTotalEffects,
  getActionBonuses,
} from "./effectsCalculation";
import { villageAttackEvents } from "./eventsVillageAttacks";
import { handleTameWolf, TAME_WOLF_BONE_COST } from "./villageUtilityActions";
import { GREY_ONE_UPGRADES } from "./skillUpgrades";
import type { ActionResult } from "@/game/types";
import type { EventChoice } from "./eventTypes";

function wolfChoices(): EventChoice[] {
  const choices = villageAttackEvents.wolfAttack.choices;
  if (!Array.isArray(choices)) {
    throw new Error("wolfAttack choices should be a static array");
  }
  return choices;
}

function trapChoices(): EventChoice[] {
  const choices = villageAttackEvents.trapSuggestion.choices;
  if (!Array.isArray(choices)) {
    throw new Error("trapSuggestion choices should be a static array");
  }
  return choices;
}

function mergeEffect(
  state: ReturnType<typeof gameStateSchema.parse>,
  effect: Record<string, unknown>,
) {
  const { _logMessageKey, ...rest } = effect as Record<string, unknown> & {
    _logMessageKey?: string;
  };
  return {
    state: gameStateSchema.parse({ ...state, ...rest }),
    logKey: _logMessageKey,
  };
}

describe("Grey One event chain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs wolf victory → trap unlock → tame → upgrade tiers", () => {
    // Pre-wolf village: eligible for the attack, no pup / traps yet.
    let state = gameStateSchema.parse({
      buildings: { woodenHut: 4, heartfire: 1, traps: 0 },
      villagers: { free: 12 },
      clothing: { alphas_hide: false },
      fellowship: { grey_one: false },
      resources: { bones: 0, food: 200, fur: 0, silver: 0 },
      story: { seen: {} },
    });

    expect(villageAttackEvents.wolfAttack.condition(state)).toBe(true);
    expect(villageAttackEvents.trapSuggestion.condition(state)).toBe(false);
    expect(shouldShowAction("tameWolf", state)).toBe(false);
    expect(shouldShowAction("buildTraps", state)).toBe(false);

    // Force a successful defend so we get Alpha's Hide + the pup beat.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const defend = wolfChoices().find((c) => c.id === "defendVillage");
    expect(defend).toBeTruthy();
    const wolfResult = mergeEffect(state, defend!.effect(state));
    state = wolfResult.state;

    expect(wolfResult.logKey).toBe("outcome0");
    expect(state.clothing.alphas_hide).toBe(true);
    expect(state.story.seen.firstWolfAttack).toBe(true);
    expect(state.story.seen.villageTrapsSuggested).toBeFalsy();
    expect(shouldShowAction("tameWolf", state)).toBe(true);
    expect(shouldShowAction("buildTraps", state)).toBe(false);
    expect(villageAttackEvents.trapSuggestion.condition(state)).toBe(true);

    // Trap suggestion is the unlock gate (not the wolf outcome itself).
    const prepare = trapChoices().find((c) => c.id === "prepareTraps");
    expect(prepare).toBeTruthy();
    state = mergeEffect(state, prepare!.effect(state)).state;

    expect(state.story.seen.villageTrapsSuggested).toBe(true);
    expect(shouldShowAction("buildTraps", state)).toBe(true);
    expect(villageAttackEvents.trapSuggestion.condition(state)).toBe(false);

    // Tame the pup → Grey One joins at level 0.
    state = gameStateSchema.parse({
      ...state,
      resources: { ...state.resources, bones: TAME_WOLF_BONE_COST },
    });
    expect(shouldShowAction("tameWolf", state)).toBe(true);

    const tameResult: ActionResult = {
      stateUpdates: {},
      logEntries: [],
      delayedEffects: [],
    };
    handleTameWolf(state, tameResult);
    state = gameStateSchema.parse({
      ...state,
      ...tameResult.stateUpdates,
      resources: {
        ...state.resources,
        bones: state.resources.bones - TAME_WOLF_BONE_COST,
      },
    });

    expect(state.fellowship.grey_one).toBe(true);
    expect(state.greyOneSkills.level).toBe(0);
    expect(shouldShowAction("tameWolf", state)).toBe(false);

    // Level 0 applies immediately; Alpha's Hide from the kill still stacks.
    const level0 = calculateTotalEffects(state);
    expect(level0.statBonuses.madness).toBe(-1);
    expect(level0.statBonuses.luck).toBe(4); // +3 hide, +1 Grey One
    expect(level0.statBonuses.strength).toBe(4); // +4 hide
    expect(getActionBonuses("hunt", state).resourceMultiplier).toBe(1.15);

    // Upgrade track itself (isolate Grey One from Alpha's Hide).
    for (let level = 0; level < GREY_ONE_UPGRADES.length; level++) {
      const tier = GREY_ONE_UPGRADES[level];
      if (level > 0) {
        expect(tier.cost).toBeGreaterThan(0);
        expect(tier.currency).toBe("bones");
      }
      const solo = withLevel(level);
      const effects = calculateTotalEffects(solo);
      expect(effects.statBonuses.madness).toBe(tier.madness);
      expect(effects.statBonuses.luck).toBe(tier.luck);
      expect(effects.statBonuses.strength).toBe(tier.strength);
      expect(getActionBonuses("hunt", solo).resourceMultiplier).toBe(
        1 + tier.huntBonus / 100,
      );
    }

    // Cumulative check: level 2 keeps strength/hunt from level 1.
    const mid = withLevel(2);
    expect(calculateTotalEffects(mid).statBonuses.strength).toBe(1);
    expect(getActionBonuses("hunt", mid).resourceMultiplier).toBe(1.25);
    expect(calculateTotalEffects(mid).statBonuses.madness).toBe(-3);
    expect(calculateTotalEffects(mid).statBonuses.luck).toBe(3);
  });

  it("still unlocks traps after a failed first wolf attack", () => {
    let state = gameStateSchema.parse({
      buildings: { woodenHut: 4, heartfire: 1 },
      villagers: { free: 12 },
      clothing: { alphas_hide: false },
      resources: { food: 500 },
      story: { seen: {} },
    });

    // High random → defend fails; still marks firstWolfAttack.
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const defend = wolfChoices().find((c) => c.id === "defendVillage")!;
    state = mergeEffect(state, defend.effect(state)).state;

    expect(state.clothing.alphas_hide).toBe(false);
    expect(state.story.seen.firstWolfAttack).toBe(true);
    expect(shouldShowAction("tameWolf", state)).toBe(false);
    expect(villageAttackEvents.trapSuggestion.condition(state)).toBe(true);

    const prepare = trapChoices().find((c) => c.id === "prepareTraps")!;
    state = mergeEffect(state, prepare.effect(state)).state;
    expect(shouldShowAction("buildTraps", state)).toBe(true);
  });
});

function withLevel(level: number) {
  return gameStateSchema.parse({
    fellowship: { grey_one: true },
    greyOneSkills: { level },
  });
}
