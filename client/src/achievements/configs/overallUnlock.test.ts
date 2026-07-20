import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  hasAnyOverallAchievementReached,
  isAchievementsGameTabUnlocked,
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
    expect(isAchievementsGameTabUnlocked(state)).toBe(true);
  });
});
