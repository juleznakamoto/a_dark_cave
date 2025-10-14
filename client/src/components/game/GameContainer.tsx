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
            {/* Horizontal Game Tabs using LimelightNav */}
            <nav className="border-t border-border pl-6 mb-4 pt-4">
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