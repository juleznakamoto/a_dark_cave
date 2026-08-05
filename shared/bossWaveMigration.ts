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

export type StorySeenRecord = Record<string, number | boolean>;

/**
 * Grant missing boss victory flags for saves that already passed the insert points.
 * Returns a new seen object if changed, otherwise null.
 */
export function migrateBossWaveVictoriesInSeen(
  seen: StorySeenRecord | null | undefined,
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
  if (base.tenthWaveVictory === true && base.secondBossWaveVictory !== true) {
    next = { ...base, secondBossWaveVictory: true };
  }

  return next;
}

/** Apply seen imply for read-only metrics (always returns a usable seen object). */
export function implyBossWaveVictoriesInSeen(
  seen: StorySeenRecord | null | undefined,
): StorySeenRecord {
  const migrated = migrateBossWaveVictoriesInSeen(seen);
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
