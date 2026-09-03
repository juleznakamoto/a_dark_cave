import { describe, expect, it } from "vitest";
import { DEMO_WOODEN_HUT_LIMIT } from "@/game/demoLimit";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import { caveCraftTools } from "@/game/rules/caveCraftTools";
import { overlayToolsFromStorySeen } from "@shared/rebuildToolsFromStorySeen";
import { hydrateLoadedGameState } from "@/game/stateHelpers";
import { basicChartConfig } from "./basic";
import {
  buildDemoReachableBasicCompletionState,
  DEMO_REACHABLE_BUILDINGS,
  DEMO_REACHABLE_TOOL_KEYS,
} from "./basic.demoReachable";

function showWhenHutCount(
  action: { show_when?: Record<number, Record<string, unknown>> | Record<string, unknown> },
  level = 1,
): number | undefined {
  const show = action.show_when;
  if (!show) return undefined;
  const levelShow =
    typeof level === "number" && !Array.isArray(show) && level in show
      ? (show as Record<number, Record<string, unknown>>)[level]
      : (show as Record<string, unknown>);
  const value = levelShow?.["buildings.woodenHut"];
  return typeof value === "number" ? value : undefined;
}

describe("basic achievements are reachable in the Steam demo", () => {
  it(`ends at ${DEMO_WOODEN_HUT_LIMIT} wooden huts`, () => {
    expect(DEMO_WOODEN_HUT_LIMIT).toBe(8);
  });

  it("unlocks tannery, cabin, pit, and foundry before the hut cap", () => {
    expect(showWhenHutCount(villageBuildActions.buildTannery)).toBeLessThan(
      DEMO_WOODEN_HUT_LIMIT,
    );
    expect(showWhenHutCount(villageBuildActions.buildCabin)).toBeLessThan(
      DEMO_WOODEN_HUT_LIMIT,
    );
    expect(
      villageBuildActions.buildShallowPit.show_when?.[1]?.["tools.iron_pickaxe"],
    ).toBe(true);
    expect(
      villageBuildActions.buildFoundry.show_when?.[1]?.["buildings.shallowPit"],
    ).toBe(1);
    expect(
      villageBuildActions.buildWoodenHut.show_when?.[8]?.["buildings.altar"],
    ).toBe(1);
    expect(
      villageBuildActions.buildAltar.show_when?.[1]?.["tools.steel_axe"],
    ).toBe(true);
  });

  it("can craft five achievement tools before the hut cap", () => {
    expect(DEMO_REACHABLE_TOOL_KEYS.length).toBeGreaterThanOrEqual(5);
    expect(caveCraftTools.craftStoneAxe).toBeDefined();
    expect(caveCraftTools.craftStonePickaxe).toBeDefined();
    expect(
      caveCraftTools.craftIronAxe.show_when?.["buildings.blacksmith"],
    ).toBe(1);
    expect(
      caveCraftTools.craftIronPickaxe.show_when?.["buildings.blacksmith"],
    ).toBe(1);
    expect(
      caveCraftTools.craftIronLantern.show_when?.["buildings.blacksmith"],
    ).toBe(1);
    expect(
      caveCraftTools.craftSteelAxe.show_when?.["buildings.foundry"],
    ).toBe(1);
  });

  it("keeps demo tools after load rebuild from story.seen", () => {
    const state = buildDemoReachableBasicCompletionState();
    const hydrated = hydrateLoadedGameState(state);
    const rebuiltFromSeenOnly = overlayToolsFromStorySeen(
      {} as typeof state.tools,
      state.story.seen,
    );

    for (const key of DEMO_REACHABLE_TOOL_KEYS) {
      expect(state.tools[key], `${key} owned on fixture`).toBe(true);
      expect(hydrated.tools[key], `${key} kept after hydrate`).toBe(true);
      expect(
        rebuiltFromSeenOnly[key],
        `${key} restorable from story.seen if the tools slice is empty`,
      ).toBe(true);
    }
  });

  it("completes every basic achievement on a legal demo-end state", () => {
    const state = buildDemoReachableBasicCompletionState();
    expect(state.buildings.woodenHut).toBeLessThanOrEqual(DEMO_WOODEN_HUT_LIMIT);
    expect(state.buildings.woodenHut).toBe(DEMO_REACHABLE_BUILDINGS.woodenHut);
    expect(state.buildings.stoneHut).toBe(0);
    expect(state.buildings.deepeningPit).toBe(0);

    const segments = basicChartConfig.rings.flat();
    expect(segments.length).toBeGreaterThan(0);
    for (const seg of segments) {
      const count = seg.getCount(state);
      expect(
        count,
        `${seg.segmentId} (${seg.label}) should reach ${seg.maxCount} before ${DEMO_WOODEN_HUT_LIMIT} wooden huts`,
      ).toBeGreaterThanOrEqual(seg.maxCount);
    }
  });
});
