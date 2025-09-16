
import GameTabs from './GameTabs';
import GameFooter from './GameFooter';
import CavePanel from './panels/CavePanel';
import VillagePanel from './panels/VillagePanel';
import WorldPanel from './panels/WorldPanel';
import LogPanel from './panels/LogPanel';
import StartScreen from './StartScreen';
import { useGameStore } from '@/game/state';
import EventDialog from './EventDialog';

export default function GameContainer() {
  const { activeTab, flags, eventDialog, setEventDialog } = useGameStore();

  // Show start screen if game hasn't started yet
  if (!flags.gameStarted) {
    return (
      <>
        <StartScreen />
        <GameFooter />
      </>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">

      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        {/* Event Log - Full Width at Top */}
        <div className="w-full mb-6">
          <LogPanel />
        </div>

        {/* Main Content Area - Sidebar and Panel */}
        <div className="flex flex-1 min-h-0">
          <GameTabs />

          <section className="flex-1 pl-6 overflow-y-auto">
            {activeTab === 'cave' && <CavePanel />}
            {activeTab === 'village' && <VillagePanel />}
            {activeTab === 'world' && <WorldPanel />}
          </section>
        </div>
      </main>

      <GameFooter />

      {/* Event Dialog */}
      <EventDialog
        isOpen={eventDialog.isOpen}
        onClose={() => setEventDialog(false)}
        event={eventDialog.currentEvent}
      />
    </div>
  );
}
