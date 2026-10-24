import type { GameState } from "@shared/schema";
import type { GameEvent } from "./eventTypes";
import {
  FINANCE_EXPEDITION_TIERS,
  getFinanceExpeditionUsageCount,
} from "./financeExpedition";

/**
 * The chainmaster storyline starts when a max-tier finance expedition returns
 * with the leatherbound book. That completion raises the usage count to
 * FINANCE_EXPEDITION_TIERS.length. Until then the player has not made enough
 * expeditions to receive it.
 */
export function hasMadeEnoughExpeditionsForChainmaster(
  state: Pick<GameState, "story">,
): boolean {
  return (
    getFinanceExpeditionUsageCount(state) >= FINANCE_EXPEDITION_TIERS.length ||
    !!state.story?.seen?.leatherboundBookFound
  );
}

export const scholarResearchEvents: Record<string, GameEvent> = {
  scholarResearchProposal: {
    id: "scholarResearchProposal",
    condition: (state: GameState) =>
      (state.buildings.clerksHut ?? 0) >= 1 &&
      !state.story.seen.scholarResearchExpeditionsUnlocked,
    timeProbability: 20,
    priority: 5,
    repeatable: true,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              scholarResearchExpeditionsUnlocked: true,
            },
          },
        }),
      },
    ],
  },

  scholarResearchTreasureHint: {
    id: "scholarResearchTreasureHint",
    condition: (state: GameState) =>
      (state.buildings.inkwardenAcademy ?? 0) >= 1 &&
      !!state.story.seen.scholarResearchExpeditionsUnlocked &&
      !state.story.seen.scholarResearchTreasureHintSeen &&
      !hasMadeEnoughExpeditionsForChainmaster(state),
    timeProbability: 20,
    priority: 5,
    repeatable: true,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              scholarResearchTreasureHintSeen: true,
            },
          },
        }),
      },
    ],
  },
};
