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
  const clothingItems = Object.entries(useGameStore().clothing || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      value: 1,
      testId: `clothing-${key}`,
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
      visible: (value ?? 0) > 0
    }))
    .filter(item => item.visible);

  const totalLuck = getTotalLuck(useGameStore());

  const state = useGameStore();

  return (
    <div>
      {resourceItems.length > 0 && (
        <SidePanelSection 
          title="Resources" 
          items={resourceItems}
        />
      )}
      {/* Tools */}
      {(state.tools.stone_axe || state.tools.iron_axe || state.tools.steel_axe || state.tools.obsidian_axe ||
        state.tools.stone_pickaxe || state.tools.iron_pickaxe || state.tools.steel_pickaxe || state.tools.obsidian_pickaxe ||
        state.tools.spear || state.tools.lantern) && (
        <SidePanelSection title="Tools">
          {/* Show best axe */}
          {state.tools.obsidian_axe ? (
            <div className="text-sm">Obsidian Axe</div>
          ) : state.tools.steel_axe ? (
            <div className="text-sm">Steel Axe</div>
          ) : state.tools.iron_axe ? (
            <div className="text-sm">Iron Axe</div>
          ) : state.tools.stone_axe ? (
            <div className="text-sm">Stone Axe</div>
          ) : null}

          {/* Show best pickaxe */}
          {state.tools.obsidian_pickaxe ? (
            <div className="text-sm">Obsidian Pickaxe</div>
          ) : state.tools.steel_pickaxe ? (
            <div className="text-sm">Steel Pickaxe</div>
          ) : state.tools.iron_pickaxe ? (
            <div className="text-sm">Iron Pickaxe</div>
          ) : state.tools.stone_pickaxe ? (
            <div className="text-sm">Stone Pickaxe</div>
          ) : null}

          {/* Other tools */}
          {state.tools.spear && <div className="text-sm">Spear</div>}
          {state.tools.lantern && <div className="text-sm">Lantern</div>}
        </SidePanelSection>
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