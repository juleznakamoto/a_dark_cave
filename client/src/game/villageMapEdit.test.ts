import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./state";

describe("village map edits", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("ignores building and path moves", () => {
    const events = useGameStore.getState().events;
    useGameStore.setState({
      hasWonAnyGame: true,
      events: { ...events, cube15a: false, cube15b: false },
      villageMapOverrides: { "woodenHut:0": { x: 1, y: 2 } },
      villageMapPathOverrides: { "hut-path": { x: 3, y: 4 } },
    });

    const store = useGameStore.getState();
    store.setVillageMapOverride("woodenHut:0", { x: 10, y: 20 });
    store.setVillageMapOverride("woodenHut:0", null);
    store.setVillageMapPathOverride("hut-path", { x: 8, y: 9 });
    store.setVillageMapPathOverride("hut-path", null);

    expect(useGameStore.getState().villageMapOverrides).toEqual({
      "woodenHut:0": { x: 1, y: 2 },
    });
    expect(useGameStore.getState().villageMapPathOverrides).toEqual({
      "hut-path": { x: 3, y: 4 },
    });
  });
});
