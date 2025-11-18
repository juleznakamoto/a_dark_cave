import { useGameStore } from "@/game/state";
import SidePanelSection from "./SidePanelSection";
import { clothingEffects } from "@/game/rules/effects";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import { capitalizeWords } from "@/lib/utils";
import { useState, useEffect } from "react";
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
import BuildingProgressChart from "./BuildingProgressChart";
import ItemProgressChart from "./ItemProgressChart";
import { gameStateSchema } from "@shared/schema";

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

  // Dynamically generate resource items from state (in schema order)
  const resourceItems = resourceOrder
    .filter(key => (resources[key as keyof typeof resources] ?? 0) > 0)
    .map(key => ({
      id: key,
      label: capitalizeWords(key),
      value: resources[key as keyof typeof resources] ?? 0,
      testId: `resource-${key}`,
      visible: true,
    }));

  // Get game state once for the entire component
  const gameState = useGameStore();

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

  // Dynamically generate schematic items from state
  const schematicItems = Object.entries(gameState.schematics || {})
    .filter(([key, value]) => {
      if (!value) return false;

      // Hide arbalest schematic if weapon is crafted
      if (key === "arbalest_schematic" && gameState.weapons.arbalest) {
        return false;
      }

      // Hide nightshade bow schematic if weapon is crafted
      if (
        key === "nightshade_bow_schematic" &&
        gameState.weapons.nightshade_bow
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
    .filter(key => {
      const value = buildings[key as keyof typeof buildings];
      // Filter out fortification buildings from the buildings section
      if (["bastion", "watchtower", "palisades", "fortifiedMoat"].includes(key)) {
        return false;
      }
      // Hide blacksmith when Grand Blacksmith is built
      if (key === "blacksmith" && buildings.grandBlacksmith > 0) {
        return false;
      }
      // Hide Trade Post when Grand Bazaar or Merchants Guild is built
      if (key === "tradePost" && (buildings.grandBazaar > 0 || buildings.merchantsGuild > 0)) {
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
      if (key === "foundry" && (buildings.primeFoundry > 0 || buildings.masterworkFoundry > 0)) {
        return false;
      }
      // Hide Prime Foundry when Masterwork Foundry is built
      if (key === "primeFoundry" && buildings.masterworkFoundry > 0) {
        return false;
      }
      return (value ?? 0) > 0;
    })
    .map(key => {
      const value = buildings[key as keyof typeof buildings];
      // Get the action definition to access the label
      const actionId = `build${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const buildAction = villageBuildActions[actionId];

      // Use the label from villageBuildActions, with special handling for multiple huts
      let label = buildAction?.label || capitalizeWords(key);
      if (key === "woodenHut" || key === "stoneHut" || key === "longhouse") {
        label = `${label} (${value})`;
      }

      // Build tooltip JSX with description and effects
      let tooltip: React.ReactNode = undefined;

      // Check if this building is damaged
      const isDamaged =
        (key === "bastion" && story?.seen?.bastionDamaged) ||
        (key === "watchtower" && story?.seen?.watchtowerDamaged) ||
        (key === "palisades" && story?.seen?.palisadesDamaged);

      const tooltipParts: React.ReactNode[] = [];

      // Add description if available
      if (buildAction?.description) {
        tooltipParts.push(
          <div key="description" className="text-muted-foreground mb-2">
            {buildAction.description}
          </div>
        );
      }

      // Check if manual tooltipEffects exist
      const tooltipEffects = buildAction?.tooltipEffects;
      const effectsArray = typeof tooltipEffects === 'function' 
        ? tooltipEffects(gameState) 
        : tooltipEffects;
      const hasManualTooltip = effectsArray && effectsArray.length > 0;

      if (hasManualTooltip) {
        // Use manual tooltipEffects
        tooltipParts.push(
          <div key="effects">
            {effectsArray.map((effect, idx) => (
              <div key={idx}>
                {effect}
              </div>
            ))}
          </div>
        );
      } else {
        // Auto-generate effects from statsEffects and productionEffects
        const effectsList: string[] = [];

        if (buildAction?.statsEffects) {
          Object.entries(buildAction.statsEffects).forEach(([stat, statValue]) => {
            // Apply 50% reduction and round down if damaged
            let finalValue = isDamaged ? Math.floor(statValue * 0.5) : statValue;

            effectsList.push(`${finalValue > 0 ? "+" : ""}${finalValue} ${capitalizeWords(stat)}`);
          });
        }

        // Special handling for production effects
        if (buildAction?.productionEffects) {
          Object.entries(buildAction.productionEffects).forEach(([jobType, production]) => {
            Object.entries(production).forEach(([resource, amount]) => {
              effectsList.push(`+${amount} ${capitalizeWords(resource)} (${capitalizeWords(jobType)})`);
            });
          });
        }

        // Special handling for fortification buildings (bastion, watchtower, palisades)
        if (key === "bastion" && buildings.bastion > 0) {
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
          const integrity = currentStats.integrity - statsWithoutBastion.integrity;

          effectsList.push(`${defense > 0 ? "+" : ""}${defense} Defense`);
          effectsList.push(`${attack > 0 ? "+" : ""}${attack} Attack`);
          effectsList.push(`${integrity > 0 ? "+" : ""}${integrity} Integrity`);
        } else if (key === "watchtower" && buildings.watchtower > 0) {
          const currentStats = calculateBastionStats({
            ...useGameStore.getState(),
            buildings: { ...buildings },
          });

          const statsWithoutWatchtower = calculateBastionStats({
            ...useGameStore.getState(),
            buildings: { ...buildings, watchtower: 0 },
          });

          const defense = currentStats.defense - statsWithoutWatchtower.defense;
          const attack =
            currentStats.attackFromFortifications -
            statsWithoutWatchtower.attackFromFortifications;
          const integrity =
            currentStats.integrity - statsWithoutWatchtower.integrity;

          effectsList.push(`${defense > 0 ? "+" : ""}${defense} Defense`);
          effectsList.push(`${attack > 0 ? "+" : ""}${attack} Attack`);
          effectsList.push(`${integrity > 0 ? "+" : ""}${integrity} Integrity`);
        } else if (key === "palisades" && buildings.palisades > 0) {
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

          effectsList.push(`${defense > 0 ? "+" : ""}${defense} Defense`);
          effectsList.push(`${integrity > 0 ? "+" : ""}${integrity} Integrity`);
        } else if (key === "fortifiedMoat" && buildings.fortifiedMoat > 0) {
          effectsList.push("+5 Defense");
        }

        // Add effects section if there are any auto-generated effects
        if (effectsList.length > 0) {
          tooltipParts.push(
            <div key="effects">
              {effectsList.map((effect, idx) => (
                <div key={idx}>
                  {effect}
                </div>
              ))}
            </div>
          );
        }
      }


      // Combine tooltip parts
      if (tooltipParts.length > 0) {
        tooltip = (
          <div>
            <div className="font-bold">{label}</div>
            {buildAction?.description && (
              <div className="text-gray-400 mb-1">
                {buildAction.description}
              </div>
            )}
            {tooltipParts.filter(part => part.key !== "description").map((part, idx) => (
              <div key={idx}>{part}</div>
            ))}
          </div>
        );
      }

      return {
        id: key,
        label,
        value: value ?? 0,
        testId: `building-${key}`,
        visible: (value ?? 0) > 0,
        tooltip: tooltip,
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
      return true;
    });

  // Dynamically generate villager items from state (in schema order)
  const populationItems = villagerOrder
    .filter(key => (villagers[key as keyof typeof villagers] ?? 0) > 0)
    .map(key => ({
      id: key,
      label: capitalizeWords(key),
      value: villagers[key as keyof typeof villagers] ?? 0,
      testId: `population-${key}`,
      visible: true,
    }));

  // Calculate total stats including bonuses from relics/clothing
  const totalLuck = getTotalLuck(gameState);
  const totalStrength = getTotalStrength(gameState);
  const totalKnowledge = getTotalKnowledge(gameState);
  const totalMadness = getTotalMadness(gameState);

  // Build stats items with total values
  const statsItems = [];
  const hasScriptorium = buildings.scriptorium > 0;
  const hasClerksHut = buildings.clerksHut > 0;

  // Add luck if it's greater than 0
  if (totalLuck > 0) {
    statsItems.push({
      id: "luck",
      label: "Luck",
      value: totalLuck,
      testId: "stat-luck",
      visible: true,
      icon: hasScriptorium ? "☆" : undefined,
      iconColor: hasScriptorium ? "text-green-300/80" : undefined,
      tooltip: hasClerksHut ? <span className="text-gray-400">Bends fate in your favor</span> : undefined,
    });
  }

  // Add strength if it's greater than 0
  if (totalStrength > 0) {
    statsItems.push({
      id: "strength",
      label: "Strength",
      value: totalStrength,
      testId: "stat-strength",
      visible: true,
      icon: hasScriptorium ? "⬡" : undefined,
      iconColor: hasScriptorium ? "text-red-300/80" : undefined,
      tooltip: hasClerksHut ? <span className="text-gray-400">Helps where words reach their limit</span> : undefined,
    });
  }

  // Add knowledge if it's greater than 0
  if (totalKnowledge > 0) {
    statsItems.push({
      id: "knowledge",
      label: "Knowledge",
      value: totalKnowledge,
      testId: "stat-knowledge",
      visible: true,
      icon: hasScriptorium ? "✧" : undefined,
      iconColor: hasScriptorium ? "text-blue-300/80" : undefined,
      tooltip: hasClerksHut ? <span className="text-gray-400">Unlocks advanced crafting and building options</span> : undefined,
    });
  }

  // Always show madness (show 0 if below 0)
  const displayMadness = Math.max(0, totalMadness);
  
  // Build combined madness tooltip
  let madnessTooltipContent: React.ReactNode = undefined;
  if (hasClerksHut) {
    const itemMadness = totalMadness - (gameState.stats.madnessFromEvents || 0);
    const eventMadness = gameState.stats.madnessFromEvents || 0;
    
    madnessTooltipContent = (
      <>
        <div className="text-gray-400">Triggers madness events and affects villager morale</div>
        {totalMadness > 0 && (
          <div className="text-gray-400 mt-1 pt-1 border-t border-border">
            <div>{itemMadness} from Items/Buildings</div>
            <div>{eventMadness} from Events</div>
          </div>
        )}
      </>
    );
  }
  
  statsItems.push({
    id: "madness",
    label: "Madness",
    value: displayMadness,
    testId: "stat-madness",
    visible: true,
    icon: hasScriptorium ? "✺" : undefined,
    iconColor: hasScriptorium ? "text-violet-300/80" : undefined,
    tooltip: madnessTooltipContent,
  });

  // Dynamically generate fortification items from state
  const fortificationItems = Object.entries(buildings)
    .map(([key, value]) => {
      // Only include fortification buildings
      if (!["bastion", "watchtower", "palisades", "fortifiedMoat"].includes(key)) {
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
          tooltip = `${fortAttack} from Fortifications\n${strengthAttack} from Strength`;
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
      id: 'craftingCostReduction',
      label: 'Crafting Discount',
      value: `-${Math.round(craftingCostReduction * 100)}%`,
      testId: 'bonus-crafting-cost-reduction',
      visible: true,
    });
  }

  // Add building cost reduction if present
  const buildingCostReduction = getTotalBuildingCostReduction(gameState);
  if (buildingCostReduction > 0) {
    bonusItems.push({
      id: 'buildingCostReduction',
      label: 'Building Discount',
      value: `-${Math.round(buildingCostReduction * 100)}%`,
      testId: 'bonus-building-cost-reduction',
      visible: true,
    });
  }

  // Determine which sections to show based on active tab
  const shouldShowSection = (sectionName: string): boolean => {
    switch (activeTab) {
      case "cave":
        return [
          "resources",
          "tools",
          "weapons",
          "clothing",
          "stats",
          "schematics",
        ].includes(sectionName);
      case "village":
        return ["resources", "buildings", "population"].includes(sectionName);
      case "forest":
        return ["resources", "relics", "blessings", "bonuses"].includes(sectionName);
      case "bastion":
        return ["resources", "fortifications", "bastion"].includes(sectionName);

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
              items={resourceItems}
              onValueChange={(itemId, oldValue, newValue) => {
                console.log(
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
          {/* Progress Charts - Side by Side */}
          <div className="flex">
            <div className="flex-1">
              <BuildingProgressChart />
            </div>
            <div className="flex-1">
              <ItemProgressChart />
            </div>
          </div>
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
              title={`Population ${current_population}/${total_population}`}
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

        </div>

      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}