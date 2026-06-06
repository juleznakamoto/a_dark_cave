import {
  useGameStore,
  StateManager,
  isModalDialogOpen,
  shouldFreezeTimedEventTabCountdown,
  syncTimedEventTabPauseTracking,
  getTimedEventTabEffectiveRemainingMs,
} from "./state";
import { saveGame } from "./save";
import { GameState } from "@shared/schema";
import {
  getCurrentPopulation,
  getPopulationProduction,
  getMaxPopulation,
  getDisgracedPriorFoodUpkeepPerCycle,
} from "./population";
import {
  addFreeVillagersWithinCap,
  killVillagers,
  buildGameState,
  applyResourceDeltas,
} from "@/game/stateHelpers";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import {
  getTotalMadness,
  getStrangerApproachProbability,
} from "./rules/effectsCalculation";
import { GAME_CONSTANTS } from "./constants";
import { logger } from "@/lib/logger";
import { startVersionCheck, stopVersionCheck } from "./versionCheck";
import { formatSaveTimestamp } from "@/lib/utils";
import { gameActions, canExecuteAction, shouldShowAction } from "./rules";
import { getResourceLimit, isResourceLimited } from "./resourceLimits";
import { getPriorActionSuccessor } from "./buttonUpgrades";
import {
  DISGRACED_PRIOR_UPGRADES,
} from "./rules/skillUpgrades";
import { CRUEL_MODE, cruelModeScale } from "./cruelMode";
import { getMadnessDeathChancePerCycle } from "./rules/effectsStats";
import {
  guestAuthNotificationTriggerUpdates,
  shouldTriggerGuestAuthNotification,
} from "./authNotificationAuto";
import { socialPromptHighestMilestoneIndexToOpen } from "./socialPromptAuto";
import { FEEDBACK_PROMPT_PLAY_MS } from "./feedbackPromptAuto";
import { isSocialPromoExclusiveRewardComplete } from "@/game/socialPromoExclusiveReward";
import { tickObsidianOrbFocus } from "@/game/obsidianOrb";
let gameLoopId: number | null = null;
let lastFrameTime = 0;

const PRIOR_EXECUTION_GAP_MS = 500;
// Tracks the last time the Disgraced Prior finished each action (ms timestamp)
const priorLastCompleted = new Map<string, number>();
// Tracks action executions currently in-flight that were started by the Prior
const priorInFlightExecutions = new Set<string>();

/**
 * Returns true if the Prior should auto-execute this action right now:
 * - At least 0.5 seconds has passed since the last Prior completion for this action
 * - Resource costs are affordable
 * - At least one output resource has room below the storage cap
 */
function canPriorExecute(actionId: string, state: GameState): boolean {
  // Require enough food for upkeep on every assigned action (matches handlePopulationSurvival once hunting has started).
  if (state.story?.seen?.hasHunted) {
    const upkeep = getDisgracedPriorFoodUpkeepPerCycle(state);
    if (upkeep > 0 && (state.resources?.food ?? 0) < upkeep) return false;
  }

  const now = Date.now();
  if (now - (priorLastCompleted.get(actionId) ?? 0) < PRIOR_EXECUTION_GAP_MS) return false;
  // Never re-trigger while this action is still executing.
  if ((state as any).executionStartTimes?.[actionId]) return false;

  // Don't execute actions that are no longer visible (e.g. superseded by a tool upgrade).
  // Without this check, the Prior drains resources for a hidden action indefinitely because
  // canExecuteAction does not verify shouldShowAction.
  if (actionId !== "feedFire" && !shouldShowAction(actionId, state as any)) return false;

  // Feed Fire is not part of the standard action registry checks.
  // Prior needs explicit affordability/availability logic for it.
  if (actionId === "feedFire") {
    const heartfireBuilt = (state.buildings?.heartfire ?? 0) > 0;
    const currentLevel = state.heartfireState?.level ?? 0;
    const woodCost = 50 * (currentLevel + 1);
    return heartfireBuilt && currentLevel < 5 && (state.resources?.wood ?? 0) >= woodCost;
  }

  if (!canExecuteAction(actionId, state)) return false;

  const action = gameActions[actionId];
  if (action?.effects) {
    const effectResult = typeof action.effects === "function"
      ? action.effects(state)
      : action.effects;
    // Resolve tiered effects
    const effects = typeof effectResult === "object" && effectResult !== null && !Array.isArray(effectResult)
      ? effectResult
      : {};
    const resourceLimit = getResourceLimit(state);

    // Never block actions that give silver or gold - they have no cap
    const hasUnlimitedOutput = Object.entries(effects).some(([key]) => {
      if (!key.startsWith("resources.")) return false;
      const rk = key.slice("resources.".length);
      return rk === "silver" || rk === "gold";
    });
    if (hasUnlimitedOutput) return true;

    const limitedOutputs = Object.entries(effects).filter(([key, value]) => {
      if (!key.startsWith("resources.")) return false;
      if (typeof value === "number" && value <= 0) return false;
      const rk = key.slice("resources.".length);
      return isResourceLimited(rk, state);
    });
    if (
      limitedOutputs.length > 0 &&
      limitedOutputs.every(([key]) => {
        const rk = key.slice("resources.".length);
        return ((state.resources as Record<string, number>)[rk] ?? 0) >= resourceLimit;
      })
    ) {
      return false;
    }
  }

  return true;
}
const TICK_INTERVAL = GAME_CONSTANTS.TICK_INTERVAL;
const EVENT_CHECK_INTERVAL = GAME_CONSTANTS.EVENT_CHECK_INTERVAL; // Roll events once per second (decoupled from the 250ms tick)
const AUTO_SAVE_INTERVAL_SIGNED_IN = 60 * 1000; // Cloud autosave every 1 minute
const AUTO_SAVE_INTERVAL_GUEST = 15 * 1000; // Local IndexedDB only — matches production tick
const PRODUCTION_INTERVAL = 15000; // All production and checks happen every 15 seconds
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minute in milliseconds
const TARGET_FPS = 4;
const FRAME_DURATION = 1000 / TARGET_FPS; // 250ms per frame at 4 FPS
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check session every 5 minutes

let tickAccumulator = 0;
/** Elapsed ms toward the next event roll; frozen during pause like `tickAccumulator` (not timestamp-based). */
let eventCheckAccumulator = 0;
let lastAutoSave = 0;
let lastProduction = 0;
let productionPauseStartedAt: number | null = null;
let loopProgressTimeoutId: NodeJS.Timeout | null = null;
let lastRenderTime = 0;
let lastUserActivity = 0;
let inactivityCheckInterval: NodeJS.Timeout | null = null;
let sessionCheckInterval: NodeJS.Timeout | null = null; // Added for session checking
let isInactive = false;
let lastGameLoadTime = 0; // Track when game was last loaded

/**
 * Time since the last user activity the game loop tracks (mouse, key, touch, scroll, tab visible again).
 * Returns 0 before `startGameLoop` initializes the baseline (treated as active so Playlight auto-discovery
 * does not run pre-game).
 */
export function getMsSinceUserActivity(): number {
  if (lastUserActivity === 0) return 0;
  return Date.now() - lastUserActivity;
}

export function startGameLoop() {
  if (gameLoopId) {
    return; // Already running
  }

  // Clear any timed event that expired while the game was closed (stale saved state).
  clearExpiredTimedEventTab();

  useGameStore.setState({ isGameLoopActive: true });
  const now = performance.now();
  lastFrameTime = now;
  lastRenderTime = now;
  lastProduction = now; // Reset production interval to start fresh
  productionPauseStartedAt = null;
  tickAccumulator = 0;
  eventCheckAccumulator = 0;
  // Initialize inactivity tracking
  lastUserActivity = Date.now();
  isInactive = false;

  // Set up activity listeners
  const activityEvents = [
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
    "mousemove",
  ];
  const handleActivity = (event: Event) => {
    lastUserActivity = Date.now();
  };

  activityEvents.forEach((event) => {
    window.addEventListener(event, handleActivity, { passive: true });
  });

  // Also track page visibility changes
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      lastUserActivity = Date.now();
      // Immediately clear any timed event that expired while the tab was hidden,
      // rather than waiting up to 15 seconds for the next production tick.
      clearExpiredTimedEventTab();
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Start inactivity checker (every 30 seconds)
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval);
  }
  inactivityCheckInterval = setInterval(() => {
    const now = Date.now();
    const state = useGameStore.getState();

    // Sleep mode: intentional absence of input — not an AFK timeout
    if (state.idleModeDialog?.isOpen || state.idleModeState?.isActive) {
      lastUserActivity = now;
      return;
    }

    const timeSinceActivity = now - lastUserActivity;

    // Don't trigger inactivity if the page is currently visible and active
    if (
      timeSinceActivity > INACTIVITY_TIMEOUT &&
      !isInactive &&
      !document.hidden
    ) {
      handleInactivity();
    }
  }, 30000); // Check every 30 seconds

  // Start session validation checker (every 60 seconds)
  // This checks if the user's session is still valid (not invalidated by another login)
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }
  const checkSession = async () => {
    const state = useGameStore.getState();

    // Check if user is signed in
    if (!state.isUserSignedIn) {
      return; // Not signed in, no need to check session
    }

    try {
      // Use refreshSession() to FORCE a server-side token exchange
      // This is the ONLY way to detect if the session was revoked by single-session enforcement
      const { getSupabaseClient } = await import("@/lib/supabase");
      const supabase = await getSupabaseClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      // If there's an error or no session, the token was invalidated server-side
      if (error || !session) {
        logger.log("[SESSION] Session invalidated - another login detected");
        // Delete local save when session is invalidated
        try {
          const { deleteSave } = await import("./save");
          await deleteSave();
        } catch (deleteError) {
          logger.error("[SESSION] Failed to delete save:", deleteError);
        }

        stopGameLoop();
        useGameStore.setState({
          inactivityDialogOpen: true,
          inactivityReason: "multitab",
        });
      }
    } catch (error) {
      logger.error("[SESSION] Session check failed:", error);
    }
  };
  sessionCheckInterval = setInterval(checkSession, SESSION_CHECK_INTERVAL);

  // Start version check
  startVersionCheck();

  // Check if idle mode needs to be displayed (user left during idle mode)
  const state = useGameStore.getState();
  if (state.idleModeState?.needsDisplay && state.idleModeState.startTime > 0) {
    // Open idle mode dialog to show accumulated resources
    setTimeout(() => {
      useGameStore.getState().setIdleModeDialog(true);
    }, 500);
  }

  function tick(timestamp: number) {
    // Limit to 10 FPS
    const timeSinceLastRender = timestamp - lastRenderTime;
    if (timeSinceLastRender < FRAME_DURATION) {
      gameLoopId = requestAnimationFrame(tick);
      return;
    }
    lastRenderTime = timestamp;

    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    // Get fresh state on each tick to avoid stale dialog states
    const state = useGameStore.getState();

    // Force pause if full game purchase is required (villageElderDecision seen and BTP=1)
    const requiresFullGamePurchase = state.story?.seen?.villageElderDecision && state.BTP === 1 && !Object.keys(state.activatedPurchases || {}).some(
      key => (key === 'full_game' || key.startsWith('purchase-full_game-')) && state.activatedPurchases?.[key]
    );

    // Blocking modals: `isModalDialogOpen` in state.ts (add new dialogs there only).
    const IsDialogOpen = isModalDialogOpen(state);

    const isPaused =
      state.isPaused ||
      IsDialogOpen ||
      requiresFullGamePurchase ||
      state.idleModeState?.isActive;

    if (isPaused) {
      // Stop all sounds when paused (unless already stopped by mute)
      if (!state.isPausedPreviously && (!state.sfxMuted || !state.musicMuted)) {
        audioManager.stopAllSounds();
        useGameStore.setState({ isPausedPreviously: true });
      }
      // Freeze production timer while paused so it can resume from remaining time.
      if (productionPauseStartedAt === null) {
        productionPauseStartedAt = timestamp;
      }
      // Skip everything when paused
      gameLoopId = requestAnimationFrame(tick);
      return;
    }

    // Resume production timer from where it left off before pause.
    if (productionPauseStartedAt !== null) {
      const pausedDuration = timestamp - productionPauseStartedAt;
      lastProduction += pausedDuration;
      productionPauseStartedAt = null;
    }

    // Resume sounds when exiting pause state
    if (state.isPausedPreviously) {
      audioManager.resumeSounds();
      useGameStore.setState({ isPausedPreviously: false });
    }

    if (!IsDialogOpen) {
      // Accumulate time for fixed timestep
      tickAccumulator += deltaTime;
    }

    // Update play time in state (only when not paused, not in idle mode, not inactive, and no dialogs open)
    // Note: This is OUTSIDE the isDialogOpen check so we track time properly
    const currentState = useGameStore.getState();
    if (
      !state.isPaused &&
      !currentState.idleModeState?.isActive &&
      !isInactive &&
      !IsDialogOpen // Added: Stop playTime when dialogs are open
    ) {
      currentState.updatePlayTime(deltaTime);
      useGameStore.getState().tickInvestmentHall();
    }

    if (!IsDialogOpen) {

      // Handle attack wave timer - update elapsed time when not paused
      const attackWaveTimers = state.attackWaveTimers || {};
      if (!isPaused) {
        // Update elapsed time for all active timers
        const updatedTimers: typeof attackWaveTimers = {};
        let hasUpdates = false;

        for (const [waveId, timer] of Object.entries(attackWaveTimers)) {
          if (!timer.defeated && timer.startTime > 0) {
            const newElapsed = (timer.elapsedTime || 0) + deltaTime;
            updatedTimers[waveId] = {
              ...timer,
              elapsedTime: newElapsed,
            };
            hasUpdates = true;
          } else {
            updatedTimers[waveId] = timer;
          }
        }

        if (hasUpdates) {
          useGameStore.setState({ attackWaveTimers: updatedTimers });
        }
      }

      // Process ticks in fixed intervals
      let ticksProcessed = 0;
      while (tickAccumulator >= TICK_INTERVAL) {
        tickAccumulator -= TICK_INTERVAL;
        processTick();
        ticksProcessed++;
      }

      // Roll events on a fixed 1s cadence (decoupled from the 250ms simulation tick).
      // Uses an accumulator (like tickAccumulator) so pause/dialog freeze does not credit
      // wall-clock gap — avoids an immediate roll on unpause. Probabilities are calibrated
      // to EVENT_CHECK_INTERVAL in EventManager.checkEvents.
      eventCheckAccumulator += deltaTime;
      while (eventCheckAccumulator >= EVENT_CHECK_INTERVAL) {
        eventCheckAccumulator -= EVENT_CHECK_INTERVAL;
        if (!useGameStore.getState().idleModeState?.isActive) {
          processEventCheck();
        }
      }

      // Auto-save logic (skip if inactive, recently loaded, or in sleep/idle mode)
      const timeSinceLoad = timestamp - lastGameLoadTime;
      const skipAutoSaveAfterLoad = timeSinceLoad > 0 && timeSinceLoad < 30000; // Skip for 30s after load
      const currentStateForSave = useGameStore.getState();
      const isInSleepMode = currentStateForSave.idleModeState?.isActive === true;

      const autoSaveInterval = currentStateForSave.isUserSignedIn
        ? AUTO_SAVE_INTERVAL_SIGNED_IN
        : AUTO_SAVE_INTERVAL_GUEST;

      if (
        timestamp - lastAutoSave >= autoSaveInterval &&
        !isInactive &&
        !skipAutoSaveAfterLoad &&
        !isInSleepMode
      ) {
        lastAutoSave = timestamp;
        handleAutoSave();
      }

      // Fresh state after playTime tick (do not redeclare `state` — shadows tick `state` above).
      const promptState = useGameStore.getState();
      const playTimeMs = promptState.playTime || 0;

      // Guest Profile sign-in dot: first after 15m play time, then every 60m play time (persisted).
      if (!promptState.isUserSignedIn) {
        const lastShown = promptState.lastAuthNotificationPlayTime ?? 0;
        if (
          shouldTriggerGuestAuthNotification({
            playTimeMs,
            lastShownPlayTimeMs: lastShown,
            authNotificationSeen: promptState.authNotificationSeen,
            authNotificationVisible: promptState.authNotificationVisible,
          })
        ) {
          useGameStore.setState(
            guestAuthNotificationTriggerUpdates({
              playTimeMs,
              lastShownPlayTimeMs: lastShown,
              authNotificationSeen: promptState.authNotificationSeen,
              authNotificationVisible: promptState.authNotificationVisible,
            }),
          );
        }
      }

      // Rewards dialog: auto-open at play-time milestones until exclusive-item tasks are done (same bar as profile shortcut).
      if (!isSocialPromoExclusiveRewardComplete(promptState)) {
        const milestoneToOpen = socialPromptHighestMilestoneIndexToOpen(
          playTimeMs,
          promptState.socialPromptMilestoneIndex ?? 0,
        );
        if (milestoneToOpen !== null) {
          useGameStore.setState({
            socialPromptDialogOpen: true,
            socialPromptMilestoneIndex: milestoneToOpen + 1,
          });
        }
      }

      // One-time feedback / contact dialog at 105 minutes of play.
      if (
        !promptState.feedbackPromptShown &&
        playTimeMs >= FEEDBACK_PROMPT_PLAY_MS &&
        !isModalDialogOpen(promptState)
      ) {
        useGameStore.setState({
          feedbackDialogOpen: true,
          feedbackPromptShown: true,
        });
      }

      // All production and game logic checks (every 15 seconds)
      if (timestamp - lastProduction >= PRODUCTION_INTERVAL) {
        // Set to 100% before resetting
        useGameStore.setState({ loopProgress: 100 });
        lastProduction = timestamp;

        // Reset to 0 after a brief moment to ensure 100% is visible
        if (loopProgressTimeoutId) clearTimeout(loopProgressTimeoutId);
        loopProgressTimeoutId = setTimeout(() => {
          useGameStore.setState({ loopProgress: 0 });
        }, 50);

        // Skip production if idle mode is active
        const currentState = useGameStore.getState();

        // Always check for expired timed events regardless of idle mode, so the
        // tab icon is never left visible after its timer has run out.
        clearExpiredTimedEventTab();

        if (!currentState.idleModeState?.isActive) {
          handleGathererProduction();
          handleHunterProduction();
          handleScholarProduction();
          handleMinerProduction();
          handlePopulationSurvival();
          handleStarvationCheck();
          handleFreezingCheck();
          handleMadnessCheck();
          handleStrangerApproach();
          // Event rolling now runs on the dedicated 1s EVENT_CHECK_INTERVAL cadence above,
          // so it is intentionally not invoked here (avoids double-rolling on production ticks).
        }
      } else {
        // Update loop progress (0-100 based on production cycle)
        const progressPercent =
          ((timestamp - lastProduction) / PRODUCTION_INTERVAL) * 100;
        useGameStore.setState({ loopProgress: Math.min(progressPercent, 100) });
      }
    }

    gameLoopId = requestAnimationFrame(tick);
  }

  gameLoopId = requestAnimationFrame(tick);
}

export function clearExpiredTimedEventTab() {
  syncTimedEventTabPauseTracking();
  const state = useGameStore.getState();
  if (!state.timedEventTab.isActive || !state.timedEventTab.expiryTime) return;
  if (state.isPaused || shouldFreezeTimedEventTabCountdown(state)) return;

  const remaining = getTimedEventTabEffectiveRemainingMs(state);
  if (remaining == null || remaining > 0) return;

  const ev = state.timedEventTab.event;
  /** Keep the timed tab while the dice UI is open — including the outcome screen after `outcome` is set — so the panel/dialog stay mounted until the player closes and `onClose` clears `gamblerGame`. */
  const gamblerDiceDialogKeepsTimedTab =
    ev?.id?.split("-")[0] === "gambler" &&
    state.gamblerDiceDialogOpen &&
    state.gamblerGame != null;
  if (gamblerDiceDialogKeepsTimedTab) return;

  logger.log("[GAME LOOP] Clearing expired timed event tab");
  const event = state.timedEventTab.event;
  if (event) {
    const timedEventId = event.id.split("-")[0];
    if (event.fallbackChoice && typeof event.fallbackChoice.effect === "function") {
      useGameStore.getState().applyEventChoice(event.fallbackChoice.id, timedEventId, event);
    } else {
      const choices = typeof event.choices === "function" ? event.choices(state) : event.choices;
      const fallbackChoice = Array.isArray(choices) ? choices.find((c) => c.id === "doNothing") : undefined;
      if (fallbackChoice && typeof fallbackChoice.effect === "function") {
        useGameStore.getState().applyEventChoice(fallbackChoice.id, timedEventId, event);
      }
    }
  }
  useGameStore.getState().setTimedEventTab(false);
}

async function handleInactivity() {
  isInactive = true;

  // Stop the game loop
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }

  // Stop inactivity checker
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval);
    inactivityCheckInterval = null;
  }

  // Stop session checker
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }

  // Stop version check
  stopVersionCheck();

  // Save game before showing dialog (must happen before setting inactivityDialogOpen,
  // since saveGame skips when inactivityDialogOpen is true)
  try {
    const state = useGameStore.getState();
    await saveGame(state, false);
    logger.log("[GAME LOOP] Game saved before inactivity dialog");
  } catch (saveError) {
    logger.error("[GAME LOOP] Failed to save before inactivity dialog:", saveError);
  }

  // Set game loop to inactive
  useGameStore.setState({
    isGameLoopActive: false,
    inactivityDialogOpen: true,
    inactivityReason: "timeout",
  });
}

export function setLastGameLoadTime(time: number) {
  lastGameLoadTime = time;
}

/** Reset the production cycle so the next tick starts a fresh 15-second interval. Called when waking from sleep. */
export function resetProductionCycle() {
  lastProduction = performance.now();
  productionPauseStartedAt = null;
  eventCheckAccumulator = 0;
}

export function stopGameLoop() {
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  if (loopProgressTimeoutId) {
    clearTimeout(loopProgressTimeoutId);
    loopProgressTimeoutId = null;
  }
  productionPauseStartedAt = null;

  // Clean up inactivity checker
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval);
    inactivityCheckInterval = null;
  }

  // Clean up session checker
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }

  // Clean up version check
  stopVersionCheck();

  // Remove activity listeners
  const activityEvents = [
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
    "mousemove",
  ];
  const handleActivity = () => { }; // Dummy function for removal
  activityEvents.forEach((event) => {
    window.removeEventListener(event, handleActivity);
  });

  // Remove visibility listener
  const handleVisibilityChange = () => { };
  document.removeEventListener("visibilitychange", handleVisibilityChange);

  StateManager.clearUpdateTimer();
}

/** Cooldowns, executions, prior automation, and timed buff expiry — no random events. */
export function processActionTicks() {
  const state = useGameStore.getState();

  // Tick down cooldowns
  state.tickCooldowns();

  // Complete any actions that have finished their execution time
  const { executionStartTimes, executionDurations, completeActionExecution } = state;
  const now = Date.now();
  for (const actionId of Object.keys(executionStartTimes || {})) {
    const startTime = executionStartTimes[actionId];
    const durationSec = executionDurations?.[actionId];
    if (startTime && durationSec && (now - startTime) / 1000 >= durationSec) {
      completeActionExecution(actionId);
      if (priorInFlightExecutions.has(actionId)) {
        priorInFlightExecutions.delete(actionId);
        priorLastCompleted.set(actionId, Date.now());
      }
    }
  }

  // Disgraced Prior: auto-execute assigned actions when cooldown is 0 and conditions are met.
  // We check isReadyNow (not just the transition from >0 to 0) so that actions blocked by
  // a full storage cap resume automatically once storage frees up.
  // Note: processTick is not called during events (eventDialog.isOpen) or sleep
  // (idleModeState?.isActive) — the outer loop returns early in those cases.
  let freshState = useGameStore.getState();
  if (freshState.fellowship?.disgraced_prior) {
    const assigned = freshState.priorAssignedActions ?? [];

    // When an assigned action's show_when conditions are no longer met, automatically
    // transfer the assignment to the next visible action in the same upgrade chain, or drop it if no successor exists.
    const isVisible = (id: string) => id === "feedFire" || shouldShowAction(id, freshState as unknown as GameState);
    const staleActions = assigned.filter((id) => !isVisible(id));

    // The list we'll actually execute this tick — starts as the non-stale assignments
    // and is extended with any successors found for stale ones so they execute immediately.
    let toExecute = assigned.filter((id) => !staleActions.includes(id));

    if (staleActions.length > 0) {
      const level = freshState.disgracedPriorSkills?.level ?? 0;
      const maxActions = DISGRACED_PRIOR_UPGRADES[level]?.maxActions ?? 1;

      for (const staleId of staleActions) {
        const successor = getPriorActionSuccessor(staleId, isVisible);
        if (successor && !toExecute.includes(successor) && toExecute.length < maxActions) {
          toExecute = [...toExecute, successor];
        }
      }

      useGameStore.setState({ priorAssignedActions: toExecute });
    }

    for (const actionId of toExecute) {
      freshState = useGameStore.getState();
      const isReadyNow = (freshState.cooldowns[actionId] ?? 0) === 0;
      if (isReadyNow && canPriorExecute(actionId, freshState as unknown as GameState)) {
        freshState.executeAction(actionId, { executionSource: "prior" });
        const afterExecution = useGameStore.getState();
        if (afterExecution.executionStartTimes?.[actionId]) {
          priorInFlightExecutions.add(actionId);
        } else {
          priorLastCompleted.set(actionId, Date.now());
        }
      }
    }
  }

  // Check if feast has expired
  if (state.feastState?.isActive && state.feastState.endTime <= Date.now()) {
    useGameStore.setState({
      feastState: {
        ...state.feastState,
        isActive: false,
      },
    });
  }

  // Check if Great Feast has expired
  if (
    state.greatFeastState?.isActive &&
    state.greatFeastState.endTime <= Date.now()
  ) {
    useGameStore.setState({
      greatFeastState: {
        ...state.greatFeastState,
        isActive: false,
      },
    });
  }

  // Check if Solstice Gathering has expired
  if (
    state.solsticeState?.isActive &&
    state.solsticeState.endTime <= Date.now()
  ) {
    useGameStore.setState({
      solsticeState: {
        ...state.solsticeState,
        isActive: false,
      },
    });
  }

  // Check if curse has expired
  if (state.curseState?.isActive && state.curseState.endTime <= Date.now()) {
    useGameStore.setState({
      curseState: {
        ...state.curseState,
        isActive: false,
      },
    });
  }

  // Check if frostfall has expired
  if (
    state.frostfallState?.isActive &&
    state.frostfallState.endTime <= Date.now()
  ) {
    useGameStore.setState({
      frostfallState: {
        ...state.frostfallState,
        isActive: false,
      },
    });
  }

  // Check if fog has expired
  if (state.fogState?.isActive && state.fogState.endTime <= Date.now()) {
    useGameStore.setState({
      fogState: {
        ...state.fogState,
        isActive: false,
      },
    });
  }

  // Check if villager disgust has expired
  if (
    state.disgustState?.isActive &&
    state.disgustState.endTime <= Date.now()
  ) {
    useGameStore.setState({
      disgustState: {
        ...state.disgustState,
        isActive: false,
      },
    });
  }

  // Check if focus has expired
  if (state.focusState?.isActive && state.focusState.endTime <= Date.now()) {
    useGameStore.setState({
      focusState: {
        ...state.focusState,
        isActive: false,
      },
    });
  }

  const obsidianOrbPatch = tickObsidianOrbFocus(
    useGameStore.getState() as GameState,
  );
  if (obsidianOrbPatch) {
    useGameStore.setState((s) => ({
      focusState: {
        ...s.focusState,
        ...obsidianOrbPatch.focusState,
      },
      obsidianOrbState: obsidianOrbPatch.obsidianOrbState,
      totalFocusEarned:
        (s.totalFocusEarned || 0) + obsidianOrbPatch.totalFocusEarned,
    }));
  }

  // Check if mining boost has expired
  if (
    state.miningBoostState?.isActive &&
    state.miningBoostState.endTime <= Date.now()
  ) {
    useGameStore.setState({
      miningBoostState: {
        ...state.miningBoostState,
        isActive: false,
      },
    });
  }
}

function processTick() {
  processActionTicks();
}

/**
 * Roll random/story/attack-wave events. Runs on the 1s EVENT_CHECK_INTERVAL cadence rather than
 * every simulation tick, so event scanning (which grows with unlocked content) is ~4x cheaper.
 */
function processEventCheck() {
  const state = useGameStore.getState();

  // Check for random events
  const prevEvents = { ...state.events };
  state.checkEvents();

  // Trigger save if events changed (for cube events persistence)
  // Skip save during sleep/idle mode
  const eventsChanged = Object.keys(state.events).some(
    (key) => state.events[key] !== prevEvents[key],
  );
  if (eventsChanged && import.meta.env.DEV && !state.idleModeState?.isActive) {
    // Manually call autosave to persist events changes
    handleAutoSave();
  }
}

/** Accumulate a production output/consumption delta into a batch map. */
function addDelta(
  deltas: Record<string, number>,
  resource: string,
  amount: number,
): void {
  deltas[resource] = (deltas[resource] ?? 0) + amount;
}

/** Apply a batch of resource deltas in a single store write (skips empty batches). */
function commitResourceDeltas(deltas: Record<string, number>): void {
  if (Object.keys(deltas).length === 0) return;
  useGameStore.setState((s) =>
    applyResourceDeltas(s, deltas as Partial<Record<keyof typeof s.resources, number>>),
  );
}

function handleGathererProduction() {
  const state = useGameStore.getState();
  const gatherer = state.villagers.gatherer;

  if (gatherer > 0) {
    const deltas: Record<string, number> = {};
    const production = getPopulationProduction("gatherer", gatherer, state);
    production.forEach((prod) => {
      addDelta(deltas, prod.resource, prod.totalAmount);
    });
    // Single batched write applies resource limits via applyResourceDeltas (capResourceToLimit).
    commitResourceDeltas(deltas);
  }
}

function handleHunterProduction() {
  const state = useGameStore.getState();
  const hunter = state.villagers.hunter;

  if (hunter > 0) {
    const deltas: Record<string, number> = {};
    const production = getPopulationProduction("hunter", hunter, state);
    production.forEach((prod) => {
      addDelta(deltas, prod.resource, prod.totalAmount);
    });
    commitResourceDeltas(deltas);
  }
}

function handleScholarProduction() {
  const state = useGameStore.getState();
  const scholarCount = state.villagers.scholar ?? 0;

  if (scholarCount > 0) {
    const deltas: Record<string, number> = {};
    const production = getPopulationProduction("scholar", scholarCount, state);
    production.forEach((prod) => {
      if (prod.totalAmount > 0) {
        addDelta(deltas, prod.resource, prod.totalAmount);
      }
    });
    commitResourceDeltas(deltas);
  }
}

function handleMinerProduction() {
  const state = useGameStore.getState();

  // Collect all production data
  const allProduction: { job: string; production: any[] }[] = [];
  Object.entries(state.villagers).forEach(([job, count]) => {
    if (
      count > 0 &&
      (job.endsWith("miner") ||
        job === "steel_forger" ||
        job === "blacksteel_forger" ||
        job === "tanner" ||
        job === "powder_maker" ||
        job === "ashfire_dust_maker")
    ) {
      const production = getPopulationProduction(job, count, state);
      allProduction.push({ job, production });
    }
  });

  // Track available resources after each job's production/consumption (sequential affordability),
  // and accumulate the net deltas so they can all be applied in one store write at the end.
  const availableResources = { ...state.resources };
  const deltas: Record<string, number> = {};
  // Accumulate steel produced by steel forgers this tick for the "Forge Steel" achievement.
  let steelForgedThisTick = 0;

  // Process each job sequentially
  allProduction.forEach(({ job, production }) => {
    // Check if this job can produce based on currently available resources
    const canProduce = production.every((prod) => {
      if (prod.totalAmount < 0) {
        // Consumption - check if we have enough available
        const available =
          availableResources[
          prod.resource as keyof typeof availableResources
          ] || 0;
        return available >= Math.abs(prod.totalAmount);
      }
      return true; // Production is always allowed
    });

    // Only apply production if all resources are available
    if (canProduce) {
      production.forEach((prod) => {
        // Update the tracked available resources (for the next job's affordability check)
        // and accumulate the delta for a single batched commit.
        availableResources[prod.resource as keyof typeof availableResources] =
          (availableResources[
            prod.resource as keyof typeof availableResources
          ] || 0) + prod.totalAmount;

        addDelta(deltas, prod.resource, prod.totalAmount);

        if (job === "steel_forger" && prod.resource === "steel" && prod.totalAmount > 0) {
          steelForgedThisTick += prod.totalAmount;
        }
      });
    }
  });

  commitResourceDeltas(deltas);

  if (steelForgedThisTick > 0) {
    useGameStore.setState((s) => ({
      story: {
        ...s.story,
        seen: {
          ...s.story.seen,
          steelForgedTotal:
            (Number(s.story?.seen?.steelForgedTotal) || 0) + steelForgedThisTick,
        },
      },
    }));
  }
}

function handlePopulationSurvival() {
  const state = useGameStore.getState();

  const totalPopulation = state.current_population;

  const priorFoodPerCycle = getDisgracedPriorFoodUpkeepPerCycle(state);

  if (totalPopulation === 0 && priorFoodPerCycle === 0) return;

  if (!state.story.seen.hasHunted) return;

  // Handle food consumption (but not starvation - that's handled by events)
  const foodNeeded = totalPopulation + priorFoodPerCycle;
  const availableFood = state.resources.food;

  if (availableFood >= foodNeeded) {
    // Everyone can eat, consume food normally
    state.updateResource("food", -foodNeeded);
  } else {
    // Not enough food, consume all available food (starvation event will trigger separately)
    state.updateResource("food", -availableFood);
  }

  // Handle wood consumption (1 wood per villager for heating/shelter)
  if (totalPopulation === 0) return;

  const woodNeeded = totalPopulation;
  const availableWood = state.resources.wood;

  if (availableWood >= woodNeeded) {
    // Consume wood normally
    state.updateResource("wood", -woodNeeded);
  } else {
    // Not enough wood, consume all available wood (freezing check will handle deaths)
    state.updateResource("wood", -availableWood);
  }
}

function handleStarvationCheck() {
  const state = useGameStore.getState();

  if (!state.story.seen.hasHunted) return;

  const totalPopulation = state.current_population;
  if (totalPopulation === 0) return;

  const availableFood = state.resources.food;

  if (availableFood === 0) {
    // 5% chance for each villager to die from starvation
    let starvationDeaths = 0;
    for (let i = 0; i < totalPopulation; i++) {
      if (
        Math.random() <
        CRUEL_MODE.loop.starvationDeathPerVillager.base +
        cruelModeScale(state) * CRUEL_MODE.loop.starvationDeathPerVillager.whenCruel
      ) {
        starvationDeaths++;
      }
    }

    if (starvationDeaths > 0) {
      // Use the centralized killVillagers function
      const deathResult = killVillagers(state, starvationDeaths);

      useGameStore.setState((s) => ({
        villagers: deathResult.villagers || s.villagers,
        ...(deathResult.stats && {
          stats: { ...s.stats, ...deathResult.stats },
        }),
      }));

      const message =
        starvationDeaths === 1
          ? "One villager succumbs to starvation."
          : `${starvationDeaths} villagers starve to death.`;

      state.addLogEntry({
        id: `starvation-${Date.now()}`,
        message,
        logKey:
          starvationDeaths === 1
            ? "starvationDeath.one"
            : "starvationDeath.other",
        logVars:
          starvationDeaths === 1 ? undefined : { count: starvationDeaths },
        timestamp: Date.now(),
        type: "system",
      });

      // Update population after applying changes
      setTimeout(() => state.updatePopulation(), 0);
    }
  }
}

function handleFreezingCheck() {
  const state = useGameStore.getState();

  const totalPopulation = state.current_population;

  if (totalPopulation > 0 && state.resources.wood === 0) {
    // 5% chance for each villager to die from cold
    let freezingDeaths = 0;
    for (let i = 0; i < totalPopulation; i++) {
      if (
        Math.random() <
        CRUEL_MODE.loop.freezingDeathPerVillager.base +
        cruelModeScale(state) * CRUEL_MODE.loop.freezingDeathPerVillager.whenCruel
      ) {
        freezingDeaths++;
      }
    }

    if (freezingDeaths > 0) {
      // Use the centralized killVillagers function
      const deathResult = killVillagers(state, freezingDeaths);

      useGameStore.setState((s) => ({
        villagers: deathResult.villagers || s.villagers,
        ...(deathResult.stats && {
          stats: { ...s.stats, ...deathResult.stats },
        }),
      }));

      const message =
        freezingDeaths === 1
          ? "One villager freezes to death in the cold."
          : `${freezingDeaths} villagers freeze to death in the cold.`;

      state.addLogEntry({
        id: `freezing-${Date.now()}`,
        message,
        logKey:
          freezingDeaths === 1 ? "freezingDeath.one" : "freezingDeath.other",
        logVars: freezingDeaths === 1 ? undefined : { count: freezingDeaths },
        timestamp: Date.now(),
        type: "system",
      });

      // Update population after applying changes
      setTimeout(() => state.updatePopulation(), 0);
    }
  }
}

function handleMadnessCheck() {
  const state = useGameStore.getState();

  const totalPopulation = state.current_population;

  if (totalPopulation === 0) return;

  // Get total madness using the centralized calculation function
  const totalMadness = getTotalMadness(state);
  if (totalMadness <= 0) return;

  const probability = getMadnessDeathChancePerCycle(
    totalMadness,
    Boolean(state.cruelMode),
  );
  const md = CRUEL_MODE.loop.madnessDeath;

  // Check if a madness death event occurs
  if (Math.random() < probability) {
    // Determine number of deaths: 0, 1, 2, or 4 villagers
    const rand = Math.random() + cruelModeScale(state) * md.deathRollBiasWhenCruel;
    let madnessDeaths = 0;

    if (rand < 0.6) {
      madnessDeaths = 1;
    } else if (rand < 0.8) {
      madnessDeaths = 2;
    } else if (rand < 0.95) {
      madnessDeaths = 3;
    } else {
      madnessDeaths = 4;
    }

    // Cap deaths at current population
    madnessDeaths = Math.min(madnessDeaths, totalPopulation);

    if (madnessDeaths > 0) {
      // Use the centralized killVillagers function
      const deathResult = killVillagers(state, madnessDeaths);

      useGameStore.setState((s) => ({
        villagers: deathResult.villagers || s.villagers,
        ...(deathResult.stats && {
          stats: { ...s.stats, ...deathResult.stats },
        }),
      }));

      const message =
        madnessDeaths === 1
          ? `One villager succumbs to madness and takes his own life.`
          : `${madnessDeaths} villagers succumb to madness and take their own lives.`;

      state.addLogEntry({
        id: `madness-death-${Date.now()}`,
        message,
        logKey:
          madnessDeaths === 1 ? "madnessDeath.one" : "madnessDeath.other",
        logVars: madnessDeaths === 1 ? undefined : { count: madnessDeaths },
        timestamp: Date.now(),
        type: "system",
      });

      // Update population after applying changes
      setTimeout(() => state.updatePopulation(), 0);
    }
  }
}

async function handleAutoSave() {
  const state = useGameStore.getState();
  const gameState: GameState = buildGameState(state);

  try {
    // If this is a new game, save playTime as the current session time only
    // Otherwise, save the accumulated playTime
    const playTimeToSave = state.isNewGame ? 0 : state.playTime;

    await saveGame(gameState, playTimeToSave);
    const timestamp = formatSaveTimestamp();

    useGameStore.setState({
      lastSaved: timestamp,
      isNewGame: false,
    });
  } catch (error) { }
}

function handleStrangerApproach() {
  const state = useGameStore.getState();

  const currentPopulation = getCurrentPopulation(state);
  const maxPopulation = getMaxPopulation(state);

  // Only trigger if there's room for more villagers
  if (currentPopulation >= maxPopulation) return;

  const { probability } = getStrangerApproachProbability(state);

  // Check if stranger(s) approach based on probability
  if (Math.random() < probability) {
    // Calculate available room
    const currentPop = getCurrentPopulation(state);
    const maxPop = getMaxPopulation(state);
    const availableRoom = maxPop - currentPop;

    let strangersCount = 1; // Default to 1 stranger

    // multiple strangers approach at once
    if (state.buildings.stoneHut >= 1) {
      let multiStrangerMultiplier = 1.0;
      if (state.blessings?.ravens_mark) {
        multiStrangerMultiplier += 0.2;
      }
      if (state.blessings?.ravens_mark_enhanced) {
        multiStrangerMultiplier += 0.3;
      }

      if (state.buildings.woodenHut >= 10) {
        multiStrangerMultiplier += 0.15;
      }

      if (state.buildings.stoneHut >= 10) {
        multiStrangerMultiplier += 0.2;
      }

      if (state.buildings.longhouse >= 5) {
        multiStrangerMultiplier += 0.1;
      }

      if (state.buildings.furTents >= 5) {
        multiStrangerMultiplier += 0.1;
      }

      if (state.cruelMode) {
        multiStrangerMultiplier -= CRUEL_MODE.loop.multiStrangerCruelPenalty;
      }

      let moreStrangersProbability = Math.random();
      if (
        availableRoom >= 5 &&
        moreStrangersProbability < 0.1 * multiStrangerMultiplier
      ) {
        strangersCount = 5;
      } else if (
        availableRoom >= 4 &&
        moreStrangersProbability < 0.2 * multiStrangerMultiplier
      ) {
        strangersCount = 4;
      } else if (
        availableRoom >= 3 &&
        moreStrangersProbability < 0.3 * multiStrangerMultiplier
      ) {
        strangersCount = 3;
      } else if (
        availableRoom >= 2 &&
        moreStrangersProbability < 0.4 * multiStrangerMultiplier
      ) {
        strangersCount = 2;
      }
    }

    const STRANGER_SINGLE_LOG_KEYS = [
      "stranger.variant0",
      "stranger.variant1",
      "stranger.variant2",
      "stranger.variant3",
      "stranger.variant4",
      "stranger.variant5",
    ] as const;

    const STRANGER_SINGLE_MESSAGES = [
      "A stranger approaches and joins the village.",
      "A traveler arrives and decides to stay.",
      "A wanderer appears and becomes part of the community.",
      "Someone approaches the village and settles in.",
      "A stranger joins the community.",
      "A newcomer arrives and makes themselves at home.",
    ] as const;

    const STRANGER_MULTI_LOG_KEYS = [
      "stranger.multiple0",
      "stranger.multiple1",
      "stranger.multiple2",
    ] as const;

    const STRANGER_MULTI_MESSAGES = [
      (count: number) => `${count} strangers join the village.`,
      (count: number) => `${count} travelers arrive and decide to stay.`,
      (count: number) => `${count} wanderers arrive and join the community.`,
    ] as const;

    const useMultiStrangerMessages = strangersCount > 1;
    const variantIndex = Math.floor(
      Math.random() *
      (useMultiStrangerMessages
        ? STRANGER_MULTI_LOG_KEYS.length
        : STRANGER_SINGLE_LOG_KEYS.length),
    );
    const logKey = useMultiStrangerMessages
      ? STRANGER_MULTI_LOG_KEYS[variantIndex]
      : STRANGER_SINGLE_LOG_KEYS[variantIndex];
    const selectedMessage = useMultiStrangerMessages
      ? STRANGER_MULTI_MESSAGES[variantIndex](strangersCount)
      : STRANGER_SINGLE_MESSAGES[variantIndex];

    const gameStateForCap = buildGameState(state);
    const { added, patch } = addFreeVillagersWithinCap(
      gameStateForCap,
      strangersCount,
    );

    if (added <= 0) return;

    useGameStore.setState({
      ...patch,
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          ...(patch.story?.seen),
          hasVillagers: true,
        },
      },
    });

    // Add log entry for stranger approach
    state.addLogEntry({
      id: `stranger-approaches-${Date.now()}`,
      message: selectedMessage,
      logKey,
      logVars: useMultiStrangerMessages ? { count: strangersCount } : undefined,
      timestamp: Date.now(),
      type: "system",
      newVillagers: true,
    });

    // Play new villager sound
    audioManager.playSound("newVillager", SOUND_VOLUME.newVillager);
  }
}

// Export the manual save function
export async function manualSave() {
  const state = useGameStore.getState();

  const gameState: GameState = buildGameState(state);

  try {
    // If this is a new game, save playTime as 0 to reset the counter
    // Otherwise, save the accumulated playTime
    const playTimeToSave = state.isNewGame ? 0 : state.playTime;
    await saveGame(gameState, playTimeToSave);
    const now = new Date().toLocaleTimeString();
    useGameStore.setState({ lastSaved: now, isNewGame: false });
  } catch (error) {
    throw error;
  }
}