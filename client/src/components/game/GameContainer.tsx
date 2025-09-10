import GameTabs from './GameTabs';
import GameFooter from './GameFooter';
import CavePanel from './CavePanel';
import VillagePanel from './VillagePanel';
import WorldPanel from './WorldPanel';
import LogPanel from './LogPanel';
import GameHeader from './GameHeader';
import { useGameStore } from '@/game/state';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

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
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen flex flex-col bg-background">
        <GameHeader />
        <div className="flex-1 flex overflow-hidden">
          <GameTabs />
          <SidebarInset>
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-6 overflow-auto">
                {renderActivePanel()}
              </div>
              <LogPanel />
            </div>
          </SidebarInset>
        </div>
        <GameFooter />
      </div>
    </SidebarProvider>
  );
}