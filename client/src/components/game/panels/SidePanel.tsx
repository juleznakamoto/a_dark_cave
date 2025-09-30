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

// Define the type for resource changes for better type safety
type ResourceChange = {
  resource: string;
  amount: number;
  timestamp: number;
};

export default function SidePanel() {
  const {
    resources,
    buildings,
    villagers,
    current_population,
    total_population,
    activeTab,
  } = useGameStore();

  // Track resource changes for notifications
  const [resourceChanges, setResourceChanges] = useState<ResourceChange[]>([]);

  const handleResourceChange = (change: ResourceChange) => {
    setResourceChanges(prev => {
      // Keep changes from the last 5 seconds
      const fiveSecondsAgo = Date.now() - 5000;
      const recentChanges = prev.filter(c => c.timestamp > fiveSecondsAgo);
      return [...recentChanges, change];
    });

    // Clean up old changes after 5 seconds
    setTimeout(() => {
      setResourceChanges(prev =>
        prev.filter(c => c.timestamp > Date.now() - 5000)
      );
    }, 5000);
  };

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
          "watchtower",
          "woodenPalisades",
          "fortifiedPalisades",
          "stoneWall",
          "reinforcedWall",
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
          : key === "alchemistTower"
            ? "Alchemist's Tower"
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
          "woodenPalisades",
          "fortifiedPalisades",
          "stoneWall",
          "reinforcedWall",
        ].includes(key)
      ) {
        return null;
      }

      if ((value ?? 0) === 0) return null;

      let label =
        key === "woodenPalisades"
          ? "Wooden Palisades"
          : key === "fortifiedPalisades"
            ? "Fortified Palisades"
            : key === "stoneWall"
              ? "Stone Wall"
              : key === "reinforcedWall"
                ? "Reinforced Wall"
                : capitalizeWords(key);

      return {
        id: key,
        label,
        value: value ?? 0,
        testId: `fortification-${key}`,
        visible: (value ?? 0) > 0,
      };
    })
    .filter((item) => item !== null) // Remove nulls from buildings not present
    .filter((item) => {
      // Hide basic palisades when fortified are built
      if (item.id === "woodenPalisades" && buildings.fortifiedPalisades > 0) {
        return false;
      }
      // Hide stone wall when reinforced are built
      if (item.id === "stoneWall" && buildings.reinforcedWall > 0) {
        return false;
      }
      return true;
    });

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
        return ["resources", "fortifications"].includes(sectionName);

      default:
        return true; // Show all sections by default
    }
  };

  // Consolidate sections for easier mapping
  const sections = [
    { title: "Resources", items: resourceItems, className: "flex-1" },
    { title: "Tools", items: toolItems, className: "flex-1" },
    { title: "Weapons", items: weaponItems, className: "flex-1" },
    { title: "Clothing", items: clothingItems, className: "flex-1" },
    { title: "Relics", items: relicItems, className: "flex-1" },
    { title: "Buildings", items: buildingItems, className: "flex-1" },
    {
      title: `Population ${current_population}/${total_population}`,
      items: populationItems,
      className: "flex-1",
    },
    { title: "Stats", items: statsItems, className: "flex-1" },
    { title: "Fortifications", items: fortificationItems, className: "flex-1" },
  ];

  return (
    <ScrollArea className="h-full max-h-full">
      <div className="pb-4 flex gap-4">
        {sections.map((section) => {
          // Conditionally render sections based on active tab
          if (!shouldShowSection(section.title.toLowerCase())) {
            return null;
          }

          return (
            <div key={section.title} className={section.className}>
              {section.items.length > 0 && (
                <SidePanelSection
                  title={section.title}
                  items={section.items}
                  resourceChanges={resourceChanges}
                  showNotifications={true} // Always show notifications for buildings
                  onResourceChange={handleResourceChange}
                />
              )}
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}