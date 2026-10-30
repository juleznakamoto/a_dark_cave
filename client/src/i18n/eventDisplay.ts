import type { GameState } from "@shared/schema";
import { gameEvents } from "@/game/rules/events";
import {
  getEventCatalogId,
  isI18nReturnedObjectError,
  relocalizeStoredCatalogText,
  resolveEventMessage,
  resolveEventTitle,
} from "./eventText";

type TranslateOptions = Record<string, string | number | boolean | undefined>;

/** Strip timestamp suffix from runtime log entry ids (`bloodMoonAttack-173…`). */
export function getEventRulesCatalogId(eventId: string): string {
  return eventId.split("-")[0];
}

/** i18n catalog id for a rules event (`feast1` → `feast` via `i18nKey`). */
export function resolveTimedEventCatalogId(ruleEventId: string): string {
  const def = gameEvents[ruleEventId];
  if (!def) return getEventRulesCatalogId(ruleEventId);
  return getEventCatalogId(def);
}

export function getEventI18nVars(
  catalogId: string,
  state: GameState,
  ruleEventId?: string,
): TranslateOptions | undefined {
  const def = ruleEventId ? gameEvents[ruleEventId] : gameEvents[catalogId];
  if (!def?.i18nVars) return undefined;
  return typeof def.i18nVars === "function" ? def.i18nVars(state) : def.i18nVars;
}

/**
 * Title for UI. A stored title is the sentence from when the event opened, so
 * match it back to the catalog and show the current language. Dynamic titles
 * that are not in the catalog stay as stored.
 */
export function resolveEventDisplayTitle(
  catalogId: string,
  storedTitle: string | undefined,
  state: GameState,
  ruleEventId?: string,
): string | undefined {
  if (storedTitle && !isI18nReturnedObjectError(storedTitle)) {
    return (
      relocalizeStoredCatalogText(catalogId, "title", storedTitle) ??
      storedTitle
    );
  }
  const ruleId = ruleEventId ?? catalogId;
  const def = gameEvents[ruleId] ?? gameEvents[catalogId];
  const vars = getEventI18nVars(catalogId, state, ruleId);
  return resolveEventTitle(catalogId, def?.title, state, vars);
}

/**
 * Message for UI. Opening copy lives under `message`; outcome dialogs store a
 * `log` line. Either one is re-read in the current language. Uncatalogued
 * runtime text stays as stored.
 */
export function resolveEventDisplayMessage(
  catalogId: string,
  storedMessage: string | undefined,
  state: GameState,
  ruleEventId?: string,
): string {
  if (storedMessage) {
    return (
      relocalizeStoredCatalogText(catalogId, "message", storedMessage) ??
      relocalizeStoredCatalogText(catalogId, "log", storedMessage) ??
      storedMessage
    );
  }
  const ruleId = ruleEventId ?? catalogId;
  const def = gameEvents[ruleId] ?? gameEvents[catalogId];
  const vars = getEventI18nVars(catalogId, state, ruleId);
  return resolveEventMessage(catalogId, def?.message, state, vars);
}
