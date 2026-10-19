import { describe, expect, it } from "vitest";
import { MAP_CENTER } from "@/pages/village-map-demo/catalog";
import type { Point } from "@/pages/village-map-demo/geometry";
import { pullCrossingsIntoMeetings } from "@/pages/village-map-demo/pathwayMeetings";
import type { Grid, PathEdgeBase } from "@/pages/village-map-demo/pathways";

function openGrid(): Grid {
  return {
    originX: 0,
    originY: 0,
    cell: 6,
    width: 1,
    height: 1,
    blocked: new Uint8Array(1),
    heartRadius: 20,
    blockedPoint: () => false,
    approachBlocked: () => false,
    approachTight: () => false,
    insideOthers: () => false,
  };
}

function edge(id: string, points: Point[]): PathEdgeBase {
  return { id, slotIds: [id], points };
}

function endOf(edge: PathEdgeBase): Point {
  const point = edge.points[edge.points.length - 1];
  if (!point) throw new Error(edge.id);
  return point;
}

describe("cross streets at meetings", () => {
  it("pulls a cross street onto a nearby meeting", () => {
    const trunk = edge("trunk", [
      { x: MAP_CENTER + 140, y: MAP_CENTER },
      { x: MAP_CENTER + 60, y: MAP_CENTER },
    ]);
    const onward = edge("onward", [
      { x: MAP_CENTER + 260, y: MAP_CENTER },
      { x: MAP_CENTER + 140, y: MAP_CENTER },
    ]);
    const sideA = edge("sideA", [
      { x: MAP_CENTER + 140, y: MAP_CENTER + 100 },
      { x: MAP_CENTER + 140, y: MAP_CENTER },
    ]);
    const sideB = edge("sideB", [
      { x: MAP_CENTER + 80, y: MAP_CENTER + 80 },
      { x: MAP_CENTER + 140, y: MAP_CENTER },
    ]);
    const other = edge("other", [
      { x: MAP_CENTER + 260, y: MAP_CENTER + 160 },
      { x: MAP_CENTER + 60, y: MAP_CENTER + 160 },
    ]);
    const link = edge("link:0", [
      { x: MAP_CENTER + 190, y: MAP_CENTER + 160 },
      { x: MAP_CENTER + 190, y: MAP_CENTER },
    ]);
    const edges = [trunk, onward, sideA, sideB, other, link];
    pullCrossingsIntoMeetings(openGrid(), edges);
    expect(endOf(link)).toEqual({ x: MAP_CENTER + 140, y: MAP_CENTER });
  });

  it("pulls a cross street onto the one fork beside it", () => {
    const trunk = edge("trunk", [
      { x: MAP_CENTER + 140, y: MAP_CENTER },
      { x: MAP_CENTER + 60, y: MAP_CENTER },
    ]);
    const onward = edge("onward", [
      { x: MAP_CENTER + 260, y: MAP_CENTER },
      { x: MAP_CENTER + 140, y: MAP_CENTER },
    ]);
    const sideA = edge("sideA", [
      { x: MAP_CENTER + 140, y: MAP_CENTER + 100 },
      { x: MAP_CENTER + 140, y: MAP_CENTER },
    ]);
    const other = edge("other", [
      { x: MAP_CENTER + 260, y: MAP_CENTER + 160 },
      { x: MAP_CENTER + 60, y: MAP_CENTER + 160 },
    ]);
    const link = edge("link:0", [
      { x: MAP_CENTER + 190, y: MAP_CENTER + 160 },
      { x: MAP_CENTER + 190, y: MAP_CENTER },
    ]);
    const edges = [trunk, onward, sideA, other, link];
    pullCrossingsIntoMeetings(openGrid(), edges);
    expect(endOf(link)).toEqual({ x: MAP_CENTER + 140, y: MAP_CENTER });
    expect(endOf(sideA)).toEqual({ x: MAP_CENTER + 140, y: MAP_CENTER });
  });

  it("leaves a cross street between two forks that are not already one meeting", () => {
    const trunk = edge("trunk", [
      { x: MAP_CENTER + 140, y: MAP_CENTER },
      { x: MAP_CENTER + 60, y: MAP_CENTER },
    ]);
    const mid = edge("mid", [
      { x: MAP_CENTER + 180, y: MAP_CENTER },
      { x: MAP_CENTER + 140, y: MAP_CENTER },
    ]);
    const outer = edge("outer", [
      { x: MAP_CENTER + 260, y: MAP_CENTER },
      { x: MAP_CENTER + 180, y: MAP_CENTER },
    ]);
    const sideA = edge("sideA", [
      { x: MAP_CENTER + 140, y: MAP_CENTER + 80 },
      { x: MAP_CENTER + 140, y: MAP_CENTER },
    ]);
    const sideB = edge("sideB", [
      { x: MAP_CENTER + 160, y: MAP_CENTER + 50 },
      { x: MAP_CENTER + 180, y: MAP_CENTER },
    ]);
    const other = edge("other", [
      { x: MAP_CENTER + 260, y: MAP_CENTER + 160 },
      { x: MAP_CENTER + 60, y: MAP_CENTER + 160 },
    ]);
    const link = edge("link:0", [
      { x: MAP_CENTER + 160, y: MAP_CENTER + 160 },
      { x: MAP_CENTER + 160, y: MAP_CENTER },
    ]);
    const edges = [trunk, mid, outer, sideA, sideB, other, link];
    pullCrossingsIntoMeetings(openGrid(), edges);
    expect(endOf(link)).toEqual({ x: MAP_CENTER + 160, y: MAP_CENTER });
    expect(endOf(sideB)).toEqual({ x: MAP_CENTER + 180, y: MAP_CENTER });
  });
});
