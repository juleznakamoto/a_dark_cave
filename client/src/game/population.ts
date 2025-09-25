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
  gold_miner: {
    id: "gold_miner",
    label: "gold_miner",
    production: [
      { resource: "gold", amount: 1, interval: 15000 },
      { resource: "food", amount: -50, interval: 15000 },
    ],
  },
  obsidian_miner: {
    id: "obsidian_miner",
    label: "obsidian_miner",
    production: [
      { resource: "obsidian", amount: 5, interval: 15000 },
      { resource: "food", amount: -75, interval: 15000 },
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
      { resource: "leather", amount: 5, interval: 15000 },
      { resource: "fur", amount: -5, interval: 15000 },
      { resource: "food", amount: -5, interval: 15000 },
    ],
  },
};

// Helper function to get building production effects directly from building state
const getBuildingProductionEffects = (state: any) => {
  const buildingEffects: Record<string, Record<string, number>> = {};
  const buildings = state.buildings || {};

  // Great Cabin effects - adds to hunter production
  if (buildings.greatCabin > 0) {
    buildingEffects.hunter = {
      food: 5,
      fur: 4,
      bones: 4
    };
  }

  // Timber Mill effects - adds to gatherer wood production
  if (buildings.timberMill > 0) {
    if (!buildingEffects.gatherer) buildingEffects.gatherer = {};
    buildingEffects.gatherer.wood = 5;
  }

  // Quarry effects - adds to gatherer stone production
  if (buildings.quarry > 0) {
    if (!buildingEffects.gatherer) buildingEffects.gatherer = {};
    buildingEffects.gatherer.stone = 5;
  }

  return buildingEffects;
};

export const getPopulationProduction = (jobId: string, count: number, state?: any) => {
  const job = populationJobs[jobId];
  if (!job) return [];

  return job.production.map((prod) => {
    let amount = prod.amount;

    // Apply building bonuses dynamically if state is provided
    if (state) {
      const buildingEffects = getBuildingProductionEffects(state);

      // Check if this job has building effects
      if (buildingEffects[jobId] && buildingEffects[jobId][prod.resource]) {
        const effect = buildingEffects[jobId][prod.resource];
        amount += effect; // Add the bonus effect to the base amount
      }
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