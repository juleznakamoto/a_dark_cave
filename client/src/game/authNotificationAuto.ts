/** First guest sign-in nudge after this much active play time (ms). */
export const AUTH_NOTIFICATION_INITIAL_PLAY_MS = 15 * 60 * 1000;

/** Repeat nudge cadence measured in play time (ms) after the previous show. */
export const AUTH_NOTIFICATION_REPEAT_PLAY_MS = 60 * 60 * 1000;

export type GuestAuthNotificationScheduleInput = {
  playTimeMs: number;
  lastShownPlayTimeMs: number;
  authNotificationSeen: boolean;
  authNotificationVisible: boolean;
};

/** True when play time has reached the next guest auth notification milestone. */
export function shouldTriggerGuestAuthNotification(
  input: GuestAuthNotificationScheduleInput,
): boolean {
  const { playTimeMs, lastShownPlayTimeMs } = input;
  if (lastShownPlayTimeMs === 0) {
    return playTimeMs >= AUTH_NOTIFICATION_INITIAL_PLAY_MS;
  }
  return (
    playTimeMs >= lastShownPlayTimeMs + AUTH_NOTIFICATION_REPEAT_PLAY_MS
  );
}

/** Store updates when a milestone fires (mirrors prior loop.ts visibility rules). */
export function guestAuthNotificationTriggerUpdates(
  input: GuestAuthNotificationScheduleInput,
): {
  lastAuthNotificationPlayTime: number;
  authNotificationSeen?: boolean;
  authNotificationVisible?: boolean;
} {
  const playTimeMs = input.playTimeMs;
  const isFirst = input.lastShownPlayTimeMs === 0;
  const updates: {
    lastAuthNotificationPlayTime: number;
    authNotificationSeen?: boolean;
    authNotificationVisible?: boolean;
  } = { lastAuthNotificationPlayTime: playTimeMs };

  if (isFirst) {
    if (input.authNotificationSeen) {
      updates.authNotificationSeen = false;
      updates.authNotificationVisible = true;
    } else if (!input.authNotificationVisible) {
      updates.authNotificationVisible = true;
    }
  } else if (input.authNotificationSeen) {
    updates.authNotificationSeen = false;
  }

  return updates;
}

/**
 * On load: guests who already dismissed should not get an immediate “first” nudge after refresh.
 * Keeps `lastAuthNotificationPlayTime` at least current `playTime` when seen and past initial threshold.
 */
export function lastAuthNotificationPlayTimeFloorOnLoad(
  playTimeMs: number,
  savedLast: number,
  authNotificationSeen: boolean,
): number {
  if (
    authNotificationSeen &&
    playTimeMs >= AUTH_NOTIFICATION_INITIAL_PLAY_MS
  ) {
    return Math.max(savedLast, playTimeMs);
  }
  return savedLast;
}
