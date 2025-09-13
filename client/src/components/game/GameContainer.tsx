import GameTabs from './GameTabs';
import GameFooter from './GameFooter';
import CavePanel from './panels/CavePanel';
import VillagePanel from './panels/VillagePanel';
import WorldPanel from './panels/WorldPanel';
import LogPanel from './panels/LogPanel';
import StartScreen from './StartScreen';
import { useGameStore } from '@/game/state';
import EventDialog from './EventDialog';
import SidePanel from './panels/SidePanel';


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
      {/* Header */}
      <div className="border-b border-border">
        <GameTabs />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Main Game Area */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'cave' && <CavePanel />}
          {activeTab === 'village' && <VillagePanel />}
          {activeTab === 'world' && <WorldPanel />}
        </div>

        {/* Right: Log Panel */}
        <div className="w-80 border-l border-border">
          <LogPanel />
        </div>
      </div>

      {/* Footer */}
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