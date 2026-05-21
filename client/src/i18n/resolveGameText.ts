import i18n from "i18next";
import type { GameState } from "@shared/schema";

type TranslateOptions = Record<string, string | number | boolean | undefined>;

function nsKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

/** Translate with fallback when catalog key is missing (migration-friendly). */
export function tWithFallback(
  namespace: string,
  key: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  const fullKey = nsKey(namespace, key);
  if (i18n.exists(fullKey)) {
    return i18n.t(fullKey, options as Record<string, unknown>);
  }
  if (!options || Object.keys(options).length === 0) return fallback;
  return Object.entries(options).reduce(
    (text, [k, v]) => text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v ?? "")),
    fallback,
  );
}

export function getEventTitle(
  eventId: string,
  fallback: string | undefined,
  _state?: GameState,
): string | undefined {
  if (!fallback) return undefined;
  return tWithFallback("events", `${eventId}.title`, fallback);
}

export function getEventMessage(
  eventId: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  return tWithFallback("events", `${eventId}.message`, fallback, options);
}

export function getEventChoiceLabel(
  eventId: string,
  choiceId: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  return tWithFallback(
    "events",
    `${eventId}.choices.${choiceId}.label`,
    fallback,
    options,
  );
}

export function getEventLogMessage(
  eventId: string,
  logKey: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  return tWithFallback("events", `${eventId}.log.${logKey}`, fallback, options);
}

/** Resolve event log text by catalog key (no English fallback string). */
export function resolveEventLogMessage(
  eventId: string,
  logKey: string,
  options?: TranslateOptions,
): string {
  const fullKey = nsKey("events", `${eventId}.log.${logKey}`);
  if (i18n.exists(fullKey)) {
    return i18n.t(fullKey, options as Record<string, unknown>);
  }
  return "";
}

/**
 * Match a runtime log string to an extracted catalog entry by comparing English source text.
 */
export function getEventLogMessageByFallback(
  eventId: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  for (let i = 0; i < 30; i++) {
    const key = `${eventId}.log.outcome${i}`;
    const fullKey = nsKey("events", key);
    if (i18n.exists(fullKey)) {
      const enVal = i18n.t(fullKey, { lng: "en" });
      if (enVal === fallback) {
        return i18n.t(fullKey, options as Record<string, unknown>);
      }
    } else if (i > 0) {
      break;
    }
  }
  return fallback;
}

/** Cave mine buttons show the resource name only (section title is "Mine"). */
const MINE_ACTION_RESOURCE_KEY: Record<string, string> = {
  mineStone: "stone",
  mineIron: "iron",
  mineCoal: "coal",
  mineSulfur: "sulfur",
  mineObsidian: "obsidian",
  mineAdamant: "adamant",
};

export function getActionLabel(actionId: string, fallback: string): string {
  const resourceKey = MINE_ACTION_RESOURCE_KEY[actionId];
  if (resourceKey) {
    return tWithFallback("common", `resources.${resourceKey}`, fallback);
  }
  return tWithFallback("actions", `${actionId}.label`, fallback);
}

/** Resolve localized action log line (e.g. cave explore loot messages). */
export function getActionLogMessage(
  actionId: string,
  logKey: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  return tWithFallback(
    "actions",
    `${actionId}.log.${logKey}`,
    fallback,
    options,
  );
}

export function getActionDescription(
  actionId: string,
  fallback: string | undefined,
): string | undefined {
  if (!fallback) return undefined;
  return tWithFallback("actions", `${actionId}.description`, fallback);
}

export function getActionTooltipLine(
  actionId: string,
  tooltipKey: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  return tWithFallback(
    "actions",
    `${actionId}.tooltips.${tooltipKey}`,
    fallback,
    options,
  );
}

export function getEffectName(
  category: "tools" | "weapons" | "clothing" | "books" | "fellowship" | "relics" | "blessings" | "buildings",
  effectId: string,
  fallback: string,
): string {
  return tWithFallback("effects", `${category}.${effectId}.name`, fallback);
}

export function getEffectDescription(
  category: "tools" | "weapons" | "clothing" | "books" | "fellowship" | "relics" | "blessings" | "buildings",
  effectId: string,
  fallback: string | undefined,
): string | undefined {
  if (!fallback) return undefined;
  return tWithFallback("effects", `${category}.${effectId}.description`, fallback);
}

export function getShopItemName(itemId: string, fallback: string): string {
  return tWithFallback("shop", `${itemId}.name`, fallback);
}

export function getShopItemDescription(
  itemId: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  return tWithFallback("shop", `${itemId}.description`, fallback, options);
}

export function getShopActivationMessage(
  itemId: string,
  fallback: string | undefined,
  options?: TranslateOptions,
): string | undefined {
  if (!fallback) return undefined;
  return tWithFallback("shop", `${itemId}.activationMessage`, fallback, options);
}

export function getAchievementLabel(
  chartPrefix: string,
  segmentId: string,
  fallback: string,
): string {
  return tWithFallback("achievements", `${chartPrefix}.${segmentId}.label`, fallback);
}

export function getResourceName(resourceKey: string, fallback: string): string {
  return tWithFallback("common", `resources.${resourceKey}`, fallback);
}

/** Opening narrative log line (matches startScreen.* composition). */
export function getStartScreenNarrativeLogMessage(cruelMode: boolean): string {
  if (cruelMode) {
    return [
      i18n.t("ui:startScreen.titleCruel"),
      i18n.t("ui:startScreen.airCruel"),
      i18n.t("ui:startScreen.seeCruel"),
    ].join(" ");
  }
  return [
    i18n.t("ui:startScreen.titleNormal"),
    i18n.t("ui:startScreen.airNormal"),
    i18n.t("ui:startScreen.seeNormal"),
  ].join(" ");
}

export function getStatName(statKey: string, fallback: string): string {
  return tWithFallback("common", `stats.${statKey}`, fallback);
}

/** Side-panel population row (ui.village.jobs.* or sidePanel.freeVillagers). */
export function getVillagerJobName(jobKey: string, fallback: string): string {
  if (jobKey === "free") {
    return tWithFallback("ui", "sidePanel.freeVillagers", fallback);
  }
  return tWithFallback("ui", `village.jobs.${jobKey}`, fallback);
}

const BONUS_SIDEBAR_LABEL_KEYS: Record<string, string> = {
  caveExplore: "bonuses.caveExplore",
  chopWood: "bonuses.chopWood",
  hunt: "bonuses.hunt",
  mining: "bonuses.mineAll",
  mineStone: "bonuses.mineStone",
  mineIron: "bonuses.mineIron",
  mineCoal: "bonuses.mineCoal",
  mineSulfur: "bonuses.mineSulfur",
  mineObsidian: "bonuses.mineObsidian",
  mineAdamant: "bonuses.mineAdamant",
  craftBoneTotems: "bonuses.boneTotems",
  craftLeatherTotems: "bonuses.leatherTotems",
};

function formatBonusActionFallback(actionId: string): string {
  return actionId
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Side-panel bonus row label (ui.bonuses.*). */
export function getBonusSidebarLabel(actionId: string): string {
  const catalogKey = BONUS_SIDEBAR_LABEL_KEYS[actionId];
  const fallback = formatBonusActionFallback(actionId);
  if (catalogKey) {
    return tWithFallback("ui", catalogKey, fallback);
  }
  return tWithFallback("ui", `bonuses.${actionId}`, fallback);
}
