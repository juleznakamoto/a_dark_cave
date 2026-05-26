import type { LogEntry } from "@/game/rules/events";
import {
  gameEvents,
  getEventCatalogIdByEventId,
} from "@/game/rules/events";
import { UPGRADE_LABELS, type UpgradeKey } from "@/game/buttonUpgrades";
import { getActionLogMessage, tWithFallback } from "@/i18n/resolveGameText";
import { resolveEventMessage } from "@/i18n/eventText";
import enEvents from "@/i18n/locales/en/events.json";
import enLog from "@/i18n/locales/en/ui/log.json";
import i18n from "./index";
import type { GameState } from "@shared/schema";

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

function translateLogEntry(
  logKey: string,
  fallback: string,
  vars?: LogVars,
): string {
  return translateLogKey(logKey, fallback, expandLogVars(logKey, vars, fallback));
}

function resolveUiCatalogLog(
  catalogKey: string,
  fallback: string,
  vars?: LogVars,
): string {
  if (catalogKey.startsWith("auth.")) {
    const translated = tWithFallback("ui", catalogKey, fallback, vars);
    return translated.trim() ? translated : fallback;
  }
  return translateLogEntry(catalogKey, fallback, vars);
}

function resolveSkillName(skillKey: string): string {
  let canonicalKey = skillKey;
  const skillCatalog = enLog.log.buttonUpgrade?.skills;
  if (skillCatalog && !(canonicalKey in skillCatalog)) {
    const label = UPGRADE_LABELS[skillKey as UpgradeKey];
    if (label) {
      const matchedKey = Object.keys(skillCatalog).find(
        (key) => UPGRADE_LABELS[key as UpgradeKey] === label,
      );
      if (matchedKey) {
        canonicalKey = matchedKey;
      }
    }
  }

  const fallback =
    UPGRADE_LABELS[canonicalKey as UpgradeKey] ??
    UPGRADE_LABELS[skillKey as UpgradeKey] ??
    skillKey;
  return translateLogKey(`buttonUpgrade.skills.${canonicalKey}`, fallback);
}

function expandLogVars(
  logKey: string,
  vars: LogVars | undefined,
  fallbackMessage: string,
): LogVars | undefined {
  if (logKey === "buttonUpgrade.deepens") {
    if (vars?.skillKey) {
      return { skill: resolveSkillName(String(vars.skillKey)) };
    }
    if (vars?.skill) {
      return vars;
    }
    const match = fallbackMessage.match(/^Your mastery of (.+) deepens\.$/);
    if (match?.[1]) {
      const skillName = match[1];
      const skillKey = Object.entries(UPGRADE_LABELS).find(
        ([, label]) => label === skillName,
      )?.[0];
      if (skillKey) {
        return { skill: resolveSkillName(skillKey) };
      }
      return { skill: skillName };
    }
  }
  return vars;
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
  {
    pattern:
      /^You received (\d+) Gold as a welcome bonus for creating an account!$/,
    resolve: ([, amount]) => ({
      logKey: "auth.signupWelcomeLog",
      vars: { amount: Number(amount) },
    }),
  },
  {
    pattern: /^Your mastery of (.+) deepens\.$/,
    resolve: ([, skillName]) => {
      const skillKey = Object.entries(UPGRADE_LABELS).find(
        ([, label]) => label === skillName,
      )?.[0];
      return {
        logKey: "buttonUpgrade.deepens",
        vars: skillKey ? { skillKey } : { skill: skillName },
      };
    },
  },
];

const LEGACY_ACTION_LOG_MESSAGES: Array<{
  actionId: string;
  logKey: string;
  message: string;
}> = [
    {
      actionId: "blastPortal",
      logKey: "complete",
      message:
        "The ember bombs detonate in a bright flash of fire and light. The ancient gate cracks and crumbles. Whatever could have been sealed within has been released. The city should get ready for whatever comes out of there.",
    },
    {
      actionId: "lowChamber",
      logKey: "complete",
      message:
        "Using the reinforced rope, you descend into the low chamber. Amongst the treasures you find a mastermason's chisel, a tool of legendary craftsmanship.",
    },
    {
      actionId: "occultistChamber",
      logKey: "complete",
      message:
        "Following the occultist's map, you find the chamber containing his treasures. Amongst them is his grimoire, filled with forbidden knowledge and arcane secrets.",
    },
    {
      actionId: "exploreUndergroundLake",
      logKey: "complete",
      message:
        "Using the skull lantern's grim glow, you descend to the underground lake and build a small boat. On a tiny island in the middle of the dark lake, forgotten treasures lie in shadow, untouched for ages.",
    },
    {
      actionId: "lureLakeCreature",
      logKey: "complete",
      message:
        "You set a massive trap at the edge of the underground lake, baited with piles of meat. Hours pass before the black waters erupt, and a titanic, tentacled horror rises from the depths and crawls into the trap.",
    },
    {
      actionId: "hiddenLibrary",
      logKey: "complete",
      message:
        "The monastery's map leads you deep into the cave to the hidden library where you find a codex.",
    },
    {
      actionId: "forestCave",
      logKey: "success",
      message:
        "As the villagers descend the cave, savage hounds erupt from darkness in relentless packs. Screams echo as claws tear and teeth snap. When the last creature falls, all villagers survive, but hollowed by what they've endured.",
    },
    {
      actionId: "forestCave",
      logKey: "success",
      message:
        "As the villagers descend the cave, savage hounds erupt from darkness in relentless packs. Screams echo as claws tear and teeth snap. When the last creature falls, all villagers survive, but hollowed by what they\u2019ve endured.",
    },
    {
      actionId: "forestCave",
      logKey: "failure",
      message:
        "As the expedition enters the cave it is overwhelmed by a pack of brutal hounds. {{count}} villagers are torn apart by savage jaws before the survivors manage to retreat.",
    },
    {
      actionId: "blackreachCanyon",
      logKey: "success",
      message:
        "You venture deep into Blackreach Canyon. There, perched on a stone pillar, sits a magnificent one-eyed crow. Using the harness, your carefully approach and bond with the creature. The One-eyed Crow has joined your fellowship.",
    },
  ];

function resolveLegacySystemLog(message: string): string | null {
  if (message === "You find an old, dusty bag with 25 Torches in the cave.") {
    return getActionLogMessage("exploreCave", "torchBag", message);
  }

  for (const entry of LEGACY_ACTION_LOG_MESSAGES) {
    if (message === entry.message) {
      return getActionLogMessage(entry.actionId, entry.logKey, entry.message);
    }
  }

  const forestCaveFailure = message.match(
    /^As the expedition enters the cave it is overwhelmed by a pack of brutal hounds\. (\d+) villagers are torn apart by savage jaws before the survivors manage to retreat\.$/,
  );
  if (forestCaveFailure) {
    return getActionLogMessage(
      "forestCave",
      "failure",
      "As the expedition enters the cave it is overwhelmed by a pack of brutal hounds. {{count}} villagers are torn apart by savage jaws before the survivors manage to retreat.",
      { count: Number(forestCaveFailure[1]) },
    );
  }

  const exactKey = LEGACY_EXACT_SYSTEM_LOG[message];
  if (exactKey) {
    return translateLogKey(exactKey, message);
  }

  for (const { pattern, resolve } of LEGACY_SYSTEM_LOG_MATCHERS) {
    const match = message.match(pattern);
    if (match) {
      const { logKey, vars } = resolve(match);
      return resolveUiCatalogLog(logKey, message, vars);
    }
  }
  return null;
}

/** English event messages from saves written before display-time event localization. */
function buildLegacyEnglishEventMessageMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [eventId, def] of Object.entries(enEvents)) {
    if (
      def &&
      typeof def === "object" &&
      "message" in def &&
      typeof def.message === "string"
    ) {
      map[def.message] = eventId;
    }
  }
  return map;
}

const LEGACY_EN_EVENT_MESSAGES = buildLegacyEnglishEventMessageMap();

function parseEventIdFromLogEntryId(id: string): string | undefined {
  const match = id.match(/^(.+)-(\d{10,})$/);
  if (!match) return undefined;
  const candidate = match[1];
  return gameEvents[candidate] ? candidate : undefined;
}

function getEnglishEventCatalogMessage(catalogId: string): string {
  if (i18n.exists(`events:${catalogId}.message.default`)) {
    return i18n.t(`events:${catalogId}.message.default`, { lng: "en" });
  }
  if (i18n.exists(`events:${catalogId}.message`)) {
    return i18n.t(`events:${catalogId}.message`, { lng: "en" });
  }
  return "";
}

function resolveEventLogPanelMessage(entry: LogEntry): string | null {
  const eventId =
    entry.eventId ??
    parseEventIdFromLogEntryId(entry.id) ??
    LEGACY_EN_EVENT_MESSAGES[entry.message];
  if (!eventId) return null;

  const eventDef = gameEvents[eventId];
  if (!eventDef) return null;

  const catalogId = getEventCatalogIdByEventId(eventId);

  if (eventDef.message === undefined) {
    const localized = resolveEventMessage(
      catalogId,
      undefined,
      {} as GameState,
    );
    return localized.trim() ? localized : null;
  }

  const enMessage = getEnglishEventCatalogMessage(catalogId);
  if (enMessage && entry.message === enMessage) {
    const localized = resolveEventMessage(
      catalogId,
      eventDef.message,
      {} as GameState,
    );
    return localized.trim() ? localized : null;
  }

  return null;
}

/** Display text for a log panel row (re-localizes system lines from keys or English fallbacks). */
export function resolveLogPanelMessage(entry: LogEntry): string {
  if (entry.logKey) {
    return resolveUiCatalogLog(entry.logKey, entry.message, entry.logVars);
  }

  if (entry.type === "system") {
    const legacy = resolveLegacySystemLog(entry.message);
    if (legacy) return legacy;
  }

  if (entry.type === "event") {
    const eventLog = resolveEventLogPanelMessage(entry);
    if (eventLog) return eventLog;
  }

  return entry.message;
}
