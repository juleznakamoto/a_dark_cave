import { describe, expect, it } from "vitest";
import {
  AUTH_NOTIFICATION_INITIAL_PLAY_MS,
  AUTH_NOTIFICATION_REPEAT_PLAY_MS,
  guestAuthNotificationTriggerUpdates,
  lastAuthNotificationPlayTimeFloorOnLoad,
  shouldTriggerGuestAuthNotification,
} from "./authNotificationAuto";

const base = {
  authNotificationSeen: false,
  authNotificationVisible: false,
};

describe("shouldTriggerGuestAuthNotification", () => {
  it("fires first time at 15 minutes play time", () => {
    expect(
      shouldTriggerGuestAuthNotification({
        ...base,
        playTimeMs: AUTH_NOTIFICATION_INITIAL_PLAY_MS,
        lastShownPlayTimeMs: 0,
      }),
    ).toBe(true);
    expect(
      shouldTriggerGuestAuthNotification({
        ...base,
        playTimeMs: AUTH_NOTIFICATION_INITIAL_PLAY_MS - 1,
        lastShownPlayTimeMs: 0,
      }),
    ).toBe(false);
  });

  it("fires repeat 60 minutes play time after last show", () => {
    const last = AUTH_NOTIFICATION_INITIAL_PLAY_MS;
    expect(
      shouldTriggerGuestAuthNotification({
        ...base,
        playTimeMs: last + AUTH_NOTIFICATION_REPEAT_PLAY_MS,
        lastShownPlayTimeMs: last,
      }),
    ).toBe(true);
  });
});

describe("lastAuthNotificationPlayTimeFloorOnLoad", () => {
  it("floors to playTime when guest already dismissed past initial threshold", () => {
    expect(
      lastAuthNotificationPlayTimeFloorOnLoad(
        2 * AUTH_NOTIFICATION_INITIAL_PLAY_MS,
        0,
        true,
      ),
    ).toBe(2 * AUTH_NOTIFICATION_INITIAL_PLAY_MS);
  });

  it("does not floor when not yet seen", () => {
    expect(
      lastAuthNotificationPlayTimeFloorOnLoad(
        2 * AUTH_NOTIFICATION_INITIAL_PLAY_MS,
        0,
        false,
      ),
    ).toBe(0);
  });
});

describe("guestAuthNotificationTriggerUpdates", () => {
  it("sets visible on first trigger when not yet visible", () => {
    const updates = guestAuthNotificationTriggerUpdates({
      ...base,
      playTimeMs: 1_000_000,
      lastShownPlayTimeMs: 0,
    });
    expect(updates.lastAuthNotificationPlayTime).toBe(1_000_000);
    expect(updates.authNotificationVisible).toBe(true);
  });
});
