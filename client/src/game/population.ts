import { villageBuildActions } from '@/game/rules/villageBuildActions';
import { GameState } from "@shared/schema"; // Assuming GameState is defined elsewhere

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
  ashfire_dust_maker: {
    id: "ashfire_dust_maker",
    label: "ashfire_dust_maker",
    production: [
      { resource: "ashfire_dust", amount: 1, interval: 15000 },
      { resource: "moonstone", amount: -10, interval: 15000 },
      { resource: "sulfur", amount: -20, interval: 15000 },
      { resource: "coal", amount: -20, interval: 15000 },
      { resource: "food", amount: -10, interval: 15000 },
    ],
  },

};

export const getPopulationProduction = (jobId: string, count: number, state?: GameState) => {
  const job = populationJobs[jobId];
  if (!job) return [];

  const baseProduction = job.production.map((prod) => ({
    ...prod,
    baseAmount: prod.amount,
    totalAmount: prod.amount * count,
  }));

  // Apply building production bonuses
  baseProduction.forEach((prod) => {
    const buildingBonus = (state?.buildings && villageBuildActions[`build${jobId.charAt(0).toUpperCase() + jobId.slice(1)}`]?.productionEffects?.[jobId]?.[prod.resource] * (state.buildings[jobId] || 0)) || 0;
    prod.totalAmount = prod.baseAmount * count + buildingBonus;
  });


  // Apply feast multiplier (2x production when active)
  if (state?.feastState?.isActive && state.feastState.endTime > Date.now()) {
    baseProduction.forEach((prod) => {
      prod.totalAmount *= 2;
    });
  }

  // Apply Flame's Touch blessing bonus to steel production
  if (state && jobId === 'steel_forger') {
    baseProduction.forEach((prod) => {
      if (prod.resource === 'steel' && prod.baseAmount > 0) {
        let bonusSteel = 0;
        if (state.blessings?.flames_touch) {
          bonusSteel = 1; // +1 steel per forger
        }
        if (state.blessings?.flames_touch_enhanced) {
          bonusSteel = 3; // +3 steel per forger (replaces the +1 from basic)
        }
        prod.totalAmount += bonusSteel * count;
      }
    });
  }

  // Apply 100x multiplier in dev mode
  if (state && state.devMode) {
    baseProduction.forEach((prod) => {
      prod.totalAmount *= 100;
    });
  }

  return baseProduction;
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