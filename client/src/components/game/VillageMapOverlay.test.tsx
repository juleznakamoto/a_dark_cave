/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventManager } from "@/game/rules/events";
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
const resourcesAtImport = useGameStore.getState().resources;
const seenResourcesAtImport = useGameStore.getState().seenResources;
const silverCoinsAtImport = useGameStore.getState().villageSilverCoins;

function showMap() {
  useGameStore.setState({ activeTab: "map" });
}

function leaveMap() {
  useGameStore.setState({ activeTab: "cave" });
}

function playIconMask(view: { getByTestId: (id: string) => HTMLElement }) {
  return view.getByTestId("button-village-map-play").querySelector("span")?.getAttribute("style") ?? "";
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
        villageMapReplaying: false,
        eventDialog: { isOpen: false, currentEvent: null, lastEndedAt: 0 },
        resources: resourcesAtImport,
        seenResources: seenResourcesAtImport,
        villageSilverCoins: silverCoinsAtImport,
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

  it("plays owned buildings one step at a time and resets when the tab closes", () => {
    vi.useFakeTimers();
    try {
      useGameStore.setState({
        buildings: { ...buildingsAtImport, woodenHut: 2 },
        activeTab: "map",
      });
      const view = render(<VillageMapOverlay />);
      const huts = () => view.container.querySelectorAll("[data-building='woodenHut']");
      expect(huts()).toHaveLength(2);

      expect(playIconMask(view)).toContain("play_button.svg");
      fireEvent.click(view.getByTestId("button-village-map-play"));
      expect(huts()).toHaveLength(1);
      expect(view.getByTestId("button-village-map-play")).toHaveAttribute("aria-pressed", "true");
      expect(playIconMask(view)).toContain("stop_button.svg");
      expect(useGameStore.getState().villageMapReplaying).toBe(true);

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(huts()).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(huts()).toHaveLength(2);

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(huts()).toHaveLength(2);
      expect(view.getByTestId("button-village-map-play")).toHaveAttribute("aria-pressed", "false");
      expect(useGameStore.getState().villageMapReplaying).toBe(false);

      fireEvent.click(view.getByTestId("button-village-map-play"));
      expect(huts()).toHaveLength(1);
      fireEvent.click(view.getByTestId("button-village-map-play"));
      expect(huts()).toHaveLength(2);
      expect(view.getByTestId("button-village-map-play")).toHaveAttribute("aria-pressed", "false");
      expect(playIconMask(view)).toContain("play_button.svg");

      fireEvent.click(view.getByTestId("button-village-map-play"));
      expect(huts()).toHaveLength(1);
      act(() => leaveMap());
      act(() => showMap());
      expect(huts()).toHaveLength(2);
      expect(view.getByTestId("button-village-map-play")).toHaveAttribute("aria-pressed", "false");
      expect(useGameStore.getState().villageMapReplaying).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides map coins while the growth replay is running", () => {
    const svgProto = SVGSVGElement.prototype as SVGSVGElement & {
      getScreenCTM?: () => DOMMatrix | null;
    };
    const previousCtm = svgProto.getScreenCTM;
    svgProto.getScreenCTM = () => null;
    useGameStore.setState({
      buildings: { ...buildingsAtImport, woodenHut: 2 },
      activeTab: "map",
      seenResources: [...(seenResourcesAtImport ?? []), "silver", "gold"],
      villageSilverCoins: [
        { id: "coin-silver", metal: "silver", x: 620, y: 180 },
        { id: "coin-gold", metal: "gold", x: 180, y: 640 },
      ],
    });
    const view = render(<VillageMapOverlay />);
    const coins = () => view.container.querySelectorAll("[data-testid='village-silver-coin']");
    expect(coins()).toHaveLength(2);

    fireEvent.click(view.getByTestId("button-village-map-play"));
    expect(coins()).toHaveLength(0);

    fireEvent.click(view.getByTestId("button-village-map-play"));
    expect(coins()).toHaveLength(2);
    if (previousCtm) svgProto.getScreenCTM = previousCtm;
  });

  it("does not roll or open events while the map replay is running", () => {
    vi.useFakeTimers();
    const roll = vi.spyOn(EventManager, "checkEvents");
    try {
      useGameStore.setState({
        villageMapReplaying: true,
        isPaused: false,
        eventDialog: { isOpen: false, currentEvent: null, lastEndedAt: 0 },
      });
      useGameStore.getState().checkEvents();
      expect(roll).not.toHaveBeenCalled();

      useGameStore.getState().setEventDialog(true, {
        id: "map-replay-block",
        message: "A stranger approaches.",
        timestamp: 1,
        type: "event",
      });
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(useGameStore.getState().eventDialog.isOpen).toBe(false);
    } finally {
      roll.mockRestore();
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
