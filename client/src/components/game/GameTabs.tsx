import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useGameStore } from '@/game/state';
import ResourceDisplay from './ResourceDisplay';
import ToolsDisplay from './ToolsDisplay';
import { useEffect } from 'react';

export default function GameTabs() {
  const { activeTab, setActiveTab, flags, buildings, villagers, story, current_population, total_population, updatePopulation } = useGameStore();

  // Update population whenever the component renders
  useEffect(() => {
    updatePopulation();
  }, [villagers, buildings.huts, updatePopulation]);

  const tabs = [
    { id: 'cave', label: 'Cave', visible: true },
    { id: 'village', label: 'Village', visible: flags.villageUnlocked },
    { id: 'world', label: 'World', visible: flags.worldDiscovered },
  ];

  return (
    <Sidebar side="left" variant="sidebar" className="w-48">
      <SidebarHeader className="p-4">
        <div className="space-y-2">
          <ResourceDisplay />
          <ToolsDisplay />
          {story.seen.hasVillagers && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Population: {current_population}/{total_population}</div>
              <div>Free: {villagers.free}</div>
              {villagers.gatherers > 0 && <div>Gatherers: {villagers.gatherers}</div>}
              {villagers.hunters > 0 && <div>Hunters: {villagers.hunters}</div>}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {tabs.filter(tab => tab.visible).map((tab) => (
            <SidebarMenuItem key={tab.id}>
              <SidebarMenuButton
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full justify-start"
              >
                {tab.label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}