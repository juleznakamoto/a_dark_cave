import GameTabs from './GameTabs';
import GameFooter from './GameFooter';
import CavePanel from './panels/CavePanel';
import VillagePanel from './panels/VillagePanel';
import ForestPanel from './panels/ForestPanel';
import BastionPanel from './panels/BastionPanel'; // Import BastionPanel
import LogPanel from './panels/LogPanel';
import StartScreen from './StartScreen';
import { useGameStore } from '@/game/state';
import EventDialog from "./EventDialog";
import CombatDialog from "./CombatDialog";
import { useState, useEffect, useMemo } from 'react';
import { LimelightNav, NavItem } from '@/components/ui/limelight-nav';
import { Mountain, Home, Trees, Shield } from 'lucide-react';

export default function GameContainer() {
  const { 
    activeTab, 
    flags,
    buildings,
    eventDialog,
    combatDialog,
    setActiveTab,
    setEventDialog,
    setCombatDialog,
    addLogEntry,
  } = useGameStore();
  const [animatingTabs, setAnimatingTabs] = useState<Set<string>>(new Set());
  const [previousFlags, setPreviousFlags] = useState(flags);

  // Track when new tabs are unlocked and trigger animations
  useEffect(() => {
    const newlyUnlocked: string[] = [];

    if (flags.villageUnlocked && !previousFlags.villageUnlocked) {
      newlyUnlocked.push('village');
    }
    if (flags.forestUnlocked && !previousFlags.forestUnlocked) {
      newlyUnlocked.push('forest');
    }
    // Check for Bastion unlock condition
    if (flags.bastionUnlocked && !previousFlags.bastionUnlocked) {
      newlyUnlocked.push('bastion');
    }


    if (newlyUnlocked.length > 0) {
      setAnimatingTabs(new Set(newlyUnlocked));

      // Remove animation class after animation completes
      setTimeout(() => {
        setAnimatingTabs(new Set());
      }, 800);
    }

    setPreviousFlags(flags);
  }, [flags, previousFlags]);

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
          <div className="w-96 border-t border-r">
            <GameTabs />
          </div>

          {/* Right Content Area with Horizontal Tabs and Actions */}
          <section className="flex-1 pl-0 flex flex-col">
            {/* Horizontal Game Tabs - Switch design based on wooden huts */}
            <nav className="border-t border-border pl-6 mb-4 pt-4">
              {buildings.woodenHut >= 5 ? (
                // New LimelightNav design (5+ wooden huts)
                <LimelightNav
                  items={useMemo(() => {
                    const tabs: NavItem[] = [
                      {
                        id: 'cave',
                        icon: <Mountain />,
                        label: 'The Cave',
                        onClick: () => setActiveTab('cave')
                      }
                    ];

                    if (flags.villageUnlocked) {
                      tabs.push({
                        id: 'village',
                        icon: <Home />,
                        label: buildings.stoneHut >= 5 ? "The City" : "The Village",
                        onClick: () => setActiveTab('village')
                      });
                    }

                    if (flags.forestUnlocked) {
                      tabs.push({
                        id: 'forest',
                        icon: <Trees />,
                        label: 'The Forest',
                        onClick: () => setActiveTab('forest')
                      });
                    }

                    if (flags.bastionUnlocked) {
                      tabs.push({
                        id: 'bastion',
                        icon: <Shield />,
                        label: 'The Bastion',
                        onClick: () => setActiveTab('bastion')
                      });
                    }

                    return tabs;
                  }, [flags.villageUnlocked, flags.forestUnlocked, flags.bastionUnlocked, buildings.stoneHut])}
                  defaultActiveIndex={0}
                  onTabChange={(index) => {
                    const tabIds = ['cave'];
                    if (flags.villageUnlocked) tabIds.push('village');
                    if (flags.forestUnlocked) tabIds.push('forest');
                    if (flags.bastionUnlocked) tabIds.push('bastion');
                    setActiveTab(tabIds[index] as any);
                  }}
                  className="bg-transparent border-0"
                />
              ) : (
                // Old simple button design (less than 5 wooden huts)
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('cave')}
                    className={`px-4 py-2 rounded transition-colors ${
                      activeTab === 'cave'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card hover:bg-accent'
                    }`}
                  >
                    The Cave
                  </button>
                  {flags.villageUnlocked && (
                    <button
                      onClick={() => setActiveTab('village')}
                      className={`px-4 py-2 rounded transition-colors ${
                        activeTab === 'village'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card hover:bg-accent'
                      } ${animatingTabs.has('village') ? 'animate-pulse' : ''}`}
                    >
                      {buildings.stoneHut >= 5 ? "The City" : "The Village"}
                    </button>
                  )}
                  {flags.forestUnlocked && (
                    <button
                      onClick={() => setActiveTab('forest')}
                      className={`px-4 py-2 rounded transition-colors ${
                        activeTab === 'forest'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card hover:bg-accent'
                      } ${animatingTabs.has('forest') ? 'animate-pulse' : ''}`}
                    >
                      The Forest
                    </button>
                  )}
                  {flags.bastionUnlocked && (
                    <button
                      onClick={() => setActiveTab('bastion')}
                      className={`px-4 py-2 rounded transition-colors ${
                        activeTab === 'bastion'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card hover:bg-accent'
                      } ${animatingTabs.has('bastion') ? 'animate-pulse' : ''}`}
                    >
                      The Bastion
                    </button>
                  )}
                </div>
              )}
            </nav>

            {/* Action Panels */}
            <div className="flex-1 overflow-y-auto pl-6">
              {activeTab === 'cave' && <CavePanel />}
              {activeTab === 'village' && <VillagePanel />}
              {activeTab === 'forest' && <ForestPanel />}
              {activeTab === 'bastion' && <BastionPanel />} {/* Render BastionPanel */}
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

      {/* Combat Dialog */}
      <CombatDialog
        isOpen={combatDialog.isOpen}
        onClose={() => setCombatDialog(false)}
        combat={combatDialog.currentCombat}
      />
    </div>
  );
}