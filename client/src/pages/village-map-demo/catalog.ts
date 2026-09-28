/**
 * Village map preview data.
 *
 * Slots stay put as the village grows: a hut built first keeps its spot when
 * later buildings appear, and the palisade expands around whatever is visible.
 * Chain upgrades occupy one slot. Each building draws its own upgrade.
 */

export const MAP_CENTER = 500;

export type RingId = "center" | "hut" | "civic" | "stone" | "outer";

export type BuildingKind = "stack" | "tier";

export type SlotSeed = { r: number; deg: number };

export type BuildingDef = {
  id: string;
  group: string;
  kind: BuildingKind;
  names: readonly string[];
  max: number;
  ring: RingId;
  slots: readonly SlotSeed[];
};

export type BuildState = {
  counts: Record<string, number>;
  /** 0 hidden, 1-4 palisade level. */
  wall: number;
  /** 0 hidden, 1 traps, 2 improved traps. */
  traps: number;
  moat: boolean;
  chitin: boolean;
};

export type Tuning = {
  squareSize: number;
  /** Extra stroke on the consecrated Pale Cross. Other upgrades ignore this. */
  borderWidth: number;
  fill: string;
  borderColor: string;
  ground: string;
  interior: string;
  wallColor: string;
  trapColor: string;
  wallPadding: number;
  wallWobble: number;
  wallLobes: number;
  wallSides: number;
  wallThickness: number;
  wallOval: number;
  showWallGuide: boolean;
  trapSize: number;
  trapOffset: number;
  trapStroke: number;
  ringHut: number;
  ringCivic: number;
  ringStone: number;
  ringOuter: number;
  showNames: boolean;
  fitView: boolean;
};

export type GrowthStep = {
  label: string;
  mark?: "camp" | "village" | "walled" | "grown" | "full";
  counts?: Record<string, number>;
  wall?: number;
  traps?: number;
  moat?: boolean;
  chitin?: boolean;
};

export const GROUP_ORDER = [
  "Housing",
  "Craft",
  "Storage and trade",
  "Faith",
  "Records",
  "Dark",
  "Landmarks",
] as const;

const COLOR = /^#[0-9a-fA-F]{6}$/;

function evenSlots(count: number, r: number, startDeg: number): SlotSeed[] {
  const step = 360 / count;
  return Array.from({ length: count }, (_, index) => ({
    r,
    deg: startDeg + step * index,
  }));
}

function arcSlots(
  count: number,
  r: number,
  startDeg: number,
  endDeg: number,
): SlotSeed[] {
  if (count <= 1) return [{ r, deg: startDeg }];
  const step = (endDeg - startDeg) / (count - 1);
  return Array.from({ length: count }, (_, index) => ({
    r,
    deg: startDeg + step * index,
  }));
}

function tier(
  id: string,
  group: string,
  names: readonly string[],
  ring: RingId,
  slot: SlotSeed,
): BuildingDef {
  return {
    id,
    group,
    kind: "tier",
    names,
    max: names.length,
    ring,
    slots: [slot],
  };
}

function onRing(
  entries: Array<{ id: string; group: string; names: readonly string[] }>,
  ring: RingId,
  radius: number,
  startDeg: number,
): BuildingDef[] {
  const step = 360 / entries.length;
  return entries.map((entry, index) =>
    tier(entry.id, entry.group, entry.names, ring, {
      r: radius,
      deg: startDeg + step * index,
    }),
  );
}

const CIVIC: Array<{ id: string; group: string; names: readonly string[] }> = [
  {
    id: "cabin",
    group: "Craft",
    names: ["Hunter Cabin", "Great Hunter Cabin", "Grand Hunter Lodge"],
  },
  {
    id: "blacksmith",
    group: "Craft",
    names: ["Blacksmith", "Advanced Blacksmith", "Grand Blacksmith"],
  },
  {
    id: "pit",
    group: "Craft",
    names: ["Shallow Pit", "Deepening Pit", "Deep Pit", "Bottomless Pit"],
  },
  {
    id: "tannery",
    group: "Craft",
    names: ["Tannery", "Master Tannery", "High Tannery"],
  },
  { id: "timberMill", group: "Craft", names: ["Timber Mill"] },
  { id: "quarry", group: "Craft", names: ["Quarry"] },
  {
    id: "storage",
    group: "Storage and trade",
    names: [
      "Supply Hut",
      "Storehouse",
      "Fortified Storehouse",
      "Village Warehouse",
      "Grand Repository",
      "Great Vault",
    ],
  },
  {
    id: "trade",
    group: "Storage and trade",
    names: ["Trade Post", "Grand Bazaar", "Merchants Guild"],
  },
  {
    id: "altar",
    group: "Faith",
    names: ["Altar", "Shrine", "Temple", "Sanctum"],
  },
  {
    id: "paleCross",
    group: "Faith",
    names: ["Pale Cross", "Consecrated Pale Cross"],
  },
  {
    id: "clerksHut",
    group: "Records",
    names: ["Clerk's Hut", "Scriptorium", "Tomewarden Academy"],
  },
  {
    id: "archive",
    group: "Records",
    names: ["Scribe's Office", "Records Hall", "Grand Archive"],
  },
  {
    id: "builders",
    group: "Records",
    names: ["Builder's Lodge", "Builder's Hall", "Builder's Guild"],
  },
  {
    id: "foundry",
    group: "Craft",
    names: ["Foundry", "Prime Foundry", "Masterwork Foundry"],
  },
  { id: "alchemistHall", group: "Craft", names: ["Alchemist's Hall"] },
  {
    id: "coinhouse",
    group: "Storage and trade",
    names: ["Coinhouse", "Bank", "Treasury"],
  },
];

/** Slots placed by hand on the demo. */
const SAVED_SLOTS: Record<string, SlotSeed> = {
  "woodenHut:0": { r: 114.3, deg: -43.3 },
  "woodenHut:1": { r: 121, deg: -8.7 },
  "woodenHut:2": { r: 120.2, deg: 46.7 },
  "woodenHut:3": { r: 108.1, deg: 73.7 },
  "woodenHut:4": { r: 104.5, deg: 136.4 },
  "woodenHut:5": { r: 105.2, deg: 168.5 },
  "woodenHut:6": { r: 121.1, deg: -131.5 },
  "woodenHut:7": { r: 107.9, deg: -103.4 },
  "woodenHut:8": { r: 122, deg: 18 },
  "woodenHut:9": { r: 103.3, deg: 103.3 },
  "woodenHut:10": { r: 122, deg: -162 },
  "woodenHut:11": { r: 122, deg: -72 },
  "stoneHut:0": { r: 172.2, deg: -57.8 },
  "stoneHut:1": { r: 175.4, deg: -4.8 },
  "stoneHut:2": { r: 169, deg: -30.7 },
  "stoneHut:3": { r: 179.8, deg: 45.9 },
  "stoneHut:4": { r: 178.8, deg: -79.2 },
  "stoneHut:5": { r: 169.7, deg: -176.8 },
  "stoneHut:6": { r: 179.8, deg: 158.5 },
  "stoneHut:7": { r: 176.4, deg: -149.4 },
  "stoneHut:8": { r: 176.5, deg: 18.2 },
  "stoneHut:9": { r: 175.4, deg: 132.1 },
  "stoneHut:10": { r: 176.5, deg: -100.3 },
  "stoneHut:11": { r: 181, deg: -123.3 },
  "longhouse:0": { r: 346.3, deg: -29.6 },
  "longhouse:1": { r: 354.5, deg: -43.3 },
  "longhouse:2": { r: 372.3, deg: -67.3 },
  "longhouse:3": { r: 346.9, deg: -15 },
  "longhouse:4": { r: 364.9, deg: -55.6 },
  "furTents:0": { r: 395.2, deg: -93.2 },
  "furTents:1": { r: 419.3, deg: -85.7 },
  "furTents:2": { r: 382, deg: -78.5 },
  "furTents:3": { r: 335.3, deg: -93.5 },
  "furTents:4": { r: 326.9, deg: -81.9 },
  "cabin:0": { r: 359.7, deg: -171.9 },
  "blacksmith:0": { r: 374.8, deg: 177 },
  "pit:0": { r: 295.8, deg: 86 },
  "tannery:0": { r: 346.3, deg: -128.8 },
  "timberMill:0": { r: 393.6, deg: -105.4 },
  "quarry:0": { r: 365.1, deg: -116.3 },
  "storage:0": { r: 401.9, deg: 155.4 },
  "trade:0": { r: 351.8, deg: -161.2 },
  "altar:0": { r: 267.1, deg: -1.3 },
  "paleCross:0": { r: 61.7, deg: 10.3 },
  "clerksHut:0": { r: 252, deg: -43.6 },
  "archive:0": { r: 258.2, deg: -23 },
  "builders:0": { r: 298.9, deg: -108.3 },
  "foundry:0": { r: 270.7, deg: -124.6 },
  "alchemistHall:0": { r: 250.9, deg: 20.5 },
  "coinhouse:0": { r: 393.6, deg: 166.9 },
  "blackMonolith:0": { r: 53.8, deg: -51.2 },
  "pillarOfClarity:0": { r: 53.9, deg: -134.2 },
  "boneTemple:0": { r: 402.3, deg: 14.5 },
  "boneyard:0": { r: 398, deg: 3.2 },
  "herbGarden:0": { r: 370.3, deg: 62.8 },
  "bastion:0": { r: 409.5, deg: -145.6 },
  "watchtower:0": { r: 427.7, deg: -125.3 },
  "wizardTower:0": { r: 376.1, deg: 37.5 },
  "estate:0": { r: 344.2, deg: 128.3 },
};

function withSavedSlots(buildings: BuildingDef[]): BuildingDef[] {
  return buildings.map((building) => {
    let changed = false;
    const slots = building.slots.map((slot, index) => {
      const saved = SAVED_SLOTS[`${building.id}:${index}`];
      if (!saved) return slot;
      changed = true;
      return saved;
    });
    return changed ? { ...building, slots } : building;
  });
}

export const BUILDINGS: BuildingDef[] = withSavedSlots([
  tier("heartfire", "Landmarks", ["Heartfire"], "center", { r: 0, deg: 0 }),
  {
    id: "woodenHut",
    group: "Housing",
    kind: "stack",
    names: ["Wooden Hut"],
    max: 12,
    ring: "hut",
    slots: [...evenSlots(8, 74, -68), ...evenSlots(4, 122, 18)],
  },
  {
    id: "stoneHut",
    group: "Housing",
    kind: "stack",
    names: ["Stone Hut"],
    max: 12,
    ring: "stone",
    slots: evenSlots(12, 252, -6),
  },
  {
    id: "longhouse",
    group: "Housing",
    kind: "stack",
    names: ["Longhouse"],
    max: 5,
    ring: "outer",
    slots: arcSlots(5, 324, 100, 172),
  },
  {
    id: "furTents",
    group: "Housing",
    kind: "stack",
    names: ["Fur Tent"],
    max: 5,
    ring: "outer",
    slots: arcSlots(5, 324, 256, 320),
  },
  ...onRing(CIVIC, "civic", 176, 11).map((building) => {
    if (building.id === "pit") {
      return { ...building, ring: "outer" as const, slots: [{ r: 400, deg: 90 }] };
    }
    if (building.id === "paleCross") {
      return { ...building, ring: "center" as const, slots: [{ r: 38, deg: 90 }] };
    }
    return building;
  }),
  tier("blackMonolith", "Dark", ["Black Monolith"], "center", { r: 38, deg: 330 }),
  tier("pillarOfClarity", "Dark", ["Pillar of Clarity"], "center", {
    r: 38,
    deg: 210,
  }),
  tier("boneTemple", "Dark", ["Bone Temple"], "outer", { r: 324, deg: 8 }),
  tier("boneyard", "Dark", ["Boneyard"], "outer", { r: 324, deg: 24 }),
  tier("herbGarden", "Dark", ["Herb Garden"], "outer", { r: 324, deg: 40 }),
  tier("bastion", "Landmarks", ["Bastion"], "outer", { r: 324, deg: 188 }),
  tier(
    "watchtower",
    "Landmarks",
    ["Watchtower 1", "Watchtower 2", "Watchtower 3", "Watchtower 4"],
    "outer",
    { r: 324, deg: 206 },
  ),
  tier("wizardTower", "Landmarks", ["Wizard Tower"], "outer", {
    r: 324,
    deg: 224,
  }),
  tier("estate", "Landmarks", ["Dark Estate", "Black Estate"], "outer", {
    r: 324,
    deg: 242,
  }),
]);

export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((building) => [building.id, building]),
);

export const DEFAULT_TUNING: Tuning = {
  squareSize: 28,
  borderWidth: 1.75,
  fill: "#e8e8e8",
  borderColor: "#e4d8bc",
  ground: "#0d0d0d",
  interior: "#ffffff",
  wallColor: "#bbbbbb",
  trapColor: "#f4f1ea",
  wallPadding: 0,
  wallWobble: 0.06,
  wallLobes: 3,
  wallSides: 20,
  wallThickness: 7,
  wallOval: 0.94,
  showWallGuide: false,
  trapSize: 7,
  trapOffset: 10,
  trapStroke: 1.6,
  ringHut: 1,
  ringCivic: 1,
  ringStone: 1,
  ringOuter: 1,
  showNames: false,
  fitView: true,
};

export const GROWTH_STEPS: GrowthStep[] = [
  { label: "First hut", counts: { woodenHut: 1 } },
  { label: "Second hut", counts: { woodenHut: 2 } },
  { label: "Third hut", mark: "camp", counts: { woodenHut: 3 } },
  { label: "Fourth hut", counts: { woodenHut: 4 } },
  { label: "Heartfire", counts: { heartfire: 1 } },
  { label: "Hunter Cabin", counts: { cabin: 1 } },
  { label: "Fifth hut", counts: { woodenHut: 5 } },
  { label: "Sixth hut", counts: { woodenHut: 6 } },
  { label: "Blacksmith", counts: { blacksmith: 1 } },
  { label: "Shallow Pit", counts: { pit: 1 } },
  { label: "Seventh hut", counts: { woodenHut: 7 } },
  { label: "Eighth hut", counts: { woodenHut: 8 } },
  { label: "Advanced Blacksmith", counts: { blacksmith: 2 } },
  { label: "Supply Hut", mark: "village", counts: { storage: 1 } },
  { label: "Ninth hut", counts: { woodenHut: 9 } },
  { label: "Tenth hut", counts: { woodenHut: 10 } },
  { label: "Tannery", counts: { tannery: 1 } },
  { label: "Timber Mill", counts: { timberMill: 1 } },
  { label: "Traps", traps: 1 },
  { label: "Altar", counts: { altar: 1 } },
  { label: "Clerk's Hut", counts: { clerksHut: 1 } },
  { label: "Trade Post", counts: { trade: 1 } },
  { label: "Quarry", counts: { quarry: 1 } },
  { label: "Stone hut", counts: { stoneHut: 1 } },
  { label: "Second stone hut", counts: { stoneHut: 2 } },
  { label: "Foundry", counts: { foundry: 1 } },
  { label: "Builder's Lodge", counts: { builders: 1 } },
  { label: "Bastion", counts: { bastion: 1 } },
  { label: "Palisades", wall: 1 },
  { label: "Watchtower", counts: { watchtower: 1 } },
  { label: "Taller watchtower", counts: { watchtower: 2 } },
  { label: "Higher palisades", mark: "walled", wall: 2 },
  { label: "Improved traps", traps: 2 },
  { label: "Third stone hut", counts: { stoneHut: 3 } },
  { label: "Fourth stone hut", counts: { stoneHut: 4 } },
  { label: "Fifth stone hut", counts: { stoneHut: 5 } },
  { label: "Sixth stone hut", counts: { stoneHut: 6 } },
  { label: "Storehouse", counts: { storage: 2 } },
  { label: "Shrine", counts: { altar: 2 } },
  { label: "Scribe's Office", counts: { archive: 1 } },
  { label: "Great Hunter Cabin", counts: { cabin: 2 } },
  { label: "Stone palisades", wall: 3 },
  { label: "Fortified Moat", moat: true },
  { label: "Longhouse", counts: { longhouse: 1 } },
  { label: "Second longhouse", counts: { longhouse: 2 } },
  { label: "Fur tent", counts: { furTents: 1 } },
  { label: "Second fur tent", mark: "grown", counts: { furTents: 2 } },
  { label: "Seventh stone hut", counts: { stoneHut: 7 } },
  { label: "Eighth stone hut", counts: { stoneHut: 8 } },
  { label: "Ninth stone hut", counts: { stoneHut: 9 } },
  { label: "Tenth stone hut", counts: { stoneHut: 10 } },
  { label: "High watchtower", counts: { watchtower: 3 } },
  { label: "Tall watchtower", counts: { watchtower: 4 } },
  { label: "Grand Blacksmith", counts: { blacksmith: 3 } },
  { label: "Prime Foundry", counts: { foundry: 2 } },
  { label: "Master Tannery", counts: { tannery: 2 } },
  { label: "Fortified Storehouse", counts: { storage: 3 } },
  { label: "Village Warehouse", counts: { storage: 4 } },
  { label: "Grand Bazaar", counts: { trade: 2 } },
  { label: "Temple", counts: { altar: 3 } },
  { label: "Scriptorium", counts: { clerksHut: 2 } },
  { label: "Records Hall", counts: { archive: 2 } },
  { label: "Builder's Hall", counts: { builders: 2 } },
  { label: "Coinhouse", counts: { coinhouse: 1 } },
  { label: "Pale Cross", counts: { paleCross: 1 } },
  { label: "Deepening Pit", counts: { pit: 2 } },
  { label: "Alchemist's Hall", counts: { alchemistHall: 1 } },
  { label: "Black Monolith", counts: { blackMonolith: 1 } },
  { label: "Pillar of Clarity", counts: { pillarOfClarity: 1 } },
  { label: "Bone Temple", counts: { boneTemple: 1 } },
  { label: "Boneyard", counts: { boneyard: 1 } },
  { label: "Herb Garden", counts: { herbGarden: 1 } },
  { label: "Wizard Tower", counts: { wizardTower: 1 } },
  { label: "Dark Estate", counts: { estate: 1 } },
  { label: "Final palisades", wall: 4 },
  { label: "Chitin plating", chitin: true },
  { label: "Eleventh hut", counts: { woodenHut: 11 } },
  { label: "Twelfth hut", counts: { woodenHut: 12 } },
  { label: "Eleventh stone hut", counts: { stoneHut: 11 } },
  { label: "Twelfth stone hut", counts: { stoneHut: 12 } },
  { label: "Third longhouse", counts: { longhouse: 3 } },
  { label: "Fourth longhouse", counts: { longhouse: 4 } },
  { label: "Fifth longhouse", counts: { longhouse: 5 } },
  { label: "Third fur tent", counts: { furTents: 3 } },
  { label: "Fourth fur tent", counts: { furTents: 4 } },
  { label: "Fifth fur tent", counts: { furTents: 5 } },
  { label: "Grand Hunter Lodge", counts: { cabin: 3 } },
  { label: "Deep Pit", counts: { pit: 3 } },
  { label: "Bottomless Pit", counts: { pit: 4 } },
  { label: "High Tannery", counts: { tannery: 3 } },
  { label: "Grand Repository", counts: { storage: 5 } },
  { label: "Great Vault", counts: { storage: 6 } },
  { label: "Merchants Guild", counts: { trade: 3 } },
  { label: "Sanctum", counts: { altar: 4 } },
  { label: "Consecrated Pale Cross", counts: { paleCross: 2 } },
  { label: "Tomewarden Academy", counts: { clerksHut: 3 } },
  { label: "Grand Archive", counts: { archive: 3 } },
  { label: "Builder's Guild", counts: { builders: 3 } },
  { label: "Masterwork Foundry", counts: { foundry: 3 } },
  { label: "Bank", counts: { coinhouse: 2 } },
  { label: "Black Estate", counts: { estate: 2 } },
  { label: "Treasury", mark: "full", counts: { coinhouse: 3 } },
];

export const MAP_PRESETS = [
  { id: "empty", label: "Empty" },
  { id: "camp", label: "Camp" },
  { id: "village", label: "Village" },
  { id: "walled", label: "Walled" },
  { id: "grown", label: "Grown" },
  { id: "full", label: "Full" },
] as const;

export type PresetId = (typeof MAP_PRESETS)[number]["id"];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && COLOR.test(value) ? value : fallback;
}

export function zeroCounts(): Record<string, number> {
  return Object.fromEntries(BUILDINGS.map((building) => [building.id, 0]));
}

export function emptyBuild(): BuildState {
  return {
    counts: zeroCounts(),
    wall: 0,
    traps: 0,
    moat: false,
    chitin: false,
  };
}

export function stageForPreset(id: PresetId): number {
  if (id === "empty") return 0;
  const index = GROWTH_STEPS.findIndex((step) => step.mark === id);
  return index === -1 ? 0 : index + 1;
}

export function growthLabel(stage: number): string {
  if (stage <= 0) return "Empty ground";
  return GROWTH_STEPS[Math.min(stage, GROWTH_STEPS.length) - 1]?.label ?? "Empty ground";
}

export function sameBuild(a: BuildState, b: BuildState): boolean {
  if (a.wall !== b.wall || a.traps !== b.traps || a.moat !== b.moat || a.chitin !== b.chitin) {
    return false;
  }
  return BUILDINGS.every(
    (building) => (a.counts[building.id] ?? 0) === (b.counts[building.id] ?? 0),
  );
}

export function applyGrowth(stage: number): BuildState {
  const state = emptyBuild();
  const last = Math.max(0, Math.min(Math.floor(stage), GROWTH_STEPS.length));
  for (let index = 0; index < last; index++) {
    const step = GROWTH_STEPS[index];
    if (step.counts) {
      for (const [id, value] of Object.entries(step.counts)) {
        if (BUILDING_BY_ID[id]) state.counts[id] = value;
      }
    }
    if (step.wall !== undefined) state.wall = step.wall;
    if (step.traps !== undefined) state.traps = step.traps;
    if (step.moat) state.moat = true;
    if (step.chitin) state.chitin = true;
  }
  return state;
}

export function slotLabel(building: BuildingDef, index: number, tierLevel: number): string {
  if (building.kind === "stack") {
    return building.max > 1 ? `${building.names[0]} ${index + 1}` : building.names[0];
  }
  return building.names[Math.min(building.names.length, Math.max(1, tierLevel)) - 1] ?? building.names[0];
}

export function sanitizeBuild(input: unknown): BuildState {
  const source = input && typeof input === "object" ? (input as Partial<BuildState>) : {};
  const counts = zeroCounts();
  const rawCounts =
    source.counts && typeof source.counts === "object" ? source.counts : {};
  for (const building of BUILDINGS) {
    const value = rawCounts[building.id];
    counts[building.id] =
      typeof value === "number" ? Math.round(clamp(value, 0, building.max)) : 0;
  }
  return {
    counts,
    wall: typeof source.wall === "number" ? Math.round(clamp(source.wall, 0, 4)) : 0,
    traps: typeof source.traps === "number" ? Math.round(clamp(source.traps, 0, 2)) : 0,
    moat: source.moat === true,
    chitin: source.chitin === true,
  };
}

export function sanitizeTuning(input: unknown): Tuning {
  const source = input && typeof input === "object" ? (input as Partial<Tuning>) : {};
  return {
    squareSize: clamp(source.squareSize ?? DEFAULT_TUNING.squareSize, 12, 48),
    borderWidth: clamp(source.borderWidth ?? DEFAULT_TUNING.borderWidth, 0.5, 6),
    fill: color(source.fill === "#f4f1ea" ? undefined : source.fill, DEFAULT_TUNING.fill),
    borderColor: color(source.borderColor, DEFAULT_TUNING.borderColor),
    ground: color(
      source.ground === "#0c0b09" || source.ground === "#1a1a1a" ? undefined : source.ground,
      DEFAULT_TUNING.ground,
    ),
    interior: color(
      source.interior === "#16130f" ||
        source.interior === "#333333" ||
        source.interior === "#555555" ||
        source.interior === "#777777" ||
        source.interior === "#999999" ? undefined : source.interior,
      DEFAULT_TUNING.interior,
    ),
    wallColor: color(
      source.wallColor === "#efeae2" ||
        source.wallColor === "#555555" ||
        source.wallColor === "#777777" ||
        source.wallColor === "#999999"
        ? undefined
        : source.wallColor,
      DEFAULT_TUNING.wallColor,
    ),
    trapColor: color(source.trapColor, DEFAULT_TUNING.trapColor),
    wallPadding: clamp(source.wallPadding ?? DEFAULT_TUNING.wallPadding, 0, 80),
    wallWobble: clamp(source.wallWobble ?? DEFAULT_TUNING.wallWobble, 0, 0.22),
    wallLobes: Math.round(clamp(source.wallLobes ?? DEFAULT_TUNING.wallLobes, 2, 8)),
    wallSides: Math.round(clamp(source.wallSides ?? DEFAULT_TUNING.wallSides, 8, 36)),
    wallThickness: clamp(source.wallThickness ?? DEFAULT_TUNING.wallThickness, 1, 22),
    wallOval: clamp(source.wallOval ?? DEFAULT_TUNING.wallOval, 0.72, 1.2),
    showWallGuide: source.showWallGuide === true,
    trapSize: clamp(source.trapSize ?? DEFAULT_TUNING.trapSize, 3, 18),
    trapOffset: clamp(source.trapOffset ?? DEFAULT_TUNING.trapOffset, 0, 70),
    trapStroke: clamp(source.trapStroke ?? DEFAULT_TUNING.trapStroke, 0.6, 5),
    ringHut: clamp(source.ringHut ?? 1, 0.5, 1.35),
    ringCivic: clamp(source.ringCivic ?? 1, 0.5, 1.35),
    ringStone: clamp(source.ringStone ?? 1, 0.5, 1.35),
    ringOuter: clamp(source.ringOuter ?? 1, 0.5, 1.35),
    showNames: source.showNames === true,
    fitView: source.fitView !== false,
  };
}

/** Same key the village-map demo uses for its saved arrangement. */
export const VILLAGE_MAP_DEMO_STORAGE_KEY = "adc-village-map-demo-v1";

export type DemoSnapshot = {
  version: 1;
  stage: number;
  build: BuildState;
  tuning: Tuning;
  overrides: Record<string, { x: number; y: number }>;
};

export function sanitizeSnapshot(input: unknown): DemoSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Partial<DemoSnapshot>;
  if (source.version !== 1) return null;
  const overrides: DemoSnapshot["overrides"] = {};
  if (source.overrides && typeof source.overrides === "object") {
    for (const [id, point] of Object.entries(source.overrides)) {
      if (!point || typeof point !== "object") continue;
      const x = (point as { x?: unknown }).x;
      const y = (point as { y?: unknown }).y;
      if (typeof x !== "number" || typeof y !== "number") continue;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      overrides[id] = { x: Math.round(x), y: Math.round(y) };
      if (Object.keys(overrides).length >= 200) break;
    }
  }
  return {
    version: 1,
    stage: Math.round(clamp(source.stage ?? 0, 0, GROWTH_STEPS.length)),
    build: sanitizeBuild(source.build),
    tuning: sanitizeTuning(source.tuning),
    overrides,
  };
}
