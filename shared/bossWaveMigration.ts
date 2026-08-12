/**
 * Legacy save migration when boss waves were inserted into the attack-wave chart
 * (after fifth and after tenth). Shared by client load and admin hut-ladder imply.
 */

export const LATER_THAN_FIRST_BOSS_VICTORY_FLAGS = [
  "sixthWaveVictory",
  "seventhWaveVictory",
  "eighthWaveVictory",
  "ninthWaveVictory",
  "tenthWaveVictory",
] as const;

/**
 * story.seen flags that only appear after finishing the pre-insert chart
 * (old final wave = tenth). tenthWaveVictory alone is not enough: that is the
 * normal waiting state for the new final boss (wave 12).
 */
export const LATER_THAN_SECOND_BOSS_LEGACY_SEEN_FLAGS = [
  "beyondGateVentureUnlocked",
] as const;

export type StorySeenRecord = Record<string, number | boolean>;

/**
 * Extra legacy evidence that lives outside story.seen (post-chart endless waves,
 * cube/ending progress that required beating the old final wave).
 */
export type BossWaveLegacyEvidence = {
  /** Endless wave wins after the old chart end (tenth was final). */
  postCompletionAttackWaveCount?: number;
  /** cube12+ / gameComplete / endings that required the old final wave. */
  hasPostSiegeProgress?: boolean;
};

/** Cube/event ids that required beating the old final wave before second boss existed. */
export const POST_SIEGE_CUBE_EVENT_IDS = [
  "cube12",
  "cube13",
  "cube14a",
  "cube14b",
  "cube14c",
  "cube14d",
  "cube15a",
  "cube15b",
  "cube16a",
  "cube16b",
] as const;

/** Build migration evidence from a save / game-state slice. */
export function bossWaveLegacyEvidenceFromState(state: {
  postCompletionAttackWaveCount?: number;
  gameComplete?: boolean;
  events?: Record<string, unknown> | null;
}): BossWaveLegacyEvidence {
  const events = state.events ?? {};
  return {
    postCompletionAttackWaveCount: state.postCompletionAttackWaveCount ?? 0,
    hasPostSiegeProgress: Boolean(
      state.gameComplete ||
        POST_SIEGE_CUBE_EVENT_IDS.some((id) => Boolean(events[id])),
    ),
  };
}

function hasLegacySecondBossEvidence(
  seen: StorySeenRecord,
  evidence?: BossWaveLegacyEvidence,
): boolean {
  if (
    LATER_THAN_SECOND_BOSS_LEGACY_SEEN_FLAGS.some((flag) => seen[flag] === true)
  ) {
    return true;
  }
  if ((evidence?.postCompletionAttackWaveCount ?? 0) > 0) return true;
  if (evidence?.hasPostSiegeProgress) return true;
  return false;
}

/**
 * Grant missing boss victory flags for saves that already passed the insert points.
 * Returns a new seen object if changed, otherwise null.
 *
 * First boss: any victory after the insert (sixth+) without firstBossWaveVictory.
 * Second boss: only when there is proof of progress past the old chart end —
 * not merely tenthWaveVictory (players waiting for wave 12).
 */
export function migrateBossWaveVictoriesInSeen(
  seen: StorySeenRecord | null | undefined,
  evidence?: BossWaveLegacyEvidence,
): StorySeenRecord | null {
  if (!seen || typeof seen !== "object") return null;

  let next: StorySeenRecord | null = null;

  const hasLaterThanFirstBoss = LATER_THAN_FIRST_BOSS_VICTORY_FLAGS.some(
    (flag) => seen[flag] === true,
  );
  if (hasLaterThanFirstBoss && seen.firstBossWaveVictory !== true) {
    next = { ...(next ?? seen), firstBossWaveVictory: true };
  }

  const base = next ?? seen;
  if (
    base.tenthWaveVictory === true &&
    base.secondBossWaveVictory !== true &&
    hasLegacySecondBossEvidence(base, evidence)
  ) {
    next = { ...base, secondBossWaveVictory: true };
  }

  return next;
}

/** Apply seen imply for read-only metrics (always returns a usable seen object). */
export function implyBossWaveVictoriesInSeen(
  seen: StorySeenRecord | null | undefined,
  evidence?: BossWaveLegacyEvidence,
): StorySeenRecord {
  const migrated = migrateBossWaveVictoriesInSeen(seen, evidence);
  return migrated ?? seen ?? {};
}

export type AttackWaveTimerRecord = Record<
  string,
  {
    startTime?: number;
    duration?: number;
    defeated?: boolean;
    provoked?: boolean;
    elapsedTime?: number;
  }
>;

/**
 * Clear timers that would soft-skip after boss inserts.
 * - Mid fifth→sixth: drop stale sixthWave timer so it does not fire instantly after first boss.
 * - Mid tenth→second boss: drop any premature secondBossWave timer if somehow present without eligibility.
 * - When boss victories are already implied/granted, clear obsolete boss timers.
 */
export function migrateBossWaveTimers(
  timers: AttackWaveTimerRecord | null | undefined,
  seen: StorySeenRecord,
): AttackWaveTimerRecord | null {
  if (!timers || typeof timers !== "object") return null;

  let next: AttackWaveTimerRecord | null = null;
  const ensureNext = () => {
    if (!next) next = { ...timers };
    return next;
  };

  // Player beat fifth but not first boss: sixthWave timer must not keep old elapsed time.
  if (
    seen.fifthWaveVictory === true &&
    seen.firstBossWaveVictory !== true &&
    seen.sixthWaveVictory !== true &&
    timers.sixthWave
  ) {
    const copy = ensureNext();
    delete copy.sixthWave;
  }

  // Player beat tenth but not second boss (new runs / no legacy grant yet):
  // ensure no leftover post-chart confusion; clear secondBossWave only if defeated flag mismatch.
  // More importantly: if they had somehow started counting a wave past tenth under old rules,
  // we leave postCompletion alone.

  // If first boss already granted/won, clear any orphan firstBossWave timer.
  if (seen.firstBossWaveVictory === true && timers.firstBossWave) {
    const copy = ensureNext();
    delete copy.firstBossWave;
  }

  // If second boss already granted/won, clear any orphan secondBossWave timer.
  if (seen.secondBossWaveVictory === true && timers.secondBossWave) {
    const copy = ensureNext();
    delete copy.secondBossWave;
  }

  // Mid tenth→second boss on a new build: if tenth is won but second boss not,
  // no later numbered-wave timer should exist; if sixth was the only orphan case we care
  // about for insert-ahead. Also reset any wave timer that sits after an unfought boss
  // insert when the player is about to fight that boss.
  if (
    seen.tenthWaveVictory === true &&
    seen.secondBossWaveVictory !== true &&
    timers.postCompletionWave
  ) {
    // Post-completion should not run until second boss is won; clear provoke timer.
    const copy = ensureNext();
    delete copy.postCompletionWave;
  }

  return next;
}
