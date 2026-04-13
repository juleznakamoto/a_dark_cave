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
  /** Cubic bezier for framer-motion, e.g. [0, 0, 0.5, 1] */
  ease?: number[];
}

// Build/stone tones (neutral, gray)
const BUILD_TONES = [
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("neutral-950"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-700"),
  tailwindToHex("stone-900"),
  tailwindToHex("stone-950"),
];

// Craft tones (amber, copper, bronze) - for craft action buttons
export const CRAFT_TONES = [
  tailwindToHex("amber-900"),
  tailwindToHex("amber-950"),
  tailwindToHex("yellow-900"),
  tailwindToHex("orange-950"),
  tailwindToHex("red-950"),
];

const DEFAULT_PARTICLE_CONFIG: Required<ParticleConfig> = {
  colors: BUILD_TONES,
  smallParticleOnlyColors: [],
  smallParticleMaxSize: 2,
  count: 100,
  durationMin: 0.65,
  durationMax: 1.0,
  distanceMin: 40,
  distanceMax: 80,
  sizeMin: 5,
  sizeMax: 25,
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
  tailwindToHex("red-500"),
];

/** Craft preset - amber/copper tones, snappier/shorter animation */
export const CRAFT_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: CRAFT_TONES,
  smallParticleOnlyColors: CRAFT_SMALL_PARTICLE_ONLY_COLORS,
  smallParticleMaxSize: 2,
  count: 100,
  durationMin: 0.45,
  durationMax: 0.7,
  distanceMin: 25,
  distanceMax: 70,
  sizeMin: 1,
  sizeMax: 6,
};

// Mine tones (grey/black base for all mining)
const MINE_TONES = [
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("neutral-950"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-900"),
  tailwindToHex("stone-950"),
];

// Per-resource highlight colors for small particles (size 1-2)
const MINE_HIGHLIGHT_COLORS: Record<string, string[]> = {
  mineStone: [tailwindToHex("stone-400"), tailwindToHex("gray-400")],
  mineIron: [tailwindToHex("red-800"), tailwindToHex("orange-900")],
  mineCoal: [tailwindToHex("slate-950"), tailwindToHex("gray-950")],
  mineSulfur: [tailwindToHex("yellow-500"), tailwindToHex("amber-400")],
  mineObsidian: [tailwindToHex("violet-600"), tailwindToHex("purple-600")],
  mineAdamant: [tailwindToHex("indigo-400"), tailwindToHex("blue-400")],
};

/** Particle count: 50 base + 10 per level, max 150 */
function getParticleCountForLevel(level: number): number {
  return Math.min(50 + level * 10, 150);
}

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
    durationMin: 0.5,
    durationMax: 1,
    distanceMin: 25,
    distanceMax: 70,
    sizeMin: 1,
    sizeMax: 10,
  };
}

// Cave explore tones - darker/more mysterious as depth increases
// Cave explore base tones (stone/neutral - same for all levels)
const EXPLORE_TONES = [
  tailwindToHex("stone-700"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-900"),
  tailwindToHex("neutral-700"),
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("slate-700"),
  tailwindToHex("slate-800"),
  tailwindToHex("slate-900"),
];

// Per-level highlight colors for small particles - based on resources found at each level.
// Colors accumulate: each level keeps colors from the previous level for resources that still exist,
// and adds new colors only for newly introduced resources.
const EXPLORE_LEVEL_ORDER = [
  "exploreCave",
  "ventureDeeper",
  "descendFurther",
  "exploreRuins",
  "exploreTemple",
] as const;

const EXPLORE_RESOURCES_BY_LEVEL: Record<string, string[]> = {
  exploreCave: ["wood", "stone", "coal", "iron"],
  ventureDeeper: ["stone", "coal", "iron", "sulfur", "silver"],
  descendFurther: ["stone", "coal", "iron", "obsidian", "silver"],
  exploreRuins: ["obsidian", "adamant", "silver", "gold"],
  exploreTemple: ["obsidian", "adamant", "moonstone", "silver", "gold"],
};

const RESOURCE_HIGHLIGHT_COLORS: Record<string, string> = {
  wood: "amber-600",
  stone: "stone-400",
  coal: "slate-600",
  iron: "slate-500",
  sulfur: "yellow-500",
  silver: "slate-400",
  obsidian: "violet-700",
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

const EXPLORE_LEVEL_ORDER_FOR_COUNT = [...EXPLORE_LEVEL_ORDER, "exploreCitadel"];

/** Get cave explore particle config by action id (shared base + per-level highlights) */
export function getExploreParticleConfig(
  actionId: string,
): Partial<ParticleConfig> {
  const highlightColors = EXPLORE_HIGHLIGHT_COLORS[actionId] ?? [];
  const levelIndex = EXPLORE_LEVEL_ORDER_FOR_COUNT.indexOf(actionId);
  const count =
    actionId === "exploreCitadel" ? 150 : levelIndex >= 0 ? 40 + levelIndex * 15 : 100;
  return {
    colors: EXPLORE_TONES,
    smallParticleOnlyColors: highlightColors,
    smallParticleMaxSize: 3,
    count,
    durationMin: 0.5,
    durationMax: 1.2,
    distanceMin: 25,
    distanceMax: 75,
    sizeMin: 2,
    sizeMax: 10,
  };
}

// Chop wood / Gather wood - forest tones (count scales with level: 50 + 10*level, max 150)
export function getChopWoodParticleConfig(level = 0): Partial<ParticleConfig> {
  return {
    colors: [
      tailwindToHex("amber-950"),
      tailwindToHex("yellow-950"),
      tailwindToHex("orange-950"),
      tailwindToHex("stone-950"),
    ],
    smallParticleOnlyColors: [tailwindToHex("green-950")],
    smallParticleMaxSize: 8,
    count: getParticleCountForLevel(level),
    durationMin: 0.35,
    durationMax: 0.7,
    distanceMin: 25,
    distanceMax: 65,
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
export type MergedParticleConfig = Required<Omit<ParticleConfig, "bubbleRemoveDelay">> & {
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
      colors: override.colors ?? base.colors ?? DEFAULT_PARTICLE_CONFIG.colors,
    }
    : { ...DEFAULT_PARTICLE_CONFIG, ...base };
  // All particles start at once, so we only need durationMax + small buffer for cleanup
  return {
    ...merged,
    bubbleRemoveDelay: Math.ceil(merged.durationMax * 1000) + 100,
  };
}

/** Get bubble remove delay in ms (derived from durationMax). Use when you have a partial config. */
export function getBubbleRemoveDelayMs(config: Partial<ParticleConfig>): number {
  return mergeParticleConfig(config).bubbleRemoveDelay;
}

// Helper to generate particle data for global layer (accepts full config or colors array for legacy)
export function generateParticleData(
  configOrColors?: Partial<ParticleConfig> | string[],
): Array<{ size: number; color: string; duration: number; endX: number; endY: number }> {
  const config = mergeParticleConfig(
    Array.isArray(configOrColors) ? { colors: configOrColors } : (configOrColors ?? {}),
  );
  return Array.from({ length: config.count }).map(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = config.distanceMin + Math.random() * (config.distanceMax - config.distanceMin);
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
    const colorPool =
      config.smallParticleOnlyColors?.length && size > config.smallParticleMaxSize
        ? config.colors.filter((c) => !config.smallParticleOnlyColors!.includes(c))
        : config.smallParticleOnlyColors?.length
          ? [...config.colors, ...config.smallParticleOnlyColors]
          : config.colors;
    const color = colorPool[Math.floor(Math.random() * colorPool.length)] ?? config.colors[0];
    const duration = config.durationMin + Math.random() * (config.durationMax - config.durationMin);
    const endX = Math.cos(angle) * distance;
    const endY = Math.sin(angle) * distance;
    return { size, color, duration, endX, endY };
  });
}

export interface BubbleWithParticles {
  id: string;
  x: number;
  y: number;
  particles: ReturnType<typeof generateParticleData>;
}
