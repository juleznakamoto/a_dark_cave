import { tailwindToHex } from "@/lib/tailwindColors";

/** Full configuration for particle animation - all params optional with defaults */
export interface ParticleConfig {
  colors?: string[];
  /** Colors only used for particles with size <= smallParticleMaxSize */
  smallParticleOnlyColors?: string[];
  /** Max size (inclusive) for smallParticleOnlyColors. Default 2. */
  smallParticleMaxSize?: number;
  count?: number;
  durationMin?: number;
  durationMax?: number;
  distanceMin?: number;
  distanceMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  /**
   * Spawn ring radius (px from burst center). When max > 0, particles start on that
   * ring (random angle) then travel in a random direction — useful for edge emission.
   */
  spawnRadiusMin?: number;
  spawnRadiusMax?: number;
  /**
   * When true (and spawn radius > 0), particles travel outward along their spawn
   * angle — useful for “burst from behind a dialog edge” effects.
   */
  radialOutward?: boolean;
  /**
   * Regular-polygon side counts to pick from (e.g. `[5, 6, 7]` for mine chips).
   * Empty/omitted = circles (`rounded-full`).
   */
  polygonSides?: number[];
  /** Cubic bezier for framer-motion, e.g. [0, 0, 0.5, 1] */
  ease?: number[];
}

// Build/stone tones (neutral, gray)
const BUILD_TONES = [
  tailwindToHex("neutral-700"),
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("stone-700"),
  tailwindToHex("stone-600"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-900"),
];

// Craft tones (amber, copper, bronze) - for craft action buttons
export const CRAFT_TONES = [
  tailwindToHex("amber-800"),
  tailwindToHex("amber-900"),
  tailwindToHex("yellow-800"),
  tailwindToHex("orange-900"),
  tailwindToHex("red-900"),
];

const DEFAULT_PARTICLE_CONFIG: Required<ParticleConfig> = {
  colors: BUILD_TONES,
  smallParticleOnlyColors: [],
  smallParticleMaxSize: 2,
  count: 100,
  durationMin: 0.75,
  durationMax: 1.5,
  distanceMin: 50,
  distanceMax: 80,
  sizeMin: 5,
  sizeMax: 25,
  spawnRadiusMin: 0,
  spawnRadiusMax: 0,
  radialOutward: false,
  polygonSides: [],
  ease: [0, 0, 0.5, 1],
};

const BUILD_SMALL_PARTICLE_ONLY_COLORS = [tailwindToHex("grey-200")];

/** Build preset - stone/neutral tones, default sizing */
export const BUILD_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: BUILD_TONES,
  smallParticleOnlyColors: BUILD_SMALL_PARTICLE_ONLY_COLORS,
  smallParticleMaxSize: 2,
};

const CRAFT_SMALL_PARTICLE_ONLY_COLORS = [
  tailwindToHex("yellow-500"),
  tailwindToHex("yellow-400"),
  tailwindToHex("red-500"),
];

/** Craft preset - amber/copper tones, snappier/shorter animation */
export const CRAFT_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: CRAFT_TONES,
  smallParticleOnlyColors: CRAFT_SMALL_PARTICLE_ONLY_COLORS,
  smallParticleMaxSize: 2,
  count: 100,
  durationMin: 0.5,
  durationMax: 1,
  distanceMin: 40,
  distanceMax: 70,
  sizeMin: 1,
  sizeMax: 8,
};

// Mine tones (grey/black base for all mining)
const MINE_TONES = [
  tailwindToHex("neutral-700"),
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("stone-700"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-900"),
];

/** Mine action ids that have dedicated particle highlight palettes (SSOT). */
export const MINE_PARTICLE_ACTION_IDS = [
  "mineStone",
  "mineIron",
  "mineCoal",
  "mineSulfur",
  "mineObsidian",
  "mineAdamant",
  "mineMoonstone",
] as const;

export type MineParticleActionId = (typeof MINE_PARTICLE_ACTION_IDS)[number];

// Per-resource highlight colors for small particles (size 1-2)
const MINE_HIGHLIGHT_COLORS: Record<string, string[]> = {
  mineStone: [tailwindToHex("stone-400"), tailwindToHex("gray-400")],
  mineIron: [tailwindToHex("red-700"), tailwindToHex("orange-800")],
  mineCoal: [tailwindToHex("slate-900"), tailwindToHex("gray-900")],
  mineSulfur: [tailwindToHex("yellow-400"), tailwindToHex("amber-400")],
  mineObsidian: [tailwindToHex("violet-500"), tailwindToHex("purple-500")],
  mineAdamant: [tailwindToHex("indigo-400"), tailwindToHex("blue-400")],
  mineMoonstone: [tailwindToHex("sky-400"), tailwindToHex("cyan-300")],
};

/** Particle count: 50 base + 10 per level, max 150 */
function getParticleCountForLevel(level: number): number {
  return Math.min(50 + level * 10, 150);
}

/** Pent / hex / heptagon chips for all mine click bursts. */
const MINE_POLYGON_SIDES = [5, 6, 7];

/** Get mine particle config for a specific mine action (stone, iron, coal, etc.) */
export function getMineParticleConfig(
  actionId: string,
  level = 0,
): Partial<ParticleConfig> {
  const highlightColors = MINE_HIGHLIGHT_COLORS[actionId] ?? [];
  return {
    colors: MINE_TONES,
    smallParticleOnlyColors: highlightColors,
    smallParticleMaxSize: 5,
    count: getParticleCountForLevel(level),
    durationMin: 0.6,
    durationMax: 1.2,
    distanceMin: 40,
    distanceMax: 70,
    sizeMin: 1,
    sizeMax: 12,
    polygonSides: MINE_POLYGON_SIDES,
  };
}

/** Shared clip-paths (fixed orientation). Rotate via transform at render time. */
const SHARED_POLYGON_CLIP_PATHS = new Map<number, string>();

function polygonClipPath(sides: number): string {
  const n = Math.max(3, Math.floor(sides));
  const cached = SHARED_POLYGON_CLIP_PATHS.get(n);
  if (cached) return cached;
  const points: string[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
    const x = 50 + 50 * Math.cos(angle);
    const y = 50 + 50 * Math.sin(angle);
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  const path = `polygon(${points.join(", ")})`;
  SHARED_POLYGON_CLIP_PATHS.set(n, path);
  return path;
}

// Cave explore tones - darker/more mysterious as depth increases
// Cave explore base tones (stone/neutral - same for all levels)
const EXPLORE_TONES = [
  tailwindToHex("stone-600"),
  tailwindToHex("stone-700"),
  tailwindToHex("stone-800"),
  tailwindToHex("neutral-600"),
  tailwindToHex("neutral-700"),
  tailwindToHex("neutral-800"),
  tailwindToHex("slate-600"),
  tailwindToHex("slate-700"),
  tailwindToHex("slate-800"),
];

// Per-level highlight colors for small particles - based on resources found at each level.
// Colors accumulate: each level keeps colors from the previous level for resources that still exist,
// and adds new colors only for newly introduced resources.
/** Explore action ids in depth order (highlight accumulation SSOT). */
export const EXPLORE_PARTICLE_LEVEL_IDS = [
  "exploreCave",
  "ventureDeeper",
  "descendFurther",
  "exploreRuins",
  "exploreTemple",
] as const;

const EXPLORE_LEVEL_ORDER = EXPLORE_PARTICLE_LEVEL_IDS;

const EXPLORE_RESOURCES_BY_LEVEL: Record<string, string[]> = {
  exploreCave: ["wood", "stone", "coal", "iron"],
  ventureDeeper: ["stone", "coal", "iron", "sulfur", "silver"],
  descendFurther: ["stone", "coal", "iron", "obsidian", "silver"],
  exploreRuins: ["obsidian", "adamant", "silver", "gold"],
  exploreTemple: ["obsidian", "adamant", "moonstone", "silver", "gold"],
};

const RESOURCE_HIGHLIGHT_COLORS: Record<string, string> = {
  wood: "amber-500",
  stone: "stone-400",
  coal: "slate-600",
  iron: "slate-500",
  sulfur: "yellow-500",
  silver: "slate-400",
  obsidian: "violet-600",
  adamant: "indigo-400",
  gold: "amber-500",
  moonstone: "sky-400",
};

function buildExploreHighlightColors(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const resourceToColor: Record<string, string> = {};

  for (const level of EXPLORE_LEVEL_ORDER) {
    const resources = EXPLORE_RESOURCES_BY_LEVEL[level];
    const colors: string[] = [];
    for (const r of resources) {
      if (!resourceToColor[r]) {
        resourceToColor[r] = tailwindToHex(
          RESOURCE_HIGHLIGHT_COLORS[r] ?? "stone-400",
        );
      }
      colors.push(resourceToColor[r]);
    }
    result[level] = colors;
  }
  return result;
}

const EXPLORE_HIGHLIGHT_COLORS: Record<string, string[]> = {
  ...buildExploreHighlightColors(),
  // Final stage - defined individually for a distinct look
  exploreCitadel: [
    tailwindToHex("violet-400"),
    tailwindToHex("indigo-400"),
    tailwindToHex("amber-400"),
    tailwindToHex("sky-300"),
    tailwindToHex("slate-300"),
  ],
};

/** All explore actions with particle configs, including the final citadel stage. */
export const EXPLORE_PARTICLE_ACTION_IDS = [
  ...EXPLORE_PARTICLE_LEVEL_IDS,
  "exploreCitadel",
] as const;

const EXPLORE_LEVEL_ORDER_FOR_COUNT = EXPLORE_PARTICLE_ACTION_IDS;

/** Get cave explore particle config by action id (shared base + per-level highlights) */
export function getExploreParticleConfig(
  actionId: string,
): Partial<ParticleConfig> {
  const highlightColors = EXPLORE_HIGHLIGHT_COLORS[actionId] ?? [];
  const levelIndex = (EXPLORE_LEVEL_ORDER_FOR_COUNT as readonly string[]).indexOf(
    actionId,
  );
  const count =
    actionId === "exploreCitadel"
      ? 150
      : levelIndex >= 0
        ? 40 + levelIndex * 15
        : 100;
  return {
    colors: EXPLORE_TONES,
    smallParticleOnlyColors: highlightColors,
    smallParticleMaxSize: 3,
    count,
    durationMin: 0.9,
    durationMax: 1.8,
    distanceMin: 40,
    distanceMax: 80,
    sizeMin: 2,
    sizeMax: 12,
  };
}

// Chop wood / Gather wood - forest tones (count scales with level: 50 + 10*level, max 150)
export function getChopWoodParticleConfig(level = 0): Partial<ParticleConfig> {
  return {
    colors: [
      tailwindToHex("amber-900"),
      tailwindToHex("yellow-900"),
      tailwindToHex("orange-900"),
      tailwindToHex("stone-900"),
    ],
    smallParticleOnlyColors: [tailwindToHex("green-950")],
    smallParticleMaxSize: 8,
    count: getParticleCountForLevel(level),
    durationMin: 0.5,
    durationMax: 1,
    distanceMin: 30,
    distanceMax: 70,
    sizeMin: 2,
    sizeMax: 16,
  };
}

// Gold coin - slow gentle emission for hover
export const GOLD_COIN_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: [
    tailwindToHex("yellow-500"),
    tailwindToHex("yellow-600"),
    tailwindToHex("amber-500"),
    tailwindToHex("amber-600"),
  ],
  count: 4,
  durationMin: 0.5,
  durationMax: 1.5,
  distanceMin: 10,
  distanceMax: 25,
  sizeMin: 1,
  sizeMax: 3,
};

/** Page-load spinner — bursts from ring center in random directions (fire tones). */
export const FIRE_LOAD_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: [
    tailwindToHex("red-600"),
    tailwindToHex("red-700"),
    tailwindToHex("orange-600"),
    tailwindToHex("orange-700"),
    tailwindToHex("yellow-700"),
    tailwindToHex("amber-700"),
  ],
  count: 10,
  durationMin: 0.6,
  durationMax: 1.4,
  distanceMin: 40,
  distanceMax: 100,
  sizeMin: 1,
  sizeMax: 5,
};

function adjustHexBrightness(hex: string, factor: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = ((n >> 16) & 255) * factor;
  let g = ((n >> 8) & 255) * factor;
  let b = (n & 255) * factor;
  r = Math.min(255, Math.max(0, Math.round(r)));
  g = Math.min(255, Math.max(0, Math.round(g)));
  b = Math.min(255, Math.max(0, Math.round(b)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Palette for shop card glyph hover; mirrors catalog `symbolColor` (e.g. `text-emerald-600`). */
export function shopGlyphHoverParticleColors(
  symbolColorClass?: string,
): string[] {
  const key = symbolColorClass?.replace(/^text-/, "").trim() || "yellow-500";
  const primary = tailwindToHex(key);
  if (primary.startsWith("#")) {
    return [
      adjustHexBrightness(primary, 1.18),
      adjustHexBrightness(primary, 1.05),
      primary,
      adjustHexBrightness(primary, 0.78),
    ];
  }
  if (primary.startsWith("rgba(")) {
    return [primary, primary, primary, primary];
  }
  return (GOLD_COIN_PARTICLE_CONFIG.colors ?? []) as string[];
}

/** Same timing/size as coin hover; colors follow the shop item glyph (`symbolColor`). */
export function getShopGlyphHoverParticleConfig(
  symbolColorClass?: string,
): Partial<ParticleConfig> {
  return {
    ...GOLD_COIN_PARTICLE_CONFIG,
    colors: shopGlyphHoverParticleColors(symbolColorClass),
    smallParticleOnlyColors: [],
    smallParticleMaxSize: 2,
  };
}

// Insight orb - slower, slightly larger cold-blue sparks (BuildingActionBadge palette)
export const INSIGHT_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: [
    tailwindToHex("blue-500"),
    tailwindToHex("blue-600"),
    tailwindToHex("blue-700"),
    "#60a5fa",
    "#3b82f6",
  ],
  count: 3,
  durationMin: 0.65,
  durationMax: 1.75,
  distanceMin: 10,
  distanceMax: 28,
  sizeMin: 2,
  sizeMax: 7,
};

/** Trader tab balance-scale icon — lime burst on hover (same cadence as gold/silver coins). */
export const TRADER_TAB_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: [
    tailwindToHex("lime-400"),
    tailwindToHex("lime-500"),
    tailwindToHex("green-400"),
    tailwindToHex("green-500"),
  ],
  count: 2,
  durationMin: 0.5,
  durationMax: 1.5,
  distanceMin: 20,
  distanceMax: 30,
  sizeMin: 1,
  sizeMax: 2,
};

/** Rewards tasks header diamond — slightly larger lime burst than trader tab. */
export const REWARDS_TASKS_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  ...TRADER_TAB_PARTICLE_CONFIG,
  count: 3,
  distanceMin: 22,
  distanceMax: 34,
  sizeMin: 2,
  sizeMax: 3.5,
};

/** Checkout success — large green burst from behind the dialog edges. */
export const CHECKOUT_SUCCESS_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: [
    tailwindToHex("green-600"),
    tailwindToHex("green-700"),
    tailwindToHex("lime-600"),
    tailwindToHex("emerald-600"),
    "#4ade80",
    "#86efac",
  ],
  count: 120,
  durationMin: 0.75,
  durationMax: 1.45,
  // Extra travel past the dialog edge (spawn ring is sized to the dialog).
  distanceMin: 120,
  distanceMax: 280,
  sizeMin: 4,
  sizeMax: 12,
  radialOutward: true,
};

/** Hold checkout open (with glow) after success while the burst plays out. */
export const CHECKOUT_SUCCESS_HOLD_MS = 1500;

// Silver coin - slow gentle emission for hover
export const SILVER_COIN_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: [
    tailwindToHex("gray-300"),
    tailwindToHex("gray-400"),
    tailwindToHex("slate-300"),
    tailwindToHex("slate-400"),
    tailwindToHex("zinc-300"),
  ],
  count: 4,
  durationMin: 0.5,
  durationMax: 1.5,
  distanceMin: 10,
  distanceMax: 25,
  sizeMin: 1,
  sizeMax: 3,
};

// Hunt - fur, blood, forest tones (count scales with level: 50 + 10*level, max 150)
export function getHuntParticleConfig(level = 0): Partial<ParticleConfig> {
  return {
    colors: [
      tailwindToHex("amber-900"),
      tailwindToHex("stone-800"),
      tailwindToHex("red-950"),
      tailwindToHex("orange-900"),
      tailwindToHex("neutral-800"),
    ],
    smallParticleOnlyColors: [tailwindToHex("red-600")],
    smallParticleMaxSize: 4,
    count: getParticleCountForLevel(level),
    durationMin: 0.3,
    durationMax: 0.65,
    distanceMin: 25,
    distanceMax: 50,
    sizeMin: 2,
    sizeMax: 10,
  };
}

/** Merged config with computed bubbleRemoveDelay (derived from durationMax) */
export type MergedParticleConfig = Required<
  Omit<ParticleConfig, "bubbleRemoveDelay">
> & {
  bubbleRemoveDelay: number;
};

export function mergeParticleConfig(
  base: Partial<ParticleConfig>,
  override?: Partial<ParticleConfig>,
): MergedParticleConfig {
  const merged = override
    ? {
      ...DEFAULT_PARTICLE_CONFIG,
      ...base,
      ...override,
      colors:
        override.colors ?? base.colors ?? DEFAULT_PARTICLE_CONFIG.colors,
    }
    : { ...DEFAULT_PARTICLE_CONFIG, ...base };
  // All particles start at once, so we only need durationMax + small buffer for cleanup
  return {
    ...merged,
    bubbleRemoveDelay: Math.ceil(merged.durationMax * 1000) + 100,
  };
}

/** Get bubble remove delay in ms (derived from durationMax). Use when you have a partial config. */
export function getBubbleRemoveDelayMs(
  config: Partial<ParticleConfig>,
): number {
  return mergeParticleConfig(config).bubbleRemoveDelay;
}

export type ParticleBurstDatum = {
  size: number;
  color: string;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** Shared n-gon clip-path; pair with `rotateDeg` (not a unique path per particle). */
  clipPath?: string;
  /** Static spin applied via Framer `rotate` (cheap vs unique clip-paths). */
  rotateDeg?: number;
};

// Helper to generate particle data for global layer (accepts full config or colors array for legacy)
export function generateParticleData(
  configOrColors?: Partial<ParticleConfig> | string[],
): ParticleBurstDatum[] {
  const config = mergeParticleConfig(
    Array.isArray(configOrColors)
      ? { colors: configOrColors }
      : (configOrColors ?? {}),
  );
  return Array.from({ length: config.count }).map(() => {
    const distance =
      config.distanceMin +
      Math.random() * (config.distanceMax - config.distanceMin);
    const size =
      config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
    const colorPool =
      config.smallParticleOnlyColors?.length &&
        size > config.smallParticleMaxSize
        ? config.colors.filter(
          (c) => !config.smallParticleOnlyColors!.includes(c),
        )
        : config.smallParticleOnlyColors?.length
          ? [...config.colors, ...config.smallParticleOnlyColors]
          : config.colors;
    const color =
      colorPool[Math.floor(Math.random() * colorPool.length)] ??
      config.colors[0];
    const duration =
      config.durationMin +
      Math.random() * (config.durationMax - config.durationMin);

    const spawnRadiusSpan = Math.max(
      0,
      config.spawnRadiusMax - config.spawnRadiusMin,
    );
    const spawnRadius =
      config.spawnRadiusMax > 0
        ? config.spawnRadiusMin + Math.random() * spawnRadiusSpan
        : 0;
    const spawnAngle = Math.random() * Math.PI * 2;
    const startX = Math.cos(spawnAngle) * spawnRadius;
    const startY = Math.sin(spawnAngle) * spawnRadius;
    // Default: random travel. Checkout-style bursts keep flying outward from the rim.
    const moveAngle =
      config.radialOutward && spawnRadius > 0
        ? spawnAngle
        : Math.random() * Math.PI * 2;
    const endX = startX + Math.cos(moveAngle) * distance;
    const endY = startY + Math.sin(moveAngle) * distance;
    const sidesPool = config.polygonSides;
    const usePolygon = sidesPool.length > 0;
    const clipPath = usePolygon
      ? polygonClipPath(
        sidesPool[Math.floor(Math.random() * sidesPool.length)]!,
      )
      : undefined;
    const rotateDeg = usePolygon ? Math.random() * 360 : undefined;
    return {
      size,
      color,
      duration,
      startX,
      startY,
      endX,
      endY,
      clipPath,
      rotateDeg,
    };
  });
}

export interface BubbleWithParticles {
  id: string;
  x: number;
  y: number;
  particles: ReturnType<typeof generateParticleData>;
}

/** Mid-upgrade level used by the /dev/animations click-burst gallery. */
const PARTICLE_DEMO_LEVEL = 5;

export type ParticleDemoPreset = {
  id: string;
  label: string;
  /** Resolve at click time so config edits apply without rebuilding the catalog shape. */
  getConfig: () => Partial<ParticleConfig>;
};

const MINE_PARTICLE_DEMO_LABELS: Record<MineParticleActionId, string> = {
  mineStone: "Mine stone",
  mineIron: "Mine iron",
  mineCoal: "Mine coal",
  mineSulfur: "Mine sulfur",
  mineObsidian: "Mine obsidian",
  mineAdamant: "Mine adamant",
  mineMoonstone: "Mine moonstone",
};

const EXPLORE_PARTICLE_DEMO_LABELS: Record<
  (typeof EXPLORE_PARTICLE_ACTION_IDS)[number],
  string
> = {
  exploreCave: "Explore cave",
  ventureDeeper: "Venture deeper",
  descendFurther: "Descend further",
  exploreRuins: "Explore ruins",
  exploreTemple: "Explore temple",
  exploreCitadel: "Explore citadel",
};

/**
 * SSOT catalog of click-burst particle presets for `/dev/animations`.
 * Add new game click presets here (same file as the config) so the playground stays in sync.
 */
export const CLICK_PARTICLE_DEMO_PRESETS: ParticleDemoPreset[] = [
  {
    id: "build",
    label: "Build",
    getConfig: () => BUILD_PARTICLE_CONFIG,
  },
  {
    id: "craft",
    label: "Craft",
    getConfig: () => CRAFT_PARTICLE_CONFIG,
  },
  ...MINE_PARTICLE_ACTION_IDS.map((actionId) => ({
    id: actionId,
    label: MINE_PARTICLE_DEMO_LABELS[actionId],
    getConfig: () => getMineParticleConfig(actionId, PARTICLE_DEMO_LEVEL),
  })),
  ...EXPLORE_PARTICLE_ACTION_IDS.map((actionId) => ({
    id: actionId,
    label: EXPLORE_PARTICLE_DEMO_LABELS[actionId],
    getConfig: () => getExploreParticleConfig(actionId),
  })),
  {
    id: "chopWood",
    label: "Chop wood",
    getConfig: () => getChopWoodParticleConfig(PARTICLE_DEMO_LEVEL),
  },
  {
    id: "hunt",
    label: "Hunt",
    getConfig: () => getHuntParticleConfig(PARTICLE_DEMO_LEVEL),
  },
  {
    id: "checkoutSuccess",
    label: "Checkout success",
    getConfig: () => ({
      ...CHECKOUT_SUCCESS_PARTICLE_CONFIG,
      // ShopDialog sizes the spawn ring from the dialog; use a fixed ring for the gallery.
      spawnRadiusMin: 48,
      spawnRadiusMax: 64,
    }),
  },
];

export type HoverParticleDemoPreset = {
  id: string;
  label: string;
  getConfig: () => Partial<ParticleConfig>;
};

/**
 * SSOT catalog of hover-emission particle presets for `/dev/animations`.
 * Gold/silver/insight icons also use these configs via ResourceCoinIcon / ResourceInsightIcon.
 */
export const HOVER_PARTICLE_DEMO_PRESETS: HoverParticleDemoPreset[] = [
  {
    id: "gold",
    label: "Gold coin",
    getConfig: () => GOLD_COIN_PARTICLE_CONFIG,
  },
  {
    id: "silver",
    label: "Silver coin",
    getConfig: () => SILVER_COIN_PARTICLE_CONFIG,
  },
  {
    id: "insight",
    label: "Insight",
    getConfig: () => INSIGHT_PARTICLE_CONFIG,
  },
  {
    id: "traderTab",
    label: "Trader tab",
    getConfig: () => TRADER_TAB_PARTICLE_CONFIG,
  },
  {
    id: "rewardsTasks",
    label: "Rewards tasks",
    getConfig: () => REWARDS_TASKS_PARTICLE_CONFIG,
  },
  {
    id: "fireLoad",
    label: "Fire load",
    getConfig: () => FIRE_LOAD_PARTICLE_CONFIG,
  },
  {
    id: "shopGlyph",
    label: "Shop glyph",
    getConfig: () => getShopGlyphHoverParticleConfig("text-emerald-600"),
  },
];
