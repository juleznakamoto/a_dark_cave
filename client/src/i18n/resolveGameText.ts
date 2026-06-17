import i18n from "i18next";
import type { GameState } from "@shared/schema";
import { clothingEffects } from "@/game/rules/effects";
import { capitalizeWords } from "@/lib/utils";
import { normalizeLocale } from "./locales";

export type TranslateOptions = Record<
  string,
  string | number | boolean | undefined
>;

/** Read a leaf string from a loaded i18n resource bundle (dot-path). */
export function getCatalogString(
  locale: string,
  namespace: string,
  key: string,
): string | undefined {
  const bundle = i18n.getResourceBundle(locale, namespace);
  if (!bundle) return undefined;
  let cur: unknown = bundle;
  for (const part of key.split(".")) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

function nsKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Interpolate `{key}` and i18next-style `{{key}}` placeholders in fallback strings. */
export function interpolateFallback(
  fallback: string,
  options: TranslateOptions,
): string {
  return Object.entries(options).reduce((text, [k, v]) => {
    const value = String(v ?? "");
    const key = escapeRegExp(k);
    return text
      .replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value)
      .replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }, fallback);
}

/** Translate with fallback when catalog key is missing (migration-friendly). */
export function tWithFallback(
  namespace: string,
  key: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  const fullKey = nsKey(namespace, key);
  const defaultValue =
    !options || Object.keys(options).length === 0
      ? fallback
      : interpolateFallback(fallback, options);

  const lng = normalizeLocale(i18n.resolvedLanguage ?? i18n.language);
  const translateOpts = {
    ...(options as Record<string, unknown>),
    lng,
    ns: namespace,
  };

  // Use ns + key for exists/t (ui:… exists checks can miss sharded ui keys in some runtimes).
  if (i18n.exists(key, { ns: namespace, lng })) {
    const translated = i18n.t(key, translateOpts);
    if (typeof translated === "string" && translated.trim()) {
      return translated;
    }
  }

  // Plural keys like villagerCost_one/_other resolve via count but exists("…villagerCost") is false.
  const translated = i18n.t(key, translateOpts);
  if (
    typeof translated === "string" &&
    translated.trim() &&
    translated !== fullKey &&
    translated !== key
  ) {
    return translated;
  }
  return defaultValue;
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

/** Resolve any `events.json` key (e.g. `merchant.toolTrades.trade_clarity_elixir.message`). */
export function getEventsCatalogText(
  relativeKey: string,
  options?: TranslateOptions,
): string {
  const fullKey = nsKey("events", relativeKey);
  if (!i18n.exists(fullKey)) {
    return "";
  }
  const translated = i18n.t(fullKey, options as Record<string, unknown>);
  return typeof translated === "string" ? translated : "";
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

/** Resolve localized system log line (ui:log.* catalog). */
export function getUiLogMessage(
  logKey: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  return tWithFallback("ui", `log.${logKey}`, fallback, options);
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

/**
 * Resolve an action log line when loot keys are defined on an earlier stage
 * (e.g. exploreCave debrisScroll proccing during ventureDeeper).
 */
export function resolveInheritedActionLogMessage(
  actionId: string,
  logKey: string,
  fallbackCatalog: Record<string, Record<string, string>>,
  options?: TranslateOptions,
): string {
  const actionLogKey = (catalogActionId: string) =>
    nsKey("actions", `${catalogActionId}.log.${logKey}`);

  const directFallback = fallbackCatalog[actionId]?.[logKey] ?? "";
  if (i18n.exists(actionLogKey(actionId))) {
    return getActionLogMessage(actionId, logKey, directFallback, options);
  }

  for (const [catalogActionId, keys] of Object.entries(fallbackCatalog)) {
    if (catalogActionId === actionId) continue;
    const fallback = keys[logKey];
    if (!fallback) continue;
    if (i18n.exists(actionLogKey(catalogActionId))) {
      return getActionLogMessage(catalogActionId, logKey, fallback, options);
    }
  }

  for (const [catalogActionId, keys] of Object.entries(fallbackCatalog)) {
    const fallback = keys[logKey];
    if (fallback) {
      return getActionLogMessage(catalogActionId, logKey, fallback, options);
    }
  }

  return directFallback;
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

/**
 * Display name for items owned in `clothing` or `relics` game state.
 * i18n catalogs use `effects.clothing.*` for both (no separate relics namespace).
 */
export function getClothingOrRelicEffectName(effectId: string): string {
  return getEffectName(
    "clothing",
    effectId,
    clothingEffects[effectId]?.name || capitalizeWords(effectId),
  );
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

/** English fallback for saves / legacy rows (display re-localizes via logKey). */
export function getStartScreenNarrativeEnglishFallback(cruelMode: boolean): string {
  if (cruelMode) {
    return [
      i18n.t("ui:startScreen.titleCruel", { lng: "en" }),
      i18n.t("ui:startScreen.airCruel", { lng: "en" }),
      i18n.t("ui:startScreen.seeCruel", { lng: "en" }),
    ].join(" ");
  }
  return [
    i18n.t("ui:startScreen.titleNormal", { lng: "en" }),
    i18n.t("ui:startScreen.airNormal", { lng: "en" }),
    i18n.t("ui:startScreen.seeNormal", { lng: "en" }),
  ].join(" ");
}

export const START_NARRATIVE_LOG_KEY = "gameplay.startNarrative";

export function inferCruelModeFromStartNarrativeMessage(message: string): boolean {
  const cruelEn = getStartScreenNarrativeEnglishFallback(true);
  if (message === cruelEn) return true;
  const cruelDe = [
    i18n.t("ui:startScreen.titleCruel", { lng: "de" }),
    i18n.t("ui:startScreen.airCruel", { lng: "de" }),
    i18n.t("ui:startScreen.seeCruel", { lng: "de" }),
  ].join(" ");
  return message === cruelDe || message.startsWith("A very dark cave.");
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
