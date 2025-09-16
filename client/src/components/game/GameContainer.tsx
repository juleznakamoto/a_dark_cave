
import GameTabs from './GameTabs';
import GameFooter from './GameFooter';
import CavePanel from './panels/CavePanel';
import VillagePanel from './panels/VillagePanel';
import ForestPanel from './panels/ForestPanel';
import WorldPanel from './panels/WorldPanel';
import LogPanel from './panels/LogPanel';
import StartScreen from './StartScreen';
import { useGameStore } from '@/game/state';
import EventDialog from './EventDialog';

export default function GameContainer() {
  const { activeTab, setActiveTab, flags, eventDialog, setEventDialog } = useGameStore();

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
          {/* Left Sidebar for Resources */}
          <div className="w-48 border-r">
            <GameTabs />
          </div>

          {/* Right Content Area with Horizontal Tabs and Actions */}
          <section className="flex-1 pl-0 flex flex-col">
            {/* Horizontal Game Tabs */}
            <nav className="border-t border-border pl-6 mb-4">
              <div className="flex space-x-4">
                <button
                  className={`py-2 text-sm bg-transparent ${
                    activeTab === "cave" ? "font-bold " : ""
                  }`}
                  onClick={() => setActiveTab("cave")}
                  data-testid="tab-cave"
                >
                  The Cave
                </button>

                {flags.villageUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      activeTab === "village" ? "font-bold " : ""
                    }`}
                    onClick={() => setActiveTab("village")}
                    data-testid="tab-village"
                  >
                    The Village
                  </button>
                )}

                {flags.forestUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      activeTab === "forest" ? "font-bold " : ""
                    }`}
                    onClick={() => setActiveTab("forest")}
                    data-testid="tab-forest"
                  >
                    The Forest
                  </button>
                )}

                {flags.worldDiscovered && (
                  <button
                    className={` py-2 text-sm bg-transparent ${
                      activeTab === "world" ? "font-bold " : ""
                    }`}
                    onClick={() => setActiveTab("world")}
                    data-testid="tab-world"
                  >
                    The World
                  </button>
                )}
              </div>
            </nav>

            {/* Action Panels */}
            <div className="flex-1 overflow-y-auto pl-6">
              {activeTab === 'cave' && <CavePanel />}
              {activeTab === 'village' && <VillagePanel />}
              {activeTab === 'forest' && <ForestPanel />}
              {activeTab === 'world' && <WorldPanel />}
            </div>
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
