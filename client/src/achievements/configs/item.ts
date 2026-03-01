import { useGameStore } from "@/game/state";
import { tailwindToHex } from "@/lib/tailwindColors";
import { AchievementChartConfig } from "../AchievementRingChart";
import type { GameState } from "@shared/schema";

const COMPLETED_COLOR = tailwindToHex("red-800");
const COMPLETED_STROKE_COLOR = tailwindToHex("red-900");

function getItemCount(itemKeys: string[]): number {
  const state = useGameStore.getState();
  let count = 0;
  for (const itemKey of itemKeys) {
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

export const itemChartConfig: AchievementChartConfig = {
  idPrefix: "item",
  completedColor: COMPLETED_COLOR,
  completedStrokeColor: COMPLETED_STROKE_COLOR,
  centerSymbol: "❖",
  rings: [
    // First ring: Tools
    [
      {
        segmentId: "0-axes",
        maxCount: 5,
        label: "Chop",
        reward: 500,
        getCount: (_state: GameState) =>
          getItemCount(["stone_axe", "iron_axe", "steel_axe", "obsidian_axe", "adamant_axe"]),
      },
      {
        segmentId: "0-pickaxes",
        maxCount: 5,
        label: "Dig",
        reward: 500,
        getCount: (_state: GameState) =>
          getItemCount(["stone_pickaxe", "iron_pickaxe", "steel_pickaxe", "obsidian_pickaxe", "adamant_pickaxe"]),
      },
      {
        segmentId: "0-lanterns",
        maxCount: 4,
        label: "Illuminate",
        reward: 500,
        getCount: (_state: GameState) =>
          getItemCount(["iron_lantern", "steel_lantern", "obsidian_lantern", "adamant_lantern"]),
      },
    ],
    // Second ring: Weapons
    [
      {
        segmentId: "1-swords",
        maxCount: 4,
        label: "Strike",
        reward: 500,
        getCount: (_state: GameState) =>
          getItemCount(["iron_sword", "steel_sword", "obsidian_sword", "adamant_sword"]),
      },
      {
        segmentId: "1-bows",
        maxCount: 5,
        label: "Shoot",
        reward: 500,
        getCount: (_state: GameState) =>
          getItemCount(["crude_bow", "huntsman_bow", "long_bow", "war_bow", "master_bow"]),
      },
    ],
    // Third ring: Clothing & Schematic Weapons
    [
      {
        segmentId: "2-explorer_pack",
        maxCount: 6,
        label: "Leather Crafter",
        reward: 500,
        getCount: (_state: GameState) =>
          getItemCount(["explorer_pack", "hunter_cloak", "grenadier_bag", "highpriest_robe", "loggers_gloves", "shadow_boots"]),
      },
      {
        segmentId: "2-schematic_weapons",
        maxCount: 3,
        label: "Schematic Crafter",
        reward: 250,
        getCount: (_state: GameState) =>
          getItemCount(["arbalest", "nightshade_bow", "stormglass_halberd"]),
      },
    ],
    // Fourth ring: Ancient Books & Fellowship
    [
      {
        segmentId: "3-books",
        maxCount: 3,
        label: "Ancient Wisdom",
        reward: 250,
        getCount: (_state: GameState) =>
          getItemCount(["unnamed_book", "elder_scroll", "occultist_grimoire"]),
      },
      {
        segmentId: "3-fellowship",
        maxCount: 3,
        label: "Good Company",
        reward: 250,
        getCount: (_state: GameState) =>
          getItemCount(["elder_wizard", "restless_knight", "ashwraith_huntress"]),
      },
    ],
    // Fifth ring: Blacksteel
    [
      {
        segmentId: "4-blacksteel_tools",
        maxCount: 3,
        label: "Dark Tools",
        reward: 250,
        getCount: (_state: GameState) =>
          getItemCount(["blacksteel_axe", "blacksteel_pickaxe", "blacksteel_lantern"]),
      },
      {
        segmentId: "4-blacksteel_equipment",
        maxCount: 3,
        label: "Dark War Equipment",
        reward: 250,
        getCount: (_state: GameState) =>
          getItemCount(["blacksteel_sword", "blacksteel_bow", "blacksteel_armor"]),
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
