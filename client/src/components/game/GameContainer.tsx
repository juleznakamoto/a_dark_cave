import GameTabs from "./GameTabs";
import GameFooter from "./GameFooter";
import CavePanel from "./panels/CavePanel";
import VillagePanel from "./panels/VillagePanel";
import ForestPanel from "./panels/ForestPanel";
import EstatePanel from "./panels/EstatePanel";
import BastionPanel from "./panels/BastionPanel";
import AchievementsPanel from "./panels/AchievementsPanel";
import LogPanel from "./panels/LogPanel";
import StartScreen from "./StartScreen";
import { useGameStore } from "@/game/state";
import EventDialog from "./EventDialog";
import CombatDialog from "./CombatDialog";
import IdleModeDialog from "./IdleModeDialog";
import CubeDialog from "./CubeDialog";
import InactivityDialog from "./InactivityDialog";
import { RestartGameDialog } from "./RestartGameDialog";
import { useState, useEffect, useMemo, useRef } from "react";
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav";
import { Mountain, Trees, Castle, Landmark } from "lucide-react";
import ProfileMenu from "./ProfileMenu"; // Imported ProfileMenu
import { startVersionCheck, stopVersionCheck } from "@/game/versionCheck";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";

export default function GameContainer() {
  const {
    activeTab,
    flags,
    buildings,
    relics,
    books,
    eventDialog,
    combatDialog,
    idleModeDialog,
    setActiveTab,
    setEventDialog,
    setCombatDialog,
    isPaused,
    inactivityDialogOpen,
    restartGameDialogOpen,
    setRestartGameDialogOpen,
    restartGame,
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
      setTimeout(() => setAnimatingTabs(new Set()), 3000);
    }

    prevFlagsRef.current = {
      villageUnlocked: flags.villageUnlocked,
      forestUnlocked: flags.forestUnlocked,
      estateUnlocked: estateUnlocked,
      bastionUnlocked: flags.bastionUnlocked,
    };
  }, [
    flags.villageUnlocked,
    flags.forestUnlocked,
    estateUnlocked,
    flags.bastionUnlocked,
  ]);

  // Initialize version check
  useEffect(() => {
    logger.log("[VERSION] Initializing version check from GameContainer");

    // Capture toast in closure to ensure it's available when callback fires
    const showUpdateToast = toast;

    startVersionCheck(() => {
      logger.log("[VERSION] Version check callback fired!");
      try {
        logger.log("[VERSION] Calling toast() to notify user...");
        showUpdateToast({
          title: "New Version Available",
          description:
            "A new version of the game is available. Please refresh to get the latest updates.",
          variant: "default",
          duration: 30000, // 30 seconds
          action: {
            label: "Refresh",
            onClick: () => {
              logger.log("[VERSION] User clicked refresh button");
              window.location.reload();
            },
          },
        });
        logger.log("[VERSION] ✅ Toast notification triggered successfully");
      } catch (error) {
        logger.log("[VERSION] ❌ Error triggering toast:", error);
      }
    });

    return () => {
      logger.log("[VERSION] Cleaning up version check");
      stopVersionCheck();
    };
  }, []);

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
        icon: <Castle />,
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

    // Add Achievements tab if Book of Trials is owned
    if (books?.book_of_trials) {
      tabs.push({
        id: "achievements",
        icon: <Castle />,
        label: "Achievements",
        onClick: () => setActiveTab("achievements"),
      });
    }

    // Add Merchant tab if merchant event is active
    if (eventDialog.isOpen && eventDialog.currentEvent?.id.includes("merchant")) {
      tabs.push({
        id: "merchant",
        icon: <Castle />,
        label: "Merchant",
        onClick: () => setActiveTab("merchant"),
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
    books?.book_of_trials,
    eventDialog.isOpen,
    eventDialog.currentEvent?.id,
  ]);

  // Show start screen if game hasn't started yet
  if (!flags.gameStarted) {
    return <StartScreen />;
  }

  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col">
      {/* Pause Overlay - covers everything except footer and profile menu */}
      {isPaused && (
        <div
          className="fixed inset-0 bg-black/80 z-40 pointer-events-auto overlay-fade-in"
          style={{ bottom: "45px" }}
        />
      )}

      {/* Sleep Mode Overlay - covers everything except footer and profile menu */}
      {idleModeDialog.isOpen && (
        <div
          className="fixed inset-0 bg-black/100 z-40 pointer-events-auto overlay-fade-in"
          style={{ bottom: "45px" }}
        />
      )}

      {/* Event Log - Fixed Height at Top */}
      <div className="w-full overflow-hidden pb-0 p-2 flex-shrink-0 pr-12">
        <LogPanel />
      </div>

      {/* Main Content Area - Fills remaining space */}
      <main className="flex-1 pb-0 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar for Resources - On top for mobile, left for desktop */}
        <div className="min-h-48 w-full pl-2 pr-2 md:w-[26rem] border-t md:border-r overflow-hidden">
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
                defaultActiveIndex={limelightNavItems.findIndex(
                  (item) => item.id === activeTab,
                )}
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
              <div className="flex space-x-4 pl-[3px] ">
                <button
                  className={`py-2 text-sm bg-transparent ${
                    activeTab === "cave"
                      ? "font-bold opacity-100"
                      : "opacity-60"
                  } `}
                  onClick={() => setActiveTab("cave")}
                  data-testid="tab-cave"
                >
                  Cave
                </button>

                {flags.villageUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      animatingTabs.has("village")
                        ? "tab-fade-in"
                        : activeTab === "village"
                          ? "font-bold opacity-100"
                          : "opacity-60"
                    }`}
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
                      animatingTabs.has("estate")
                        ? "tab-fade-in"
                        : activeTab === "estate"
                          ? "font-bold opacity-100"
                          : "opacity-60"
                    }`}
                    onClick={() => setActiveTab("estate")}
                    data-testid="tab-estate"
                  >
                    Estate
                  </button>
                )}

                {flags.forestUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      animatingTabs.has("forest")
                        ? "tab-fade-in"
                        : activeTab === "forest"
                          ? "font-bold opacity-100"
                          : "opacity-60"
                    }`}
                    onClick={() => setActiveTab("forest")}
                    data-testid="tab-forest"
                  >
                    Forest
                  </button>
                )}

                {flags.bastionUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      animatingTabs.has("bastion")
                        ? "tab-fade-in"
                        : activeTab === "bastion"
                          ? "font-bold opacity-100"
                          : "opacity-60"
                    }`}
                    onClick={() => setActiveTab("bastion")}
                    data-testid="tab-bastion"
                  >
                    {flags.hasFortress ? "Fortress" : "Bastion"}
                  </button>
                )}

                {/* Achievements Tab Button */}
                {books?.book_of_trials && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      animatingTabs.has("achievements")
                        ? "tab-fade-in"
                        : activeTab === "achievements"
                          ? "font-medium opacity-100"
                          : "opacity-60"
                    }`}
                    onClick={() => setActiveTab("achievements")}
                    data-testid="tab-achievements"
                  >
                    ⚜
                  </button>
                )}

                {/* Merchant Tab Button */}
                {eventDialog.isOpen && eventDialog.currentEvent?.id.includes("merchant") && (
                  <button
                    className={`py-2 text-sm bg-transparent ${
                      activeTab === "merchant"
                        ? "font-medium opacity-100"
                        : "opacity-60"
                    }`}
                    onClick={() => setActiveTab("merchant")}
                    data-testid="tab-merchant"
                  >
                    🛒
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
            {activeTab === "achievements" && <AchievementsPanel />}
            {activeTab === "merchant" && eventDialog.isOpen && eventDialog.currentEvent?.id.includes("merchant") && (
              <EventDialog
                isOpen={true}
                onClose={() => setEventDialog(false)}
                event={eventDialog.currentEvent}
                hideDialog={true}
              />
            )}
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
      {/* Only show merchant dialog overlay when NOT on merchant tab */}
      {!(activeTab === "merchant" && eventDialog.isOpen && eventDialog.currentEvent?.id.includes("merchant"))}
      <CubeDialog />
      {inactivityDialogOpen && <InactivityDialog />}

      {/* Restart Game Dialog */}
      <RestartGameDialog
        isOpen={restartGameDialogOpen}
        onClose={() => setRestartGameDialogOpen(false)}
        onRestart={restartGame}
      />

      <ProfileMenu />
    </div>
  );
}