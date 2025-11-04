import { useGameStore } from "./state";
import { saveGame } from "./save";
import { GameState } from "@shared/schema";
import { getPopulationProduction, getMaxPopulation } from "./population";
import { killVillagers, buildGameState } from "@/game/stateHelpers";
import { audioManager } from "@/lib/audio";
import { getTotalMadness, getAllActionBonuses } from "./rules/effectsCalculation";

let gameLoopId: number | null = null;
let lastFrameTime = 0;
const TICK_INTERVAL = 200; // 200ms ticks
const AUTO_SAVE_INTERVAL = 15000; // Auto-save every 15 seconds
const PRODUCTION_INTERVAL = 15000; // All production and checks happen every 15 seconds

let tickAccumulator = 0;
let lastAutoSave = 0;
let lastProduction = 0;

export function startGameLoop() {
  if (gameLoopId) return; // Already running

  useGameStore.setState({ isGameLoopActive: true });
  const now = performance.now();
  lastFrameTime = now;
  lastProduction = now; // Reset production interval to start fresh
  tickAccumulator = 0;

  function tick(timestamp: number) {
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    // Check if game is paused
    const state = useGameStore.getState();
    const isDialogOpen = state.eventDialog.isOpen || state.combatDialog.isOpen || state.authDialogOpen || state.shopDialogOpen;
    const isPaused = state.isPaused || isDialogOpen;

    if (isPaused) {
      // Reset production timer when paused so time doesn't accumulate
      lastProduction = timestamp;
      // Reset loop progress to 0 when paused
      useGameStore.setState({ loopProgress: 0 });
      // Skip everything when paused
      gameLoopId = requestAnimationFrame(tick);
      return;
    }

    if (!isDialogOpen) {
      // Accumulate time for fixed timestep
      tickAccumulator += deltaTime;

      // Process ticks in fixed intervals
      while (tickAccumulator >= TICK_INTERVAL) {
        tickAccumulator -= TICK_INTERVAL;
        processTick();
      }

      // Auto-save logic
      if (timestamp - lastAutoSave >= AUTO_SAVE_INTERVAL) {
        lastAutoSave = timestamp;
        handleAutoSave();
      }

      // All production and game logic checks (every 15 seconds)
      if (timestamp - lastProduction >= PRODUCTION_INTERVAL) {
        // Set to 100% before resetting
        useGameStore.setState({ loopProgress: 100 });
        lastProduction = timestamp;

        // Reset to 0 after a brief moment to ensure 100% is visible
        setTimeout(() => {
          useGameStore.setState({ loopProgress: 0 });
        }, 50);

        // Log full state every 15 seconds
        const currentState = useGameStore.getState();
        const bonuses = getAllActionBonuses(currentState);

        console.log("State:", {
          ...currentState,
          calculatedBonuses: bonuses,
        });

        handleGathererProduction();
        handleHunterProduction();
        handleMinerProduction();
        handlePopulationSurvival();
        handleStarvationCheck();
        handleFreezingCheck();
        handleMadnessCheck();
        handleStrangerApproach();
      } else {
        // Update loop progress (0-100 based on production cycle)
        const progressPercent = ((timestamp - lastProduction) / PRODUCTION_INTERVAL) * 100;
        useGameStore.setState({ loopProgress: Math.min(progressPercent, 100) });
      }
    }

    gameLoopId = requestAnimationFrame(tick);
  }

  gameLoopId = requestAnimationFrame(tick);
}

export function stopGameLoop() {
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
    useGameStore.setState({ isGameLoopActive: false });
  }
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
  if (state.greatFeastState?.isActive && state.greatFeastState.endTime <= Date.now()) {
    useGameStore.setState({
      greatFeastState: {
        ...state.greatFeastState,
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
    console.log("[LOOP] Events changed, triggering autosave");
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

  // Process each miner type, steel forger, tanner, powder maker, and ashfire dust maker
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
      production.forEach((prod) => {
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
    // 5% chance for each villager to die from starvation when food is 0
    let starvationDeaths = 0;
    for (let i = 0; i < totalPopulation; i++) {
      if (Math.random() < 0.05) {
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
      if (Math.random() < 0.05) {
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
    probability = 0.01;
  } else if (totalMadness <= 20) {
    probability = 0.02;
  } else if (totalMadness <= 30) {
    probability = 0.03;
  } else if (totalMadness <= 40) {
    probability = 0.04;
  } else {
    probability = 0.05;
  }

  // Check if a madness death event occurs
  if (Math.random() < probability) {
    // Determine number of deaths: 0, 1, 2, or 4 villagers
    const rand = Math.random();
    let madnessDeaths = 0;

    if (rand < 0.5 - 2 * probability) {
      madnessDeaths = 1;
    } else if (rand < 0.7 - 2 * probability) {
      madnessDeaths = 2;
    } else if (rand < 0.9 - 2 * probability) {
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
          ? `One villager succumbs to madness and takes their own life.`
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
    // Autosave every 30 seconds
    if (import.meta.env.DEV) {
      console.log("[AUTOSAVE] Saving game state, events:", state.events);
    }
    await saveGame(gameState);
    const now = new Date().toLocaleTimeString();
    useGameStore.setState({ lastSaved: now });
  } catch (error) {
    console.error("Auto save failed:", error);
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
  let probability = 0.1; // 10% base probability

  // +2.0% for each wooden hut -> 20 %
  probability += state.buildings.woodenHut * 0.02;
  // +2.5% for each stone hut -> 25%
  probability += state.buildings.stoneHut * 0.025;
  // +3% for each longhouse -> 6%
  probability += state.buildings.longhouse * 0.03;
  // +5% for each fur tent -> 5%
  probability += state.buildings.furTents * 0.05;

  // Raven's Mark blessing: +15% stranger approach probability
  if (state.blessings?.ravens_mark) {
    probability += 0.15;
  }

  // Raven's Mark Enhanced blessing: +30% stranger approach probability
  if (state.blessings?.ravens_mark_enhanced) {
    probability += 0.3;
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
  console.log("[SAVE] Manual save initiated.");

  const state = useGameStore.getState();

  const gameState: GameState = buildGameState(state);

  try {
    await saveGame(gameState);
    const now = new Date().toLocaleTimeString();
    useGameStore.setState({ lastSaved: now });
  } catch (error) {
    console.error("[SAVE] Manual save failed:", error);
    throw error;
  }
}