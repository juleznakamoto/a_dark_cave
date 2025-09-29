import { useGameStore } from '@/game/state';
import SidePanelSection from './SidePanelSection';
import ResourceChangeNotification from './ResourceChangeNotification';
import { clothingEffects, getDisplayTools, getTotalLuck, getTotalStrength, getTotalKnowledge, getTotalMadness } from '@/game/rules/effects';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { villageBuildActions } from '@/game/rules/villageBuildActions';
import { capitalizeWords } from "@/lib/utils";
import { useEffect, useRef, useState } from 'react';

export default function SidePanel() {
  const { resources, tools, buildings, villagers, current_population, total_population, activeTab  } = useGameStore();

  // Track resource changes for notifications
  const [resourceChanges, setResourceChanges] = useState<Array<{resource: string, amount: number, timestamp: number}>>([]);

  // Dynamically generate resource items from state
  const resourceItems = Object.entries(resources)
    .map(([key, value]) => ({
      id: key,
      label: capitalizeWords(key),
      value: value ?? 0,
      testId: `resource-${key}`,
      visible: (value ?? 0) > 0
    }))
    .filter(item => item.visible);

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
      visible: true
    }));

  // Dynamically generate weapon items from state (only show weapons from displayTools)
  const weaponItems = Object.entries(displayTools)
    .filter(([key, value]) => Object.keys(gameState.weapons).includes(key))
    .map(([key, value]) => ({
      id: key,
      label: capitalizeWords(key),
      value: 1,
      testId: `weapon-${key}`,
      visible: true
    }));

  // Dynamically generate clothing items from state
  const clothingItems = Object.entries(gameState.clothing || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: capitalizeWords(key),
      value: 1,
      testId: `clothing-${key}`,
      visible: true
    }));

  // Dynamically generate relic items from state
  const relicItems = Object.entries(gameState.relics || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: clothingEffects[key]?.name || capitalizeWords(key),
      value: 1,
      testId: `relic-${key}`,
      visible: true
    }));

  // Dynamically generate building items from state
  const buildingItems = Object.entries(buildings)
    .map(([key, value]) => {
      if ((value ?? 0) === 0) return null;

      let label = key === 'clerksHut' ? "Clerk's Hut" :
             key === 'alchemistTower' ? "Alchemist's Tower" :
             key === 'tradePost' ? 'Trade Post' :
             key === 'woodenPalisades' ? 'Wooden Palisades' :
             key === 'fortifiedPalisades' ? 'Fortified Palisades' :
             key === 'stoneWall' ? 'Stone Wall' :
             key === 'reinforcedWall' ? 'Reinforced Wall' :
             capitalizeWords(key);

      // Get stats effects for this specific building from villageBuildActions
      let tooltip = undefined;
      const actionId = `build${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const buildAction = villageBuildActions[actionId];
      if (buildAction?.statsEffects) {
        const effects = Object.entries(buildAction.statsEffects)
          .map(([stat, value]) => `${value > 0 ? '+' : ''}${value} ${stat}`)
          .join(', ');
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
        tooltip: tooltip
      };
    })
    .filter(item => item !== null) // Remove nulls from buildings not present
    .filter(item => {
      // Only show the highest pit level
      if (item.id === 'shallowPit' && (buildings.deepeningPit > 0 || buildings.deepPit > 0 || buildings.bottomlessPit > 0)) {
        return false;
      }
      if (item.id === 'deepeningPit' && (buildings.deepPit > 0 || buildings.bottomlessPit > 0)) {
        return false;
      }
      if (item.id === 'deepPit' && buildings.bottomlessPit > 0) {
        return false;
      }
      // Hide cabin when greatCabin is built
      if (item.id === 'cabin' && buildings.greatCabin > 0) {
        return false;
      }
      // Only show the highest religious building level
      if (item.id === 'altar' && (buildings.shrine > 0 || buildings.temple > 0 || buildings.sanctum > 0)) {
        return false;
      }
      if (item.id === 'shrine' && (buildings.temple > 0 || buildings.sanctum > 0)) {
        return false;
      }
      if (item.id === 'temple' && buildings.sanctum > 0) {
        return false;
      }
      // Hide basic palisades when fortified are built
      if (item.id === 'woodenPalisades' && buildings.fortifiedPalisades > 0) {
        return false;
      }
      // Hide stone wall when reinforced are built
      if (item.id === 'stoneWall' && buildings.reinforcedWall > 0) {
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
      visible: (value ?? 0) > 0
    }))
    .filter(item => item.visible);

  const { stats } = gameState;

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
      id: 'luck',
      label: 'Luck',
      value: totalLuck,
      testId: 'stat-luck',
      visible: true
    });
  }

  // Add strength if it's greater than 0
  if (totalStrength > 0) {
    statsItems.push({
      id: 'strength',
      label: 'Strength',
      value: totalStrength,
      testId: 'stat-strength',
      visible: true
    });
  }

  // Add knowledge if it's greater than 0
  if (totalKnowledge > 0) {
    statsItems.push({
      id: 'knowledge',
      label: 'Knowledge',
      value: totalKnowledge,
      testId: 'stat-knowledge',
      visible: true
    });
  }

  // Add madness if it's greater than 0
  if (totalMadness > 0) {
    statsItems.push({
      id: 'madness',
      label: 'Madness',
      value: totalMadness,
      testId: 'stat-madness',
      visible: true
    });
  }

  // Dynamically generate fortification items from state
  const fortificationItems = Object.entries(buildings)
    .map(([key, value]) => {
      // Only include fortification buildings
      if (!['bastion', 'watchtower', 'woodenPalisades', 'fortifiedPalisades', 'stoneWall', 'reinforcedWall'].includes(key)) {
        return null;
      }
      
      if ((value ?? 0) === 0) return null;

      let label = key === 'woodenPalisades' ? 'Wooden Palisades' :
                 key === 'fortifiedPalisades' ? 'Fortified Palisades' :
                 key === 'stoneWall' ? 'Stone Wall' :
                 key === 'reinforcedWall' ? 'Reinforced Wall' :
                 capitalizeWords(key);

      return {
        id: key,
        label,
        value: value ?? 0,
        testId: `fortification-${key}`,
        visible: (value ?? 0) > 0
      };
    })
    .filter(item => item !== null) // Remove nulls from buildings not present
    .filter(item => {
      // Hide basic palisades when fortified are built
      if (item.id === 'woodenPalisades' && buildings.fortifiedPalisades > 0) {
        return false;
      }
      // Hide stone wall when reinforced are built
      if (item.id === 'stoneWall' && buildings.reinforcedWall > 0) {
        return false;
      }
      return true;
    });

  // Determine which sections to show based on active tab
  const shouldShowSection = (sectionName: string): boolean => {
    switch (activeTab) {
      case 'cave':
        return ['resources', 'tools', 'weapons', 'clothing', 'relics', 'stats'].includes(sectionName);
      case 'village':
        return ['resources', 'buildings', 'population'].includes(sectionName);
      case 'forest':
        return ['resources'].includes(sectionName);
      case 'bastion':
        return ['resources', 'fortifications'].includes(sectionName);
      
      default:
        return true; // Show all sections by default
    }
  };

  return (
    <ScrollArea className="h-full max-h-full">
      <div className="pb-4 flex gap-4">
        {/* First column - Resources */}
        <div className="flex-1">
          {resourceItems.length > 0 && shouldShowSection('resources') && (
            <SidePanelSection
              title="Resources"
              items={resourceItems}
              onValueChange={(itemId, oldValue, newValue) => {
                console.log(`Resource ${itemId} increased from ${oldValue} to ${newValue}`);
              }}
              resourceChanges={resourceChanges}
              showNotifications={buildings.clerksHut > 0}
              onResourceChange={(change) => {
                setResourceChanges(prev => [...prev, change]);
                // Clean up old changes after 3 seconds
                setTimeout(() => {
                  setResourceChanges(prev => prev.filter(c => c.timestamp !== change.timestamp));
                }, 3000);
              }}
            />
          )}
        </div>

        {/* Second column - Everything else */}
        <div className="flex-1">
          {toolItems.length > 0 && shouldShowSection('tools') && (
            <SidePanelSection title="Tools" items={toolItems} />
          )}
          {weaponItems.length > 0 && shouldShowSection('weapons') && (
            <SidePanelSection title="Weapons" items={weaponItems} />
          )}
          {clothingItems.length > 0 && shouldShowSection('clothing') && (
            <SidePanelSection title="Clothing" items={clothingItems} />
          )}
          {relicItems.length > 0 && shouldShowSection('relics') && (
            <SidePanelSection title="Relics" items={relicItems} />
          )}
          {buildingItems.length > 0 && shouldShowSection('buildings') && (
            <SidePanelSection title="Buildings" items={buildingItems} />
          )}
          {populationItems.length > 0 && shouldShowSection('population') && (
            <SidePanelSection
              title={`Population ${current_population}/${total_population}`}
              items={populationItems}
            />
          )}
          {statsItems.length > 0 && shouldShowSection('stats') && (
            <SidePanelSection
              title="Stats"
              items={statsItems}
              className="mb-4"
            />
          )}
          {fortificationItems.length > 0 && shouldShowSection('fortifications') && (
            <SidePanelSection
              title="Fortifications"
              items={fortificationItems}
              className="mb-4"
            />
          )}
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}