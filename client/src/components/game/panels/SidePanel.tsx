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
      if (buildAction?.statsEffects) {
        const effects = Object.entries(buildAction.statsEffects)
          .map(([stat, value]) => `${value > 0 ? "+" : ""}${value} ${stat}`)
          .join(", ");
        if (effects) {
          tooltip = effects;
        }
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
        
        let defense = 0;
        let attack = 0;
        for (let i = 1; i <= level; i++) {
          defense += 1 + (i - 1);
          attack += 4 * i;
        }
        tooltip = `+${defense} Defense\n+${attack} Attack`;
      } else if (key === "bastion") {
        tooltip = "+5 Defense\n+3 Attack";
      } else if (key === "palisades") {
        const palisadesLevel = value ?? 0;
        const palisadesLabels = ["Wooden Palisades", "Fortified Palisades", "Stone Wall", "Reinforced Wall"];
        label = palisadesLabels[palisadesLevel - 1] || "Wooden Palisades";
        
        let defense = 0;
        if (palisadesLevel >= 1) defense += 4;
        if (palisadesLevel >= 2) defense += 6;
        if (palisadesLevel >= 3) defense += 8;
        if (palisadesLevel >= 4) defense += 10;
        tooltip = `+${defense} Defense`;
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
          tooltip = `${fortAttack} Attack from Fortifications\n${strengthAttack} Attack from Strength`;
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
        return ["resources", "relics"].includes(sectionName);
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
                  Defense: {bastion_stats.defense} | Attack: {bastion_stats.attack}
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