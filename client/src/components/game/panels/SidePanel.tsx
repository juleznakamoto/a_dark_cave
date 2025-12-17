import { useGameStore } from "@/game/state";
import SidePanelSection from "./SidePanelSection";
import { clothingEffects } from "@/game/rules/effects";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import { capitalizeWords } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { calculateBastionStats } from "@/game/bastionStats";
import {
  getDisplayTools,
  getTotalLuck,
  getTotalStrength,
  getTotalKnowledge,
  getTotalMadness,
  getAllActionBonuses,
  getTotalCraftingCostReduction,
  getTotalBuildingCostReduction,
} from "@/game/rules/effectsCalculation";
import { bookEffects, fellowshipEffects } from "@/game/rules/effects";
import { gameStateSchema } from "@shared/schema";

import { getStorageLimitText, isResourceLimited, getResourceLimit } from "@/game/resourceLimits"; // Assuming this is the correct path


// Extract property order from schema by parsing defaults
const defaultGameState = gameStateSchema.parse({});
const resourceOrder = Object.keys(defaultGameState.resources);
const buildingOrder = Object.keys(defaultGameState.buildings);
const villagerOrder = Object.keys(defaultGameState.villagers);

export default function SidePanel() {
  const {
    resources,
    buildings,
    villagers,
    current_population,
    total_population,
    activeTab,
    bastion_stats, // Added bastion_stats
    story,
  } = useGameStore();

  // Track resource changes for notifications with a max size limit
  const [resourceChanges, setResourceChanges] = useState<
    Array<{ resource: string; amount: number; timestamp: number }>
  >([]);

  // Clean up old resource changes periodically
  useEffect(() => {
    if (resourceChanges.length === 0) return;

    const cleanupTimer = setTimeout(() => {
      const now = Date.now();
      setResourceChanges((prev) =>
        prev.filter((change) => now - change.timestamp < 2000),
      );
    }, 2000);

    return () => clearTimeout(cleanupTimer);
  }, [resourceChanges]);

  // Get game state once for the entire component (needed early for stat calculations)
  const gameState = useGameStore();

  // Calculate total stats including bonuses from relics/clothing (needed early for seenStatsRef)
  const totalLuck = getTotalLuck(gameState);
  const totalStrength = getTotalStrength(gameState);
  const totalKnowledge = getTotalKnowledge(gameState);
  const totalMadness = getTotalMadness(gameState);

  // Track which resources have ever been seen (using a ref to persist across renders)
  const seenResourcesRef = useRef<Set<string>>(new Set());

  // Update seen resources
  resourceOrder.forEach((key) => {
    if ((resources[key as keyof typeof resources] ?? 0) > 0) {
      seenResourcesRef.current.add(key);
    }
  });

  // Track which stats have ever been seen
  const seenStatsRef = useRef<Set<string>>(new Set());

  // Update seen stats
  if (totalLuck > 0) seenStatsRef.current.add("luck");
  if (totalStrength > 0) seenStatsRef.current.add("strength");
  if (totalKnowledge > 0) seenStatsRef.current.add("knowledge");
  if (totalMadness > 0) seenStatsRef.current.add("madness");

  // Dynamically generate resource items from state (in schema order)
  // Show resource if it has ever been > 0, even if currently 0
  const resourceItems = resourceOrder
    .filter((key) => seenResourcesRef.current.has(key))
    .map((key) => ({
      id: key,
      label: capitalizeWords(key),
      value: resources[key as keyof typeof resources] ?? 0,
      testId: `resource-${key}`,
      visible: true,
    }));

  // Dynamically generate tool items from state (only show best tools, no weapons)
  const displayTools = getDisplayTools(gameState);

  // Filter out weapons from tools display and used special items
  const toolItems = Object.entries(displayTools)
    .filter(([key, value]) => {
      // Filter out weapons
      if (Object.keys(gameState.weapons).includes(key)) return false;

      // Filter out reinforced_rope after low chamber is explored
      if (key === "reinforced_rope" && gameState.tools.mastermason_chisel) {
        return false;
      }

      // Filter out giant_trap after laying trap
      if (key === "giant_trap" && gameState.clothing.black_bear_fur) {
        return false;
      }

      // Filter out occultist_map after exploring occultist chamber
      if (key === "occultist_map" && gameState.relics.occultist_grimoire) {
        return false;
      }

      return true;
    })
    .map(([key, value]) => ({
      id: key,
      label: capitalizeWords(key),
      value: 1,
      testId: `tool-${key}`,
      visible: true,
    }));

  // Dynamically generate weapon items from state (only show weapons from displayTools)
  const weaponItems = Object.entries(displayTools)
    .filter(([key, value]) => Object.keys(gameState.weapons).includes(key))
    .map(([key, value]) => ({
      id: key,
      label: capitalizeWords(key),
      value: 1,
      testId: `weapon-${key}`,
      visible: true,
    }));

  // Check if any resource has hit the limit
  const limit = getResourceLimit(gameState);
  const hasResourceAtLimit = resourceOrder.some((key) => {
    const resource = resources[key as keyof typeof resources];
    return isResourceLimited(key, gameState) && resource >= limit;
  });

  // Set the flag if we detect a resource at limit and flag isn't set yet
  if (hasResourceAtLimit && !gameState.flags.hasHitResourceLimit) {
    useGameStore.getState().setFlag('hasHitResourceLimit', true);
  }

  const showResourceLimit = resourceOrder.some((key) =>
    isResourceLimited(key, gameState),
  ) && gameState.flags.hasHitResourceLimit;
  const resourceLimitText = getStorageLimitText(gameState); // Get the storage limit text

  // Dynamically generate tool items from state (only show best tools, no weapons)

  // Dynamically generate clothing items from state
  const clothingItems = Object.entries(gameState.clothing || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: clothingEffects[key]?.name || capitalizeWords(key),
      value: 1,
      testId: `clothing-${key}`,
      visible: true,
    }));

  // Dynamically generate relic items from state
  const relicItems = Object.entries(gameState.relics || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: clothingEffects[key]?.name || capitalizeWords(key),
      value: 1,
      testId: `relic-${key}`,
      visible: true,
    }));

  // Dynamically generate book items from state
  const bookItems = Object.entries(gameState.books || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: bookEffects[key]?.name || capitalizeWords(key),
      value: 1,
      testId: `book-${key}`,
      visible: true,
      tooltip: bookEffects[key] ? (
        <div>
          <div className="font-bold">{bookEffects[key].name}</div>
          {bookEffects[key].description && (
            <div className="text-gray-400 mb-1">
              {bookEffects[key].description}
            </div>
          )}
        </div>
      ) : undefined,
    }));

  // Dynamically generate fellowship items from state
  const fellowshipItems = Object.entries(gameState.fellowship || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: fellowshipEffects[key]?.name || capitalizeWords(key),
      value: 1,
      testId: `fellowship-${key}`,
      visible: true,
      tooltip: fellowshipEffects[key] ? (
        <div>
          <div className="font-bold">{fellowshipEffects[key].name}</div>
          {fellowshipEffects[key].description && (
            <div className="text-gray-400 mb-1">
              {fellowshipEffects[key].description}
            </div>
          )}
        </div>
      ) : undefined,
    }));

  // Dynamically generate schematic items from state
  const schematicItems = Object.entries(gameState.schematics || {})
    .filter(([key, value]) => {
      if (!value) return false;

      // Hide schematic if weapon is crafted
      if (key === "arbalest_schematic" && gameState.weapons.arbalest) {
        return false;
      }
      if (
        key === "nightshade_bow_schematic" &&
        gameState.weapons.nightshade_bow
      ) {
        return false;
      }
      if (
        key === "stormglass_halberd_schematic" &&
        gameState.weapons.stormglass_halberd
      ) {
        return false;
      }

      return true;
    })
    .map(([key, value]) => ({
      id: key,
      label: clothingEffects[key]?.name || capitalizeWords(key),
      value: 1,
      testId: `schematic-${key}`,
      visible: true,
    }));

  // Dynamically generate blessing items from state
  const blessingItems = Object.entries(gameState.blessings || {})
    .filter(([key, value]) => {
      // Show blessing if it's true OR if its enhanced version is true
      if (value === true) return true;

      // Check if this is a base blessing with an enhanced version
      const enhancedKey = `${key}_enhanced`;
      if (
        gameState.blessings[enhancedKey as keyof typeof gameState.blessings]
      ) {
        return true;
      }

      return false;
    })
    .filter(([key]) => {
      // Don't show base blessing if enhanced version exists and is active
      if (key.endsWith("_enhanced")) return true;

      const enhancedKey = `${key}_enhanced`;
      if (
        gameState.blessings[enhancedKey as keyof typeof gameState.blessings]
      ) {
        return false; // Hide base version, show enhanced instead
      }

      return true;
    })
    .map(([key, value]) => ({
      id: key,
      label: clothingEffects[key]?.name || capitalizeWords(key),
      value: 1,
      testId: `blessing-${key}`,
      visible: true,
      tooltip: clothingEffects[key]?.description,
    }));

  // Dynamically generate building items from state (in schema order)
  const buildingItems = buildingOrder
    .filter((key) => {
      const value = buildings[key as keyof typeof buildings];
      // Filter out fortification buildings from the buildings section
      if (
        ["bastion", "watchtower", "palisades", "fortifiedMoat"].includes(key)
      ) {
        return false;
      }
      // Hide blacksmith when Grand Blacksmith is built
      if (key === "blacksmith" && buildings.grandBlacksmith > 0) {
        return false;
      }
      // Hide Trade Post when Grand Bazaar or Merchants Guild is built
      if (
        key === "tradePost" &&
        (buildings.grandBazaar > 0 || buildings.merchantsGuild > 0)
      ) {
        return false;
      }
      // Hide Grand Bazaar when Merchants Guild is built
      if (key === "grandBazaar" && buildings.merchantsGuild > 0) {
        return false;
      }
      // Hide tannery when Master Tannery is built
      if (key === "tannery" && buildings.masterTannery > 0) {
        return false;
      }
      // Hide foundry when Prime Foundry or Masterwork Foundry is built
      if (
        key === "foundry" &&
        (buildings.primeFoundry > 0 || buildings.masterworkFoundry > 0)
      ) {
        return false;
      }
      // Hide Prime Foundry when Masterwork Foundry is built
      if (key === "primeFoundry" && buildings.masterworkFoundry > 0) {
        return false;
      }
      // Hide Black Monolith when Pillar of Clarity or Bone Temple is built
      if (
        key === "blackMonolith" &&
        (buildings.pillarOfClarity > 0 || buildings.boneTemple > 0)
      ) {
        return false;
      }
      // Hide altar if shrine or temple is built (similar logic for other tiered buildings)
      if (key === "altar" && (buildings.shrine > 0 || buildings.temple > 0 || buildings.sanctum > 0)) {
        return false;
      }
      if (key === "shrine" && (buildings.temple > 0 || buildings.sanctum > 0)) {
        return false;
      }
      if (key === "temple" && buildings.sanctum > 0) {
        return false;
      }
      if (
        key === "blackMonolith" &&
        (buildings.pillarOfClarity > 0 || buildings.boneTemple > 0)
      ) {
        return false;
      }

      // Hide lower-tier storage buildings
      if (key === "supplyHut" && (buildings.storehouse > 0 || buildings.fortifiedStorehouse > 0 || buildings.villageWarehouse > 0 || buildings.grandRepository > 0 || buildings.greatVault > 0)) {
        return false;
      }
      if (key === "storehouse" && (buildings.fortifiedStorehouse > 0 || buildings.villageWarehouse > 0 || buildings.grandRepository > 0 || buildings.greatVault > 0)) {
        return false;
      }
      if (key === "fortifiedStorehouse" && (buildings.villageWarehouse > 0 || buildings.grandRepository > 0 || buildings.greatVault > 0)) {
        return false;
      }
      if (key === "villageWarehouse" && (buildings.grandRepository > 0 || buildings.greatVault > 0)) {
        return false;
      }
      if (key === "grandRepository" && buildings.greatVault > 0) {
        return false;
      }

      return (value ?? 0) > 0;
    })
    .map((key) => {
      const value = buildings[key as keyof typeof buildings];
      // Get the action definition to access the label
      const actionId = `build${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const buildAction = villageBuildActions[actionId];

      // Use the label from villageBuildActions, with special handling for multiple huts
      let label = buildAction?.label || capitalizeWords(key);
      const showCount = key === "woodenHut" || key === "stoneHut" || key === "longhouse";

      return {
        id: key,
        label: showCount ? (
          <>
            {label} <span className="text-muted-foreground">({value})</span>
          </>
        ) : label,
        value: value ?? 0,
        testId: `building-${key}`,
        visible: (value ?? 0) > 0,
        tooltip: true, // Tooltip will be generated in itemTooltips.tsx
      };
    })
    .filter((item) => item !== null) // Remove nulls from buildings not present
    .filter((item) => {
      // Only show the highest pit level
      if (
        item.id === "shallowPit" &&
        (buildings.deepeningPit > 0 ||
          buildings.deepPit > 0 ||
          buildings.bottomlessPit > 0)
      ) {
        return false;
      }
      if (
        item.id === "deepeningPit" &&
        (buildings.deepPit > 0 || buildings.bottomlessPit > 0)
      ) {
        return false;
      }
      if (item.id === "deepPit" && buildings.bottomlessPit > 0) {
        return false;
      }
      // Hide cabin when greatCabin is built
      if (item.id === "cabin" && buildings.greatCabin > 0) {
        return false;
      }
      // Hide clerksHut when scriptorium is built
      if (item.id === "clerksHut" && buildings.scriptorium > 0) {
        return false;
      }
      // Only show the highest religious building level
      if (
        item.id === "altar" &&
        (buildings.shrine > 0 || buildings.temple > 0 || buildings.sanctum > 0)
      ) {
        return false;
      }
      if (
        item.id === "shrine" &&
        (buildings.temple > 0 || buildings.sanctum > 0)
      ) {
        return false;
      }
      if (item.id === "temple" && buildings.sanctum > 0) {
        return false;
      }
      // Only show the highest storage building level
      if (
        item.id === "supplyHut" &&
        (buildings.storehouse > 0 || buildings.fortifiedStorehouse > 0 || 
         buildings.villageWarehouse > 0 || buildings.grandRepository > 0 || 
         buildings.greatVault > 0)
      ) {
        return false;
      }
      if (
        item.id === "storehouse" &&
        (buildings.fortifiedStorehouse > 0 || buildings.villageWarehouse > 0 || 
         buildings.grandRepository > 0 || buildings.greatVault > 0)
      ) {
        return false;
      }
      if (
        item.id === "fortifiedStorehouse" &&
        (buildings.villageWarehouse > 0 || buildings.grandRepository > 0 || 
         buildings.greatVault > 0)
      ) {
        return false;
      }
      if (
        item.id === "villageWarehouse" &&
        (buildings.grandRepository > 0 || buildings.greatVault > 0)
      ) {
        return false;
      }
      if (item.id === "grandRepository" && buildings.greatVault > 0) {
        return false;
      }
      return true;
    });

  // Dynamically generate villager items from state (in schema order)
  const populationItems = villagerOrder
    .filter((key) => (villagers[key as keyof typeof villagers] ?? 0) > 0)
    .map((key) => ({
      id: key,
      label: capitalizeWords(key),
      value: villagers[key as keyof typeof villagers] ?? 0,
      testId: `population-${key}`,
      visible: true,
    }));

  // Build stats items with total values
  const statsItems = [];
  const hasScriptorium = buildings.scriptorium > 0;
  const hasClerksHut = buildings.clerksHut > 0;

  // Show luck if it has ever been > 0
  if (seenStatsRef.current.has("luck")) {
    statsItems.push({
      id: "luck",
      label: "Luck",
      value: totalLuck,
      testId: "stat-luck",
      visible: true,
      icon: hasScriptorium ? "☆" : undefined,
      iconColor: hasScriptorium ? "text-green-300/80" : undefined,
      tooltip: hasClerksHut ? (
        <span className="text-gray-400">Bends fate in your favor</span>
      ) : undefined,
    });
  }

  // Show strength if it has ever been > 0
  if (seenStatsRef.current.has("strength")) {
    statsItems.push({
      id: "strength",
      label: "Strength",
      value: totalStrength,
      testId: "stat-strength",
      visible: true,
      icon: hasScriptorium ? "⬡" : undefined,
      iconColor: hasScriptorium ? "text-red-300/80" : undefined,
      tooltip: hasClerksHut ? (
        <span className="text-gray-400">
          Helps where words reach their limit
        </span>
      ) : undefined,
    });
  }

  // Show knowledge if it has ever been > 0
  if (seenStatsRef.current.has("knowledge")) {
    statsItems.push({
      id: "knowledge",
      label: "Knowledge",
      value: totalKnowledge,
      testId: "stat-knowledge",
      visible: true,
      icon: hasScriptorium ? "✧" : undefined,
      iconColor: hasScriptorium ? "text-blue-300/80" : undefined,
      tooltip: hasClerksHut ? (
        <span className="text-gray-400">
          Influences things where cleverness helps
        </span>
      ) : undefined,
    });
  }

  // Build combined madness tooltip
  let madnessTooltipContent: React.ReactNode = undefined;
  if (hasClerksHut) {
    const itemMadness = totalMadness - (gameState.stats.madnessFromEvents || 0);
    const eventMadness = gameState.stats.madnessFromEvents || 0;
    madnessTooltipContent = (
      <>
        <div className="text-gray-400">Leads thoughts into dangerous paths</div>
        {totalMadness > 0 && (
          <div className="text-gray-400 mt-1 pt-1 border-t border-border">
            <div>{itemMadness} from Items/Buildings</div>
            <div>{eventMadness} from Events</div>
          </div>
        )}
      </>
    );
  } else {
    madnessTooltipContent = undefined;
  }

  if (seenStatsRef.current.has("madness")) {
    statsItems.push({
      id: "madness",
      label: "Madness",
      value: totalMadness,
      testId: "stat-madness",
      visible: true,
      icon: hasScriptorium ? "✺" : undefined,
      iconColor: hasScriptorium ? "text-violet-300/80" : undefined,
      tooltip: hasClerksHut ? madnessTooltipContent : undefined,
    });
  }

  // Dynamically generate fortification items from state
  const fortificationItems = Object.entries(buildings)
    .map(([key, value]) => {
      // Only include fortification buildings
      if (
        !["bastion", "watchtower", "palisades", "fortifiedMoat"].includes(key)
      ) {
        return null;
      }

      if ((value ?? 0) === 0) return null;

      let label = capitalizeWords(key);
      let tooltip: React.ReactNode = undefined;

      // Map building keys to their contributions using bastion_stats
      if (key === "watchtower") {
        const level = value ?? 0;
        const watchtowerLabels = [
          "Watchtower",
          "Guard Tower",
          "Fortified Tower",
          "Cannon Tower",
        ];
        label = watchtowerLabels[level - 1] || "Watchtower";

        const isDamaged = story?.seen?.watchtowerDamaged;

        const currentStats = calculateBastionStats({
          ...useGameStore.getState(),
          buildings: { ...buildings },
        });

        const statsWithoutWatchtower = calculateBastionStats({
          ...useGameStore.getState(),
          buildings: { ...buildings, watchtower: 0 },
        });

        const defense = currentStats.defense - statsWithoutWatchtower.defense;
        const attack = currentStats.attack - statsWithoutWatchtower.attack;
        const integrity =
          currentStats.integrity - statsWithoutWatchtower.integrity;

        // Get the action definition to access the description
        const actionId = `build${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const buildAction = villageBuildActions[actionId];

        tooltip = (
          <div>
            <div className="font-bold">{label}</div>
            {buildAction?.description && (
              <div className="text-gray-400 mb-1">
                {buildAction.description}
              </div>
            )}
            <div>
              <div>+{defense} Defense</div>
              <div>+{attack} Attack</div>
              <div>+{integrity} Integrity</div>
            </div>
          </div>
        );

        // Add red down arrow if damaged
        if (isDamaged) {
          label += " ↓";
        }
      } else if (key === "bastion") {
        const isDamaged = story?.seen?.bastionDamaged;

        const currentStats = calculateBastionStats({
          ...useGameStore.getState(),
          buildings: { ...buildings },
        });

        const statsWithoutBastion = calculateBastionStats({
          ...useGameStore.getState(),
          buildings: { ...buildings, bastion: 0 },
        });

        const defense = currentStats.defense - statsWithoutBastion.defense;
        const attack =
          currentStats.attackFromFortifications -
          statsWithoutBastion.attackFromFortifications;
        const integrity =
          currentStats.integrity - statsWithoutBastion.integrity;

        // Get the action definition to access the description
        const actionId = `build${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const buildAction = villageBuildActions[actionId];

        tooltip = (
          <div>
            <div className="font-bold">{label}</div>
            {buildAction?.description && (
              <div className="text-gray-400 mb-1">
                {buildAction.description}
              </div>
            )}
            <div>
              <div>+{defense} Defense</div>
              <div>+{attack} Attack</div>
              <div>+{integrity} Integrity</div>
            </div>
          </div>
        );

        // Add red down arrow if damaged
        if (isDamaged) {
          label += " ↓";
        }
      } else if (key === "palisades") {
        const palisadesLevel = value ?? 0;
        const palisadesLabels = [
          "Wooden Palisades",
          "Fortified Palisades",
          "Stone Wall",
          "Reinforced Wall",
        ];
        label = palisadesLabels[palisadesLevel - 1] || "Wooden Palisades";

        const isDamaged = story?.seen?.palisadesDamaged;

        const currentStats = calculateBastionStats({
          ...useGameStore.getState(),
          buildings: { ...buildings },
        });

        const statsWithoutPalisades = calculateBastionStats({
          ...useGameStore.getState(),
          buildings: { ...buildings, palisades: 0 },
        });

        const defense = currentStats.defense - statsWithoutPalisades.defense;
        const integrity =
          currentStats.integrity - statsWithoutPalisades.integrity;

        // Get the action definition to access the description
        const actionId = `build${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const buildAction = villageBuildActions[actionId];

        tooltip = (
          <div>
            <div className="font-bold">{label}</div>
            {buildAction?.description && (
              <div className="text-gray-400 mb-1">
                {buildAction.description}
              </div>
            )}
            <div>
              <div>+{defense} Defense</div>
              <div>+{integrity} Integrity</div>
            </div>
          </div>
        );

        // Add red down arrow if damaged
        if (isDamaged) {
          label += " ↓";
        }
      } else if (key === "fortifiedMoat") {
        label = "Fortified Moat";

        // Get the action definition to access the description
        const actionId = `build${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const buildAction = villageBuildActions[actionId];

        tooltip = (
          <div>
            <div className="font-bold">{label}</div>
            {buildAction?.description && (
              <div className="text-gray-400 mb-1">
                {buildAction.description}
              </div>
            )}
            <div>
              <div>+5 Defense</div>
            </div>
          </div>
        );
      }

      return {
        id: key,
        label,
        value: value ?? 0,
        testId: `fortification-${key}`,
        visible: (value ?? 0) > 0,
        tooltip: tooltip,
      };
    })
    .filter((item) => item !== null); // Remove nulls from buildings not present

  // Dynamically generate bastion stats items from state
  const bastionStatsItems = Object.entries(bastion_stats || {})
    .filter(
      ([key]) =>
        !["attackFromFortifications", "attackFromStrength"].includes(key),
    ) // Exclude breakdown fields from display
    .map(([key, value]) => {
      let tooltip = undefined;

      // Add detailed tooltip for attack showing breakdown
      if (key === "attack" && bastion_stats) {
        const fortAttack = bastion_stats.attackFromFortifications || 0;
        const strengthAttack = bastion_stats.attackFromStrength || 0;
        if (fortAttack > 0 || strengthAttack > 0) {
          tooltip = (
            <>
              <div>{fortAttack} from Fortifications</div>
              <div>{strengthAttack} from Strength</div>
            </>
          );
        }
      }

      return {
        id: key,
        label: capitalizeWords(key),
        value: value ?? 0,
        testId: `bastion-stat-${key}`,
        visible: true, // Always show bastion stats when bastion exists
        tooltip,
      };
    });

  // Use SSOT for bonus calculations
  const bonusItems = getAllActionBonuses(gameState).map((bonus) => ({
    id: bonus.id,
    label: bonus.label,
    value: bonus.displayValue,
    testId: `bonus-${bonus.id}`,
    visible: true,
  }));

  // Add crafting cost reduction if present
  const craftingCostReduction = getTotalCraftingCostReduction(gameState);
  if (craftingCostReduction > 0) {
    bonusItems.push({
      id: "craftingCostReduction",
      label: "Crafting Discount",
      value: `-${Math.round(craftingCostReduction * 100)}%`,
      testId: "bonus-crafting-cost-reduction",
      visible: true,
    });
  }

  // Add building cost reduction if present
  const buildingCostReduction = getTotalBuildingCostReduction(gameState);
  if (buildingCostReduction > 0) {
    bonusItems.push({
      id: "buildingCostReduction",
      label: "Building Discount",
      value: `-${Math.round(buildingCostReduction * 100)}%`,
      testId: "bonus-building-cost-reduction",
      visible: true,
    });
  }

  // Check if estate is unlocked
  const estateUnlocked = gameState.buildings.darkEstate >= 1;

  // Determine which sections to show based on active tab
  const shouldShowSection = (sectionName: string): boolean => {
    switch (activeTab) {
      case "cave":
        let caveSections = [
          "resources",
          "tools",
          "weapons",
          "clothing",
          "schematics",
        ];
        if (!estateUnlocked) caveSections.push("stats");
        return caveSections.includes(sectionName);
      case "village":
        return ["resources", "buildings", "population"].includes(sectionName);
      case "forest":
        return ["resources", "relics", "blessings", "bonuses"].includes(
          sectionName,
        );
      case "estate":
        return ["resources", "books", "fellowship", "stats"].includes(
          sectionName,
        );
      case "bastion":
        return ["resources", "fortifications", "bastion"].includes(sectionName);
      case "achievements":
        return ["resources"].includes(sectionName);

      default:
        return true; // Show all sections by default
    }
  };

  return (
    <ScrollArea className="h-full max-h-[40vh] md:max-h-full px-3 py-1.5">
      <div className="pb-6 flex gap-12">
        {/* First column - Resources */}
        <div className="flex-[0.9]">
          {resourceItems.length > 0 && shouldShowSection("resources") && (
            <SidePanelSection
              title="Resources"
              titleTooltip={
                showResourceLimit
                  ? `Max ${resourceLimitText} (silver and gold excluded)`
                  : undefined
              }
              items={resourceItems}
              onValueChange={(itemId, oldValue, newValue) => {
                logger.log(
                  `Resource ${itemId} increased from ${oldValue} to ${newValue}`,
                );
              }}
              resourceChanges={resourceChanges}
              showNotifications={buildings.clerksHut > 0}
              onResourceChange={(change) => {
                if (buildings.clerksHut > 0) {
                  setResourceChanges((prev) => {
                    // Keep only the last 50 changes to prevent unbounded growth
                    const updated = [...prev, change];
                    return updated.slice(-50);
                  });
                }
              }}
              forceNotifications={buildings.clerksHut > 0}
            />
          )}
        </div>

        {/* Second column - Everything else */}
        <div className="flex-1">
          {toolItems.length > 0 && shouldShowSection("tools") && (
            <SidePanelSection title="Tools" items={toolItems} />
          )}
          {weaponItems.length > 0 && shouldShowSection("weapons") && (
            <SidePanelSection title="Weapons" items={weaponItems} />
          )}
          {clothingItems.length > 0 && shouldShowSection("clothing") && (
            <SidePanelSection title="Clothing" items={clothingItems} />
          )}
          {relicItems.length > 0 && shouldShowSection("relics") && (
            <SidePanelSection title="Relics" items={relicItems} />
          )}
          {schematicItems.length > 0 && shouldShowSection("schematics") && (
            <SidePanelSection title="Schematics" items={schematicItems} />
          )}
          {blessingItems.length > 0 && shouldShowSection("blessings") && (
            <SidePanelSection title="Blessings" items={blessingItems} />
          )}
          {buildingItems.length > 0 && shouldShowSection("buildings") && (
            <SidePanelSection title="Buildings" items={buildingItems} />
          )}
          {populationItems.length > 0 && shouldShowSection("population") && (
            <SidePanelSection
              title={
                <>
                  Population{" "}
                  <span className="text-muted-foreground font-normal">
                    {current_population}/{total_population}
                  </span>
                </>
              }
              items={populationItems}
              titleTooltip="Each villager consumes 1 food and 1 wood"
            />
          )}
          {statsItems.length > 0 && shouldShowSection("stats") && (
            <SidePanelSection title="Stats" items={statsItems} />
          )}
          {fortificationItems.length > 0 &&
            shouldShowSection("fortifications") && (
              <SidePanelSection
                title="Fortifications"
                items={fortificationItems}
              />
            )}
          {bastionStatsItems.length > 0 && shouldShowSection("bastion") && (
            <SidePanelSection title="Bastion" items={bastionStatsItems}>
              {bastion_stats && (
                <div className="text-xs text-gray-400">
                  <div>
                    Defense: {bastion_stats.defense} | Attack:{" "}
                    {bastion_stats.attack}
                  </div>
                  {bastion_stats.integrity > 0 && (
                    <div className="mt-1">
                      Integrity: {bastion_stats.integrity}
                    </div>
                  )}
                </div>
              )}
            </SidePanelSection>
          )}
          {bonusItems.length > 0 && shouldShowSection("bonuses") && (
            <SidePanelSection title="Bonuses" items={bonusItems} />
          )}
          {bookItems.length > 0 && shouldShowSection("books") && (
            <SidePanelSection title="Books" items={bookItems} />
          )}
          {fellowshipItems.length > 0 && shouldShowSection("fellowship") && (
            <SidePanelSection title="Fellowship" items={fellowshipItems} />
          )}
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}