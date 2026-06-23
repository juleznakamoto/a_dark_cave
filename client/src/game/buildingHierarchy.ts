
// Building upgrade chains - each array represents a hierarchy where later buildings replace earlier ones
export const BUILDING_HIERARCHIES: Record<string, string[]> = {
  // Fortifications (excluded from buildings section)
  fortifications: [
    "bastion",
    "watchtower",
    "palisades",
    "fortifiedMoat",
    "chitinPlating",
  ],

  // Blacksmith chain
  blacksmith: ["blacksmith", "advancedBlacksmith", "grandBlacksmith"],

  // Trade chain
  trade: ["tradePost", "grandBazaar", "merchantsGuild"],

  // Tannery chain
  tannery: ["tannery", "masterTannery", "highTannery"],

  // Foundry chain
  foundry: ["foundry", "primeFoundry", "masterworkFoundry"],

  // Religious buildings chain
  religious: ["altar", "shrine", "temple", "sanctum"],

  // Dark buildings chain
  dark: ["blackMonolith", "pillarOfClarity", "boneTemple"],

  // Pale Cross chain
  paleCross: ["paleCross", "consecratedPaleCross"],

  // Storage chain
  storage: [
    "supplyHut",
    "storehouse",
    "fortifiedStorehouse",
    "villageWarehouse",
    "grandRepository",
    "greatVault",
  ],

  // Pit chain
  pit: ["shallowPit", "deepeningPit", "deepPit", "bottomlessPit"],

  // Hunter cabin chain
  cabin: ["cabin", "greatCabin", "grandHunterLodge"],

  // Traps: side panel shows Improved Traps only once the upgrade exists (traps count stays 2 for combat)
  traps: ["traps", "improvedTraps"],

  // Clerk chain
  clerk: ["clerksHut", "scriptorium", "inkwardenAcademy"],

  // Archive chain (unlocks villager job presets)
  archive: ["scribesOffice", "recordsHall", "grandArchive"],

  // Estate chain
  estate: ["darkEstate", "blackEstate"],

  // Investment hall chain
  investmentHall: ["coinhouse", "bank", "treasury"],

  // Builder chain
  builders: ["buildersLodge", "buildersHall", "buildersGuild"],
};

/**
 * Check if a building should be hidden based on upgrade hierarchies
 */
export function shouldHideBuilding(
  buildingKey: string,
  buildings: Record<string, number>
): boolean {
  // Check each hierarchy
  for (const hierarchy of Object.values(BUILDING_HIERARCHIES)) {
    const buildingIndex = hierarchy.indexOf(buildingKey);

    // If building is in this hierarchy
    if (buildingIndex !== -1) {
      // Hide if any higher-tier building in the chain exists
      for (let i = buildingIndex + 1; i < hierarchy.length; i++) {
        if ((buildings[hierarchy[i]] ?? 0) > 0) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if a building should be excluded from the buildings section entirely
 */
export function shouldExcludeFromBuildingsSection(buildingKey: string): boolean {
  return BUILDING_HIERARCHIES.fortifications.includes(buildingKey);
}

/**
 * Check if a building is an upgrade of another building (i.e. not the first in its chain)
 */
export function isBuildingUpgrade(buildingKey: string): boolean {
  for (const hierarchy of Object.values(BUILDING_HIERARCHIES)) {
    const index = hierarchy.indexOf(buildingKey);
    if (index > 0) return true;
  }
  return false;
}

/**
 * Side-panel building id to highlight when hovering a build upgrade action (green arrow tooltip).
 */
export function getBuildingUpgradeHighlightId(
  buildingKey: string,
  buildings: Record<string, number>,
): string | null {
  if (!isBuildingUpgrade(buildingKey)) return null;

  // Level upgrades reuse the same fortification key (watchtower 1→2, palisades 1→2, …).
  if (buildingKey === "watchtower" || buildingKey === "palisades") {
    return (buildings[buildingKey] ?? 0) > 0 ? buildingKey : null;
  }

  const chain = getBuildingHierarchyChain(buildingKey);
  if (chain) {
    const index = chain.indexOf(buildingKey);
    if (index > 0) {
      const predecessor = chain[index - 1];
      return (buildings[predecessor] ?? 0) > 0 ? predecessor : null;
    }
    return null;
  }

  for (const hierarchy of Object.values(BUILDING_HIERARCHIES)) {
    const index = hierarchy.indexOf(buildingKey);
    if (index > 0) {
      const predecessor = hierarchy[index - 1];
      return (buildings[predecessor] ?? 0) > 0 ? predecessor : null;
    }
  }

  return null;
}

/** Stackable housing — not chain upgrades; omit "Level" in building tooltips. */
const BUILDING_TOOLTIP_LEVEL_EXCLUSIONS = new Set([
  "woodenHut",
  "stoneHut",
  "furTents",
  "longhouse",
]);

/** Not linear upgrade chains — omit tier labels / level breakdown in building tooltips. */
const BUILDING_TOOLTIP_CHAIN_EXCLUSIONS = new Set([
  ...BUILDING_HIERARCHIES.fortifications,
  // Mutually exclusive or add-on dark buildings, not monolith → tier 2 → tier 3.
  ...BUILDING_HIERARCHIES.dark,
]);

/**
 * Full upgrade chain for a building key, or null if not in a chain or excluded.
 */
export function getBuildingHierarchyChain(
  buildingKey: string,
): string[] | null {
  if (BUILDING_TOOLTIP_LEVEL_EXCLUSIONS.has(buildingKey)) return null;
  if (BUILDING_TOOLTIP_CHAIN_EXCLUSIONS.has(buildingKey)) return null;
  for (const hierarchy of Object.values(BUILDING_HIERARCHIES)) {
    if (hierarchy.includes(buildingKey)) return hierarchy;
  }
  return null;
}

/**
 * 1-based tier in an upgrade chain (`BUILDING_HIERARCHIES`) for tooltip labels.
 * Returns null if not in a chain or excluded.
 */
export function getBuildingHierarchyTooltipLevel(
  buildingKey: string,
): number | null {
  const chain = getBuildingHierarchyChain(buildingKey);
  if (!chain) return null;
  return chain.indexOf(buildingKey) + 1;
}
