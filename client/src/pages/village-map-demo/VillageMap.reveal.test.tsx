/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { applyGrowth, DEFAULT_TUNING, stageForPreset } from "@/pages/village-map-demo/catalog";
import { layoutWallRadius, wallStrokeWidth } from "@/pages/village-map-demo/geometryBuildings";
import { containSlots } from "@/pages/village-map-demo/geometryFrame";
import { buildingHutSize, placedSlots } from "@/pages/village-map-demo/geometry";
import { buildVillagePathField, villagePathDrawings, type VillagePath } from "@/pages/village-map-demo/pathways";
import { VillageMap } from "@/pages/village-map-demo/VillageMap";

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

const ignore = () => { };

function pathsForFullVillage(): VillagePath[] {
  const build = applyGrowth(stageForPreset("full"));
  const tuning = DEFAULT_TUNING;
  const radius = layoutWallRadius(tuning);
  const thickness = wallStrokeWidth(build.wall, tuning.wallThickness);
  const hutSize = buildingHutSize(tuning.squareSize, build.counts.storage ?? 0);
  const slots = containSlots(
    placedSlots(build, tuning, {}),
    radius,
    tuning,
    thickness,
    build.wall,
    hutSize,
  );
  return villagePathDrawings(
    buildVillagePathField({
      slots,
      hutSize,
      wallLevel: build.wall,
      radius,
      wallStroke: thickness,
      tuning,
    }),
    {},
  );
}

describe("village map path reveal", () => {
  it("holds a cross street until a new building on it has appeared", () => {
    const paths = pathsForFullVillage();
    const link = paths.find((path) => path.id.startsWith("link:") && path.slotIds.length > 1);
    expect(link).toBeDefined();
    const slotId = link!.slotIds.find((id) =>
      paths.some((path) => !path.id.startsWith("link:") && path.slotIds.includes(id) && path.slotIds.length > 1),
    );
    expect(slotId).toBeDefined();
    const shared = paths.find(
      (path) => !path.id.startsWith("link:") && path.slotIds.includes(slotId!) && path.slotIds.length > 1,
    );
    expect(shared).toBeDefined();
    if (!shared) return;
    const spur = paths.find((path) => path.slotIds.length === 1 && path.slotIds[0] === slotId);
    const untouched = paths.find((path) => path.id.startsWith("link:") && !path.slotIds.includes(slotId!));

    const view = render(
      <VillageMap
        build={applyGrowth(stageForPreset("full"))}
        tuning={DEFAULT_TUNING}
        overrides={{}}
        pathOverrides={{}}
        highlightId={null}
        readOnly
        reveal={{ fadeIn: { [slotId!]: true }, fadeOutTier: {} }}
        onOverride={ignore}
        onPathOverride={ignore}
        onActiveLabel={ignore}
      />,
    );

    const pathClass = (id: string) =>
      view.container.querySelector(`[data-path="${id}"]`)?.getAttribute("class") ?? "";
    expect(pathClass(link!.id)).toContain("village-map-path-after-building");
    expect(pathClass(shared.id)).toBe("");
    if (spur) expect(pathClass(spur.id)).toContain("village-map-path-after-building");
    if (untouched) expect(pathClass(untouched.id)).toBe("");
  });
});
