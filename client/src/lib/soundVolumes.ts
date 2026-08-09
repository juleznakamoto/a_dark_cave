/**
 * Howler volume values (0–1). Tune the overall mix here only.
 */

/** Crossfade length when event ambience takes over from (or returns to) BGM. */
export const EVENT_AMBIENCE_FADE_SECONDS = 2;

export const SOUND_VOLUME = {
  wind: 0.2,
  lightFire: 0.8,
  /** Start-screen eyes easter egg */
  monsterStart: 0.45,
  backgroundMusic: 0.3,
  whisperingCube: 0.5,
  /** Blood moon timed-tab one-shot when the event starts */
  bloodMoon: 0.45,
  feedFire: {
    base: 0.3,
    perHeartfireLevel: 0.05,
  },
  newVillager: 0.02,
  buildingComplete: 0.5,
  craft: 0.25,
  mining: 0.5,
  chopWood: 0.8,
  /** Cave Gather Wood (chopWood before forest unlock) */
  gatherWood: 0.55,
  /** All cave explore / delve actions; +perLevel × caveExplore button upgrade */
  caveExplore: {
    base: 0.5,
    perLevel: 0.025,
  },
  hunt: 0.2,
  /** Log line, dialog open, timed tab, and timed-tab check (non-merchant) */
  eventUi: 0.1,
  /** When checkEvents queues new entries (quieter than UI cues) */
  eventCheckEvents: 0.02,
  merchant: 0.8,
  explosion: 0.5,
  sleep: 0.3,
  combat: 0.3,
  /** New game-tab unlock fade-in (3s visual) */
  tabFadeIn: 0.35,
  /** Achievement becomes claimable (fulfilled, not yet claimed) */
  achievement: 0.4,
} as const;

export function feedFireVolume(heartfireLevel: number): number {
  return (
    SOUND_VOLUME.feedFire.base +
    SOUND_VOLUME.feedFire.perHeartfireLevel * heartfireLevel
  );
}

/** Volume for cave explore SFX; scales with shared caveExplore button upgrade level. */
export function caveExploreVolume(caveExploreLevel: number): number {
  const level = Number.isFinite(caveExploreLevel)
    ? Math.max(0, caveExploreLevel)
    : 0;
  return Math.min(
    1,
    SOUND_VOLUME.caveExplore.base +
    SOUND_VOLUME.caveExplore.perLevel * level,
  );
}
