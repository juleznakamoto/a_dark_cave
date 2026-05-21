import type { GameState } from "@shared/schema";
import { gameEvents } from "@/game/rules/events";
import { resolveEventMessage, resolveEventTitle } from "./eventText";

type TranslateOptions = Record<string, string | number | boolean | undefined>;

/** Strip timestamp suffix from runtime log entry ids (`bloodMoonAttack-173…`). */
export function getEventRulesCatalogId(eventId: string): string {
  return eventId.split("-")[0];
}

export function getEventI18nVars(
  catalogId: string,
  state: GameState,
): TranslateOptions | undefined {
  const def = gameEvents[catalogId];
  if (!def?.i18nVars) return undefined;
  return typeof def.i18nVars === "function" ? def.i18nVars(state) : def.i18nVars;
}

/** Title for UI — uses stored text or re-resolves from catalog (e.g. after language change). */
export function resolveEventDisplayTitle(
  catalogId: string,
  storedTitle: string | undefined,
  state: GameState,
): string | undefined {
  if (storedTitle) return storedTitle;
  const def = gameEvents[catalogId];
  const vars = getEventI18nVars(catalogId, state);
  return resolveEventTitle(catalogId, def?.title, state, vars);
}

/** Message for UI — fills in `message.default` when stored message is empty. */
export function resolveEventDisplayMessage(
  catalogId: string,
  storedMessage: string | undefined,
  state: GameState,
): string {
  if (storedMessage) return storedMessage;
  const def = gameEvents[catalogId];
  const vars = getEventI18nVars(catalogId, state);
  return resolveEventMessage(catalogId, def?.message, state, vars);
}
