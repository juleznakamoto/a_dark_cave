import type { LogEntry } from "@/game/rules/events";
import {
  gameEvents,
  getEventCatalogIdByEventId,
} from "@/game/rules/events";
import { UPGRADE_LABELS, type UpgradeKey } from "@/game/buttonUpgrades";
import {
  getActionLogMessage,
  getStartScreenNarrativeLogMessage,
  inferCruelModeFromStartNarrativeMessage,
  START_NARRATIVE_LOG_KEY,
  tWithFallback,
} from "@/i18n/resolveGameText";
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
  for (const section of ["crafting", "sacrifice"] as const) {
    const entries = enLog.log[section];
    if (!entries) continue;
    for (const [key, value] of Object.entries(entries)) {
      if (typeof value === "string") {
        map[value] = `${section}.${key}`;
      }
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

function isStrangerLogKey(logKey: string): boolean {
  return logKey.startsWith("stranger.");
}

/** English fallbacks / combined action lines where population increased. */
function messageIndicatesNewVillagers(message: string): boolean {
  for (const { pattern, resolve } of LEGACY_SYSTEM_LOG_MATCHERS) {
    const match = message.match(pattern);
    if (!match) continue;
    const { logKey } = resolve(match);
    if (isStrangerLogKey(logKey)) return true;
  }
  return /captives? from the camp choose? to join the village\.?$/.test(message);
}

/** True when a log row describes new villagers joining (white dot in event log). */
export function isNewVillagerLogEntry(entry: LogEntry): boolean {
  if (entry.newVillagers) return true;
  if (entry.logKey && isStrangerLogKey(entry.logKey)) return true;
  if (entry.id.startsWith("stranger-approaches-")) return true;
  const message = entry.message?.trim();
  if (message && messageIndicatesNewVillagers(message)) return true;
  return false;
}

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
    {
      actionId: "castleRuins",
      logKey: "success",
      message:
        "The expedition to the dead necromancer's castle ruins proves successful! Deep within them you find the ancient scrolls wrapped in dark silk, revealing cryptic knowledge about how to defeat what was locked deep in the cave.",
    },
    {
      actionId: "castleRuins",
      logKey: "success",
      message:
        "The expedition to the dead necromancer's castle ruins proves successful! Deep within the you find the ancient scrolls wrapped in dark silk, revealing cryptic knowledge about how to defeat what was locked deep in the cave.",
    },
    {
      actionId: "castleRuins",
      logKey: "minorFailure",
      message:
        "Your expedition is ambushed by grotesque undead experiments left behind by the necromancer. {{count}} villagers fall to the undead before the survivors manage to retreat.",
    },
    {
      actionId: "castleRuins",
      logKey: "majorFailure",
      message:
        "Shortly after your expedition enters the cursed castle ruins dozens of undead creatures pour from hidden chambers. In the desperate battle that follows, {{count}} villagers are overwhelmed by the supernatural horde. The survivors flee in terror.",
    },
    {
      actionId: "banditLair",
      logKey: "success",
      message:
        "Your party tracks the bandit to a ramshackle lair. You overwhelm him, recover the trader's dagger, and find 250 silver stashed among his plunder.",
    },
    {
      actionId: "banditLair",
      logKey: "failure",
      message:
        "Your villagers search the hills but cannot corner the bandit. The trail goes cold, and the dagger is still in his hands.",
    },
    {
      actionId: "canyonBridge",
      logKey: "complete",
      message:
        "The canyon bridge stands complete. Ashwraith traders can now reach your settlement—and you can sell goods to them at agreed rates.",
    },
    {
      actionId: "collapsedTower",
      logKey: "success",
      message:
        "Inside the tower you find a necromancer and his followers, surrounded by vials of liquids and crude syringes. He was harvesting the villagers' blood for dark experiments. Your men put an end to his vile work and take a vial of his blood. Among his tools, you find his powerful bone saw.",
    },
    {
      actionId: "hillGrave",
      logKey: "success",
      message:
        "Your expedition carefully navigates the treacherous traps of the hill grave. Your villagers disarm the ancient mechanisms and reach the burial chamber. Among the king's treasures, you discover pure frostglass, cold as the void itself.",
    },
    {
      actionId: "hunt",
      logKey: "mapFragmentHunt",
      message:
        "While hunting, something catches your eye in the mud. A water-stained scrap, perhaps part of a map.",
    },
    {
      actionId: "layTrap",
      logKey: "trapSuccessNoDeaths",
      message:
        "The giant trap works perfectly! A massive black bear with glowing red eyes is caught. Your villagers slay the supernatural beast and claim its cursed black fur as a trophy.",
    },
    {
      actionId: "layTrap",
      logKey: "trapFailed",
      message:
        "The giant trap is set, but when checked only giant claw marks are found next to it. Whatever prowls these forests is too cunning for your trap... this time.",
    },
    {
      actionId: "risingSmoke",
      logKey: "success",
      message:
        "Your expedition finds an outlaw camp. The fight is brutal, but you win. In a chest you find 500 Gold.",
    },
    {
      actionId: "steelDelivery",
      logKey: "success",
      message:
        "Your caravan delivers the steel to the Swamp Tribe as promised. In return, the tribe presents you with Chitin Plates harvested from swamp creatures. These can be used to construct powerful fortifications.",
    },
    {
      actionId: "sunkenTemple",
      logKey: "success",
      message:
        "Your expedition wades through the swamp waters to reach the ancient half-sunken temple. Despite the dangers lurking in the dark waters, the villagers navigate carefully through the submerged halls and find the bloodstone gems in the temple's inner sanctum.",
    },
  ];

function resolveLegacyRisingSmokeSuccess(message: string): string | null {
  const base =
    "Your expedition finds an outlaw camp. The fight is brutal, but you win. In a chest you find 500 Gold.";
  if (!message.startsWith(base)) return null;

  let text = getActionLogMessage("risingSmoke", "success", base);
  const remainder = message.slice(base.length);

  const keySuffix =
    " With your skeleton key you open a hidden compartment and find another 250 Gold.";
  let rest = remainder;
  if (rest.startsWith(keySuffix)) {
    text += getActionLogMessage("risingSmoke", "successKeyBonus", keySuffix);
    rest = rest.slice(keySuffix.length);
  }

  const captiveOneSuffix =
    " 1 captive from the camp chooses to join the village.";
  const captiveOtherMatch = rest.match(
    /^ (\d+) captives from the camp choose to join the village\.$/,
  );
  if (rest === captiveOneSuffix) {
    text += getActionLogMessage("risingSmoke", "captiveOne", captiveOneSuffix);
  } else if (captiveOtherMatch) {
    text += getActionLogMessage(
      "risingSmoke",
      "captivesOther",
      " {{count}} captives from the camp choose to join the village.",
      { count: Number(captiveOtherMatch[1]) },
    );
  } else if (rest !== "") {
    return null;
  }

  return text;
}

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

  const castleRuinsMinorFailure = message.match(
    /^Your expedition is ambushed by grotesque undead experiments left behind by the necromancer\. (\d+) villagers? falls? to the undead before the survivors manage to retreat\.$/,
  );
  if (castleRuinsMinorFailure) {
    return getActionLogMessage(
      "castleRuins",
      "minorFailure",
      "Your expedition is ambushed by grotesque undead experiments left behind by the necromancer. {{count}} villagers fall to the undead before the survivors manage to retreat.",
      { count: Number(castleRuinsMinorFailure[1]) },
    );
  }

  const castleRuinsMajorFailure = message.match(
    /^Shortly after your expedition enters the cursed castle ruins dozens of undead creatures pour from hidden chambers\. In the desperate battle that follows, (\d+) villagers are overwhelmed by the supernatural horde\. The survivors flee in terror\.$/,
  );
  if (castleRuinsMajorFailure) {
    return getActionLogMessage(
      "castleRuins",
      "majorFailure",
      "Shortly after your expedition enters the cursed castle ruins dozens of undead creatures pour from hidden chambers. In the desperate battle that follows, {{count}} villagers are overwhelmed by the supernatural horde. The survivors flee in terror.",
      { count: Number(castleRuinsMajorFailure[1]) },
    );
  }

  const risingSmokeSuccess = resolveLegacyRisingSmokeSuccess(message);
  if (risingSmokeSuccess) return risingSmokeSuccess;

  const hillGraveFailure = message.match(
    /^Your expedition enters the hill grave but lacks the skill to navigate its deadly traps\. (\d+) villagers fall to the king's final defenses before the survivors retreat in horror, leaving their companions' bodies in the cursed tomb\.$/,
  );
  if (hillGraveFailure) {
    return getActionLogMessage(
      "hillGrave",
      "failure",
      "Your expedition enters the hill grave but lacks the skill to navigate its deadly traps. {{count}} villagers fall to the king's final defenses before the survivors retreat in horror, leaving their companions' bodies in the cursed tomb.",
      { count: Number(hillGraveFailure[1]) },
    );
  }

  const sunkenTempleFailure = message.match(
    /^Your expedition ventures into the swamp, seeking the sunken temple\. The murky waters hide unspeakable horrors\. Abominable creatures born of ancient magic rise from the depths and drag (\d+) villagers beneath the surface before the survivors flee\.$/,
  );
  if (sunkenTempleFailure) {
    return getActionLogMessage(
      "sunkenTemple",
      "failure",
      "Your expedition ventures into the swamp, seeking the sunken temple. The murky waters hide unspeakable horrors. Abominable creatures born of ancient magic rise from the depths and drag {{count}} villagers beneath the surface before the survivors flee.",
      { count: Number(sunkenTempleFailure[1]) },
    );
  }

  const collapsedTowerFailure = message.match(
    /^Your expedition reaches the Collapsed Tower, but you are attacked by hooded figures outside\. A tall man in a dark robe stands among them, commanding an aura of menace\. (\d+) villagers fall before the rest flee to safety\.$/,
  );
  if (collapsedTowerFailure) {
    return getActionLogMessage(
      "collapsedTower",
      "failure",
      "Your expedition reaches the Collapsed Tower, but you are attacked by hooded figures outside. A tall man in a dark robe stands among them, commanding an aura of menace. {{count}} villagers fall before the rest flee to safety.",
      { count: Number(collapsedTowerFailure[1]) },
    );
  }

  const layTrapWithDeaths = message.match(
    /^The giant trap snares a colossal black bear with burning red eyes! (\d+) (?:brave )?villagers? falls? to its supernatural claws before the beast is finally slain\. You claim its cursed black fur as a hard-won trophy\.$/,
  );
  if (layTrapWithDeaths) {
    return getActionLogMessage(
      "layTrap",
      "trapSuccessWithDeaths",
      "The giant trap snares a colossal black bear with burning red eyes! {{count}} villagers fall to its supernatural claws before the beast is finally slain. You claim its cursed black fur as a hard-won trophy.",
      { count: Number(layTrapWithDeaths[1]) },
    );
  }

  const layTrapHeavy = message.match(
    /^The giant trap snares a colossal black bear with eyes like burning coals\. (\d+) villagers fall to its supernatural fury before the beast is finally overwhelmed\. You claim its cursed black fur\.$/,
  );
  if (layTrapHeavy) {
    return getActionLogMessage(
      "layTrap",
      "trapSuccessHeavy",
      "The giant trap snares a colossal black bear with eyes like burning coals. {{count}} villagers fall to its supernatural fury before the beast is finally overwhelmed. You claim its cursed black fur.",
      { count: Number(layTrapHeavy[1]) },
    );
  }

  const risingSmokeFailure = message.match(
    /^Your expedition reaches an outlaw camp, but the fight goes terribly wrong\. (\d+) villagers? falls? before the survivors flee back to the village\.$/,
  );
  if (risingSmokeFailure) {
    return getActionLogMessage(
      "risingSmoke",
      "failure",
      "Your expedition reaches an outlaw camp, but the fight goes terribly wrong. {{count}} villagers fall before the survivors flee back to the village.",
      { count: Number(risingSmokeFailure[1]) },
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

/** Re-localize reward/outcome dialog narrative stored as English or a prior locale. */
export function resolveOutcomeLogMessage(
  message: string | undefined,
): string | undefined {
  if (!message?.trim()) return undefined;
  return resolveLogPanelMessage({
    id: "outcome",
    message,
    timestamp: 0,
    type: "system",
  });
}

function resolveStartNarrativeLogMessage(entry: LogEntry): string | null {
  if (entry.logKey === START_NARRATIVE_LOG_KEY || entry.id === "initial-narrative") {
    const cruelFromVars = entry.logVars?.cruelMode;
    const cruel =
      cruelFromVars === 1 ||
      cruelFromVars === true ||
      (cruelFromVars === undefined &&
        inferCruelModeFromStartNarrativeMessage(entry.message));
    return getStartScreenNarrativeLogMessage(cruel);
  }
  return null;
}

/** Display text for a log panel row (re-localizes system lines from keys or English fallbacks). */
export function resolveLogPanelMessage(entry: LogEntry): string {
  const startNarrative = resolveStartNarrativeLogMessage(entry);
  if (startNarrative) return startNarrative;

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
