import {
  BUILDING_HIERARCHIES,
  getTrapLevel,
} from "@/game/buildingHierarchy";
import { emptyBuild, type BuildState } from "@/pages/village-map-demo/catalog";

type BuildingCounts = Record<string, number | undefined>;

function owned(buildings: BuildingCounts, key: string): boolean {
  return (buildings[key] ?? 0) > 0;
}

/** Highest built step in a chain, as the map's tier count. */
function chainTier(buildings: BuildingCounts, keys: readonly string[]): number {
  let tier = 0;
  for (let index = 0; index < keys.length; index++) {
    if (owned(buildings, keys[index])) tier = index + 1;
  }
  return tier;
}

/** Map marks for the buildings this save actually has. */
export function buildStateFromPlayer(buildings: BuildingCounts): BuildState {
  const build = emptyBuild();
  const set = (id: string, count: number) => {
    if (count > 0) build.counts[id] = count;
  };

  set("woodenHut", buildings.woodenHut ?? 0);
  set("stoneHut", buildings.stoneHut ?? 0);
  set("longhouse", buildings.longhouse ?? 0);
  set("furTents", buildings.furTents ?? 0);
  set("heartfire", owned(buildings, "heartfire") ? 1 : 0);
  set("timberMill", owned(buildings, "timberMill") ? 1 : 0);
  set("quarry", owned(buildings, "quarry") ? 1 : 0);
  set("alchemistHall", owned(buildings, "alchemistHall") ? 1 : 0);
  set("blackMonolith", owned(buildings, "blackMonolith") ? 1 : 0);
  set("pillarOfClarity", owned(buildings, "pillarOfClarity") ? 1 : 0);
  set("boneTemple", owned(buildings, "boneTemple") ? 1 : 0);
  set("boneyard", owned(buildings, "boneyard") ? 1 : 0);
  set("herbGarden", owned(buildings, "herbGarden") ? 1 : 0);
  set("bastion", owned(buildings, "bastion") ? 1 : 0);
  set("wizardTower", owned(buildings, "wizardTower") ? 1 : 0);
  set("watchtower", Math.min(4, buildings.watchtower ?? 0));

  set("cabin", chainTier(buildings, BUILDING_HIERARCHIES.cabin));
  set("blacksmith", chainTier(buildings, BUILDING_HIERARCHIES.blacksmith));
  set("pit", chainTier(buildings, BUILDING_HIERARCHIES.pit));
  set("tannery", chainTier(buildings, BUILDING_HIERARCHIES.tannery));
  set("storage", chainTier(buildings, BUILDING_HIERARCHIES.storage));
  set("trade", chainTier(buildings, BUILDING_HIERARCHIES.trade));
  set("altar", chainTier(buildings, BUILDING_HIERARCHIES.religious));
  set("paleCross", chainTier(buildings, BUILDING_HIERARCHIES.paleCross));
  set("clerksHut", chainTier(buildings, BUILDING_HIERARCHIES.clerk));
  set("archive", chainTier(buildings, BUILDING_HIERARCHIES.archive));
  set("builders", chainTier(buildings, BUILDING_HIERARCHIES.builders));
  set("foundry", chainTier(buildings, BUILDING_HIERARCHIES.foundry));
  set("coinhouse", chainTier(buildings, BUILDING_HIERARCHIES.investmentHall));
  set("estate", chainTier(buildings, BUILDING_HIERARCHIES.estate));

  build.wall = Math.min(4, Math.max(0, buildings.palisades ?? 0));
  build.traps = getTrapLevel(buildings);
  build.moat = owned(buildings, "fortifiedMoat");
  build.chitin = owned(buildings, "chitinPlating");
  return build;
}
