import GameTabs from "./GameTabs";
import GameFooter from "./GameFooter";
import CavePanel from "./panels/CavePanel";
import VillagePanel from "./panels/VillagePanel";
import ForestPanel from "./panels/ForestPanel";
import BastionPanel from "./panels/BastionPanel";
import LogPanel from "./panels/LogPanel";
import StartScreen from "./StartScreen";
import EndScreen from "./EndScreen";
import { useGameStore } from "@/game/state";
import EventDialog from "./EventDialog";
import CombatDialog from "./CombatDialog";
import { useState, useEffect, useMemo } from "react";
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav";
import { Mountain, Trees, Castle, Landmark } from "lucide-react";
import { stopGameLoop } from "@/game/loop";

export default function GameContainer() {
  const activeTab = useGameStore((state) => state.activeTab);
  const flags = useGameStore((state) => state.flags);
  const buildings = useGameStore((state) => state.buildings);
  const relics = useGameStore((state) => state.relics);
  const eventDialog = useGameStore((state) => state.eventDialog);
  const combatDialog = useGameStore((state) => state.combatDialog);
  const setActiveTab = useGameStore((state) => state.setActiveTab);
  const setEventDialog = useGameStore((state) => state.setEventDialog);
  const setCombatDialog = useGameStore((state) => state.setCombatDialog);
  const isPaused = useGameStore((state) => state.isPaused);
  const showEndScreen = useGameStore((state) => state.showEndScreen);
  const [animatingTabs, setAnimatingTabs] = useState<Set<string>>(new Set());
  const [previousFlags, setPreviousFlags] = useState(flags);

  // Track when new tabs are unlocked and trigger animations
  useEffect(() => {
    const newlyUnlocked: string[] = [];

    if (flags.villageUnlocked && !previousFlags.villageUnlocked) {
      newlyUnlocked.push("village");
    }
    if (flags.forestUnlocked && !previousFlags.forestUnlocked) {
      newlyUnlocked.push("forest");
    }
    // Check for Bastion unlock condition
    if (flags.bastionUnlocked && !previousFlags.bastionUnlocked) {
      newlyUnlocked.push("bastion");
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

  // Stop game loop when end screen is shown
  useEffect(() => {
    if (showEndScreen) {
      stopGameLoop();
    }
  }, [showEndScreen]);

  // Determine whether to use LimelightNav (always call this hook)
  const useLimelightNav = relics.odd_bracelet;

  // Build nav items (always call this hook)
  const limelightNavItems = useMemo(() => {
    const tabs: NavItem[] = [
      {
        id: "cave",
        icon: <Mountain />,
        label: "The Cave",
        onClick: () => setActiveTab("cave"),
      },
    ];

    if (flags.villageUnlocked) {
      tabs.push({
        id: "village",
        icon: <Landmark />,
        label: buildings.stoneHut >= 5 ? "The City" : "The Village",
        onClick: () => setActiveTab("village"),
      });
    }

    if (flags.forestUnlocked) {
      tabs.push({
        id: "forest",
        icon: <Trees />,
        label: "The Forest",
        onClick: () => setActiveTab("forest"),
      });
    }

    if (flags.bastionUnlocked) {
      tabs.push({
        id: "bastion",
        icon: <Castle />,
        label: "The Bastion",
        onClick: () => setActiveTab("bastion"),
      });
    }

    return tabs;
  }, [
    flags.villageUnlocked,
    flags.forestUnlocked,
    flags.bastionUnlocked,
    buildings.stoneHut,
    setActiveTab,
  ]);

  // Show start screen if game hasn't started yet
  if (!flags.gameStarted) {
    return <StartScreen />;
  }

  // Show end screen if game has ended
  if (showEndScreen) {
    return <EndScreen />;
  }

  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col">
      {/* Pause Overlay - covers everything except footer */}
      {isPaused && (
        <div
          className="fixed inset-0 bg-black/70 z-40 pointer-events-auto"
          style={{ bottom: '45px' }}
        />
      )}

      {/* Event Log - Fixed Height at Top */}
      <div className="w-full overflow-hidden p-2 flex-shrink-0">
        <LogPanel />
      </div>

      {/* Main Content Area - Fills remaining space */}
      <main className="flex-1 p-2 pt-0 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar for Resources - On top for mobile, left for desktop */}
        <div className="w-full md:w-[26rem] border-t md:border-r  overflow-hidden">
          <GameTabs />
        </div>

        {/* Right Content Area with Horizontal Tabs and Actions - Below for mobile, right for desktop */}
        <section className="flex-1 md:pl-0 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Horizontal Game Tabs */}
          <nav className="border-t border-border pl-2 md:pl-4 mb-2 flex-shrink-0">
            {useLimelightNav ? (
              // Alternative LimelightNav design
              <LimelightNav
                items={limelightNavItems}
                defaultActiveIndex={limelightNavItems.findIndex(item => item.id === activeTab)}
                onTabChange={(index) => {
                  const selectedTab = limelightNavItems[index];
                  if (selectedTab && selectedTab.onClick) {
                    selectedTab.onClick();
                  }
                }}
                className="bg-transparent border-0"
              />
            ) : (
              // Standard button design
              <div className="flex space-x-4">
                <button
                  className={`py-2 text-sm bg-transparent ${
                    activeTab === "cave" ? "font-bold opacity-100" : "opacity-60"
                  }`}
                  onClick={() => setActiveTab("cave")}
                  data-testid="tab-cave"
                >
                  Cave
                </button>

                {flags.villageUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      activeTab === "village" ? "font-bold opacity-100" : "opacity-60"
                    } ${animatingTabs.has("village") ? "tab-fade-in" : ""}`}
                    onClick={() => setActiveTab("village")}
                    data-testid="tab-village"
                  >
                    {buildings.stoneHut >= 5 ? "City" : "Village"}
                  </button>
                )}

                {flags.forestUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      activeTab === "forest" ? "font-bold opacity-100" : "opacity-60"
                    } ${animatingTabs.has("forest") ? "tab-fade-in" : ""}`}
                    onClick={() => setActiveTab("forest")}
                    data-testid="tab-forest"
                  >
                    Forest
                  </button>
                )}

                {flags.bastionUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      activeTab === "bastion" ? "font-bold opacity-100" : "opacity-60"
                    } ${animatingTabs.has("bastion") ? "tab-fade-in" : ""}`}
                    onClick={() => setActiveTab("bastion")}
                    data-testid="tab-bastion"
                  >
                    Bastion
                  </button>
                )}
              </div>
            )}
          </nav>

          {/* Action Panels */}
          <div className="flex-1 overflow-auto pl-2 md:pl-4 min-h-0">

            {activeTab === "cave" && <CavePanel />}
            {activeTab === "village" && <VillagePanel />}
            {activeTab === "forest" && <ForestPanel />}
            {activeTab === "bastion" && <BastionPanel />}
          </div>
        </section>
      </main>

      {/* Footer - Fixed at Bottom */}
      <div className="flex-shrink-0">
        <GameFooter />
      </div>

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