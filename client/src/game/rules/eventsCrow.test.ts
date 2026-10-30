import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "@/game/store/createInitialState";
import { useGameStore } from "@/game/state";

describe("shore fishermen reward dialog", () => {
  afterEach(() => {
    useGameStore.getState().setRewardDialog(false);
  });

  it("opens the reward dialog listing Fisher's Hand after paying", async () => {
    const base = createInitialState();
    useGameStore.getState().initialize({
      ...base,
      resources: { ...base.resources, gold: 300 },
      fellowship: { ...base.fellowship, one_eyed_crow: true },
      story: {
        ...base.story,
        seen: {
          ...base.story.seen,
          crowSentToShore: true,
        },
      },
      isPaused: false,
    });

    const accepted = useGameStore
      .getState()
      .applyEventChoice("accept", "shoreFishermenResponse");
    expect(accepted).toBe(true);

    await vi.waitFor(
      () => {
        expect(useGameStore.getState().rewardDialog.isOpen).toBe(true);
      },
      { timeout: 2000 },
    );

    const after = useGameStore.getState();
    expect(after.blessings.fishers_hand).toBe(true);
    expect(after.story.seen.shoreFishermenResponse).toBe(true);
    expect(after.resources.gold).toBe(50);
    expect(after.rewardDialog.data?.rewards?.blessings).toEqual([
      "fishers_hand",
    ]);
    expect(after.rewardDialog.data?.rewards?.resourceLosses?.gold).toBe(250);
  });
});
