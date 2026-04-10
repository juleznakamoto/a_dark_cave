import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { CRUEL_MODE } from "../cruelMode";

/** Shown in EventDialog when the player finishes all dice games this visit (bone dice: 2, else 1). */
export const GAMBLER_LEAVE_AFTER_GAMES_MESSAGE =
  "The gambler pockets his dice, gives a last crooked smile, and disappears into the darkness of the woods.";

export const gamblerEvents: Record<string, GameEvent> = {
  gambler: {
    id: "gambler",
    condition: (state: GameState) => state.buildings.woodenHut >= 4,
    timeProbability: (state: GameState) =>
      state.cruelMode
        ? CRUEL_MODE.gambler.timeProbabilityMinutes.cruel
        : CRUEL_MODE.gambler.timeProbabilityMinutes.normal,
    cooldownPercent: 0.5,
    title: "The Obsessed Gambler",
    message: "The gambler sits cross-legged by the fire, eyes fixed on the dice. 'Place your bet,' he breathes with a crooked grin, 'and let's find out who endures.'",

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
            "The gambler shrugs, pockets his dice, and slips into the dark without another word.",
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
              "The gambler shrugs, pockets his dice, and slips into the dark without another word.",
          }) as any,
      },
    ],
  },
};
