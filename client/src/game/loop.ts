import { useGameStore } from "./state";
import { saveGame } from "./save";
import { GameState } from "@shared/schema";
import { getPopulationProduction } from "./population";
import { EventManager } from "./rules/events";

let gameLoopId: number | null = null;
let lastTick = 0;
const TICK_INTERVAL = 200; // 200ms ticks
const AUTO_SAVE_INTERVAL = 30000; // Auto-save every 30 seconds
const FIRE_CONSUMPTION_INTERVAL = 30000; // Fire consumes wood every 30 seconds
const GATHERER_PRODUCTION_INTERVAL = 30000; // gatherer produce wood every 30 seconds
const HUNTER_PRODUCTION_INTERVAL = 30000; // hunter produce food every 30 seconds
const CONSUMPTION_INTERVAL = 30000; // Population consumes food and checks wood every 30 seconds

let lastAutoSave = 0;
let lastFireConsumption = 0;
let lastGathererProduction = 0;
let lastHunterProduction = 0;
let lastConsumption = 0;

export function startGameLoop() {
  if (gameLoopId) return; // Already running

  useGameStore.setState({ isGameLoopActive: true });

  function tick(timestamp: number) {
    if (timestamp - lastTick >= TICK_INTERVAL) {
      lastTick = timestamp;

      // Game tick logic
      processTick();

      // Auto-save logic
      if (timestamp - lastAutoSave >= AUTO_SAVE_INTERVAL) {
        lastAutoSave = timestamp;
        handleAutoSave();
      }

      // Fire wood consumption logic
      if (timestamp - lastFireConsumption >= FIRE_CONSUMPTION_INTERVAL) {
        lastFireConsumption = timestamp;
        handleFireConsumption();
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

      // Population consumption and survival checks
      if (timestamp - lastConsumption >= CONSUMPTION_INTERVAL) {
        lastConsumption = timestamp;
        handlePopulationSurvival();
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

  // If event dialog is open, pause game logic but keep cooldowns ticking
  if (state.eventDialog.isOpen) {
    // Only tick down cooldowns, but don't process events or other game logic
    state.tickCooldowns();
    return;
  }

  // Tick down cooldowns
  state.tickCooldowns();

  // Check and trigger events
  state.checkEvents();
}

function handleFireConsumption() {
  const state = useGameStore.getState();

  // Pause fire consumption when event dialog is open
  if (state.eventDialog.isOpen) return;

  if (state.flags.fireLit && state.resources.wood > 0) {
    // Fire consumes 1 wood every 30 seconds
    state.updateResource("wood", -1);
  }
}

function handleGathererProduction() {
  const state = useGameStore.getState();

  // Pause gatherer production when event dialog is open
  if (state.eventDialog.isOpen) return;

  const gatherer = state.villagers.gatherer;

  if (gatherer > 0) {
    const production = getPopulationProduction('gatherer', gatherer);
    production.forEach(prod => {
      state.updateResource(prod.resource as keyof typeof state.resources, prod.totalAmount);
    });
  }
}

function handleHunterProduction() {
  const state = useGameStore.getState();

  // Pause hunter production when event dialog is open
  if (state.eventDialog.isOpen) return;

  const hunter = state.villagers.hunter;

  if (hunter > 0) {
    const production = getPopulationProduction('hunter', hunter);
    production.forEach(prod => {
      state.updateResource(prod.resource as keyof typeof state.resources, prod.totalAmount);
    });
  }
}

function handlePopulationSurvival() {
  const state = useGameStore.getState();

  // Pause survival checks when event dialog is open
  if (state.eventDialog.isOpen) return;

  const totalPopulation = state.villagers.free + state.villagers.gatherer + state.villagers.hunter;

  if (totalPopulation === 0) return;

  // Only start starvation checks once the player has accumulated at least 5 food
  if (!state.flags.starvationActive) {
    if (state.resources.food < 5) return;
    // Activate starvation system permanently once food reaches 5
    useGameStore.setState({ 
      flags: { ...state.flags, starvationActive: true } 
    });
  }

  let totalDeaths = 0;
  let deathMessages: string[] = [];

  // Handle food consumption and starvation
  const foodNeeded = totalPopulation;
  const availableFood = state.resources.food;

  if (availableFood >= foodNeeded) {
    // Everyone can eat, consume food normally
    state.updateResource("food", -foodNeeded);
  } else {
    // Not enough food, consume all available food and potentially lose population
    state.updateResource("food", -availableFood);

    const unfedPopulation = foodNeeded - availableFood;
    let starvationDeaths = 0;

    // 20% chance for each unfed villager to die
    for (let i = 0; i < unfedPopulation; i++) {
      if (Math.random() < 0.2) {
        starvationDeaths++;
      }
    }

    if (starvationDeaths > 0) {
      totalDeaths += starvationDeaths;
      deathMessages.push(
        starvationDeaths === 1 
          ? "A villager starves to death. The others look gaunt and weak."
          : `${starvationDeaths} villagers starve to death. The survivors grow desperate.`
      );
    }
  }

  // Handle wood shortage and freezing
  if (state.resources.wood === 0) {
    let freezingDeaths = 0;

    // 10% chance for each villager to die from cold
    for (let i = 0; i < totalPopulation; i++) {
      if (Math.random() < 0.1) {
        freezingDeaths++;
      }
    }

    if (freezingDeaths > 0) {
      totalDeaths += freezingDeaths;
      deathMessages.push(
        freezingDeaths === 1 
          ? "A villager succumbs to the cold without wood for warmth. The others huddle together in fear."
          : `${freezingDeaths} villagers freeze to death without wood for warmth. The survivors desperately search for shelter.`
      );
    }
  }

  // Apply all deaths if any occurred
  if (totalDeaths > 0) {
    let remainingDeaths = totalDeaths;
    const currentVillagers = { ...state.villagers };

    // Remove villagers starting with free, then gatherers, then hunters
    if (remainingDeaths > 0 && currentVillagers.free > 0) {
      const freeDeaths = Math.min(remainingDeaths, currentVillagers.free);
      currentVillagers.free -= freeDeaths;
      remainingDeaths -= freeDeaths;
    }

    if (remainingDeaths > 0 && currentVillagers.gatherer > 0) {
      const gathererDeaths = Math.min(remainingDeaths, currentVillagers.gatherer);
      currentVillagers.gatherer -= gathererDeaths;
      remainingDeaths -= gathererDeaths;
    }

    if (remainingDeaths > 0 && currentVillagers.hunter > 0) {
      const hunterDeaths = Math.min(remainingDeaths, currentVillagers.hunter);
      currentVillagers.hunter -= hunterDeaths;
      remainingDeaths -= hunterDeaths;
    }

    // Update the state
    useGameStore.setState({ villagers: currentVillagers });

    // Add log entries for each type of death
    deathMessages.forEach(message => {
      const logEntry: import("@/game/events").LogEntry = {
        id: `survival-${Date.now()}-${Math.random()}`,
        message,
        timestamp: Date.now(),
        type: "system",
      };

      state.addLogEntry(logEntry);
    });

    // Update population counts
    setTimeout(() => state.updatePopulation(), 0);
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

// Export the manual save function
export async function manualSave() {
  await handleAutoSave();
}