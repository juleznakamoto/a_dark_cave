import { describe, expect, it } from "vitest";
import {
  isBastionTabVisible,
  isForestTabVisible,
  isVillageTabVisible,
} from "@shared/repairUnlockFlags";
import { getTotalPopulationEffects } from "@/game/population";
import { useGameStore } from "./state";
import { DEV_SAVE_CATALOG, DEV_SAVE_IDS, parseDevSaveId } from "./devSaveIds";
import { buildDevSave, isDevSaveFixtureGameId } from "./devSaves";
import { SOCIAL_PROMPT_AUTO_OPEN_COUNT } from "./socialPromptAuto";

function canActivateSleep(state: ReturnType<typeof buildDevSave>): boolean {
  const effects = getTotalPopulationEffects(state, Object.keys(state.villagers), {
    excludeTemporaryBonuses: true,
  });
  return (effects.wood || 0) > 0 && (effects.food || 0) > 0;
}

describe("dev save catalog", () => {
  it("starts with five named milestones", () => {
    expect(DEV_SAVE_IDS).toHaveLength(5);
    expect(Object.keys(DEV_SAVE_CATALOG)).toEqual([...DEV_SAVE_IDS]);
  });

  it("parses known ids and rejects unknown ones", () => {
    expect(parseDevSaveId("sleep-unlocked")).toBe("sleep-unlocked");
    expect(parseDevSaveId("sleep-active")).toBe("sleep-active");
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

  it("bastion opens Village, Forest, Estate, and Bastion", () => {
    const state = buildDevSave("bastion");
    expect(isVillageTabVisible(state)).toBe(true);
    expect(isForestTabVisible(state)).toBe(true);
    expect(state.buildings.darkEstate).toBeGreaterThan(0);
    expect(isBastionTabVisible(state)).toBe(true);
  });
});
