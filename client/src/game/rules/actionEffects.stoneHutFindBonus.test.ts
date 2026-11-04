import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../state";
import { applyActionEffects, stoneHutFindBonus } from "./actionEffects";
import "./index";

function withStoneHuts(count: number) {
  const state = createInitialState();
  return {
    ...state,
    buildings: { ...state.buildings, stoneHut: count },
    story: {
      ...state.story,
      seen: { ...state.story.seen, veinrootDiscovered: true },
    },
  };
}

describe("stone hut find bonus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds 5% only to cave finds and non-veinroot hunt finds at 10 stone huts", () => {
    const early = withStoneHuts(9);
    const late = withStoneHuts(10);
    expect(stoneHutFindBonus("hunt", "mapFragmentHuntFound", early)).toBe(0);
    expect(stoneHutFindBonus("hunt", "mapFragmentHuntFound", late)).toBe(0.05);
    expect(stoneHutFindBonus("hunt", "veinroot", late)).toBe(0);
    expect(stoneHutFindBonus("ventureDeeper", "mapFragmentCaveFound", late)).toBe(
      0.05,
    );
    expect(stoneHutFindBonus("chopWood", "veinroot", late)).toBe(0);
    expect(stoneHutFindBonus("mineStone", "silver", late)).toBe(0);
  });

  it("the 5% is enough to turn a sub-5% cave or hunt find into a hit", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.04);
    const early = withStoneHuts(0);
    const late = withStoneHuts(10);

    expect(
      applyActionEffects("ventureDeeper", early).story?.seen?.mapFragmentCaveFound,
    ).toBeUndefined();
    expect(
      applyActionEffects("ventureDeeper", late).story?.seen?.mapFragmentCaveFound,
    ).toBe(true);

    expect(
      applyActionEffects("hunt", early).story?.seen?.mapFragmentHuntFound,
    ).toBeUndefined();
    expect(
      applyActionEffects("hunt", late).story?.seen?.mapFragmentHuntFound,
    ).toBe(true);
    expect(applyActionEffects("hunt", late).resources?.veinroot ?? 0).toBe(0);
  });
});
