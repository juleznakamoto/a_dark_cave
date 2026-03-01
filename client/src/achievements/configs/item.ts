import { useGameStore } from "@/game/state";
import { tailwindToHex } from "@/lib/tailwindColors";
import { AchievementChartConfig } from "../AchievementRingChart";
import type { GameState } from "@shared/schema";

// Segment colors for item achievements
const COMPLETED_COLOR = tailwindToHex("red-800");
const COMPLETED_STROKE_COLOR = tailwindToHex("red-900");

// Refactored getItemCount to be module-level, used by config
function getItemCount(itemKeys: string[]): number {
  const state = useGameStore.getState();
  let count = 0;
  for (const itemKey of segment.itemKeys) {
    const hasInTools = state.tools && state.tools[itemKey as keyof typeof state.tools];
    const hasInWeapons = state.weapons && state.weapons[itemKey as keyof typeof state.weapons];
    const hasInClothing = state.clothing && state.clothing[itemKey as keyof typeof state.clothing];
    const hasInRelics = state.relics && state.relics[itemKey as keyof typeof state.relics];
    const hasInFellowship = state.fellowship && state.fellowship[itemKey as keyof typeof state.fellowship];
    if (hasInTools || hasInWeapons || hasInClothing || hasInRelics || hasInFellowship) {
      count++;
    }
  }
  return count;
}

// Item achievement chart configuration
export const itemChartConfig: AchievementChartConfig = {
  idPrefix: "item",
  completedColor: COMPLETED_COLOR,
  completedStrokeColor: COMPLETED_STROKE_COLOR,
  centerSymbol: "❖",
  rings: [
    // First ring: Basic tools and weapons
    [
      {
        segmentId: "0-basicTools",
        maxCount: 6,
        label: "Basic Tools",
        reward: 500,
        getCount: (state: GameState) => getItemCount(["flintAxe", "flintKnife", "flintPick", "boneClub", "boneSpear", "boneBow"]),
      },
      {
        segmentId: "0-basicWeapons",
        maxCount: 6,
        label: "Basic Weapons",
        reward: 500,
        getCount: (state: GameState) => getItemCount(["stoneSword", "stoneMace", "stoneSpear", "stoneAxe", "stoneBow", "leatherArmor"]),
      },
    ],
    // Second ring: Advanced tools and weapons
    [
      {
        segmentId: "1-advancedTools",
        maxCount: 4,
        label: "Advanced Tools",
        reward: 500,
        getCount: (state: GameState) => getItemCount(["ironAxe", "ironKnife", "ironPick", "steelAxe"]),
      },
      {
        segmentId: "1-advancedWeapons",
        maxCount: 5,
        label: "Advanced Weapons",
        reward: 500,
        getCount: (state: GameState) => getItemCount(["ironSword", "ironMace", "ironSpear", "ironBow", "ironArmor"]),
      },
    ],
    // Third ring: Specialized equipment
    [
      {
        segmentId: "2-specializedTools",
        maxCount: 3,
        label: "Specialized Tools",
        reward: 500,
        getCount: (state: GameState) => getItemCount(["obsidianKnife", "adamantAxe", "adamantPick"]),
      },
      {
        segmentId: "2-specializedWeapons",
        maxCount: 4,
        label: "Specialized Weapons",
        reward: 500,
        getCount: (state: GameState) => getItemCount(["steelSword", "steelMace", "steelSpear", "steelArmor"]),
      },
    ],
    // Fourth ring: Legendary items
    [
      {
        segmentId: "3-legendaryTools",
        maxCount: 2,
        label: "Legendary Tools",
        reward: 500,
        getCount: (state: GameState) => getItemCount(["adamantKnife", "obsidianPick"]),
      },
      {
        segmentId: "3-legendaryWeapons",
        maxCount: 3,
        label: "Legendary Weapons",
        reward: 500,
        getCount: (state: GameState) => getItemCount(["adamantSword", "adamantMace", "adamantArmor"]),
      },
    ],
  ],
};

/** Returns IDs of item achievements that are full but not yet claimed. */
export function getUnclaimedItemIds(): string[] {
  const state = useGameStore.getState();
  const claimedAchievements = state.claimedAchievements || [];
  const result: string[] = [];
  itemChartConfig.rings.forEach((segments) => {
    segments.forEach((seg) => {
      const count = seg.getCount(state);
      if (count >= seg.maxCount && !claimedAchievements.includes(`${itemChartConfig.idPrefix}-${seg.segmentId}`)) {
        result.push(`${itemChartConfig.idPrefix}-${seg.segmentId}`);
      }
    });
  });
  return result;
}