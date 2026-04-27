import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
import {
  getVisibleHotkeyTabs,
  isEditableKeyboardTarget,
} from "./tabHotkeys";

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

  const [animatingTabs, setAnimatingTabs] = useState<Set<string>>(new Set());
  const [fadePhaseTabs, setFadePhaseTabs] = useState<Set<string>>(new Set());
  const [lastViewedUnclaimedAchievementIds, setLastViewedUnclaimedAchievementIds] =
    useState<string[]>([]);
  const tabButtonRowRef = useRef<HTMLDivElement | null>(null);
  const [pauseHotkeyHint, setPauseHotkeyHint] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [pauseHotkeyBadges, setPauseHotkeyBadges] = useState<
    { key: string; left: number; top: number; label: string }[]
  >([]);

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
  const traderUnlocked = buildings.tradePost >= 1;
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

    if (timedEventTab.isActive && timedEventTab.expiryTime) {
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
  }, [timedEventTab.isActive, timedEventTab.expiryTime]);

  // Apply pulse animation to achievement tab when there are unviewed achievements
  useEffect(() => {
    const tabButton = document.querySelector('[data-testid="tab-achievements"]');
    if (!tabButton) return;

    if (hasUnviewedAchievement) {
      tabButton.classList.add("timer-tab-pulse");
    } else {
      tabButton.classList.remove("timer-tab-pulse");
    }

    return () => {
      tabButton.classList.remove("timer-tab-pulse");
    };
  }, [hasUnviewedAchievement]);

  // Apply pulse animation to Bastion tab when wave countdown is in last 30 seconds
  useEffect(() => {
    const tabButton = document.querySelector('[data-testid="tab-bastion"]');
    if (!tabButton || !flags.bastionUnlocked) return;

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
  }, [flags.bastionUnlocked]);

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

  const visibleHotkeyTabs = useMemo(
    () =>
      getVisibleHotkeyTabs({
        villageUnlocked: flags.villageUnlocked,
        forestUnlocked: flags.forestUnlocked,
        bastionUnlocked: flags.bastionUnlocked,
        darkEstate: buildings.darkEstate ?? 0,
        survivorsNotes: !!relics?.survivors_notes,
        bookOfTrials: !!books?.book_of_trials,
        timedEventActive: timedEventTab.isActive,
      }),
    [
      flags.villageUnlocked,
      flags.forestUnlocked,
      flags.bastionUnlocked,
      buildings.darkEstate,
      relics?.survivors_notes,
      books?.book_of_trials,
      timedEventTab.isActive,
    ],
  );

  const clearTabAnimation = useCallback((tabId: string) => {
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

  const applyHotkeyTab = useCallback(
    (tab: GameTab) => {
      switch (tab) {
        case "village":
          clearTabAnimation("village");
          setActiveTab("village");
          break;
        case "estate":
          clearTabAnimation("estate");
          setActiveTab("estate");
          break;
        case "forest":
          clearTabAnimation("forest");
          setActiveTab("forest");
          break;
        case "bastion":
          clearTabAnimation("bastion");
          setActiveTab("bastion");
          break;
        case "achievements":
          clearTabAnimation("achievements");
          setLastViewedUnclaimedAchievementIds(unclaimedAchievementIds);
          setActiveTab("achievements");
          break;
        default:
          setActiveTab(tab);
      }
    },
    [
      clearTabAnimation,
      setActiveTab,
      unclaimedAchievementIds,
      setLastViewedUnclaimedAchievementIds,
    ],
  );

  const openTraderFromHotkey = useCallback(() => {
    clearTabAnimation("trader");
    setShopDialogOpen(true);
  }, [clearTabAnimation, setShopDialogOpen]);

  const measurePauseHotkeyOverlay = useCallback(() => {
    if (!isPaused || useLimelightNav) {
      setPauseHotkeyHint(null);
      setPauseHotkeyBadges([]);
      return;
    }
    // Match Tailwind `md:` — do not show hotkey hint/badges on small viewports
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 768px)").matches
    ) {
      setPauseHotkeyHint(null);
      setPauseHotkeyBadges([]);
      return;
    }
    const row = tabButtonRowRef.current;
    if (!row) {
      setPauseHotkeyHint(null);
      setPauseHotkeyBadges([]);
      return;
    }
    const rowRect = row.getBoundingClientRect();
    const nav = row.closest("nav");
    const navRect = nav?.getBoundingClientRect() ?? rowRect;
    setPauseHotkeyHint({
      top: Math.max(4, navRect.top - 42),
      left: rowRect.left + rowRect.width / 2,
    });
    const queryTabButton = (testId: string) =>
      row.querySelector<HTMLElement>(`[data-testid="${testId}"]`) ??
      document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    const next: { key: string; left: number; top: number; label: string }[] =
      [];
    visibleHotkeyTabs.forEach((tab, i) => {
      const el = queryTabButton(`tab-${tab}`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      next.push({
        key: `hotkey-${tab}`,
        left: r.left + r.width / 2,
        top: r.top - 2,
        label: `[${i + 1}]`,
      });
    });
    if (traderUnlocked) {
      const el = queryTabButton("tab-trader");
      if (el) {
        const r = el.getBoundingClientRect();
        next.push({
          key: "hotkey-trader",
          left: r.left + r.width / 2,
          top: r.top - 2,
          label: "[T]",
        });
      }
    }
    setPauseHotkeyBadges(next);
  }, [isPaused, useLimelightNav, visibleHotkeyTabs, traderUnlocked]);

  useLayoutEffect(() => {
    if (!isPaused) {
      measurePauseHotkeyOverlay();
      return;
    }
    const id = requestAnimationFrame(() => {
      measurePauseHotkeyOverlay();
    });
    return () => cancelAnimationFrame(id);
  }, [isPaused, measurePauseHotkeyOverlay]);

  useEffect(() => {
    if (!isPaused) return;
    const onResize = () => {
      measurePauseHotkeyOverlay();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isPaused, measurePauseHotkeyOverlay]);

  useEffect(() => {
    if (!flags.gameStarted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableKeyboardTarget(e.target)) return;
      if (isModalDialogOpen(useGameStore.getState())) return;

      const key = e.key;

      if (key === "t" || key === "T") {
        if (!traderUnlocked) return;
        e.preventDefault();
        openTraderFromHotkey();
        return;
      }

      if (key >= "1" && key <= "9") {
        const index = Number(key) - 1;
        if (index < 0 || index >= visibleHotkeyTabs.length) return;
        e.preventDefault();
        applyHotkeyTab(visibleHotkeyTabs[index]!);
        return;
      }

      if (key === "ArrowLeft" || key === "ArrowRight") {
        if (visibleHotkeyTabs.length === 0) return;
        const { activeTab: current } = useGameStore.getState();
        let idx = visibleHotkeyTabs.findIndex((t) => t === current);
        if (idx < 0) idx = 0;
        const nextIdx =
          key === "ArrowRight"
            ? (idx + 1) % visibleHotkeyTabs.length
            : (idx - 1 + visibleHotkeyTabs.length) % visibleHotkeyTabs.length;
        e.preventDefault();
        applyHotkeyTab(visibleHotkeyTabs[nextIdx]!);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    flags.gameStarted,
    traderUnlocked,
    visibleHotkeyTabs,
    applyHotkeyTab,
    openTraderFromHotkey,
  ]);

  // Show start screen if game hasn't started yet
  if (!flags.gameStarted) {
    return <StartScreen />;
  }

  // Check if blood moon event is active
  const isBloodMoonActive = timedEventTab.isActive && timedEventTab.event?.eventId === 'bloodMoonAttack';

  /** Muted tab labels use ~60% opacity; full brightness while paused (dim overlay). */
  const tabInactiveTextClass = isPaused ? "opacity-100" : "opacity-60";

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

      {isPaused && !useLimelightNav && (
        <div
          className="pointer-events-none fixed inset-x-0 z-[45] hidden md:block"
          style={{ top: 0, bottom: "45px" }}
          aria-hidden
        >
          {pauseHotkeyHint != null && (
            <div
              className="pause-hotkey-hint-animated absolute max-w-[min(100vw-1rem,28rem)] px-2 text-center text-xs leading-snug text-foreground drop-shadow"
              style={{
                top: pauseHotkeyHint.top,
                left: pauseHotkeyHint.left,
                transform: "translateX(-50%)",
              }}
            >
              <span>Use keys below or </span>
              <span className="text-sm font-medium">←</span>
              <span> </span>
              <span className="text-sm font-medium">→</span>
              <span> to switch between tabs</span>
            </div>
          )}
          {pauseHotkeyBadges.map((b) => (
            <span
              key={b.key}
              className="pause-hotkey-badge-animated absolute text-xs font-semibold text-foreground drop-shadow"
              style={{
                left: b.left,
                top: b.top,
                transform: "translate(-50%, -100%)",
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
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
              <div
                ref={tabButtonRowRef}
                className="inline-flex max-w-full flex-wrap items-baseline gap-x-3 pl-[3px]"
              >
                <button
                  className={`py-2 text-sm bg-transparent ${activeTab === "cave"
                    ? "font-semibold opacity-100"
                    : tabInactiveTextClass
                    } `}
                  onClick={() => setActiveTab("cave")}
                  data-testid="tab-cave"
                >
                  Cave
                </button>

                {flags.villageUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${animatingTabs.has("village")
                      ? fadePhaseTabs.has("village")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "village"
                        ? "font-semibold opacity-100"
                        : tabInactiveTextClass
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
                  </button>
                )}

                {/* Estate Tab Button */}
                {(estateUnlocked || buildings.darkEstate >= 1) && (
                  <button
                    className={`py-2 text-sm bg-transparent ${animatingTabs.has("estate")
                      ? fadePhaseTabs.has("estate")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "estate"
                        ? "font-semibold opacity-100"
                        : tabInactiveTextClass
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
                  </button>
                )}

                {flags.forestUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${animatingTabs.has("forest")
                      ? fadePhaseTabs.has("forest")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "forest"
                        ? "font-semibold opacity-100"
                        : tabInactiveTextClass
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
                  </button>
                )}

                {flags.bastionUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${animatingTabs.has("bastion")
                      ? fadePhaseTabs.has("bastion")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "bastion"
                        ? "font-semibold opacity-100"
                        : tabInactiveTextClass
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
                  </button>
                )}

                {/* Trader Tab Button */}
                {traderUnlocked && (
                  <button
                    className={`py-2 text-sm bg-transparent ${animatingTabs.has("trader")
                      ? fadePhaseTabs.has("trader")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : tabInactiveTextClass
                      }`}
                    onClick={() => {
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
                    }}
                    data-testid="tab-trader"
                  >
                    Trader
                  </button>
                )}

                {/* Achievements Tab Button ⚜︎ */}
                {(relics?.survivors_notes || books?.book_of_trials) && (
                  <button
                    className={`py-2 text-sm bg-transparent ${animatingTabs.has("achievements")
                      ? fadePhaseTabs.has("achievements")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "achievements"
                        ? "font-semibold opacity-100"
                        : tabInactiveTextClass
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
                  </button>
                )}

                {/* Timed Event Tab Button */}
                {timedEventTab.isActive && (
                  <button
                    className={`py-2 text-sm bg-transparent ${activeTab === "timedevent"
                      ? "font-semibold opacity-100"
                      : tabInactiveTextClass
                      }`}
                    onClick={() => setActiveTab("timedevent")}
                    data-testid="tab-timedevent"
                  >
                    <span className="timer-symbol">⊚</span>
                  </button>
                )}
              </div>
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
