import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import SidePanel from './panels/SidePanel'; // Assuming SidePanel is now in the same directory or adjust path as needed
import { useEffect } from 'react';

export default function GameTabs() {
  const { activeTab, setActiveTab, flags, buildings, villagers, story, current_population, total_population, updatePopulation } = useGameStore();

  // Update population whenever the component renders
  useEffect(() => {
    updatePopulation();
  }, [villagers, buildings.huts, updatePopulation]);

  return (
    <nav className="w-48 border-r border-border bg-muted/30">
      <div className="p-4">
        <div className="space-y-2">
          <Button
            variant={activeTab === 'cave' ? 'default' : 'ghost'}
            className="w-full justify-start text-sm"
            onClick={() => setActiveTab('cave')}
            data-testid="tab-cave"
          >
            The Cave
          </Button>

          {flags.villageUnlocked && (
            <Button
              variant={activeTab === 'village' ? 'default' : 'ghost'}
              className="w-full justify-start text-sm"
              onClick={() => setActiveTab('village')}
              data-testid="tab-village"
            >
              The Village
            </Button>
          )}

          {flags.worldDiscovered && (
            <Button
              variant={activeTab === 'world' ? 'default' : 'ghost'}
              className="w-full justify-start text-sm"
              onClick={() => setActiveTab('world')}
              data-testid="tab-world"
            >
              The World
            </Button>
          )}
        </div>
      </div>

      {/* Buildings Section */}
      {(buildings.huts > 0 || buildings.lodges > 0) && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-3">Buildings</h3>
          <div className="space-y-1 px-3">
            {buildings.huts > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span>Wooden Huts</span>
                <span className="font-mono">{buildings.huts}</span>
              </div>
            )}
            {buildings.lodges > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span>Lodges</span>
                <span className="font-mono">{buildings.lodges}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Population Section */}
      {story.seen?.hasVillagers && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-3">
            Population ({current_population}/{total_population})
          </h3>
          <div className="space-y-1 px-3">
            <div className="flex justify-between items-center text-sm">
              <span>Villagers</span>
              <span className="font-mono">{villagers.free}</span>
            </div>
            {villagers.gatherers > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span>Gatherers</span>
                <span className="font-mono">{villagers.gatherers}</span>
              </div>
            )}
            {villagers.hunters > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span>Hunters</span>
                <span className="font-mono">{villagers.hunters}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <SidePanel />
    </nav>
  );
}