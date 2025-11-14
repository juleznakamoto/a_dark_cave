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

let gameLoopId: number | null = null;
let lastFrameTime = 0;
const TICK_INTERVAL = 200; // 200ms ticks
const AUTO_SAVE_INTERVAL = 15000; // Auto-save every 15 seconds
const PRODUCTION_INTERVAL = 15000; // All production and checks happen every 15 seconds
const SHOP_NOTIFICATION_INITIAL_DELAY = 30 * 60 * 1000; // 30 minutes in milliseconds
const SHOP_NOTIFICATION_REPEAT_INTERVAL = 60 * 60 * 1000; // 60 minutes in milliseconds

let tickAccumulator = 0;
let lastAutoSave = 0;
let lastProduction = 0;
let gameStartTime = 0;
let lastShopNotificationTime = 0;
let loopProgressTimeoutId: NodeJS.Timeout | null = null;

export function startGameLoop() {
  if (gameLoopId) return; // Already running

  useGameStore.setState({ isGameLoopActive: true });
  const now = performance.now();
  lastFrameTime = now;
  lastProduction = now; // Reset production interval to start fresh
  tickAccumulator = 0;
  if (gameStartTime === 0) {
    gameStartTime = now; // Set game start time only once
  }

  function tick(timestamp: number) {
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    const state = useGameStore.getState();
    const batchedUpdates: { [key: string]: any } = {};

    const isDialogOpen =
      state.eventDialog.isOpen ||
      state.combatDialog.isOpen ||
      state.authDialogOpen ||
      state.shopDialogOpen;
    const isPaused = state.isPaused || isDialogOpen;

    if (isPaused) {
      if (!state.isPausedPreviously && !state.isMuted) {
        audioManager.stopAllSounds();
        batchedUpdates.isPausedPreviously = true;
      }
      lastProduction = timestamp;
      if (state.isPaused) {
        batchedUpdates.loopProgress = 0;
      }
      if (Object.keys(batchedUpdates).length > 0) {
        useGameStore.setState(batchedUpdates);
      }
      gameLoopId = requestAnimationFrame(tick);
      return;
    }

    if (state.isPausedPreviously) {
      audioManager.resumeSounds();
      batchedUpdates.isPausedPreviously = false;
    }

    if (!isDialogOpen) {
      tickAccumulator += deltaTime;
      state.updatePlayTime(deltaTime);

      while (tickAccumulator >= TICK_INTERVAL) {
        tickAccumulator -= TICK_INTERVAL;
        processTick(state, batchedUpdates);
      }

      if (timestamp - lastAutoSave >= AUTO_SAVE_INTERVAL) {
        lastAutoSave = timestamp;
        handleAutoSave();
      }

      if (gameStartTime > 0) {
        const elapsedSinceStart = timestamp - gameStartTime;

        if (
          elapsedSinceStart >= SHOP_NOTIFICATION_INITIAL_DELAY &&
          lastShopNotificationTime === 0
        ) {
          lastShopNotificationTime = timestamp;
          if (state.shopNotificationSeen) {
            batchedUpdates.shopNotificationSeen = false;
            batchedUpdates.shopNotificationVisible = true;
          } else if (!state.shopNotificationVisible) {
            batchedUpdates.shopNotificationVisible = true;
          }
        } else if (
          lastShopNotificationTime > 0 &&
          timestamp - lastShopNotificationTime >=
            SHOP_NOTIFICATION_REPEAT_INTERVAL
        ) {
          lastShopNotificationTime = timestamp;
          if (state.shopNotificationSeen) {
            batchedUpdates.shopNotificationSeen = false;
          }
        }
      }

      if (timestamp - lastProduction >= PRODUCTION_INTERVAL) {
        batchedUpdates.loopProgress = 100;
        lastProduction = timestamp;

        if (loopProgressTimeoutId) clearTimeout(loopProgressTimeoutId);
        loopProgressTimeoutId = setTimeout(() => {
          useGameStore.setState({ loopProgress: 0 });
        }, 50);

        handleAllProduction(state, batchedUpdates);
      } else {
        const progressPercent =
          ((timestamp - lastProduction) / PRODUCTION_INTERVAL) * 100;
        batchedUpdates.loopProgress = Math.min(progressPercent, 100);
      }
    }

    if (Object.keys(batchedUpdates).length > 0) {
      useGameStore.setState(batchedUpdates);
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
  if (loopProgressTimeoutId) {
    clearTimeout(loopProgressTimeoutId);
    loopProgressTimeoutId = null;
  }
  StateManager.clearUpdateTimer();
}

function processTick(state: GameState, batchedUpdates: { [key: string]: any }) {
  state.tickCooldowns();

  if (state.feastState?.isActive && state.feastState.endTime <= Date.now()) {
    batchedUpdates.feastState = {
      ...state.feastState,
      isActive: false,
    };
  }

  if (
    state.greatFeastState?.isActive &&
    state.greatFeastState.endTime <= Date.now()
  ) {
    batchedUpdates.greatFeastState = {
      ...state.greatFeastState,
      isActive: false,
    };
  }

  if (state.curseState?.isActive && state.curseState.endTime <= Date.now()) {
    batchedUpdates.curseState = {
      ...state.curseState,
      isActive: false,
    };
  }

  const prevEvents = { ...state.events };
  state.checkEvents();

  const eventsChanged = Object.keys(state.events).some(
    (key) => state.events[key] !== prevEvents[key],
  );
  if (eventsChanged && import.meta.env.DEV) {
    console.log("[LOOP] Events changed, triggering autosave");
    handleAutoSave();
  }
}

function updateResourceInBatch(
  state: GameState,
  batchedUpdates: { [key: string]: any },
  resource: keyof GameState["resources"],
  amount: number,
) {
  if (!batchedUpdates.resources) {
    batchedUpdates.resources = {};
  }
  const currentAmount =
    batchedUpdates.resources[resource] ?? state.resources[resource] ?? 0;
  batchedUpdates.resources[resource] = Math.max(0, currentAmount + amount);
}
function handleAllProduction(
  state: GameState,
  batchedUpdates: { [key: string]: any },
) {
  handleGathererProduction(state, batchedUpdates);
  handleHunterProduction(state, batchedUpdates);
  handleMinerProduction(state, batchedUpdates);
  handlePopulationSurvival(state, batchedUpdates);
  handleStarvationCheck(state, batchedUpdates);
  handleFreezingCheck(state, batchedUpdates);
  handleMadnessCheck(state, batchedUpdates);
  handleStrangerApproach(state, batchedUpdates);
}
function handleGathererProduction(
  state: GameState,
  batchedUpdates: { [key: string]: any },
) {
  const gatherer = state.villagers.gatherer;

  if (gatherer > 0) {
    const production = getPopulationProduction("gatherer", gatherer, state);
    production.forEach((prod) => {
      updateResourceInBatch(
        state,
        batchedUpdates,
        prod.resource as keyof typeof state.resources,
        prod.totalAmount,
      );
    });
  }
}

function handleHunterProduction(
  state: GameState,
  batchedUpdates: { [key: string]: any },
) {
  const hunter = state.villagers.hunter;

  if (hunter > 0) {
    const production = getPopulationProduction("hunter", hunter, state);
    production.forEach((prod) => {
      updateResourceInBatch(
        state,
        batchedUpdates,
        prod.resource as keyof typeof state.resources,
        prod.totalAmount,
      );
    });
  }
}

function handleMinerProduction(
  state: GameState,
  batchedUpdates: { [key:string]: any },
) {
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
        updateResourceInBatch(
          state,
          batchedUpdates,
          prod.resource as keyof typeof state.resources,
          prod.totalAmount,
        );
      });
    }
  });
}

function handlePopulationSurvival(
  state: GameState,
  batchedUpdates: { [key: string]: any },
) {
  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  if (totalPopulation === 0) return;

  if (!state.flags.starvationActive) {
    if (state.resources.food < 5) return;
    if (!batchedUpdates.flags) {
      batchedUpdates.flags = {};
    }
    batchedUpdates.flags.starvationActive = true;
  }

  const foodNeeded = totalPopulation;
  const availableFood = state.resources.food;
  const foodUpdate =
    availableFood >= foodNeeded ? -foodNeeded : -availableFood;
  updateResourceInBatch(state, batchedUpdates, "food", foodUpdate);

  const woodNeeded = totalPopulation;
  const availableWood = state.resources.wood;
  const woodUpdate =
    availableWood >= woodNeeded ? -woodNeeded : -availableWood;
  updateResourceInBatch(state, batchedUpdates, "wood", woodUpdate);
}

function handleStarvationCheck(
  state: GameState,
  batchedUpdates: { [key: string]: any },
) {
  if (!state.flags.starvationActive) return;

  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  if (totalPopulation === 0) return;

  const availableFood =
    (batchedUpdates.resources && batchedUpdates.resources.food) ??
    state.resources.food;

  if (availableFood === 0) {
    let starvationDeaths = 0;
    for (let i = 0; i < totalPopulation; i++) {
      if (Math.random() < 0.05 + state.CM * 0.025) {
        starvationDeaths++;
      }
    }

    if (starvationDeaths > 0) {
      const deathResult = killVillagers(state, starvationDeaths);
      batchedUpdates.villagers = {
        ...(batchedUpdates.villagers ?? {}),
        ...deathResult.villagers,
      };

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

      setTimeout(() => state.updatePopulation(), 0);
    }
  }
}

function handleFreezingCheck(
  state: GameState,
  batchedUpdates: { [key: string]: any },
) {
  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  const availableWood =
    (batchedUpdates.resources && batchedUpdates.resources.wood) ??
    state.resources.wood;

  if (totalPopulation > 0 && availableWood === 0) {
    let freezingDeaths = 0;
    for (let i = 0; i < totalPopulation; i++) {
      if (Math.random() < 0.05 + state.CM * 0.025) {
        freezingDeaths++;
      }
    }

    if (freezingDeaths > 0) {
      const deathResult = killVillagers(state, freezingDeaths);
      batchedUpdates.villagers = {
        ...(batchedUpdates.villagers ?? {}),
        ...deathResult.villagers,
      };

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

      setTimeout(() => state.updatePopulation(), 0);
    }
  }
}

function handleMadnessCheck(
  state: GameState,
  batchedUpdates: { [key: string]: any },
) {
  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  if (totalPopulation === 0) return;

  const totalMadness = getTotalMadness(state);
  if (totalMadness <= 0) return;

  let probability = 0 + state.CM * 0.01;
  if (totalMadness <= 10) {
    probability += 0.01;
  } else if (totalMadness <= 20) {
    probability += 0.02;
  } else if (totalMadness <= 30) {
    probability += 0.03;
  } else if (totalMadness <= 40) {
    probability += 0.04;
  } else {
    probability += 0.05;
  }

  if (Math.random() < probability) {
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

    madnessDeaths = Math.min(madnessDeaths, totalPopulation);

    if (madnessDeaths > 0) {
      const deathResult = killVillagers(state, madnessDeaths);
      batchedUpdates.villagers = {
        ...(batchedUpdates.villagers ?? {}),
        ...deathResult.villagers,
      };

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

      setTimeout(() => state.updatePopulation(), 0);
    }
  }
}

async function handleAutoSave() {
  const state = useGameStore.getState();
  const gameState: GameState = buildGameState(state);

  try {
    await saveGame(gameState, state.playTime);
    const now = new Date().toLocaleTimeString();
    useGameStore.setState({ lastSaved: now });
  } catch (error) {
    console.error("Auto save failed:", error);
  }
}

function handleStrangerApproach(
  state: GameState,
  batchedUpdates: { [key: string]: any },
) {
  const currentPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  const maxPopulation = getMaxPopulation(state);

  if (currentPopulation >= maxPopulation) return;

  let probability = 0.1 - state.CM * 0.05;

  probability += state.buildings.woodenHut * 0.02;
  probability += state.buildings.stoneHut * 0.025;
  probability += state.buildings.longhouse * 0.03;
  probability += state.buildings.furTents * 0.05;

  if (state.blessings?.ravens_mark) {
    probability += 0.15;
  }

  if (state.blessings?.ravens_mark_enhanced) {
    probability += 0.3;
  }

  if (currentPopulation === 0) {
    probability = Math.max(0.8, probability);
  } else if (currentPopulation <= 4) {
    probability = Math.max(0.5, probability);
  }

  if (Math.random() < probability) {
    const availableRoom = maxPopulation - currentPopulation;
    let strangersCount = 1;
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

    const actualStrangersToAdd = Math.min(strangersCount, availableRoom);
    if (actualStrangersToAdd <= 0) return;

    if (!batchedUpdates.villagers) {
      batchedUpdates.villagers = {};
    }
    batchedUpdates.villagers.free =
      (batchedUpdates.villagers.free ?? state.villagers.free) +
      actualStrangersToAdd;

    if (!batchedUpdates.story) {
      batchedUpdates.story = { seen: {} };
    }
    batchedUpdates.story.seen = {
      ...(batchedUpdates.story.seen ?? state.story.seen),
      hasVillagers: true,
    };

    const messages =
      strangersCount > 1
        ? [
            `${strangersCount} strangers approach and join the village.`,
            `${strangersCount} travelers arrive and decide to stay.`,
            `${strangersCount} wanderers appear and become part of the community.`,
          ]
        : [
            "A stranger approaches and joins the village.",
            "A traveler arrives and decides to stay.",
            "A wanderer appears and becomes part of the community.",
            "Someone approaches the village and settles in.",
            "A stranger joins the community, bringing skills and hope.",
            "A newcomer arrives and makes themselves at home.",
          ];
    const randomMessage =
      messages[Math.floor(Math.random() * messages.length)];

    state.addLogEntry({
      id: `stranger-approaches-${Date.now()}`,
      message: randomMessage,
      timestamp: Date.now(),
      type: "system",
    });

    state.updatePopulation();
    audioManager.playSound("newVillager", 0.02);
  }
}

export async function manualSave() {
  console.log("[SAVE] Manual save initiated.");

  const state = useGameStore.getState();

  const gameState: GameState = buildGameState(state);

  try {
    await saveGame(gameState, state.playTime);
    const now = new Date().toLocaleTimeString();
    useGameStore.setState({ lastSaved: now });
  } catch (error) {
    console.error("[SAVE] Manual save failed:", error);
    throw error;
  }
}