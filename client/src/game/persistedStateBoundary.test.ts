import { describe, expect, it } from "vitest";
import {
  GAME_DIALOG_REGISTRY,
  getTransientDialogResetFromRegistry,
  isBlockingDialogOpenFromRegistry,
} from "./dialogRegistry";
import {
  buildPersistedGameState,
  getRuntimeOnlyStoreKeys,
  getTransientDialogResetOnLoad,
  serializeTimedEventTabForSave,
} from "./persistedStateBoundary";

describe("persistedStateBoundary", () => {
  it("strips dialog and runtime-only keys from saves", () => {
    const persisted = buildPersistedGameState({
      resources: { wood: 1, gold: 2 },
      playTime: 10,
      villageHotkeyTutorialShown: true,
      feedbackPromptShown: true,
      lastFreeGoldClaim: 1_700_000_000_000,
      lastFeedbackOpenedAt: 1_700_000_100_000,
      lastFeedbackOpenedSource: "footer",
      activeDevSaveId: "sleep-unlocked",
      shopDialogOpen: true,
      shopCruelModeHighlight: true,
      compassGlowButton: "explore",
      isPausedPreviously: true,
      demoEndDialogDismissed: true,
      isUserSignedIn: true,
      current_population: 5,
      total_population: 8,
      isPaused: true,
      executionStartTimes: { buildHut: 123 },
      timedEventTab: {
        isActive: true,
        event: { id: "merchant" },
        expiryTime: 99,
        pauseAccumMs: 50,
        pauseStartedAt: 1,
        insightProlongUsed: true,
      },
    });

    expect(persisted).not.toHaveProperty("activeDevSaveId");
    expect(persisted).not.toHaveProperty("shopDialogOpen");
    expect(persisted).not.toHaveProperty("shopCruelModeHighlight");
    expect(persisted).not.toHaveProperty("compassGlowButton");
    expect(persisted).not.toHaveProperty("isPausedPreviously");
    expect(persisted).not.toHaveProperty("demoEndDialogDismissed");
    expect(persisted).not.toHaveProperty("isUserSignedIn");
    expect(persisted).not.toHaveProperty("current_population");
    expect(persisted.isPaused).toBe(false);
    expect(persisted.villageHotkeyTutorialShown).toBe(true);
    expect(persisted.feedbackPromptShown).toBe(true);
    expect(persisted.lastFreeGoldClaim).toBe(1_700_000_000_000);
    expect(persisted.lastFeedbackOpenedAt).toBe(1_700_000_100_000);
    expect(persisted.lastFeedbackOpenedSource).toBe("footer");
    expect(persisted.executionStartTimes).toEqual({ buildHut: 123 });
    expect(persisted.timedEventTab).toEqual({
      isActive: true,
      event: { id: "merchant" },
      expiryTime: 99,
    });
  });

  it("persists one-shot prompt and claim flags through the save allowlist", () => {
    // These live on the store and are hydrated on load; if missing from
    // gameStateSchema they are silently stripped by buildPersistedGameState.
    const persisted = buildPersistedGameState({
      resources: { wood: 1 },
      playTime: 10,
      feedbackPromptShown: true,
      villageHotkeyTutorialShown: true,
      lastFreeGoldClaim: 42,
      lastFeedbackOpenedAt: 99,
      lastFeedbackOpenedSource: "dialog",
      referralProcessed: true,
      referralCode: "AB3K9M",
    });

    expect(persisted.feedbackPromptShown).toBe(true);
    expect(persisted.villageHotkeyTutorialShown).toBe(true);
    expect(persisted.lastFreeGoldClaim).toBe(42);
    expect(persisted.lastFeedbackOpenedAt).toBe(99);
    expect(persisted.lastFeedbackOpenedSource).toBe("dialog");
    expect(persisted.referralProcessed).toBe(true);
    expect(persisted.referralCode).toBe("AB3K9M");
  });

  it("persists pendingModalEvent through the save allowlist", () => {
    const pendingModalEvent = {
      eventId: "paleFigure",
      openedAt: 1_700_000_000_000,
      title: "The Slender Figure",
      message: "At dawn, villagers glimpse a tall, pale, slender figure.",
    };
    const persisted = buildPersistedGameState({
      resources: { wood: 1 },
      playTime: 10,
      pendingModalEvent,
      eventDialog: { isOpen: true, currentEvent: { id: "paleFigure-1" } },
    });

    expect(persisted.pendingModalEvent).toEqual(pendingModalEvent);
    expect(persisted).not.toHaveProperty("eventDialog");
  });

  it("persists Book of Absolution rites through the save allowlist", () => {
    const persisted = buildPersistedGameState({
      resources: { insight: 0 },
      playTime: 10,
      absolvedItems: { unnamed_book: true, elder_scroll: true },
    });

    expect(persisted.absolvedItems).toEqual({
      unnamed_book: true,
      elder_scroll: true,
    });
  });

  it("serializes only resumable timed-event fields", () => {
    expect(
      serializeTimedEventTabForSave({
        isActive: true,
        expiryTime: 1,
        pauseAccumMs: 9,
        pauseStartedAt: 8,
        insightProlongUsed: true,
        collectorBuyDone: true,
      }),
    ).toEqual({
      isActive: true,
      expiryTime: 1,
      collectorBuyDone: true,
    });
  });

  it("resets every registered dialog on load", () => {
    const reset = getTransientDialogResetOnLoad();
    for (const entry of GAME_DIALOG_REGISTRY) {
      expect(reset).toHaveProperty(entry.storeKey);
    }
    expect(reset.signUpPromptEligibleForGold).toBe(false);
    expect(reset.inactivityReason).toBeNull();
    expect(reset.shopCruelModeHighlight).toBe(false);
  });

  it("matches blocking dialog semantics from the registry", () => {
    expect(
      isBlockingDialogOpenFromRegistry({
        eventDialog: { isOpen: true, currentEvent: null },
        shopDialogOpen: false,
      }),
    ).toBe(false);
    expect(
      isBlockingDialogOpenFromRegistry({
        eventDialog: { isOpen: true, currentEvent: { id: "x" } },
      }),
    ).toBe(true);
    expect(
      isBlockingDialogOpenFromRegistry({
        rewardDialog: { isOpen: true, data: {} },
        shopDialogOpen: false,
      }),
    ).toBe(false);
    expect(
      isBlockingDialogOpenFromRegistry({ shopDialogOpen: true }),
    ).toBe(true);
  });

  it("keeps dialog keys in the runtime-only set", () => {
    const runtimeOnly = new Set(getRuntimeOnlyStoreKeys());
    for (const entry of GAME_DIALOG_REGISTRY) {
      expect(runtimeOnly.has(entry.storeKey)).toBe(true);
    }
    expect(getTransientDialogResetFromRegistry()).toHaveProperty(
      "authDialogOpen",
      false,
    );
  });
});
