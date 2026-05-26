import type { GameEvent, EventChoice, LogEntry } from "@/game/rules/events";
import type { GameState } from "@shared/schema";
import {
  getEventCatalogId,
  localizeEventChoices,
  localizeFallbackChoice,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";

/** Build a localized log entry from a game event definition. */
export function buildLocalizedEventLogEntry(
  eventId: string,
  eventDef: GameEvent,
  state: GameState,
  options?: { skipEventLog?: boolean },
): LogEntry {
  const catalogId = getEventCatalogId(eventDef);
  const i18nVars =
    typeof eventDef.i18nVars === "function"
      ? eventDef.i18nVars(state)
      : eventDef.i18nVars;
  const rawChoices =
    typeof eventDef.choices === "function"
      ? eventDef.choices(state)
      : eventDef.choices;
  const choices = localizeEventChoices(
    catalogId,
    rawChoices,
    state,
    i18nVars,
  );
  const fallbackChoice = localizeFallbackChoice(
    catalogId,
    eventDef.fallbackChoice,
    state,
    i18nVars,
  );

  return {
    id: `${eventId}-${Date.now()}`,
    eventId,
    message: resolveEventMessage(catalogId, eventDef.message, state, i18nVars),
    timestamp: Date.now(),
    type: "event",
    title: resolveEventTitle(catalogId, eventDef.title, state, i18nVars),
    choices,
    isTimedChoice: eventDef.isTimedChoice,
    baseDecisionTime: eventDef.baseDecisionTime,
    fallbackChoice,
    relevant_stats: eventDef.relevant_stats,
    skipEventLog:
      options?.skipEventLog ??
      eventDef.skipEventLog ??
      (!!choices && choices.length > 0),
    showAsTimedTab: eventDef.showAsTimedTab,
    timedTabDuration: eventDef.timedTabDuration,
  };
}
