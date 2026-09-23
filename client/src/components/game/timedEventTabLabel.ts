export const TIMED_EVENT_TAB_LABEL_KEYS = {
  event: "tabs.event",
  merchant: "tabs.merchant",
} as const;

export const TIMED_EVENT_TAB_LABEL_DEFAULTS = {
  event: "Event",
  merchant: "Merchant",
} as const;

export type TimedEventTabLabelKind = keyof typeof TIMED_EVENT_TAB_LABEL_KEYS;

/** Short tab word for a timed-event visit. Unknown visits stay "Event". */
export function getTimedEventTabLabelKind(
  event: { id?: string; eventId?: string } | null | undefined,
): TimedEventTabLabelKind {
  const catalogId = event?.eventId || event?.id?.split("-")[0];
  if (catalogId === "merchant") return "merchant";
  return "event";
}
