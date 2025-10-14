import { villageBuildActions } from '@/game/rules/villageBuildActions';

export interface PopulationJobConfig {
  id: string;
  label: string;
  production: {
    resource: string;
    amount: number;
    interval: number; // in milliseconds
  }[];
}

export const populationJobs: Record<string, PopulationJobConfig> = {
  gatherer: {
    id: "gatherer",
    label: "gatherer",
    production: [
      {
        resource: "wood",
        amount: 10,
        interval: 15000,
      },
      {
        resource: "stone",
        amount: 5,
        interval: 15000,
      },
    ],
  },
  hunter: {
    id: "hunter",
    label: "hunter",
    production: [
      {
        resource: "food",
        amount: 5,
        interval: 15000,
      },
      { resource: "fur", amount: 1, interval: 15000 },
      { resource: "bones", amount: 1, interval: 15000 },

    ],
  },
  iron_miner: {
    id: "iron_miner",
    label: "iron_miner",
    production: [
      { resource: "iron", amount: 5, interval: 15000 },
      { resource: "food", amount: -5, interval: 15000 },
    ],
  },
  coal_miner: {
    id: "coal_miner",
    label: "coal_miner",
    production: [
      { resource: "coal", amount: 5, interval: 15000 },
      { resource: "food", amount: -5, interval: 15000 },
    ],
  },
  sulfur_miner: {
    id: "sulfur_miner",
    label: "sulfur_miner",
    production: [
      { resource: "sulfur", amount: 5, interval: 15000 },
      { resource: "food", amount: -10, interval: 15000 },
    ],
  },
  silver_miner: {
    id: "silver_miner",
    label: "silver_miner",
    production: [
      { resource: "silver", amount: 1, interval: 15000 },
      { resource: "food", amount: -25, interval: 15000 },
    ],
  },
  obsidian_miner: {
    id: "obsidian_miner",
    label: "obsidian_miner",
    production: [
      { resource: "obsidian", amount: 5, interval: 15000 },
      { resource: "food", amount: -50, interval: 15000 },
    ],
  },
  adamant_miner: {
    id: "adamant_miner",
    label: "adamant_miner",
    production: [
      { resource: "adamant", amount: 5, interval: 15000 },
      { resource: "food", amount: -100, interval: 15000 },
    ],
  },
  moonstone_miner: {
    id: "moonstone_miner",
    label: "moonstone_miner",
    production: [
      { resource: "moonstone", amount: 1, interval: 15000 },
      { resource: "food", amount: -150, interval: 15000 },
    ],
  },
  steel_forger: {
    id: "steel_forger",
    label: "steel_forger",
    production: [
      { resource: "steel", amount: 1, interval: 15000 },
      { resource: "iron", amount: -5, interval: 15000 },
      { resource: "coal", amount: -5, interval: 15000 },
      { resource: "food", amount: -5, interval: 15000 },
    ],
  },
  tanner: {
    id: "tanner",
    label: "tanner",
    production: [
      { resource: "leather", amount: 1, interval: 15000 },
      { resource: "fur", amount: -5, interval: 15000 },
      { resource: "food", amount: -5, interval: 15000 },
    ],
  },
  powder_maker: {
    id: "powder_maker",
    label: "powder_maker",
    production: [
      { resource: "black_powder", amount: 1, interval: 15000 },
      { resource: "sulfur", amount: -10, interval: 15000 },
      { resource: "coal", amount: -10, interval: 15000 },
      { resource: "food", amount: -10, interval: 15000 },
    ],
  },
  cinderflame_dust_maker: {
    id: "cinderflame_dust_maker",
    label: "cinderflame_dust_maker",
    production: [
      { resource: "cinderflame_dust", amount: 1, interval: 15000 },
      { resource: "moonstone", amount: -10, interval: 15000 },
      { resource: "sulfur", amount: -20, interval: 15000 },
      { resource: "coal", amount: -20, interval: 15000 },
      { resource: "food", amount: -10, interval: 15000 },
    ],
  },

};

export const getPopulationProduction = (jobId: string, count: number, state?: any) => {
  const job = populationJobs[jobId];
  if (!job) return [];

  return job.production.map((prod) => {
    let amount = prod.amount;

    // Apply building production effects from villageBuildActions if state is provided
    if (state && state.buildings) {
      // Check each building type for productionEffects that affect this job
      Object.entries(state.buildings).forEach(([buildingType, buildingCount]) => {
        if (buildingCount > 0) {
          const buildingAction = villageBuildActions[`build${buildingType.charAt(0).toUpperCase() + buildingType.slice(1)}`];

          if (buildingAction && buildingAction.productionEffects && buildingAction.productionEffects[jobId]) {
            const jobEffects = buildingAction.productionEffects[jobId];
            if (jobEffects[prod.resource]) {
              amount += jobEffects[prod.resource];
            }
          }
        }
      });
    }

    // Apply Flame's Touch blessing bonus to steel production
    if (state && jobId === 'steel_forger' && prod.resource === 'steel' && prod.amount > 0) {
      if (state.blessings?.flames_touch) {
        amount += 1; // +1 steel per forger
      }
      if (state.blessings?.flames_touch_enhanced) {
        amount += 3; // +3 steel per forger (replaces the +1 from basic)
      }
    }

    // Apply 100x multiplier in dev mode
    if (state && state.devMode) {
      amount *= 100;
    }

    return {
      ...prod,
      amount,
      totalAmount: amount * count,
    };
  });
};

export const getPopulationProductionText = (jobId: string): string => {
  const job = populationJobs[jobId];
  if (!job) return "";

  return (
    job.production
      .map(
        (prod) =>
          `${prod.amount > 0 ? "+" : ""}${Math.abs(prod.amount)} ${prod.resource}`,
      )
      .join(", ") + " per 15s"
  );
};

import { GameState } from "@shared/schema";

export const getMaxPopulation = (gameState: GameState): number => {
  const woodenHutCapacity = (gameState.buildings.woodenHut || 0) * 2;
  const stoneHutCapacity = (gameState.buildings.stoneHut || 0) * 4;
  const longhouseCapacity = (gameState.buildings.longhouse || 0) * 8;

  // Temple dedication bonuses
  let templeBonus = 0;
  if (gameState.blessings.flames_touch) {
    templeBonus = 4;
  } else if (gameState.blessings.flames_touch_enhanced) {
    templeBonus = 8;
  }
  
  return woodenHutCapacity + stoneHutCapacity + longhouseCapacity + templeBonus;
};

// Alias for backward compatibility
export const calculateMaxPopulation = getMaxPopulation;