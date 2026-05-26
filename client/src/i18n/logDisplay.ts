import type { LogEntry } from "@/game/rules/events";
import { tWithFallback } from "@/i18n/resolveGameText";

type LogVars = Record<string, string | number>;

function uiLogKey(key: string): string {
  return `log.${key}`;
}

function translateLogKey(
  logKey: string,
  fallback: string,
  vars?: LogVars,
): string {
  return tWithFallback("ui", uiLogKey(logKey), fallback, vars);
}

type PatternMatcher = {
  pattern: RegExp;
  resolve: (match: RegExpMatchArray) => { logKey: string; vars: LogVars };
};

/** Match legacy English system log lines stored in saves (no logKey). */
const LEGACY_SYSTEM_LOG_MATCHERS: PatternMatcher[] = [
  {
    pattern:
      /^(\d+) Gold investment complete: Success\. You gained (\d+) Gold\.$/,
    resolve: ([, amount, payout]) => ({
      logKey: "investmentComplete.success",
      vars: { amount: Number(amount), payout: Number(payout) },
    }),
  },
  {
    pattern:
      /^(\d+) Gold investment complete: Lucky Chance! You gained (\d+) Gold\.$/,
    resolve: ([, amount, payout]) => ({
      logKey: "investmentComplete.successLucky",
      vars: { amount: Number(amount), payout: Number(payout) },
    }),
  },
  {
    pattern:
      /^(\d+) Gold investment complete: Wipeout\. You lost your full investment of (\d+) Gold\.$/,
    resolve: ([, amount]) => ({
      logKey: "investmentComplete.wipeout",
      vars: { amount: Number(amount) },
    }),
  },
  {
    pattern:
      /^(\d+) Gold investment complete: Failure\. You lost (\d+) Gold\.$/,
    resolve: ([, amount, loss]) => ({
      logKey: "investmentComplete.failure",
      vars: { amount: Number(amount), loss: Number(loss) },
    }),
  },
  {
    pattern: /^One villager freezes to death in the cold\.$/,
    resolve: () => ({ logKey: "freezingDeath.one", vars: {} }),
  },
  {
    pattern: /^(\d+) villagers freeze to death in the cold\.$/,
    resolve: ([, count]) => ({
      logKey: "freezingDeath.other",
      vars: { count: Number(count) },
    }),
  },
  {
    pattern: /^One villager succumbs to madness and takes his own life\.$/,
    resolve: () => ({ logKey: "madnessDeath.one", vars: {} }),
  },
  {
    pattern: /^(\d+) villagers succumb to madness and take their own lives\.$/,
    resolve: ([, count]) => ({
      logKey: "madnessDeath.other",
      vars: { count: Number(count) },
    }),
  },
  {
    pattern: /^One villager succumbs to starvation\.$/,
    resolve: () => ({ logKey: "starvationDeath.one", vars: {} }),
  },
  {
    pattern: /^(\d+) villagers starve to death\.$/,
    resolve: ([, count]) => ({
      logKey: "starvationDeath.other",
      vars: { count: Number(count) },
    }),
  },
  {
    pattern: /^A stranger approaches and joins the village\.$/,
    resolve: () => ({ logKey: "stranger.variant0", vars: {} }),
  },
  {
    pattern: /^A traveler arrives and decides to stay\.$/,
    resolve: () => ({ logKey: "stranger.variant1", vars: {} }),
  },
  {
    pattern: /^A wanderer appears and becomes part of the community\.$/,
    resolve: () => ({ logKey: "stranger.variant2", vars: {} }),
  },
  {
    pattern: /^Someone approaches the village and settles in\.$/,
    resolve: () => ({ logKey: "stranger.variant3", vars: {} }),
  },
  {
    pattern: /^A stranger joins the community\.$/,
    resolve: () => ({ logKey: "stranger.variant4", vars: {} }),
  },
  {
    pattern: /^A newcomer arrives and makes themselves at home\.$/,
    resolve: () => ({ logKey: "stranger.variant5", vars: {} }),
  },
  {
    pattern: /^(\d+) strangers join the village\.$/,
    resolve: ([, count]) => ({
      logKey: "stranger.multiple0",
      vars: { count: Number(count) },
    }),
  },
  {
    pattern: /^(\d+) travelers arrive and decide to stay\.$/,
    resolve: ([, count]) => ({
      logKey: "stranger.multiple1",
      vars: { count: Number(count) },
    }),
  },
  {
    pattern: /^(\d+) wanderers arrive and join the community\.$/,
    resolve: ([, count]) => ({
      logKey: "stranger.multiple2",
      vars: { count: Number(count) },
    }),
  },
];

function resolveLegacySystemLog(message: string): string | null {
  for (const { pattern, resolve } of LEGACY_SYSTEM_LOG_MATCHERS) {
    const match = message.match(pattern);
    if (match) {
      const { logKey, vars } = resolve(match);
      return translateLogKey(logKey, message, vars);
    }
  }
  return null;
}

/** Display text for a log panel row (re-localizes system lines from keys or English fallbacks). */
export function resolveLogPanelMessage(entry: LogEntry): string {
  if (entry.logKey) {
    return translateLogKey(entry.logKey, entry.message, entry.logVars);
  }

  if (entry.type === "system") {
    const legacy = resolveLegacySystemLog(entry.message);
    if (legacy) return legacy;
  }

  return entry.message;
}
