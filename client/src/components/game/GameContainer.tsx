
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
          <div className="w-48 border-r border-border pr-6">
            <GameTabs />
          </div>

          {/* Right Content Area with Horizontal Tabs and Actions */}
          <section className="flex-1 pl-6 flex flex-col">
            {/* Horizontal Game Tabs */}
            <nav className="border-b border-border mb-6">
              <div className="flex space-x-1 p-1">
                <button
                  className={`px-4 py-2 text-sm bg-transparent hover:bg-accent rounded-sm ${
                    activeTab === "cave" ? "font-bold border-b-2 border-primary" : ""
                  }`}
                  onClick={() => setActiveTab("cave")}
                  data-testid="tab-cave"
                >
                  The Cave
                </button>

                {flags.villageUnlocked && (
                  <button
                    className={`px-4 py-2 text-sm bg-transparent hover:bg-accent rounded-sm ${
                      activeTab === "village" ? "font-bold border-b-2 border-primary" : ""
                    }`}
                    onClick={() => setActiveTab("village")}
                    data-testid="tab-village"
                  >
                    The Village
                  </button>
                )}

                {flags.forestUnlocked && (
                  <button
                    className={`px-4 py-2 text-sm bg-transparent hover:bg-accent rounded-sm ${
                      activeTab === "forest" ? "font-bold border-b-2 border-primary" : ""
                    }`}
                    onClick={() => setActiveTab("forest")}
                    data-testid="tab-forest"
                  >
                    The Forest
                  </button>
                )}

                {flags.worldDiscovered && (
                  <button
                    className={`px-4 py-2 text-sm bg-transparent hover:bg-accent rounded-sm ${
                      activeTab === "world" ? "font-bold border-b-2 border-primary" : ""
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
            <div className="flex-1 overflow-y-auto">
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
