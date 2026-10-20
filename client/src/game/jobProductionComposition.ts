import type { GameState } from "@shared/schema";
import {
  getPopulationProduction,
  type GetPopulationProductionOptions,
  type JobProductionCompositionLine,
} from "@/game/population";
import {
  bookEffects,
  clothingEffects,
  toolEffects,
  weaponEffects,
} from "@/game/rules/effects";
import { getBuildingDisplayName } from "@/game/rules/buildingTooltipSections";
import { getEffectName, tWithFallback } from "@/i18n/resolveGameText";
import { getUiTooltip } from "@/i18n/tooltipLabels";

export type { JobProductionCompositionLine };

const TOOLTIP_SOURCES: Record<string, { key: string; fallback: string }> = {
  base: { key: "productionBase", fallback: "Base" },
  devMode: { key: "devMode", fallback: "Dev mode" },
  witchsCurse: { key: "witchsCurse", fallback: "Witch's Curse" },
  frostfall: { key: "frostfall", fallback: "Frostfall" },
  chokingFog: { key: "chokingFog", fallback: "Choking Fog" },
  villagerDisgust: { key: "villagerDisgust", fallback: "Villager Disgust" },
  madness: { key: "madnessTitle", fallback: "Madness" },
  miningBoost: { key: "miningBoost", fallback: "Mining Boost" },
  staringDeer: { key: "staringDeer", fallback: "Staring Deer" },
  forestFear: { key: "forestFear", fallback: "Forest Fear" },
  greatVillageFeast: { key: "greatVillageFeast", fallback: "Great Village Feast" },
  villageFeast: { key: "villageFeast", fallback: "Village Feast" },
  solsticeGathering: { key: "solsticeGathering", fallback: "Solstice Gathering" },
  heartfire: { key: "heartfire", fallback: "Heartfire" },
  brimstoneFlux: { key: "brimstoneFlux", fallback: "Brimstone Flux" },
};

export type JobProductionResourceComposition = {
  resource: string;
  total: number;
  lines: JobProductionCompositionLine[];
};

/**
 * Per-source breakdown of one job's cycle production.
 * Amounts are totals for `count` workers and sum to getPopulationProduction.
 */
export function getJobProductionComposition(
  jobId: string,
  count: number,
  state?: GameState,
  options?: Omit<GetPopulationProductionOptions, "composition">,
): JobProductionCompositionLine[] {
  const lines: JobProductionCompositionLine[] = [];
  getPopulationProduction(jobId, count, state, {
    ...options,
    composition: lines,
  });
  return lines;
}

/** Group flat deltas by resource, keeping application order inside each resource. */
export function groupJobProductionComposition(
  lines: readonly JobProductionCompositionLine[],
): JobProductionResourceComposition[] {
  const order: string[] = [];
  const byResource = new Map<string, JobProductionCompositionLine[]>();
  for (const line of lines) {
    let bucket = byResource.get(line.resource);
    if (!bucket) {
      bucket = [];
      byResource.set(line.resource, bucket);
      order.push(line.resource);
    }
    bucket.push(line);
  }
  return order.map((resource) => {
    const resourceLines = byResource.get(resource) ?? [];
    const total = resourceLines.reduce((sum, line) => sum + line.amount, 0);
    return { resource, total, lines: resourceLines };
  });
}

export function getJobProductionSourceLabel(sourceId: string): string {
  const tooltip = TOOLTIP_SOURCES[sourceId];
  if (tooltip) return getUiTooltip(tooltip.key, tooltip.fallback);
  if (sourceId === "huntressTraining") {
    return tWithFallback("ui", "estate.huntressTraining", "Huntress Training");
  }
  if (bookEffects[sourceId]) {
    return getEffectName("books", sourceId, bookEffects[sourceId].name);
  }
  if (toolEffects[sourceId]) {
    return getEffectName("tools", sourceId, toolEffects[sourceId].name);
  }
  if (weaponEffects[sourceId]) {
    return getEffectName("weapons", sourceId, weaponEffects[sourceId].name);
  }
  if (clothingEffects[sourceId]) {
    return getEffectName("clothing", sourceId, clothingEffects[sourceId].name);
  }
  return getBuildingDisplayName(sourceId);
}
