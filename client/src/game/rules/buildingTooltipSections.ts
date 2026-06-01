import type { Action } from "@shared/schema";
import type { GameState } from "@shared/schema";
import { capitalizeWords } from "@/lib/utils";
import {
  formatTooltipResourceName,
  formatTooltipStatName,
  getUiTooltip,
  resolveBuildingTooltipEffect,
} from "@/i18n/tooltipLabels";
import type { BuildingTooltipEffect } from "./buildingTooltipEffects";
import { villageBuildActions } from "./villageBuildActions";

export type TooltipEffectEntry = string | BuildingTooltipEffect;

export type LeveledEffectSection = {
  level: number;
  effects: string[];
};

export type BuildingTooltipSnapshot = {
  current: string[];
  levelSections: LeveledEffectSection[];
};

export function buildingKeyToActionId(buildingKey: string): string {
  return `build${buildingKey.charAt(0).toUpperCase()}${buildingKey.slice(1)}`;
}

export function getBuildingTooltipEffectEntries(
  buildAction: Action,
  gameState: GameState,
): TooltipEffectEntry[] {
  const tooltipEffects = buildAction.tooltipEffects;
  const effectsArray =
    typeof tooltipEffects === "function"
      ? tooltipEffects(gameState)
      : tooltipEffects;
  if (effectsArray && effectsArray.length > 0) {
    return effectsArray;
  }

  const entries: TooltipEffectEntry[] = [];

  if (buildAction.statsEffects) {
    Object.entries(buildAction.statsEffects).forEach(([stat, statValue]) => {
      entries.push({
        key: `__stat__${stat}`,
        fallback: "{{sign}}{{value}} {{stat}}",
        options: {
          sign: statValue > 0 ? "+" : "",
          value: statValue,
          stat: formatTooltipStatName(stat),
        },
      });
    });
  }

  if (buildAction.productionEffects) {
    const productionEffects =
      typeof buildAction.productionEffects === "function"
        ? buildAction.productionEffects(gameState)
        : buildAction.productionEffects;

    Object.entries(productionEffects).forEach(([jobType, production]) => {
      Object.entries(production).forEach(([resource, amount]) => {
        entries.push({
          key: `__production__${jobType}__${resource}`,
          fallback: "+{{amount}} {{resource}} ({{job}})",
          options: {
            amount,
            resource: formatTooltipResourceName(resource),
            job: capitalizeWords(jobType),
          },
        });
      });
    });
  }

  return entries;
}

function resolveTooltipEffectEntry(
  entry: TooltipEffectEntry,
  isDamaged: boolean,
): string {
  if (typeof entry === "string") return entry;

  let options = entry.options;
  if (isDamaged) {
    if (typeof options?.amount === "number") {
      options = {
        ...options,
        amount: Math.floor(options.amount * 0.5),
      };
    } else if (typeof options?.value === "number") {
      options = {
        ...options,
        value: Math.floor(options.value * 0.5),
      };
    }
  }

  if (entry.key.startsWith("__stat__")) {
    return getUiTooltip("statBonus", "{{sign}}{{value}} {{stat}}", options);
  }
  if (entry.key.startsWith("__production__")) {
    return getUiTooltip(
      "productionBonusLine",
      "+{{amount}} {{resource}} ({{job}})",
      options,
    );
  }
  return resolveBuildingTooltipEffect(
    options === entry.options ? entry : { ...entry, options },
  );
}

export function tooltipEffectEntryKey(entry: TooltipEffectEntry): string {
  if (typeof entry === "string") return `str:${entry}`;
  return `fx:${entry.key}`;
}

export function resolveTooltipEffectEntryForLevelSection(
  entry: TooltipEffectEntry,
  isDamaged: boolean,
): string {
  if (typeof entry !== "string" && entry.key === "resourceLimit") {
    return getUiTooltip(
      "buildings.resourceLimitTier",
      "Resource Limit: {{limit}}",
      entry.options,
    );
  }
  return resolveTooltipEffectEntry(entry, isDamaged);
}

/**
 * Level 1: full tier effects. Level 2+: only new or changed lines vs the previous
 * tier (absolute values for numeric stats — not deltas).
 */
export function getLevelSectionEffectLines(
  prevEntries: TooltipEffectEntry[] | null,
  currEntries: TooltipEffectEntry[],
  isDamaged: boolean,
): string[] {
  if (!prevEntries) {
    return currEntries.map((entry) =>
      resolveTooltipEffectEntryForLevelSection(entry, isDamaged),
    );
  }

  const prevByKey = new Map<string, TooltipEffectEntry>();
  for (const entry of prevEntries) {
    prevByKey.set(tooltipEffectEntryKey(entry), entry);
  }

  const lines: string[] = [];
  for (const curr of currEntries) {
    const prev = prevByKey.get(tooltipEffectEntryKey(curr));
    if (!prev) {
      lines.push(resolveTooltipEffectEntryForLevelSection(curr, isDamaged));
      continue;
    }

    if (typeof curr === "string" || typeof prev === "string") {
      if (curr !== prev) {
        lines.push(
          typeof curr === "string"
            ? curr
            : resolveTooltipEffectEntryForLevelSection(curr, isDamaged),
        );
      }
      continue;
    }

    const currLine = resolveTooltipEffectEntryForLevelSection(curr, isDamaged);
    const prevLine = resolveTooltipEffectEntryForLevelSection(prev, isDamaged);
    if (currLine !== prevLine) {
      lines.push(currLine);
    }
  }

  return lines;
}

export function getBuildingTooltipEffectLines(
  buildAction: Action,
  gameState: GameState,
  isDamaged: boolean,
): string[] {
  return getBuildingTooltipEffectEntries(buildAction, gameState).map((entry) =>
    resolveTooltipEffectEntry(entry, isDamaged),
  );
}

export function getUpgradeChainLevelEffectSections(
  chain: string[],
  itemId: string,
  gameState: GameState,
  isDamaged: boolean,
): LeveledEffectSection[] {
  const currentIndex = chain.indexOf(itemId);
  if (currentIndex < 0) return [];

  const sections: LeveledEffectSection[] = [];
  let prevEntries: TooltipEffectEntry[] | null = null;

  for (let index = 0; index <= currentIndex; index++) {
    const buildingKey = chain[index];
    const buildAction = villageBuildActions[buildingKeyToActionId(buildingKey)];
    if (!buildAction) continue;

    const tierDamaged = isDamaged && buildingKey === itemId;
    const entries = getBuildingTooltipEffectEntries(buildAction, gameState);
    const effects = getLevelSectionEffectLines(
      prevEntries,
      entries,
      tierDamaged,
    );
    prevEntries = entries;

    if (effects.length > 0) {
      sections.push({ level: index + 1, effects });
    }
  }

  if (sections.length <= 1) return [];

  return sections;
}

export function getUpgradeChainCurrentEffectLines(
  chain: string[],
  itemId: string,
  gameState: GameState,
  isDamaged: boolean,
): string[] {
  const currentIndex = chain.indexOf(itemId);
  const buildAction = villageBuildActions[buildingKeyToActionId(itemId)];
  if (!buildAction || currentIndex < 0) return [];

  const maxEntries = getBuildingTooltipEffectEntries(buildAction, gameState);
  const maxKeys = new Set(
    maxEntries
      .filter((e): e is BuildingTooltipEffect => typeof e !== "string")
      .map((e) => e.key),
  );

  const inherited: string[] = [];
  const inheritedKeys = new Set<string>();

  for (let i = 0; i < currentIndex; i++) {
    const prevAction = villageBuildActions[buildingKeyToActionId(chain[i])];
    if (!prevAction) continue;

    for (const entry of getBuildingTooltipEffectEntries(prevAction, gameState)) {
      if (typeof entry === "string") continue;
      if (!entry.key.startsWith("unlocks")) continue;
      if (maxKeys.has(entry.key) || inheritedKeys.has(entry.key)) continue;
      // Earlier tiers are not damaged — only this tier can be. Inherited lines are
      // unlocks* only (no amount/value), so damage halving does not apply here.
      inherited.push(resolveTooltipEffectEntry(entry, false));
      inheritedKeys.add(entry.key);
    }
  }

  const current = getBuildingTooltipEffectLines(
    buildAction,
    gameState,
    isDamaged,
  );
  return [...inherited, ...current];
}

export function getBuildingTooltipSnapshot(
  itemId: string,
  chain: string[],
  gameState: GameState,
  isDamaged = false,
): BuildingTooltipSnapshot {
  const buildAction = villageBuildActions[buildingKeyToActionId(itemId)];
  if (!buildAction) {
    return { current: [], levelSections: [] };
  }

  return {
    current: getUpgradeChainCurrentEffectLines(
      chain,
      itemId,
      gameState,
      isDamaged,
    ),
    levelSections: getUpgradeChainLevelEffectSections(
      chain,
      itemId,
      gameState,
      isDamaged,
    ),
  };
}
