import { useGameStore } from '@/game/state';
import SidePanelSection from './SidePanelSection';

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
      visible: current_population > 0
    }))
    .filter(item => item.visible);

  return (
    <div>
      {resourceItems.length > 0 && (
        <SidePanelSection 
          title="Resources" 
          items={resourceItems}
        />
      )}
      {toolItems.length > 0 && (
        <SidePanelSection 
          title="Tools" 
          items={toolItems}
        />
      )}
      {buildingItems.length > 0 && (
        <SidePanelSection 
          title="Buildings" 
          items={buildingItems}
        />
      )}
      {populationItems.length > 0 && (
        <SidePanelSection 
          title={`Population ${current_population}/${total_population}`} 
          items={populationItems}
        />
      )}
    </div>
  );
}