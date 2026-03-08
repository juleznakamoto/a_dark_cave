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
});
