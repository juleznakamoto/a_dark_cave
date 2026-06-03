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
import { useGameStore, shouldBlockGameHotkeys } from "@/game/state";
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
import { Mountain, Trees, Castle, Landmark, X } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import InviteFriendsFloatingButton from "./InviteFriendsFloatingButton";
import { startVersionCheck, stopVersionCheck } from "@/game/versionCheck";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";
import MistBackground from "@/components/ui/mist-background";
import { getUnclaimedAchievementIds } from "@/achievements";
import {
  getVisibleHotkeyTabs,
  isEditableKeyboardTarget,
} from "./tabHotkeys";
import { isTraderShopUnlocked } from "@/game/stateHelpers";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

export default function GameContainer() {
  const { t } = useTranslation();
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
  const story = useGameStore((state) => state.story);
  const traderDialogOpens = useGameStore((state) => state.traderDialogOpens);
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
  const [villageHotkeyTutorialOpen, setVillageHotkeyTutorialOpen] =
    useState(false);
  const [villageHotkeyBoxLayout, setVillageHotkeyBoxLayout] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const rafIdsRef = useRef<number[]>([]);

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

  // Track unlocked tabs to trigger blink until clicked
  const traderUnlocked = isTraderShopUnlocked({ story, traderDialogOpens });
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
  const villageHotkeyTutorialShown = useGameStore(
    (state) => state.villageHotkeyTutorialShown,
  );
  const villageHotkeyTutorialCheckedRef = useRef(false);

  // Show on load for existing saves that haven't seen the tutorial yet.
  useEffect(() => {
    if (!flags.gameStarted) return;
    if (villageHotkeyTutorialCheckedRef.current) return;
    villageHotkeyTutorialCheckedRef.current = true;

    if (!flags.villageUnlocked) return;
    if (!villageHotkeyTutorialShown) {
      setVillageHotkeyTutorialOpen(true);
    }
  }, [
    flags.gameStarted,
    flags.villageUnlocked,
    villageHotkeyTutorialShown,
  ]);

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
      if (!useGameStore.getState().villageHotkeyTutorialShown) {
        setVillageHotkeyTutorialOpen(true);
      }
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
          title: i18n.t("versionUpdate.title", { ns: "ui" }),
          description: i18n.t("versionUpdate.description", { ns: "ui" }),
          variant: "default",
          duration: 30000, // 30 seconds
          action: {
            label: i18n.t("versionUpdate.refresh", { ns: "ui" }),
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
        icon: (
          <span className="text-sm leading-none font-noto-symbols-2">
            ⚜
          </span>
        ),
        label: "Achievements",
        onClick: () => setActiveTab("achievements"),
      });
    }

    // Add Timed Event tab if active
    if (timedEventTab.isActive) {
      tabs.push({
        id: "timedevent",
        icon: (
          <span className="timer-symbol text-sm leading-none font-noto-symbols-2">
            ⊚
          </span>
        ),
        label:
          timedEventTab.event?.title ??
          t("tabs.timedEvent", { ns: "common", defaultValue: "Timed Event" }),
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
    timedEventTab.event,
    t,
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

  const closeVillageHotkeyTutorial = useCallback(() => {
    setVillageHotkeyTutorialOpen(false);
    useGameStore.setState({ villageHotkeyTutorialShown: true });
  }, []);

  useEffect(() => {
    if (!villageHotkeyTutorialOpen) return;
    const id = window.setTimeout(closeVillageHotkeyTutorial, 60_000);
    return () => window.clearTimeout(id);
  }, [villageHotkeyTutorialOpen, closeVillageHotkeyTutorial]);

  const showTabHotkeyOverlay =
    (isPaused || villageHotkeyTutorialOpen) && !useLimelightNav;
  const showVillageHotkeyBox = villageHotkeyTutorialOpen && !isPaused;

  const measureTabHotkeyOverlay = useCallback(() => {
    if (!showTabHotkeyOverlay) {
      setPauseHotkeyHint(null);
      setPauseHotkeyBadges([]);
      setVillageHotkeyBoxLayout(null);
      return;
    }
    // Match Tailwind `md:` — do not show hotkey hint/badges on small viewports
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 768px)").matches
    ) {
      setPauseHotkeyHint(null);
      setPauseHotkeyBadges([]);
      setVillageHotkeyBoxLayout(null);
      return;
    }
    const row = tabButtonRowRef.current;
    if (!row) {
      setPauseHotkeyHint(null);
      setPauseHotkeyBadges([]);
      setVillageHotkeyBoxLayout(null);
      return;
    }
    const rowRect = row.getBoundingClientRect();
    const nav = row.closest("nav");
    const navRect = nav?.getBoundingClientRect() ?? rowRect;
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

    const minBadgeAnchorTop =
      next.length > 0 ? Math.min(...next.map((b) => b.top)) : null;
    // Keep the help line above [1]… badges (badges use translateY(-100%) from tab tops).
    const hintTop =
      minBadgeAnchorTop != null
        ? Math.max(4, minBadgeAnchorTop - 36)
        : Math.max(4, navRect.top - 42);
    setPauseHotkeyHint({
      top: hintTop,
      left: rowRect.left + rowRect.width / 2,
    });

    if (showVillageHotkeyBox && next.length > 0) {
      let minLeft = rowRect.left;
      let maxRight = rowRect.right;
      next.forEach((b) => {
        minLeft = Math.min(minLeft, b.left - 20);
        maxRight = Math.max(maxRight, b.left + 20);
      });
      // Ensure the box also covers the (single-line) hint text width.
      const hintEl = document.querySelector<HTMLElement>(
        '[data-testid="village-hotkey-hint"]',
      );
      if (hintEl) {
        const hr = hintEl.getBoundingClientRect();
        minLeft = Math.min(minLeft, hr.left);
        maxRight = Math.max(maxRight, hr.right);
      }
      const padX = 12;
      const boxLeft = minLeft - padX;
      const boxWidth = maxRight - minLeft + padX * 2;
      const boxTop = hintTop - 6;
      const boxBottom = rowRect.top + 2;
      const boxHeight = Math.max(0, boxBottom - boxTop);
      setVillageHotkeyBoxLayout({
        top: boxTop,
        left: boxLeft,
        width: boxWidth,
        height: boxHeight,
      });
    } else {
      setVillageHotkeyBoxLayout(null);
    }
  }, [
    showTabHotkeyOverlay,
    showVillageHotkeyBox,
    useLimelightNav,
    visibleHotkeyTabs,
    traderUnlocked,
  ]);

  useLayoutEffect(() => {
    if (!showTabHotkeyOverlay) {
      measureTabHotkeyOverlay();
      return;
    }
    // Two passes: the first renders the hint so the second can measure its width for the box.
    const id1 = requestAnimationFrame(() => {
      measureTabHotkeyOverlay();
      const id2 = requestAnimationFrame(() => measureTabHotkeyOverlay());
      rafIdsRef.current.push(id2);
    });
    rafIdsRef.current.push(id1);
    const ids = rafIdsRef.current;
    return () => {
      ids.forEach((id) => cancelAnimationFrame(id));
      rafIdsRef.current = [];
    };
  }, [showTabHotkeyOverlay, measureTabHotkeyOverlay]);

  useEffect(() => {
    if (!showTabHotkeyOverlay) return;
    const onResize = () => {
      measureTabHotkeyOverlay();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [showTabHotkeyOverlay, measureTabHotkeyOverlay]);

  useEffect(() => {
    if (!flags.gameStarted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableKeyboardTarget(e.target)) return;
      if (shouldBlockGameHotkeys(useGameStore.getState())) return;

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

      const isTabLeft =
        key === "ArrowLeft" || key === "a" || key === "A";
      const isTabRight =
        key === "ArrowRight" || key === "d" || key === "D";
      if (isTabLeft || isTabRight) {
        if (visibleHotkeyTabs.length === 0) return;
        const { activeTab: current } = useGameStore.getState();
        let idx = visibleHotkeyTabs.findIndex((t) => t === current);
        if (idx < 0) idx = 0;
        const nextIdx = isTabRight
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

  /** Muted tab labels use ~60% opacity; while paused, distinguish inactive via color (consistent font weight avoids layout shift). */
  const tabInactiveTextClass = isPaused
    ? "opacity-100 text-muted-foreground"
    : "opacity-60";
  const tabActiveTextClass = isPaused
    ? "opacity-100 text-foreground"
    : "opacity-100";
  const tabButtonClass =
    "inline-flex h-10 items-center justify-center bg-transparent text-sm font-normal leading-none";
  const tabIconButtonClass =
    "inline-flex h-10 items-end justify-center bg-transparent pb-3 text-sm font-normal leading-none";

  const pauseHotkeyHintContent = (
    <span className="inline-flex flex-nowrap items-baseline justify-center gap-0">
      <span>{t("pauseHotkey.hintPrefix", { ns: "ui" })}</span>
      <span className="text-sm font-medium">←</span>
      <span> </span>
      <span className="text-sm font-medium">→</span>
      <span> {t("pauseHotkey.hintOr", { ns: "ui" })} </span>
      <span className="text-sm font-medium">A</span>
      <span> </span>
      <span className="text-sm font-medium">D</span>
      <span>{t("pauseHotkey.hintSuffix", { ns: "ui" })}</span>
    </span>
  );

  return (
    <div
      className="fixed inset-0 bg-background text-foreground flex flex-col"
      style={{
        backgroundColor: isBloodMoonActive ? 'hsl(0, 50%, 5%)' : undefined,
        transition: 'background-color 1s ease-in-out',
      }}
    >
      {/* Pause Overlay - covers panels; tabs, footer, and profile menu stay above */}
      {isPaused && (
        <div
          className="fixed inset-0 bg-black/80 z-40 pointer-events-auto overlay-fade-in"
          style={{ bottom: "45px" }}
        />
      )}

      {showTabHotkeyOverlay && (
        <div
          className="pointer-events-none fixed inset-x-0 z-[45] hidden md:block"
          style={{ top: 0, bottom: "45px" }}
          aria-hidden={!showVillageHotkeyBox}
        >
          {showVillageHotkeyBox && villageHotkeyBoxLayout != null && (
            <div
              className="absolute pointer-events-auto rounded bg-neutral-800"
              style={{
                top: villageHotkeyBoxLayout.top,
                left: villageHotkeyBoxLayout.left,
                width: villageHotkeyBoxLayout.width,
                height: villageHotkeyBoxLayout.height,
              }}
              data-testid="village-hotkey-tutorial-box"
            >
              <button
                type="button"
                className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-950 text-white shadow-sm border border-red-800/50 hover:bg-red-900 transition-colors cursor-pointer"
                aria-label={t("villageHotkeyTutorial.dismiss", {
                  ns: "ui",
                  defaultValue: "Dismiss",
                })}
                data-testid="village-hotkey-tutorial-dismiss"
                onClick={closeVillageHotkeyTutorial}
              >
                <X className="h-2.5 w-2.5 stroke-[3]" />
              </button>
            </div>
          )}
          {pauseHotkeyHint != null && (
            <div
              data-testid={showVillageHotkeyBox ? "village-hotkey-hint" : undefined}
              className="pause-hotkey-hint-animated absolute z-[2] w-max max-w-[calc(100vw-1rem)] whitespace-nowrap px-2 text-center text-xs leading-snug text-foreground drop-shadow"
              style={{
                top: pauseHotkeyHint.top,
                left: pauseHotkeyHint.left,
                transform: "translateX(-50%)",
              }}
            >
              {pauseHotkeyHintContent}
            </div>
          )}
          {pauseHotkeyBadges.map((b) => (
            <span
              key={b.key}
              className="pause-hotkey-badge-animated absolute z-[1] text-xs font-semibold text-foreground drop-shadow"
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
        <div className="min-h-[36vh] w-full pl-2 pr-2 md:w-[30rem] border-t md:border-r overflow-hidden">
          <GameTabs />
        </div>

        {/* Right Content Area with Horizontal Tabs and Actions - Below for mobile, right for desktop */}
        <section className="flex-1 md:pl-0 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Horizontal Game Tabs */}
          <nav
            className={`border-t border-border pl-2 md:pl-4 flex-shrink-0${isPaused ? " relative z-[41] pointer-events-auto" : ""}`}
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
              <div
                ref={tabButtonRowRef}
                className="inline-flex max-w-full flex-nowrap items-center gap-x-2 overflow-x-auto pl-[3px] scrollbar-hide md:gap-x-3"
              >
                <button
                  className={`${tabButtonClass} ${activeTab === "cave"
                    ? tabActiveTextClass
                    : tabInactiveTextClass
                    } `}
                  onClick={() => setActiveTab("cave")}
                  data-testid="tab-cave"
                >
                  {t("tabs.cave", { ns: "common" })}
                </button>

                {flags.villageUnlocked && (
                  <button
                    className={`${tabButtonClass} ${animatingTabs.has("village")
                      ? fadePhaseTabs.has("village")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "village"
                        ? tabActiveTextClass
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
                    {buildings.stoneHut >= 5
                      ? t("tabs.city", { ns: "common" })
                      : t("tabs.village", { ns: "common" })}
                  </button>
                )}

                {/* Estate Tab Button */}
                {(estateUnlocked || buildings.darkEstate >= 1) && (
                  <button
                    className={`${tabButtonClass} ${animatingTabs.has("estate")
                      ? fadePhaseTabs.has("estate")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "estate"
                        ? tabActiveTextClass
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
                    {t("tabs.estate", { ns: "common" })}
                  </button>
                )}

                {flags.forestUnlocked && (
                  <button
                    className={`${tabButtonClass} ${animatingTabs.has("forest")
                      ? fadePhaseTabs.has("forest")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "forest"
                        ? tabActiveTextClass
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
                    {t("tabs.forest", { ns: "common" })}
                  </button>
                )}

                {flags.bastionUnlocked && (
                  <button
                    className={`${tabButtonClass} ${animatingTabs.has("bastion")
                      ? fadePhaseTabs.has("bastion")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "bastion"
                        ? tabActiveTextClass
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
                    {flags.hasFortress
                      ? t("tabs.fortress", { ns: "common" })
                      : t("tabs.bastion", { ns: "common" })}
                  </button>
                )}

                {/* Trader Tab Button */}
                {traderUnlocked && (
                  <button
                    className={`${tabButtonClass} ${animatingTabs.has("trader")
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
                    {t("tabs.trader", { ns: "common" })}
                  </button>
                )}

                {/* Achievements Tab Button ⚜︎ */}
                {(relics?.survivors_notes || books?.book_of_trials) && (
                  <button
                    className={`${tabIconButtonClass} ${animatingTabs.has("achievements")
                      ? fadePhaseTabs.has("achievements")
                        ? "tab-fade-in"
                        : "tab-blink-new"
                      : activeTab === "achievements"
                        ? tabActiveTextClass
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
                    <span className="text-[14px] leading-none font-noto-symbols-2">
                      ⚜
                    </span>
                  </button>
                )}

                {/* Timed Event Tab Button */}
                {timedEventTab.isActive && (
                  <button
                    className={`${tabIconButtonClass} gap-1 ${activeTab === "timedevent"
                      ? tabActiveTextClass
                      : tabInactiveTextClass
                      }`}
                    onClick={() => setActiveTab("timedevent")}
                    data-testid="tab-timedevent"
                  >
                    <span className="timer-symbol text-[14px] leading-none font-noto-symbols-2">
                      ⊚
                    </span>
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

      {/* Footer - above pause overlay (z-40) so hover tooltips stay visible when paused */}
      <div className="relative z-50 flex-shrink-0 pointer-events-auto">
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

      <InviteFriendsFloatingButton />
      <ProfileMenu />
    </div>
  );
}
