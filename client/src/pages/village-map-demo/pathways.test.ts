import { describe, expect, it } from "vitest";
import {
  DEFAULT_TUNING,
  MAP_CENTER,
  applyGrowth,
  stageForPreset,
} from "@/pages/village-map-demo/catalog";
import {
  buildingHutSize,
  buildingShapes,
  containSlots,
  innerSidePoint,
  layoutWallRadius,
  longhouseDoor,
  alchemistHallDoor,
  placedSlots,
  wallStrokeWidth,
} from "@/pages/village-map-demo/geometry";
import {
  HEART_SPLIT_CLEAR,
  INTERSECTION_REACH,
  PATH_DOOR_CLEAR,
  PATH_DOOR_FADE,
  PATH_RIBBON_REACH,
  buildVillagePathField,
  clearVillagePathFieldCache,
  constrainVillagePath,
  pathCenterlinesCross,
  pathClearanceViolation,
  pathMeetsCircle,
  softenCenterline,
  villagePathDrawings,
} from "@/pages/village-map-demo/pathways";

function fieldFor(preset: "camp" | "village" | "full", overrides: Record<string, { x: number; y: number }> = {}) {
  const build = applyGrowth(stageForPreset(preset));
  const tuning = DEFAULT_TUNING;
  const radius = layoutWallRadius(tuning);
  const thickness = wallStrokeWidth(build.wall, tuning.wallThickness);
  const hutSize = buildingHutSize(tuning.squareSize, build.counts.storage ?? 0);
  const slots = containSlots(
    placedSlots(build, tuning, overrides),
    radius,
    tuning,
    thickness,
    build.wall,
    hutSize,
  );
  const field = buildVillagePathField({
    slots,
    hutSize,
    wallLevel: build.wall,
    radius,
    wallStroke: thickness,
    tuning,
  });
  return { build, slots, hutSize, field, paths: villagePathDrawings(field, {}) };
}

/** A laid-out village where door shortcuts used to cut the cross and the monolith. */
const MONUMENT_LAYOUT: Record<string, { x: number; y: number }> = {
  "bastion:0": { x: 41, y: 316 },
  "watchtower:0": { x: 252, y: 70 },
  "tannery:0": { x: 261, y: 145 },
  "quarry:0": { x: 160, y: 797 },
  "foundry:0": { x: 514, y: 100 },
  "blackMonolith:0": { x: 546, y: 456 },
  "paleCross:0": { x: 552, y: 536 },
  "pit:0": { x: 346, y: 826 },
  "furTents:4": { x: 630, y: 691 },
  "furTents:3": { x: 564, y: 721 },
  "furTents:0": { x: 508, y: 667 },
  "furTents:1": { x: 578, y: 652 },
  "wizardTower:0": { x: 518, y: 864 },
  "trade:0": { x: 170, y: 436 },
  "cabin:0": { x: 86, y: 714 },
  "storage:0": { x: 238, y: 721 },
  "estate:0": { x: 762, y: 794 },
  "blacksmith:0": { x: 55, y: 582 },
  "coinhouse:0": { x: 188, y: 604 },
  "woodenHut:7": { x: 475, y: 386 },
  "clerksHut:0": { x: 812, y: 271 },
  "altar:0": { x: 686, y: 159 },
  "archive:0": { x: 865, y: 394 },
  "alchemistHall:0": { x: 799, y: 561 },
  "stoneHut:2": { x: 662, y: 412 },
  "woodenHut:10": { x: 389, y: 530 },
  "timberMill:0": { x: 175, y: 252 },
  "furTents:2": { x: 488, y: 727 },
  "longhouse:2": { x: 696, y: 354 },
  "longhouse:4": { x: 393, y: 272 },
  "longhouse:1": { x: 299, y: 333 },
  "longhouse:0": { x: 518, y: 254 },
  "longhouse:3": { x: 622, y: 289 },
  "builders:0": { x: 358, y: 118 },
  "stoneHut:7": { x: 329, y: 401 },
  "stoneHut:6": { x: 379, y: 343 },
  "woodenHut:9": { x: 467, y: 598 },
  "woodenHut:2": { x: 592, y: 582 },
  "pillarOfClarity:0": { x: 440, y: 474 },
  "herbGarden:0": { x: 753, y: 433 },
  "stoneHut:3": { x: 650, y: 632 },
  "woodenHut:1": { x: 620, y: 472 },
  "boneTemple:0": { x: 923, y: 620 },
  "woodenHut:5": { x: 381, y: 466 },
  "stoneHut:9": { x: 456, y: 316 },
  "stoneHut:10": { x: 325, y: 574 },
  "stoneHut:11": { x: 370, y: 626 },
  "woodenHut:11": { x: 415, y: 575 },
  "woodenHut:4": { x: 545, y: 386 },
  "boneyard:0": { x: 934, y: 514 },
};

function nearbyBranchOffs(paths: Array<{ id: string; points: Array<{ x: number; y: number }> }>): string[] {
  const same = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) < 0.75;
  const lengthOf = (points: Array<{ x: number; y: number }>) => {
    let length = 0;
    for (let index = 1; index < points.length; index++) {
      length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
    }
    return length;
  };
  const endingAt = (point: { x: number; y: number }) =>
    paths.filter((path) => {
      const end = path.points[path.points.length - 1];
      return end != null && same(end, point);
    });
  const violations: string[] = [];
  const roots = paths.filter((path) => {
    const end = path.points[path.points.length - 1];
    return end != null && !paths.some((other) => other.points[0] && same(other.points[0], end));
  });
  for (const root of roots) {
    const splits: Array<{ at: { x: number; y: number }; sides: number; fromPrev: number }> = [];
    let edge: (typeof paths)[number] | undefined = root;
    let fromPrev = 0;
    const seen = new Set<string>();
    while (edge && !seen.has(edge.id)) {
      seen.add(edge.id);
      fromPrev += lengthOf(edge.points);
      const joint = edge.points[0];
      if (!joint) break;
      const children = endingAt(joint).filter((path) => path !== edge);
      if (children.length < 2) {
        edge = children[0];
        continue;
      }
      const outwardFrom = edge.points[1];
      let onward = children[0];
      if (outwardFrom) {
        const ox = joint.x - outwardFrom.x;
        const oy = joint.y - outwardFrom.y;
        const span = Math.hypot(ox, oy) || 1;
        let best = -2;
        for (const child of children) {
          const prev = child.points[child.points.length - 2];
          if (!prev) continue;
          const dx = prev.x - joint.x;
          const dy = prev.y - joint.y;
          const childSpan = Math.hypot(dx, dy) || 1;
          const dot = (ox * dx + oy * dy) / (span * childSpan);
          if (dot > best) {
            best = dot;
            onward = child;
          }
        }
      }
      const sides = children.filter((child) => child !== onward).length;
      if (sides > 0) {
        splits.push({ at: joint, sides, fromPrev });
        fromPrev = 0;
      }
      edge = onward;
    }
    let start = 0;
    while (start < splits.length) {
      let end = start;
      let span = 0;
      while (end + 1 < splits.length && span + splits[end + 1].fromPrev <= INTERSECTION_REACH) {
        end += 1;
        span += splits[end].fromPrev;
      }
      if (end > start) {
        const sides = splits.slice(start, end + 1).reduce((count, split) => count + split.sides, 0);
        if (sides >= 3) {
          const at = splits[start].at;
          violations.push(`${Math.round(at.x)},${Math.round(at.y)} x${sides}`);
        }
      }
      start += 1;
    }
  }
  return violations;
}

describe("village pathways", () => {
  it("treats a crown on the ribbon as touched, and one past the edge as clear", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(pathMeetsCircle(line, { x: 50, y: 0 }, 10)).toBe(true);
    expect(pathMeetsCircle(line, { x: 50, y: 10 + PATH_RIBBON_REACH }, 10)).toBe(true);
    expect(pathMeetsCircle(line, { x: 50, y: 10 + PATH_RIBBON_REACH + 1 }, 10)).toBe(false);
    expect(pathMeetsCircle([], { x: 0, y: 0 }, 10)).toBe(false);
  });

  it("draws no tracks before the heartfire exists", () => {
    const { paths } = fieldFor("camp");
    expect(paths).toEqual([]);
  });

  it("remembers the routed field until the layout changes", () => {
    clearVillagePathFieldCache();
    const camp = fieldFor("camp").field;
    expect(fieldFor("camp").field).toBe(camp);
    const village = fieldFor("village").field;
    expect(village).not.toBe(camp);
    expect(fieldFor("village").field).toBe(village);
    // One remembered layout. Opening an older village routes again.
    expect(fieldFor("camp").field).not.toBe(camp);
  });

  it("lets branches stop short of the heartfire, and those branches split further out", () => {
    const { field, paths } = fieldFor("full");
    const stop = field.heartRadius;
    for (const path of paths) {
      for (const point of path.points) {
        expect(Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER)).toBeGreaterThanOrEqual(stop - 0.05);
      }
    }
    const trunks = paths.filter((path) => stopsShortOfHeart(path, field.heartRadius));
    expect(trunks.length).toBeGreaterThanOrEqual(4);
    expect(trunks.some((path) => path.slotIds.length > 1)).toBe(true);
    const angles = trunks
      .map((path) => {
        const end = path.points[path.points.length - 1];
        return Math.atan2(end.y - MAP_CENTER, end.x - MAP_CENTER);
      })
      .sort((a, b) => a - b);
    let widest = 0;
    for (let index = 0; index < angles.length; index++) {
      const next = angles[(index + 1) % angles.length];
      const gap = index === angles.length - 1 ? next + Math.PI * 2 - angles[index] : next - angles[index];
      widest = Math.max(widest, gap);
    }
    expect(widest).toBeLessThan(Math.PI * 0.9);
    const lengthOf = (points: Array<{ x: number; y: number }>) => {
      let length = 0;
      for (let index = 1; index < points.length; index++) {
        length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
      }
      return length;
    };
    const enders = (point: { x: number; y: number }) =>
      paths.filter((path) => {
        const end = path.points[path.points.length - 1];
        return end != null && Math.hypot(end.x - point.x, end.y - point.y) < 0.75;
      });
    const firstSplits: number[] = [];
    for (const trunk of trunks) {
      let along = 0;
      let edge: (typeof paths)[number] | undefined = trunk;
      const seen = new Set<string>();
      while (edge && !seen.has(edge.id)) {
        seen.add(edge.id);
        along += lengthOf(edge.points);
        const joint = edge.points[0];
        if (!joint) break;
        const children = enders(joint).filter((path) => path.id !== edge?.id);
        if (children.length >= 2) {
          firstSplits.push(along);
          break;
        }
        edge = children[0];
      }
    }
    expect(firstSplits.length).toBeGreaterThan(0);
    for (const along of firstSplits) expect(along).toBeGreaterThanOrEqual(HEART_SPLIT_CLEAR);
    expect(firstSplits.some((along) => along >= 16)).toBe(true);
  });

  it("pulls three nearby branch-offs into one intersection", () => {
    for (const preset of ["village", "full"] as const) {
      const { paths } = fieldFor(preset);
      expect(nearbyBranchOffs(paths), preset).toEqual([]);
    }
  });

  it("lets most branches leave between 30 and 150 degrees, near a right angle", () => {
    for (const preset of ["village", "full"] as const) {
      const { paths } = fieldFor(preset);
      const forks = branchForkDegrees(paths);
      expect(forks.length, preset).toBeGreaterThan(preset === "village" ? 1 : 6);
      const inBand = forks.filter((degrees) => degrees >= 30 - 2 && degrees <= 150 + 4);
      expect(inBand.length, preset).toBeGreaterThan(forks.length * 0.7);
      const neutral = forks.filter((degrees) => degrees >= 60 && degrees <= 120).length;
      expect(neutral, preset).toBeGreaterThan(forks.length * 0.5);
    }
    const { paths } = fieldFor("full");
    const otherSide = branchForkDegrees(paths).filter((degrees) => degrees > 95);
    expect(otherSide.length).toBeGreaterThan(0);
    const center = signedForks(paths).filter((fork) => fork.dist < 80);
    const branches = center.flatMap((fork) => fork.degrees.filter((degrees) => Math.abs(degrees) > 25));
    expect(branches.filter((degrees) => degrees > 0).length).toBeGreaterThan(0);
    expect(branches.filter((degrees) => degrees < 0).length).toBeGreaterThan(0);
    const neutral = branches.filter((degrees) => Math.abs(degrees) >= 60 && Math.abs(degrees) <= 120).length;
    expect(neutral).toBeGreaterThan(branches.length * 0.5);
    const doubled = center.filter((fork) => fork.degrees.filter((degrees) => Math.abs(degrees) > 25).length >= 2);
    expect(doubled.length).toBeGreaterThan(0);
    const stuck = doubled
      .filter((fork) => {
        const real = fork.degrees.filter((degrees) => Math.abs(degrees) > 25);
        return !(real.some((degrees) => degrees > 20) && real.some((degrees) => degrees < -20));
      })
      .map((fork) => {
        const real = fork.degrees.filter((degrees) => Math.abs(degrees) > 25);
        return `${Math.round(fork.dist)} [${real.map((degrees) => Math.round(degrees)).join(",")}] ${fork.ids.map((id) => id.slice(0, 18)).join(" + ")}`;
      });
    expect(stuck.join(" | ")).toBe("");
  });

  it("joins every door to the heartfire, including the bastion and the watchtower", () => {
    const { slots, paths } = fieldFor("full");
    const skipped = new Set(["paleCross", "blackMonolith", "pillarOfClarity"]);
    const without = slots.filter((slot) => skipped.has(slot.buildingId));
    expect(without.map((slot) => slot.buildingId).sort()).toEqual(
      ["blackMonolith", "paleCross", "pillarOfClarity"],
    );
    for (const slot of without) {
      expect(paths.some((path) => path.slotIds.includes(slot.id)), slot.id).toBe(false);
    }
    expect(paths.some((path) => path.slotIds.includes("bastion:0"))).toBe(true);
    const served = slots.filter(
      (slot) => slot.buildingId !== "heartfire" && !skipped.has(slot.buildingId),
    );
    for (const slot of served) {
      expect(paths.some((path) => path.slotIds.includes(slot.id)), slot.id).toBe(true);
    }
    expect(paths.every((path) => path.ribbon.startsWith("M ") && path.ribbon.endsWith(" Z"))).toBe(true);
    expect(paths.some((path) => path.stones.length > 0)).toBe(true);
  });

  it("merges tracks instead of crossing, and keeps them off other buildings", () => {
    const { slots, hutSize, paths } = fieldFor("full");
    expect(pathClearanceViolation(paths, slots, hutSize)).toBeNull();
    expect(pathCenterlinesCross(paths)).toBe(false);
    const shared = paths.filter((path) => path.slotIds.length > 1);
    expect(shared.length).toBeGreaterThan(0);
  });

  it("keeps the pale cross, pillar, and monolith clear, the same as other buildings", () => {
    const { slots, hutSize, paths } = fieldFor("full", MONUMENT_LAYOUT);
    const monuments = slots.filter((slot) =>
      slot.buildingId === "paleCross" ||
      slot.buildingId === "blackMonolith" ||
      slot.buildingId === "pillarOfClarity",
    );
    expect(monuments).toHaveLength(3);
    expect(pathClearanceViolation(paths, monuments, hutSize)).toBeNull();
  });

  it("lets a dragged stretch move without crossing or entering a building", () => {
    const { slots, hutSize, field, paths } = fieldFor("village");
    const long = paths.slice().sort((a, b) => b.points.length - a.points.length)[0];
    expect(long).toBeTruthy();
    const deltas = [
      { x: 36, y: 0 },
      { x: -36, y: 0 },
      { x: 0, y: 36 },
      { x: 0, y: -36 },
      { x: 28, y: 22 },
    ];
    let moved = long.handle;
    for (const delta of deltas) {
      const candidate = constrainVillagePath(
        field,
        long.id,
        { x: long.handle.x + delta.x, y: long.handle.y + delta.y },
        {},
      );
      const shift = Math.hypot(candidate.x - long.handle.x, candidate.y - long.handle.y);
      if (shift > 8) {
        moved = candidate;
        break;
      }
    }
    expect(Math.hypot(moved.x - long.handle.x, moved.y - long.handle.y)).toBeGreaterThan(8);
    const next = villagePathDrawings(field, { [long.id]: moved });
    expect(pathCenterlinesCross(next)).toBe(false);
    expect(pathClearanceViolation(next, slots, hutSize)).toBeNull();
    const updated = next.find((path) => path.id === long.id);
    expect(updated?.points).not.toEqual(long.points);
  });

  it("meets the middle of the inner side for the bastion, watchtower, coinhouse, scribe hut, storage, tannery, trade post, quarry, boneyard, blacksmith, archive, and sanctum", () => {
    const { slots, hutSize, paths } = fieldFor("full");
    for (const buildingId of ["bastion", "watchtower", "coinhouse", "clerksHut", "storage", "tannery", "trade", "quarry", "boneyard", "blacksmith", "archive", "altar"] as const) {
      const slot = slots.find((item) => item.buildingId === buildingId);
      expect(slot, buildingId).toBeTruthy();
      if (!slot) continue;
      const inner = innerSidePoint(buildingId, slot, hutSize, slot.tier);
      expect(inner, buildingId).toBeTruthy();
      if (!inner) continue;
      const toHeartX = MAP_CENTER - slot.x;
      const toHeartY = MAP_CENTER - slot.y;
      const toDoorX = inner.x - slot.x;
      const toDoorY = inner.y - slot.y;
      const heartLen = Math.hypot(toHeartX, toHeartY);
      const doorLen = Math.hypot(toDoorX, toDoorY);
      const align = Math.abs(toHeartX * toDoorY - toHeartY * toDoorX) / (heartLen * doorLen);
      expect(align, buildingId).toBeLessThan(0.02);
      expect(toHeartX * toDoorX + toHeartY * toDoorY, buildingId).toBeGreaterThan(0);
      const spur = paths.find((path) => path.slotIds.length === 1 && path.slotIds[0] === slot.id);
      expect(spur, buildingId).toBeTruthy();
      if (!spur) continue;
      const start = spur.points[0];
      expect(Math.hypot(start.x - inner.x, start.y - inner.y), buildingId).toBeLessThan(2.5);
    }
  });

  it("meets the alchemist hall on its right side", () => {
    const { slots, hutSize, paths } = fieldFor("full");
    const slot = slots.find((item) => item.buildingId === "alchemistHall");
    expect(slot).toBeTruthy();
    if (!slot) return;
    const onWall = alchemistHallDoor(slot, hutSize);
    const spur = paths.find((path) => path.slotIds.length === 1 && path.slotIds[0] === slot.id);
    expect(spur).toBeTruthy();
    if (!spur) return;
    const start = spur.points[0];
    const toDoorX = start.x - slot.x;
    const toDoorY = start.y - slot.y;
    const rightX = onWall.x - slot.x;
    const rightY = onWall.y - slot.y;
    const doorLen = Math.hypot(toDoorX, toDoorY);
    const rightLen = Math.hypot(rightX, rightY);
    const along = (toDoorX * rightX + toDoorY * rightY) / (doorLen * rightLen);
    expect(along).toBeGreaterThan(0.9);
    expect(Math.hypot(start.x - onWall.x, start.y - onWall.y)).toBeLessThan(8);
  });

  it("meets each longhouse on its right side", () => {
    const { slots, hutSize, paths } = fieldFor("full");
    const houses = slots.filter((slot) => slot.buildingId === "longhouse");
    expect(houses.length).toBeGreaterThan(1);
    for (const slot of houses) {
      const onWall = longhouseDoor(slot, hutSize);
      const spur = paths.find((path) => path.slotIds.length === 1 && path.slotIds[0] === slot.id);
      expect(spur, slot.id).toBeTruthy();
      if (!spur) continue;
      const start = spur.points[0];
      const toDoorX = start.x - slot.x;
      const toDoorY = start.y - slot.y;
      const rightX = onWall.x - slot.x;
      const rightY = onWall.y - slot.y;
      const doorLen = Math.hypot(toDoorX, toDoorY);
      const rightLen = Math.hypot(rightX, rightY);
      const along = (toDoorX * rightX + toDoorY * rightY) / (doorLen * rightLen);
      expect(along, slot.id).toBeGreaterThan(0.9);
      expect(Math.hypot(start.x - onWall.x, start.y - onWall.y), slot.id).toBeLessThan(8);
    }
  });

  it("leaves each door at a right angle to the wall", () => {
    const { slots, hutSize, paths } = fieldFor("full");
    const skipped = new Set(["heartfire", "paleCross", "blackMonolith", "pillarOfClarity"]);
    const spurs = paths.filter((path) => path.slotIds.length === 1 && !skipped.has(path.slotIds[0].split(":")[0]));
    expect(spurs.length).toBeGreaterThan(10);
    for (const spur of spurs) {
      const slot = slots.find((item) => item.id === spur.slotIds[0]);
      expect(slot, spur.id).toBeTruthy();
      if (!slot || spur.points.length < 2) continue;
      const door = spur.points[0];
      const next = pointAlong(spur.points, 22);
      const later = pointAlong(spur.points, 46);
      const run = Math.hypot(next.x - door.x, next.y - door.y);
      expect(run, spur.id).toBeGreaterThan(12);
      const ahead = Math.hypot(later.x - next.x, later.y - next.y);
      if (ahead > 8) {
        const turn = Math.acos(
          Math.min(
            1,
            Math.max(
              -1,
              ((next.x - door.x) * (later.x - next.x) + (next.y - door.y) * (later.y - next.y)) / (run * ahead),
            ),
          ),
        );
        expect(turn, spur.id).toBeLessThan(1.7);
      }
      const shapes = buildingShapes(slot.buildingId, slot, hutSize, slot.tier);
      // The tannery's second shape is the open court. The path stops in front of it.
      const wallShapes = slot.buildingId === "tannery" ? shapes.slice(0, 1) : shapes;
      const dx = next.x - door.x;
      const dy = next.y - door.y;
      let best = Infinity;
      const walls: Array<{ ex: number; ey: number; nx: number; ny: number; dist: number; circle: boolean }> = [];
      for (const shape of wallShapes) {
        if (shape.kind === "circle") {
          const ox = door.x - shape.c.x;
          const oy = door.y - shape.c.y;
          const length = Math.hypot(ox, oy) || 1;
          const dist = Math.max(0, length - shape.r);
          walls.push({ ex: -oy, ey: ox, nx: ox / length, ny: oy / length, dist, circle: true });
          best = Math.min(best, dist);
          continue;
        }
        for (let index = 0; index < shape.points.length; index++) {
          const start = shape.points[index];
          const end = shape.points[(index + 1) % shape.points.length];
          const ex = end.x - start.x;
          const ey = end.y - start.y;
          const lengthSq = ex * ex + ey * ey || 1;
          const t = Math.max(0, Math.min(1, ((door.x - start.x) * ex + (door.y - start.y) * ey) / lengthSq));
          const closestX = start.x + ex * t;
          const closestY = start.y + ey * t;
          const dist = Math.hypot(door.x - closestX, door.y - closestY);
          let nx = -ey;
          let ny = ex;
          const edge = Math.hypot(nx, ny) || 1;
          nx /= edge;
          ny /= edge;
          const outward = nx * (door.x - closestX) + ny * (door.y - closestY);
          const towardHeart = nx * (MAP_CENTER - door.x) + ny * (MAP_CENTER - door.y);
          if ((Math.abs(outward) < 0.2 && towardHeart < 0) || outward < 0) {
            nx = -nx;
            ny = -ny;
          }
          walls.push({ ex, ey, nx, ny, dist, circle: false });
          best = Math.min(best, dist);
        }
      }
      const touched = walls.filter((wall) => wall.dist <= best + 2);
      const leaves = touched.some((wall) => {
        const edge = Math.hypot(wall.ex, wall.ey) || 1;
        const parallel = Math.abs(wall.ex * dx + wall.ey * dy) / (edge * run);
        const outward = (wall.nx * dx + wall.ny * dy) / run;
        return parallel < 0.82 && outward > 0.4;
      });
      // The altar sits in a pocket. A forced right angle there snaps back along the wall.
      // The next longhouse stands beside this one's right wall, so the path meets that wall and turns out through the yard.
      if (slot.buildingId !== "altar" && slot.buildingId !== "longhouse") expect(leaves, spur.id).toBe(true);
    }
  });

  it("eases the turn after a right-angle leave instead of hooking back", () => {
    const { paths } = fieldFor("full");
    const spurs = paths.filter((path) => path.slotIds.length === 1 && path.points.length >= 4);
    expect(spurs.length).toBeGreaterThan(10);
    for (const spur of spurs) {
      expect(hooksBack(spur.points, 90), spur.id).toBe(false);
      expect(openingTurn(spur.points, 90, 18), spur.id).toBeLessThan(82);
    }
  });

  it("fades each building approach and each heartfire end from solid at 15 map units to clear at 3", () => {
    const { field, paths } = fieldFor("full");
    const shared = paths.filter((path) => path.slotIds.length > 1);
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.every((path) => path.doorFade == null)).toBe(true);
    const spurs = paths.filter((path) => path.slotIds.length === 1);
    expect(spurs.length).toBeGreaterThan(0);
    for (const path of spurs) {
      expect(path.doorFade, path.id).toBeTruthy();
      if (!path.doorFade) continue;
      expect(Math.hypot(path.doorFade.from.x - path.points[0].x, path.doorFade.from.y - path.points[0].y)).toBeLessThan(0.01);
      const span = Math.hypot(path.doorFade.to.x - path.doorFade.from.x, path.doorFade.to.y - path.doorFade.from.y);
      expect(span).toBeGreaterThan(PATH_DOOR_CLEAR);
      expect(span).toBeLessThanOrEqual(PATH_DOOR_FADE + 0.01);
      expect(path.doorFade.clear).toBeGreaterThan(0);
      expect(path.doorFade.clear).toBeLessThan(1);
    }
    const atHeart = (path: (typeof paths)[number]) => stopsShortOfHeart(path, field.heartRadius);
    const trunks = paths.filter(atHeart);
    expect(trunks.length).toBeGreaterThanOrEqual(4);
    for (const path of trunks) {
      expect(path.heartFade, path.id).toBeTruthy();
      if (!path.heartFade) continue;
      const end = path.points[path.points.length - 1];
      expect(Math.hypot(path.heartFade.from.x - end.x, path.heartFade.from.y - end.y)).toBeLessThan(0.01);
      const span = Math.hypot(path.heartFade.to.x - path.heartFade.from.x, path.heartFade.to.y - path.heartFade.from.y);
      let length = 0;
      for (let index = 1; index < path.points.length; index++) {
        length += Math.hypot(path.points[index].x - path.points[index - 1].x, path.points[index].y - path.points[index - 1].y);
      }
      expect(span).toBeGreaterThan(0);
      expect(span).toBeLessThanOrEqual(PATH_DOOR_FADE + 0.01);
      expect(path.heartFade.clear).toBeGreaterThan(0);
      if (length > PATH_DOOR_CLEAR) {
        expect(span).toBeGreaterThan(PATH_DOOR_CLEAR);
        expect(path.heartFade.clear).toBeLessThan(1);
      }
    }
    expect(paths.filter((path) => !atHeart(path)).every((path) => path.heartFade == null)).toBe(true);
  });

  it("bows some long straight runs a little, and leaves short runs straight", () => {
    const long = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
    ];
    const short = [
      { x: 0, y: 0 },
      { x: 80, y: 0 },
    ];
    let bowed = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const line = softenCenterline(long, seed);
      expect(line[0]).toEqual({ x: 0, y: 0 });
      expect(line[line.length - 1].x).toBeCloseTo(400);
      expect(line[line.length - 1].y).toBeCloseTo(0);
      const peak = Math.max(...line.map((point) => Math.abs(point.y)));
      expect(peak).toBeLessThan(8);
      if (peak > 3) {
        bowed += 1;
        for (const point of line) {
          if (point.x < 28 || point.x > 372) expect(Math.abs(point.y)).toBeLessThan(0.2);
        }
      }
      expect(softenCenterline(short, seed)).toEqual(short);
    }
    expect(bowed).toBeGreaterThan(4);
    expect(bowed).toBeLessThan(20);
  });

  it("bends at least one long road in the full village, and not every road", () => {
    const { paths } = fieldFor("full");
    const ever = paths.filter((path) => {
      let hits = 0;
      for (let seed = 1; seed <= 8; seed++) {
        if (softenCenterline(path.points, seed).length !== path.points.length) hits += 1;
      }
      return hits > 0 && hits < 8;
    });
    expect(ever.length).toBeGreaterThan(0);
    expect(ever.length).toBeLessThan(paths.length * 0.6);
  });
});

function stopsShortOfHeart(
  path: { points: Array<{ x: number; y: number }> },
  heartRadius: number,
): boolean {
  const end = path.points[path.points.length - 1];
  if (!end) return false;
  const gap = Math.hypot(end.x - MAP_CENTER, end.y - MAP_CENTER) - heartRadius;
  return Math.abs(gap) <= 1.5;
}

function hooksBack(points: Array<{ x: number; y: number }>, distance: number): boolean {
  let walked = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const prev = points[index - 1];
    const corner = points[index];
    const next = points[index + 1];
    const ax = corner.x - prev.x;
    const ay = corner.y - prev.y;
    const bx = next.x - corner.x;
    const by = next.y - corner.y;
    const ar = Math.hypot(ax, ay);
    const br = Math.hypot(bx, by);
    walked += ar;
    if (walked > distance) break;
    if (ar < 0.8 || br < 0.8) continue;
    if ((ax * bx + ay * by) / (ar * br) < 0.15) return true;
  }
  return false;
}

function openingTurn(points: Array<{ x: number; y: number }>, distance: number, reach: number): number {
  const at = (along: number) => {
    let left = along;
    for (let index = 1; index < points.length; index++) {
      const start = points[index - 1];
      const end = points[index];
      const span = Math.hypot(end.x - start.x, end.y - start.y);
      if (span < 1e-6) continue;
      if (left <= span) {
        const t = left / span;
        return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
      }
      left -= span;
    }
    return points[points.length - 1];
  };
  const total = points.reduce((sum, point, index) => {
    if (index === 0) return 0;
    return sum + Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y);
  }, 0);
  let worst = 0;
  for (let along = reach; along <= Math.min(total - reach, distance); along += 4) {
    const before = at(along - reach);
    const mid = at(along);
    const after = at(along + reach);
    if (!before || !mid || !after) continue;
    const ax = mid.x - before.x;
    const ay = mid.y - before.y;
    const bx = after.x - mid.x;
    const by = after.y - mid.y;
    const ar = Math.hypot(ax, ay);
    const br = Math.hypot(bx, by);
    if (ar < 1 || br < 1) continue;
    const dot = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (ar * br)));
    worst = Math.max(worst, (Math.acos(dot) * 180) / Math.PI);
  }
  return worst;
}

function signedForks(
  paths: Array<{ id: string; points: Array<{ x: number; y: number }> }>,
): Array<{ dist: number; degrees: number[]; ids: string[]; count: number }> {
  const groups = new Map<string, { dist: number; degrees: number[]; ids: string[] }>();
  for (const child of paths) {
    const end = child.points[child.points.length - 1];
    const prev = child.points[child.points.length - 2];
    if (!end || !prev) continue;
    const parent = paths.find(
      (other) =>
        other.id !== child.id &&
        other.points[0] != null &&
        Math.hypot(other.points[0].x - end.x, other.points[0].y - end.y) < 0.75,
    );
    if (!parent?.points[1]) continue;
    const outwardX = end.x - parent.points[1].x;
    const outwardY = end.y - parent.points[1].y;
    const branchX = prev.x - end.x;
    const branchY = prev.y - end.y;
    const outward = Math.hypot(outwardX, outwardY) || 1;
    const branch = Math.hypot(branchX, branchY) || 1;
    const dot = (outwardX * branchX + outwardY * branchY) / (outward * branch);
    const cross = (outwardX * branchY - outwardY * branchX) / (outward * branch);
    const degrees = (Math.atan2(cross, dot) * 180) / Math.PI;
    const key = `${Math.round(end.x)}:${Math.round(end.y)}`;
    const group = groups.get(key) ?? {
      dist: Math.hypot(end.x - MAP_CENTER, end.y - MAP_CENTER),
      degrees: [],
      ids: [],
    };
    group.degrees.push(degrees);
    group.ids.push(child.id);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ ...group, count: group.degrees.length }));
}

function branchForkDegrees(paths: Array<{ id: string; points: Array<{ x: number; y: number }> }>): number[] {
  const forks: number[] = [];
  for (const child of paths) {
    const end = child.points[child.points.length - 1];
    const prev = child.points[child.points.length - 2];
    if (!end || !prev) continue;
    const parent = paths.find(
      (other) =>
        other.id !== child.id &&
        other.points[0] != null &&
        Math.hypot(other.points[0].x - end.x, other.points[0].y - end.y) < 0.75,
    );
    if (!parent?.points[1]) continue;
    const outwardX = end.x - parent.points[1].x;
    const outwardY = end.y - parent.points[1].y;
    const branchX = prev.x - end.x;
    const branchY = prev.y - end.y;
    const outward = Math.hypot(outwardX, outwardY) || 1;
    const branch = Math.hypot(branchX, branchY) || 1;
    const dot = Math.min(1, Math.max(-1, (outwardX * branchX + outwardY * branchY) / (outward * branch)));
    const degrees = (Math.acos(dot) * 180) / Math.PI;
    if (degrees < 20 || degrees > 165) continue;
    forks.push(degrees);
  }
  return forks;
}

function pointAlong(points: Array<{ x: number; y: number }>, distance: number): { x: number; y: number } {
  let left = distance;
  for (let index = 1; index < points.length; index++) {
    const prev = points[index - 1];
    const step = points[index];
    const span = Math.hypot(step.x - prev.x, step.y - prev.y);
    if (span >= left || index === points.length - 1) {
      const t = span < 1e-6 ? 1 : Math.min(1, left / span);
      return { x: prev.x + (step.x - prev.x) * t, y: prev.y + (step.y - prev.y) * t };
    }
    left -= span;
  }
  return points[points.length - 1];
}
