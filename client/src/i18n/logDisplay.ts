import type { LogEntry } from "@/game/rules/events";
import { getActionLogMessage, tWithFallback } from "@/i18n/resolveGameText";
import enLog from "@/i18n/locales/en/ui/log.json";

type LogVars = Record<string, string | number>;

function uiLogKey(key: string): string {
  return `log.${key}`;
}

function translateLogKey(
  logKey: string,
  fallback: string,
  vars?: LogVars,
): string {
  const translated = tWithFallback("ui", uiLogKey(logKey), fallback, vars);
  return translated.trim() ? translated : fallback;
}

/** True when a log row has resolvable text (logKey and/or non-blank message). */
export function hasLogEntryText(entry: LogEntry): boolean {
  if (entry.logKey?.trim()) return true;
  return Boolean(entry.message?.trim());
}

type PatternMatcher = {
  pattern: RegExp;
  resolve: (match: RegExpMatchArray) => { logKey: string; vars: LogVars };
};

/** Exact English fallbacks from ui/log.json for saves written before logKey migration. */
function buildExactLegacySystemLogMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, value] of Object.entries(enLog.log.building)) {
    if (typeof value === "string") {
      map[value] = `building.${key}`;
    }
  }
  for (const [key, value] of Object.entries(enLog.log.gameplay)) {
    if (typeof value === "string") {
      map[value] = `gameplay.${key}`;
    }
  }
  // Older saves may contain a typo with a double space before "resources".
  map[
    "A clerks hut is erected, its occupant ready to track the flow of  resources with meticulous care."
  ] = "building.clerksHut";
  return map;
}

const LEGACY_EXACT_SYSTEM_LOG = buildExactLegacySystemLogMap();

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
  {
    pattern:
      /^The Dark Estate stands has been built on a small hill near the village, offering solitude and refuge\.$/,
    resolve: () => ({ logKey: "building.darkEstate", vars: {} }),
  },
  {
    pattern:
      /^The blacksmith's forge comes alive\. The heart of industry now beats in the village\.$/,
    resolve: () => ({ logKey: "building.blacksmith", vars: {} }),
  },
  {
    pattern:
      /^The village is encircled by a dense, dark forest\. Danger lingers in the air, though it may also be a good place to chop wood and hunt\.$/,
    resolve: () => ({ logKey: "gameplay.forestUnlocked", vars: {} }),
  },
  {
    pattern: /^You won (\d+) gold from the obsessed gambler\.$/,
    resolve: ([, amount]) => ({
      logKey: "gambler.win",
      vars: { amount: Number(amount) },
    }),
  },
  {
    pattern: /^You lost (\d+) gold to the obsessed gambler\.$/,
    resolve: ([, amount]) => ({
      logKey: "gambler.lose",
      vars: { amount: Number(amount) },
    }),
  },
  {
    pattern: /^The obsessed gambler took your silence as forfeit\.$/,
    resolve: () => ({ logKey: "gambler.forfeit", vars: {} }),
  },
];

function resolveLegacySystemLog(message: string): string | null {
  if (message === "You find an old, dusty bag with 25 Torches in the cave.") {
    return getActionLogMessage("exploreCave", "torchBag", message);
  }

  const exactKey = LEGACY_EXACT_SYSTEM_LOG[message];
  if (exactKey) {
    return translateLogKey(exactKey, message);
  }

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
