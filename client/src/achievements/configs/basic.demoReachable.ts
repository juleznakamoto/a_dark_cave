import { createInitialState } from "@/game/state";
import { DEMO_WOODEN_HUT_LIMIT } from "@/game/demoLimit";
import { TOOL_REBUILD_FROM_STORY_SEEN } from "@shared/rebuildToolsFromStorySeen";
import type { GameState } from "@shared/schema";

/**
 * Tools a demo player can own before the wooden-hut cap:
 * stone (cave), iron (blacksmith, required for hut 3), steel (foundry +
 * steel axe, required for the altar that unlocks hut 8).
 */
export const DEMO_REACHABLE_TOOL_KEYS = [
  "stone_axe",
  "stone_pickaxe",
  "iron_axe",
  "iron_pickaxe",
  "iron_lantern",
  "steel_axe",
  "steel_pickaxe",
  "steel_lantern",
] as const;

/**
 * Buildings available at or before 8 wooden huts. Hut 8 itself needs altar,
 * which needs forest + steel axe. Tannery unlocks at 6 huts.
 */
export const DEMO_REACHABLE_BUILDINGS = {
  woodenHut: DEMO_WOODEN_HUT_LIMIT,
  cabin: 1,
  blacksmith: 1,
  shallowPit: 1,
  foundry: 1,
  darkEstate: 1,
  tannery: 1,
  altar: 1,
} as const;

function storySeenFlagsForDemoTools(): Record<string, true> {
  const flags: Record<string, true> = {};
  for (const { toolKey, seenKeys } of TOOL_REBUILD_FROM_STORY_SEEN) {
    if (!(DEMO_REACHABLE_TOOL_KEYS as readonly string[]).includes(toolKey)) {
      continue;
    }
    for (const key of seenKeys) {
      flags[key] = true;
    }
  }
  return flags;
}

/** Save-shaped state that completes every basic achievement inside the demo cap. */
export function buildDemoReachableBasicCompletionState(): GameState {
  const initial = createInitialState();
  const tools = { ...initial.tools };
  for (const key of DEMO_REACHABLE_TOOL_KEYS) {
    tools[key] = true;
  }
  return {
    ...initial,
    buildings: {
      ...initial.buildings,
      ...DEMO_REACHABLE_BUILDINGS,
    },
    tools,
    flags: {
      ...initial.flags,
      villageUnlocked: true,
      forestUnlocked: true,
    },
    relics: {
      ...initial.relics,
      survivors_notes: true,
    },
    story: {
      ...initial.story,
      seen: {
        ...initial.story.seen,
        totalWoodGathered: 500,
        totalStoneGathered: 500,
        totalIronGathered: 500,
        totalCoalGathered: 500,
        steelForgedTotal: 250,
        totalFoodGathered: 500,
        totalLeatherGathered: 250,
        caveExploreCount: 20,
        torchesCraftedTotal: 50,
        maxPopulationReached: 10,
        caveExplored: true,
        venturedDeeper: true,
        descendedFurther: true,
        ...storySeenFlagsForDemoTools(),
      },
    },
  };
}
