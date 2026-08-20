import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { createPortal } from "react-dom";
import { Helmet } from "react-helmet-async";
import { useShallow } from "zustand/react/shallow";
import GameTabs from "./GameTabs";
import GameFooter from "./GameFooter";
import GameHeader from "./GameHeader";
import {
  GAME_FOOTER_INSET,
  GAME_HEADER_INSET,
  GAME_PANEL_HEADER_BAND,
  GAME_PARTICLE_LAYER_ID,
  TAB_ICON_ALIGN_CLASS,
  TAB_ICON_SIZE_CLASS,
  TAB_TIMED_EVENT_ICON_CLASS,
} from "./gameChrome";
import CavePanel from "./panels/CavePanel";
import VillagePanel from "./panels/VillagePanel";
import ForestPanel from "./panels/ForestPanel";
import EstatePanel from "./panels/EstatePanel";
import BastionPanel from "./panels/BastionPanel";
import AchievementsPanel from "./panels/AchievementsPanel";
import TimedEventPanel from "./panels/TimedEventPanel";
import LogPanel from "./panels/LogPanel";
import { scheduleSharedProgressShaderPrewarm } from "@/components/ui/shared-progress-shader";
import StartScreen, {
  type StartScreenPreferences,
} from "./StartScreen";
import {
  useGameStore,
  isModalDialogOpen,
  shouldBlockGameHotkeys,
  syncTimedEventTabPauseTracking,
  getTimedEventTabEffectiveRemainingMs,
} from "@/game/state";
import {
  GameTooltipProvider,
  setGlobalTooltipsSuppressed,
} from "@/hooks/useGlobalTooltip";
import type { GameTab } from "@/game/types";
import EventDialog from "./EventDialog";
import CombatDialog from "./CombatDialog";
import IdleModeDialog from "./IdleModeDialog";
import InactivityDialog from "./InactivityDialog";
import RewardDialog from "./RewardDialog";
import InvestmentResultDialog from "./InvestmentResultDialog";
import MadnessDialog from "./MadnessDialog";
import InsightPotionDialog from "./InsightPotionDialog";
import VillageEffectDialog from "./VillageEffectDialog";
import BlessingOfferDialog from "./BlessingOfferDialog";
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav";
import { Mountain, Trees, Castle, Landmark, X } from "lucide-react";
import { ProfileMenuProvider } from "./ProfileMenu";
import { logger } from "@/lib/logger";
import { Z_INDEX } from "@/lib/z-index";
import { toast } from "@/hooks/use-toast";
import {
  recordUpdateHardReloadAttempt,
  startVersionCheck,
  stopVersionCheck,
} from "@/game/versionCheck";
import { hardReload } from "@/lib/hardReload";
import { formatCompactDuration } from "@/lib/utils";
import MistBackground from "@/components/ui/mist-background";
import { SmokeBackground } from "@/components/ui/spooky-smoke-animation";
import { isBloodMoonOverlayVisible, BLOOD_MOON_OVERLAY_FADE_MS } from "@/game/bloodMoonOverlay";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
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
import {
  useDemoEditionActive,
  useCrazyGamesEditionActive,
  useHideSteamStoreLink,
  useSteamDesktopEditionActive,
  useSteamEditionActive,
} from "@/hooks/useSteamEditionActive";
import { isDemoEdition } from "@/lib/edition";
import { isDemoLimitReachedFromState } from "@/game/demoLimit";
import DemoTimeUpDialog from "./DemoTimeUpDialog";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useIOSChromeViewportShell } from "@/hooks/useIOSChromeViewportShell";
import { usePanelResize } from "./panelResize";
import PanelResizeHandle from "./PanelResizeHandle";
import { GameUiIcon } from "@/components/game/GameUiIcon";

const TAB_ICON_SIZE = TAB_ICON_SIZE_CLASS;
const steamBuild = import.meta.env.VITE_STEAM_BUILD === "1";
const ShareDialog = lazy(() => import("./ShareDialog"));
const WebOnlyDialogs = steamBuild
  ? null
  : lazy(() => import("./WebOnlyDialogs"));

export default function GameContainer() {
  const { t } = useTranslation();
  const steamEditionActive = useSteamEditionActive();
  const steamDesktopEditionActive = useSteamDesktopEditionActive();
  const crazyGamesEditionActive = useCrazyGamesEditionActive();
  const hideSteamStoreLink = useHideSteamStoreLink();
  const demoEditionActive = useDemoEditionActive();
  // Shallow pick only: playTime / loopProgress write at 4 Hz and must not redraw the shell.
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
    cruelMode,
    musicMuted,
    sfxMuted,
    musicVolume,
    sfxVolume,
  } = useGameStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
      flags: state.flags,
      buildings: state.buildings,
      relics: state.relics,
      books: state.books,
      eventDialog: state.eventDialog,
      combatDialog: state.combatDialog,
      idleModeDialog: state.idleModeDialog,
      timedEventTab: state.timedEventTab,
      setActiveTab: state.setActiveTab,
      setEventDialog: state.setEventDialog,
      setCombatDialog: state.setCombatDialog,
      isPaused: state.isPaused,
      inactivityDialogOpen: state.inactivityDialogOpen,
      cruelMode: state.cruelMode,
      musicMuted: state.musicMuted,
      sfxMuted: state.sfxMuted,
      musicVolume: state.musicVolume,
      sfxVolume: state.sfxVolume,
    })),
  );

  const handleStartScreenMakeFire = useCallback(
    async (preferences: StartScreenPreferences) => {
      if (isDemoEdition()) {
        const state = useGameStore.getState();
        if (isDemoLimitReachedFromState(state)) {
          useGameStore.setState({ galaxyTimeUpDialogOpen: true });
          return;
        }
      }

      // Sign-out stops the loop; restart it before making the fire in-place.
      const { startGameLoop } = await import("@/game/loop");
      startGameLoop();
      const { commitMakeFireStart } = await import("@/game/startupGameLoader");
      commitMakeFireStart(preferences);
    },
    [],
  );

  // State selectors for dialogs - must be at top before any conditional returns
  const shopDialogOpen = useGameStore((state) => state.shopDialogOpen);
  const setShopDialogOpen = useGameStore((state) => state.setShopDialogOpen);
  const leaderboardDialogOpen = useGameStore(
    (state) => state.leaderboardDialogOpen,
  );
  const setLeaderboardDialogOpen = useGameStore(
    (state) => state.setLeaderboardDialogOpen,
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
  const insightPotionDialog = useGameStore(
    (state) => state.insightPotionDialog,
  );
  const setInsightPotionDialog = useGameStore(
    (state) => state.setInsightPotionDialog,
  );
  const villageEffectDialog = useGameStore(
    (state) => state.villageEffectDialog,
  );
  const setVillageEffectDialog = useGameStore(
    (state) => state.setVillageEffectDialog,
  );
  const story = useGameStore((state) => state.story);
  const traderDialogOpens = useGameStore((state) => state.traderDialogOpens);
  const modalDialogOpen = useGameStore(isModalDialogOpen);
  // Estate unlocks when Dark Estate is built
  const estateUnlocked = buildings.darkEstate >= 1;

  // Warm the Estate progress shader on a 1×1 canvas while the player is
  // still on another tab. First WebGL compile on Windows can stall the
  // page for many seconds if it waits until they open Estate.
  useEffect(() => {
    if (!estateUnlocked) return;
    scheduleSharedProgressShaderPrewarm();
  }, [estateUnlocked]);

  // Tooltips sit above modal overlays (z-10000). Force behind-modal tooltips
  // closed while a blocking dialog is open — closeAll alone leaves hover
  // tooltips visible because Radix stays uncontrolled when `open` is `undefined`.
  // Triggers inside the open dialog remain allowed (e.g. shop info icons).
  useEffect(() => {
    setGlobalTooltipsSuppressed(modalDialogOpen);
    return () => setGlobalTooltipsSuppressed(false);
  }, [modalDialogOpen]);

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

  // One-shot when an achievement newly becomes claimable (skip initial hydrate).
  const prevUnclaimedAchievementIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const next = new Set(unclaimedAchievementIds);
    const prev = prevUnclaimedAchievementIdsRef.current;
    prevUnclaimedAchievementIdsRef.current = next;
    if (!prev) return;

    for (const id of next) {
      if (!prev.has(id)) {
        audioManager.playSound("achievement", SOUND_VOLUME.achievement);
        break;
      }
    }
  }, [unclaimedAchievementIds]);

  // Track unlocked tabs to trigger one-time blink until clicked (persisted in story.seen)
  const traderUnlocked = isTraderShopUnlocked({ story, traderDialogOpens });
  // Full-store selector (not a field-list memo): overall unlock can flip from
  // social_media_rewards, referralCount, live estate levels, or Achievement
  // Maxer tallies that a partial dep list would miss. useShallow keeps the
  // shell from redrawing on 4 Hz playTime writes.
  const tabUnlockSnapshot = useGameStore(
    useShallow((s) => buildTabUnlockSnapshot(s)),
  );
  const achievementsUnlocked = tabUnlockSnapshot.achievementsUnlocked;
  const villageTabVisible = tabUnlockSnapshot.villageUnlocked;
  const forestTabVisible = tabUnlockSnapshot.forestUnlocked;
  const bastionTabVisible = tabUnlockSnapshot.bastionUnlocked;
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

  const villageHotkeyTutorialShown = useGameStore(
    (state) => state.villageHotkeyTutorialShown,
  );
  const villageHotkeyTutorialCheckedRef = useRef(false);

  // Show on load for existing saves that haven't seen the tutorial yet.
  useEffect(() => {
    if (!flags.gameStarted) return;
    if (!flags.villageUnlocked || !flags.forestUnlocked) return;
    if (villageHotkeyTutorialCheckedRef.current) return;
    villageHotkeyTutorialCheckedRef.current = true;

    if (!villageHotkeyTutorialShown) {
      setVillageHotkeyTutorialOpen(true);
    }
  }, [
    flags.gameStarted,
    flags.villageUnlocked,
    flags.forestUnlocked,
    villageHotkeyTutorialShown,
  ]);

  // Prompt for a hard refresh when a new build is deployed while the tab stays open.
  // Sticky toast + optional 5-minute forced hardReload (navigate-first; cache purge
  // on next boot). versionCheck counts real hardReload navigations (max 3 per
  // server sha) so a failed/stale reload can retry without looping forever.
  useEffect(() => {
    const AUTO_RELOAD_MS = 5 * 60 * 1000;
    let updatePending = false;
    let reloadAtMs = 0;
    let pendingServerSha: string | null = null;
    let autoReloadTimeout: ReturnType<typeof setTimeout> | null = null;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;
    let reloading = false;

    const versionUpdateDescription = (remainingMs: number) =>
      i18n.t("versionUpdate.description", {
        ns: "ui",
        time: formatCompactDuration(remainingMs / 1000),
      });

    const versionUpdateManualDescription = () =>
      i18n.t("versionUpdate.descriptionManual", {
        ns: "ui",
        defaultValue:
          "A new version of the game is available. Please update now. The game is automatically saved before updating.",
      });

    const saveAndHardReload = async () => {
      if (reloading) return;
      reloading = true;
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      try {
        const { saveGame } = await import("@/game/save");
        await saveGame(useGameStore.getState(), false);
      } catch (error) {
        logger.error("[VERSION] Error saving before reload:", error);
      }
      if (pendingServerSha) {
        recordUpdateHardReloadAttempt(pendingServerSha);
      }
      await hardReload();
    };

    const handleVisibilityReload = () => {
      // Mobile often suspends timers while backgrounded — catch up if the
      // grace window already elapsed when the player returns.
      if (
        updatePending &&
        document.visibilityState === "visible" &&
        reloadAtMs > 0 &&
        Date.now() >= reloadAtMs
      ) {
        void saveAndHardReload();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityReload);

    startVersionCheck(async ({ serverSha, autoReloadAllowed }) => {
      try {
        const { saveGame } = await import("@/game/save");
        const state = useGameStore.getState();
        await saveGame(state, false);

        pendingServerSha = serverSha;
        if (autoReloadTimeout) clearTimeout(autoReloadTimeout);
        if (countdownInterval) clearInterval(countdownInterval);
        autoReloadTimeout = null;
        countdownInterval = null;

        if (autoReloadAllowed) {
          // Arm toast + timer before visibility catch-up can fire.
          reloadAtMs = Date.now() + AUTO_RELOAD_MS;
          autoReloadTimeout = setTimeout(() => {
            void saveAndHardReload();
          }, AUTO_RELOAD_MS);
          const updateToast = toast({
            title: i18n.t("versionUpdate.title", { ns: "ui" }),
            description: versionUpdateDescription(AUTO_RELOAD_MS),
            variant: "default",
            duration: Infinity,
            dismissible: false,
            action: {
              label: i18n.t("versionUpdate.refresh", { ns: "ui" }),
              onClick: () => {
                void saveAndHardReload();
              },
            },
          });
          countdownInterval = setInterval(() => {
            const remainingMs = Math.max(0, reloadAtMs - Date.now());
            updateToast.update({
              description: versionUpdateDescription(remainingMs),
            });
            if (remainingMs <= 0 && countdownInterval) {
              clearInterval(countdownInterval);
              countdownInterval = null;
            }
          }, 1000);
          updatePending = true;
        } else {
          // Retries exhausted: keep a sticky manual refresh, no auto-reload loop.
          reloadAtMs = 0;
          updatePending = false;
          toast({
            title: i18n.t("versionUpdate.title", { ns: "ui" }),
            description: versionUpdateManualDescription(),
            variant: "default",
            duration: Infinity,
            dismissible: false,
            action: {
              label: i18n.t("versionUpdate.refresh", { ns: "ui" }),
              onClick: () => {
                void saveAndHardReload();
              },
            },
          });
        }
      } catch (error) {
        logger.error("[VERSION] Error showing update toast:", error);
        // Rethrow so versionCheck clears its in-memory armed flag and can retry.
        throw error;
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityReload);
      if (autoReloadTimeout) clearTimeout(autoReloadTimeout);
      if (countdownInterval) clearInterval(countdownInterval);
      stopVersionCheck();
    };
  }, []);

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

  const [timedEventTabPulseClass, setTimedEventTabPulseClass] = useState("");
  const [timedEventTabViewedEventId, setTimedEventTabViewedEventId] = useState<
    string | null
  >(null);

  const currentTimedEventId = timedEventTab.event?.id ?? null;
  const hasViewedCurrentTimedEvent =
    currentTimedEventId != null &&
    timedEventTabViewedEventId === currentTimedEventId;

  useEffect(() => {
    if (!timedEventTab.isActive) {
      setTimedEventTabViewedEventId(null);
      return;
    }
    setTimedEventTabViewedEventId((prev) =>
      prev != null &&
        currentTimedEventId != null &&
        prev !== currentTimedEventId
        ? null
        : prev,
    );
  }, [timedEventTab.isActive, currentTimedEventId]);

  useEffect(() => {
    if (activeTab === "timedevent" && currentTimedEventId) {
      setTimedEventTabViewedEventId(currentTimedEventId);
    }
  }, [activeTab, currentTimedEventId]);

  // Green pulse until opened; red in the last 30 seconds
  useEffect(() => {
    if (
      !timedEventTab.isActive ||
      !timedEventTab.expiryTime ||
      activeTab === "timedevent"
    ) {
      setTimedEventTabPulseClass("");
      return;
    }

    const updatePulse = () => {
      syncTimedEventTabPauseTracking();
      const remaining =
        getTimedEventTabEffectiveRemainingMs(useGameStore.getState()) ?? 0;

      if (remaining <= 0) {
        setTimedEventTabPulseClass("");
        return;
      }

      if (remaining <= 30000) {
        setTimedEventTabPulseClass("timer-tab-pulse-red");
      } else if (!hasViewedCurrentTimedEvent) {
        setTimedEventTabPulseClass("timer-tab-pulse-green");
      } else {
        setTimedEventTabPulseClass("");
      }
    };

    updatePulse();
    const interval = setInterval(updatePulse, 1000);
    return () => clearInterval(interval);
  }, [
    timedEventTab.isActive,
    timedEventTab.expiryTime,
    activeTab,
    hasViewedCurrentTimedEvent,
  ]);

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
    if (!tabButton || !bastionTabVisible) return;

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
  }, [bastionTabVisible]);

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
      (newlyUnlocked.includes("village") || newlyUnlocked.includes("forest")) &&
      current.villageUnlocked &&
      current.forestUnlocked &&
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

    // One cue per unlock batch (matches the shared 3s tab-fade-in animation).
    audioManager.playSound("tabFadeIn", SOUND_VOLUME.tabFadeIn);

    scheduleTabUnlockFadeEndForTabs(newlyUnlocked);
    // Do not advance prevTabUnlockRef here — wait until fade completes (or tab click via clearTabAnimation).
  }, [
    tabUnlockSnapshot,
    scheduleTabUnlockFadeEndForTabs,
    villageTabVisible,
    forestTabVisible,
    estateUnlocked,
    bastionTabVisible,
    traderUnlocked,
    achievementsUnlocked,
  ]);

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

    if (villageTabVisible) {
      tabs.push({
        id: "village",
        icon: <Landmark />,
        label: buildings.stoneHut >= 5 ? "The City" : "The Village",
        onClick: () => setActiveTab("village"),
      });
    }

    if (forestTabVisible) {
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

    if (bastionTabVisible) {
      tabs.push({
        id: "bastion",
        icon: <Castle />,
        label: "The Bastion",
        onClick: () => setActiveTab("bastion"),
      });
    }

    // Add Achievements tab if Survivor's Notes, Book of Trials, or general progress
    if (achievementsUnlocked) {
      tabs.push({
        id: "achievements",
        icon: (
          <GameUiIcon
            name="achievements"
            sizeClassName={TAB_ICON_SIZE}
            className={TAB_ICON_ALIGN_CLASS}
          />
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
          <GameUiIcon
            name="timedEvent"
            sizeClassName={TAB_ICON_SIZE}
            className={`timer-symbol ${TAB_TIMED_EVENT_ICON_CLASS}`}
          />
        ),
        label:
          timedEventTab.event?.title ??
          t("tabs.timedEvent", { ns: "common", defaultValue: "Timed Event" }),
        onClick: () => setActiveTab("timedevent"),
      });
    }

    return tabs;
  }, [
    villageTabVisible,
    forestTabVisible,
    estateUnlocked,
    bastionTabVisible,
    buildings.stoneHut,
    setActiveTab,
    achievementsUnlocked,
    timedEventTab.isActive,
    timedEventTab.event,
    t,
  ]);

  const visibleHotkeyTabs = useMemo(
    () =>
      getVisibleHotkeyTabs({
        villageUnlocked: villageTabVisible,
        forestUnlocked: forestTabVisible,
        bastionUnlocked: bastionTabVisible,
        darkEstate: buildings.darkEstate ?? 0,
        achievementsUnlocked,
        timedEventActive: timedEventTab.isActive,
      }),
    [
      villageTabVisible,
      forestTabVisible,
      bastionTabVisible,
      buildings.darkEstate,
      achievementsUnlocked,
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

  // Tab hotkey hint/badges only make sense once Village + Forest exist to switch between.
  const tabHotkeysUnlocked = villageTabVisible && forestTabVisible;
  const showTabHotkeyOverlay =
    ((isPaused && tabHotkeysUnlocked) || villageHotkeyTutorialOpen) &&
    !useLimelightNav;
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
      // Hint must be mounted before sizing the callout. A badges-only pass paints a
      // narrower box for a frame when pausing (two-pass measure), which looks like the
      // red border jumps between containers.
      const hintEl = document.querySelector<HTMLElement>(
        '[data-testid="tab-hotkey-hint"]',
      );
      if (!hintEl) {
        return;
      }
      const hr = hintEl.getBoundingClientRect();
      let minLeft = Math.min(hr.left, ...next.map((b) => b.left - 20));
      let maxRight = Math.max(hr.right, ...next.map((b) => b.left + 20));
      const padX = 20;
      const padY = 8;
      const boxLeft = minLeft - padX;
      const boxWidth = maxRight - minLeft + padX * 2;
      // Frame badges + hint only (tab labels stay above, outside the callout).
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
    // Two passes: the first mounts the hint; the second measures it and sizes the callout.
    // (Callout is not applied until the hint exists — see measureTabHotkeyOverlay.)
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

  const panelResize = usePanelResize();
  const iosChromeViewportStyle = useIOSChromeViewportShell();

  const showBloodMoonOverlay = isBloodMoonOverlayVisible(timedEventTab);

  // Show start screen if game hasn't started yet (e.g. after sign-out reset).
  if (!flags.gameStarted) {
    return (
      <>
        <StartScreen
          initialPreferences={{
            cruelMode,
            musicMuted,
            sfxMuted,
            musicVolume,
            sfxVolume,
          }}
          steamEditionActive={steamEditionActive}
          steamDesktopEditionActive={steamDesktopEditionActive}
          crazyGamesEditionActive={crazyGamesEditionActive}
          hideSteamStoreLink={hideSteamStoreLink}
          onMakeFire={handleStartScreenMakeFire}
        />
        {demoEditionActive && <DemoTimeUpDialog />}
      </>
    );
  }

  /** Muted tab labels use ~60% opacity; while paused, distinguish inactive via color (consistent font weight avoids layout shift). */
  const tabInactiveTextClass = isPaused
    ? "opacity-100 text-muted-foreground"
    : "opacity-60";
  const tabActiveTextClass = isPaused
    ? "opacity-100 text-foreground"
    : "opacity-100";
  const tabButtonClass =
    `${GAME_PANEL_HEADER_BAND} bg-transparent font-medium tracking-wide outline-none focus:outline-none focus-visible:outline-none`;

  const tabHotkeyCount = visibleHotkeyTabs.length;
  const pauseHotkeyHintContent = (
    <span className="inline-flex flex-nowrap items-baseline justify-center gap-x-1">
      <span>{t("pauseHotkey.hintPrefix", { ns: "ui" })}</span>
      <span className="text-sm font-medium">{`1-${tabHotkeyCount}`}</span>
      <span>{t("pauseHotkey.hintSelect", { ns: "ui" })}</span>
      <span className="text-sm font-medium">{"← →"}</span>
      <span>/</span>
      <span className="text-sm font-medium">{"A D"}</span>
      <span>{t("pauseHotkey.hintSuffix", { ns: "ui" })}</span>
    </span>
  );

  return (
    <GameTooltipProvider>
      <ProfileMenuProvider>
        <Helmet>
          <title>A Dark Cave</title>
        </Helmet>
        <div
          className="fixed inset-0 bg-background text-foreground flex flex-col"
          style={{
            backgroundColor: showBloodMoonOverlay ? "hsl(0, 50%, 5%)" : undefined,
            transition: `background-color ${BLOOD_MOON_OVERLAY_FADE_MS}ms ease-in-out`,
            ...iosChromeViewportStyle,
          }}
        >
          {/* Blood moon smoke — between header/footer only (same insets as pause/sleep). */}
          {showBloodMoonOverlay && (
            <div
              className="pointer-events-none absolute inset-x-0 z-0 blood-moon-smoke-fade-in"
              style={{
                top: GAME_HEADER_INSET,
                bottom: GAME_FOOTER_INSET,
                animationDuration: `${BLOOD_MOON_OVERLAY_FADE_MS}ms`,
              }}
              aria-hidden
            >
              <SmokeBackground smokeColor="#cc0000" className="h-full w-full" />
            </div>
          )}

          <GameHeader />

          {/* Pause Overlay - covers panels; header and footer stay above */}
          {isPaused && (
            <div
              className="fixed inset-0 bg-black/80 pointer-events-auto overlay-fade-in"
              style={{
                top: GAME_HEADER_INSET,
                bottom: GAME_FOOTER_INSET,
                zIndex: Z_INDEX.sleepFog,
              }}
            />
          )}

          {showTabHotkeyOverlay &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                className="pointer-events-none fixed inset-0 hidden md:block"
                style={{ zIndex: Z_INDEX.tabHotkeyOverlay }}
                aria-hidden={false}
              >
                {villageHotkeyBoxLayout != null && (
                  <div
                    className={`absolute z-0 rounded border border-red-500 bg-neutral-950${showVillageHotkeyBox ? " pointer-events-auto" : " pointer-events-none"}`}
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
              </div>,
              document.body,
            )}

          {/* Main Content Area - Fills remaining space.
          Desktop (left → right): resources side panel, tabs/actions, event log.
          Mobile (stacked top → bottom): event log, side panel, tabs/actions. */}
          <main
            ref={panelResize.mainRef}
            className="relative flex-1 pb-0 flex flex-col md:grid md:w-full md:grid-cols-[minmax(20rem,28rem)_minmax(24rem,1fr)_minmax(14rem,26rem)] min-h-0 overflow-hidden"
            style={panelResize.mainStyle}
          >
            {/* Click-particle portal — above side panel, tabs, log; below action buttons (z-50).
              Drop elevation during pause/sleep so the fog overlays (z-40) can cover content. */}
            <div
              id={GAME_PARTICLE_LAYER_ID}
              className="pointer-events-none absolute inset-0"
              style={{
                zIndex:
                  idleModeDialog.isOpen || isPaused
                    ? undefined
                    : Z_INDEX.gameParticleLayer,
              }}
              aria-hidden
            />

            {/* Event Log - top on mobile, right column on desktop. Resizable via a handle on
              its bottom edge (mobile) / left edge (desktop). */}
            <div
              ref={panelResize.logRef}
              className="order-1 md:order-3 relative w-full h-[18vh] md:h-auto min-h-[6rem] md:min-h-0 overflow-hidden pt-1 md:pt-2 pr-2 pb-0 pl-1 md:border-l border-border"
              style={panelResize.logStyle}
            >
              <LogPanel />
              <PanelResizeHandle
                edge="log"
                onPointerDown={panelResize.startLogResize}
                onReset={panelResize.resetLog}
              />
            </div>

            {/* Resources Side Panel - below log on mobile, left column on desktop.
              Mobile: defaults to 36vh so the panel (and tabs/actions below it) keep a
              consistent height regardless of the active tab's side-panel content.
              Desktop: md:min-h-0 lets it shrink within the grid column. Resizable via a
              handle on its bottom edge (mobile) / right edge (desktop). */}
            <div
              ref={panelResize.sidePanelRef}
              className="order-2 md:order-1 relative h-[36vh] md:h-auto min-h-[36vh] md:min-h-0 w-full pr-0 border-t md:border-t-0 md:border-r border-border overflow-hidden"
              style={panelResize.sidePanelStyle}
            >
              <GameTabs />
              <PanelResizeHandle
                edge="sidePanel"
                onPointerDown={panelResize.startSidePanelResize}
                onReset={panelResize.resetSidePanel}
              />
            </div>

            {/* Game tab area - below side panel on mobile, middle column on desktop (flexible; shrinks first).
              Mobile: flex-1 so the section fills the space left by the fixed log/side panels and its
              inner action list scrolls internally — keeping panel heights consistent across tabs
              instead of growing with the active tab's content. (Ignored on desktop grid.) */}
            <section className="order-3 md:order-2 flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden md:pl-0">
              {/* Horizontal Game Tabs */}
              <nav className="relative border-t md:border-t-0 border-border pl-2 pr-2 flex-shrink-0">
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
                    <div className="flex w-full max-w-full flex-nowrap items-end gap-x-2">
                      <div
                        ref={tabButtonRowRef}
                        className="inline-flex min-w-0 flex-1 flex-nowrap items-end gap-x-2 overflow-x-auto scrollbar-hide"
                      >
                        <button
                          className={`${tabButtonClass} ${activeTab === "cave"
                            ? tabActiveTextClass
                            : tabInactiveTextClass
                            } `}
                          onClick={() => {
                            useGameStore.getState().trackButtonClick("tab-cave");
                            setActiveTab("cave");
                          }}
                          data-testid="tab-cave"
                        >
                          {t("tabs.cave", { ns: "common" })}
                        </button>

                        {villageTabVisible && (
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
                              useGameStore.getState().trackButtonClick("tab-village");
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

                        {forestTabVisible && (
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
                              useGameStore.getState().trackButtonClick("tab-forest");
                              clearTabAnimation("forest");
                              setActiveTab("forest");
                            }}
                            data-testid="tab-forest"
                          >
                            {t("tabs.forest", { ns: "common" })}
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
                              useGameStore.getState().trackButtonClick("tab-estate");
                              clearTabAnimation("estate");
                              setActiveTab("estate");
                            }}
                            data-testid="tab-estate"
                          >
                            {t("tabs.estate", { ns: "common" })}
                          </button>
                        )}

                        {bastionTabVisible && (
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
                              useGameStore.getState().trackButtonClick("tab-bastion");
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

                        {/* Achievements Tab Button */}
                        {achievementsUnlocked && (
                          <button
                            className={`${tabButtonClass} ${animatingTabs.has("achievements")
                              ? fadePhaseTabs.has("achievements")
                                ? "tab-fade-in"
                                : "tab-blink-new"
                              : activeTab === "achievements"
                                ? tabActiveTextClass
                                : tabInactiveTextClass
                              }`}
                            onClick={() => {
                              useGameStore.getState().trackButtonClick("tab-achievements");
                              clearTabAnimation("achievements");
                              markAchievementTabPulseViewed(
                                unclaimedAchievementIds,
                              );
                              setActiveTab("achievements");
                            }}
                            data-testid="tab-achievements"
                          >
                            <GameUiIcon
                              name="achievements"
                              sizeClassName={TAB_ICON_SIZE}
                              className={TAB_ICON_ALIGN_CLASS}
                            />
                          </button>
                        )}

                        {/* Timed Event Tab Button */}
                        {timedEventTab.isActive && (
                          <button
                            className={`${tabButtonClass} gap-1 ${activeTab === "timedevent" ||
                              timedEventTabPulseClass
                              ? tabActiveTextClass
                              : tabInactiveTextClass
                              }`}
                            onClick={() => {
                              useGameStore.getState().trackButtonClick("tab-timedevent");
                              setActiveTab("timedevent");
                            }}
                            data-testid="tab-timedevent"
                          >
                            <GameUiIcon
                              name="timedEvent"
                              sizeClassName={TAB_ICON_SIZE}
                              className={`timer-symbol ${TAB_TIMED_EVENT_ICON_CLASS} ${timedEventTabPulseClass}`}
                            />
                          </button>
                        )}
                      </div>

                      {traderUnlocked && !steamEditionActive && (
                        <TraderTabButton
                          tabButtonClass={tabButtonClass}
                          tabInactiveTextClass={tabInactiveTextClass}
                          isPaused={isPaused}
                          isAnimating={animatingTabs.has("trader")}
                          isFadePhase={fadePhaseTabs.has("trader")}
                          onClick={() => {
                            clearTabAnimation("trader");
                            setShopDialogOpen(true, "tab");
                          }}
                        />
                      )}
                    </div>
                  </>
                )}
              </nav>

              {/* Action Panels — above particle layer so bursts stay behind buttons.
                Clear z-index while paused/sleeping so the overlay (z-40) blocks clicks. */}
              <div
                className={`relative flex-1 overflow-x-hidden min-h-0 ${activeTab === "achievements"
                  ? "overflow-hidden"
                  : "overflow-y-auto scrollbar-hide"
                  }`}
                style={{
                  zIndex:
                    idleModeDialog.isOpen || isPaused
                      ? undefined
                      : Z_INDEX.gameActionButtons,
                }}
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

          {/* Sleep Mode Mist Background - covers main panels; header, footer, and promos stay above */}
          {idleModeDialog.isOpen && (
            <div
              className="fixed inset-0 pointer-events-auto"
              style={{
                top: GAME_HEADER_INSET,
                bottom: GAME_FOOTER_INSET,
                zIndex: Z_INDEX.sleepFog,
              }}
            >
              <MistBackground />
            </div>
          )}

          {/* Footer - above pause overlay so hover tooltips stay visible when paused */}
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
          <Suspense fallback={null}>
            <ShareDialog />
          </Suspense>
          {WebOnlyDialogs && !steamEditionActive && (
            <Suspense fallback={null}>
              <WebOnlyDialogs
                shopDialogOpen={shopDialogOpen}
                setShopDialogOpen={setShopDialogOpen}
                leaderboardDialogOpen={leaderboardDialogOpen}
                setLeaderboardDialogOpen={setLeaderboardDialogOpen}
              />
            </Suspense>
          )}
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
          <InsightPotionDialog
            isOpen={insightPotionDialog.isOpen}
            data={insightPotionDialog.data}
            onClose={() => setInsightPotionDialog(false)}
          />
          <VillageEffectDialog
            isOpen={villageEffectDialog.isOpen}
            data={villageEffectDialog.data}
            onClose={() => setVillageEffectDialog(false)}
          />
          <BlessingOfferDialog />
          {demoEditionActive && <DemoTimeUpDialog />}
        </div>
      </ProfileMenuProvider>
    </GameTooltipProvider>
  );
}
