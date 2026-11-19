/**
 * Job assignment counts. Touch hold-to-repeat and scroll cancel live in
 * useHoldToRepeat.test.ts.
 */
import { describe, it, expect, beforeEach } from "vitest";
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
        villagers: { ...state.villagers, hunter: 5, free: 3 },
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
        villagers: { ...state.villagers, hunter: 3, free: 5 },
      },
      "hunter",
      10,
    );

    // Default hunter cap is 5 when caps are enabled
    expect(updates.villagers?.hunter).toBe(5);
    expect(updates.villagers?.free).toBe(3);
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
});
