import GameHeader from './GameHeader';
import GameTabs from './GameTabs';
import CavePanel from './CavePanel';
import VillagePanel from './VillagePanel';
import WorldPanel from './WorldPanel';
import GameFooter from './GameFooter';
import { useGameStore } from '@/game/state';

export default function GameContainer() {
  const { activeTab } = useGameStore();

  return (
    <div className="h-screen flex flex-col max-w-4xl mx-auto">
      <GameHeader />
      
      <main className="flex-1 flex">
        <GameTabs />
        
        <section className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'cave' && <CavePanel />}
          {activeTab === 'village' && <VillagePanel />}
          {activeTab === 'world' && <WorldPanel />}
        </section>
      </main>
      
      <GameFooter />
    </div>
  );
}
