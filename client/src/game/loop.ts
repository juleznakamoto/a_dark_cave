import { useGameStore, StateManager } from "./state";
import { saveGame } from "./save";
import { GameState } from "@shared/schema";
import { getPopulationProduction, getMaxPopulation } from "./population";
import { killVillagers, buildGameState } from "@/game/stateHelpers";
import { audioManager } from "@/lib/audio";
import {
  getTotalMadness,
  getAllActionBonuses,
} from "./rules/effectsCalculation";
import { GAME_CONSTANTS } from "./constants";
import { logger } from "@/lib/logger";

let gameLoopId: number | null = null;
let lastFrameTime = 0;
const TICK_INTERVAL = GAME_CONSTANTS.TICK_INTERVAL;
const AUTO_SAVE_INTERVAL = 15000; // Auto-save every 15 seconds
const PRODUCTION_INTERVAL = 15000; // All production and checks happen every 15 seconds
const SHOP_NOTIFICATION_INITIAL_DELAY = 30 * 60 * 1000; // 30 minutes in milliseconds
const SHOP_NOTIFICATION_REPEAT_INTERVAL = 60 * 60 * 1000; // 60 minutes in milliseconds
const AUTH_NOTIFICATION_INITIAL_DELAY = 15 * 60 * 1000; // 15 minutes in milliseconds
const AUTH_NOTIFICATION_REPEAT_INTERVAL = 60 * 60 * 1000; // 60 minutes in milliseconds
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minute in milliseconds
const TARGET_FPS = 4;
const FRAME_DURATION = 1000 / TARGET_FPS; // 250ms per frame at 4 FPS
let tickAccumulator = 0;
let lastAutoSave = 0;
let lastProduction = 0;
let gameStartTime = 0;
let lastShopNotificationTime = 0;
let lastAuthNotificationTime = 0;
let loopProgressTimeoutId: NodeJS.Timeout | null = null;
let lastRenderTime = 0;
let lastUserActivity = 0;
let inactivityCheckInterval: NodeJS.Timeout | null = null;
let sessionListener: { subscription: { unsubscribe: () => void } } | null = null; // Event-driven session monitoring
let isInactive = false;
let lastGameLoadTime = 0; // Track when game was last loaded

export function startGameLoop() {
  if (gameLoopId) return; // Already running

  logger.log("[LOOP] Starting game loop");
  useGameStore.setState({ isGameLoopActive: true });
  const now = performance.now();
  lastFrameTime = now;
  lastRenderTime = now;
  lastProduction = now; // Reset production interval to start fresh
  tickAccumulator = 0;
  if (gameStartTime === 0) {
    gameStartTime = now; // Set game start time only once
  }

  // Get state at the beginning
  const state = useGameStore.getState();

  // Initialize inactivity tracking
  lastUserActivity = Date.now();
  isInactive = false;
  logger.log(
    "[INACTIVITY] Initialized activity tracking at",
    new Date(lastUserActivity).toISOString(),
  );

  // Set up activity listeners
  const activityEvents = [
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
    "mousemove",
  ];
  const handleActivity = () => {
    const previousActivity = lastUserActivity;
    lastUserActivity = Date.now();
    if (Date.now() - previousActivity > 60000) {
      // Log only if more than 1 minute since last activity
      logger.log(
        "[INACTIVITY] User activity detected at",
        new Date(lastUserActivity).toISOString(),
      );
    }
  };

  activityEvents.forEach((event) => {
    window.addEventListener(event, handleActivity, { passive: true });
  });

  // Start inactivity checker (every 30 seconds)
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval);
  }
  inactivityCheckInterval = setInterval(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastUserActivity;

    if (timeSinceActivity > INACTIVITY_TIMEOUT && !isInactive) {
      logger.log("[INACTIVITY] ⚠️ INACTIVITY DETECTED!", {
        timeSinceActivity: Math.round(timeSinceActivity / 1000) + "s",
        lastActivity: new Date(lastUserActivity).toISOString(),
        threshold: Math.round(INACTIVITY_TIMEOUT / 1000) + "s",
      });
      handleInactivity();
    } else if (timeSinceActivity > 60000) {
      // Log every minute after 1 minute of inactivity
      logger.log(
        "[INACTIVITY] User inactive for",
        Math.round(timeSinceActivity / 1000) + "s",
      );
    }
  }, 30000); // Check every 30 seconds

  // Set up event-driven session monitoring (only triggers on actual session changes)
  // This is MUCH more efficient than polling - no network requests unless session changes
  if (state.isUserSignedIn) {
    const setupSessionListener = async () => {
      try {
        const { getSupabaseClient } = await import('@/lib/supabase');
        const supabase = await getSupabaseClient();
        
        // Listen for auth state changes (fires when session is invalidated)
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          logger.log('[SESSION] 🔔 Auth state changed:', event);
          
          // If session was signed out or token refreshed elsewhere, handle it
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            if (!session) {
              logger.log('[SESSION] 🚪 Session invalidated (logged in elsewhere) - stopping game loop');
              
              // Delete local save when session is invalidated
              try {
                const { deleteSave } = await import('./save');
                await deleteSave();
                logger.log('[SESSION] 🗑️ Local save deleted after session invalidation');
              } catch (deleteError) {
                logger.error('[SESSION] ⚠️ Failed to delete local save:', deleteError);
              }
              
              stopGameLoop();
              useGameStore.setState({
                inactivityDialogOpen: true,
                inactivityReason: 'multitab',
              });
            }
          }
        });
        
        sessionListener = data;
        logger.log('[SESSION] ✅ Event-driven session listener established');
      } catch (error) {
        logger.error('[SESSION] ❌ Failed to set up session listener:', error);
      }
    };
    
    setupSessionListener();
  }


  // Check if idle mode needs to be displayed (user left during idle mode)
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

    // Check if game is paused
    const state = useGameStore.getState();
    const isDialogOpen =
      state.eventDialog.isOpen ||
      state.combatDialog.isOpen ||
      state.authDialogOpen ||
      state.shopDialogOpen ||
      state.idleModeDialog.isOpen;
    const isPaused = state.isPaused || isDialogOpen;

    if (isPaused) {
      // Stop all sounds when paused (unless already stopped by mute)
      if (!state.isPausedPreviously && !state.isMuted) {
        // Check if this is the first frame of pause
        audioManager.stopAllSounds();
        useGameStore.setState({ isPausedPreviously: true });
      }
      // Reset production timer when paused so time doesn't accumulate
      lastProduction = timestamp;
      // Only reset loop progress to 0 when manually paused (not when dialogs open)
      if (state.isPaused) {
        useGameStore.setState({ loopProgress: 0 });
      }
      // Skip everything when paused
      gameLoopId = requestAnimationFrame(tick);
      return;
    }

    // Resume sounds when exiting pause state
    if (state.isPausedPreviously) {
      audioManager.resumeSounds();
      useGameStore.setState({ isPausedPreviously: false });
    }

    if (!isDialogOpen) {
      // Accumulate time for fixed timestep
      tickAccumulator += deltaTime;

      // Update play time in state (but not during idle mode)
      const currentState = useGameStore.getState();
      if (!currentState.idleModeState?.isActive) {
        currentState.updatePlayTime(deltaTime);
      }

      // Process ticks in fixed intervals
      while (tickAccumulator >= TICK_INTERVAL) {
        tickAccumulator -= TICK_INTERVAL;
        processTick();
      }

      // Auto-save logic (skip if inactive or recently loaded)
      const timeSinceLoad = timestamp - lastGameLoadTime;
      const skipAutoSaveAfterLoad = timeSinceLoad > 0 && timeSinceLoad < 30000; // Skip for 30s after load

      if (timestamp - lastAutoSave >= AUTO_SAVE_INTERVAL && !isInactive && !skipAutoSaveAfterLoad) {
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
        if (!currentState.idleModeState?.isActive) {
          logger.log(
            "[GAME LOOP] Normal production running - idle mode is NOT active",
          );
          handleGathererProduction();
          handleHunterProduction();
          handleMinerProduction();
          handlePopulationSurvival();
          handleStarvationCheck();
          handleFreezingCheck();
          handleMadnessCheck();
          handleStrangerApproach();

          // Check for events (including attack waves)
          currentState.checkEvents();
        } else {
          logger.log("[GAME LOOP] Production SKIPPED - idle mode is active");
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

function handleInactivity() {
  logger.log("[INACTIVITY] 🛑 Stopping game due to inactivity");
  isInactive = true;

  // Stop the game loop
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
    logger.log("[INACTIVITY] Game loop stopped");
  }

  // Stop inactivity checker
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval);
    inactivityCheckInterval = null;
    logger.log("[INACTIVITY] Inactivity checker stopped");
  }

  // Stop session listener
  if (sessionListener) {
    sessionListener.subscription.unsubscribe();
    sessionListener = null;
    logger.log("[INACTIVITY] Session listener stopped");
  }

  // Set game loop to inactive
  useGameStore.setState({
    isGameLoopActive: false,
    inactivityDialogOpen: true,
    inactivityReason: "timeout",
  });
  logger.log("[INACTIVITY] Inactivity dialog opened");
}

export function setLastGameLoadTime(time: number) {
  lastGameLoadTime = time;
  logger.log("[LOOP] 🔄 Game loaded - skipping auto-save for 30 seconds");
}

export function stopGameLoop() {
  logger.log("[LOOP] Stopping game loop");

  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
  if (loopProgressTimeoutId) {
    clearTimeout(loopProgressTimeoutId);
    loopProgressTimeoutId = null;
  }

  // Clean up inactivity checker
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval);
    inactivityCheckInterval = null;
    logger.log("[LOOP] Inactivity checker cleared");
  }

  // Clean up session listener
  if (sessionListener) {
    sessionListener.subscription.unsubscribe();
    sessionListener = null;
    logger.log("[LOOP] Session listener cleared");
  }

  // Remove activity listeners
  const activityEvents = [
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
    "mousemove",
  ];
  const handleActivity = () => {}; // Dummy function for removal
  activityEvents.forEach((event) => {
    window.removeEventListener(event, handleActivity);
  });

  StateManager.clearUpdateTimer();
}

function processTick() {
  const state = useGameStore.getState();

  // Tick down cooldowns
  state.tickCooldowns();

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

  // Check if curse has expired
  if (state.curseState?.isActive && state.curseState.endTime <= Date.now()) {
    useGameStore.setState({
      curseState: {
        ...state.curseState,
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
  const eventsChanged = Object.keys(state.events).some(
    (key) => state.events[key] !== prevEvents[key],
  );
  if (eventsChanged && import.meta.env.DEV) {
    logger.log("[LOOP] Events changed, triggering autosave");
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

  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  if (totalPopulation === 0) return;

  // Only start starvation checks once the player has accumulated at least 5 food
  if (!state.flags.starvationActive) {
    if (state.resources.food < 5) return;
    // Activate starvation system permanently once food reaches at least 5
    useGameStore.setState({
      flags: { ...state.flags, starvationActive: true },
    });
  }

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

  // Only proceed if starvation is already active (activated in handlePopulationSurvival)
  if (!state.flags.starvationActive) return;

  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  if (totalPopulation === 0) return;

  const availableFood = state.resources.food;

  if (availableFood === 0) {
    // 5% chance for each villager to die from starvation
    let starvationDeaths = 0;
    for (let i = 0; i < totalPopulation; i++) {
      if (Math.random() < 0.05 + state.CM * 0.025) {
        starvationDeaths++;
      }
    }

    if (starvationDeaths > 0) {
      // Use the centralized killVillagers function
      const deathResult = killVillagers(state, starvationDeaths);

      useGameStore.setState({
        villagers: deathResult.villagers || state.villagers,
      });

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

  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  if (totalPopulation > 0 && state.resources.wood === 0) {
    // 5% chance for each villager to die from cold
    let freezingDeaths = 0;
    for (let i = 0; i < totalPopulation; i++) {
      if (Math.random() < 0.05 + state.CM * 0.025) {
        freezingDeaths++;
      }
    }

    if (freezingDeaths > 0) {
      // Use the centralized killVillagers function
      const deathResult = killVillagers(state, freezingDeaths);

      useGameStore.setState({
        villagers: deathResult.villagers || state.villagers,
      });

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

  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  if (totalPopulation === 0) return;

  // Get total madness using the centralized calculation function
  const totalMadness = getTotalMadness(state);
  if (totalMadness <= 0) return;

  // Determine probability and possible death counts based on madness level
  let probability = 0;
  if (totalMadness <= 10) {
    probability += 0.0 + state.CM * 0.01;
  } else if (totalMadness <= 20) {
    probability += 0.005 + state.CM * 0.01;
  } else if (totalMadness <= 30) {
    probability += 0.01 + state.CM * 0.01;
  } else if (totalMadness <= 40) {
    probability += 0.015 + state.CM * 0.01;
  } else {
    probability += 0.02 + state.CM * 0.01;
  }

  // Check if a madness death event occurs
  if (Math.random() < probability) {
    // Determine number of deaths: 0, 1, 2, or 4 villagers
    const rand = Math.random() + state.CM * 0.1;
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

      useGameStore.setState({
        villagers: deathResult.villagers || state.villagers,
      });

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

  logger.log("[AUTOSAVE] 📊 Raw state snapshot:", {
    statePlayTime: state.playTime,
    playTimeMinutes: (state.playTime / 1000 / 60).toFixed(2),
    isNewGame: state.isNewGame,
  });

  const gameState: GameState = buildGameState(state);

  // Log cooldown state before saving
  logger.log("[AUTOSAVE] Current cooldown state:", {
    cooldowns: state.cooldowns,
    cooldownDurations: state.cooldownDurations,
    cooldownDetails: Object.keys(state.cooldowns || {}).map((key) => ({
      action: key,
      remaining: state.cooldowns[key],
      duration: state.cooldownDurations?.[key],
    })),
  });

  logger.log("[AUTOSAVE] 📊 State playTime values:", {
    statePlayTime: state.playTime,
    gameStatePlayTime: gameState.playTime,
    isNewGame: state.isNewGame,
    playTimeToSave: state.isNewGame ? 0 : state.playTime,
    playTimeMatch: state.playTime === gameState.playTime,
  });

  try {
    // If this is a new game, save playTime as the current session time only
    // Otherwise, save the accumulated playTime
    const playTimeToSave = state.isNewGame ? 0 : state.playTime;

    logger.log("[AUTOSAVE] 📊 Calling saveGame with:", {
      playTimeToSave,
      gameStateHasPlayTime: 'playTime' in gameState,
    });

    await saveGame(gameState, playTimeToSave);
    const now = new Date().toLocaleTimeString();
    useGameStore.setState({ lastSaved: now, isNewGame: false });
  } catch (error) {
    logger.error("Auto save failed:", error);
  }
}

function handleStrangerApproach() {
  const state = useGameStore.getState();

  const currentPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  const maxPopulation = getMaxPopulation(state);

  // Only trigger if there's room for more villagers
  if (currentPopulation >= maxPopulation) return;

  // Calculate probability based on your specifications
  let probability = 0.1 - state.CM * 0.05; // 10% base probability

  // +2.0% for each wooden hut -> 15 %
  probability += state.buildings.woodenHut * 0.015;
  // +2.5% for each stone hut -> 20%
  probability += state.buildings.stoneHut * 0.02;
  // +3% for each longhouse -> 5%
  probability += state.buildings.longhouse * 0.025;
  // +5% for each fur tent -> 3%
  probability += state.buildings.furTents * 0.03;

  // Raven's Mark blessing: +15% stranger approach probability
  if (state.blessings?.ravens_mark) {
    probability += 0.1;
  }

  // Raven's Mark Enhanced blessing: +30% stranger approach probability
  if (state.blessings?.ravens_mark_enhanced) {
    probability += 0.25;
  }

  if (currentPopulation === 0) {
    probability = Math.max(0.8, probability);
  } else if (currentPopulation <= 4) {
    probability = Math.max(0.5, probability);
  }

  // Check if stranger(s) approach based on probability
  if (Math.random() < probability) {
    // Calculate available room
    const currentPop = Object.values(state.villagers).reduce(
      (sum, count) => sum + (count || 0),
      0,
    );
    const maxPop = getMaxPopulation(state);
    const availableRoom = maxPop - currentPop;

    let strangersCount = 1; // Default to 1 stranger
    let moreStrangersProbability = Math.random();

    let multiStrangerMultiplier = 1.0;
    if (state.blessings?.ravens_mark) {
      multiStrangerMultiplier += 0.15;
    }
    if (state.blessings?.ravens_mark_enhanced) {
      multiStrangerMultiplier += 0.15;
    }

    if (state.buildings.stoneHut >= 10) {
      multiStrangerMultiplier += 0.25;
    }

    if (state.buildings.longhouse >= 2) {
      moreStrangersProbability += 0.15;
    }

    if (state.buildings.furTents >= 1) {
      moreStrangersProbability += 0.15;
    }

    // multiple strangers approach at once
    if (state.buildings.stoneHut >= 1) {
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
      "A stranger joins the community, bringing skills and hope.",
      "A newcomer arrives and makes themselves at home.",
    ];

    // Adjust message if multiple strangers arrive
    if (strangersCount > 1) {
      messages.push(
        `${strangersCount} strangers approach and join the village.`,
      );
      messages.push(`${strangersCount} travelers arrive and decide to stay.`);
      messages.push(
        `${strangersCount} wanderers appear and become part of the community.`,
      );
    }

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Add the villager(s) - only the amount that fits
    const actualStrangersToAdd = Math.min(strangersCount, availableRoom);

    if (actualStrangersToAdd <= 0) return; // No room for anyone

    useGameStore.setState({
      villagers: {
        ...state.villagers,
        free: state.villagers.free + actualStrangersToAdd,
      },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          hasVillagers: true,
        },
      },
    });

    // Add log entry
    state.addLogEntry({
      id: `stranger-approaches-${Date.now()}`,
      message: randomMessage,
      timestamp: Date.now(),
      type: "system",
    });

    // Update population immediately
    state.updatePopulation();

    // Play new villager sound
    audioManager.playSound("newVillager", 0.02);
  }
}

// Export the manual save function
export async function manualSave() {
  logger.log("[SAVE] Manual save initiated.");

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
    logger.error("[SAVE] Manual save failed:", error);
    throw error;
  }
}

