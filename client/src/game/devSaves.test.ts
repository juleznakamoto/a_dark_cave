import { describe, expect, it } from "vitest";
import {
  isBastionTabVisible,
  isForestTabVisible,
  isVillageTabVisible,
} from "@shared/repairUnlockFlags";
import {
  getCurrentPopulation,
  getMaxPopulation,
  getTotalPopulationEffects,
} from "@/game/population";
import { useGameStore } from "./state";
import { DEV_SAVE_CATALOG, DEV_SAVE_IDS, parseDevSaveId } from "./devSaveIds";
import { buildDevSave, isDevSaveFixtureGameId } from "./devSaves";
import { SOCIAL_PROMPT_AUTO_OPEN_COUNT } from "./socialPromptAuto";
import {
  HUNTING_SKILL_UPGRADES,
  SLEEP_INTENSITY_UPGRADES,
  SLEEP_LENGTH_UPGRADES,
} from "@/game/rules/skillUpgrades";

function canActivateSleep(state: ReturnType<typeof buildDevSave>): boolean {
  const effects = getTotalPopulationEffects(state, Object.keys(state.villagers), {
    excludeTemporaryBonuses: true,
  });
  return (effects.wood || 0) > 0 && (effects.food || 0) > 0;
}

describe("dev save catalog", () => {
  it("starts with seven named milestones", () => {
    expect(DEV_SAVE_IDS).toHaveLength(7);
    expect(Object.keys(DEV_SAVE_CATALOG)).toEqual([...DEV_SAVE_IDS]);
  });

  it("parses known ids and rejects unknown ones", () => {
    expect(parseDevSaveId("sleep-unlocked")).toBe("sleep-unlocked");
    expect(parseDevSaveId("sleep-active")).toBe("sleep-active");
    expect(parseDevSaveId("estate-skills")).toBe("estate-skills");
    expect(parseDevSaveId("nope")).toBeNull();
    expect(parseDevSaveId(null)).toBeNull();
  });

  it.each(DEV_SAVE_IDS)("%s hydrates the live store", (id) => {
    useGameStore.getState().initialize(buildDevSave(id));
    const state = useGameStore.getState();
    expect(state.flags.gameStarted).toBe(true);
    expect(state.gameId).toBe(`dev-save-${id}`);
    expect(state.feedbackPromptShown).toBe(true);
    expect(state.socialPromptMilestoneIndex).toBe(SOCIAL_PROMPT_AUTO_OPEN_COUNT);
  });

  it("fresh-start is cave-only after Make Fire", () => {
    const state = buildDevSave("fresh-start");
    expect(state.flags.gameStarted).toBe(true);
    expect(state.flags.hasLitFire).toBe(true);
    expect(isVillageTabVisible(state)).toBe(false);
    expect(isForestTabVisible(state)).toBe(false);
    expect(isBastionTabVisible(state)).toBe(false);
    expect(state.buildings.darkEstate).toBe(0);
    expect(isDevSaveFixtureGameId(state.gameId)).toBe(true);
  });

  it("village unlocks the Village tab with working jobs", () => {
    const state = buildDevSave("village");
    expect(isVillageTabVisible(state)).toBe(true);
    expect(state.buildings.woodenHut).toBeGreaterThan(0);
    expect(canActivateSleep(state)).toBe(true);
    expect(state.buildings.darkEstate).toBe(0);
  });

  it("invest has Coinhouse, gold, and ready offers", () => {
    const state = buildDevSave("invest");
    expect(isVillageTabVisible(state)).toBe(true);
    expect(state.buildings.coinhouse).toBe(1);
    expect(state.resources.gold).toBeGreaterThanOrEqual(100);
    expect(state.investmentHallState.offers).toHaveLength(3);
    expect(state.investmentHallState.active).toBeNull();
    expect(state.playTime).toBeGreaterThanOrEqual(
      state.investmentHallState.nextWavePlayTime,
    );
  });

  it("sleep-unlocked has Estate and a clickable Sleep button", () => {
    const state = buildDevSave("sleep-unlocked");
    expect(state.buildings.darkEstate).toBeGreaterThan(0);
    expect(canActivateSleep(state)).toBe(true);
    expect(state.idleModeState.isActive).toBe(false);
  });

  it("sleep-active keeps a pending sleep session", () => {
    const state = buildDevSave("sleep-active");
    expect(state.idleModeState.isActive).toBe(true);
    expect(state.idleModeState.needsDisplay).toBe(true);
    expect(state.idleModeState.startTime).toBeGreaterThan(0);
    expect(canActivateSleep(state)).toBe(true);
  });

  it("estate-skills shows Estate Skills at lv1 / lv2 / lv3 with Improve gold", () => {
    const state = buildDevSave("estate-skills");
    expect(state.buildings.darkEstate).toBeGreaterThan(0);
    expect(state.idleModeState.isActive).toBe(false);
    expect(canActivateSleep(state)).toBe(true);

    const unlockedSkillRows = [
      state.fellowship.ashwraith_huntress,
      state.fellowship.disgraced_prior,
      state.fellowship.one_eyed_crow,
    ].filter(Boolean);
    expect(unlockedSkillRows).toHaveLength(3);

    // EstateStyleProgress uses state level as filled pips (not 0-indexed labels).
    expect(state.sleepUpgrades.lengthLevel).toBe(1);
    expect(state.sleepUpgrades.intensityLevel).toBe(2);
    expect(state.huntingSkills.level).toBe(3);

    const maxSleepLength = SLEEP_LENGTH_UPGRADES.length - 1;
    const maxSleepIntensity = SLEEP_INTENSITY_UPGRADES.length - 1;
    const maxHuntress = HUNTING_SKILL_UPGRADES.length - 1;
    expect(state.sleepUpgrades.lengthLevel).toBeLessThan(maxSleepLength);
    expect(state.sleepUpgrades.intensityLevel).toBeLessThan(maxSleepIntensity);
    expect(state.huntingSkills.level).toBeLessThan(maxHuntress);

    const shortsImproveGold =
      SLEEP_LENGTH_UPGRADES[2].cost + HUNTING_SKILL_UPGRADES[4].cost;
    expect(state.resources.gold).toBeGreaterThanOrEqual(shortsImproveGold);

    expect(getCurrentPopulation(state)).toBeLessThanOrEqual(
      getMaxPopulation(state),
    );
    expect(getCurrentPopulation(state)).toBeGreaterThan(0);
  });

  it("bastion opens Village, Forest, Estate, and Bastion", () => {
    const state = buildDevSave("bastion");
    expect(isVillageTabVisible(state)).toBe(true);
    expect(isForestTabVisible(state)).toBe(true);
    expect(state.buildings.darkEstate).toBeGreaterThan(0);
    expect(isBastionTabVisible(state)).toBe(true);
  });
});
