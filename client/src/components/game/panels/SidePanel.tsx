import { useGameStore } from '@/game/state';
import SidePanelSection from './SidePanelSection';

export default function SidePanel() {
  const { resources, tools, buildings, villagers, story, current_population, total_population } = useGameStore();

  // Resources section
  const resourceItems = [
    {
      id: 'wood',
      label: 'Wood',
      value: resources.wood ?? 0,
      testId: 'resource-wood',
      visible: story.seen.hasWood || resources.wood > 0
    },
    {
      id: 'meat',
      label: 'Meat',
      value: resources.meat ?? 0,
      testId: 'resource-meat',
      visible: story.seen.hasMeat || resources.meat > 0
    },
    {
      id: 'torch',
      label: 'Torch',
      value: resources.torch ?? 0,
      testId: 'resource-torch',
      visible: story.seen.hasTorch || resources.torch > 0
    },
    {
      id: 'stone',
      label: 'Stone',
      value: resources.stone ?? 0,
      testId: 'resource-stone',
      visible: story.seen.hasStone || resources.stone > 0
    }
  ];

  // Tools section
  const toolItems = [
    {
      id: 'axe',
      label: 'Axe',
      value: tools.axe,
      testId: 'tool-axe',
      visible: story.seen.hasAxe || tools.axe
    },
    {
      id: 'spear',
      label: 'Spear',
      value: tools.spear ? 'Spear' : 'Spear (missing)',
      testId: 'tool-spear',
      visible: story.seen.hasSpear || tools.spear
    }
  ];

  // Buildings section
  const buildingItems = [
    {
      id: 'huts',
      label: 'Huts',
      value: buildings.huts ?? 0,
      testId: 'building-huts',
      visible: story.seen.actionBuildHut
    },
    {
      id: 'lodges',
      label: 'Lodges', 
      value: buildings.lodges ?? 0,
      testId: 'building-lodges',
      visible: story.seen.actionBuildLodge
    },
    {
      id: 'workshops',
      label: 'Workshops',
      value: buildings.workshops ?? 0,
      testId: 'building-workshops',
      visible: story.seen.actionBuildWorkshop
    }
  ];

  // Population section
  const populationItems = [
    {
      id: 'total',
      label: 'Population',
      value: `${current_population}/${total_population}`,
      testId: 'population-total',
      visible: story.seen?.hasVillagers
    },
    {
      id: 'free',
      label: 'Free',
      value: villagers.free ?? 0,
      testId: 'population-free',
      visible: story.seen?.hasVillagers
    },
    {
      id: 'gatherers',
      label: 'Gatherers',
      value: villagers.gatherers ?? 0,
      testId: 'population-gatherers',
      visible: story.seen?.hasVillagers
    },
    {
      id: 'hunters',
      label: 'Hunters',
      value: villagers.hunters ?? 0,
      testId: 'population-hunters',
      visible: story.seen?.hasVillagers
    }
  ];

  return (
    <div>
      <SidePanelSection 
        title="Resources" 
        items={resourceItems}
      />
      <SidePanelSection 
        title="Tools" 
        items={toolItems}
      />
      <SidePanelSection 
        title="Buildings" 
        items={buildingItems}
      />
      <SidePanelSection 
        title={`Population ${current_population}/${total_population}`} 
        items={populationItems.filter(item => item.id !== 'total')} 
      />
    </div>
  );
}