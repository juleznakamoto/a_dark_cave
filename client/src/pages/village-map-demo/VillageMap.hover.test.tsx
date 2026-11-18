/**
 * @vitest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { applyGrowth, DEFAULT_TUNING, stageForPreset } from "@/pages/village-map-demo/catalog";
import { VillageMap } from "@/pages/village-map-demo/VillageMap";

const ignore = () => { };

describe("village map hover", () => {
  it("highlights every mark of the building under the pointer", () => {
    const view = render(
      <VillageMap
        build={applyGrowth(stageForPreset("camp"))}
        tuning={DEFAULT_TUNING}
        overrides={{}}
        pathOverrides={{}}
        highlightId={null}
        readOnly
        onOverride={ignore}
        onPathOverride={ignore}
        onActiveLabel={ignore}
      />,
    );

    const huts = view.container.querySelectorAll("[data-building='woodenHut']");
    expect(huts.length).toBeGreaterThan(1);

    fireEvent.pointerEnter(huts[0]);
    expect(view.container.querySelectorAll("[data-building='woodenHut'].is-hovered")).toHaveLength(
      huts.length,
    );

    fireEvent.pointerLeave(huts[0]);
    expect(view.container.querySelector("[data-building].is-hovered")).toBeNull();
  });

  it("keeps a touch selection after the finger lifts", () => {
    const view = render(
      <VillageMap
        build={applyGrowth(stageForPreset("camp"))}
        tuning={DEFAULT_TUNING}
        overrides={{}}
        pathOverrides={{}}
        highlightId={null}
        readOnly
        onOverride={ignore}
        onPathOverride={ignore}
        onActiveLabel={ignore}
      />,
    );

    const huts = view.container.querySelectorAll("[data-building='woodenHut']");
    fireEvent.pointerEnter(huts[0], { pointerType: "touch" });
    fireEvent.pointerLeave(huts[0], { pointerType: "touch" });
    fireEvent.pointerLeave(huts[0], { pointerType: "mouse" });

    expect(view.container.querySelectorAll("[data-building='woodenHut'].is-hovered")).toHaveLength(
      huts.length,
    );
  });

  it("clears a touch selection when the map tab closes", () => {
    const view = render(
      <VillageMap
        build={applyGrowth(stageForPreset("camp"))}
        tuning={DEFAULT_TUNING}
        overrides={{}}
        pathOverrides={{}}
        highlightId={null}
        readOnly
        onOverride={ignore}
        onPathOverride={ignore}
        onActiveLabel={ignore}
      />,
    );

    const huts = view.container.querySelectorAll("[data-building='woodenHut']");
    fireEvent.pointerEnter(huts[0], { pointerType: "touch" });
    view.rerender(
      <VillageMap
        build={applyGrowth(stageForPreset("camp"))}
        tuning={DEFAULT_TUNING}
        overrides={{}}
        pathOverrides={{}}
        highlightId={null}
        readOnly
        releaseBuildingHover
        onOverride={ignore}
        onPathOverride={ignore}
        onActiveLabel={ignore}
      />,
    );

    expect(view.container.querySelector("[data-building].is-hovered")).toBeNull();
  });

  it("clears a sticky touch selection when the side panel highlights another building", () => {
    const onHoverBuilding = vi.fn();
    const view = render(
      <VillageMap
        build={applyGrowth(stageForPreset("camp"))}
        tuning={DEFAULT_TUNING}
        overrides={{}}
        pathOverrides={{}}
        highlightId={null}
        readOnly
        onOverride={ignore}
        onPathOverride={ignore}
        onActiveLabel={ignore}
        onHoverBuilding={onHoverBuilding}
      />,
    );

    const huts = view.container.querySelectorAll("[data-building='woodenHut']");
    fireEvent.pointerEnter(huts[0], { pointerType: "touch" });
    expect(view.container.querySelectorAll("[data-building='woodenHut'].is-hovered")).toHaveLength(
      huts.length,
    );

    view.rerender(
      <VillageMap
        build={applyGrowth(stageForPreset("camp"))}
        tuning={DEFAULT_TUNING}
        overrides={{}}
        pathOverrides={{}}
        highlightId="storage"
        readOnly
        onOverride={ignore}
        onPathOverride={ignore}
        onActiveLabel={ignore}
        onHoverBuilding={onHoverBuilding}
      />,
    );

    expect(view.container.querySelector("[data-building].is-hovered")).toBeNull();
    expect(onHoverBuilding).toHaveBeenCalledWith(null);
  });
});
