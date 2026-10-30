import i18n from "i18next";
import type { GameEvent, EventChoice } from "@/game/rules/eventTypes";
import type { GameState } from "@shared/schema";
import { SUPPORTED_LOCALES } from "./locales";

type TranslateOptions = Record<string, string | number | boolean | undefined>;

export function getEventCatalogId(event: {
  id: string;
  i18nKey?: string | (() => string);
}): string {
  const key =
    typeof event.i18nKey === "function" ? event.i18nKey() : event.i18nKey;
  return key ?? event.id;
}

function eventKey(catalogId: string, suffix: string): string {
  return `events:${catalogId}.${suffix}`;
}

function tEvent(
  catalogId: string,
  suffix: string,
  options?: TranslateOptions,
): string {
  const key = eventKey(catalogId, suffix);
  if (i18n.exists(key)) {
    const result = i18n.t(key, options as Record<string, unknown>);
    if (typeof result !== "string" || isI18nReturnedObjectError(result)) {
      return "";
    }
    return result;
  }
  return "";
}

function hasNestedCatalogKey(catalogId: string, prefix: string): boolean {
  return (
    i18n.exists(eventKey(catalogId, `${prefix}.level1`)) ||
    i18n.exists(eventKey(catalogId, `${prefix}.woman`)) ||
    i18n.exists(eventKey(catalogId, `${prefix}.man`))
  );
}

function choiceLabelPrefix(choiceId: string): string {
  return `choices.${choiceId}.label`;
}

/** True when `labelDef` is a catalog variant key (e.g. gender), not player-facing text. */
function isChoiceLabelVariantKey(value: string): boolean {
  return value === "woman" || value === "man" || /^level\d+$/.test(value);
}

function resolveEventChoiceVariantLabel(
  catalogId: string,
  choiceId: string,
  variant: string,
  vars?: TranslateOptions,
): string {
  return tEvent(catalogId, `${choiceLabelPrefix(choiceId)}.${variant}`, vars);
}

/** True when i18next fell back to its "object instead of string" dev message. */
export function isI18nReturnedObjectError(text: string): boolean {
  return text.includes("returned an object instead of string");
}

/** Catalog messages may be a string (`message`) or nested (`message.default`). */
function resolveCatalogMessage(
  catalogId: string,
  vars?: TranslateOptions,
): string {
  if (i18n.exists(eventKey(catalogId, "message.default"))) {
    return tEvent(catalogId, "message.default", vars);
  }
  return tEvent(catalogId, "message", vars);
}

/** Resolve event title from catalog (empty string if missing). */
export function resolveEventTitle(
  catalogId: string,
  titleDefOrState?: GameEvent["title"] | GameState,
  stateOrVars?: GameState | TranslateOptions,
  vars?: TranslateOptions,
): string | undefined {
  let titleDef: GameEvent["title"] | undefined;
  let state: GameState | undefined;
  let v: TranslateOptions | undefined;

  if (
    typeof titleDefOrState === "function" ||
    typeof titleDefOrState === "string"
  ) {
    titleDef = titleDefOrState;
    state = stateOrVars as GameState | undefined;
    v = vars;
  } else if (vars !== undefined) {
    // (catalogId, undefined, state, i18nVars) — no title def on the event
    state = stateOrVars as GameState | undefined;
    v = vars;
  } else {
    state = titleDefOrState as GameState | undefined;
    v = stateOrVars as TranslateOptions | undefined;
  }

  if (typeof titleDef === "function" && state) {
    const variant = titleDef(state);
    if (typeof variant === "string") {
      const variantTitle = tEvent(catalogId, `title.${variant}`, v);
      if (variantTitle) return variantTitle;
    }
  }

  if (v?.level !== undefined) {
    const levelTitle = tEvent(catalogId, `title.level${v.level}`, v);
    if (levelTitle) return levelTitle;
  }
  if (!hasNestedCatalogKey(catalogId, "title")) {
    const title = tEvent(catalogId, "title", v);
    if (title) return title;
  }
  return undefined;
}

/** Resolve static, variant, or array message from catalog. */
export function resolveEventMessage(
  catalogId: string,
  messageDef: GameEvent["message"],
  state: GameState,
  vars?: TranslateOptions,
): string {
  if (messageDef === undefined) {
    return resolveCatalogMessage(catalogId, vars);
  }

  if (typeof messageDef === "function") {
    const variant = messageDef(state);
    if (typeof variant !== "string") return "";
    const variantText = tEvent(catalogId, `message.${variant}`, vars);
    if (variantText) return variantText;
    return resolveCatalogMessage(catalogId, vars);
  }

  if (Array.isArray(messageDef)) {
    const idx = Math.floor(Math.random() * messageDef.length);
    const variantKey = `message.${idx}`;
    const variantText = tEvent(catalogId, variantKey, vars);
    if (variantText) return variantText;
    return resolveCatalogMessage(catalogId, vars);
  }

  if (typeof messageDef === "string") {
    const variantText = tEvent(catalogId, `message.${messageDef}`, vars);
    if (variantText) return variantText;
    return resolveCatalogMessage(catalogId, vars);
  }

  return resolveCatalogMessage(catalogId, vars);
}

export function resolveEventChoiceLabel(
  catalogId: string,
  choiceId: string,
  vars?: TranslateOptions,
): string {
  const prefix = choiceLabelPrefix(choiceId);
  if (hasNestedCatalogKey(catalogId, prefix)) {
    return "";
  }
  return tEvent(catalogId, prefix, vars);
}

export function resolveEventChoiceCost(
  catalogId: string,
  choiceId: string,
  fallback?: string,
  vars?: TranslateOptions,
): string | undefined {
  const costVariant = vars?.costVariant;
  if (typeof costVariant === "string" && costVariant) {
    const variantCost = tEvent(
      catalogId,
      `choices.${choiceId}.cost_${costVariant}`,
      vars,
    );
    if (variantCost) return variantCost;
  }

  const cost = tEvent(catalogId, `choices.${choiceId}.cost`, vars);
  if (cost) return cost;

  // Dynamic buy choices (e.g. wandering_collector buy_bone_dice)
  if (choiceId.startsWith("buy_")) {
    // Leatherbound book resell uses a fixed 1000 gold, not the visit goldCost.
    const buyVars =
      choiceId === "buy_leatherbound_book" && vars
        ? {
            ...vars,
            goldCost:
              typeof vars.leatherboundBookCost === "number"
                ? vars.leatherboundBookCost
                : 1000,
          }
        : vars;
    const shared = tEvent(catalogId, "choices._buyItem.cost", buyVars);
    if (shared) return shared;
  }

  return fallback;
}

export function resolveEventChoiceReward(
  catalogId: string,
  choiceId: string,
  vars?: TranslateOptions,
): string | undefined {
  const reward = tEvent(catalogId, `choices.${choiceId}.reward`, vars);
  if (reward) return reward;

  // Dynamic sell choices (e.g. wandering_collector sell_bone_dice)
  if (choiceId.startsWith("sell_") && choiceId !== "sell_nothing") {
    const shared = tEvent(catalogId, "choices._sellItem.reward", vars);
    if (shared) return shared;
  }

  return undefined;
}

export function resolveEventLogMessage(
  catalogId: string,
  logKey: string,
  options?: TranslateOptions,
): string {
  return tEvent(catalogId, `log.${logKey}`, options);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pull `{{name}}` values out of a sentence that was filled from `template`. */
function matchCatalogTemplate(
  template: string,
  stored: string,
): Record<string, string> | null {
  const names: string[] = [];
  const parts: string[] = [];
  const placeholder = /\{\{(\w+)\}\}/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = placeholder.exec(template))) {
    parts.push(escapeRegExp(template.slice(last, match.index)));
    names.push(match[1]);
    parts.push("([\\s\\S]+?)");
    last = match.index + match[0].length;
  }
  parts.push(escapeRegExp(template.slice(last)));
  const found = stored.match(new RegExp(`^${parts.join("")}$`));
  if (!found) return null;
  const vars: Record<string, string> = {};
  names.forEach((name, index) => {
    vars[name] = found[index + 1] ?? "";
  });
  return vars;
}

function collectCatalogLeaves(
  catalogId: string,
  keyPrefix: string,
  lng: string,
): Array<{ suffix: string; template: string }> {
  const node = i18n.getResource(lng, "events", `${catalogId}.${keyPrefix}`);
  if (typeof node === "string") {
    const template = node.trim();
    return template ? [{ suffix: keyPrefix, template }] : [];
  }
  if (!node || typeof node !== "object") return [];
  return Object.entries(node as Record<string, unknown>).flatMap(
    ([key, value]) => {
      if (typeof value !== "string" || !value.trim()) return [];
      return [{ suffix: `${keyPrefix}.${key}`, template: value }];
    },
  );
}

const relocalizeCache = new Map<string, string | null>();

/**
 * Map a sentence stored in any loaded locale back onto the current language.
 * Interpolation values (costs, counts) stay as they were when the line was written.
 */
export function relocalizeStoredCatalogText(
  catalogId: string,
  keyPrefix: string,
  stored: string | undefined,
): string | null {
  const trimmed = stored?.trim();
  if (!trimmed || !catalogId) return null;

  const cacheKey = `${i18n.language}\0${catalogId}\0${keyPrefix}\0${trimmed}`;
  const cached = relocalizeCache.get(cacheKey);
  if (cached !== undefined) return cached;
  if (relocalizeCache.size > 400) relocalizeCache.clear();

  let bestSuffix = "";
  let bestVars: Record<string, string> | null = null;
  let bestLen = -1;

  for (const lng of SUPPORTED_LOCALES) {
    for (const { suffix, template } of collectCatalogLeaves(
      catalogId,
      keyPrefix,
      lng,
    )) {
      const vars = matchCatalogTemplate(template, trimmed);
      if (!vars || template.length <= bestLen) continue;
      bestSuffix = suffix;
      bestVars = vars;
      bestLen = template.length;
    }
  }

  const translated = bestVars ? tEvent(catalogId, bestSuffix, bestVars) : "";
  const result = translated.trim() ? translated : null;
  relocalizeCache.set(cacheKey, result);
  return result;
}

function resolveLocalizedEventChoiceLabel(
  catalogId: string,
  choiceId: string,
  labelDef: EventChoice["label"],
  state?: GameState,
  vars?: TranslateOptions,
): string {
  const prefix = choiceLabelPrefix(choiceId);
  const nestedLabels = hasNestedCatalogKey(catalogId, prefix);

  if (typeof labelDef === "function") {
    if (!state) {
      return resolveEventChoiceLabel(catalogId, choiceId, vars);
    }
    const variant = labelDef(state);
    if (typeof variant !== "string") return "";
    const variantLabel = resolveEventChoiceVariantLabel(
      catalogId,
      choiceId,
      variant,
      vars,
    );
    if (variantLabel) return variantLabel;
    const baseLabel = resolveEventChoiceLabel(catalogId, choiceId, vars);
    if (baseLabel) return baseLabel;
    // Inline dynamic labels (e.g. "Buy for 500 gold") when catalog has no nested variants.
    if (!nestedLabels) return variant;
    return "";
  }

  if (typeof labelDef === "string" && labelDef && !isI18nReturnedObjectError(labelDef)) {
    if (nestedLabels && isChoiceLabelVariantKey(labelDef)) {
      const variantLabel = resolveEventChoiceVariantLabel(
        catalogId,
        choiceId,
        labelDef,
        vars,
      );
      if (variantLabel) return variantLabel;
      return "";
    }
    const relocalized = relocalizeStoredCatalogText(
      catalogId,
      `${choiceLabelPrefix(choiceId)}`,
      labelDef,
    );
    if (relocalized) return relocalized;
    const localized = resolveEventChoiceLabel(catalogId, choiceId, vars);
    if (localized) return localized;
    return labelDef;
  }

  const localized = resolveEventChoiceLabel(catalogId, choiceId, vars);
  if (localized) return localized;
  return typeof labelDef === "string" ? labelDef : "";
}

/** Localize choice labels/costs on a choice list (mutates copies). */
export function localizeEventChoices(
  catalogId: string,
  choices: EventChoice[] | undefined,
  state?: GameState,
  vars?: TranslateOptions,
): EventChoice[] | undefined {
  if (!choices) return choices;
  return choices.map((c) => ({
    ...c,
    label: resolveLocalizedEventChoiceLabel(
      catalogId,
      c.id,
      c.label,
      state,
      vars,
    ),
    cost:
      typeof c.cost === "function"
        ? c.cost
        : resolveEventChoiceCost(
          catalogId,
          c.id,
          typeof c.cost === "string" ? c.cost : undefined,
          vars,
        ),
  }));
}

export function localizeFallbackChoice(
  catalogId: string,
  fallback: EventChoice | undefined,
  state?: GameState,
  vars?: TranslateOptions,
): EventChoice | undefined {
  if (!fallback) return fallback;
  return {
    ...fallback,
    label: resolveLocalizedEventChoiceLabel(
      catalogId,
      fallback.id,
      fallback.label,
      state,
      vars,
    ),
  };
}
