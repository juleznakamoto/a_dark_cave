/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import { setVillageMapHoveredBuilding } from "@/game/villageMapHighlight";
import { useGameStore } from "@/game/state";
import SidePanelSection from "./SidePanelSection";

vi.mock("@/components/game/TooltipWrapper", () => ({
  TooltipWrapper: ({ children }: { children: React.ReactElement }) => children,
}));

function word(label: string) {
  return Array.from(document.querySelectorAll("span")).find(
    (node) =>
      node.textContent === label &&
      node.className.includes("side-panel-highlight-line"),
  );
}

function stubHighlightMeasurement() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 80,
    height: 14,
    top: 0,
    left: 0,
    bottom: 14,
    right: 80,
    x: 0,
    y: 0,
    toJSON() {
      return {};
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    font: "",
    measureText: () => ({
      width: 8,
      actualBoundingBoxDescent: 0,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 8,
    }),
  } as unknown as CanvasRenderingContext2D);
}

function renderBuildings() {
  return render(
    <SidePanelSection
      title="Buildings"
      sectionId="buildings"
      items={[
        { id: "woodenHut", label: "Wooden Hut", value: 2, tooltip: true },
        { id: "cabin", label: "Cabin", value: 1, tooltip: true },
      ]}
    />,
  );
}

describe("SidePanelSection highlight underline", () => {
  afterEach(() => {
    setVillageMapHoveredBuilding(null);
    useGameStore.setState({ highlightedResources: [] });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("underlines the side-panel name that matches the building under the map cursor", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    setVillageMapHoveredBuilding("woodenHut");
    renderBuildings();

    expect(word("Wooden Hut")).toBeTruthy();
    expect(word("Cabin")).toBeUndefined();

    act(() => {
      setVillageMapHoveredBuilding("cabin");
    });

    expect(word("Cabin")).toBeTruthy();
    expect(word("Wooden Hut")).toBeUndefined();
  });

  it("underlines a resource name lit by a cost hover", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    useGameStore.setState({ highlightedResources: ["wood"] });
    render(
      <SidePanelSection
        title="Resources"
        sectionId="resources"
        items={[{ id: "wood", label: "Wood", value: 4 }]}
      />,
    );

    expect(word("Wood")).toBeTruthy();
  });

  it("leaves the building count plain", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    setVillageMapHoveredBuilding("woodenHut");
    render(
      <SidePanelSection
        title="Buildings"
        sectionId="buildings"
        items={[
          {
            id: "woodenHut",
            label: (
              <>
                <span className="side-panel-name">Wooden Hut</span>
                <span className="text-muted-foreground"> (10)</span>
              </>
            ),
            value: 10,
            tooltip: true,
          },
        ]}
      />,
    );

    const name = document.querySelector(".side-panel-name");
    const count = Array.from(document.querySelectorAll("span")).find(
      (node) => node.textContent === " (10)",
    );
    expect(name?.parentElement?.className).toContain("side-panel-highlight-line");
    expect(count?.className).not.toContain("side-panel-highlight-line");
  });

  it("clears the line on a damaged fortification after the pointer leaves", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    stubHighlightMeasurement();
    setVillageMapHoveredBuilding("palisades");
    render(
      <SidePanelSection
        title="Fortifications"
        sectionId="fortifications"
        items={[{ id: "palisades", label: "Palisade ↓", value: 1 }]}
      />,
    );

    const highlighted = word("Palisade");
    expect(highlighted?.style.backgroundImage).toContain("linear-gradient");

    act(() => {
      setVillageMapHoveredBuilding(null);
    });

    const reused = Array.from(document.querySelectorAll("span")).find(
      (node) => node.textContent === "Palisade",
    );
    expect(reused?.style.backgroundImage ?? "").not.toContain("linear-gradient");
    expect(word("Palisade")).toBeUndefined();
  });
});
