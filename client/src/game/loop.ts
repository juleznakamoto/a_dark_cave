import {
  useGameStore,
  StateManager,
  isModalDialogOpen,
  syncTimedEventTabPauseTracking,
  getTimedEventTabEffectiveRemainingMs,
} from "./state";
import { saveGame } from "./save";
import { GameState } from "@shared/schema";
import {
  getCurrentPopulation,
  getPopulationProduction,
  getMaxPopulation,
} from "./population";
import {
  addFreeVillagersWithinCap,
  killVillagers,
  buildGameState,
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
import { DISGRACED_PRIOR_UPGRADES } from "./rules/skillUpgrades";
import { CRUEL_MODE, cruelModeScale } from "./cruelMode";

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
const AUTO_SAVE_INTERVAL = 60 * 1000; // Auto-save every 1 minute
const PRODUCTION_INTERVAL = 15000; // All production and checks happen every 15 seconds
const SHOP_NOTIFICATION_INITIAL_DELAY = 45 * 60 * 1000; // 45 minutes in milliseconds
const SHOP_NOTIFICATION_REPEAT_INTERVAL = 90 * 60 * 1000; // 90 minutes in milliseconds
const AUTH_NOTIFICATION_INITIAL_DELAY = 15 * 60 * 1000; // 15 minutes in milliseconds
const AUTH_NOTIFICATION_REPEAT_INTERVAL = 60 * 60 * 1000; // 60 minutes in milliseconds
const SIGN_UP_PROMPT_INITIAL_DELAY = 30 * 60 * 1000; // 30 minutes of play time
const SIGN_UP_PROMPT_REPEAT_INTERVAL = 60 * 60 * 1000; // 60 minutes between prompts

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minute in milliseconds
const TARGET_FPS = 4;
const FRAME_DURATION = 1000 / TARGET_FPS; // 250ms per frame at 4 FPS
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check session every 5 minutes

let tickAccumulator = 0;
let lastAutoSave = 0;
let lastProduction = 0;
let productionPauseStartedAt: number | null = null;
let gameStartTime = 0;
let lastShopNotificationTime = 0;
let lastAuthNotificationTime = 0;
let loopProgressTimeoutId: NodeJS.Timeout | null = null;
let lastRenderTime = 0;
let lastUserActivity = 0;
let inactivityCheckInterval: NodeJS.Timeout | null = null;
let sessionCheckInterval: NodeJS.Timeout | null = null; // Added for session checking
let isInactive = false;
let lastGameLoadTime = 0; // Track when game was last loaded

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
  if (gameStartTime === 0) {
    gameStartTime = now; // Set game start time only once
  }

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

      // Auto-save logic (skip if inactive, recently loaded, or in sleep/idle mode)
      const timeSinceLoad = timestamp - lastGameLoadTime;
      const skipAutoSaveAfterLoad = timeSinceLoad > 0 && timeSinceLoad < 30000; // Skip for 30s after load
      const currentStateForSave = useGameStore.getState();
      const isInSleepMode = currentStateForSave.idleModeState?.isActive === true;

      if (
        timestamp - lastAutoSave >= AUTO_SAVE_INTERVAL &&
        !isInactive &&
        !skipAutoSaveAfterLoad &&
        !isInSleepMode
      ) {
        lastAutoSave = timestamp;
        handleAutoSave();
      }

      // Shop notification logic (first after 30 minutes, then every 60 minutes)
      if (gameStartTime > 0) {
        const elapsedSinceStart = timestamp - gameStartTime;
        const state = useGameStore.getState();

        // First notification after 30 minutes
        if (
          elapsedSinceStart >= SHOP_NOTIFICATION_INITIAL_DELAY &&
          lastShopNotificationTime === 0
        ) {
          lastShopNotificationTime = timestamp;
          if (state.shopNotificationSeen) {
            useGameStore.setState({
              shopNotificationSeen: false,
              shopNotificationVisible: true,
            });
          } else if (!state.shopNotificationVisible) {
            useGameStore.setState({ shopNotificationVisible: true });
          }
        }
        // Subsequent notifications every 60 minutes after the last one
        else if (
          lastShopNotificationTime > 0 &&
          timestamp - lastShopNotificationTime >=
          SHOP_NOTIFICATION_REPEAT_INTERVAL
        ) {
          lastShopNotificationTime = timestamp;
          if (state.shopNotificationSeen) {
            useGameStore.setState({ authNotificationSeen: false });
          }
        }

        // Auth notification logic (first after 15 minutes, then every 60 minutes) - only if not signed in
        if (!state.isUserSignedIn) {
          // First notification after 15 minutes
          if (
            elapsedSinceStart >= AUTH_NOTIFICATION_INITIAL_DELAY &&
            lastAuthNotificationTime === 0
          ) {
            lastAuthNotificationTime = timestamp;
            if (state.authNotificationSeen) {
              useGameStore.setState({
                authNotificationSeen: false,
                authNotificationVisible: true,
              });
            } else if (!state.authNotificationVisible) {
              useGameStore.setState({ authNotificationVisible: true });
            }
          }
          // Subsequent notifications every 60 minutes after the last one
          else if (
            lastAuthNotificationTime > 0 &&
            timestamp - lastAuthNotificationTime >=
            AUTH_NOTIFICATION_REPEAT_INTERVAL
          ) {
            lastAuthNotificationTime = timestamp;
            if (state.authNotificationSeen) {
              useGameStore.setState({ authNotificationSeen: false });
            }
          }
        }

        // Sign-up prompt dialog (first after 30 min play time, then every 30 min) - only if not signed in
        if (!state.isUserSignedIn) {
          const playTime = state.playTime || 0;
          const lastShown = state.lastSignUpPromptPlayTime || 0;

          // First prompt after 30 minutes of play time
          if (playTime >= SIGN_UP_PROMPT_INITIAL_DELAY && lastShown === 0) {
            useGameStore.setState({
              signUpPromptDialogOpen: true,
              lastSignUpPromptPlayTime: playTime,
            });
          }
          // Subsequent prompts every 30 minutes of play time after the last one
          else if (
            lastShown > 0 &&
            playTime >= lastShown + SIGN_UP_PROMPT_REPEAT_INTERVAL
          ) {
            useGameStore.setState({
              signUpPromptDialogOpen: true,
              lastSignUpPromptPlayTime: playTime,
            });
          }
        }

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
          handleMinerProduction();
          handlePopulationSurvival();
          handleStarvationCheck();
          handleFreezingCheck();
          handleMadnessCheck();
          handleStrangerApproach();

          // Check for events (including attack waves) - but NOT when dialogs are open
          if (!IsDialogOpen) {
            currentState.checkEvents();
          }
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
  if (state.isPaused || isModalDialogOpen(state)) return;

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

function processTick() {
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
        freshState.executeAction(actionId);
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

  // Check if focus has expired
  if (state.focusState?.isActive && state.focusState.endTime <= Date.now()) {
    useGameStore.setState({
      focusState: {
        ...state.focusState,
        isActive: false,
      },
    });
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

function handleGathererProduction() {
  const state = useGameStore.getState();
  const gatherer = state.villagers.gatherer;

  if (gatherer > 0) {
    const updates: Record<string, number> = {};
    const production = getPopulationProduction("gatherer", gatherer, state);
    production.forEach((prod) => {
      updates[prod.resource] = prod.totalAmount;
      // updateResource automatically applies resource limits via capResourceToLimit
      state.updateResource(
        prod.resource as keyof typeof state.resources,
        prod.totalAmount,
      );
    });
  }
}

function handleHunterProduction() {
  const state = useGameStore.getState();
  const hunter = state.villagers.hunter;

  if (hunter > 0) {
    const production = getPopulationProduction("hunter", hunter, state);
    production.forEach((prod) => {
      // updateResource automatically applies resource limits via capResourceToLimit
      state.updateResource(
        prod.resource as keyof typeof state.resources,
        prod.totalAmount,
      );
    });
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

  // Track available resources after each job's production/consumption
  const availableResources = { ...state.resources };

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
        // Update both the tracked available resources and the actual state
        availableResources[prod.resource as keyof typeof availableResources] =
          (availableResources[
            prod.resource as keyof typeof availableResources
          ] || 0) + prod.totalAmount;

        state.updateResource(
          prod.resource as keyof typeof state.resources,
          prod.totalAmount,
        );
      });
    }
  });
}

function handlePopulationSurvival() {
  const state = useGameStore.getState();

  const totalPopulation = state.current_population;

  if (totalPopulation === 0) return;

  if (!state.story.seen.hasHunted) return;

  // Handle food consumption (but not starvation - that's handled by events)
  const foodNeeded = totalPopulation;
  const availableFood = state.resources.food;

  if (availableFood >= foodNeeded) {
    // Everyone can eat, consume food normally
    state.updateResource("food", -foodNeeded);
  } else {
    // Not enough food, consume all available food (starvation event will trigger separately)
    state.updateResource("food", -availableFood);
  }

  // Handle wood consumption (1 wood per villager for heating/shelter)
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
        message: message,
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
        message: message,
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

  // Determine probability and possible death counts based on madness level
  const md = CRUEL_MODE.loop.madnessDeath;
  let probability = 0;
  if (totalMadness <= 5) {
    probability += 0.0;
  } else if (totalMadness <= 10) {
    probability += md.tier2.base + cruelModeScale(state) * md.tier2.whenCruel;
  } else if (totalMadness <= 20) {
    probability += md.tier3.base + cruelModeScale(state) * md.tier3.whenCruel;
  } else if (totalMadness <= 30) {
    probability += md.tier4.base + cruelModeScale(state) * md.tier4.whenCruel;
  } else if (totalMadness <= 40) {
    probability += md.tier5.base + cruelModeScale(state) * md.tier5.whenCruel;
  } else {
    probability += md.tier6.base + cruelModeScale(state) * md.tier6.whenCruel;
  }

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
        message: message,
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

    const messages = [
      "A stranger approaches and joins the village.",
      "A traveler arrives and decides to stay.",
      "A wanderer appears and becomes part of the community.",
      "Someone approaches the village and settles in.",
      "A stranger joins the community.",
      "A newcomer arrives and makes themselves at home.",
    ];

    // Adjust message if multiple strangers arrive
    if (strangersCount > 1) {
      messages.push(
        `${strangersCount} strangers join the village.`,
      );
      messages.push(`${strangersCount} travelers arrive and decide to stay.`);
      messages.push(
        `${strangersCount} wanderers arrive and join the community.`,
      );
    }

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
    const selectedMessage = messages[Math.floor(Math.random() * messages.length)];
    state.addLogEntry({
      id: `stranger-approaches-${Date.now()}`,
      message: selectedMessage,
      timestamp: Date.now(),
      type: "system",
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