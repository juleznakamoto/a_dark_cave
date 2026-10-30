import { villageBuildActions } from "@/game/rules/villageBuildActions";
import { BRIMSTONE_FLUX_STEEL_BONUS } from "@/game/rules/eventsBrimstoneFlux";
import { GameState } from "@shared/schema"; // Assuming GameState is defined elsewhere
import {
  DISGRACED_PRIOR_FOOD_PER_ASSIGNED_ACTION_PER_CYCLE,
  getChainmasterProductionBonus,
  HUNTING_SKILL_BONUSES,
} from "@/game/rules/skillUpgrades";
import { getTotalMadness } from "@/game/rules/effectsCalculation";
import type { PopulationJobConfig } from "@/game/types";

// Re-export for convenience
export type { PopulationJobConfig } from "@/game/types";

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
  blacksteel_forger: {
    id: "blacksteel_forger",
    label: "blacksteel_forger",
    production: [
      { resource: "blacksteel", amount: 1, interval: 15000 },
      { resource: "steel", amount: -5, interval: 15000 },
      { resource: "obsidian", amount: -5, interval: 15000 },
      { resource: "adamant", amount: -5, interval: 15000 },
      { resource: "food", amount: -10, interval: 15000 },
    ],
  },
  tanner: {
    id: "tanner",
    label: "tanner",
    production: [
      { resource: "leather", amount: 1, interval: 15000 },
      { resource: "fur", amount: -10, interval: 15000 },
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
  scholar: {
    id: "scholar",
    label: "scholar",
    production: [
      { resource: "insight", amount: 1, interval: 15000 },
      { resource: "food", amount: -5, interval: 15000 },
    ],
  },
  // Idle villagers (the available pool). Not an assignable profession.
  free: {
    id: "free",
    label: "free",
    production: [{ resource: "food", amount: 3, interval: 15000 }],
  },
};

/** Insight per scholar per cycle from highest clerk-chain building only. */
export function getScholarInsightPerWorker(
  state: Pick<GameState, "buildings">,
): number {
  if ((state.buildings.inkwardenAcademy ?? 0) > 0) return 3;
  if ((state.buildings.scriptorium ?? 0) > 0) return 2;
  if ((state.buildings.clerksHut ?? 0) > 0) return 1;
  return 0;
}

/** One source's signed contribution to a job resource total for this cycle. */
export type JobProductionCompositionLine = {
  resource: string;
  sourceId: string;
  /** Delta applied to the cycle total (already multiplied by worker count). */
  amount: number;
};

type PopulationProductionRow = {
  resource: string;
  amount: number;
  interval: number;
  baseAmount: number;
  totalAmount: number;
};

/**
 * One state object is read by the side panel and the job rows in the same
 * turn. The store replaces that object on the next write, so a feast expiring
 * or a building changing is a cache miss. Callers must not mutate the state
 * object in place. Returned rows are copies, so editing a total cannot poison
 * the next read.
 */
const populationProductionCache = new WeakMap<
  GameState,
  Map<string, PopulationProductionRow[]>
>();

function populationProductionCacheKey(
  jobId: string,
  count: number,
  excludeTemporary: boolean,
): string {
  return `${jobId}\0${count}\0${excludeTemporary ? 1 : 0}`;
}

function copyPopulationProduction(
  rows: PopulationProductionRow[],
): PopulationProductionRow[] {
  return rows.map((row) => ({ ...row }));
}

export interface GetPopulationProductionOptions {
  /** When true, excludes temporary bonuses (feast, solstice gathering, heartfire, curse, frostfall, fog, disgust, mining boost, staring deer, forest fear) and Disgraced Prior food upkeep. Use for sleep / idle eligibility: those effects are inactive while the sim is paused in sleep, and the Prior does not auto-execute. */
  excludeTemporaryBonuses?: boolean;
  /**
   * When set, each source that changes a resource total is appended here.
   * Deltas for one resource sum to that resource's `totalAmount`.
   * Omit on the game-loop path.
   */
  composition?: JobProductionCompositionLine[];
}

function noteComposition(
  composition: JobProductionCompositionLine[] | undefined,
  resource: string,
  sourceId: string,
  delta: number,
): void {
  if (!composition || delta === 0) return;
  composition.push({ resource, sourceId, amount: delta });
}

function replaceCompositionResource(
  composition: JobProductionCompositionLine[] | undefined,
  resource: string,
  sourceId: string,
  amount: number,
): void {
  if (!composition) return;
  for (let i = composition.length - 1; i >= 0; i--) {
    if (composition[i].resource === resource) composition.splice(i, 1);
  }
  if (amount !== 0) {
    composition.push({ resource, sourceId, amount });
  }
}

/** Building that sets scholar insight, matching getScholarInsightPerWorker. */
function scholarInsightSourceId(
  state: Pick<GameState, "buildings">,
): string {
  if ((state.buildings.inkwardenAcademy ?? 0) > 0) return "inkwardenAcademy";
  if ((state.buildings.scriptorium ?? 0) > 0) return "scriptorium";
  if ((state.buildings.clerksHut ?? 0) > 0) return "clerksHut";
  return "base";
}

/** Positive production multiplier from madness (1 = no penalty). Only meaningful when totalMadness >= 10. */
export function getMadnessProductionMultiplier(
  totalMadness: number,
  cruelMode: boolean,
): number {
  if (totalMadness < 10) return 1;
  if (cruelMode) {
    if (totalMadness >= 50) return 0.4;
    if (totalMadness >= 40) return 0.55;
    if (totalMadness >= 30) return 0.65;
    if (totalMadness >= 20) return 0.75;
    return 0.85;
  }
  if (totalMadness >= 50) return 0.5;
  if (totalMadness >= 40) return 0.6;
  if (totalMadness >= 30) return 0.7;
  if (totalMadness >= 20) return 0.8;
  return 0.9;
}

export const getPopulationProduction = (
  jobId: string,
  count: number,
  state?: GameState,
  options?: GetPopulationProductionOptions,
) => {
  const excludeTemporary = options?.excludeTemporaryBonuses ?? false;
  const canCache = Boolean(state) && !options?.composition;
  if (canCache && state) {
    const hit = populationProductionCache
      .get(state)
      ?.get(populationProductionCacheKey(jobId, count, excludeTemporary));
    if (hit) return copyPopulationProduction(hit);
  }

  const job = populationJobs[jobId];
  if (!job) return [];

  const baseProduction = job.production.map((prod) => ({
    ...prod,
    baseAmount: prod.amount,
    totalAmount: prod.amount * count,
  }));

  // Unlock-gated job resources must exist before building productionEffects apply
  if (state && jobId === "gatherer" && state.story?.seen?.veinrootDiscovered) {
    baseProduction.push({
      resource: "veinroot",
      amount: 1,
      interval: 15000,
      baseAmount: 1,
      totalAmount: 1 * count,
    });
  }

  const composition = options?.composition;
  const note = (resource: string, sourceId: string, delta: number) => {
    noteComposition(composition, resource, sourceId, delta);
  };
  const scale = (
    prod: { resource: string; totalAmount: number },
    sourceId: string,
    next: (current: number) => number,
  ) => {
    const before = prod.totalAmount;
    prod.totalAmount = next(before);
    note(prod.resource, sourceId, prod.totalAmount - before);
  };

  for (const prod of baseProduction) {
    note(prod.resource, "base", prod.totalAmount);
  }

  // Apply building production bonuses. Resolve each built building once per
  // job, then apply its rates to every output. Unbuilt entries are skipped.
  if (state?.buildings) {
    const bonusPerWorker = new Map<string, number>();
    const bonusParts = composition
      ? new Map<string, { sourceId: string; perWorker: number }[]>()
      : null;

    for (const [actionId, buildAction] of Object.entries(villageBuildActions)) {
      const buildingKey = actionId.replace("build", "");
      const buildingName =
        buildingKey.charAt(0).toLowerCase() + buildingKey.slice(1);
      const buildingCount =
        state.buildings[buildingName as keyof typeof state.buildings] || 0;
      if (buildingCount <= 0) continue;

      const productionEffects =
        typeof buildAction.productionEffects === "function"
          ? buildAction.productionEffects(state)
          : buildAction.productionEffects;
      const jobEffects = productionEffects?.[jobId];
      if (!jobEffects) continue;

      for (const prod of baseProduction) {
        const rate = jobEffects[prod.resource];
        if (!rate) continue;
        const perWorker = rate * buildingCount;
        bonusPerWorker.set(
          prod.resource,
          (bonusPerWorker.get(prod.resource) ?? 0) + perWorker,
        );
        if (bonusParts) {
          const parts = bonusParts.get(prod.resource);
          if (parts) parts.push({ sourceId: buildingName, perWorker });
          else bonusParts.set(prod.resource, [{ sourceId: buildingName, perWorker }]);
        }
      }
    }

    for (const prod of baseProduction) {
      // (baseAmount + buildingBonus) * workerCount
      prod.totalAmount =
        (prod.baseAmount + (bonusPerWorker.get(prod.resource) ?? 0)) * count;
      const parts = bonusParts?.get(prod.resource);
      if (!parts) continue;
      for (const part of parts) {
        note(prod.resource, part.sourceId, part.perWorker * count);
      }
    }
  }

  // Apply feast multiplier if active
  const feastState = state.feastState;
  const greatFeastState = state.greatFeastState;
  const isGreatFeast =
    greatFeastState?.isActive && greatFeastState.endTime > Date.now();
  const isFeast = feastState?.isActive && feastState.endTime > Date.now();

  // Apply curse multiplier if active (0.5x, rounded up) - temporary, inactive during sleep
  const curseState = state.curseState;
  const isCursed = !excludeTemporary && curseState?.isActive && curseState.endTime > Date.now();
  if (isCursed) {
    baseProduction.forEach((prod) => {
      // Only reduce positive production (not consumption)
      if (prod.totalAmount > 0) {
        scale(prod, "witchsCurse", (n) => Math.ceil(n * 0.5));
      }
    });
  }

  // Apply frostfall penalty if active (0.75x for positive production only) - temporary, inactive during sleep
  const frostfallState = state.frostfallState;
  const isFrostfall =
    !excludeTemporary &&
    frostfallState?.isActive &&
    frostfallState.endTime > Date.now();
  if (isFrostfall) {
    baseProduction.forEach((prod) => {
      // Only reduce positive production (not consumption)
      if (prod.totalAmount > 0) {
        scale(prod, "frostfall", (n) => Math.ceil(n * 0.75));
      }
    });
  }

  // Apply fog penalty if active (0.5x, same as curse) - temporary, inactive during sleep
  const fogState = state.fogState;
  const isFog = !excludeTemporary && fogState?.isActive && fogState.endTime > Date.now();
  if (isFog) {
    baseProduction.forEach((prod) => {
      // Only reduce positive production (not consumption)
      if (prod.totalAmount > 0) {
        scale(prod, "chokingFog", (n) => Math.ceil(n * 0.75));
      }
    });
  }

  // Apply disgust penalty if active (-25% production) - temporary, inactive during sleep
  const disgustState = state.disgustState;
  const isDisgusted =
    !excludeTemporary &&
    disgustState?.isActive &&
    disgustState.endTime > Date.now();
  if (isDisgusted) {
    baseProduction.forEach((prod) => {
      // Only reduce positive production (not consumption)
      if (prod.totalAmount > 0) {
        scale(prod, "villagerDisgust", (n) => Math.ceil(n * 0.75));
      }
    });
  }

  // Apply madness penalty if active (scales with madness level; harsher in cruel mode)
  const totalMadness = state ? getTotalMadness(state) : 0;
  if (totalMadness >= 10) {
    const madnessMultiplier = getMadnessProductionMultiplier(
      totalMadness,
      Boolean(state?.cruelMode),
    );
    baseProduction.forEach((prod) => {
      // Only reduce positive production (not consumption)
      if (prod.totalAmount > 0) {
        scale(prod, "madness", (n) => Math.ceil(n * madnessMultiplier));
      }
    });
  }

  // Apply mining boost multiplier if active (for mining jobs only) - temporary, inactive during sleep
  const miningBoostState = state.miningBoostState;
  const isMiningJob = jobId.endsWith("_miner");

  if (
    !excludeTemporary &&
    isMiningJob &&
    miningBoostState?.isActive &&
    miningBoostState.endTime > Date.now()
  ) {
    baseProduction.forEach((prod) => {
      scale(prod, "miningBoost", (n) => Math.ceil(n * 2));
    });
  }

  // Staring deer: doubles food production while active - temporary, inactive during sleep
  const staringDeerState = state.staringDeerState;
  if (
    !excludeTemporary &&
    staringDeerState?.isActive &&
    staringDeerState.endTime > Date.now()
  ) {
    baseProduction.forEach((prod) => {
      if (prod.resource === "food" && prod.totalAmount > 0) {
        scale(prod, "staringDeer", (n) => Math.ceil(n * 2));
      }
    });
  }

  // Forest fear: -25% hunter/gatherer production while active - temporary, inactive during sleep
  const forestFearState = state.forestFearState;
  if (
    !excludeTemporary &&
    (jobId === "hunter" || jobId === "gatherer") &&
    forestFearState?.isActive &&
    forestFearState.endTime > Date.now()
  ) {
    baseProduction.forEach((prod) => {
      if (prod.totalAmount > 0) {
        scale(prod, "forestFear", (n) => Math.ceil(n * 0.75));
      }
    });
  }

  // Hunter job bonuses (skills, tools)
  if (state && jobId === "hunter") {
    const huntingSkillLevel = state.huntingSkills?.level || 0;
    const skillBonus = HUNTING_SKILL_BONUSES[huntingSkillLevel];

    const addFlat = (
      prod: { resource: string; totalAmount: number },
      sourceId: string,
      perWorker: number,
    ) => {
      if (!perWorker) return;
      const delta = perWorker * count;
      prod.totalAmount += delta;
      note(prod.resource, sourceId, delta);
    };

    baseProduction.forEach((prod) => {
      if (prod.resource === "food" && prod.baseAmount > 0) {
        addFlat(prod, "huntressTraining", skillBonus.food);
        if (state.blessings?.sharp_aim) addFlat(prod, "sharp_aim", 5);
        if (state.blessings?.trail_sense) addFlat(prod, "trail_sense", 3);
        if (state.blessings?.fishers_hand) addFlat(prod, "fishers_hand", 5);
      }
      if (prod.resource === "fur" && prod.baseAmount > 0) {
        addFlat(prod, "huntressTraining", skillBonus.fur);
      }
      if (prod.resource === "bones" && prod.baseAmount > 0) {
        addFlat(prod, "huntressTraining", skillBonus.bones);
      }
    });

    if (state.tools?.bone_saw) {
      baseProduction.forEach((prod) => {
        if (prod.resource === "fur" || prod.resource === "bones") {
          addFlat(prod, "bone_saw", 1);
        }
      });
    }

    if (state.weapons?.manhunter_bow) {
      baseProduction.forEach((prod) => {
        if (prod.resource === "food" && prod.baseAmount > 0) {
          addFlat(prod, "manhunter_bow", 1);
        }
      });
    }
  }

  // Apply Flame's Touch, Brimstone Infusion, and timed brimstone flux to steel
  if (state && jobId === "steel_forger") {
    baseProduction.forEach((prod) => {
      if (prod.resource === "steel" && prod.baseAmount > 0) {
        const addSteel = (sourceId: string, perWorker: number) => {
          const delta = perWorker * count;
          prod.totalAmount += delta;
          note(prod.resource, sourceId, delta);
        };
        if (state.blessings?.flames_touch_enhanced) {
          addSteel("flames_touch_enhanced", 3);
        } else if (state.blessings?.flames_touch) {
          addSteel("flames_touch", 1);
        }
        if (state.blessings?.brimstone_infusion) {
          addSteel("brimstone_infusion", 1);
        }
        const flux = state.brimstoneFluxState;
        if (
          !excludeTemporary &&
          flux?.isActive &&
          (flux.endTime ?? 0) > Date.now()
        ) {
          addSteel("brimstoneFlux", BRIMSTONE_FLUX_STEEL_BONUS);
        }
      }
    });
  }

  // Feast multipliers - temporary, inactive during sleep
  if (!excludeTemporary) {
    if (isGreatFeast) {
      const greatFeastMultiplier =
        greatFeastState.productionMultiplier ?? 5;
      baseProduction.forEach((prod) => {
        scale(prod, "greatVillageFeast", (n) =>
          Math.ceil(n * greatFeastMultiplier),
        );
      });
    } else if (isFeast) {
      baseProduction.forEach((prod) => {
        scale(prod, "villageFeast", (n) => Math.ceil(n * 2.0));
      });
    }

    // Solstice Gathering: +10% village production (positive output only) while active
    const solsticeState = state?.solsticeState;
    if (
      solsticeState?.isActive &&
      solsticeState.endTime > Date.now()
    ) {
      baseProduction.forEach((prod) => {
        if (prod.totalAmount > 0) {
          // +10% with integer amounts: ceil(n * 1.1) === floor((11n + 9) / 10); avoids float error (e.g. 50 * 1.1).
          scale(prod, "solsticeGathering", (n) => Math.floor((n * 11 + 9) / 10));
        }
      });
    }
  }

  // Heartfire multiplier — temporary, inactive during sleep
  const heartfireLevel = state.heartfireState?.level || 0;
  if (!excludeTemporary && heartfireLevel > 0) {
    const ebonGrace = Boolean(state.blessings?.ebon_grace);
    const perLevel = ebonGrace ? 0.1 : 0.05;
    const heartfireBonus = 1 + heartfireLevel * perLevel;
    baseProduction.forEach((prod) => {
      // Only apply to positive production (don't increase consumption)
      if (prod.totalAmount > 0) {
        const before = prod.totalAmount;
        prod.totalAmount = Math.ceil(before * heartfireBonus);
        if (ebonGrace) {
          const heartfireOnly = Math.ceil(before * (1 + heartfireLevel * 0.05));
          note(prod.resource, "heartfire", heartfireOnly - before);
          note(prod.resource, "ebon_grace", prod.totalAmount - heartfireOnly);
        } else {
          note(prod.resource, "heartfire", prod.totalAmount - before);
        }
      }
    });
  }

  // Chainmaster skill: permanent villager production bonus
  const productionBonus = getChainmasterProductionBonus(state ?? {});
  if (productionBonus > 0) {
    const bonusPercent = Math.round(productionBonus * 100);
    baseProduction.forEach((prod) => {
      if (prod.totalAmount > 0) {
        scale(prod, "book_of_chainmaster", (n) =>
          Math.floor((n * (100 + bonusPercent) + 99) / 100),
        );
      }
    });
  }

  if (jobId === "scholar" && state) {
    const perWorker = getScholarInsightPerWorker(state);
    const sourceId = scholarInsightSourceId(state);
    baseProduction.forEach((prod) => {
      if (prod.resource === "insight") {
        prod.baseAmount = perWorker;
        prod.totalAmount = perWorker * count;
        replaceCompositionResource(
          composition,
          prod.resource,
          sourceId,
          prod.totalAmount,
        );
      }
    });
  }

  // Apply 9x multiplier in dev mode
  if (state && state.devMode) {
    baseProduction.forEach((prod) => {
      scale(prod, "devMode", (n) => n * 9);
    });
  }

  if (canCache && state) {
    const key = populationProductionCacheKey(jobId, count, excludeTemporary);
    let bucket = populationProductionCache.get(state);
    if (!bucket) {
      bucket = new Map();
      populationProductionCache.set(state, bucket);
    }
    bucket.set(key, baseProduction);
    return copyPopulationProduction(baseProduction);
  }

  return baseProduction;
};

/**
 * Full village headcount for housing cap, stranger arrivals, and economy-wide totals
 * (e.g. base food/wood). Includes villagers on expeditions — they still count against max
 * population while away.
 */
/** Sum of all `expeditionVillagers` values (includes stale cloud-merge ghosts). */
export function getExpeditionVillagerCount(
  state: Pick<GameState, "expeditionVillagers">,
): number {
  return Object.values(state.expeditionVillagers ?? {}).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
}

/**
 * Expedition headcount that still has a matching in-flight execution (not overdue).
 * Stale expedition keys (e.g. from cloud JSONB deep-merge never deleting completed
 * actions) must not inflate population.
 */
export function getActiveExpeditionVillagerCount(
  state: Pick<
    GameState,
    "expeditionVillagers" | "executionStartTimes" | "executionDurations"
  >,
  now = Date.now(),
): number {
  const starts = state.executionStartTimes ?? {};
  const durations = state.executionDurations ?? {};
  return Object.entries(state.expeditionVillagers ?? {}).reduce(
    (sum, [actionId, count]) => {
      if (!(count > 0)) return sum;
      const startTime = starts[actionId];
      const durationSec = durations[actionId];
      if (
        typeof startTime !== "number" ||
        typeof durationSec !== "number" ||
        durationSec <= 0
      ) {
        return sum;
      }
      if ((now - startTime) / 1000 >= durationSec) {
        return sum;
      }
      return sum + count;
    },
    0,
  );
}

export function getCurrentPopulation(
  state: Pick<
    GameState,
    "villagers" | "expeditionVillagers" | "executionStartTimes" | "executionDurations"
  >,
  now = Date.now(),
): number {
  return (
    getVillagersInVillage(state) + getActiveExpeditionVillagerCount(state, now)
  );
}

/**
 * Villagers present in job/free counts only. Excludes those on expeditions — they cannot be
 * sacrificed or killed by attack waves and similar events until they return.
 */
export function getVillagersInVillage(
  state: Pick<GameState, "villagers">,
): number {
  return Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
}

/** Food consumed per 15s cycle for all Disgraced Prior assignments (0 if not applicable). */
export function getDisgracedPriorFoodUpkeepPerCycle(
  state: Pick<GameState, "fellowship" | "priorAssignedActions">,
): number {
  if (!state.fellowship?.disgraced_prior) return 0;
  const n = state.priorAssignedActions?.length ?? 0;
  return n * DISGRACED_PRIOR_FOOD_PER_ASSIGNED_ACTION_PER_CYCLE;
}

/** Matches accumulatePopulationSurvival / handleStarvationCheck in loop.ts. */
export function isVillagerFoodUpkeepActive(
  state: Pick<GameState, "story">,
): boolean {
  return !!state.story?.seen?.hasHunted;
}

/** Matches accumulatePopulationSurvival in loop.ts. */
export function isVillagerWoodUpkeepActive(
  state: Pick<GameState, "story">,
): boolean {
  return !!state.story?.seen?.hasHunted;
}

/** Base food/wood upkeep line in resource-flow tooltips (1 per villager). */
export const VILLAGER_UPKEEP_SOURCE_ID = "villagers";
/** Disgraced Prior food upkeep line in resource-flow tooltips. */
export const DISGRACED_PRIOR_SOURCE_ID = "disgraced_prior";

export type PopulationResourceFlowLine = {
  sourceId: string;
  resource: string;
  amount: number;
};

/** Job ids that currently have at least one assigned villager. */
export function getAssignedPopulationJobIds(state: GameState): string[] {
  return Object.keys(populationJobs).filter(
    (id) => (state.villagers[id as keyof GameState["villagers"]] ?? 0) > 0,
  );
}

function pushFlowLine(
  lines: PopulationResourceFlowLine[],
  sourceId: string,
  resource: string,
  amount: number,
): void {
  if (amount === 0) return;
  lines.push({ sourceId, resource, amount });
}

/**
 * Per-source village production and consumption for one cycle.
 * Villager upkeep first, then Prior, then job lines (definition order).
 */
export function getPopulationResourceFlows(
  state: GameState,
  visibleJobIds: string[],
  options?: GetPopulationProductionOptions,
): PopulationResourceFlowLine[] {
  const lines: PopulationResourceFlowLine[] = [];

  const totalPopulation = getCurrentPopulation(state);
  if (totalPopulation > 0) {
    if (isVillagerWoodUpkeepActive(state)) {
      pushFlowLine(lines, VILLAGER_UPKEEP_SOURCE_ID, "wood", -totalPopulation);
    }
    if (isVillagerFoodUpkeepActive(state)) {
      pushFlowLine(lines, VILLAGER_UPKEEP_SOURCE_ID, "food", -totalPopulation);
    }
  }

  const excludeTemporaryBonuses = options?.excludeTemporaryBonuses ?? false;
  if (!excludeTemporaryBonuses) {
    const priorUpkeep = getDisgracedPriorFoodUpkeepPerCycle(state);
    if (priorUpkeep > 0) {
      pushFlowLine(lines, DISGRACED_PRIOR_SOURCE_ID, "food", -priorUpkeep);
    }
  }

  const jobIdsInOrder = Object.keys(populationJobs).filter((jobId) =>
    visibleJobIds.includes(jobId),
  );
  for (const jobId of jobIdsInOrder) {
    const currentCount =
      state.villagers[jobId as keyof typeof state.villagers] || 0;
    if (currentCount <= 0) continue;
    const production = getPopulationProduction(
      jobId,
      currentCount,
      state,
      options,
    );
    for (const prod of production) {
      pushFlowLine(lines, jobId, prod.resource, prod.totalAmount);
    }
  }

  return lines;
}

/** Job/upkeep lines that touch one resource (side-panel tooltip). */
export function getResourceProductionBreakdown(
  state: GameState,
  resource: string,
  options?: GetPopulationProductionOptions,
): Array<{ sourceId: string; amount: number }> {
  return getPopulationResourceFlows(
    state,
    getAssignedPopulationJobIds(state),
    options,
  )
    .filter((line) => line.resource === resource)
    .map(({ sourceId, amount }) => ({ sourceId, amount }));
}

export function hasResourceProductionBreakdown(
  state: GameState,
  resource: string,
): boolean {
  return getResourceProductionBreakdown(state, resource).length > 0;
}

export const getTotalPopulationEffects = (
  state: GameState,
  visibleJobIds: string[],
  options?: GetPopulationProductionOptions,
): Record<string, number> => {
  const totalEffects: Record<string, number> = {};
  for (const line of getPopulationResourceFlows(state, visibleJobIds, options)) {
    totalEffects[line.resource] = (totalEffects[line.resource] || 0) + line.amount;
  }
  return totalEffects;
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
  const furTentsCapacity = (state.buildings.furTents || 0) * 4;

  // Temple dedication bonuses
  let templeBonus = 0;
  if (state.blessings?.flames_touch) {
    templeBonus = 4;
  } else if (state.blessings?.flames_touch_enhanced) {
    templeBonus = 8;
  }

  const blackEstateCapacity = (state.buildings.blackEstate || 0) * 10;

  return (
    woodenHutCapacity +
    stoneHutCapacity +
    longhouseCapacity +
    furTentsCapacity +
    templeBonus +
    blackEstateCapacity
  );
}

// Alias for backward compatibility
export const calculateMaxPopulation = getMaxPopulation;
