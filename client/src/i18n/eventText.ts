import i18n from "i18next";
import type { GameEvent, EventChoice } from "@/game/rules/events";
import type { GameState } from "@shared/schema";

type TranslateOptions = Record<string, string | number | boolean | undefined>;

export function getEventCatalogId(event: { id: string; i18nKey?: string }): string {
  return event.i18nKey ?? event.id;
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
    return typeof result === "string" ? result : "";
  }
  return "";
}

function hasNestedCatalogKey(catalogId: string, prefix: string): boolean {
  return i18n.exists(eventKey(catalogId, `${prefix}.level1`));
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
  return tEvent(catalogId, `choices.${choiceId}.label`, vars);
}

export function resolveEventChoiceCost(
  catalogId: string,
  choiceId: string,
  fallback?: string,
  vars?: TranslateOptions,
): string | undefined {
  const cost = tEvent(catalogId, `choices.${choiceId}.cost`, vars);
  return cost || fallback;
}

export function resolveEventLogMessage(
  catalogId: string,
  logKey: string,
  options?: TranslateOptions,
): string {
  return tEvent(catalogId, `log.${logKey}`, options);
}

function resolveLocalizedEventChoiceLabel(
  catalogId: string,
  choiceId: string,
  labelDef: EventChoice["label"],
  state?: GameState,
  vars?: TranslateOptions,
): string {
  if (typeof labelDef === "function") {
    if (!state) {
      return resolveEventChoiceLabel(catalogId, choiceId, vars);
    }
    const variant = labelDef(state);
    if (typeof variant !== "string") return "";
    const variantLabel = tEvent(
      catalogId,
      `choices.${choiceId}.label.${variant}`,
      vars,
    );
    if (variantLabel) return variantLabel;
    const baseLabel = resolveEventChoiceLabel(catalogId, choiceId, vars);
    if (baseLabel) return baseLabel;
    return variant;
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
