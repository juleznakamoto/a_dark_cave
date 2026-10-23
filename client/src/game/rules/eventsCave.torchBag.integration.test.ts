import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "@/game/state";
import { buildDevSave } from "@/game/devSaves";
import { createInitialState } from "@/game/store/createInitialState";

describe("torch bag explore → reward dialog", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const base = createInitialState();
    const state = {
      ...base,
      ...buildDevSave("fresh-start"),
      resources: {
        ...base.resources,
        torch: 10,
        wood: 50,
      },
      story: {
        ...base.story,
        seen: {
          ...base.story.seen,
          actionCraftTorch: true,
          fireLit: true,
          hasWood: true,
          torchBagFound: false,
        },
      },
      buildings: {
        ...base.buildings,
        blacksmith: 0,
      },
      activeDevSaveId: "fresh-start" as const,
      isPaused: false,
    };
    useGameStore.getState().initialize(state as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("auto-applies torchBagFound and opens RewardDialog with +25 torches", async () => {
    const store = useGameStore.getState();
    const torchBefore = store.resources.torch ?? 0;

    // Skip the 5s explore timer: complete execution immediately.
    useGameStore.setState({
      _completingExecution: "exploreCave",
    } as any);

    store.executeAction("exploreCave");

    // Auto-apply is deferred 100ms; reward dialog schedules shortly after.
    await vi.waitFor(
      () => {
        expect(useGameStore.getState().rewardDialog.isOpen).toBe(true);
      },
      { timeout: 2000 },
    );

    const after = useGameStore.getState();
    expect(after.triggeredEvents?.torchBagFound).toBe(true);
    expect(after.story.seen.torchBagFound).toBe(true);
    // Completing execution skips cost re-deduction (cost was paid at start).
    expect(after.resources.torch).toBe(torchBefore + 25);
    expect(after.rewardDialog.data?.rewards?.resources?.torch).toBe(25);
    expect(after.rewardDialog.isOpen).toBe(true);
  });
});
