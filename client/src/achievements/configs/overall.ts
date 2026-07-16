import type { AchievementChartConfig } from "../achievementTypes";
import type { GameState } from "@shared/schema";

/**
 * Meta / overall achievements: persist across new games, never claimable.
 * Counts come from account-level win flags on the game state.
 */
export const overallChartConfig: AchievementChartConfig = {
  idPrefix: "overall",
  centerSymbol: "✦",
  claimable: false,
  rings: [
    [
      {
        segmentId: "0-winNormal",
        maxCount: 1,
        label: "Normal Victory",
        getCount: (state: GameState) => (state.hasWonNormalGame ? 1 : 0),
      },
      {
        segmentId: "0-winCruel",
        maxCount: 1,
        label: "Cruel Victory",
        getCount: (state: GameState) => (state.hasWonCruelGame ? 1 : 0),
      },
    ],
  ],
};

/** Overall achievements are never claimable — always empty. */
export function getUnclaimedOverallIds(): string[] {
  return [];
}
