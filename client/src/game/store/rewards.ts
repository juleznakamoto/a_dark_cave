import { GameState } from "@shared/schema";
import { gameEvents, type LogEntry } from "@/game/rules/events";
import {
  isI18nReturnedObjectError,
  resolveEventTitle,
} from "@/i18n/eventText";
import { tWithFallback } from "@/i18n/resolveGameText";

export function getClarityElixirCaveEventId(entry: LogEntry): string | null {
  const eventId = entry.eventId || entry.id.split("-")[0];
  return eventId.startsWith("clarityElixirCaveFound") ? eventId : null;
}

export function getCaveWallMarkingsEventId(entry: LogEntry): string | null {
  const eventId = entry.eventId || entry.id.split("-")[0];
  return eventId.startsWith("caveWallMarkings") ? eventId : null;
}

const REWARD_UI_HIDDEN_STATS = new Set<string>([
  "villagerDeathsLifetime",
  "madness",
  "madnessFromEvents",
]);

// Helper function to detect rewards from state updates
export const detectRewards = (
  stateUpdates: Partial<GameState>,
  currentState: GameState,
  actionId: string,
  options?: { trackLosses?: boolean }
) => {
  const trackLosses = options?.trackLosses ?? rewardDialogVillageAttackEvents.has(actionId);
  const rewards: {
    resources?: Partial<Record<keyof GameState["resources"], number>>;
    resourceLosses?: Partial<Record<keyof GameState["resources"], number>>;
    villagersLost?: number;
    populationGained?: number;
    tools?: (keyof GameState["tools"])[];
    weapons?: (keyof GameState["weapons"])[];
    clothing?: (keyof GameState["clothing"])[];
    clothingLost?: (keyof GameState["clothing"])[];
    relics?: (keyof GameState["relics"])[];
    relicsLost?: (keyof GameState["relics"])[];
    blessings?: (keyof GameState["blessings"])[];
    books?: (keyof GameState["books"])[];
    schematics?: (keyof GameState["schematics"])[];
    fellowship?: (keyof GameState["fellowship"])[];
    stats?: Partial<GameState["stats"]>;
  } = {};

  // Check for new tools (items set to true that weren't owned before)
  if (stateUpdates.tools) {
    const newTools = Object.keys(stateUpdates.tools).filter(
      tool => stateUpdates.tools![tool as keyof typeof stateUpdates.tools] === true &&
        !currentState.tools[tool as keyof typeof currentState.tools]
    );
    if (newTools.length > 0) {
      rewards.tools = newTools as (keyof GameState["tools"])[];
    }
  }

  // Check for new weapons (items set to true that weren't owned before)
  if (stateUpdates.weapons) {
    const newWeapons = Object.keys(stateUpdates.weapons).filter(
      weapon => stateUpdates.weapons![weapon as keyof typeof stateUpdates.weapons] === true &&
        !currentState.weapons[weapon as keyof typeof currentState.weapons]
    );
    if (newWeapons.length > 0) {
      rewards.weapons = newWeapons as (keyof GameState["weapons"])[];
    }
  }

  // Check for new clothing (items set to true that weren't owned before)
  if (stateUpdates.clothing) {
    const newClothing = Object.keys(stateUpdates.clothing).filter(
      clothing => stateUpdates.clothing![clothing as keyof typeof stateUpdates.clothing] === true &&
        !currentState.clothing[clothing as keyof typeof currentState.clothing]
    );
    if (newClothing.length > 0) {
      rewards.clothing = newClothing as (keyof GameState["clothing"])[];
    }
    const lostClothing = Object.keys(stateUpdates.clothing).filter((id) => {
      if (stateUpdates.clothing![id as keyof typeof stateUpdates.clothing] !== false) {
        return false;
      }
      return Boolean(currentState.clothing[id as keyof typeof currentState.clothing]);
    });
    if (lostClothing.length > 0) {
      rewards.clothingLost = lostClothing as (keyof GameState["clothing"])[];
    }
  }

  // Check for new relics (items set to true that weren't owned before)
  if (stateUpdates.relics) {
    const newRelics = Object.keys(stateUpdates.relics).filter(
      relic => stateUpdates.relics![relic as keyof typeof stateUpdates.relics] === true &&
        !currentState.relics[relic as keyof typeof currentState.relics]
    );
    if (newRelics.length > 0) {
      rewards.relics = newRelics as (keyof GameState["relics"])[];
    }
    const lostRelics = Object.keys(stateUpdates.relics).filter((id) => {
      if (stateUpdates.relics![id as keyof typeof stateUpdates.relics] !== false) {
        return false;
      }
      return Boolean(currentState.relics[id as keyof typeof currentState.relics]);
    });
    if (lostRelics.length > 0) {
      rewards.relicsLost = lostRelics as (keyof GameState["relics"])[];
    }
  }

  // Check for new blessings (items set to true that weren't owned before)
  if (stateUpdates.blessings) {
    const newBlessings = Object.keys(stateUpdates.blessings).filter(
      blessing => stateUpdates.blessings![blessing as keyof typeof stateUpdates.blessings] === true &&
        !currentState.blessings[blessing as keyof typeof currentState.blessings]
    );
    if (newBlessings.length > 0) {
      rewards.blessings = newBlessings as (keyof GameState["blessings"])[];
    }
  }

  // Check for new books (items set to true that weren't owned before)
  if (stateUpdates.books) {
    const newBooks = Object.keys(stateUpdates.books).filter(
      book => stateUpdates.books![book as keyof typeof stateUpdates.books] === true &&
        !currentState.books[book as keyof typeof currentState.books]
    );
    if (newBooks.length > 0) {
      rewards.books = newBooks as (keyof GameState["books"])[];
    }
  }

  // Check for new schematics (items set to true that weren't owned before)
  if (stateUpdates.schematics) {
    const newSchematics = Object.keys(stateUpdates.schematics).filter(
      schematic => stateUpdates.schematics![schematic as keyof typeof stateUpdates.schematics] === true &&
        !currentState.schematics[schematic as keyof typeof currentState.schematics]
    );
    if (newSchematics.length > 0) {
      rewards.schematics = newSchematics as (keyof GameState["schematics"])[];
    }
  }

  // Check for new fellowship members (items set to true that weren't owned before)
  if (stateUpdates.fellowship) {
    const newMembers = Object.keys(stateUpdates.fellowship).filter(
      member => stateUpdates.fellowship![member as keyof typeof stateUpdates.fellowship] === true &&
        !currentState.fellowship[member as keyof typeof currentState.fellowship]
    );
    if (newMembers.length > 0) {
      rewards.fellowship = newMembers as (keyof GameState["fellowship"])[];
    }
  }

  // Check for increased resources (positive values in stateUpdates)
  if (stateUpdates.resources) {
    const rewardResources: Record<string, number> = {};
    const resourceLosses: Record<string, number> = {};
    const shouldTrackResourceLosses = trackLosses;

    Object.entries(stateUpdates.resources).forEach(([resource, finalAmount]) => {
      if (typeof finalAmount === 'number') {
        const originalAmount = currentState.resources[resource as keyof typeof currentState.resources] || 0;
        const delta = finalAmount - originalAmount;
        if (delta > 0) {
          rewardResources[resource] = delta;
        } else if (shouldTrackResourceLosses && delta < 0) {
          resourceLosses[resource] = Math.abs(delta);
        }
      }
    });

    if (Object.keys(rewardResources).length > 0) {
      rewards.resources = rewardResources as Partial<Record<keyof GameState["resources"], number>>;
    }
    if (Object.keys(resourceLosses).length > 0) {
      rewards.resourceLosses = resourceLosses as Partial<Record<keyof GameState["resources"], number>>;
    }
  }

  // Check for villager deaths (from killVillagers) when tracking losses
  if (trackLosses) {
    const villagersKilled = (stateUpdates as { villagersKilled?: number }).villagersKilled;
    if (typeof villagersKilled === "number" && villagersKilled > 0) {
      rewards.villagersLost = villagersKilled;
    }
  }

  // Check for population gain (villagers added)
  if (stateUpdates.villagers) {
    const currentTotal = Object.values(currentState.villagers || {}).reduce(
      (sum, count) => sum + (count || 0),
      0,
    );
    const mergedVillagers = { ...currentState.villagers, ...stateUpdates.villagers };
    const newTotal = Object.values(mergedVillagers).reduce(
      (sum, count) => sum + (count || 0),
      0,
    );
    const gained = newTotal - currentTotal;
    if (gained > 0) {
      rewards.populationGained = gained;
    }
  }

  // Check for increased stats (positive values in stateUpdates)
  if (stateUpdates.stats) {
    const rewardStats: Record<string, number> = {};
    Object.entries(stateUpdates.stats).forEach(([stat, finalAmount]) => {
      if (REWARD_UI_HIDDEN_STATS.has(stat)) {
        return;
      }
      if (typeof finalAmount === 'number') {
        const originalAmount = currentState.stats[stat as keyof typeof currentState.stats] || 0;
        const gained = finalAmount - originalAmount;
        if (gained > 0) {
          rewardStats[stat] = gained;
        }
      }
    });
    if (Object.keys(rewardStats).length > 0) {
      rewards.stats = rewardStats as Partial<GameState["stats"]>;
    }
  }

  return rewards;
};

/** True if a detectRewards payload includes any gain (not losses-only). Gates RewardDialog. */
export const rewardPayloadHasPositiveChanges = (
  rewards: ReturnType<typeof detectRewards>,
): boolean =>
  Object.entries(rewards).some(([key, value]) => {
    if (
      key === "resourceLosses" ||
      key === "villagersLost" ||
      key === "relicsLost" ||
      key === "clothingLost" ||
      !value
    ) {
      return false;
    }
    if (typeof value === "number" && value > 0) {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return typeof value === "object" && Object.keys(value).length > 0;
  });

/** True when the reward dialog should list losses (villagers, resources, etc.). Used with event outcomes that have no "gains" but still need the outcome dialog. */
export const rewardPayloadHasOutcomeLosses = (
  rewards: ReturnType<typeof detectRewards>,
): boolean => {
  if (typeof rewards.villagersLost === "number" && rewards.villagersLost > 0) {
    return true;
  }
  if (
    rewards.resourceLosses &&
    Object.keys(rewards.resourceLosses).length > 0
  ) {
    return true;
  }
  if (rewards.relicsLost && rewards.relicsLost.length > 0) {
    return true;
  }
  if (rewards.clothingLost && rewards.clothingLost.length > 0) {
    return true;
  }
  return false;
};

/** Merge two detectRewards payloads (e.g. deferred collector trades). */
export function mergeRewardPayloads(
  a?: ReturnType<typeof detectRewards> | null,
  b?: ReturnType<typeof detectRewards> | null,
): ReturnType<typeof detectRewards> {
  const left = a || {};
  const right = b || {};
  const merged: ReturnType<typeof detectRewards> = {};

  const mergeAmountMaps = (
    x?: Record<string, number>,
    y?: Record<string, number>,
  ): Record<string, number> | undefined => {
    if (!x && !y) return undefined;
    const out: Record<string, number> = { ...(x || {}) };
    for (const [key, value] of Object.entries(y || {})) {
      out[key] = (out[key] || 0) + value;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  };

  const mergeStringArrays = <T extends string>(
    x?: T[],
    y?: T[],
  ): T[] | undefined => {
    if (!x?.length && !y?.length) return undefined;
    return [...new Set([...(x || []), ...(y || [])])] as T[];
  };

  const resources = mergeAmountMaps(
    left.resources as Record<string, number> | undefined,
    right.resources as Record<string, number> | undefined,
  );
  const resourceLosses = mergeAmountMaps(
    left.resourceLosses as Record<string, number> | undefined,
    right.resourceLosses as Record<string, number> | undefined,
  );

  // Net gains vs losses per resource (e.g. collector sell +400 / buy -800 → -400).
  if (resources || resourceLosses) {
    const nettedResources: Record<string, number> = { ...(resources || {}) };
    const nettedLosses: Record<string, number> = { ...(resourceLosses || {}) };
    const keys = new Set([
      ...Object.keys(nettedResources),
      ...Object.keys(nettedLosses),
    ]);
    for (const key of keys) {
      const net = (nettedResources[key] || 0) - (nettedLosses[key] || 0);
      if (net > 0) {
        nettedResources[key] = net;
        delete nettedLosses[key];
      } else if (net < 0) {
        nettedLosses[key] = Math.abs(net);
        delete nettedResources[key];
      } else {
        delete nettedResources[key];
        delete nettedLosses[key];
      }
    }
    if (Object.keys(nettedResources).length > 0) {
      merged.resources = nettedResources as typeof merged.resources;
    }
    if (Object.keys(nettedLosses).length > 0) {
      merged.resourceLosses = nettedLosses as typeof merged.resourceLosses;
    }
  }

  const stats = mergeAmountMaps(
    left.stats as Record<string, number> | undefined,
    right.stats as Record<string, number> | undefined,
  );
  if (stats) merged.stats = stats as typeof merged.stats;

  if ((left.villagersLost || 0) + (right.villagersLost || 0) > 0) {
    merged.villagersLost = (left.villagersLost || 0) + (right.villagersLost || 0);
  }
  if ((left.populationGained || 0) + (right.populationGained || 0) > 0) {
    merged.populationGained =
      (left.populationGained || 0) + (right.populationGained || 0);
  }

  const tools = mergeStringArrays(left.tools, right.tools);
  if (tools) merged.tools = tools;
  const weapons = mergeStringArrays(left.weapons, right.weapons);
  if (weapons) merged.weapons = weapons;
  const clothing = mergeStringArrays(left.clothing, right.clothing);
  if (clothing) merged.clothing = clothing;
  const clothingLost = mergeStringArrays(left.clothingLost, right.clothingLost);
  if (clothingLost) merged.clothingLost = clothingLost;
  const relics = mergeStringArrays(left.relics, right.relics);
  if (relics) merged.relics = relics;
  const relicsLost = mergeStringArrays(left.relicsLost, right.relicsLost);
  if (relicsLost) merged.relicsLost = relicsLost;
  const blessings = mergeStringArrays(left.blessings, right.blessings);
  if (blessings) merged.blessings = blessings;
  const books = mergeStringArrays(left.books, right.books);
  if (books) merged.books = books;
  const schematics = mergeStringArrays(left.schematics, right.schematics);
  if (schematics) merged.schematics = schematics;
  const fellowship = mergeStringArrays(left.fellowship, right.fellowship);
  if (fellowship) merged.fellowship = fellowship;

  return merged;
}

export const detectMadnessChange = (
  stateUpdates: Partial<GameState>,
  currentState: GameState,
): number => {
  if (!stateUpdates.stats) {
    return 0;
  }

  // Prefer event-source madness tracking when available.
  if (typeof stateUpdates.stats.madnessFromEvents === "number") {
    return (
      stateUpdates.stats.madnessFromEvents -
      (currentState.stats.madnessFromEvents || 0)
    );
  }

  if (typeof stateUpdates.stats.madness === "number") {
    return stateUpdates.stats.madness - (currentState.stats.madness || 0);
  }

  return 0;
};

export function resolveEventOutcomeTitle(
  catalogId: string,
  eventDef: (typeof gameEvents)[string] | undefined,
  state: GameState,
  i18nVars: Record<string, string | number>,
  logEntry?: { title?: string } | null,
): string {
  const storedTitle =
    logEntry?.title && !isI18nReturnedObjectError(logEntry.title)
      ? logEntry.title
      : undefined;
  return (
    resolveEventTitle(catalogId, eventDef?.title, state, i18nVars) ||
    storedTitle ||
    tWithFallback("ui", "event.fallbackTitle", "Event")
  );
}

export const rewardDialogActions = new Set([
  "layTrap",
  "castleRuins",
  "hillGrave",
  "sunkenTemple",
  "collapsedTower",
  "banditLair",
  "forestCave",
  "blackreachCanyon",
  "steelDelivery",
  "risingSmoke",
  "lowChamber",
  "occultistChamber",
  "hiddenLibrary",
  "exploreUndergroundLake",
]);

// Define which village attack events should trigger reward dialogs
export const rewardDialogVillageAttackEvents = new Set([
  "boneArmyAttack",
  "wolfAttack",
  "cannibalRaid",
  "bloodMoonAttack",
  "hiddenLake",
]);
