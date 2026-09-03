import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import {
  ESTATE_UPGRADE_MAXER_KEYS,
  collectEstateUpgradeMaxHitUpdates,
  getEstateUpgradeMaxerTotal,
  getEstateUpgradesAtMaxCount,
} from "./estateUpgradeMax";
import {
  BLOODFLAME_SPHERE_UPGRADES,
  CHAINMASTER_UPGRADES,
  CROWS_EYE_UPGRADES,
  CRUSHING_STRIKE_UPGRADES,
  DISGRACED_PRIOR_UPGRADES,
  FERAL_HOWL_UPGRADES,
  HUNTING_SKILL_UPGRADES,
  SLEEP_INTENSITY_UPGRADES,
  SLEEP_LENGTH_UPGRADES,
} from "@/game/rules/skillUpgrades";

describe("estateUpgradeMax", () => {
  it("exposes one key per estate-tab upgrade track, including Crow's Eye", () => {
    expect(getEstateUpgradeMaxerTotal()).toBe(
      ESTATE_UPGRADE_MAXER_KEYS.length,
    );
    expect(getEstateUpgradeMaxerTotal()).toBe(9);
    expect(ESTATE_UPGRADE_MAXER_KEYS).toContain("crowsEye");
  });

  it("records hits when an upgrade track reaches max", () => {
    const state = createInitialState();
    expect(collectEstateUpgradeMaxHitUpdates(state)).toEqual({});

    state.sleepUpgrades.lengthLevel = SLEEP_LENGTH_UPGRADES.length - 1;
    const hits = collectEstateUpgradeMaxHitUpdates(state);
    expect(hits.lifetimeEstateUpgradeMaxHits).toContain("sleepLength");
    expect(hits.lifetimeEstateUpgradeMaxHits).not.toContain("sleepIntensity");
  });

  it("counts lifetime hits even when current levels are reset", () => {
    const state = createInitialState();
    state.lifetimeEstateUpgradeMaxHits = ["sleepLength", "hunting"];
    expect(getEstateUpgradesAtMaxCount(state)).toBe(2);
  });

  it("completes when every estate upgrade track is maxed", () => {
    const state = createInitialState();
    state.sleepUpgrades.lengthLevel = SLEEP_LENGTH_UPGRADES.length - 1;
    state.sleepUpgrades.intensityLevel = SLEEP_INTENSITY_UPGRADES.length - 1;
    state.huntingSkills.level = HUNTING_SKILL_UPGRADES.length - 1;
    state.combatSkills.crushingStrikeLevel =
      CRUSHING_STRIKE_UPGRADES.length - 1;
    state.combatSkills.bloodflameSphereLevel =
      BLOODFLAME_SPHERE_UPGRADES.length - 1;
    state.combatSkills.feralHowlLevel = FERAL_HOWL_UPGRADES.length - 1;
    state.crowsEyeSkills.level = CROWS_EYE_UPGRADES.length - 1;
    state.disgracedPriorSkills = {
      level: DISGRACED_PRIOR_UPGRADES.length - 1,
    };
    state.chainmasterSkills = { level: CHAINMASTER_UPGRADES.length - 1 };

    expect(getEstateUpgradesAtMaxCount(state)).toBe(
      getEstateUpgradeMaxerTotal(),
    );
    const hits = collectEstateUpgradeMaxHitUpdates(state);
    expect(hits.lifetimeEstateUpgradeMaxHits).toHaveLength(
      getEstateUpgradeMaxerTotal(),
    );
  });
});
