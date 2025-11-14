import { villageBuildActions } from "@/game/rules/villageBuildActions";
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
  // silver_miner: {
  //   id: "silver_miner",
  //   label: "silver_miner",
  //   production: [
  //     { resource: "silver", amount: 1, interval: 15000 },
  //     { resource: "food", amount: -20, interval: 15000 },
  //   ],
  // },
  obsidian_miner: {
    id: "obsidian_miner",
    label: "obsidian_miner",
    production: [
      { resource: "obsidian", amount: 5, interval: 15000 },
      { resource: "food", amount: -30, interval: 15000 },
    ],
  },
  adamant_miner: {
    id: "adamant_miner",
    label: "adamant_miner",
    production: [
      { resource: "adamant", amount: 5, interval: 15000 },
      { resource: "food", amount: -40, interval: 15000 },
    ],
  },
  moonstone_miner: {
    id: "moonstone_miner",
    label: "moonstone_miner",
    production: [
      { resource: "moonstone", amount: 1, interval: 15000 },
      { resource: "food", amount: -50, interval: 15000 },
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

const productionCache = new Map<string, any>();

export const getPopulationProduction = (
  jobId: string,
  count: number,
  state?: GameState,
) => {
  const cacheKey = `${jobId}-${count}-${JSON.stringify(state?.buildings)}-${
    state?.feastState?.isActive
  }-${state?.greatFeastState?.isActive}-${state?.curseState?.isActive}-${
    state?.devMode
  }`;

  if (productionCache.has(cacheKey)) {
    return productionCache.get(cacheKey);
  }

  const job = populationJobs[jobId];
  if (!job) return [];

  const baseProduction = job.production.map((prod) => ({
    ...prod,
    baseAmount: prod.amount,
    totalAmount: prod.amount * count,
  }));

  // Apply building production bonuses
  if (state?.buildings) {
    baseProduction.forEach((prod) => {
      let buildingBonusPerWorker = 0;

      // Check all buildings for production effects that apply to this job
      Object.entries(villageBuildActions).forEach(([actionId, buildAction]) => {
        if (buildAction.productionEffects?.[jobId]?.[prod.resource]) {
          // Extract building name from action ID (e.g., "buildTimberMill" -> "timberMill")
          const buildingKey = actionId.replace("build", "");
          const buildingName =
            buildingKey.charAt(0).toLowerCase() + buildingKey.slice(1);
          const buildingCount =
            state.buildings[buildingName as keyof typeof state.buildings] || 0;

          if (buildingCount > 0) {
            buildingBonusPerWorker +=
              buildAction.productionEffects[jobId][prod.resource] *
              buildingCount;
          }
        }
      });

      // Apply per-worker bonus: (baseAmount + buildingBonus) * workerCount
      prod.totalAmount = (prod.baseAmount + buildingBonusPerWorker) * count;
    });
  }

  // Apply feast multiplier if active
  const feastState = state.feastState;
  const greatFeastState = state.greatFeastState;
  const isGreatFeast =
    greatFeastState?.isActive && greatFeastState.endTime > Date.now();
  const isFeast = feastState?.isActive && feastState.endTime > Date.now();

  // Apply curse multiplier if active (0.5x, rounded up)
  const curseState = state.curseState;
  const isCursed = curseState?.isActive && curseState.endTime > Date.now();
  if (isCursed) {
    baseProduction.forEach((prod) => {
      prod.totalAmount = Math.ceil(prod.totalAmount * 0.5);
    });
  }

  // Apply Flame's Touch blessing bonus to steel production
  if (state && jobId === "steel_forger") {
    baseProduction.forEach((prod) => {
      if (prod.resource === "steel" && prod.baseAmount > 0) {
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
  
  if (isGreatFeast) {
    baseProduction.forEach((prod) => {
      prod.totalAmount = Math.ceil(prod.totalAmount * 4.0);
    });
  } else if (isFeast) {
    baseProduction.forEach((prod) => {
      prod.totalAmount = Math.ceil(prod.totalAmount * 2.0);
    });
  }

  // Apply 100x multiplier in dev mode
  if (state && state.devMode) {
    baseProduction.forEach((prod) => {
      prod.totalAmount *= 100;
    });
  }

  productionCache.set(cacheKey, baseProduction);
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

export function getMaxPopulation(state: GameState): number {
  const woodenHutCapacity = (state.buildings.woodenHut || 0) * 2;
  const stoneHutCapacity = (state.buildings.stoneHut || 0) * 4;
  const longhouseCapacity = (state.buildings.longhouse || 0) * 8;
  const furTentsCapacity = (state.buildings.furTents || 0) * 10;

  // Temple dedication bonuses
  let templeBonus = 0;
  if (state.blessings.flames_touch) {
    templeBonus = 4;
  } else if (state.blessings.flames_touch_enhanced) {
    templeBonus = 8;
  }

  return (
    woodenHutCapacity +
    stoneHutCapacity +
    longhouseCapacity +
    furTentsCapacity +
    templeBonus
  );
}

// Alias for backward compatibility
export const calculateMaxPopulation = getMaxPopulation;
