import { useGameStore } from '@/game/state';
import SidePanelSection from './SidePanelSection';
import { clothingEffects, getDisplayTools, getTotalLuck, getTotalStrength, getTotalKnowledge } from '@/game/rules/effects';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function SidePanel() {
  const { resources, tools, buildings, villagers, current_population, total_population, activeTab } = useGameStore();

  // Dynamically generate resource items from state
  const resourceItems = Object.entries(resources)
    .map(([key, value]) => ({
      id: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
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
      label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      value: 1,
      testId: `tool-${key}`,
      visible: true
    }));

  // Dynamically generate weapon items from state (only show weapons from displayTools)
  const weaponItems = Object.entries(displayTools)
    .filter(([key, value]) => Object.keys(gameState.weapons).includes(key))
    .map(([key, value]) => ({
      id: key,
      label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      value: 1,
      testId: `weapon-${key}`,
      visible: true
    }));

  // Dynamically generate clothing items from state
  const clothingItems = Object.entries(gameState.clothing || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      value: 1,
      testId: `clothing-${key}`,
      visible: true
    }));

  // Dynamically generate relic items from state
  const relicItems = Object.entries(gameState.relics || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => {
      let label = clothingEffects[key]?.name || key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      // Special case for bone_totem to display as "Bone Totem"
      if (key === 'bone_totem') {
        label = 'Bone Totem';
      }
      
      return {
        id: key,
        label,
        value: 1,
        testId: `relic-${key}`,
        visible: true
      };
    });


  // Dynamically generate building items from state
  const buildingItems = Object.entries(buildings)
    .map(([key, value]) => {
      let label = key.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      // Special naming for pit building levels
      if (key === 'pit' && value > 0) {
        const pitNames = ['', 'Shallow Pit', 'Deepening Pit', 'Deep Pit', 'Bottomless Pit'];
        label = pitNames[value] || 'Pit';
      }
      
      return {
        id: key,
        label,
        value: value ?? 0,
        testId: `building-${key}`,
        visible: (value ?? 0) > 0
      };
    })
    .filter(item => item.visible);

  // Dynamically generate villager items from state
  const populationItems = Object.entries(villagers)
    .map(([key, value]) => ({
      id: key,
      label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
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

  // Determine which sections to show based on active tab
  const shouldShowSection = (sectionName: string): boolean => {
    switch (activeTab) {
      case 'cave':
        return ['resources', 'tools', 'weapons', 'clothing', 'relics', 'stats'].includes(sectionName);
      case 'village':
        return ['resources', 'buildings', 'population'].includes(sectionName);
      case 'forest':
        return ['resources'].includes(sectionName);
      case 'world':
        return ['resources', 'tools', 'weapons', 'clothing', 'relics', 'buildings', 'population', 'stats'].includes(sectionName);
      default:
        return true; // Show all sections by default
    }
  };

  return (
    <ScrollArea className="h-full max-h-full">
      <div className="pb-4">
        {resourceItems.length > 0 && shouldShowSection('resources') && (
          <SidePanelSection 
            title="Resources" 
            items={resourceItems}
            onValueChange={(itemId, oldValue, newValue) => {
              console.log(`Resource ${itemId} increased from ${oldValue} to ${newValue}`);
            }}
          />
        )}
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
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}