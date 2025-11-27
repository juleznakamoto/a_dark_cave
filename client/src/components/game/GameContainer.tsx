import GameTabs from "./GameTabs";
import GameFooter from "./GameFooter";
import CavePanel from "./panels/CavePanel";
import VillagePanel from "./panels/VillagePanel";
import ForestPanel from "./panels/ForestPanel";
import EstatePanel from "./panels/EstatePanel";
import BastionPanel from "./panels/BastionPanel";
import LogPanel from "./panels/LogPanel";
import StartScreen from "./StartScreen";
import EndScreen from "./EndScreen";
import { useGameStore } from "@/game/state";
import EventDialog from "./EventDialog";
import CombatDialog from "./CombatDialog";
import IdleModeDialog from "./IdleModeDialog";
import MerchantDialog from "./MerchantDialog";
import CubeDialog from "./CubeDialog";
import InactivityDialog from "./InactivityDialog";
import MultiTabDialog from "./MultiTabDialog";
import { useState, useEffect, useMemo, useRef } from "react";
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav";
import { Mountain, Trees, Castle, Landmark } from "lucide-react";
import { stopGameLoop } from "@/game/loop";

export default function GameContainer() {
  const {
    activeTab,
    flags,
    buildings,
    relics,
    eventDialog,
    combatDialog,
    idleModeDialog,
    setActiveTab,
    setEventDialog,
    setCombatDialog,
    setIdleModeDialog,
    isPaused,
    showEndScreen,
    devMode,
    authDialogOpen, // Added authDialogOpen to state
    shopDialogOpen, // Added shopDialogOpen to state
    inactivityDialogOpen, // Added inactivityDialogOpen to state
    multiTabDialogOpen, // Added multiTabDialogOpen to state
  } = useGameStore();

  // Estate unlocks when Dark Estate is built
  const estateUnlocked = buildings.darkEstate >= 1;

  const [animatingTabs, setAnimatingTabs] = useState<Set<string>>(new Set());

  // Track unlocked tabs to trigger fade-in animation
  const prevFlagsRef = useRef({
    villageUnlocked: flags.villageUnlocked,
    forestUnlocked: flags.forestUnlocked,
    estateUnlocked: estateUnlocked,
    bastionUnlocked: flags.bastionUnlocked,
  });

  // Track when new tabs are unlocked and trigger animations
  useEffect(() => {
    const prev = prevFlagsRef.current;
    const newAnimations = new Set<string>();

    if (!prev.villageUnlocked && flags.villageUnlocked) {
      newAnimations.add("village");
    }
    if (!prev.forestUnlocked && flags.forestUnlocked) {
      newAnimations.add("forest");
    }
    if (!prev.estateUnlocked && estateUnlocked) {
      newAnimations.add("estate");
    }
    if (!prev.bastionUnlocked && flags.bastionUnlocked) {
      newAnimations.add("bastion");
    }

    if (newAnimations.size > 0) {
      setAnimatingTabs(newAnimations);
      setTimeout(() => setAnimatingTabs(new Set()), 1000);
    }

    prevFlagsRef.current = {
      villageUnlocked: flags.villageUnlocked,
      forestUnlocked: flags.forestUnlocked,
      estateUnlocked: estateUnlocked,
      bastionUnlocked: flags.bastionUnlocked,
    };
  }, [flags.villageUnlocked, flags.forestUnlocked, estateUnlocked, flags.bastionUnlocked]);


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

    // Add Estate tab if unlocked
    if (estateUnlocked) {
      tabs.push({
        id: "estate",
        icon: <Castle />, // Consider a different icon if needed
        label: "The Estate",
        onClick: () => setActiveTab("estate"),
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
    estateUnlocked,
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
      <div className="w-full overflow-hidden pb-0 p-2 flex-shrink-0 pr-12">
        <LogPanel />
      </div>

      {/* Main Content Area - Fills remaining space */}
      <main className="flex-1 pl-2 pr-2 pb-0 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar for Resources - On top for mobile, left for desktop */}
        <div className="w-full md:w-[26rem] border-t md:border-r overflow-hidden">
          <GameTabs />
        </div>

        {/* Right Content Area with Horizontal Tabs and Actions - Below for mobile, right for desktop */}
        <section className="flex-1 md:pl-0 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Horizontal Game Tabs */}
          <nav className="border-t border-border pl-2 md:pl-4 flex-shrink-0">
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
                  } `}
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

                {/* Estate Tab Button */}
                {(estateUnlocked || buildings.darkEstate >= 1) && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      activeTab === "estate" ? "font-bold opacity-100" : "opacity-60"
                    } ${animatingTabs.has("estate") ? "tab-fade-in" : ""}`}
                    onClick={() => setActiveTab("estate")}
                    data-testid="tab-estate"
                  >
                    Estate
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
                    {flags.hasFortress ? "Fortress" : "Bastion"}
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
            {activeTab === "estate" && <EstatePanel />}
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

      {/* Idle Mode Dialog */}
      <IdleModeDialog />
      <MerchantDialog />
      <CubeDialog />
      {inactivityDialogOpen && <InactivityDialog />}
      {multiTabDialogOpen && <MultiTabDialog />}
    </div>
  );
}