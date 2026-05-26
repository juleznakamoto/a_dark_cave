import type { GameState } from "@shared/schema";
import { gameEvents } from "@/game/rules/events";
import {
  getEventCatalogId,
  isI18nReturnedObjectError,
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

/** Title for UI — stored runtime text first, then catalog i18n. */
export function resolveEventDisplayTitle(
  catalogId: string,
  storedTitle: string | undefined,
  state: GameState,
  ruleEventId?: string,
): string | undefined {
  if (storedTitle && !isI18nReturnedObjectError(storedTitle)) {
    return storedTitle;
  }
  const ruleId = ruleEventId ?? catalogId;
  const def = gameEvents[ruleId] ?? gameEvents[catalogId];
  const vars = getEventI18nVars(catalogId, state, ruleId);
  return resolveEventTitle(catalogId, def?.title, state, vars);
}

/** Message for UI — stored runtime text first, then catalog i18n. */
export function resolveEventDisplayMessage(
  catalogId: string,
  storedMessage: string | undefined,
  state: GameState,
  ruleEventId?: string,
): string {
  if (storedMessage) return storedMessage;
  const ruleId = ruleEventId ?? catalogId;
  const def = gameEvents[ruleId] ?? gameEvents[catalogId];
  const vars = getEventI18nVars(catalogId, state, ruleId);
  return resolveEventMessage(catalogId, def?.message, state, vars);
}
