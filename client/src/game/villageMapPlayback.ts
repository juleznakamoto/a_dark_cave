import {
  BUILDINGS,
  emptyBuild,
  GROWTH_STEPS,
  sameBuild,
  type BuildState,
  type GrowthStep,
} from "@/pages/village-map-demo/catalog";

/** Hold time for each growth step, by how many buildings the village has. */
const VILLAGE_EVOLUTION_STEP_BANDS = [
  { maxBuildings: 10, stepMs: 500 },
  { maxBuildings: 20, stepMs: 400 },
  { maxBuildings: 30, stepMs: 300 },
] as const;

/** Villages past the last band. */
const VILLAGE_EVOLUTION_FAST_STEP_MS = 200;

/**
 * Houses and workshops on the map. A stack counts each copy. An upgrade
 * chain counts as one building. Walls, traps, and blessings do not.
 */
export function placedBuildingCount(build: BuildState): number {
  let count = 0;
  for (const building of BUILDINGS) {
    const owned = build.counts[building.id] ?? 0;
    if (owned <= 0) continue;
    count += building.kind === "stack" ? owned : 1;
  }
  return count;
}

export function villageEvolutionStepMs(build: BuildState): number {
  const count = placedBuildingCount(build);
  for (const band of VILLAGE_EVOLUTION_STEP_BANDS) {
    if (count <= band.maxBuildings) return band.stepMs;
  }
  return VILLAGE_EVOLUTION_FAST_STEP_MS;
}

function cloneBuild(build: BuildState): BuildState {
  return {
    ...build,
    counts: { ...build.counts },
    dedication: [...build.dedication],
  };
}

/** True when this scripted step never adds something the player does not have. */
function stepWithin(step: GrowthStep, target: BuildState): boolean {
  if (step.counts) {
    for (const [id, value] of Object.entries(step.counts)) {
      if ((target.counts[id] ?? 0) < value) return false;
    }
  }
  if (step.wall !== undefined && target.wall < step.wall) return false;
  if (step.traps !== undefined && target.traps < step.traps) return false;
  if (step.moat && !target.moat) return false;
  if (step.chitin && !target.chitin) return false;
  if (step.ebonGrace && !target.ebonGrace) return false;
  if (step.brimstoneInfusion && !target.brimstoneInfusion) return false;
  if (step.dedication && target.dedication.length === 0 && target.dedicationDeepened == null) {
    return false;
  }
  return true;
}

function applyGrowthStep(current: BuildState, step: GrowthStep, target: BuildState): BuildState {
  const next = cloneBuild(current);
  if (step.counts) {
    for (const [id, value] of Object.entries(step.counts)) {
      next.counts[id] = Math.min(value, target.counts[id] ?? 0);
    }
  }
  if (step.wall !== undefined) next.wall = Math.min(step.wall, target.wall);
  if (step.traps !== undefined) next.traps = Math.min(step.traps, target.traps);
  if (step.moat) next.moat = target.moat;
  if (step.chitin) next.chitin = target.chitin;
  if (step.ebonGrace) next.ebonGrace = target.ebonGrace;
  if (step.brimstoneInfusion) next.brimstoneInfusion = target.brimstoneInfusion;
  if (step.dedication) {
    next.dedication = [...target.dedication];
    next.dedicationDeepened = target.dedicationDeepened;
  }
  return next;
}

function remember(frames: BuildState[], build: BuildState): BuildState {
  const next = cloneBuild(build);
  const previous = frames[frames.length - 1];
  if (previous && sameBuild(previous, next)) return previous;
  frames.push(next);
  return next;
}

/** Anything the growth script does not name, one copy or upgrade at a time. */
function catchUp(frames: BuildState[], current: BuildState, target: BuildState): void {
  let cursor = current;
  for (const building of BUILDINGS) {
    const have = cursor.counts[building.id] ?? 0;
    const want = target.counts[building.id] ?? 0;
    if (want <= have) continue;
    if (building.kind === "stack") {
      for (let count = have + 1; count <= want; count++) {
        cursor = remember(frames, {
          ...cursor,
          counts: { ...cursor.counts, [building.id]: count },
        });
      }
    } else {
      cursor = remember(frames, {
        ...cursor,
        counts: { ...cursor.counts, [building.id]: want },
      });
    }
  }
  for (let wall = cursor.wall + 1; wall <= target.wall; wall++) {
    cursor = remember(frames, { ...cursor, wall });
  }
  for (let traps = cursor.traps + 1; traps <= target.traps; traps++) {
    cursor = remember(frames, { ...cursor, traps });
  }
  if (!cursor.moat && target.moat) cursor = remember(frames, { ...cursor, moat: true });
  if (!cursor.chitin && target.chitin) cursor = remember(frames, { ...cursor, chitin: true });
  if (!cursor.ebonGrace && target.ebonGrace) {
    cursor = remember(frames, { ...cursor, ebonGrace: true });
  }
  if (!cursor.brimstoneInfusion && target.brimstoneInfusion) {
    cursor = remember(frames, { ...cursor, brimstoneInfusion: true });
  }
  if (!sameBuild(cursor, target)) remember(frames, target);
}

/**
 * The player's village, one growth step at a time, in the map's build order.
 * Steps the save never reached are left out. The last frame is the live village.
 * An empty save returns no frames.
 */
export function villageEvolutionFrames(target: BuildState): BuildState[] {
  if (sameBuild(target, emptyBuild())) return [];
  const frames: BuildState[] = [];
  let current = emptyBuild();
  for (const step of GROWTH_STEPS) {
    if (!stepWithin(step, target)) continue;
    current = remember(frames, applyGrowthStep(current, step, target));
  }
  if (!sameBuild(current, target)) catchUp(frames, current, target);
  return frames;
}
