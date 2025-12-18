
// Building upgrade chains - each array represents a hierarchy where later buildings replace earlier ones
export const BUILDING_HIERARCHIES: Record<string, string[]> = {
  // Fortifications (excluded from buildings section)
  fortifications: ["bastion", "watchtower", "palisades", "fortifiedMoat"],
  
  // Blacksmith chain
  blacksmith: ["blacksmith", "advancedBlacksmith", "grandBlacksmith"],
  
  // Trade chain
  trade: ["tradePost", "grandBazaar", "merchantsGuild"],
  
  // Tannery chain
  tannery: ["tannery", "masterTannery"],
  
  // Foundry chain
  foundry: ["foundry", "primeFoundry", "masterworkFoundry"],
  
  // Religious buildings chain
  religious: ["altar", "shrine", "temple", "sanctum"],
  
  // Dark buildings chain
  dark: ["blackMonolith", "pillarOfClarity", "boneTemple"],
  
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
  cabin: ["cabin", "greatCabin"],
  
  // Clerk chain
  clerk: ["clerksHut", "scriptorium", "inkwardenAcademy"],
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
