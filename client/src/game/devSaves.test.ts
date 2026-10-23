import { describe, expect, it } from "vitest";
import { isAchievementsGameTabUnlocked } from "@/achievements/configs/overall";
import {
  isBastionTabVisible,
  isForestTabVisible,
  isVillageTabVisible,
} from "@shared/repairUnlockFlags";
import { useGameStore } from "./state";
import { DEV_SAVE_CATALOG, DEV_SAVE_IDS, parseDevSaveId } from "./devSaveIds";
import {
  applyBlastGateDevPreviewToStore,
  applyDevSaveToStore,
  buildDevSave,
  isBlastGateDevPreviewQuery,
  isDevSaveFixtureGameId,
} from "./devSaves";
import { SOCIAL_PROMPT_AUTO_OPEN_COUNT } from "./socialPromptAuto";
import { canActivateSleep } from "./sleepActivation";

describe("dev save catalog", () => {
  it("starts with six named milestones", () => {
    expect(DEV_SAVE_IDS).toHaveLength(6);
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
    expect(state.story.seen.hasWood).toBe(true);
    expect(state.resources.wood).toBeGreaterThan(0);
    expect(isDevSaveFixtureGameId(state.gameId)).toBe(true);
  });

  it("village unlocks the Village tab with crowded mid-game chrome", () => {
    const state = buildDevSave("village");
    expect(isVillageTabVisible(state)).toBe(true);
    expect(isForestTabVisible(state)).toBe(false);
    expect(state.buildings.woodenHut).toBeGreaterThanOrEqual(8);
    expect(state.buildings.cabin).toBe(1);
    expect(state.buildings.blacksmith).toBe(1);
    expect(state.buildings.tradePost).toBe(1);
    expect(state.buildings.tannery).toBe(1);
    expect(state.tools.stone_pickaxe).toBe(true);
    expect(state.tools.iron_axe).toBe(false);
    expect(state.weapons.crude_bow).toBe(false);
    expect(state.buildings.darkEstate).toBe(0);
    expect(state.story.seen.hasVillagers).toBe(true);
    expect(canActivateSleep(state)).toBe(true);
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

  it("blastGate=1 query unlocks Blast Gate on the Cave tab", () => {
    expect(isBlastGateDevPreviewQuery("?devSave=village")).toBe(false);
    expect(isBlastGateDevPreviewQuery("?devSave=village&blastGate=1")).toBe(
      true,
    );
    applyDevSaveToStore("village");
    applyBlastGateDevPreviewToStore();
    const state = useGameStore.getState();
    expect(state.story.seen.portalDiscovered).toBe(true);
    expect(state.story.seen.portalBlasted).toBe(false);
    expect(state.resources.ember_bomb).toBeGreaterThanOrEqual(10);
    expect(state.activeTab).toBe("cave");
  });

  it("bastion opens Village, Forest, Estate, and Bastion", () => {
    const state = buildDevSave("bastion");
    expect(isVillageTabVisible(state)).toBe(true);
    expect(isForestTabVisible(state)).toBe(true);
    expect(state.buildings.darkEstate).toBeGreaterThan(0);
    expect(isBastionTabVisible(state)).toBe(true);
    expect(isAchievementsGameTabUnlocked(state)).toBe(true);
    expect(state.story.seen.portalBlasted).toBe(true);
    expect(state.buildings.foundry).toBe(1);
    expect(state.buildings.palisades).toBeGreaterThan(0);
    expect(state.tools.iron_lantern).toBe(true);
    expect(state.tools.steel_axe).toBe(false);
    expect(state.resources.ember_bomb).toBeGreaterThan(0);
  });
});
