import type { LogEntry } from "@/game/rules/eventTypes";

/** Chance a multi-death madness log is told as one villager killing the rest. */
export const MADNESS_DEATH_RAMPAGE_CHANCE = 0.15;

const MADNESS_DEATH_ONE =
  "One villager succumbs to madness and takes his own life.";
const MADNESS_DEATH_OTHER =
  "{{count}} villagers succumb to madness and take their own lives.";
const MADNESS_DEATH_RAMPAGE_ONE =
  "One villager goes mad, kills another, and then himself.";
const MADNESS_DEATH_RAMPAGE_OTHER =
  "One villager goes mad, kills {{others}} others, and then himself.";

export type MadnessDeathLog = Pick<LogEntry, "message" | "logKey" | "logVars">;

/**
 * Log line for a madness death check.
 * A single death is always a suicide. When several die, most lines stay a
 * group suicide. A small chance retells the same deaths as one villager
 * killing the others, then himself.
 */
export function buildMadnessDeathLog(
  deaths: number,
  random: () => number = Math.random,
): MadnessDeathLog {
  if (deaths <= 1) {
    return {
      message: MADNESS_DEATH_ONE,
      logKey: "madnessDeath.one",
    };
  }

  if (random() < MADNESS_DEATH_RAMPAGE_CHANCE) {
    const others = deaths - 1;
    if (others === 1) {
      return {
        message: MADNESS_DEATH_RAMPAGE_ONE,
        logKey: "madnessDeath.rampageOne",
      };
    }
    return {
      message: MADNESS_DEATH_RAMPAGE_OTHER.replace(
        "{{others}}",
        String(others),
      ),
      logKey: "madnessDeath.rampageOther",
      logVars: { others },
    };
  }

  return {
    message: MADNESS_DEATH_OTHER.replace("{{count}}", String(deaths)),
    logKey: "madnessDeath.other",
    logVars: { count: deaths },
  };
}
