import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  BLOODFLAME_SPHERE_UPGRADES,
  CHAINMASTER_UPGRADES,
  CRUSHING_STRIKE_UPGRADES,
  DISGRACED_PRIOR_UPGRADES,
  FERAL_HOWL_UPGRADES,
  HUNTING_SKILL_UPGRADES,
  SLEEP_INTENSITY_UPGRADES,
  SLEEP_LENGTH_UPGRADES,
} from "@/game/rules/skillUpgrades";
import {
  hasAnyOverallAchievementReached,
  isAchievementsGameTabUnlocked,
  isBasicAchievementTabUnlocked,
  isOverallAchievementCategoryEnabled,
  isOverallAchievementTabUnlocked,
} from "./overall";

describe("overall achievement tab unlock", () => {
  it("unlocks overall tab with Book of Trials", () => {
    const state = {
      ...createInitialState(),
      books: { ...createInitialState().books, book_of_trials: true },
    } as GameState;

    expect(isOverallAchievementTabUnlocked(state)).toBe(
      isOverallAchievementCategoryEnabled,
    );
  });

  it("unlocks overall tab when a meta achievement is already reached", () => {
    const state = {
      ...createInitialState(),
      hasWonNormalGame: true,
    } as GameState;

    expect(hasAnyOverallAchievementReached(state)).toBe(true);
    expect(isOverallAchievementTabUnlocked(state)).toBe(
      isOverallAchievementCategoryEnabled,
    );
  });

  it("unlocks the Achievements game tab from prior-run overall progress", () => {
    const state = {
      ...createInitialState(),
      hasWonCruelGame: true,
    } as GameState;

    expect(isAchievementsGameTabUnlocked(state)).toBe(
      isOverallAchievementCategoryEnabled,
    );
  });

  it("does not unlock overall tab from Survivor's Notes alone", () => {
    const state = {
      ...createInitialState(),
      relics: { ...createInitialState().relics, survivors_notes: true },
    } as GameState;

    expect(isOverallAchievementTabUnlocked(state)).toBe(false);
    expect(isBasicAchievementTabUnlocked(state)).toBe(true);
    expect(isAchievementsGameTabUnlocked(state)).toBe(true);
  });

  it("keeps the Basics tab locked on a new run with only prior overall progress", () => {
    const state = {
      ...createInitialState(),
      hasWonNormalGame: true,
    } as GameState;

    expect(isAchievementsGameTabUnlocked(state)).toBe(
      isOverallAchievementCategoryEnabled,
    );
    expect(isOverallAchievementTabUnlocked(state)).toBe(
      isOverallAchievementCategoryEnabled,
    );
    expect(isBasicAchievementTabUnlocked(state)).toBe(false);
  });

  it("unlocks the Achievements game tab from completed social promo steps", () => {
    const state = {
      ...createInitialState(),
      isUserSignedIn: true,
      referralCount: 1,
      social_media_rewards: {
        marketing_email: { claimed: true },
        instagram: { claimed: true },
        reddit: { claimed: true },
        playlight_discover: { claimed: true },
      },
    } as GameState;

    expect(hasAnyOverallAchievementReached(state)).toBe(
      isOverallAchievementCategoryEnabled,
    );
    expect(isAchievementsGameTabUnlocked(state)).toBe(
      isOverallAchievementCategoryEnabled,
    );
  });

  it("unlocks the Achievements game tab from live estate upgrades at max", () => {
    const state = createInitialState();
    state.sleepUpgrades.lengthLevel = SLEEP_LENGTH_UPGRADES.length - 1;
    state.sleepUpgrades.intensityLevel = SLEEP_INTENSITY_UPGRADES.length - 1;
    state.huntingSkills.level = HUNTING_SKILL_UPGRADES.length - 1;
    state.combatSkills.crushingStrikeLevel =
      CRUSHING_STRIKE_UPGRADES.length - 1;
    state.combatSkills.bloodflameSphereLevel =
      BLOODFLAME_SPHERE_UPGRADES.length - 1;
    state.combatSkills.feralHowlLevel = FERAL_HOWL_UPGRADES.length - 1;
    state.disgracedPriorSkills = {
      level: DISGRACED_PRIOR_UPGRADES.length - 1,
    };
    state.chainmasterSkills = { level: CHAINMASTER_UPGRADES.length - 1 };

    expect(hasAnyOverallAchievementReached(state)).toBe(true);
    expect(isAchievementsGameTabUnlocked(state)).toBe(
      isOverallAchievementCategoryEnabled,
    );
  });
});
