import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import GameTabs from "./GameTabs";
import GameFooter from "./GameFooter";
import CavePanel from "./panels/CavePanel";
import VillagePanel from "./panels/VillagePanel";
import ForestPanel from "./panels/ForestPanel";
import EstatePanel from "./panels/EstatePanel";
import BastionPanel from "./panels/BastionPanel";
import AchievementsPanel from "./panels/AchievementsPanel";
import TimedEventPanel from "./panels/TimedEventPanel";
import LogPanel from "./panels/LogPanel";
import StartScreen from "./StartScreen";
import { useGameStore, isModalDialogOpen } from "@/game/state";
import { buildMainNavHotkeyTargets } from "@/game/mainNavHotkeys";
import { PauseHotkeyBadge } from "@/components/game/PauseHotkeyBadge";
import type { GameTab } from "@/game/types";
import EventDialog from "./EventDialog";
import CombatDialog from "./CombatDialog";
import IdleModeDialog from "./IdleModeDialog";
import CubeDialog from "./CubeDialog";
import InactivityDialog from "./InactivityDialog";
import { RestartGameDialog } from "./RestartGameDialog";
import FullGamePurchaseDialog from "./FullGamePurchaseDialog";
import { ShopDialog } from "./ShopDialog";
import LeaderboardDialog from "./LeaderboardDialog";
import RewardDialog from "./RewardDialog";
import InvestmentResultDialog from "./InvestmentResultDialog";
import MadnessDialog from "./MadnessDialog";
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav";
import { Mountain, Trees, Castle, Landmark } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import { startVersionCheck, stopVersionCheck } from "@/game/versionCheck";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";
import MistBackground from "@/components/ui/mist-background";
import { getUnclaimedAchievementIds } from "@/achievements";
import { audioManager } from "@/lib/audio";
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
    togglePause,
  } = useGameStore();

  // State selectors for dialogs - must be at top before any conditional returns
  const shopDialogOpen = useGameStore((state) => state.shopDialogOpen);
  const setShopDialogOpen = useGameStore((state) => state.setShopDialogOpen);
  const leaderboardDialogOpen = useGameStore(
    (state) => state.leaderboardDialogOpen,
  );
  const setLeaderboardDialogOpen = useGameStore(
    (state) => state.setLeaderboardDialogOpen,
  );
  const fullGamePurchaseDialogOpen = useGameStore(
    (state) => state.fullGamePurchaseDialogOpen,
  );
  const setFullGamePurchaseDialogOpen = useGameStore(
    (state) => state.setFullGamePurchaseDialogOpen,
  );
  const rewardDialog = useGameStore((state) => state.rewardDialog);
  const setRewardDialog = useGameStore((state) => state.setRewardDialog);
  const investmentResultDialog = useGameStore(
    (state) => state.investmentResultDialog,
  );
  const setInvestmentResultDialog = useGameStore(
    (state) => state.setInvestmentResultDialog,
  );
  const madnessDialog = useGameStore((state) => state.madnessDialog);
  const setMadnessDialog = useGameStore((state) => state.setMadnessDialog);

  // Estate unlocks when Dark Estate is built
  const estateUnlocked = buildings.darkEstate >= 1;
  const traderUnlocked = buildings.tradePost >= 1;

  const [animatingTabs, setAnimatingTabs] = useState<Set<string>>(new Set());
  const [fadePhaseTabs, setFadePhaseTabs] = useState<Set<string>>(new Set());
  const [lastViewedUnclaimedAchievementIds, setLastViewedUnclaimedAchievementIds] =
    useState<string[]>([]);

  // Compute unclaimed achievements for tab blink.
  // Subscribe to the specific slices that affect achievement progress so the memo re-runs.
  const _achBuildings = useGameStore((s) => s.buildings);
  const _achClaimed = useGameStore((s) => s.claimedAchievements);
  const _achTools = useGameStore((s) => s.tools);
  const _achWeapons = useGameStore((s) => s.weapons);
  const _achClothing = useGameStore((s) => s.clothing);
  const _achRelics = useGameStore((s) => s.relics);
  const _achFellowship = useGameStore((s) => s.fellowship);
  const _achUpgrades = useGameStore((s) => s.buttonUpgrades);
  const _achStory = useGameStore((s) => s.story);
  const _achFocus = useGameStore((s) => s.totalFocusEarned);
  const unclaimedAchievementIds = useMemo(
    () =>
      getUnclaimedAchievementIds(
        !!relics?.survivors_notes,
        !!books?.book_of_trials,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      _achBuildings,
      _achClaimed,
      _achTools,
      _achWeapons,
      _achClothing,
      _achRelics,
      _achFellowship,
      _achUpgrades,
      _achStory,
      _achFocus,
      relics?.survivors_notes,
      books?.book_of_trials,
    ],
  );
  const hasUnviewedAchievement =
    unclaimedAchievementIds.length > 0 &&
    unclaimedAchievementIds.some(
      (id) => !lastViewedUnclaimedAchievementIds.includes(id),
    );

  const clearTabBlink = useCallback((tabId: string) => {
    setAnimatingTabs((prev) => {
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
    setFadePhaseTabs((prev) => {
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  const openTraderShop = useCallback(() => {
    setAnimatingTabs((prev) => {
      const next = new Set(prev);
      next.delete("trader");
      return next;
    });
    setFadePhaseTabs((prev) => {
      const next = new Set(prev);
      next.delete("trader");
      return next;
    });
    setShopDialogOpen(true);
  }, [setShopDialogOpen]);

  const mainNavHotkeyTargets = useMemo(
    () =>
      buildMainNavHotkeyTargets(() => useGameStore.getState(), {
        clearTabBlink,
        setLastViewedUnclaimedAchievementIds,
      }),
    [
      flags.villageUnlocked,
      flags.forestUnlocked,
      flags.bastionUnlocked,
      estateUnlocked,
      buildings.darkEstate,
      relics?.survivors_notes,
      books?.book_of_trials,
      timedEventTab.isActive,
      clearTabBlink,
    ],
  );

  const pauseDigitByTabId = useMemo(() => {
    const m = new Map<GameTab, number>();
    for (const t of mainNavHotkeyTargets) {
      m.set(t.tab, t.index1Based);
    }
    return m;
  }, [mainNavHotkeyTargets]);

  useEffect(() => {
    const typingInField = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      !!target.closest("input, textarea, select, [contenteditable=true]");

    const onKeyDown = (e: KeyboardEvent) => {
      if (typingInField(e.target)) return;

      if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const s = useGameStore.getState();
        const next = !s.musicMuted;
        s.setMusicMuted(next);
        audioManager.musicMute(next);
        return;
      }

      if (e.key === "," && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const s = useGameStore.getState();
        const next = !s.sfxMuted;
        s.setSfxMuted(next);
        audioManager.sfxMute(next);
        return;
      }

      const st = useGameStore.getState();
      if (isModalDialogOpen(st)) return;

      if (
        (e.key === "t" || e.key === "T") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        if ((st.buildings.tradePost ?? 0) < 1) return;
        e.preventDefault();
        openTraderShop();
        return;
      }

      if (e.code === "Space") {
        if (st.idleModeDialog.isOpen) return;
        e.preventDefault();
        togglePause();
        return;
      }

      if (!st.isPaused) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (mainNavHotkeyTargets.length === 0) return;
        const len = mainNavHotkeyTargets.length;
        let i = mainNavHotkeyTargets.findIndex((x) => x.tab === st.activeTab);
        if (i < 0) i = 0;
        const delta = e.key === "ArrowRight" ? 1 : -1;
        const j = (i + delta + len) % len;
        mainNavHotkeyTargets[j].activate();
        e.preventDefault();
        return;
      }

      if (/^[1-7]$/.test(e.key)) {
        const n = Number(e.key);
        const entry = mainNavHotkeyTargets.find((x) => x.index1Based === n);
        if (entry) {
          entry.activate();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePause, mainNavHotkeyTargets, openTraderShop]);

  // Debug: Log when full game dialog state changes
  useEffect(() => {
    if (!fullGamePurchaseDialogOpen) {
      const state = useGameStore.getState();
      logger.log("[GAME CONTAINER] Full game dialog closed, state:", {
        BTP: state.BTP,
        isPaused: state.isPaused,
        isPausedPreviously: state.isPausedPreviously,
      });
    }
  }, [fullGamePurchaseDialogOpen]);

  // Track unlocked tabs to trigger blink until clicked
  const achievementsUnlocked = !!relics?.survivors_notes || !!books?.book_of_trials;
  const prevFlagsRef = useRef({
    villageUnlocked: flags.villageUnlocked,
    forestUnlocked: flags.forestUnlocked,
    estateUnlocked: estateUnlocked,
    bastionUnlocked: flags.bastionUnlocked,
    traderUnlocked: traderUnlocked,
    achievementsUnlocked: achievementsUnlocked,
  });

  // Initialize prevFlagsRef to current state on mount so we don't re-trigger
  // tab blink for already-unlocked tabs after page refresh
  useEffect(() => {
    prevFlagsRef.current = {
      villageUnlocked: flags.villageUnlocked,
      forestUnlocked: flags.forestUnlocked,
      estateUnlocked: estateUnlocked,
      bastionUnlocked: flags.bastionUnlocked,
      traderUnlocked: traderUnlocked,
      achievementsUnlocked: achievementsUnlocked,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track previous timed event state to detect when a new event starts
  const prevTimedEventActiveRef = useRef(timedEventTab.isActive);

  // Auto-switch to timed event tab when a new event becomes active
  useEffect(() => {
    if (timedEventTab.isActive && !prevTimedEventActiveRef.current) {
      setActiveTab("timedevent");
    }
    prevTimedEventActiveRef.current = timedEventTab.isActive;
  }, [timedEventTab.isActive, setActiveTab]);

  // Ensure cave tab is ALWAYS active if no valid tab is selected
  useEffect(() => {
    const validTabs = ["cave", "village", "forest", "estate", "bastion", "achievements", "timedevent"];

    // If activeTab is invalid OR if timedevent tab is active but the event is no longer active
    if (!activeTab || !validTabs.includes(activeTab) || (activeTab === "timedevent" && !timedEventTab.isActive)) {
      setActiveTab("cave");
    }
  }, [activeTab, setActiveTab, timedEventTab.isActive]);

  // Apply pulse animation to timed event tab button when time is running low
  useEffect(() => {
    const tabButton = document.querySelector('[data-testid="tab-timedevent"]');
    if (!tabButton) return;

    if (!isPaused && timedEventTab.isActive && timedEventTab.expiryTime) {
      const updatePulse = () => {
        const now = Date.now();
        const remaining = Math.max(0, timedEventTab.expiryTime! - now);
        const shouldPulse = remaining > 0 && remaining <= 30000; // Last 30 seconds

        if (shouldPulse) {
          tabButton.classList.add("timer-tab-pulse");
        } else {
          tabButton.classList.remove("timer-tab-pulse");
        }
      };

      // Initial update
      updatePulse();

      // Update every second
      const interval = setInterval(updatePulse, 1000);

      return () => {
        clearInterval(interval);
        tabButton.classList.remove("timer-tab-pulse");
      };
    } else {
      tabButton.classList.remove("timer-tab-pulse");
    }
  }, [isPaused, timedEventTab.isActive, timedEventTab.expiryTime]);

  // Apply pulse animation to achievement tab when there are unviewed achievements
  useEffect(() => {
    const tabButton = document.querySelector('[data-testid="tab-achievements"]');
    if (!tabButton) return;

    if (!isPaused && hasUnviewedAchievement) {
      tabButton.classList.add("timer-tab-pulse");
    } else {
      tabButton.classList.remove("timer-tab-pulse");
    }

    return () => {
      tabButton.classList.remove("timer-tab-pulse");
    };
  }, [hasUnviewedAchievement, isPaused]);

  // Apply pulse animation to Bastion tab when wave countdown is in last 30 seconds
  useEffect(() => {
    const tabButton = document.querySelector('[data-testid="tab-bastion"]');
    if (!tabButton || !flags.bastionUnlocked || isPaused) {
      tabButton?.classList.remove("timer-tab-pulse");
      return;
    }

    const updatePulse = () => {
      const timers = useGameStore.getState().attackWaveTimers || {};
      let shouldPulse = false;
      Object.values(timers).forEach((timer) => {
        if (!timer.defeated && timer.startTime > 0) {
          const remaining = Math.max(0, (timer.duration || 0) - (timer.elapsedTime || 0));
          if (remaining <= 30000) {
            shouldPulse = true;
          }
        }
      });

      if (shouldPulse) {
        tabButton.classList.add("timer-tab-pulse");
      } else {
        tabButton.classList.remove("timer-tab-pulse");
      }
    };

    updatePulse();
    const interval = setInterval(updatePulse, 1000);

    return () => {
      clearInterval(interval);
      tabButton.classList.remove("timer-tab-pulse");
    };
  }, [flags.bastionUnlocked, isPaused]);

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
    if (!prev.traderUnlocked && traderUnlocked) {
      newAnimations.add("trader");
    }
    if (!prev.achievementsUnlocked && achievementsUnlocked) {
      newAnimations.add("achievements");
    }

    if (newAnimations.size > 0) {
      setAnimatingTabs((prev) => new Set([...Array.from(prev), ...Array.from(newAnimations)]));
      setFadePhaseTabs((prev) => new Set([...Array.from(prev), ...Array.from(newAnimations)]));
      const ids = Array.from(newAnimations);
      const t = setTimeout(() => {
        setFadePhaseTabs((p) => {
          const next = new Set(p);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }, 3000);
      return () => clearTimeout(t);
    }

    prevFlagsRef.current = {
      villageUnlocked: flags.villageUnlocked,
      forestUnlocked: flags.forestUnlocked,
      estateUnlocked: estateUnlocked,
      bastionUnlocked: flags.bastionUnlocked,
      traderUnlocked: traderUnlocked,
      achievementsUnlocked: achievementsUnlocked,
    };
  }, [
    flags.villageUnlocked,
    flags.forestUnlocked,
    estateUnlocked,
    flags.bastionUnlocked,
    traderUnlocked,
    achievementsUnlocked,
  ]);

  // Initialize version check
  useEffect(() => {
    logger.log("[VERSION] Initializing version check from GameContainer");

    // Capture toast in closure to ensure it's available when callback fires
    const showUpdateToast = toast;

    startVersionCheck(async () => {
      logger.log("[VERSION] Version check callback fired!");
      try {
        const { saveGame } = await import("@/game/save");
        const state = useGameStore.getState();
        await saveGame(state, false);
        logger.log("[VERSION] Game saved before update notification");
        showUpdateToast({
          title: "New Version Available",
          description:
            "A new version of the game is available. Your game has been saved. Please refresh to get the latest updates.",
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
  const useLimelightNav = false;

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

    // Add Achievements tab if Survivor's Notes or Book of Trials (backwards compat)
    if (relics?.survivors_notes || books?.book_of_trials) {
      tabs.push({
        id: "achievements",
        icon: <Castle />,
        label: "Achievements",
        onClick: () => setActiveTab("achievements"),
      });
    }

    // Add Timed Event tab if active
    if (timedEventTab.isActive) {
      const symbol = "⊚";
      const title = timedEventTab.event?.title || "Event";
      tabs.push({
        id: "timedevent",
        icon: <span>{symbol}</span>,
        label: `${symbol} ${title}`,
        onClick: () => setActiveTab("timedevent"),
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
    relics?.survivors_notes,
    books?.book_of_trials,
    timedEventTab.isActive,
    timedEventTab.event?.title,
  ]);

  // Show start screen if game hasn't started yet
  if (!flags.gameStarted) {
    return <StartScreen />;
  }

  // Check if blood moon event is active
  const isBloodMoonActive = timedEventTab.isActive && timedEventTab.event?.eventId === 'bloodMoonAttack';

  return (
    <div
      className="fixed inset-0 bg-background text-foreground flex flex-col"
      style={{
        backgroundColor: isBloodMoonActive ? 'hsl(0, 50%, 5%)' : undefined,
        transition: 'background-color 1s ease-in-out',
      }}
    >
      {/* Pause Overlay - covers everything except footer and profile menu */}
      {isPaused && (
        <div
          className="fixed inset-0 bg-black/80 z-40 pointer-events-auto overlay-fade-in"
          style={{ bottom: "45px" }}
        />
      )}

      {/* Sleep Mode Mist Background - covers everything except footer and profile menu */}
      {idleModeDialog.isOpen && (
        <div
          className="fixed inset-0 z-[35] pointer-events-auto"
          style={{ bottom: "45px" }}
        >
          <MistBackground />
        </div>
      )}

      {/* Event Log - Fixed Height at Top */}
      <div className="w-full overflow-hidden pb-0 p-2 flex-shrink-0 pr-14">
        <LogPanel />
      </div>

      {/* Main Content Area - Fills remaining space */}
      <main className="flex-1 pb-0 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar for Resources - On top for mobile, left for desktop */}
        <div className="min-h-[36vh] w-full pl-2 pr-2 md:w-[28rem] border-t md:border-r overflow-hidden">
          <GameTabs />
        </div>

        {/* Right Content Area with Horizontal Tabs and Actions - Below for mobile, right for desktop */}
        <section className="flex-1 md:pl-0 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Horizontal Game Tabs */}
          <nav
            className={`border-t border-border pl-2 md:pl-4 flex-shrink-0 ${isPaused ? "relative z-[45]" : ""}`}
          >
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
              <div className="flex space-x-3 pl-[3px] ">
                <button
                  className={`relative py-2 text-sm bg-transparent ${activeTab === "cave"
                    ? "font-semibold opacity-100"
                    : "opacity-60"
                    } `}
                  onClick={() => setActiveTab("cave")}
                  data-testid="tab-cave"
                >
                  Cave
                  <PauseHotkeyBadge
                    show={isPaused && pauseDigitByTabId.has("cave")}
                    label={`[${pauseDigitByTabId.get("cave")}]`}
                  />
                </button>

                {flags.villageUnlocked && (
                  <button
                    className={`relative py-2 text-sm bg-transparent ${!isPaused && animatingTabs.has("village")
                      ? fadePhaseTabs.has("village")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "village"
                        ? "font-semibold opacity-100"
                        : "opacity-60"
                      }`}
                    onClick={() => {
                      setAnimatingTabs((prev) => {
                        const next = new Set(prev);
                        next.delete("village");
                        return next;
                      });
                      setFadePhaseTabs((prev) => {
                        const next = new Set(prev);
                        next.delete("village");
                        return next;
                      });
                      setActiveTab("village");
                    }}
                    data-testid="tab-village"
                  >
                    {buildings.stoneHut >= 5 ? "City" : "Village"}
                    <PauseHotkeyBadge
                      show={isPaused && pauseDigitByTabId.has("village")}
                      label={`[${pauseDigitByTabId.get("village")}]`}
                    />
                  </button>
                )}

                {/* Estate Tab Button */}
                {(estateUnlocked || buildings.darkEstate >= 1) && (
                  <button
                    className={`relative py-2 text-sm bg-transparent ${!isPaused && animatingTabs.has("estate")
                      ? fadePhaseTabs.has("estate")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "estate"
                        ? "font-semibold opacity-100"
                        : "opacity-60"
                      }`}
                    onClick={() => {
                      setAnimatingTabs((prev) => {
                        const next = new Set(prev);
                        next.delete("estate");
                        return next;
                      });
                      setFadePhaseTabs((prev) => {
                        const next = new Set(prev);
                        next.delete("estate");
                        return next;
                      });
                      setActiveTab("estate");
                    }}
                    data-testid="tab-estate"
                  >
                    Estate
                    <PauseHotkeyBadge
                      show={isPaused && pauseDigitByTabId.has("estate")}
                      label={`[${pauseDigitByTabId.get("estate")}]`}
                    />
                  </button>
                )}

                {flags.forestUnlocked && (
                  <button
                    className={`relative py-2 text-sm bg-transparent ${!isPaused && animatingTabs.has("forest")
                      ? fadePhaseTabs.has("forest")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "forest"
                        ? "font-semibold opacity-100"
                        : "opacity-60"
                      }`}
                    onClick={() => {
                      setAnimatingTabs((prev) => {
                        const next = new Set(prev);
                        next.delete("forest");
                        return next;
                      });
                      setFadePhaseTabs((prev) => {
                        const next = new Set(prev);
                        next.delete("forest");
                        return next;
                      });
                      setActiveTab("forest");
                    }}
                    data-testid="tab-forest"
                  >
                    Forest
                    <PauseHotkeyBadge
                      show={isPaused && pauseDigitByTabId.has("forest")}
                      label={`[${pauseDigitByTabId.get("forest")}]`}
                    />
                  </button>
                )}

                {flags.bastionUnlocked && (
                  <button
                    className={`relative py-2 text-sm bg-transparent ${!isPaused && animatingTabs.has("bastion")
                      ? fadePhaseTabs.has("bastion")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "bastion"
                        ? "font-semibold opacity-100"
                        : "opacity-60"
                      }`}
                    onClick={() => {
                      setAnimatingTabs((prev) => {
                        const next = new Set(prev);
                        next.delete("bastion");
                        return next;
                      });
                      setFadePhaseTabs((prev) => {
                        const next = new Set(prev);
                        next.delete("bastion");
                        return next;
                      });
                      setActiveTab("bastion");
                    }}
                    data-testid="tab-bastion"
                  >
                    {flags.hasFortress ? "Fortress" : "Bastion"}
                    <PauseHotkeyBadge
                      show={isPaused && pauseDigitByTabId.has("bastion")}
                      label={`[${pauseDigitByTabId.get("bastion")}]`}
                    />
                  </button>
                )}

                {/* Trader Tab Button */}
                {traderUnlocked && (
                  <button
                    className={`relative py-2 text-sm bg-transparent ${!isPaused && animatingTabs.has("trader")
                      ? fadePhaseTabs.has("trader")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : "opacity-60"
                      }`}
                    onClick={openTraderShop}
                    data-testid="tab-trader"
                  >
                    Trader
                    <PauseHotkeyBadge
                      show={isPaused}
                      label="[T]"
                    />
                  </button>
                )}

                {/* Achievements Tab Button ⚜︎ */}
                {(relics?.survivors_notes || books?.book_of_trials) && (
                  <button
                    className={`relative py-2 text-sm bg-transparent ${!isPaused && animatingTabs.has("achievements")
                      ? fadePhaseTabs.has("achievements")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "achievements"
                        ? "font-semibold opacity-100"
                        : "opacity-60"
                      }`}
                    onClick={() => {
                      setAnimatingTabs((prev) => {
                        const next = new Set(prev);
                        next.delete("achievements");
                        return next;
                      });
                      setFadePhaseTabs((prev) => {
                        const next = new Set(prev);
                        next.delete("achievements");
                        return next;
                      });
                      setLastViewedUnclaimedAchievementIds(unclaimedAchievementIds);
                      setActiveTab("achievements");
                    }}
                    data-testid="tab-achievements"
                  >
                    {"\u269C\uFE0E"}
                    <PauseHotkeyBadge
                      show={isPaused && pauseDigitByTabId.has("achievements")}
                      label={`[${pauseDigitByTabId.get("achievements")}]`}
                    />
                  </button>
                )}

                {/* Timed Event Tab Button */}
                {timedEventTab.isActive && (
                  <button
                    className={`relative py-2 text-sm bg-transparent ${activeTab === "timedevent"
                      ? "font-semibold opacity-100"
                      : "opacity-60"
                      }`}
                    onClick={() => setActiveTab("timedevent")}
                    data-testid="tab-timedevent"
                  >
                    <span className="timer-symbol">⊚</span>
                    <PauseHotkeyBadge
                      show={isPaused && pauseDigitByTabId.has("timedevent")}
                      label={`[${pauseDigitByTabId.get("timedevent")}]`}
                    />
                  </button>
                )}
              </div>
            )}
            {isPaused && mainNavHotkeyTargets.length > 0 && (
              <p className="select-none pl-[3px] pb-1 pt-0.5 text-[10px] text-muted-foreground">
                <span className="font-mono">←</span>
                {" "}
                <span className="font-mono">→</span>
                {" Use arrow keys to switch between tabs"}
              </p>
            )}
          </nav>

          {/* Action Panels */}
          <div
            className={`flex-1 overflow-x-hidden pl-2 pr-2 md:pl-4 md:pr-4 min-h-0 ${activeTab === "achievements"
              ? "overflow-hidden"
              : "overflow-y-auto scrollbar-hide"
              }`}
          >
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
        enemy={combatDialog.enemy}
        eventTitle={combatDialog.eventTitle}
        eventMessage={combatDialog.eventMessage}
        onVictory={combatDialog.onVictory || (() => ({}))}
        onDefeat={combatDialog.onDefeat || (() => ({}))}
      />

      {/* Idle Mode Dialog */}
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

      {/* Restart Game Dialog */}
      <RestartGameDialog
        isOpen={restartGameDialogOpen}
        onClose={() => setRestartGameDialogOpen(false)}
        onConfirm={restartGame}
      />

      {/* Reward Dialog */}
      <RewardDialog
        isOpen={rewardDialog.isOpen}
        data={rewardDialog.data}
        onClose={() => setRewardDialog(false)}
      />
      <InvestmentResultDialog
        isOpen={investmentResultDialog.isOpen}
        data={investmentResultDialog.data}
        onClose={() => setInvestmentResultDialog(false)}
      />
      <MadnessDialog
        isOpen={madnessDialog.isOpen}
        data={madnessDialog.data}
        onClose={() => setMadnessDialog(false)}
      />

      <ProfileMenu />
    </div>
  );
}
