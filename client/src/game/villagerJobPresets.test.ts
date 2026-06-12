import { describe, it, expect } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/state";
import { getVillagersInVillage } from "@/game/population";
import {
  applyPresetAssignments,
  arePresetsVisible,
  getUnlockedPresetCount,
  snapshotAssignments,
} from "@/game/villagerJobPresets";

function makeState(overrides?: Partial<GameState>): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...overrides,
    villagers: { ...base.villagers, ...(overrides?.villagers ?? {}) },
    buildings: { ...base.buildings, ...(overrides?.buildings ?? {}) },
    flags: { ...base.flags, ...(overrides?.flags ?? {}) },
  };
}

describe("villagerJobPresets - unlock count", () => {
  it("counts each built archive building as one slot", () => {
    expect(getUnlockedPresetCount(makeState())).toBe(0);
    expect(
      getUnlockedPresetCount(makeState({ buildings: { scribesOffice: 1 } as any })),
    ).toBe(1);
    expect(
      getUnlockedPresetCount(
        makeState({ buildings: { scribesOffice: 1, recordsHall: 1 } as any }),
      ),
    ).toBe(2);
    expect(
      getUnlockedPresetCount(
        makeState({
          buildings: {
            scribesOffice: 1,
            recordsHall: 1,
            grandArchive: 1,
          } as any,
        }),
      ),
    ).toBe(3);
  });

  it("presets become visible once the first archive building exists", () => {
    expect(arePresetsVisible(makeState())).toBe(false);
    expect(
      arePresetsVisible(makeState({ buildings: { scribesOffice: 1 } as any })),
    ).toBe(true);
  });
});

describe("villagerJobPresets - snapshot", () => {
  it("captures job counts and excludes free and zero entries", () => {
    const state = makeState({
      villagers: { free: 3, gatherer: 4, hunter: 0, iron_miner: 2 } as any,
    });
    const snap = snapshotAssignments(state.villagers);
    expect(snap).toEqual({ gatherer: 4, iron_miner: 2 });
    expect(snap.free).toBeUndefined();
    expect(snap.hunter).toBeUndefined();
  });
});

describe("villagerJobPresets - apply", () => {
  it("assigns the preset exactly and puts surplus into free", () => {
    const state = makeState({
      villagers: { free: 10, gatherer: 0, hunter: 0 } as any,
    });
    const updates = applyPresetAssignments(state, { gatherer: 3 });
    expect(updates.villagers?.gatherer).toBe(3);
    expect(updates.villagers?.free).toBe(7);
  });

  it("preserves the total village workforce", () => {
    const state = makeState({
      villagers: { free: 2, gatherer: 5, hunter: 3 } as any,
    });
    const workforce = getVillagersInVillage(state);
    const updates = applyPresetAssignments(state, { gatherer: 4, hunter: 4 });
    const total = getVillagersInVillage({
      villagers: updates.villagers!,
    } as GameState);
    expect(total).toBe(workforce);
  });

  it("divides villagers proportionally when the workforce shrank below the preset", () => {
    const state = makeState({
      villagers: { free: 2, gatherer: 0, hunter: 0 } as any,
    });
    // preset wants 2 + 2 = 4 but only 2 villagers exist
    const updates = applyPresetAssignments(state, { gatherer: 2, hunter: 2 });
    expect(updates.villagers?.gatherer).toBe(1);
    expect(updates.villagers?.hunter).toBe(1);
    expect(updates.villagers?.free).toBe(0);
  });

  it("clamps assignments to the per-profession cap when caps are enabled", () => {
    const state = makeState({
      flags: { villagerCapsEnabled: true } as any,
      villagerCapUpgrades: {},
      villagers: { free: 30, hunter: 0 } as any,
    });
    // hunter cap at level 0 is 10
    const updates = applyPresetAssignments(state, { hunter: 25 });
    expect(updates.villagers?.hunter).toBe(10);
    expect(updates.villagers?.free).toBe(20);
  });

  it("leaves expedition villagers untouched", () => {
    const state = makeState({
      villagers: { free: 6, gatherer: 0 } as any,
      expeditionVillagers: { exploreCave: 4 },
    });
    const updates = applyPresetAssignments(state, { gatherer: 2 });
    // applyPresetAssignments never returns expeditionVillagers
    expect(updates.expeditionVillagers).toBeUndefined();
    // only in-village villagers are redistributed
    expect(updates.villagers?.gatherer).toBe(2);
    expect(updates.villagers?.free).toBe(4);
  });

  it("sets first-assign story flags when a preset introduces hunters/gatherers", () => {
    const state = makeState({
      villagers: { free: 5, hunter: 0, gatherer: 0 } as any,
    });
    const updates = applyPresetAssignments(state, { hunter: 2, gatherer: 1 });
    expect(updates.story?.seen?.hashunter).toBe(true);
    expect(updates.story?.seen?.hasgatherer).toBe(true);
  });
});
