/**
 * @vitest-environment jsdom
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "@/game/state";
import VillageMapOverlay from "./VillageMapOverlay";

if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => { },
      removeEventListener: () => { },
      addListener: () => { },
      removeListener: () => { },
      dispatchEvent: () => false,
      onchange: null,
    }) as MediaQueryList;
}

const buildingsAtImport = useGameStore.getState().buildings;
const blessingsAtImport = useGameStore.getState().blessings;

function showMap() {
  useGameStore.setState({ activeTab: "map" });
}

function leaveMap() {
  useGameStore.setState({ activeTab: "cave" });
}

describe("VillageMapOverlay", () => {
  beforeEach(() => {
    const buildings = { ...buildingsAtImport, woodenHut: 1 };
    useGameStore.setState({
      activeTab: "cave",
      buildings,
      blessings: blessingsAtImport,
      villageMapSeenTiers: {},
    });
  });

  afterEach(() => {
    act(() => {
      useGameStore.setState({
        activeTab: "cave",
        buildings: buildingsAtImport,
        blessings: blessingsAtImport,
        villageMapSeenTiers: {},
      });
    });
  });

  it("keeps the svg when the map tab closes and opens again", () => {
    const view = render(<VillageMapOverlay />);
    expect(view.queryByTestId("village-map-overlay")).toBeNull();

    act(() => showMap());
    const svg = view.getByTestId("village-map");
    expect(view.getByTestId("village-map-overlay").hidden).toBe(false);
    expect(svg.querySelector(".village-map-fade-in")).not.toBeNull();

    act(() => leaveMap());
    const overlay = view.getByTestId("village-map-overlay");
    expect(overlay.hidden).toBe(true);
    expect(overlay.style.display).toBe("none");
    expect(view.getByTestId("village-map")).toBe(svg);
    expect(svg.querySelector(".village-map-fade-in")).toBeNull();

    act(() => {
      useGameStore.setState({ villageMapSeenTiers: {}, activeTab: "map" });
    });
    expect(view.getByTestId("village-map")).toBe(svg);
    const returned = view.getByTestId("village-map-overlay");
    expect(returned.hidden).toBe(false);
    expect(returned.style.display).toBe("");
    expect(svg.querySelector(".village-map-fade-in")).not.toBeNull();
  });
});
