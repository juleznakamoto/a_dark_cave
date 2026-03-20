/**
 * Howler volume values (0–1). Tune the overall mix here only.
 */
export const SOUND_VOLUME = {
  wind: 0.2,
  lightFire: 0.8,
  backgroundMusic: 0.3,
  whisperingCube: 0.5,
  feedFire: {
    base: 0.4,
    perHeartfireLevel: 0.05,
  },
  newVillager: 0.02,
  buildingComplete: 1,
  craft: 0.05,
  mining: 0.6,
  chopWood: 1,
  hunt: 1,
  /** Log line, dialog open, timed tab, and timed-tab check (non-merchant) */
  eventUi: 0.1,
  /** When checkEvents queues new entries (quieter than UI cues) */
  eventCheckEvents: 0.02,
  merchant: 0.8,
  explosion: 0.5,
  sleep: 0.3,
  combat: 0.3,
} as const;

export function feedFireVolume(heartfireLevel: number): number {
  return (
    SOUND_VOLUME.feedFire.base +
    SOUND_VOLUME.feedFire.perHeartfireLevel * heartfireLevel
  );
}
