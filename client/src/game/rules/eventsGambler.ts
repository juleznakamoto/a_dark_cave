import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const gamblerEvents: Record<string, GameEvent> = {
  gambler: {
    id: "gambler",
    condition: (state: GameState) => state.buildings.woodenHut >= 4,
    timeProbability: 50,
    cooldownPercent: 0.5,
    title: "The Obsessed Gambler",
    message:
      "A hooded figure sits cross-legged by the fire, eyes fixed on the dice as if the rest of the world has gone quiet. 'Place your bet,' he breathes with a crooked grin, 'and let's find out who the better player is.'",
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
            "The obsessed gambler shrugs, pockets his dice, and slips into the dark without another word.",
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
              "The obsessed gambler shrugs, pockets his dice, and slips into the dark without another word.",
          }) as any,
      },
    ],
  },
};
