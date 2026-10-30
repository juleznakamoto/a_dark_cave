import type { GameState } from "@shared/schema";
import { applyResourceDeltas } from "@/game/stateHelpers";
import { buildStateFromPlayer } from "@/game/villageMapBuild";
import {
  VILLAGE_MAP_PATH_OVERRIDES,
  VILLAGE_MAP_POSITIONS,
  VILLAGE_MAP_TREES,
} from "@/game/villageMapLayout";
import {
  DEFAULT_TUNING,
  treeDrawScale,
  type Tuning,
} from "@/pages/village-map-demo/catalog";
import {
  PALISADE_BORDER,
  PALISADE_TOWER_STROKE,
  WALL_CHITIN_STROKE,
  CHITIN_SPIKE_LENGTH,
  bastionDrawbridge,
  bastionOutlineWidth,
  buildingHutSize,
  buildingReach,
  circleMeetsBuilding,
  circleMeetsPalisade,
  containSlots,
  innerWallPolygon,
  layoutWallRadius,
  moatBandEdges,
  moatCenterRadius,
  outsetFromCenter,
  palisadeTowers,
  placedSlots,
  pointInPolygon,
  snapToPixel,
  trapAreaLevel,
  trapMarkReach,
  trapPoints,
  trapWallOutset,
  trapsClearOfBuildings,
  treeMeetsMoat,
  treeMeetsTrap,
  wallPolygon,
  wallStrokeWidth,
  type PlacedSlot,
  type Point,
} from "@/pages/village-map-demo/geometry";
import { distanceToPolygon } from "@/pages/village-map-demo/geometryFrame";
import {
  buildVillagePathField,
  pathMeetsCircle,
  villagePathDrawings,
} from "@/pages/village-map-demo/pathways";
import { treeReach, treeVariant } from "@/pages/village-map-demo/trees";

/** How long the map waits between silver coins, inclusive. */
export const VILLAGE_SILVER_MIN_MS = 5 * 60 * 1000;
export const VILLAGE_SILVER_MAX_MS = 11 * 60 * 1000;
/** Coins on the map at once. The wait stays off until one is picked up. */
export const VILLAGE_SILVER_CAP = 3;
/** Try again soon when the village has no open ground this attempt. */
const VILLAGE_SILVER_RETRY_MS = 60 * 1000;

/** Drawn coin, in map units. */
export const VILLAGE_SILVER_COIN_RADIUS = 14.4;
/** Extra room so the coin and its tap target stay off other marks. */
const VILLAGE_SILVER_COIN_GAP = 4;
/** Occupied radius: the drawing plus the gap. */
export const VILLAGE_SILVER_COIN_REACH =
  VILLAGE_SILVER_COIN_RADIUS + VILLAGE_SILVER_COIN_GAP;

const RANDOM_TRIES = 120;
const GRID_STEP = 14;

/** One spawn in ten is gold. The rest stay silver. */
export const VILLAGE_GOLD_COIN_CHANCE = 0.1;

export type VillageMapCoinMetal = "silver" | "gold";

export type VillageSilverCoin = {
  id: string;
  x: number;
  y: number;
  /** Absent on coins saved before gold coins existed. Those pay silver. */
  metal?: VillageMapCoinMetal;
};

export function villageMapCoinMetal(random: () => number = Math.random): VillageMapCoinMetal {
  return random() < VILLAGE_GOLD_COIN_CHANCE ? "gold" : "silver";
}

export function villageSilverCoinMetal(coin: VillageSilverCoin): VillageMapCoinMetal {
  return coin.metal === "gold" ? "gold" : "silver";
}

type VillageCoinSeenState = {
  seenResources?: readonly string[] | null;
  resources?: { silver?: number; gold?: number };
};

/** Same rule as the side panel: the resource was held, or still is. */
export function hasSeenVillageCoinMetal(
  state: VillageCoinSeenState,
  metal: VillageMapCoinMetal,
): boolean {
  if ((state.seenResources ?? []).includes(metal)) return true;
  const held = state.resources?.[metal];
  return typeof held === "number" && held > 0;
}

/** Coins whose metal the player has already seen. */
export function visibleVillageSilverCoins<T extends VillageSilverCoin>(
  state: VillageCoinSeenState,
  coins: readonly T[],
): T[] {
  return coins.filter((coin) => hasSeenVillageCoinMetal(state, villageSilverCoinMetal(coin)));
}

type SilverField = {
  interior: Point[];
  slots: PlacedSlot[];
  slotReach: number[];
  hutSize: number;
  paths: Point[][];
  trees: Array<{ x: number; y: number; reach: number }>;
  wall: Point[] | null;
  wallHalf: number;
  towers: Array<Point & { r: number }>;
  towerPad: number;
  bridges: Point[][];
  traps: Point[];
  trapReach: number;
  moat: { outer: Point[]; inner: Point[] } | null;
};

/**
 * Silver a map coin pays from the housing already built.
 * Wooden huts set the early bands. Any stone hut replaces that.
 * 0-5 wooden: 5. 6 or more wooden: 10.
 * 1-5 stone: 25. 6 or more stone: 50.
 */
export function villageSilverCoinReward(woodenHuts: number, stoneHuts: number): number {
  const wooden = Math.max(0, woodenHuts);
  const stone = Math.max(0, stoneHuts);
  if (stone >= 6) return 50;
  if (stone >= 1) return 25;
  if (wooden >= 6) return 10;
  return 5;
}

/** Milliseconds until the next coin. `random` is in [0, 1). */
export function villageSilverDelayMs(random: () => number = Math.random): number {
  const span = VILLAGE_SILVER_MAX_MS - VILLAGE_SILVER_MIN_MS;
  return VILLAGE_SILVER_MIN_MS + Math.floor(random() * (span + 1));
}

function villageSilverCoinId(playTime: number, random: () => number): string {
  const stamp = Math.floor(playTime).toString(36);
  const salt = Math.floor(random() * 0xffffffff).toString(36);
  return `silver-${stamp}-${salt}`;
}

function circleMeetsPolygon(center: Point, radius: number, poly: Point[]): boolean {
  if (poly.length < 3) return false;
  if (pointInPolygon(center, poly)) return true;
  return distanceToPolygon(center, poly) <= radius;
}

function buildVillageSilverField(state: GameState): SilverField {
  const tuning: Tuning = DEFAULT_TUNING;
  const build = buildStateFromPlayer(state.buildings, state.blessings);
  const radius = layoutWallRadius(tuning);
  const thickness = wallStrokeWidth(build.wall, tuning.wallThickness);
  const hutSize = buildingHutSize(tuning.squareSize, build.counts.storage ?? 0);
  const overrides = {
    ...VILLAGE_MAP_POSITIONS,
    ...(state.villageMapOverrides ?? {}),
  };
  const pathOverrides = {
    ...VILLAGE_MAP_PATH_OVERRIDES,
    ...(state.villageMapPathOverrides ?? {}),
  };
  const slots = containSlots(
    placedSlots(build, tuning, overrides),
    radius,
    tuning,
    thickness,
    build.wall,
    hutSize,
  );
  const paths = villagePathDrawings(
    buildVillagePathField({
      slots,
      hutSize,
      wallLevel: build.wall,
      radius,
      wallStroke: thickness,
      tuning,
    }),
    pathOverrides,
  ).map((path) => path.points);
  const wallOn = build.wall > 0;
  const wall = wallOn ? wallPolygon(radius, tuning) : null;
  const inkHalf = wallOn ? thickness / 2 + PALISADE_BORDER : 0;
  const plating =
    wallOn && build.chitin ? thickness / 2 + WALL_CHITIN_STROKE + CHITIN_SPIKE_LENGTH : 0;
  const wallHalf = Math.max(inkHalf, plating);
  const towers = wallOn ? palisadeTowers(build.wall, radius, tuning, tuning.squareSize) : [];
  const towerPad = PALISADE_TOWER_STROKE / 2 + (wallOn && build.chitin ? WALL_CHITIN_STROKE : 0);
  const slotReach = slots.map((slot) => buildingReach(slot.buildingId, hutSize, slot.tier));
  const anchor = tuning.wallThickness * 1.52;
  const moatCenter = build.moat && wallOn ? moatCenterRadius(radius, anchor) : 0;
  const bridges: Point[][] = [];
  if (moatCenter > 0) {
    for (const slot of slots) {
      if (slot.buildingId !== "bastion") continue;
      const bridge = bastionDrawbridge(slot, hutSize, radius, anchor, tuning, slot.tier);
      if (bridge) bridges.push(bridge.deck);
    }
  }
  const areaLevel = trapAreaLevel(build);
  const laidTraps =
    areaLevel > 0
      ? trapsClearOfBuildings(
          trapPoints(
            radius,
            tuning,
            areaLevel,
            anchor,
            trapWallOutset(
              build.wall,
              thickness,
              tuning.squareSize,
              build.chitin ? WALL_CHITIN_STROKE : 0,
            ),
          ),
          tuning,
          areaLevel,
          build.wall,
          radius,
          slots,
          hutSize,
          bridges,
          build.chitin ? WALL_CHITIN_STROKE : 0,
          slots.reduce(
            (pad, slot) =>
              slot.buildingId === "bastion" ? Math.max(pad, bastionOutlineWidth(slot.tier)) : pad,
            0,
          ),
        )
      : [];
  const traps = build.traps > 0 ? laidTraps : [];
  const trees: SilverField["trees"] = [];
  for (const tree of VILLAGE_MAP_TREES) {
    const variant = treeVariant(tree.variant);
    if (!variant) continue;
    const center = { x: tree.x, y: tree.y };
    const reach = treeReach(variant) * treeDrawScale(tree);
    const onPath = paths.some((points) => pathMeetsCircle(points, center, reach));
    const onPalisade =
      wall != null &&
      circleMeetsPalisade(center, reach, wall, wallHalf, towers, towerPad);
    const onBuilding = slots.some((slot, index) => {
      if (Math.hypot(slot.x - center.x, slot.y - center.y) > reach + slotReach[index]) return false;
      return circleMeetsBuilding(center, reach, slot.buildingId, slot, hutSize, slot.tier);
    });
    if (onPath || onPalisade || onBuilding) continue;
    trees.push({ x: tree.x, y: tree.y, reach });
  }
  const interior = outsetFromCenter(
    innerWallPolygon(radius, tuning, thickness),
    -VILLAGE_SILVER_COIN_REACH,
  );
  return {
    interior,
    slots,
    slotReach,
    hutSize,
    paths,
    trees,
    wall,
    wallHalf,
    towers,
    towerPad,
    bridges,
    traps,
    trapReach: traps.length > 0 ? trapMarkReach(tuning, build.traps) : 0,
    moat: moatCenter > 0 ? moatBandEdges(moatCenter, tuning) : null,
  };
}

function spotOpen(
  field: SilverField,
  point: Point,
  coins: readonly { x: number; y: number }[],
): boolean {
  if (!pointInPolygon(point, field.interior)) return false;
  const reach = VILLAGE_SILVER_COIN_REACH;
  if (
    field.wall &&
    circleMeetsPalisade(point, reach, field.wall, field.wallHalf, field.towers, field.towerPad)
  ) {
    return false;
  }
  for (let index = 0; index < field.slots.length; index++) {
    const slot = field.slots[index];
    if (Math.hypot(slot.x - point.x, slot.y - point.y) > reach + field.slotReach[index]) continue;
    if (circleMeetsBuilding(point, reach, slot.buildingId, slot, field.hutSize, slot.tier)) {
      return false;
    }
  }
  if (field.paths.some((points) => pathMeetsCircle(points, point, reach))) return false;
  if (field.trees.some((tree) => Math.hypot(tree.x - point.x, tree.y - point.y) < tree.reach + reach)) {
    return false;
  }
  if (field.bridges.some((deck) => circleMeetsPolygon(point, reach, deck))) return false;
  if (field.traps.length > 0 && treeMeetsTrap(point, reach, field.traps, field.trapReach)) {
    return false;
  }
  if (field.moat && treeMeetsMoat(point, reach, field.moat, 1)) return false;
  if (
    coins.some(
      (coin) => Math.hypot(coin.x - point.x, coin.y - point.y) < reach * 2,
    )
  ) {
    return false;
  }
  return true;
}

function boundsOf(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  if (maxX - minX < 4 || maxY - minY < 4) return null;
  return { minX, minY, maxX, maxY };
}

function pickVillageSilverSpot(
  field: SilverField,
  coins: readonly { x: number; y: number }[],
  random: () => number,
): Point | null {
  const bounds = boundsOf(field.interior);
  if (!bounds) return null;
  const accept = (point: Point): Point | null => {
    const snapped = snapToPixel(point);
    return spotOpen(field, snapped, coins) ? snapped : null;
  };
  const { minX, minY, maxX, maxY } = bounds;
  for (let attempt = 0; attempt < RANDOM_TRIES; attempt++) {
    const found = accept({
      x: minX + random() * (maxX - minX),
      y: minY + random() * (maxY - minY),
    });
    if (found) return found;
  }
  const step = GRID_STEP;
  const ox = random() * step;
  const oy = random() * step;
  for (let y = minY + oy; y <= maxY; y += step) {
    for (let x = minX + ox; x <= maxX; x += step) {
      const found = accept({ x, y });
      if (found) return found;
    }
  }
  return null;
}

function settleCoins(
  field: SilverField,
  coins: VillageSilverCoin[],
  random: () => number,
): { coins: VillageSilverCoin[]; moved: boolean } {
  let moved = false;
  const next: VillageSilverCoin[] = [];
  for (const coin of coins) {
    const others = next;
    if (spotOpen(field, coin, others)) {
      next.push(coin);
      continue;
    }
    const spot = pickVillageSilverSpot(field, others, random);
    if (!spot) {
      next.push(coin);
      continue;
    }
    moved = true;
    next.push({ ...coin, x: spot.x, y: spot.y });
  }
  return { coins: moved ? next : coins, moved };
}

/** True when this map point is open ground, clear of the coins already listed. */
export function isVillageSilverSpotOpen(
  state: GameState,
  point: Point,
  coins: readonly { x: number; y: number }[] = [],
): boolean {
  return spotOpen(buildVillageSilverField(state), point, coins);
}

/**
 * Advance the map-coin wait. Spawns at most one coin, and only while fewer than three are out.
 * Returns null when nothing changed.
 */
function sameCoinList(
  left: readonly VillageSilverCoin[],
  right: readonly VillageSilverCoin[],
): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function tickVillageMapSilver(
  state: GameState,
  random: () => number = Math.random,
): Partial<Pick<GameState, "villageSilverCoins" | "villageSilverNextAt">> | null {
  if (state.flags?.mapUnlocked !== true) return null;
  const stored = state.villageSilverCoins ?? [];
  const playTime = state.playTime ?? 0;
  const nextAt = state.villageSilverNextAt ?? 0;

  if (!hasSeenVillageCoinMetal(state, "silver")) {
    if (stored.length === 0 && nextAt === 0) return null;
    return {
      ...(stored.length > 0 ? { villageSilverCoins: [] } : {}),
      ...(nextAt !== 0 ? { villageSilverNextAt: 0 } : {}),
    };
  }

  const coins = visibleVillageSilverCoins(state, stored).slice(0, VILLAGE_SILVER_CAP);
  const listChanged = !sameCoinList(stored, coins);

  if (coins.length >= VILLAGE_SILVER_CAP) {
    if (!listChanged && nextAt === 0) return null;
    return {
      ...(listChanged ? { villageSilverCoins: coins } : {}),
      villageSilverNextAt: 0,
    };
  }

  if (nextAt <= 0) {
    return {
      ...(listChanged ? { villageSilverCoins: coins } : {}),
      villageSilverNextAt: playTime + villageSilverDelayMs(random),
    };
  }
  if (playTime < nextAt) {
    return listChanged ? { villageSilverCoins: coins } : null;
  }

  const field = buildVillageSilverField(state);
  const settled = settleCoins(field, coins, random);
  const spot = pickVillageSilverSpot(field, settled.coins, random);
  if (!spot) {
    return {
      ...(settled.moved || listChanged ? { villageSilverCoins: settled.coins } : {}),
      villageSilverNextAt: playTime + VILLAGE_SILVER_RETRY_MS,
    };
  }
  const rolled = villageMapCoinMetal(random);
  const metal =
    rolled === "gold" && hasSeenVillageCoinMetal(state, "gold") ? "gold" : "silver";
  const spawned: VillageSilverCoin[] = [
    ...settled.coins,
    { id: villageSilverCoinId(playTime, random), metal, ...spot },
  ];
  return {
    villageSilverCoins: spawned,
    villageSilverNextAt:
      spawned.length >= VILLAGE_SILVER_CAP ? 0 : playTime + villageSilverDelayMs(random),
  };
}

/** Move coins that a new building, road, or tree now covers. No-op when every coin is still open. */
export function resettleVillageSilverCoins(
  state: GameState,
  random: () => number = Math.random,
): Partial<Pick<GameState, "villageSilverCoins">> | null {
  const coins = state.villageSilverCoins ?? [];
  if (coins.length === 0 || state.flags?.mapUnlocked !== true) return null;
  const settled = settleCoins(buildVillageSilverField(state), coins, random);
  if (!settled.moved) return null;
  return { villageSilverCoins: settled.coins };
}

/** Remove the coin and add the silver or gold it pays. Null when that coin is already gone. */
export function collectVillageSilverPatch(
  state: GameState,
  id: string,
): Partial<GameState> | null {
  const coins = state.villageSilverCoins ?? [];
  const coin = coins.find((entry) => entry.id === id);
  if (!coin) return null;
  const reward = villageSilverCoinReward(
    state.buildings.woodenHut ?? 0,
    state.buildings.stoneHut ?? 0,
  );
  const metal = coin.metal === "gold" ? "gold" : "silver";
  return {
    ...applyResourceDeltas(state, { [metal]: reward }),
    villageSilverCoins: coins.filter((entry) => entry.id !== id),
  };
}
