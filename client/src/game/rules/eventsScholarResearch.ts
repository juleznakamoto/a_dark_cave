import type { GameState } from "@shared/schema";
import type { GameEvent } from "./events";

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
};
