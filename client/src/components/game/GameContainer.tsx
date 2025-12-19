import GameTabs from "./GameTabs";
import GameFooter from "./GameFooter";
import CavePanel from "./panels/CavePanel";
import VillagePanel from "./panels/VillagePanel";
import ForestPanel from "./panels/ForestPanel";
import EstatePanel from "./panels/EstatePanel";
import BastionPanel from "./panels/BastionPanel";
import MerchantPanel from "./panels/MerchantPanel"; // Import MerchantPanel
import AchievementsPanel from "./panels/AchievementsPanel";
import LogPanel from "./panels/LogPanel";
import StartScreen from "./StartScreen";
import { useGameStore } from "@/game/state";
import EventDialog from "./EventDialog";
import CombatDialog from "./CombatDialog";
import IdleModeDialog from "./IdleModeDialog";
import MerchantDialog from "./MerchantDialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import { cn } from "@/lib/utils"; // Import cn for conditional class names

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
    merchantTab, // Get merchantTab state
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
    merchantUnlocked: merchantTab.isOpen, // Track merchant tab state
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
    // Add animation trigger for merchant tab
    if (!prev.merchantUnlocked && merchantTab.isOpen) {
      newAnimations.add("merchant");
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
      merchantUnlocked: merchantTab.isOpen, // Update tracked merchant tab state
    };
  }, [
    flags.villageUnlocked,
    flags.forestUnlocked,
    estateUnlocked,
    flags.bastionUnlocked,
    merchantTab.isOpen, // Add merchantTab.isOpen to dependency array
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

    // Add Merchant tab if merchantTab is open
    if (merchantTab.isOpen) {
      tabs.push({
        id: "merchant",
        icon: <Castle />, // Placeholder icon, change as needed
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
    merchantTab.isOpen, // Include merchantTab.isOpen in dependencies
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
              // Standard button design using Tabs component
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as any)} // Cast to any for simplicity, consider stricter typing
                className="w-full"
              >
                <TabsList className="bg-transparent p-0 h-auto flex space-x-4 pl-[3px] border-b border-border">
                  <TabsTrigger
                    value="cave"
                    className={cn(
                      "px-2 py-2 text-sm bg-transparent",
                      activeTab === "cave"
                        ? "font-bold opacity-100 border-b-2 border-primary"
                        : "opacity-60"
                    )}
                    data-testid="tab-cave"
                  >
                    Cave
                  </TabsTrigger>

                  {flags.villageUnlocked && (
                    <TabsTrigger
                      value="village"
                      className={cn(
                        "px-2 py-2 text-sm bg-transparent",
                        animatingTabs.has("village")
                          ? "tab-fade-in"
                          : activeTab === "village"
                            ? "font-bold opacity-100 border-b-2 border-primary"
                            : "opacity-60"
                      )}
                      data-testid="tab-village"
                    >
                      {buildings.stoneHut >= 5 ? "City" : "Village"}
                    </TabsTrigger>
                  )}

                  {/* Estate Tab Button */}
                  {(estateUnlocked || buildings.darkEstate >= 1) && (
                    <TabsTrigger
                      value="estate"
                      className={cn(
                        "px-2 py-2 text-sm bg-transparent",
                        animatingTabs.has("estate")
                          ? "tab-fade-in"
                          : activeTab === "estate"
                            ? "font-bold opacity-100 border-b-2 border-primary"
                            : "opacity-60"
                      )}
                      data-testid="tab-estate"
                    >
                      Estate
                    </TabsTrigger>
                  )}

                  {flags.forestUnlocked && (
                    <TabsTrigger
                      value="forest"
                      className={cn(
                        "px-2 py-2 text-sm bg-transparent",
                        animatingTabs.has("forest")
                          ? "tab-fade-in"
                          : activeTab === "forest"
                            ? "font-bold opacity-100 border-b-2 border-primary"
                            : "opacity-60"
                      )}
                      data-testid="tab-forest"
                    >
                      Forest
                    </TabsTrigger>
                  )}

                  {flags.bastionUnlocked && (
                    <TabsTrigger
                      value="bastion"
                      className={cn(
                        "px-2 py-2 text-sm bg-transparent",
                        animatingTabs.has("bastion")
                          ? "tab-fade-in"
                          : activeTab === "bastion"
                            ? "font-bold opacity-100 border-b-2 border-primary"
                            : "opacity-60"
                      )}
                      data-testid="tab-bastion"
                    >
                      {flags.hasFortress ? "Fortress" : "Bastion"}
                    </TabsTrigger>
                  )}

                  {/* Achievements Tab Button */}
                  {books?.book_of_trials && (
                    <TabsTrigger
                      value="achievements"
                      className={cn(
                        "px-2 py-2 text-sm bg-transparent",
                        animatingTabs.has("achievements")
                          ? "tab-fade-in"
                          : activeTab === "achievements"
                            ? "font-medium opacity-100 border-b-2 border-primary"
                            : "opacity-60"
                      )}
                      data-testid="tab-achievements"
                    >
                      ⚜
                    </TabsTrigger>
                  )}

                  {/* Merchant Tab Button */}
                  {merchantTab.isOpen && (
                    <TabsTrigger
                      value="merchant"
                      className={cn(
                        "px-2 py-2 text-sm bg-transparent",
                        animatingTabs.has("merchant")
                          ? "tab-fade-in"
                          : activeTab === "merchant"
                            ? "font-bold opacity-100 border-b-2 border-primary"
                            : "opacity-60"
                      )}
                      data-testid="tab-merchant"
                    >
                      Merchant
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Action Panels */}
                <div className="flex-1 overflow-auto pl-2 md:pl-4 min-h-0 pt-4">
                  <TabsContent value="cave" className="mt-0 h-full">
                    <CavePanel />
                  </TabsContent>
                  <TabsContent value="village" className="mt-0 h-full">
                    <VillagePanel />
                  </TabsContent>
                  <TabsContent value="forest" className="mt-0 h-full">
                    <ForestPanel />
                  </TabsContent>
                  <TabsContent value="estate" className="mt-0 h-full">
                    <EstatePanel />
                  </TabsContent>
                  <TabsContent value="bastion" className="mt-0 h-full">
                    <BastionPanel />
                  </TabsContent>
                  <TabsContent value="achievements" className="mt-0 h-full">
                    <AchievementsPanel />
                  </TabsContent>
                  {/* Merchant Tab Content */}
                  <TabsContent value="merchant" className="mt-0 h-full">
                    <MerchantPanel />
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </nav>
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
      {/* MerchantDialog is no longer used here as it's replaced by MerchantPanel */}
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