import { useSyncExternalStore } from "react";
import { BUILDING_HIERARCHIES } from "@/game/buildingHierarchy";

/** Map marks. Upgrade chains collapse onto the first mark of that chain. */
const MAP_BUILDING_IDS = new Set([
  "heartfire",
  "woodenHut",
  "stoneHut",
  "longhouse",
  "furTents",
  "cabin",
  "blacksmith",
  "pit",
  "tannery",
  "timberMill",
  "quarry",
  "storage",
  "trade",
  "altar",
  "paleCross",
  "clerksHut",
  "archive",
  "builders",
  "foundry",
  "alchemistHall",
  "coinhouse",
  "blackMonolith",
  "pillarOfClarity",
  "boneTemple",
  "boneyard",
  "herbGarden",
  "bastion",
  "watchtower",
  "wizardTower",
  "estate",
  "fortifiedMoat",
  "traps",
]);

/** Hierarchy keys whose members are separate marks, not one upgrade. */
const SEPARATE_MARKS = new Set(["dark", "fortifications"]);

const CHAIN_MARK: Record<string, string> = {
  religious: "altar",
  clerk: "clerksHut",
  investmentHall: "coinhouse",
};

const SIDE_PANEL_TO_MAP = new Map<string, string>();
for (const [chain, keys] of Object.entries(BUILDING_HIERARCHIES)) {
  if (SEPARATE_MARKS.has(chain)) {
    for (const key of keys) {
      if (MAP_BUILDING_IDS.has(key)) SIDE_PANEL_TO_MAP.set(key, key);
    }
    continue;
  }
  const mapId = CHAIN_MARK[chain] ?? chain;
  if (!MAP_BUILDING_IDS.has(mapId)) continue;
  for (const key of keys) SIDE_PANEL_TO_MAP.set(key, mapId);
}
for (const id of MAP_BUILDING_IDS) {
  if (!SIDE_PANEL_TO_MAP.has(id)) SIDE_PANEL_TO_MAP.set(id, id);
}

/** Side-panel building row -> the mark to light on the village map. */
export function sidePanelBuildingToMapId(buildingKey: string): string | null {
  return SIDE_PANEL_TO_MAP.get(buildingKey) ?? null;
}

/** `buildings:woodenHut` from the side-panel hover, or null when it is not a map mark. */
export function mapHighlightFromSidePanelHover(scopedId: string | null): string | null {
  if (!scopedId) return null;
  const colon = scopedId.indexOf(":");
  const section = colon === -1 ? "" : scopedId.slice(0, colon);
  if (section !== "buildings" && section !== "fortifications") return null;
  return sidePanelBuildingToMapId(scopedId.slice(colon + 1));
}

const MAP_TO_SIDE_PANEL_KEYS = new Map<string, string[]>();
for (const [key, mapId] of SIDE_PANEL_TO_MAP) {
  const keys = MAP_TO_SIDE_PANEL_KEYS.get(mapId) ?? [];
  keys.push(key);
  MAP_TO_SIDE_PANEL_KEYS.set(mapId, keys);
}

/** The side-panel row for a map mark: the highest tier the player actually owns. */
export function sidePanelRowFromMapBuilding(
  mapId: string,
  buildings: Record<string, number | undefined>,
): string | null {
  const keys = MAP_TO_SIDE_PANEL_KEYS.get(mapId);
  if (!keys) return null;
  let row: string | null = null;
  for (const key of keys) {
    if ((buildings[key] ?? 0) > 0) row = key;
  }
  return row;
}

let hoveredSidePanelBuildingId: string | null = null;
const hoverListeners = new Set<() => void>();

export function setVillageMapHoveredBuilding(id: string | null) {
  if (hoveredSidePanelBuildingId === id) return;
  hoveredSidePanelBuildingId = id;
  hoverListeners.forEach((listener) => listener());
}

export function useVillageMapHoveredBuildingId(): string | null {
  return useSyncExternalStore(
    (listener) => {
      hoverListeners.add(listener);
      return () => hoverListeners.delete(listener);
    },
    () => hoveredSidePanelBuildingId,
    () => null,
  );
}
