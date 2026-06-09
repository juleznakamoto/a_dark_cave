import { describe, it, expect, beforeEach } from "vitest";
import { getVisibleHotkeyTabs } from "./tabHotkeys";
import { useGameStore, isModalDialogOpen, shouldBlockGameHotkeys } from "@/game/state";

describe("getVisibleHotkeyTabs", () => {
  it("returns only cave when nothing else is unlocked", () => {
    expect(
      getVisibleHotkeyTabs({
        villageUnlocked: false,
        forestUnlocked: false,
        bastionUnlocked: false,
        darkEstate: 0,
        survivorsNotes: false,
        bookOfTrials: false,
        timedEventActive: false,
      }),
    ).toEqual(["cave"]);
  });

  it("matches tab bar order: cave, village, forest, estate, bastion, achievements, timedevent", () => {
    expect(
      getVisibleHotkeyTabs({
        villageUnlocked: true,
        forestUnlocked: true,
        bastionUnlocked: true,
        darkEstate: 1,
        survivorsNotes: true,
        bookOfTrials: false,
        timedEventActive: true,
      }),
    ).toEqual([
      "cave",
      "village",
      "forest",
      "estate",
      "bastion",
      "achievements",
      "timedevent",
    ]);
  });

  it("includes achievements when only book_of_trials is set", () => {
    expect(
      getVisibleHotkeyTabs({
        villageUnlocked: false,
        forestUnlocked: false,
        bastionUnlocked: false,
        darkEstate: 0,
        survivorsNotes: false,
        bookOfTrials: true,
        timedEventActive: false,
      }),
    ).toEqual(["cave", "achievements"]);
  });
});

describe("shouldBlockGameHotkeys", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("does not block tab hotkeys for an active timed-event tab alone", () => {
    useGameStore.setState({
      timedEventTab: {
        isActive: true,
        event: {
          id: "merchant-test",
          message: "A merchant arrives",
          timestamp: Date.now(),
          type: "event",
        },
        expiryTime: Date.now() + 60_000,
        startTime: Date.now(),
      },
    });

    const state = useGameStore.getState();
    expect(state.timedEventTab.isActive).toBe(true);
    expect(isModalDialogOpen(state)).toBe(false);
    expect(shouldBlockGameHotkeys(state)).toBe(false);
  });

  it("blocks tab hotkeys while a blocking dialog is open", () => {
    useGameStore.setState({ shopDialogOpen: true });
    expect(shouldBlockGameHotkeys(useGameStore.getState())).toBe(true);
  });

  it("blocks tab hotkeys while the reward dialog is open", () => {
    useGameStore.setState({
      rewardDialog: { isOpen: true, data: { title: "Reward", rewards: {} } },
    });
    expect(shouldBlockGameHotkeys(useGameStore.getState())).toBe(true);
  });
});
