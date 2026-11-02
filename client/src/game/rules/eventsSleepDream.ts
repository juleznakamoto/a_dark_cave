import type { GameState } from "@shared/schema";
import { resolveEventMessage, resolveEventTitle } from "@/i18n/eventText";
import { tWithFallback } from "@/i18n/resolveGameText";
import type { GameEvent, LogEntry } from "./eventTypes";

/**
 * A wake only dreams after a full hour. Focus is awarded on that same
 * hour, so a dream never rolls before there is focus to double.
 */
export const SLEEP_DREAM_MIN_MS = 60 * 60 * 1000;

/** Share of qualifying wakes that end in a really bad dream. */
export const BAD_DREAM_CHANCE = 0.15;

/** Share of qualifying wakes that end in a good dream. The rest are quiet. */
export const SLEEP_GOOD_DREAM_CHANCE = 0.35;

/** Wait after the sleep report closes before either dream event opens. */
export const SLEEP_DREAM_DELAY_MS = 5000;

/** How long a really bad dream slows actions. */
export const BAD_DREAMS_DURATION_MS = 10 * 60 * 1000;

/** Extra seconds added to every timed action while Bad Dreams is active. */
export const BAD_DREAMS_EXTRA_SECONDS = 2;

export function isBadDreamsActive(
  state: { badDreamsState?: { isActive?: boolean; endTime?: number } | null } | null | undefined,
  now: number,
): boolean {
  const dreams = state?.badDreamsState;
  return Boolean(dreams?.isActive && (dreams.endTime ?? 0) > now);
}

export function startBadDreams(now = Date.now()) {
  return {
    isActive: true,
    startTime: now,
    endTime: now + BAD_DREAMS_DURATION_MS,
    duration: BAD_DREAMS_DURATION_MS,
  };
}

export type SleepDream = "bad" | "good" | "none";

/**
 * One roll per wake. A bad dream is the first slice, then the good dream.
 * They never happen together. A shorter sleep does not roll.
 */
export function rollSleepDream(
  elapsedMs: number,
  rng: () => number = Math.random,
): SleepDream {
  if (!Number.isFinite(elapsedMs) || elapsedMs < SLEEP_DREAM_MIN_MS) {
    return "none";
  }
  const roll = rng();
  if (roll < BAD_DREAM_CHANCE) return "bad";
  if (roll < BAD_DREAM_CHANCE + SLEEP_GOOD_DREAM_CHANCE) return "good";
  return "none";
}

/** Focus from a sleep. Bell Blessing and a good dream each double it. */
export function sleepFocusPoints(
  hoursSlept: number,
  options: { bellBlessing?: boolean; goodDream?: boolean },
): number {
  if (!Number.isFinite(hoursSlept) || hoursSlept <= 0) return 0;
  let points = Math.floor(hoursSlept);
  if (options.bellBlessing) points *= 2;
  if (options.goodDream) points *= 2;
  return points;
}

/**
 * One window for the bad dream. Get Up already ended sleep, so this is
 * Continue only. The slowdown starts when the window opens.
 */
export function buildBadDreamDialogEntry(
  state: GameState,
  now = Date.now(),
): LogEntry {
  return {
    id: `log-message-${now}`,
    eventId: "badDreams",
    message: resolveEventMessage("badDreams", undefined, state),
    timestamp: now,
    type: "event",
    title: resolveEventTitle("badDreams", state) || "Bad Dreams",
    choices: [
      {
        id: "acknowledge",
        label: tWithFallback("common", "buttons.continue", "Continue"),
        effect: () => ({}),
      },
    ],
    skipEventLog: true,
  };
}

/**
 * Woken by Cunning Trader. Not part of the random event loop.
 * The wake handler opens one window a few seconds after Get Up.
 */
export const sleepDreamEvents: Record<string, GameEvent> = {
  goodDreams: {
    id: "goodDreams",
    condition: () => false,
    repeatable: true,
  },
  badDreams: {
    id: "badDreams",
    condition: () => false,
    repeatable: true,
  },
};
