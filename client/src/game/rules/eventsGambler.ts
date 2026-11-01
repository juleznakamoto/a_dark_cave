import { tWithFallback } from "@/i18n/resolveGameText";
import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { CRUEL_MODE } from "../cruelMode";
import { getSeenResourceKeys } from "@/game/stateHelpers";
import {
  GAMBLER_BAN_MADNESS,
  GAMBLER_BANNED_SEEN_KEY,
  GAMBLER_SPARE_MADNESS,
  isGamblerBanned,
} from "@/game/gamblerSession";

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
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 4 &&
      getSeenResourceKeys(state).includes("gold") &&
      !isGamblerBanned(state),

    timeProbability: (state: GameState) =>
      state.cruelMode
        ? CRUEL_MODE.gambler.timeProbabilityMinutes.cruel
        : CRUEL_MODE.gambler.timeProbabilityMinutes.normal,
    cooldownPercent: 0.45,

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
  /**
   * Not rolled by the event clock. The dice dialog opens this once, after the
   * last paid win of a visit under Avid Apprentices, when the Gambler kills a villager on the way out.
   */
  gamblerEnraged: {
    id: "gamblerEnraged",
    condition: () => false,
    repeatable: true,
    choices: [
      {
        id: "ban",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madnessFromEvents:
              (state.stats.madnessFromEvents || 0) - GAMBLER_BAN_MADNESS,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              [GAMBLER_BANNED_SEEN_KEY]: true,
            },
          },
          _logMessageKey: "outcome0",
        }),
      },
      {
        id: "letReturn",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madnessFromEvents:
              (state.stats.madnessFromEvents || 0) + GAMBLER_SPARE_MADNESS,
          },
          _logMessageKey: "outcome1",
        }),
      },
    ],
  },
};
