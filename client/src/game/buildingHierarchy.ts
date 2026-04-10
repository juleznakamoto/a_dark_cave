
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

  // Cabin chain
  cabin: ["cabin", "greatCabin", "grandHunterLodge"],

  // Traps: side panel shows Improved Traps only once the upgrade exists (traps count stays 2 for combat)
  traps: ["traps", "improvedTraps"],

  // Clerk chain
  clerk: ["clerksHut", "scriptorium", "inkwardenAcademy"],

  // Investment hall chain
  investmentHall: ["coinhouse", "bank", "treasury"],
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

/** Stackable housing — not chain upgrades; omit "Level" in building tooltips. */
const BUILDING_TOOLTIP_LEVEL_EXCLUSIONS = new Set([
  "woodenHut",
  "stoneHut",
  "furTents",
  "longhouse",
]);

/**
 * 1-based tier in an upgrade chain (`BUILDING_HIERARCHIES`) for tooltip labels.
 * Returns null if not in a chain or excluded.
 */
export function getBuildingHierarchyTooltipLevel(
  buildingKey: string,
): number | null {
  if (BUILDING_TOOLTIP_LEVEL_EXCLUSIONS.has(buildingKey)) return null;
  for (const hierarchy of Object.values(BUILDING_HIERARCHIES)) {
    const index = hierarchy.indexOf(buildingKey);
    if (index !== -1) return index + 1;
  }
  return null;
}
