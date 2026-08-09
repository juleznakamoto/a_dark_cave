/** Preview blood moon background + smoke without the event active. Set false before release. */
export const BLOOD_MOON_OVERLAY_DEBUG = false;

/** Duration for red background + smoke fade-in when blood moon starts. */
export const BLOOD_MOON_OVERLAY_FADE_MS = 4000;

/** Catalog id for the blood moon timed-tab event. */
export const BLOOD_MOON_EVENT_ID = "bloodMoonAttack";

export function isBloodMoonTimedEvent(event?: {
  eventId?: string;
  id?: string;
} | null): boolean {
  if (!event) return false;
  const catalogId = event.eventId || event.id?.split("-")[0];
  return catalogId === BLOOD_MOON_EVENT_ID;
}

export function isBloodMoonOverlayVisible(timedEventTab: {
  isActive: boolean;
  event?: { eventId?: string; id?: string } | null;
}): boolean {
  return (
    (timedEventTab.isActive && isBloodMoonTimedEvent(timedEventTab.event)) ||
    BLOOD_MOON_OVERLAY_DEBUG
  );
}
