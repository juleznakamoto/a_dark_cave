import { useGameStore } from "@/game/state";
import type { AchievementChartConfig } from "../achievementTypes";
import type { GameState } from "@shared/schema";

export const buildingChartConfig: AchievementChartConfig = {
  idPrefix: "building",
  centerSymbol: "▨",
  rings: [
    // First ring: Huts
    [
      {
        segmentId: "0-0",
        maxCount: 10,
        label: "Basic Shelter",
        reward: 500,
        getCount: (state: GameState) => state.buildings.woodenHut || 0,
      },
      {
        segmentId: "0-1",
        maxCount: 10,
        label: "Advanced Shelter",
        reward: 500,
        getCount: (state: GameState) => state.buildings.stoneHut || 0,
      },
      {
        segmentId: "0-2",
        maxCount: 5,
        label: "Nordic Housing",
        reward: 250,
        getCount: (state: GameState) => state.buildings.longhouse || 0,
      },
      {
        segmentId: "0-3",
        maxCount: 5,
        label: "Fur Tents",
        reward: 250,
        getCount: (state: GameState) => state.buildings.furTents || 0,
      },
    ],
    // Second ring: Basic crafting and trade buildings
    [
      {
        segmentId: "1-0",
        maxCount: 3,
        label: "Hunting",
        reward: 250,
        getCount: (state: GameState) => {
          return (state.buildings.cabin || 0) +
            (state.buildings.greatCabin || 0) +
            (state.buildings.grandHunterLodge || 0);
        },
      },
      {
        segmentId: "1-1",
        maxCount: 3,
        label: "Forging",
        reward: 250,
        getCount: (state: GameState) => {
          return (state.buildings.blacksmith || 0) +
            (state.buildings.advancedBlacksmith || 0) +
            (state.buildings.grandBlacksmith || 0);
        },
      },
      {
        segmentId: "1-2",
        maxCount: 3,
        label: "Smelting",
        reward: 250,
        getCount: (state: GameState) => {
          return (state.buildings.foundry || 0) +
            (state.buildings.primeFoundry || 0) +
            (state.buildings.masterworkFoundry || 0);
        },
      },
      {
        segmentId: "1-3",
        maxCount: 3,
        label: "Hidework",
        reward: 250,
        getCount: (state: GameState) => {
          return (state.buildings.tannery || 0) +
            (state.buildings.masterTannery || 0) +
            (state.buildings.highTannery || 0);
        },
      },
    ],
    // Third ring: Resource buildings and pits
    [
      {
        segmentId: "2-0",
        maxCount: 4,
        label: "Mining",
        reward: 500,
        getCount: (state: GameState) => {
          return (state.buildings.shallowPit || 0) +
            (state.buildings.deepeningPit || 0) +
            (state.buildings.deepPit || 0) +
            (state.buildings.bottomlessPit || 0);
        },
      },
    ],
    // Fourth ring: Advanced buildings
    [
      {
        segmentId: "3-0",
        maxCount: 3,
        label: "Trade",
        reward: 250,
        getCount: (state: GameState) => {
          return (state.buildings.tradePost || 0) +
            (state.buildings.grandBazaar || 0) +
            (state.buildings.merchantsGuild || 0);
        },
      },
      {
        segmentId: "3-1",
        maxCount: 6,
        label: "Storage",
        reward: 500,
        getCount: (state: GameState) => {
          return (state.buildings.supplyHut || 0) +
            (state.buildings.storehouse || 0) +
            (state.buildings.fortifiedStorehouse || 0) +
            (state.buildings.villageWarehouse || 0) +
            (state.buildings.grandRepository || 0) +
            (state.buildings.greatVault || 0);
        },
      },
      {
        segmentId: "3-2",
        maxCount: 3,
        label: "Wisdom",
        reward: 250,
        getCount: (state: GameState) => {
          return (state.buildings.clerksHut || 0) +
            (state.buildings.scriptorium || 0) +
            (state.buildings.inkwardenAcademy || 0);
        },
      },
      {
        segmentId: "3-3",
        maxCount: 4,
        label: "Devotion",
        reward: 500,
        getCount: (state: GameState) => {
          return (state.buildings.altar || 0) +
            (state.buildings.shrine || 0) +
            (state.buildings.temple || 0) +
            (state.buildings.sanctum || 0);
        },
      },
    ],
    // Fifth ring: Fortifications
    [
      {
        segmentId: "4-0",
        maxCount: 4,
        label: "Walls",
        reward: 500,
        getCount: (state: GameState) => state.buildings.palisades || 0,
      },
      {
        segmentId: "4-1",
        maxCount: 4,
        label: "Lookout",
        reward: 500,
        getCount: (state: GameState) => state.buildings.watchtower || 0,
      },
    ],
  ],
};

/** Returns IDs of building achievements that are full but not yet claimed. */
export function getUnclaimedBuildingIds(): string[] {
  const state = useGameStore.getState();
  const claimedAchievements = state.claimedAchievements || [];
  const result: string[] = [];
  buildingChartConfig.rings.forEach((segments) => {
    segments.forEach((seg) => {
      const count = seg.getCount(state);
      if (count >= seg.maxCount && !claimedAchievements.includes(`${buildingChartConfig.idPrefix}-${seg.segmentId}`)) {
        result.push(`${buildingChartConfig.idPrefix}-${seg.segmentId}`);
      }
    });
  });
  return result;
}