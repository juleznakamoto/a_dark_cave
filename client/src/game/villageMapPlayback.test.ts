import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/store/createInitialState";
import { mergeStateUpdates } from "@/game/store/mergeStateUpdates";
import { buildStateFromPlayer } from "@/game/villageMapBuild";
import { noteVillageBuildOrder } from "@/game/villageBuildOrder";
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

  it("plays a new save in the order the buildings were placed", () => {
    const order = ["woodenHut", "heartfire", "woodenHut"];
    const target = buildStateFromPlayer({ woodenHut: 2, heartfire: 1 });
    const frames = villageEvolutionFrames(target, order);

    expect(frames.map((frame) => frame.counts.woodenHut ?? 0)).toEqual([1, 1, 2]);
    expect(frames.map((frame) => frame.counts.heartfire ?? 0)).toEqual([0, 1, 1]);
    expect(sameBuild(frames[frames.length - 1], target)).toBe(true);
  });

  it("keeps the script order when a save has no build list", () => {
    const target = village({ woodenHut: 3, heartfire: 1 });
    const frames = villageEvolutionFrames(target, ["woodenHut"]);

    expect(frames.map((frame) => frame.counts.woodenHut ?? 0)).toEqual([1, 2, 3, 3]);
    expect(frames.map((frame) => frame.counts.heartfire ?? 0)).toEqual([0, 0, 0, 1]);
  });

  it("records each new copy and drops the latest one when it is lost", () => {
    expect(noteVillageBuildOrder({ woodenHut: 2 }, { woodenHut: 3 }, ["woodenHut", "woodenHut"])).toEqual([
      "woodenHut",
      "woodenHut",
      "woodenHut",
    ]);
    expect(noteVillageBuildOrder({ woodenHut: 2, stoneHut: 1 }, { woodenHut: 1 }, ["stoneHut", "woodenHut", "woodenHut"])).toEqual([
      "stoneHut",
      "woodenHut",
    ]);
    expect(noteVillageBuildOrder({ woodenHut: 4 }, { woodenHut: 5 }, [])).toEqual([]);
  });

  it("tracks build order through state updates on a fresh game only", () => {
    const fresh = createInitialState();
    const first = mergeStateUpdates(fresh, {
      buildings: { ...fresh.buildings, woodenHut: 1 },
    });
    expect(first.villageBuildOrder).toEqual(["woodenHut"]);

    const withFirst = { ...fresh, ...first, buildings: first.buildings ?? fresh.buildings };
    const second = mergeStateUpdates(withFirst, {
      buildings: { ...withFirst.buildings, heartfire: 1 },
    });
    expect(second.villageBuildOrder).toEqual(["woodenHut", "heartfire"]);

    const old = createInitialState();
    old.buildings = { ...old.buildings, woodenHut: 4 };
    const ignored = mergeStateUpdates(old, {
      buildings: { ...old.buildings, woodenHut: 5 },
    });
    expect(ignored.villageBuildOrder).toEqual([]);
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
