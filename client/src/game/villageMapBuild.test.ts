import { describe, expect, it } from "vitest";
import { buildStateFromPlayer } from "@/game/villageMapBuild";

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
});