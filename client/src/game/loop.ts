import { useGameStore } from "./state";
import { saveGame } from "./save";
import { GameState } from "@shared/schema";
import { getPopulationProduction, getMaxPopulation } from "./population";
import { killVillagers } from "@/game/stateHelpers";
import { audioManager } from "@/lib/audio";

let gameLoopId: number | null = null;
let lastTick = 0;
const TICK_INTERVAL = 200; // 200ms ticks
const AUTO_SAVE_INTERVAL = 15000; // Auto-save every 15 seconds
const GATHERER_PRODUCTION_INTERVAL = 15000; // gatherer produce wood every 15 seconds
const HUNTER_PRODUCTION_INTERVAL = 15000; // hunter produce food every 15 seconds
const CONSUMPTION_INTERVAL = 15000; // Population consumes food and checks wood every 15 seconds
const STARVATION_CHECK_INTERVAL = 15000; // Check starvation every 15 seconds
const FREEZING_CHECK_INTERVAL = 15000; // Check freezing every 15 seconds
const STRANGER_CHECK_INTERVAL = 15000; // Check for stranger approach every 15 seconds

let lastAutoSave = 0;
let lastGathererProduction = 0;
let lastHunterProduction = 0;
let lastConsumption = 0;
let lastStarvationCheck = 0;
let lastFreezingCheck = 0;
let lastStrangerCheck = 0;

export function startGameLoop() {
  if (gameLoopId) return; // Already running

  useGameStore.setState({ isGameLoopActive: true });

  function tick(timestamp: number) {
    if (timestamp - lastTick >= TICK_INTERVAL) {
      lastTick = timestamp;

      // Update production timing in game state
      useGameStore.setState({
        productionTiming: {
          lastGathererProduction,
          lastHunterProduction,
          lastConsumption,
          currentTime: timestamp,
          interval: GATHERER_PRODUCTION_INTERVAL,
        },
      });

      // Game tick logic
      processTick();

      // Auto-save logic
      if (timestamp - lastAutoSave >= AUTO_SAVE_INTERVAL) {
        lastAutoSave = timestamp;
        handleAutoSave();
      }

      // Gatherer production logic
      if (timestamp - lastGathererProduction >= GATHERER_PRODUCTION_INTERVAL) {
        lastGathererProduction = timestamp;
        handleGathererProduction();
      }

      // Hunter production logic
      if (timestamp - lastHunterProduction >= HUNTER_PRODUCTION_INTERVAL) {
        lastHunterProduction = timestamp;
        handleHunterProduction();
      }

      // Miner production logic
      if (timestamp - lastConsumption >= CONSUMPTION_INTERVAL) {
        lastConsumption = timestamp;
        handleMinerProduction();
      }

      // Population food consumption
      if (timestamp - lastConsumption >= CONSUMPTION_INTERVAL) {
        lastConsumption = timestamp;
        handlePopulationSurvival();
      }

      // Starvation checks
      if (timestamp - lastStarvationCheck >= STARVATION_CHECK_INTERVAL) {
        lastStarvationCheck = timestamp;
        handleStarvationCheck();
      }

      // Freezing checks
      if (timestamp - lastFreezingCheck >= FREEZING_CHECK_INTERVAL) {
        lastFreezingCheck = timestamp;
        handleFreezingCheck();
      }

      // Stranger approach checks
      if (timestamp - lastStrangerCheck >= STRANGER_CHECK_INTERVAL) {
        lastStrangerCheck = timestamp;
        handleStrangerApproach();
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

  // If event dialog or combat dialog is open, pause game logic but keep cooldowns ticking
  if (state.eventDialog.isOpen || state.combatDialog.isOpen) {
    // Only tick down cooldowns, but don't process events or other game logic
    state.tickCooldowns();
    return;
  }

  // Tick down cooldowns
  state.tickCooldowns();

  // Check and trigger events
  state.checkEvents();
}

function handleGathererProduction() {
  const state = useGameStore.getState();

  // Pause gatherer production when event dialog or combat dialog is open
  if (state.eventDialog.isOpen || state.combatDialog.isOpen) return;

  const gatherer = state.villagers.gatherer;

  if (gatherer > 0) {
    const production = getPopulationProduction("gatherer", gatherer, state);
    production.forEach((prod) => {
      state.updateResource(
        prod.resource as keyof typeof state.resources,
        prod.totalAmount,
      );
    });
  }
}

function handleHunterProduction() {
  const state = useGameStore.getState();

  // Pause hunter production when event dialog or combat dialog is open
  if (state.eventDialog.isOpen || state.combatDialog.isOpen) return;

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

  // Pause miner production when event dialog or combat dialog is open
  if (state.eventDialog.isOpen || state.combatDialog.isOpen) return;

  // Process each miner type, steel forger, tanner, and powder maker
  Object.entries(state.villagers).forEach(([job, count]) => {
    if (
      count > 0 &&
      (job.endsWith("miner") ||
        job === "steel_forger" ||
        job === "tanner" ||
        job === "powder_maker")
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

  // Pause survival checks when event dialog or combat dialog is open
  if (state.eventDialog.isOpen || state.combatDialog.isOpen) return;

  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  if (totalPopulation === 0) return;

  // Only start starvation checks once the player has accumulated at least 5 food
  if (!state.flags.starvationActive) {
    if (state.resources.food < 5) return;
    // Activate starvation system permanently once food reaches 5
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
}

function handleStarvationCheck() {
  const state = useGameStore.getState();

  // Pause starvation checks when event dialog or combat dialog is open
  if (state.eventDialog.isOpen || state.combatDialog.isOpen) return;

  // Check if starvation conditions are met
  if (!state.flags.starvationActive) {
    if (state.resources.food < 5) return;
    // Activate starvation system permanently once food reaches 5
    useGameStore.setState({
      flags: { ...state.flags, starvationActive: true },
    });
  }

  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  if (totalPopulation === 0) return;

  const availableFood = state.resources.food;

  if (availableFood === 0) {
    // 10% chance for each villager to die from starvation when food is 0
    let starvationDeaths = 0;
    for (let i = 0; i < totalPopulation; i++) {
      if (Math.random() < 0.1) {
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
          ? "One villager succumbs to starvation. Remaining villagers grow desperate."
          : `${starvationDeaths} villagers starve to death. Survivors look gaunt and hollow-eyed.`;

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

  // Pause freezing checks when event dialog or combat dialog is open
  if (state.eventDialog.isOpen || state.combatDialog.isOpen) return;

  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  if (totalPopulation > 0 && state.resources.wood === 0) {
    // 10% chance for each villager to die from cold
    let freezingDeaths = 0;
    for (let i = 0; i < totalPopulation; i++) {
      if (Math.random() < 0.1) {
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
          ? "One villager freezes to death in the cold. The others huddle together for warmth."
          : `${freezingDeaths} villagers freeze to death in the harsh cold. Survivors seek shelter desperately.`;

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

async function handleAutoSave() {
  const state = useGameStore.getState();
  const gameState: GameState = {
    resources: state.resources,
    stats: state.stats,
    flags: state.flags,
    tools: state.tools,
    weapons: state.weapons,
    clothing: state.clothing,
    relics: state.relics,
    buildings: state.buildings,
    villagers: state.villagers,
    world: state.world,
    story: state.story,
    events: state.events,
    log: state.log,
    current_population: state.current_population,
    total_population: state.total_population,
    version: state.version,
  };

  await saveGame(gameState);

  const now = new Date().toLocaleTimeString();
  useGameStore.setState({ lastSaved: now });
}

function handleStrangerApproach() {
  const state = useGameStore.getState();

  // Pause stranger checks when event dialog or combat dialog is open
  if (state.eventDialog.isOpen || state.combatDialog.isOpen) return;

  const currentPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  const maxPopulation = getMaxPopulation(state);

  // Only trigger if there's room for more villagers
  if (currentPopulation >= maxPopulation) return;

  // Calculate probability based on your specifications
  let probability = 0.1; // 10% base probability

  // +2.5% for each wooden hut
  probability += state.buildings.woodenHut * 0.025;
  // +2.5% for each stone hut
  probability += state.buildings.stoneHut * 0.025;
  // +5% for each longhouse
  probability += state.buildings.longhouse * 0.05;

  // if population is 0
  if (currentPopulation === 0) {
    probability = 0.9;
  }

  // Calculate available room first
  const currentPop = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  const maxPop = getMaxPopulation(state);
  const availableRoom = maxPop - currentPop;

  let strangersCount = 1; // Default to 1 stranger

  // Check for the new condition: 10 stone houses built and a stranger approaches
  // But only if there's room for multiple strangers
  if (state.buildings.stoneHut >= 10 && Math.random() < probability && availableRoom >= 2) {
    if (availableRoom >= 3 && Math.random() < 0.1) {
      strangersCount = 3;
    } else if (Math.random() < 0.30) {
      strangersCount = 2;
    }
  }

  // Check if stranger(s) approach based on probability
  if (Math.random() < probability) {
    const messages = [
      "A stranger approaches through the woods and joins your village.",
      "A traveler arrives and decides to stay.",
      "A wanderer appears from the woods and becomes part of your community.",
      "Someone approaches the village and settles in.",
      "A stranger joins your community, bringing skills and hope.",
      "A newcomer arrives and makes themselves at home.",
    ];

    // Adjust message if multiple strangers arrive
    if (strangersCount > 1) {
      messages.push(
        `${strangersCount} strangers approach through the woods and join your village.`,
      );
      messages.push(`${strangersCount} travelers arrive and decide to stay.`);
      messages.push(
        `${strangersCount} wanderers appear from the woods and become part of your community.`,
      );
      messages.push(`Several people approach the village and settle in.`);
    }

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Calculate how many villagers can actually be added (respect max population)
    const actualStrangersToAdd = Math.min(strangersCount, availableRoom);

    if (actualStrangersToAdd <= 0) return; // No room for anyone

    // Add the villager(s) - only the amount that fits
    state.updateResource("free" as any, actualStrangersToAdd);

    // Update message if we couldn't add all strangers
    let finalMessage = randomMessage;
    if (actualStrangersToAdd < strangersCount) {
      finalMessage = actualStrangersToAdd === 1 
        ? "A stranger approaches, but your village can only accommodate one more person."
        : `${actualStrangersToAdd} strangers approach, but your village can only accommodate ${actualStrangersToAdd} more people.`;
    }

    // Add log entry
    state.addLogEntry({
      id: `stranger-approaches-${Date.now()}`,
      message: finalMessage,
      timestamp: Date.now(),
      type: "system",
    });

    // Update population after applying changes
    setTimeout(() => state.updatePopulation(), 0);

    // Play new villager sound
    audioManager.playSound("newVillager", 0.02);
  }
}

// Export the manual save function
export async function manualSave() {
  await handleAutoSave();
}
