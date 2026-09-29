/**
 * @vitest-environment jsdom
 *
 * Weights the late-game map the game actually mounts, and checks which parent
 * updates force that SVG to rebuild. Paint cost (SVG filters) is not measurable
 * here; the counts are the stand-in for how much the browser has to filter.
 */
import React, { useMemo } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  VILLAGE_MAP_PATH_OVERRIDES,
  VILLAGE_MAP_POSITIONS,
  VILLAGE_MAP_TREES,
} from "@/game/villageMapLayout";
import { applyGrowth, DEFAULT_TUNING, GROWTH_STEPS } from "@/pages/village-map-demo/catalog";
import {
  buildingHutSize,
  containSlots,
  layoutWallRadius,
  placedSlots,
  wallStrokeWidth,
} from "@/pages/village-map-demo/geometry";
import { buildVillagePathField, villagePathDrawings } from "@/pages/village-map-demo/pathways";
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

const FULL_BUILD = applyGrowth(GROWTH_STEPS.length);

function MapHarness({
  highlightId = null,
  nonce = 0,
}: {
  highlightId?: string | null;
  nonce?: number;
}) {
  const callbacks = useMemo(
    () => ({
      onOverride: () => { },
      onPathOverride: () => { },
      onActiveLabel: () => { },
      onHoverBuilding: () => { },
    }),
    [nonce],
  );
  return (
    <VillageMap
      build={FULL_BUILD}
      tuning={DEFAULT_TUNING}
      overrides={VILLAGE_MAP_POSITIONS}
      pathOverrides={VILLAGE_MAP_PATH_OVERRIDES}
      trees={VILLAGE_MAP_TREES}
      highlightId={highlightId}
      readOnly
      heartfireLevel={5}
      {...callbacks}
    />
  );
}

function count(root: ParentNode, selector: string): number {
  return root.querySelectorAll(selector).length;
}

/** Filters the browser actually has to rasterize. Hover rings stay display:none. */
function visibleFilterHosts(svg: Element): Element[] {
  return [...svg.querySelectorAll("[filter]")].filter(
    (node) => node.closest(".village-map-hover-ring") == null,
  );
}

function timePathBuild(build: typeof FULL_BUILD) {
  const tuning = DEFAULT_TUNING;
  const stamp = () => performance.now();
  let mark = stamp();
  const radius = layoutWallRadius(tuning);
  const radiusMs = stamp() - mark;
  const thickness = wallStrokeWidth(build.wall, tuning.wallThickness);
  const hutSize = buildingHutSize(tuning.squareSize, build.counts.storage ?? 0);
  mark = stamp();
  const rawSlots = placedSlots(build, tuning, VILLAGE_MAP_POSITIONS);
  const placedMs = stamp() - mark;
  mark = stamp();
  const slots = containSlots(rawSlots, radius, tuning, thickness, build.wall, hutSize);
  const containMs = stamp() - mark;
  mark = stamp();
  const field = buildVillagePathField({
    slots,
    hutSize,
    wallLevel: build.wall,
    radius,
    wallStroke: thickness,
    tuning,
  });
  const fieldMs = stamp() - mark;
  mark = stamp();
  const paths = villagePathDrawings(field, VILLAGE_MAP_PATH_OVERRIDES);
  const drawMs = stamp() - mark;
  const stones = paths.reduce((sum, path) => sum + path.stones.length, 0);
  const cells = field.grid ? field.grid.width * field.grid.height : 0;
  return {
    slots: slots.length,
    paths: paths.length,
    stones,
    cells,
    grid: field.grid ? `${field.grid.width}x${field.grid.height}` : "none",
    radiusMs: Math.round(radiusMs),
    placedMs: Math.round(placedMs),
    containMs: Math.round(containMs),
    fieldMs: Math.round(fieldMs),
    drawMs: Math.round(drawMs),
  };
}

describe("village map weight", () => {
  it("spends the path rebuild on the routing grid, not on placing huts", () => {
    const full = timePathBuild(FULL_BUILD);
    const camp = timePathBuild(applyGrowth(8));

    expect(full.slots).toBeGreaterThan(40);
    expect(full.paths).toBeGreaterThan(10);
    expect(full.stones).toBeGreaterThan(100);
    expect(full.cells).toBeGreaterThan(5_000);
    // Measured about 1.0 to 1.7s on a dev machine. Placing the same huts is ~1ms.
    expect(full.fieldMs).toBeGreaterThan(100);
    expect(full.fieldMs).toBeGreaterThan(camp.fieldMs * 5);
  });

  it("mounts a full map whose always-on filters and paths dwarf the buildings", () => {
    const started = performance.now();
    const view = render(<MapHarness />);
    const elapsed = performance.now() - started;
    const svg = view.container.querySelector("svg");
    expect(svg).not.toBeNull();
    const root = svg as SVGSVGElement;
    const hosts = visibleFilterHosts(root);
    const hoverFilters = count(root, ".village-map-hover-ring [filter]");
    const turbulence = count(root, "feTurbulence");
    const morphology = count(root, "feMorphology");
    const paths = count(root, "path");
    const trees = count(root, "[data-testid^='map-tree-']");
    const buildings = count(root, "[data-slot]");

    expect(buildings).toBeGreaterThan(40);
    expect(trees).toBeGreaterThan(20);
    expect(hosts.length).toBeGreaterThan(100);
    expect(turbulence).toBeGreaterThan(50);
    expect(paths).toBeGreaterThan(1500);
    expect(hoverFilters).toBeGreaterThan(buildings);
    expect(elapsed).toBeLessThan(25_000);

    const report = {
      buildings,
      trees,
      bakedTrees: VILLAGE_MAP_TREES.length,
      visibleFilterHosts: hosts.length,
      hoverOnlyFilters: hoverFilters,
      feTurbulence: turbulence,
      feMorphology: morphology,
      paths,
      polygons: count(root, "polygon"),
      markupKb: Math.round(root.outerHTML.length / 1024),
      mountMs: Math.round(elapsed),
    };
    expect(report.markupKb).toBeGreaterThan(1000);
  }, 30_000);
});

describe("village map rebuilds", () => {
  it("keeps the svg when a parent render passes the same callbacks", () => {
    const queries = vi.spyOn(Element.prototype, "querySelectorAll");
    const view = render(<MapHarness nonce={0} />);
    const afterMount = queries.mock.calls.length;

    view.rerender(<MapHarness nonce={0} highlightId={null} />);
    const afterStable = queries.mock.calls.length;

    queries.mockRestore();
    expect(afterStable).toBe(afterMount);
  }, 30_000);

  it("rebuilds the svg when a parent render passes new callbacks", () => {
    const queries = vi.spyOn(Element.prototype, "querySelectorAll");
    const view = render(<MapHarness nonce={0} />);
    const afterMount = queries.mock.calls.length;

    const started = performance.now();
    view.rerender(<MapHarness nonce={1} />);
    const rebuildMs = performance.now() - started;
    const afterFresh = queries.mock.calls.length;

    queries.mockRestore();
    // VillageMapSvg's layout effect has no deps, so it queries the whole svg
    // again only when memo lets the component through.
    expect(afterFresh).toBeGreaterThan(afterMount);
    expect(rebuildMs).toBeLessThan(25_000);
  }, 30_000);

  it("rebuilds the svg when only the highlight id changes", () => {
    const queries = vi.spyOn(Element.prototype, "querySelectorAll");
    const view = render(<MapHarness nonce={0} highlightId={null} />);
    const afterMount = queries.mock.calls.length;

    view.rerender(<MapHarness nonce={0} highlightId="woodenHut" />);
    const afterHighlight = queries.mock.calls.length;

    queries.mockRestore();
    expect(afterHighlight).toBeGreaterThan(afterMount);
    expect(view.container.querySelector("[data-building='woodenHut'].is-highlighted")).not.toBeNull();
  }, 30_000);
});
