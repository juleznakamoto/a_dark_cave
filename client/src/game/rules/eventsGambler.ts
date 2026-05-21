import { tWithFallback } from "@/i18n/resolveGameText";
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { CRUEL_MODE } from "../cruelMode";

const GAMBLER_LEAVE_AFTER_GAMES_FALLBACK =
  "The gambler pockets his dice, gives a last crooked smile, and disappears into the darkness of the woods.";

/** Shown in EventDialog when the player finishes all dice games this visit (bone dice: 2, else 1). */
export function getGamblerLeaveAfterGamesMessage(): string {
  return tWithFallback(
    "events",
    "gambler.leaveAfterGames",
    GAMBLER_LEAVE_AFTER_GAMES_FALLBACK,
  );
}

/** @deprecated Prefer getGamblerLeaveAfterGamesMessage() for locale-aware text. */
export const GAMBLER_LEAVE_AFTER_GAMES_MESSAGE =
  GAMBLER_LEAVE_AFTER_GAMES_FALLBACK;

export const gamblerEvents: Record<string, GameEvent> = {
  gambler: {
    id: "gambler",
    condition: (state: GameState) => state.buildings.woodenHut >= 4,
    timeProbability: (state: GameState) =>
      state.cruelMode
        ? CRUEL_MODE.gambler.timeProbabilityMinutes.cruel
        : CRUEL_MODE.gambler.timeProbabilityMinutes.normal,
    cooldownPercent: 0.5,

    priority: 2,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    fallbackChoice: {
      id: "decline",
      effect: () =>
        ({
          _logMessageKey: "outcome0",
        }) as any,
    },
    choices: [
      {
        id: "accept",
        effect: () => ({}),
      },
      {
        id: "decline",
        effect: () =>
          ({
            _logMessageKey: "outcome1",
          }) as any,
      },
    ],
  },
};
