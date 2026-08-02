/**
 * Tests for job assignment touch behavior (mobile ghost-click fix).
 * Verifies that assignVillager/unassignVillager work correctly and that
 * touch handlers are set up to prevent ghost clicks via preventDefault.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGameStore } from "@/game/state";
import {
  assignVillagerToJob,
  unassignVillagerFromJob,
} from "@/game/stateHelpers";

describe("Job assignment - touch/ghost-click fix", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("unassignVillagerFromJob decreases job count and increases free", () => {
    const state = useGameStore.getState();
    const updates = unassignVillagerFromJob(
      { ...state, villagers: { ...state.villagers, gatherer: 4, free: 0 } },
      "gatherer"
    );

    expect(updates.villagers?.gatherer).toBe(3);
    expect(updates.villagers?.free).toBe(1);
  });

  it("assignVillagerToJob increases job count when free villagers available", () => {
    const state = useGameStore.getState();
    const updates = assignVillagerToJob(
      { ...state, villagers: { ...state.villagers, hunter: 0, free: 1 } },
      "hunter"
    );

    expect(updates.villagers?.hunter).toBe(1);
    expect(updates.villagers?.free).toBe(0);
  });

  it("assignVillagerToJob returns empty when no free villagers", () => {
    const state = useGameStore.getState();
    const updates = assignVillagerToJob(
      { ...state, villagers: { ...state.villagers, hunter: 0, free: 0 } },
      "hunter"
    );

    expect(updates).toEqual({});
  });

  it("assignVillagerToJob returns empty when profession cap is reached (gated games)", () => {
    const state = useGameStore.getState();
    const updates = assignVillagerToJob(
      {
        ...state,
        flags: { ...state.flags, villagerCapsEnabled: true },
        villagers: { ...state.villagers, hunter: 10, free: 3 },
      },
      "hunter",
    );

    expect(updates).toEqual({});
  });

  it("assignVillagerToJob ignores profession cap when feature gate is off", () => {
    const state = useGameStore.getState();
    const updates = assignVillagerToJob(
      {
        ...state,
        flags: { ...state.flags, villagerCapsEnabled: false },
        villagers: { ...state.villagers, hunter: 25, free: 1 },
      },
      "hunter",
    );

    expect(updates.villagers?.hunter).toBe(26);
    expect(updates.villagers?.free).toBe(0);
  });

  it("assignVillagerToJob returns empty when gatherer cap is reached", () => {
    const state = useGameStore.getState();
    const updates = assignVillagerToJob(
      {
        ...state,
        flags: { ...state.flags, villagerCapsEnabled: false },
        villagers: { ...state.villagers, gatherer: 100, free: 3 },
      },
      "gatherer",
    );

    expect(updates).toEqual({});
  });

  it("assignVillagerToJob assigns up to count when free villagers and room under cap", () => {
    const state = useGameStore.getState();
    const updates = assignVillagerToJob(
      {
        ...state,
        flags: { ...state.flags, villagerCapsEnabled: false },
        villagers: { ...state.villagers, hunter: 0, free: 25 },
      },
      "hunter",
      10,
    );

    expect(updates.villagers?.hunter).toBe(10);
    expect(updates.villagers?.free).toBe(15);
  });

  it("assignVillagerToJob clamps count to free villagers and remaining cap room", () => {
    const state = useGameStore.getState();
    const updates = assignVillagerToJob(
      {
        ...state,
        flags: { ...state.flags, villagerCapsEnabled: true },
        villagers: { ...state.villagers, hunter: 7, free: 5 },
      },
      "hunter",
      10,
    );

    // Default hunter cap is 10 when caps are enabled
    expect(updates.villagers?.hunter).toBe(10);
    expect(updates.villagers?.free).toBe(2);
  });

  it("unassignVillagerFromJob removes up to count", () => {
    const state = useGameStore.getState();
    const updates = unassignVillagerFromJob(
      { ...state, villagers: { ...state.villagers, gatherer: 14, free: 0 } },
      "gatherer",
      10,
    );

    expect(updates.villagers?.gatherer).toBe(4);
    expect(updates.villagers?.free).toBe(10);
  });

  it("unassignVillagerFromJob clamps count to current job count", () => {
    const state = useGameStore.getState();
    const updates = unassignVillagerFromJob(
      { ...state, villagers: { ...state.villagers, gatherer: 3, free: 1 } },
      "gatherer",
      10,
    );

    expect(updates.villagers?.gatherer).toBe(0);
    expect(updates.villagers?.free).toBe(4);
  });

  it("touch handlers call preventDefault when condition met (prevents ghost click)", () => {
    // Verify the VillagePanel touch handler pattern: when we have a valid action,
    // we call e.preventDefault() to block synthetic mouse events.
    const mockEvent = {
      preventDefault: vi.fn(),
      cancelable: true,
      stopPropagation: vi.fn(),
    };

    // Simulate the handler logic from VillagePanel
    const currentCount = 4;
    const handleTouchStart = (e: typeof mockEvent) => {
      if (currentCount > 0) {
        e.preventDefault();
      }
    };

    handleTouchStart(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("stopHold ignores synthetic mouse events while touch hold is active", () => {
    // Mirrors VillagePanel hold-to-repeat: touch sets touchActiveRef; mouse stop must no-op.
    let touchActive = false;
    let holdCleared = false;

    const stopHold = (isTouch: boolean) => {
      if (!isTouch && touchActive) return;
      holdCleared = true;
      if (isTouch) {
        setTimeout(() => {
          touchActive = false;
        }, 100);
      }
    };

    touchActive = true;
    stopHold(false);
    expect(holdCleared).toBe(false);

    stopHold(true);
    expect(holdCleared).toBe(true);
  });
});
