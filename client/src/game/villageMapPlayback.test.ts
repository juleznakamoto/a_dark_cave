import { describe, expect, it } from "vitest";
import { buildStateFromPlayer } from "@/game/villageMapBuild";
import {
  placedBuildingCount,
  villageEvolutionFrames,
  villageEvolutionStepMs,
} from "@/game/villageMapPlayback";
import { emptyBuild, sameBuild, type BuildState } from "@/pages/village-map-demo/catalog";

function village(counts: Record<string, number>, extra?: Partial<BuildState>): BuildState {
  const build = emptyBuild();
  for (const [id, value] of Object.entries(counts)) build.counts[id] = value;
  return { ...build, ...extra, counts: build.counts };
}

describe("village evolution playback", () => {
  it("walks the buildings the player owns and skips the rest", () => {
    const target = village({ woodenHut: 3, heartfire: 1, blacksmith: 1 });
    const frames = villageEvolutionFrames(target);

    expect(frames.map((frame) => frame.counts.woodenHut)).toEqual([1, 2, 3, 3, 3]);
    expect(frames.map((frame) => frame.counts.heartfire)).toEqual([0, 0, 0, 1, 1]);
    expect(frames.map((frame) => frame.counts.blacksmith)).toEqual([0, 0, 0, 0, 1]);
    expect(frames.every((frame) => (frame.counts.cabin ?? 0) === 0)).toBe(true);
    expect(sameBuild(frames[frames.length - 1], target)).toBe(true);
  });

  it("ends on the live village, including walls and a single dedication", () => {
    const target = buildStateFromPlayer(
      { woodenHut: 2, heartfire: 1, palisades: 2, bastion: 1 },
      { dagons_gift: true, dagons_gift_enhanced: true },
    );
    const frames = villageEvolutionFrames(target);
    const last = frames[frames.length - 1];

    expect(sameBuild(last, target)).toBe(true);
    expect(last.dedication).toEqual(["dagon"]);
    expect(last.dedicationDeepened).toBe("dagon");
    expect(frames[0].wall).toBe(0);
    expect(frames.findIndex((frame) => frame.wall === 1)).toBeGreaterThan(
      frames.findIndex((frame) => (frame.counts.bastion ?? 0) === 1),
    );
  });

  it("does not share frame objects", () => {
    const frames = villageEvolutionFrames(village({ woodenHut: 2 }));
    frames[1].counts.woodenHut = 9;
    expect(frames[0].counts.woodenHut).toBe(1);
  });

  it("returns nothing when there is no village yet", () => {
    expect(villageEvolutionFrames(emptyBuild())).toEqual([]);
  });

  it("holds each step longer when the village is smaller", () => {
    expect(placedBuildingCount(village({ cabin: 3 }))).toBe(1);
    expect(villageEvolutionStepMs(village({ woodenHut: 10 }))).toBe(500);
    expect(villageEvolutionStepMs(village({ woodenHut: 11 }))).toBe(400);
    expect(villageEvolutionStepMs(village({ woodenHut: 12, stoneHut: 8 }))).toBe(400);
    expect(villageEvolutionStepMs(village({ woodenHut: 12, stoneHut: 9 }))).toBe(300);
    expect(villageEvolutionStepMs(village({ woodenHut: 12, stoneHut: 12, longhouse: 5, furTents: 1 }))).toBe(300);
    expect(villageEvolutionStepMs(village({ woodenHut: 12, stoneHut: 12, longhouse: 5, furTents: 2 }))).toBe(200);
  });
});
