import GameTabs from './GameTabs';
import GameFooter from './GameFooter';
import CavePanel from './panels/CavePanel';
import VillagePanel from './panels/VillagePanel';
import WorldPanel from './panels/WorldPanel';
import LogPanel from './LogPanel';
import { useGameStore } from '@/game/state';

export default function GameContainer() {
  const { activeTab } = useGameStore();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      <main className="flex-1 p-6">
        {/* Event Log - Full Width at Top */}
        <div className="w-full mb-6">
          <LogPanel />
        </div>

        {/* Main Content Area - Sidebar and Panel */}
        <div className="flex">
          <GameTabs />

          <section className="flex-1 pl-6 overflow-y-auto">
            {activeTab === 'cave' && <CavePanel />}
            {activeTab === 'village' && <VillagePanel />}
            {activeTab === 'world' && <WorldPanel />}
          </section>
        </div>
      </main>

      <GameFooter />
    </div>
  );
}