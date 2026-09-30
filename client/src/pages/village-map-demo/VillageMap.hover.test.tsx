/**
 * @vitest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
