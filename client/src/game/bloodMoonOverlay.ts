/** Preview blood moon background + smoke without the event active. Set false before release. */
export const BLOOD_MOON_OVERLAY_DEBUG = false;

export function isBloodMoonOverlayVisible(timedEventTab: {
  isActive: boolean;
  event?: { eventId?: string } | null;
}): boolean {
  return (
    (timedEventTab.isActive &&
      timedEventTab.event?.eventId === "bloodMoonAttack") ||
    BLOOD_MOON_OVERLAY_DEBUG
  );
}
