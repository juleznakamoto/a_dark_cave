import i18n from "i18next";
import type { GameState } from "@shared/schema";
import type { EventChoice } from "@/game/rules/events";
import { getVillagersInVillage } from "@/game/population";
import { getResourceName } from "@/i18n/resolveGameText";
import { resolveEventChoiceCost } from "@/i18n/eventText";
import { getUiTooltip } from "@/i18n/tooltipLabels";

type TranslateOptions = Record<string, string | number | boolean | undefined>;

export type EventResourceCost = {
  resource: string;
  amount: number;
};

export type EventChoiceAffordance = {
  canAfford: boolean;
  costs: EventResourceCost[];
  individualAffordance: Record<string, boolean>;
};

function eventCatalogKey(catalogId: string, suffix: string): string {
  return `${catalogId}.${suffix}`;
}

export function parseFormattedCostAmount(
  value: string | number | boolean | undefined,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseInt(value.replace(/'/g, ""), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function i18nCostVarToResourceKey(
  varName: string,
  resources: GameState["resources"],
): string | null {
  if (!varName.endsWith("Cost")) return null;

  const base = varName.slice(0, -4).toLowerCase();
  const candidates = [base, `${base}s`];

  for (const candidate of candidates) {
    if (candidate in resources) {
      return candidate;
    }
  }

  return null;
}

function resolveResourceKeyFromDisplayName(
  displayName: string,
  resources: GameState["resources"],
): string | null {
  const normalized = displayName.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized in resources) {
    return normalized;
  }

  for (const key of Object.keys(resources)) {
    if (key.toLowerCase() === normalized) {
      return key;
    }

    const localized = getResourceName(key, key).trim().toLowerCase();
    if (localized === displayName.trim().toLowerCase()) {
      return key;
    }
  }

  return null;
}

function getCatalogCostTemplate(
  catalogId: string,
  choiceId: string,
): string | null {
  const key = eventCatalogKey(catalogId, `choices.${choiceId}.cost`);
  const fullKey = `events:${key}`;
  if (!i18n.exists(fullKey)) {
    return null;
  }

  const template = i18n.getResource(i18n.language, "events", key);
  return typeof template === "string" ? template : null;
}

export function getResourceCostsFromCatalogTemplate(
  catalogId: string,
  choiceId: string,
  vars: TranslateOptions | undefined,
  resources: GameState["resources"],
): EventResourceCost[] {
  const template = getCatalogCostTemplate(catalogId, choiceId);
  if (!template) {
    return [];
  }

  const costs: EventResourceCost[] = [];
  const varMatches = template.matchAll(/\{\{(\w+)\}\}/g);

  for (const match of varMatches) {
    const varName = match[1];
    const resource = i18nCostVarToResourceKey(varName, resources);
    const amount = parseFormattedCostAmount(vars?.[varName]);
    if (resource && amount !== null) {
      costs.push({ resource, amount });
    }
  }

  if (costs.length > 0) {
    return costs;
  }

  return parseResourceCostsFromDisplayText(template, resources);
}

export function parseResourceCostsFromDisplayText(
  costText: string,
  resources: GameState["resources"],
): EventResourceCost[] {
  const costs: EventResourceCost[] = [];

  for (const part of costText.split(",")) {
    const trimmedPart = part.trim();
    const match = trimmedPart.match(/([\d']+)\s+(.+)$/);
    if (!match) continue;

    const amount = parseFormattedCostAmount(match[1]);
    const resource = resolveResourceKeyFromDisplayName(match[2], resources);
    if (resource && amount !== null) {
      costs.push({ resource, amount });
    }
  }

  return costs;
}

export function parseVillagerCostFromDisplayText(costText: string): number | null {
  const match = costText.trim().match(/^([\d']+)\s+Villagers?$/i);
  if (!match) return null;
  return parseFormattedCostAmount(match[1]);
}

export function getFreeVillagerCount(state: GameState): number {
  return state.villagers?.free ?? 0;
}

export function eventChoiceUsesTotalVillagerCost(
  catalogId?: string,
  choiceId?: string,
): boolean {
  return catalogId === "bloodMoonAttack" && choiceId === "sacrificeVillagers";
}

function buildVillagerAffordance(
  amount: number,
  state: GameState,
  options?: { useTotalInVillage?: boolean },
): EventChoiceAffordance {
  const useTotalInVillage = options?.useTotalInVillage ?? false;
  const available = useTotalInVillage
    ? getVillagersInVillage(state)
    : getFreeVillagerCount(state);
  const hasEnough = available >= amount;
  return {
    canAfford: hasEnough,
    costs: [],
    individualAffordance: { villagers: hasEnough },
  };
}

export function resolveEventVillagerCostAmount(
  cost: string | ((state: GameState) => string) | undefined,
  state: GameState,
  options?: {
    catalogId?: string;
    choiceId?: string;
    vars?: TranslateOptions;
  },
): number | null {
  if (
    eventChoiceUsesTotalVillagerCost(options?.catalogId, options?.choiceId) &&
    options?.vars
  ) {
    const fromVars = parseFormattedCostAmount(options.vars.sacrificeAmount);
    if (fromVars !== null) {
      return fromVars;
    }
  }

  if (options?.catalogId && options?.choiceId) {
    const resolvedCatalogCost = resolveEventChoiceCost(
      options.catalogId,
      options.choiceId,
      undefined,
      options.vars,
    );
    if (resolvedCatalogCost) {
      const fromCatalog = parseVillagerCostFromDisplayText(resolvedCatalogCost);
      if (fromCatalog !== null) {
        return fromCatalog;
      }
    }
  }

  if (!cost) return null;

  const costText = typeof cost === "function" ? cost(state) : cost;
  if (!costText || typeof costText !== "string") return null;

  return parseVillagerCostFromDisplayText(costText);
}

/** Tooltip rows for event choices that cost villagers. */
export function getEventVillagerCostTooltipRows(
  costAmount: number,
  state: GameState,
  options?: { useTotalInVillage?: boolean },
): Array<{ text: string; satisfied: boolean }> {
  const useTotalInVillage = options?.useTotalInVillage ?? false;
  const available = useTotalInVillage
    ? getVillagersInVillage(state)
    : getFreeVillagerCount(state);
  const canAfford = available >= costAmount;
  const tooltipKey = useTotalInVillage ? "villagerCost" : "freeVillagerCost";
  return [
    {
      text: getUiTooltip(
        tooltipKey,
        costAmount === 1
          ? "-{{count}} Villager"
          : "-{{count}} Villagers",
        { count: costAmount },
      ),
      satisfied: canAfford,
    },
  ];
}

function buildAffordanceFromCosts(
  costs: EventResourceCost[],
  resources: GameState["resources"],
): EventChoiceAffordance {
  const individualAffordance: Record<string, boolean> = {};
  let canAfford = true;

  for (const { resource, amount } of costs) {
    const currentAmount = resources[resource as keyof typeof resources] ?? 0;
    const hasEnough = currentAmount >= amount;
    individualAffordance[resource] = hasEnough;
    if (!hasEnough) {
      canAfford = false;
    }
  }

  return { canAfford, costs, individualAffordance };
}

type AffordanceChoice = EventChoice & {
  sellResource?: string;
  sellAmount?: number;
};

/** True when the choice spends resources or free villagers (not a free decline/refuse). */
export function eventChoiceHasBlockingCost(
  choice: AffordanceChoice,
  state: GameState,
  options?: {
    catalogId?: string;
    vars?: TranslateOptions;
  },
): boolean {
  const affordance = getEventChoiceAffordance(choice, state, options);
  if (affordance.costs.length > 0) return true;
  if ("villagers" in affordance.individualAffordance) return true;

  const cost = choice.cost;
  if (!cost) return false;

  const costText = typeof cost === "function" ? cost(state) : cost;
  if (!costText) return false;

  return (
    parseResourceCostsFromDisplayText(costText, state.resources).length > 0 ||
    parseVillagerCostFromDisplayText(costText) !== null
  );
}

export function getEventChoiceAffordance(
  choice: AffordanceChoice,
  state: GameState,
  options?: {
    catalogId?: string;
    vars?: TranslateOptions;
  },
): EventChoiceAffordance {
  if (choice.sellResource && choice.sellAmount !== undefined) {
    return buildAffordanceFromCosts(
      [{ resource: choice.sellResource, amount: choice.sellAmount }],
      state.resources,
    );
  }

  if (options?.catalogId) {
    const villagerCost = resolveEventVillagerCostAmount(choice.cost, state, {
      catalogId: options.catalogId,
      choiceId: choice.id,
      vars: options.vars,
    });
    if (villagerCost !== null) {
      return buildVillagerAffordance(villagerCost, state, {
        useTotalInVillage: eventChoiceUsesTotalVillagerCost(
          options.catalogId,
          choice.id,
        ),
      });
    }

    const catalogCosts = getResourceCostsFromCatalogTemplate(
      options.catalogId,
      choice.id,
      options.vars,
      state.resources,
    );
    if (catalogCosts.length > 0) {
      return buildAffordanceFromCosts(catalogCosts, state.resources);
    }
  }

  const cost = choice.cost;
  if (!cost) {
    const villagerCost = resolveEventVillagerCostAmount(undefined, state, {
      catalogId: options?.catalogId,
      choiceId: choice.id,
      vars: options?.vars,
    });
    if (villagerCost !== null) {
      return buildVillagerAffordance(villagerCost, state, {
        useTotalInVillage: eventChoiceUsesTotalVillagerCost(
          options?.catalogId,
          choice.id,
        ),
      });
    }
    return { canAfford: true, costs: [], individualAffordance: {} };
  }

  const costText = typeof cost === "function" ? cost(state) : cost;
  if (!costText) {
    return { canAfford: true, costs: [], individualAffordance: {} };
  }

  const parsedCosts = parseResourceCostsFromDisplayText(costText, state.resources);
  if (parsedCosts.length > 0) {
    return buildAffordanceFromCosts(parsedCosts, state.resources);
  }

  const villagerCost = parseVillagerCostFromDisplayText(costText);
  if (villagerCost !== null) {
    return buildVillagerAffordance(villagerCost, state, {
      useTotalInVillage: eventChoiceUsesTotalVillagerCost(
        options?.catalogId,
        choice.id,
      ),
    });
  }

  return { canAfford: true, costs: [], individualAffordance: {} };
}
