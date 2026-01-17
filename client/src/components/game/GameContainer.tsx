import { lazy, Suspense, useState, useEffect, useMemo, useRef } from "react";
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav";
import { Mountain, Trees, Castle, Landmark } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import { startVersionCheck, stopVersionCheck } from "@/game/versionCheck";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";
import { useGameStore } from "@/game/state";

// Lazy load heavy components
const GameTabs = lazy(() => import("./GameTabs"));
const GameFooter = lazy(() => import("./GameFooter"));
const CavePanel = lazy(() => import("./panels/CavePanel"));
const VillagePanel = lazy(() => import("./panels/VillagePanel"));
const ForestPanel = lazy(() => import("./panels/ForestPanel"));
const EstatePanel = lazy(() => import("./panels/EstatePanel"));
const BastionPanel = lazy(() => import("./panels/BastionPanel"));
const AchievementsPanel = lazy(() => import("./panels/AchievementsPanel"));
const TimedEventPanel = lazy(() => import("./panels/TimedEventPanel"));
const LogPanel = lazy(() => import("./panels/LogPanel"));
const StartScreen = lazy(() => import("./StartScreen"));
const EventDialog = lazy(() => import("./EventDialog"));
const CombatDialog = lazy(() => import("./CombatDialog"));
const IdleModeDialog = lazy(() => import("./IdleModeDialog"));
const CubeDialog = lazy(() => import("./CubeDialog"));
const InactivityDialog = lazy(() => import("./InactivityDialog"));
const RestartGameDialog = lazy(() => import("./RestartGameDialog").then(m => ({ default: m.RestartGameDialog })));
const FullGamePurchaseDialog = lazy(() => import("./FullGamePurchaseDialog"));
const ShopDialog = lazy(() => import("./ShopDialog").then(m => ({ default: m.ShopDialog })));
const LeaderboardDialog = lazy(() => import("./LeaderboardDialog"));

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
    timedEventTab,
    setActiveTab,
    setEventDialog,
    setCombatDialog,
    isPaused,
    inactivityDialogOpen,
    restartGameDialogOpen,
    setRestartGameDialogOpen,
    restartGame,
  } = useGameStore();

  const shopDialogOpen = useGameStore((state) => state.shopDialogOpen);
  const setShopDialogOpen = useGameStore((state) => state.setShopDialogOpen);
  const leaderboardDialogOpen = useGameStore((state) => state.leaderboardDialogOpen);
  const setLeaderboardDialogOpen = useGameStore((state) => state.setLeaderboardDialogOpen);
  const fullGamePurchaseDialogOpen = useGameStore((state) => state.fullGamePurchaseDialogOpen);
  const setFullGamePurchaseDialogOpen = useGameStore((state) => state.setFullGamePurchaseDialogOpen);

  // Estate unlocks when Dark Estate is built
  const estateUnlocked = buildings.darkEstate >= 1;

  const [animatingTabs, setAnimatingTabs] = useState<Set<string>>(new Set());

  // Show start screen if game hasn't started yet
  if (!flags.gameStarted) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <StartScreen />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <div className="fixed inset-0 bg-background text-foreground flex flex-col">
        {/* Pause Overlay */}
        {isPaused && (
          <div
            className="fixed inset-0 bg-black/80 z-40 pointer-events-auto overlay-fade-in"
            style={{ bottom: "45px" }}
          />
        )}

        {/* Sleep Mode Overlay */}
        {idleModeDialog.isOpen && (
          <div
            className="fixed inset-0 bg-black/100 z-40 pointer-events-auto overlay-fade-in"
            style={{ bottom: "45px" }}
          />
        )}

        {/* Event Log */}
        <div className="w-full overflow-hidden pb-0 p-2 flex-shrink-0 pr-12">
          <LogPanel />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 pb-0 flex flex-col md:flex-row min-h-0 overflow-hidden">
          <div className="min-h-48 w-full pl-2 pr-2 md:w-[26rem] border-t md:border-r overflow-hidden">
            <GameTabs />
          </div>

          <section className="flex-1 md:pl-0 flex flex-col min-w-0 min-h-0 overflow-hidden">
            <nav className="border-t border-border pl-2 md:pl-4 flex-shrink-0">
              {/* ... nav rendering ... */}
              <div className="flex space-x-4 pl-[3px] ">
                <button
                  className={`py-2 text-sm bg-transparent ${activeTab === "cave" ? "font-bold opacity-100" : "opacity-60"}`}
                  onClick={() => setActiveTab("cave")}
                >
                  Cave
                </button>
                {flags.villageUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${activeTab === "village" ? "font-bold opacity-100" : "opacity-60"}`}
                    onClick={() => setActiveTab("village")}
                  >
                    {buildings.stoneHut >= 5 ? "City" : "Village"}
                  </button>
                )}
                {/* ... other tabs ... */}
              </div>
            </nav>

            <div className="flex-1 overflow-auto pl-2 md:pl-4 min-h-0">
              {activeTab === "cave" && <CavePanel />}
              {activeTab === "village" && <VillagePanel />}
              {activeTab === "forest" && <ForestPanel />}
              {activeTab === "estate" && <EstatePanel />}
              {activeTab === "bastion" && <BastionPanel />}
              {activeTab === "achievements" && <AchievementsPanel />}
              {activeTab === "timedevent" && <TimedEventPanel />}
            </div>
          </section>
        </main>

        <div className="flex-shrink-0">
          <GameFooter />
        </div>

        <EventDialog
          isOpen={eventDialog.isOpen}
          onClose={() => setEventDialog(false)}
          event={eventDialog.currentEvent}
        />

        <CombatDialog
          isOpen={combatDialog.isOpen}
          onClose={() => setCombatDialog(false)}
          combat={combatDialog.currentCombat}
        />

        <IdleModeDialog />
        <CubeDialog />
        <ShopDialog
          isOpen={shopDialogOpen}
          onClose={() => setShopDialogOpen(false)}
          onOpen={() => setShopDialogOpen(true)}
        />
        <LeaderboardDialog
          isOpen={leaderboardDialogOpen}
          onClose={() => setLeaderboardDialogOpen(false)}
        />
        <FullGamePurchaseDialog
          isOpen={fullGamePurchaseDialogOpen}
          onClose={() => setFullGamePurchaseDialogOpen(false)}
        />
        {inactivityDialogOpen && <InactivityDialog />}

        <RestartGameDialog
          isOpen={restartGameDialogOpen}
          onClose={() => setRestartGameDialogOpen(false)}
          onRestart={restartGame}
        />

        <ProfileMenu />
      </div>
    </Suspense>
  );
}
