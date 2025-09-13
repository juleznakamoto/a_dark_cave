import { useGameStore } from '@/game/state';
import SidePanelSection from './SidePanelSection';
import { getTotalLuck } from '@/game/effects';

export default function SidePanel() {
  const { resources, tools, buildings, villagers, current_population, total_population } = useGameStore();

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

  // Dynamically generate tool items from state
  const toolItems = Object.entries(tools)
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      value: 1,
      testId: `tool-${key}`,
      visible: true
    }));

  // Dynamically generate clothing items from state
  const clothingItems = Object.entries(resources) // Assuming clothing is a type of resource for now
    .filter(([key]) => ['fur', 'leather'].includes(key)) // Filter for clothing-related resources
    .map(([key, value]) => ({
      id: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: value ?? 0,
      testId: `clothing-${key}`,
      visible: (value ?? 0) > 0
    }))
    .filter(item => item.visible);


  // Dynamically generate building items from state
  const buildingItems = Object.entries(buildings)
    .map(([key, value]) => ({
      id: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: value ?? 0,
      testId: `building-${key}`,
      visible: (value ?? 0) > 0
    }))
    .filter(item => item.visible);

  // Dynamically generate villager items from state
  const populationItems = Object.entries(villagers)
    .map(([key, value]) => ({
      id: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: value ?? 0,
      testId: `population-${key}`,
      visible: (value ?? 0) > 0
    }))
    .filter(item => item.visible);

  const totalLuck = getTotalLuck(useGameStore());

  return (
    <div>
      {resourceItems.length > 0 && (
        <SidePanelSection 
          title="Resources" 
          items={resourceItems}
        />
      )}
      {toolItems.length > 0 && (
        <SidePanelSection title="Tools" items={toolItems} />
      )}
      {clothingItems.length > 0 && (
        <SidePanelSection title="Clothing" items={clothingItems} />
      )}
      {buildingItems.length > 0 && (
        <SidePanelSection title="Buildings" items={buildingItems} />
      )}
      {populationItems.length > 0 && (
        <SidePanelSection 
          title={`Population ${current_population}/${total_population}`} 
          items={populationItems}
        />
      )}
      {totalLuck > 0 && (
        <SidePanelSection 
          title="Stats" 
          items={[
            {
              id: 'luck',
              label: 'Luck',
              value: totalLuck,
              testId: 'stat-luck',
              visible: true
            }
          ]}
          className="mb-4"
        />
      )}
    </div>
  );
}