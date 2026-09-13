import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, useGameStore } from "@/game/state";
import {
  createDevSaveEditApi,
  getDevSaveSnapshot,
  loadDevSave,
  patchDevSave,
  setDevSavePaused,
  setDevSaveTab,
} from "@/game/devSaveEditApi";

afterEach(() => {
  useGameStore.getState().initialize(createInitialState());
});

describe("dev save edit API", () => {
  it("refuses patch until a fixture is loaded", () => {
    const result = patchDevSave({ resources: { wood: 99 } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Load a fixture first/);
    expect(useGameStore.getState().resources.wood).toBe(0);
  });

  it("loads a named fixture and merges a resource patch", () => {
    const loaded = loadDevSave("village");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const foodBefore = loaded.resources.food;
    const patched = patchDevSave({ resources: { wood: 400 } });
    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    expect(patched.resources.wood).toBe(400);
    expect(patched.resources.food).toBe(foodBefore);
    expect(useGameStore.getState().activeDevSaveId).toBe("village");
  });

  it("rejects unknown fixtures and tabs", () => {
    expect(loadDevSave("nope").ok).toBe(false);
    loadDevSave("village");
    const tab = setDevSaveTab("moon");
    expect(tab.ok).toBe(false);
    expect(useGameStore.getState().activeTab).toBe("village");
  });

  it("switches tab and pause without clearing the fixture lock", () => {
    loadDevSave("village");
    expect(setDevSaveTab("cave").ok).toBe(true);
    expect(useGameStore.getState().activeTab).toBe("cave");
    expect(setDevSavePaused(true).ok).toBe(true);
    expect(useGameStore.getState().isPaused).toBe(true);
    expect(useGameStore.getState().activeDevSaveId).toBe("village");
  });

  it("merges story.seen and ignores activeDevSaveId in the patch", () => {
    loadDevSave("village");
    const patched = patchDevSave({
      activeDevSaveId: null,
      story: { seen: { trailerShot: true } },
      buildings: { woodenHut: 6 },
    });
    expect(patched.ok).toBe(true);
    const state = useGameStore.getState();
    expect(state.activeDevSaveId).toBe("village");
    expect(state.buildings.woodenHut).toBe(6);
    expect(state.story.seen.hasStoneAxe).toBe(true);
    expect(state.story.seen.trailerShot).toBe(true);
  });

  it("exposes the named fixtures on the page API", () => {
    const api = createDevSaveEditApi();
    expect(api.fixtures).toEqual([
      "fresh-start",
      "village",
      "invest",
      "sleep-unlocked",
      "sleep-active",
      "bastion",
    ]);
    api.load("fresh-start");
    expect(getDevSaveSnapshot().fixture).toBe("fresh-start");
  });
});
