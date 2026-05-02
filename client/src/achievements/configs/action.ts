import { useGameStore } from "@/game/state";
import type { AchievementChartConfig } from "../achievementTypes";
import type { GameState } from "@shared/schema";

export const actionChartConfig: AchievementChartConfig = {
  idPrefix: "action",
  centerSymbol: "⧗",
  rings: [
    // First ring: Well Rested (outermost ring)
    [
      {
        segmentId: "0-exploreCave",
        maxCount: 10,
        label: "Cave Explorer",
        reward: 500,
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.caveExplore?.level || 0;
          return count === 1 ? 1.3 : count;
        },
      },
      {
        segmentId: "0-chopWood",
        maxCount: 10,
        label: "Wood Chopper",
        reward: 500,
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.chopWood?.level || 0;
          return count === 1 ? 1.3 : count;
        },
      },
      {
        segmentId: "0-hunt",
        maxCount: 10,
        label: "Hunter",
        reward: 500,
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.hunt?.level || 0;
          return count === 1 ? 1.3 : count;
        },
      },
      {
        segmentId: "0-craftTorches",
        maxCount: 10,
        label: "Torch Crafter",
        reward: 500,
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.["craftTorches"]?.level || 0;
          return count === 1 ? 1.3 : count;
        },
      },
    ],
    // Second ring: Cave & Gathering Actions
    [
      {
        segmentId: "1-mineStone",
        maxCount: 10,
        label: "Stone Miner",
        reward: 500,
        getCount: (state: GameState) =>
          Math.floor(state.buttonUpgrades?.mineStone?.level || 0),
      },
      {
        segmentId: "1-mineIron",
        maxCount: 10,
        label: "Iron Miner",
        reward: 500,
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineIron?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
      {
        segmentId: "1-mineCoal",
        maxCount: 10,
        label: "Coal Miner",
        reward: 500,
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineCoal?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
      {
        segmentId: "1-mineSulfur",
        maxCount: 10,
        label: "Sulfur Miner",
        reward: 500,
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineSulfur?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
      {
        segmentId: "1-mineObsidian",
        maxCount: 10,
        label: "Obsidian Miner",
        reward: 500,
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineObsidian?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
      {
        segmentId: "1-mineAdamant",
        maxCount: 10,
        label: "Adamant Miner",
        reward: 500,
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineAdamant?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
    ],
    // Third ring: Mining Actions
    [
      {
        segmentId: "2-boneTotems",
        maxCount: 20,
        label: "Bone Sacrificer",
        reward: 500,
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.boneTotemsUsageCount) || 0, 20),
      },
      {
        segmentId: "2-leatherTotems",
        maxCount: 20,
        label: "Leather Sacrificer",
        reward: 500,
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.leatherTotemsUsageCount) || 0, 20),
      },
      {
        segmentId: "2-animals",
        maxCount: 10,
        label: "Animal Sacrificer",
        reward: 500,
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.animalsSacrificeLevel) || 0, 10),
      },
      {
        segmentId: "2-craftBoneTotems",
        maxCount: 10,
        label: "Bone Totem Crafter",
        reward: 500,
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.["craftBoneTotems"]?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
      {
        segmentId: "2-craftLeatherTotems",
        maxCount: 10,
        label: "Leather Totem Crafter",
        reward: 500,
        getCount: (state: GameState) => {
          const count =
            state.buttonUpgrades?.["craftLeatherTotems"]?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
    ],
    // Fourth ring: Bomb Crafting
    [
      {
        segmentId: "3-emberBombs",
        maxCount: 25,
        label: "Ember Bombs Crafter",
        reward: 500,
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.emberBombsCrafted) || 0, 25),
      },
      {
        segmentId: "3-ashfireBombs",
        maxCount: 20,
        label: "Ashfire Bombs Crafter",
        reward: 500,
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.ashfireBombsCrafted) || 0, 20),
      },
    ],
    // Fifth ring: Merchant Purchases
    [
      {
        segmentId: "4-merchantPurchases",
        maxCount: 100,
        label: "Deal Maker",
        reward: 500,
        segments: 20,
        getCount: (state: GameState) => {
          const count = Math.min(
            Number(state.story?.merchantPurchases) || 0,
            100,
          );
          return [1, 2, 3].includes(count) ? 3 : count;
        },
      },
      {
        segmentId: "0-gamblerWins",
        maxCount: 10,
        label: "Experienced Gambler",
        rewards: { gold: 50 },
        getCount: (state: GameState) =>
          Number(state.story?.seen?.gamblerWinsTotal) || 0,
        segments: 10,
      },
      {
        segmentId: "4-feedFire",
        maxCount: 100,
        label: "Fire Feeder",
        reward: 500,
        segments: 20,
        getCount: (state: GameState) => {
          const count = Math.min(
            Number(state.story?.seen?.feedFireUsageCount) || 0,
            100,
          );
          return [1, 2, 3].includes(count) ? 3 : count;
        },
      },
      {
        segmentId: "4-wellRested",
        maxCount: 20,
        label: "Heavy Sleeper",
        reward: 500,
        getCount: (state: GameState) => {
          const count = Math.min(
            Math.max(
              Number(state.story?.heavySleeperHours) || 0,
              Number(state.totalFocusEarned) || 0,
            ),
            20,
          );
          return [1, 2, 3].includes(count) ? 3 : count;
        },
      },
      {
        segmentId: "4-solsticeGatherings",
        maxCount: 10,
        label: "Solstice Celebrant",
        reward: 500,
        getCount: (state: GameState) =>
          Math.min(Number(state.solsticeState?.activationsCount) || 0, 10),
      },
    ],
  ],
};

/** Returns IDs of action achievements that are full but not yet claimed. */
export function getUnclaimedActionIds(): string[] {
  const state = useGameStore.getState();
  const gameState = state as unknown as GameState;
  const claimedAchievements = state.claimedAchievements || [];
  const result: string[] = [];
  actionChartConfig.rings.forEach((segments) => {
    segments.forEach((seg) => {
      const count = seg.getCount(gameState);
      if (
        count >= seg.maxCount &&
        !claimedAchievements.includes(
          `${actionChartConfig.idPrefix}-${seg.segmentId}`,
        )
      ) {
        result.push(`${actionChartConfig.idPrefix}-${seg.segmentId}`);
      }
    });
  });
  return result;
}
