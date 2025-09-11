import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import SidePanel from './panels/SidePanel';

export default function GameTabs() {
  const { activeTab, setActiveTab, flags } = useGameStore();

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

      <SidePanel />
    </nav>
  );
}