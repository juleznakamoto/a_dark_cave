import GameTabs from './GameTabs';
import GameFooter from './GameFooter';
import CavePanel from './CavePanel';
import VillagePanel from './VillagePanel';
import WorldPanel from './WorldPanel';
import LogPanel from './LogPanel';
import { useGameStore } from '@/game/state';

export default function GameContainer() {
  const { activeTab } = useGameStore();

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'cave':
        return <CavePanel />;
      case 'village':
        return <VillagePanel />;
      case 'world':
        return <WorldPanel />;
      default:
        return <CavePanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

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