import { useGameStore } from "@/game/state";
import type { AchievementChartConfig } from "../achievementTypes";
import type { GameState } from "@shared/schema";

const TOOL_KEYS_FOR_ACHIEVEMENT: (keyof GameState["tools"])[] = [
  "lantern",
  "iron_lantern",
  "steel_lantern",
  "obsidian_lantern",
  "adamant_lantern",
  "blacksteel_lantern",
  "skull_lantern",
  "stone_axe",
  "iron_axe",
  "steel_axe",
  "obsidian_axe",
  "adamant_axe",
  "blacksteel_axe",
  "stone_pickaxe",
  "iron_pickaxe",
  "steel_pickaxe",
  "obsidian_pickaxe",
  "adamant_pickaxe",
  "blacksteel_pickaxe",
];

export const basicChartConfig: AchievementChartConfig = {
  idPrefix: "basic",
  centerSymbol: "⟁",
  rings: [
    [
      {
        segmentId: "0-woodGatherer",
        maxCount: 500,
        label: "Wood Gatherer",
        rewards: { food: 250 },
        getCount: (state: GameState) =>
          Number(state.story?.seen?.totalWoodGathered) || 0,
        segments: 10,
      },
      {
        segmentId: "0-stoneMiner",
        maxCount: 500,
        label: "Stone Miner",
        rewards: { food: 250 },
        getCount: (state: GameState) =>
          Number(state.story?.seen?.totalStoneGathered) || 0,
        segments: 10,
      },
      {
        segmentId: "0-ironMiner",
        maxCount: 500,
        label: "Iron Miner",
        rewards: { torch: 50 },
        getCount: (state: GameState) =>
          Number(state.story?.seen?.totalIronGathered) || 0,
        segments: 10,
      },
      {
        segmentId: "0-coalMiner",
        maxCount: 500,
        label: "Coal Miner",
        rewards: { torch: 100 },
        getCount: (state: GameState) =>
          Number(state.story?.seen?.totalCoalGathered) || 0,
        segments: 10,
      },
      {
        segmentId: "0-hunter",
        maxCount: 500,
        label: "Hunter",
        rewards: { wood: 500 },
        getCount: (state: GameState) =>
          Number(state.story?.seen?.totalFoodGathered) || 0,
        segments: 10,
      },
    ],
    [
      {
        segmentId: "1-explorer",
        maxCount: 20,
        label: "Explorer",
        rewards: { silver: 50 },
        getCount: (state: GameState) =>
          Number(state.story?.seen?.caveExploreCount) || 0,
      },
      {
        segmentId: "1-torchCrafter",
        maxCount: 50,
        label: "Torch Crafter",
        rewards: { steel: 50 },
        getCount: (state: GameState) =>
          Number(state.story?.seen?.torchesCraftedTotal) || 0,
        segments: 10,
      },
      {
        segmentId: "1-toolCrafter",
        maxCount: 5,
        label: "Tool Crafter",
        rewards: { leather: 100 },
        getCount: (state: GameState) => {
          const tools = state.tools || {};
          return TOOL_KEYS_FOR_ACHIEVEMENT.filter(
            (k) => tools[k]
          ).length;
        },
      },
      {
        segmentId: "1-builder",
        maxCount: 5,
        label: "Builder",
        rewards: { steel: 100 },
        getCount: (state: GameState) =>
          Object.values(state.buildings || {}).reduce(
            (a, b) => a + (b || 0),
            0
          ),
      },
      {
        segmentId: "1-communityBuilder",
        maxCount: 10,
        label: "Community Builder",
        rewards: { gold: 50 },
        getCount: (state: GameState) =>
          Number(state.story?.seen?.maxPopulationReached) || 0,
      },
    ],
  ],
};

/** Returns IDs of basic achievements that are full but not yet claimed. */
export function getUnclaimedBasicIds(): string[] {
  const state = useGameStore.getState();
  const claimedAchievements = state.claimedAchievements || [];
  const result: string[] = [];
  basicChartConfig.rings.forEach((segments) => {
    segments.forEach((seg) => {
      const count = seg.getCount(state);
      if (
        count >= seg.maxCount &&
        !claimedAchievements.includes(
          `${basicChartConfig.idPrefix}-${seg.segmentId}`,
        )
      ) {
        result.push(`${basicChartConfig.idPrefix}-${seg.segmentId}`);
      }
    });
  });
  return result;
}
