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
import GameHeader from "./GameHeader";
import { GAME_FOOTER_INSET, GAME_HEADER_INSET } from "./gameChrome";
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
import FullGamePurchaseDialog from "./FullGamePurchaseDialog";
import { ShopDialog } from "./ShopDialog";
import LeaderboardDialog from "./LeaderboardDialog";
import RewardDialog from "./RewardDialog";
import InvestmentResultDialog from "./InvestmentResultDialog";
import MadnessDialog from "./MadnessDialog";
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav";
import { Mountain, Trees, Castle, Landmark, X } from "lucide-react";
import { ProfileMenuProvider } from "./ProfileMenu";
import InviteFriendsFloatingButton from "./InviteFriendsFloatingButton";
import { startVersionCheck, stopVersionCheck } from "@/game/versionCheck";
import { logger } from "@/lib/logger";
import { toast } from "@/hooks/use-toast";
import MistBackground from "@/components/ui/mist-background";
import { getUnclaimedAchievementIds } from "@/achievements";
import { getVisibleHotkeyTabs, isEditableKeyboardTarget } from "./tabHotkeys";
import { isTraderShopUnlocked } from "@/game/stateHelpers";
import {
  hasUnviewedUnclaimedAchievementsForTabPulse,
  withAchievementTabPulseViewed,
} from "@/game/achievementTabPulse";
import {
  buildTabUnlockSnapshot,
  getNewlyUnlockedTabsForBlink,
  withTabUnlockBlinkSeen,
  type TabUnlockBlinkId,
} from "@/game/tabUnlockBlink";
import { TraderTabButton } from "@/components/game/TraderTabButton";
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
  const hasUnviewedAchievement = useMemo(
    () =>
      hasUnviewedUnclaimedAchievementsForTabPulse(
        story,
        unclaimedAchievementIds,
      ),
    [story, unclaimedAchievementIds],
  );

  // Track unlocked tabs to trigger one-time blink until clicked (persisted in story.seen)
  const traderUnlocked = isTraderShopUnlocked({ story, traderDialogOpens });
  const achievementsUnlocked =
    !!relics?.survivors_notes || !!books?.book_of_trials;
  const tabUnlockSnapshot = useMemo(
    () =>
      buildTabUnlockSnapshot({
        flags,
        buildings,
        relics,
        books,
        story,
        traderDialogOpens,
      }),
    [
      flags.villageUnlocked,
      flags.forestUnlocked,
      flags.bastionUnlocked,
      buildings.darkEstate,
      relics?.survivors_notes,
      books?.book_of_trials,
      story?.seen?.traderSettled,
      traderDialogOpens,
    ],
  );
  const prevTabUnlockRef = useRef(tabUnlockSnapshot);
  /** Tabs mid unlock-blink; avoids re-trigger while fade timeout is pending. */
  const tabUnlockBlinkPendingRef = useRef<Set<TabUnlockBlinkId>>(new Set());
  const tabUnlockFadeTimeoutsRef = useRef<
    Map<TabUnlockBlinkId, ReturnType<typeof setTimeout>>
  >(new Map());
  const TAB_UNLOCK_FADE_MS = 3000;

  const markTabUnlockBlinkDismissed = useCallback((tabId: TabUnlockBlinkId) => {
    const state = useGameStore.getState();
    useGameStore.setState({
      story: withTabUnlockBlinkSeen(state.story, tabId),
    });
  }, []);

  const markAchievementTabPulseViewed = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const state = useGameStore.getState();
    useGameStore.setState({
      story: withAchievementTabPulseViewed(state.story, ids),
    });
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
  }, [flags.gameStarted, flags.villageUnlocked, villageHotkeyTutorialShown]);

  // Auto-switch to timed event tab when a new event becomes active
  useEffect(() => {
    if (timedEventTab.isActive && !prevTimedEventActiveRef.current) {
      setActiveTab("timedevent");
    }
    prevTimedEventActiveRef.current = timedEventTab.isActive;
  }, [timedEventTab.isActive, setActiveTab]);

  // Ensure cave tab is ALWAYS active if no valid tab is selected
  useEffect(() => {
    const validTabs = [
      "cave",
      "village",
      "forest",
      "estate",
      "bastion",
      "achievements",
      "timedevent",
    ];

    // If activeTab is invalid OR if timedevent tab is active but the event is no longer active
    if (
      !activeTab ||
      !validTabs.includes(activeTab) ||
      (activeTab === "timedevent" && !timedEventTab.isActive)
    ) {
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
    const tabButton = document.querySelector(
      '[data-testid="tab-achievements"]',
    );
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
          const remaining = Math.max(
            0,
            (timer.duration || 0) - (timer.elapsedTime || 0),
          );
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

  const maybeAdvancePrevTabUnlockRef = useCallback(() => {
    if (tabUnlockBlinkPendingRef.current.size === 0) {
      prevTabUnlockRef.current = buildTabUnlockSnapshot(
        useGameStore.getState(),
      );
    }
  }, []);

  const clearTabUnlockFadeTimeout = useCallback((tabId: TabUnlockBlinkId) => {
    const existing = tabUnlockFadeTimeoutsRef.current.get(tabId);
    if (existing !== undefined) {
      clearTimeout(existing);
      tabUnlockFadeTimeoutsRef.current.delete(tabId);
    }
  }, []);

  const finishTabUnlockFadeForTab = useCallback(
    (tabId: TabUnlockBlinkId) => {
      clearTabUnlockFadeTimeout(tabId);
      if (!tabUnlockBlinkPendingRef.current.has(tabId)) return;

      tabUnlockBlinkPendingRef.current.delete(tabId);
      setFadePhaseTabs((p) => {
        const next = new Set(p);
        next.delete(tabId);
        return next;
      });
      markTabUnlockBlinkDismissed(tabId);
      maybeAdvancePrevTabUnlockRef();
    },
    [
      clearTabUnlockFadeTimeout,
      markTabUnlockBlinkDismissed,
      maybeAdvancePrevTabUnlockRef,
    ],
  );

  const scheduleTabUnlockFadeEndForTabs = useCallback(
    (tabIds: TabUnlockBlinkId[]) => {
      for (const tabId of tabIds) {
        clearTabUnlockFadeTimeout(tabId);
        tabUnlockFadeTimeoutsRef.current.set(
          tabId,
          setTimeout(
            () => finishTabUnlockFadeForTab(tabId),
            TAB_UNLOCK_FADE_MS,
          ),
        );
      }
    },
    [clearTabUnlockFadeTimeout, finishTabUnlockFadeForTab],
  );

  useEffect(() => {
    return () => {
      for (const timeoutId of tabUnlockFadeTimeoutsRef.current.values()) {
        clearTimeout(timeoutId);
      }
      tabUnlockFadeTimeoutsRef.current.clear();
    };
  }, []);

  // Track when new tabs are unlocked and trigger one-time animations
  useEffect(() => {
    const prev = prevTabUnlockRef.current;
    const current = tabUnlockSnapshot;
    const storyNow = useGameStore.getState().story;
    const newlyUnlocked = getNewlyUnlockedTabsForBlink(
      prev,
      current,
      storyNow,
    ).filter((id) => !tabUnlockBlinkPendingRef.current.has(id));

    if (newlyUnlocked.length === 0) {
      prevTabUnlockRef.current = current;
      return;
    }

    if (
      newlyUnlocked.includes("village") &&
      !useGameStore.getState().villageHotkeyTutorialShown
    ) {
      setVillageHotkeyTutorialOpen(true);
    }

    for (const id of newlyUnlocked) {
      tabUnlockBlinkPendingRef.current.add(id);
    }

    const newAnimations = new Set(newlyUnlocked);
    setAnimatingTabs(
      (prevAnim) =>
        new Set([...Array.from(prevAnim), ...Array.from(newAnimations)]),
    );
    setFadePhaseTabs(
      (prevFade) =>
        new Set([...Array.from(prevFade), ...Array.from(newAnimations)]),
    );

    scheduleTabUnlockFadeEndForTabs(newlyUnlocked);
    // Do not advance prevTabUnlockRef here — wait until fade completes (or tab click via clearTabAnimation).
  }, [
    tabUnlockSnapshot,
    scheduleTabUnlockFadeEndForTabs,
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

    // Add Estate tab if unlocked
    if (estateUnlocked) {
      tabs.push({
        id: "estate",
        icon: <Castle />,
        label: "The Estate",
        onClick: () => setActiveTab("estate"),
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

    // Add Achievements tab if Survivor's Notes or Book of Trials (backwards compat)
    if (relics?.survivors_notes || books?.book_of_trials) {
      tabs.push({
        id: "achievements",
        icon: (
          <span className="text-sm leading-none font-noto-symbols-2">⚜</span>
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

  const clearTabAnimation = useCallback(
    (tabId: TabUnlockBlinkId) => {
      clearTabUnlockFadeTimeout(tabId);
      tabUnlockBlinkPendingRef.current.delete(tabId);
      maybeAdvancePrevTabUnlockRef();
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
      markTabUnlockBlinkDismissed(tabId);
    },
    [
      clearTabUnlockFadeTimeout,
      maybeAdvancePrevTabUnlockRef,
      markTabUnlockBlinkDismissed,
    ],
  );

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
          markAchievementTabPulseViewed(unclaimedAchievementIds);
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
      markAchievementTabPulseViewed,
    ],
  );

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
    // Single-line text heights (text-xs, leading-none). Kept as constants so the
    // layout is deterministic and never reads back already-positioned overlay nodes.
    const TAB_HOTKEY_GAP = 2; // tabs → badges
    const BADGE_LINE_H = 14; // [1] … row
    const HINT_GAP = 2; // badges → hint
    const HINT_LINE_H = 14; // hint row
    const badgeRowTop = navRect.bottom + TAB_HOTKEY_GAP;
    const next: { key: string; left: number; top: number; label: string }[] =
      [];
    visibleHotkeyTabs.forEach((tab, i) => {
      const el = queryTabButton(`tab-${tab}`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      next.push({
        key: `hotkey-${tab}`,
        left: r.left + r.width / 2,
        top: badgeRowTop,
        label: `[${i + 1}]`,
      });
    });
    setPauseHotkeyBadges(next);

    // [1]… badges on the first line below the tab row; hint text on the second.
    const hintTop = badgeRowTop + BADGE_LINE_H + HINT_GAP;
    const hintLeft =
      next.length > 0
        ? (Math.min(...next.map((b) => b.left)) +
          Math.max(...next.map((b) => b.left))) /
        2
        : rowRect.left + rowRect.width / 2;
    setPauseHotkeyHint({
      top: hintTop,
      left: hintLeft,
    });

    if (next.length > 0) {
      let minLeft = Math.min(...next.map((b) => b.left - 20));
      let maxRight = Math.max(...next.map((b) => b.left + 20));
      // Only the hint's horizontal extent is read back (width is offset-safe).
      const hintEl = document.querySelector<HTMLElement>(
        '[data-testid="tab-hotkey-hint"]',
      );
      if (hintEl) {
        const hr = hintEl.getBoundingClientRect();
        minLeft = Math.min(minLeft, hr.left);
        maxRight = Math.max(maxRight, hr.right);
      }
      const padX = 10;
      const padY = 3;
      const boxLeft = minLeft - padX;
      const boxWidth = maxRight - minLeft + padX * 2;
      const boxTop = badgeRowTop - padY;
      const boxBottom = hintTop + HINT_LINE_H + padY;
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
  }, [showTabHotkeyOverlay, useLimelightNav, visibleHotkeyTabs]);

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

      if (key >= "1" && key <= "9") {
        const index = Number(key) - 1;
        if (index < 0 || index >= visibleHotkeyTabs.length) return;
        e.preventDefault();
        applyHotkeyTab(visibleHotkeyTabs[index]!);
        return;
      }

      const isTabLeft = key === "ArrowLeft" || key === "a" || key === "A";
      const isTabRight = key === "ArrowRight" || key === "d" || key === "D";
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
  }, [flags.gameStarted, visibleHotkeyTabs, applyHotkeyTab]);

  // Show start screen if game hasn't started yet
  if (!flags.gameStarted) {
    return <StartScreen />;
  }

  // Check if blood moon event is active
  const isBloodMoonActive =
    timedEventTab.isActive &&
    timedEventTab.event?.eventId === "bloodMoonAttack";

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
    <span className="inline-flex flex-nowrap items-baseline justify-center gap-x-1">
      <span>{t("pauseHotkey.hintPrefix", { ns: "ui" })}</span>
      <span className="text-sm font-medium">{"← →"}</span>
      <span>{t("pauseHotkey.hintOr", { ns: "ui" })}</span>
      <span className="text-sm font-medium">{"A D"}</span>
      <span>{t("pauseHotkey.hintSuffix", { ns: "ui" })}</span>
    </span>
  );

  return (
    <ProfileMenuProvider>
      <div
        className="fixed inset-0 bg-background text-foreground flex flex-col"
        style={{
          backgroundColor: isBloodMoonActive ? "hsl(0, 50%, 5%)" : undefined,
          transition: "background-color 1s ease-in-out",
        }}
      >
        <GameHeader />

        {/* Pause Overlay - covers panels; header, tabs, and footer stay above */}
        {isPaused && (
          <div
            className="fixed inset-0 bg-black/80 z-40 pointer-events-auto overlay-fade-in"
            style={{ top: GAME_HEADER_INSET, bottom: GAME_FOOTER_INSET }}
          />
        )}

        {showTabHotkeyOverlay && (
          <div
            className="pointer-events-none fixed inset-0 z-[45] hidden md:block"
            aria-hidden={false}
          >
            {villageHotkeyBoxLayout != null && (
              <div
                className={`absolute z-0 rounded bg-neutral-800${showVillageHotkeyBox ? " pointer-events-auto" : " pointer-events-none"}`}
                style={{
                  top: villageHotkeyBoxLayout.top,
                  left: villageHotkeyBoxLayout.left,
                  width: villageHotkeyBoxLayout.width,
                  height: villageHotkeyBoxLayout.height,
                }}
                data-testid={
                  showVillageHotkeyBox
                    ? "village-hotkey-tutorial-box"
                    : "pause-hotkey-callout-box"
                }
              >
                {showVillageHotkeyBox && (
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
                )}
              </div>
            )}
            {pauseHotkeyBadges.map((b) => (
              <span
                key={b.key}
                className="pause-hotkey-badge-animated absolute z-[1] text-xs font-semibold leading-none text-foreground drop-shadow"
                style={{
                  left: b.left,
                  top: b.top,
                  transform: "translate(-50%, 0)",
                }}
              >
                {b.label}
              </span>
            ))}
            {pauseHotkeyHint != null && (
              <div
                data-testid="tab-hotkey-hint"
                className="pause-hotkey-hint-animated absolute z-[2] w-max max-w-[calc(100vw-1rem)] whitespace-nowrap px-1 text-center text-xs leading-none text-foreground drop-shadow"
                style={{
                  top: pauseHotkeyHint.top,
                  left: pauseHotkeyHint.left,
                  transform: "translateX(-50%)",
                }}
              >
                {pauseHotkeyHintContent}
              </div>
            )}
          </div>
        )}

        {/* Sleep Mode Mist Background - covers everything except header and footer */}
        {idleModeDialog.isOpen && (
          <div
            className="fixed inset-0 z-[35] pointer-events-auto"
            style={{ top: GAME_HEADER_INSET, bottom: GAME_FOOTER_INSET }}
          >
            <MistBackground />
          </div>
        )}

        {/* Main Content Area - Fills remaining space.
          Desktop (left → right): resources side panel, tabs/actions, event log.
          Mobile (stacked top → bottom): event log, side panel, tabs/actions. */}
        <main className="flex-1 pb-0 flex flex-col md:grid md:w-full md:grid-cols-[minmax(20rem,28rem)_minmax(24rem,1fr)_minmax(14rem,26rem)] min-h-0 overflow-hidden">
          {/* Event Log - top on mobile, right column on desktop */}
          <div className="order-1 md:order-3 w-full min-h-0 overflow-hidden pt-2 pr-2 pb-0 pl-1 md:border-l border-border">
            <LogPanel />
          </div>

          {/* Resources Side Panel - below log on mobile, left column on desktop.
              Mobile: locked to 36vh so the panel (and tabs/actions below it) keep a
              consistent height regardless of the active tab's side-panel content.
              Desktop: md:min-h-0 lets it shrink within the grid column. */}
          <div className="order-2 md:order-1 h-[36vh] md:h-auto min-h-[36vh] md:min-h-0 w-full pt-3 pl-2 pr-0 border-t md:border-t-0 md:border-r border-border overflow-hidden">
            <GameTabs />
          </div>

          {/* Game tab area - below side panel on mobile, middle column on desktop (flexible; shrinks first) */}
          <section className="order-3 md:order-2 min-w-0 flex flex-col min-h-0 overflow-hidden md:pl-0">
            {/* Horizontal Game Tabs */}
            <nav
              className={`relative border-t md:border-t-0 border-border pl-2 pr-2 flex-shrink-0${isPaused ? " z-[41] pointer-events-auto" : ""}`}
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
                <>
                  {/* Standard button design */}
                  <div
                    className={`flex w-full max-w-full flex-nowrap items-center gap-x-2 overflow-hidden${traderUnlocked ? " pr-[4.5rem]" : ""}`}
                  >
                    <div
                      ref={tabButtonRowRef}
                      className="inline-flex min-w-0 flex-1 flex-nowrap items-center gap-x-2 overflow-x-auto scrollbar-hide"
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
                            clearTabAnimation("village");
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
                            clearTabAnimation("estate");
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
                            clearTabAnimation("forest");
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
                            clearTabAnimation("bastion");
                            setActiveTab("bastion");
                          }}
                          data-testid="tab-bastion"
                        >
                          {flags.hasFortress
                            ? t("tabs.fortress", { ns: "common" })
                            : t("tabs.bastion", { ns: "common" })}
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
                            clearTabAnimation("achievements");
                            markAchievementTabPulseViewed(
                              unclaimedAchievementIds,
                            );
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
                  </div>

                  {traderUnlocked && (
                    <div className="pointer-events-auto absolute inset-y-0 right-2 flex items-center">
                      <TraderTabButton
                        tabButtonClass={tabButtonClass}
                        tabInactiveTextClass={tabInactiveTextClass}
                        isPaused={isPaused}
                        isAnimating={animatingTabs.has("trader")}
                        isFadePhase={fadePhaseTabs.has("trader")}
                        onClick={() => {
                          clearTabAnimation("trader");
                          setShopDialogOpen(true);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </nav>

            {/* Action Panels */}
            <div
              className={`flex-1 overflow-x-hidden pl-2 min-h-0 ${activeTab === "achievements"
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
      </div>
    </ProfileMenuProvider>
  );
}