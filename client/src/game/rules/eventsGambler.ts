import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const gamblerEvents: Record<string, GameEvent> = {
  gambler: {
    id: "gambler",
    condition: (state: GameState) => state.buildings.woodenHut >= 4,
    timeProbability: 50,
    cooldownPercent: 0.5,
    title: "The Gambler",
    message:
      "A hooded figure sits cross-legged by the fire, rattling a cup of dice. 'Care for a game of chance?' he asks with a crooked grin.",
    priority: 2,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    fallbackChoice: {
      id: "decline",
      label: "Decline",
      effect: () =>
        ({
          _logMessage:
            "The gambler shrugs, pockets his dice, and disappears into the night.",
        }) as any,
    },
    choices: [
      {
        id: "accept",
        label: "Accept",
        effect: () => ({}),
      },
      {
        id: "decline",
        label: "Decline",
        effect: () =>
          ({
            _logMessage:
              "The gambler shrugs, pockets his dice, and disappears into the night.",
          }) as any,
      },
    ],
  },
};
