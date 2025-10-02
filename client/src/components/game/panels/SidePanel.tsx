import { useGameStore } from "@/game/state";
import SidePanelSection from "./SidePanelSection";
import {
  clothingEffects,
  getDisplayTools,
  getTotalLuck,
  getTotalStrength,
  getTotalKnowledge,
  getTotalMadness,
} from "@/game/rules/effects";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import { capitalizeWords } from "@/lib/utils";
import { useState } from "react";

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

  // Track resource changes for notifications
  const [resourceChanges, setResourceChanges] = useState<
    Array<{ resource: string; amount: number; timestamp: number }>
  >([]);

  // Dynamically generate resource items from state
  const resourceItems = Object.entries(resources)
    .map(([key, value]) => ({
      id: key,
      label: capitalizeWords(key),
      value: value ?? 0,
      testId: `resource-${key}`,
      visible: (value ?? 0) > 0,
    }))
    .filter((item) => item.visible);

  // Get game state once for the entire component
  const gameState = useGameStore();

  // Dynamically generate tool items from state (only show best tools, no weapons)
  const displayTools = getDisplayTools(gameState);

  // Filter out weapons from tools display
  const toolItems = Object.entries(displayTools)
    .filter(([key, value]) => !Object.keys(gameState.weapons).includes(key))
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
      label: capitalizeWords(key),
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

  // Dynamically generate blessing items from state
  const blessingItems = Object.entries(gameState.blessings || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: clothingEffects[key]?.name || capitalizeWords(key),
      value: 1,
      testId: `blessing-${key}`,
      visible: true,
      tooltip: clothingEffects[key]?.description,
    }));

  // Dynamically generate building items from state
  const buildingItems = Object.entries(buildings)
    .filter(([key, value]) => {
      // Filter out fortification buildings from the buildings section
      if (
        [
          "bastion",
          "wizardTower",
          "watchtower",
          "palisades",
        ].includes(key)
      ) {
        return false;
      }
      return (value ?? 0) > 0;
    })
    .map(([key, value]) => {
      let label =
        key === "clerksHut"
          ? "Clerk's Hut"
          : key === "alchemistHall"
            ? "Alchemist's Hall"
            : key === "tradePost"
              ? "Trade Post"
              : capitalizeWords(key);

      // Get stats effects for this specific building from villageBuildActions
      let tooltip = undefined;
      const actionId = `build${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const buildAction = villageBuildActions[actionId];
      
      // Check if this building is damaged
      const isDamaged = (key === 'bastion' && story?.seen?.bastionDamaged) ||
                       (key === 'watchtower' && story?.seen?.watchtowerDamaged) ||
                       (key === 'palisades' && story?.seen?.palisadesDamaged);
      
      if (buildAction?.statsEffects) {
        const effects = Object.entries(buildAction.statsEffects)
          .map(([stat, value]) => {
            // Apply 50% reduction and round down if damaged
            const finalValue = isDamaged ? Math.floor(value * 0.5) : value;
            return `${finalValue > 0 ? "+" : ""}${finalValue} ${stat}`;
          })
          .join(", ");
        if (effects) {
          tooltip = effects;
        }
      }
      
      // Special handling for fortification buildings (bastion, watchtower, palisades)
      // These affect bastion_stats instead of regular stats
      if (key === 'bastion' && buildings.bastion > 0) {
        const defense = Math.floor(5 * (isDamaged ? 0.5 : 1));
        const attack = Math.floor(3 * (isDamaged ? 0.5 : 1));
        tooltip = `+${defense} defense, +${attack} attack`;
      } else if (key === 'watchtower' && buildings.watchtower > 0) {
        const level = buildings.watchtower;
        const multiplier = isDamaged ? 0.5 : 1;
        let defense = Math.floor(1 * multiplier);
        let attack = Math.floor(5 * multiplier);
        
        if (level >= 2) {
          defense += Math.floor(2 * multiplier);
          attack += Math.floor(8 * multiplier);
        }
        if (level >= 3) {
          defense += Math.floor(3 * multiplier);
          attack += Math.floor(12 * multiplier);
        }
        if (level >= 4) {
          defense += Math.floor(4 * multiplier);
          attack += Math.floor(20 * multiplier);
        }
        
        tooltip = `+${defense} defense, +${attack} attack`;
      } else if (key === 'palisades' && buildings.palisades > 0) {
        const level = buildings.palisades;
        const multiplier = isDamaged ? 0.5 : 1;
        let defense = Math.floor(4 * multiplier);
        
        if (level >= 2) defense += Math.floor(6 * multiplier);
        if (level >= 3) defense += Math.floor(8 * multiplier);
        if (level >= 4) defense += Math.floor(10 * multiplier);
        
        tooltip = `+${defense} defense`;
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

  // Dynamically generate villager items from state
  const populationItems = Object.entries(villagers)
    .map(([key, value]) => ({
      id: key,
      label: capitalizeWords(key),
      value: value ?? 0,
      testId: `population-${key}`,
      visible: (value ?? 0) > 0,
    }))
    .filter((item) => item.visible);

  // Calculate total stats including bonuses from relics/clothing
  const totalLuck = getTotalLuck(gameState);
  const totalStrength = getTotalStrength(gameState);
  const totalKnowledge = getTotalKnowledge(gameState);
  const totalMadness = getTotalMadness(gameState);

  // Build stats items with total values
  const statsItems = [];

  // Add luck if it's greater than 0
  if (totalLuck > 0) {
    statsItems.push({
      id: "luck",
      label: "Luck",
      value: totalLuck,
      testId: "stat-luck",
      visible: true,
      icon: "☆",
      iconColor: "text-green-700",
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
      icon: "⬡",
      iconColor: "text-red-700",
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
      icon: "✧",
      iconColor: "text-blue-700/90",
    });
  }

  // Add madness if it's greater than 0
  if (totalMadness > 0) {
    statsItems.push({
      id: "madness",
      label: "Madness",
      value: totalMadness,
      testId: "stat-madness",
      visible: true,
      icon: "✺",
      iconColor: "text-violet-700/90",
    });
  }

  // Dynamically generate fortification items from state
  const fortificationItems = Object.entries(buildings)
    .map(([key, value]) => {
      // Only include fortification buildings
      if (
        ![
          "bastion",
          "watchtower",
          "palisades",
        ].includes(key)
      ) {
        return null;
      }

      if ((value ?? 0) === 0) return null;

      let label = capitalizeWords(key);
      let tooltip = undefined;

      // Map building keys to their contributions (based on bastionStats.ts logic)
      if (key === "watchtower") {
        const level = value ?? 0;
        const watchtowerLabels = ["Watchtower", "Guard Tower", "Fortified Tower", "Cannon Tower"];
        label = watchtowerLabels[level - 1] || "Watchtower";
        
        const isDamaged = story?.seen?.watchtowerDamaged;
        const multiplier = isDamaged ? 0.5 : 1;
        
        let defense = 0;
        let attack = 0;
        let integrity = 0;
        
        for (let i = 1; i <= level; i++) {
          defense += 1 + (i - 1);
          attack += 4 * i;
        }
        
        // Calculate integrity based on level
        integrity = 5; // Level 1
        if (level >= 2) integrity += 5; // Level 2
        if (level >= 3) integrity += 10; // Level 3
        if (level >= 4) integrity += 10; // Level 4
        
        // Apply damage multiplier and round down
        defense = Math.floor(defense * multiplier);
        attack = Math.floor(attack * multiplier);
        integrity = Math.floor(integrity * multiplier);
        
        tooltip = `+${defense} Defense\n+${attack} Attack\n+${integrity} Integrity`;
        
        // Add red down arrow if damaged
        if (isDamaged) {
          label += " ↓";
        }
      } else if (key === "bastion") {
        const isDamaged = story?.seen?.bastionDamaged;
        const multiplier = isDamaged ? 0.5 : 1;
        
        const defense = Math.floor(5 * multiplier);
        const attack = Math.floor(3 * multiplier);
        const integrity = Math.floor(20 * multiplier);
        
        tooltip = `+${defense} Defense\n+${attack} Attack\n+${integrity} Integrity`;
        
        // Add red down arrow if damaged
        if (isDamaged) {
          label += " ↓";
        }
      } else if (key === "palisades") {
        const palisadesLevel = value ?? 0;
        const palisadesLabels = ["Wooden Palisades", "Fortified Palisades", "Stone Wall", "Reinforced Wall"];
        label = palisadesLabels[palisadesLevel - 1] || "Wooden Palisades";
        
        const isDamaged = story?.seen?.palisadesDamaged;
        const multiplier = isDamaged ? 0.5 : 1;
        
        let defense = 0;
        let integrity = 0;
        
        if (palisadesLevel >= 1) {
          defense += 4;
          integrity += 10;
        }
        if (palisadesLevel >= 2) {
          defense += 6;
          integrity += 15;
        }
        if (palisadesLevel >= 3) {
          defense += 8;
          integrity += 25;
        }
        if (palisadesLevel >= 4) {
          defense += 10;
          integrity += 35;
        }
        
        // Apply damage multiplier and round down
        defense = Math.floor(defense * multiplier);
        integrity = Math.floor(integrity * multiplier);
        
        tooltip = `+${defense} Defense\n+${integrity} Integrity`;
        
        // Add red down arrow if damaged
        if (isDamaged) {
          label += " ↓";
        }
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
    .filter(([key]) => !["attackFromFortifications", "attackFromStrength"].includes(key)) // Exclude breakdown fields from display
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
        visible: (value ?? 0) > 0,
        tooltip,
      };
    })
    .filter((item) => item.visible);

  // Determine which sections to show based on active tab
  const shouldShowSection = (sectionName: string): boolean => {
    switch (activeTab) {
      case "cave":
        return ["resources", "tools", "weapons", "clothing", "stats"].includes(
          sectionName,
        );
      case "village":
        return ["resources", "buildings", "population"].includes(sectionName);
      case "forest":
        return ["resources", "relics", "blessings"].includes(sectionName);
      case "bastion":
        return ["resources", "fortifications", "bastion"].includes(sectionName); // Added bastion to show

      default:
        return true; // Show all sections by default
    }
  };

  return (
    <ScrollArea className="h-full max-h-full">
      <div className="pb-4 flex gap-4">
        {/* First column - Resources */}
        <div className="flex-1">
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
                  setResourceChanges((prev) => [...prev, change]);
                  // Clean up old changes after 3 seconds
                  setTimeout(() => {
                    setResourceChanges((prev) =>
                      prev.filter((c) => c.timestamp !== change.timestamp),
                    );
                  }, 3000);
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
                  <div>Defense: {bastion_stats.defense} | Attack: {bastion_stats.attack}</div>
                  {bastion_stats.integrity > 0 && (
                    <div className="mt-1">
                      Integrity: {bastion_stats.integrity}
                    </div>
                  )}
                </div>
              )}
            </SidePanelSection>
          )}
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}