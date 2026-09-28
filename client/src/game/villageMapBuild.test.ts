import { describe, expect, it } from "vitest";
import { buildStateFromPlayer, heartfireHatchOpacity } from "@/game/villageMapBuild";

describe("village map build", () => {
  it("shows only the huts the player has built", () => {
    const build = buildStateFromPlayer({ woodenHut: 2 });
    expect(build.counts.woodenHut).toBe(2);
    expect(build.counts.stoneHut).toBe(0);
    expect(build.counts.heartfire).toBe(0);
    expect(build.wall).toBe(0);
    expect(build.traps).toBe(0);
    expect(build.moat).toBe(false);
  });

  it("uses the highest upgrade as that building's tier", () => {
    const build = buildStateFromPlayer({
      woodenHut: 12,
      shallowPit: 1,
      bottomlessPit: 1,
      supplyHut: 1,
      greatVault: 1,
      coinhouse: 1,
      treasury: 1,
      darkEstate: 1,
      blackEstate: 1,
      watchtower: 3,
      palisades: 4,
      traps: 1,
      improvedTraps: 1,
      fortifiedMoat: 1,
      chitinPlating: 1,
      heartfire: 1,
    });
    expect(build.counts.pit).toBe(4);
    expect(build.counts.storage).toBe(6);
    expect(build.counts.coinhouse).toBe(3);
    expect(build.counts.estate).toBe(2);
    expect(build.counts.watchtower).toBe(3);
    expect(build.counts.heartfire).toBe(1);
    expect(build.wall).toBe(4);
    expect(build.traps).toBe(2);
    expect(build.moat).toBe(true);
    expect(build.chitin).toBe(true);
  });

  it("fades the heartfire lines by 10 points for each level below 5", () => {
    expect(heartfireHatchOpacity(5)).toBe(1);
    expect(heartfireHatchOpacity(4)).toBeCloseTo(0.9);
    expect(heartfireHatchOpacity(3)).toBeCloseTo(0.8);
    expect(heartfireHatchOpacity(2)).toBeCloseTo(0.7);
    expect(heartfireHatchOpacity(1)).toBeCloseTo(0.6);
    expect(heartfireHatchOpacity(0)).toBeCloseTo(0.5);
  });

  it("marks ebon grace and a deepened god on one sanctum circle", () => {
    const build = buildStateFromPlayer(
      { heartfire: 1 },
      { ebon_grace: true, flames_touch: true, flames_touch_enhanced: true },
    );
    expect(build.ebonGrace).toBe(true);
    expect(build.dedication).toEqual(["flame"]);
    expect(build.dedicationDeepened).toBe("flame");
  });

  it("puts a sign on every circle when all four gods are chosen", () => {
    const build = buildStateFromPlayer(
      {},
      {
        dagons_gift: true,
        flames_touch: true,
        ravens_mark: true,
        ashen_embrace: true,
      },
    );
    expect(build.dedication).toEqual(["dagon", "flame", "raven", "ash"]);
    expect(build.dedicationDeepened).toBeNull();
    expect(build.ebonGrace).toBe(false);
    expect(build.brimstoneInfusion).toBe(false);
  });

  it("marks brimstone infusion on the foundry", () => {
    const build = buildStateFromPlayer({ foundry: 1 }, { brimstone_infusion: true });
    expect(build.brimstoneInfusion).toBe(true);
  });
});