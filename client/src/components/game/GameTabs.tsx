import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import ResourceDisplay from './ResourceDisplay';
import ToolsDisplay from './ToolsDisplay';

export default function GameTabs() {
  const { activeTab, setActiveTab, flags, buildings, villagers, story } = useGameStore();

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
      {(buildings.huts > 0) && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-3">Buildings</h3>
          <div className="space-y-1 px-3">
            <div className="flex justify-between items-center text-sm">
              <span>Wooden Huts</span>
              <span className="font-mono">{buildings.huts}</span>
            </div>
          </div>
        </div>
      )}

      {/* Population Section */}
      {story.seen?.hasVillagers && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-3">Population</h3>
          <div className="space-y-1 px-3">
            <div className="flex justify-between items-center text-sm">
              <span>Free Villagers</span>
              <span className="font-mono">{villagers.free}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Hunters</span>
              <span className="font-mono">{villagers.hunters}</span>
            </div>
          </div>
        </div>
      )}

      <ResourceDisplay />
      <ToolsDisplay />
    </nav>
  );
}