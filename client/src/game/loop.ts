import { useGameStore } from "./state";
import { saveGame } from "./save";
import { GameState } from "@shared/schema";
import { getPopulationProduction } from "./population";
import { EventManager } from "./rules/events";

let gameLoopId: number | null = null;
let lastTick = 0;
const TICK_INTERVAL = 200; // 200ms ticks
const AUTO_SAVE_INTERVAL = 15000; // Auto-save every 15 seconds
const FIRE_CONSUMPTION_INTERVAL = 15000; // Fire consumes wood every 15 seconds
const GATHERER_PRODUCTION_INTERVAL = 15000; // gatherer produce wood every 15 seconds
const HUNTER_PRODUCTION_INTERVAL = 15000; // hunter produce food every 15 seconds
const CONSUMPTION_INTERVAL = 15000; // Population consumes food and checks wood every 15 seconds
const STARVATION_CHECK_INTERVAL = 15000; // Check starvation every 15 seconds
const FREEZING_CHECK_INTERVAL = 15000; // Check freezing every 15 seconds

let lastAutoSave = 0;
let lastFireConsumption = 0;
let lastGathererProduction = 0;
let lastHunterProduction = 0;
let lastConsumption = 0;
let lastStarvationCheck = 0;
let lastFreezingCheck = 0;

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
    // Fire consumes 1 wood every 15 seconds
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

function handleMinerProduction() {
  const state = useGameStore.getState();

  // Pause miner production when event dialog is open
  if (state.eventDialog.isOpen) return;

  // Process each miner type
  Object.entries(state.villagers).forEach(([job, count]) => {
    if (count > 0 && job.endsWith('miner')) {
      const production = getPopulationProduction(job, count);
      production.forEach(prod => {
        state.updateResource(prod.resource as keyof typeof state.resources, prod.totalAmount);
      });
    }
  });
}

function handlePopulationSurvival() {
  const state = useGameStore.getState();

  // Pause survival checks when event dialog is open
  if (state.eventDialog.isOpen) return;

  const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);

  if (totalPopulation === 0) return;

  // Only start starvation checks once the player has accumulated at least 5 food
  if (!state.flags.starvationActive) {
    if (state.resources.food < 5) return;
    // Activate starvation system permanently once food reaches 5
    useGameStore.setState({ 
      flags: { ...state.flags, starvationActive: true } 
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

  // Pause starvation checks when event dialog is open
  if (state.eventDialog.isOpen) return;

  // Check if starvation conditions are met
  if (!state.flags.starvationActive) {
    if (state.resources.food < 5) return;
    // Activate starvation system permanently once food reaches 5
    useGameStore.setState({ 
      flags: { ...state.flags, starvationActive: true } 
    });
  }

  const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
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
      // Apply deaths to villagers
      let updatedVillagers = { ...state.villagers };
      let remainingDeaths = starvationDeaths;

      const villagerTypes = ['free', 'gatherer', 'hunter', 'iron_miner', 'coal_miner', 'sulfur_miner', 'silver_miner', 'gold_miner', 'obsidian_miner', 'adamant_miner', 'moonstone_miner', 'steel_forger'];
      
      for (const villagerType of villagerTypes) {
        if (remainingDeaths > 0 && updatedVillagers[villagerType as keyof typeof updatedVillagers] > 0) {
          const deaths = Math.min(remainingDeaths, updatedVillagers[villagerType as keyof typeof updatedVillagers]);
          updatedVillagers[villagerType as keyof typeof updatedVillagers] -= deaths;
          remainingDeaths -= deaths;
        }
        if (remainingDeaths === 0) break;
      }

      const message = starvationDeaths === 1 
        ? "One villager succumbs to starvation. Remaining villagers grow desperate." 
        : `${starvationDeaths} villagers starve to death. Survivors look gaunt and hollow-eyed.`;

      useGameStore.setState({
        villagers: updatedVillagers,
      });

      state.addLogEntry({
        id: `starvation-${Date.now()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });

      // Update population after applying changes
      setTimeout(() => state.updatePopulation(), 0);
    }
  }
}

function handleFreezingCheck() {
  const state = useGameStore.getState();

  // Pause freezing checks when event dialog is open
  if (state.eventDialog.isOpen) return;

  const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
  
  if (totalPopulation > 0 && state.resources.wood === 0) {
    // 10% chance for each villager to die from cold
    let freezingDeaths = 0;
    for (let i = 0; i < totalPopulation; i++) {
      if (Math.random() < 0.1) {
        freezingDeaths++;
      }
    }

    if (freezingDeaths > 0) {
      // Apply deaths to villagers
      let updatedVillagers = { ...state.villagers };
      let remainingDeaths = freezingDeaths;

      const villagerTypes = ['free', 'gatherer', 'hunter', 'iron_miner', 'coal_miner', 'sulfur_miner', 'silver_miner', 'gold_miner', 'obsidian_miner', 'adamant_miner', 'moonstone_miner', 'steel_forger'];
      
      for (const villagerType of villagerTypes) {
        if (remainingDeaths > 0 && updatedVillagers[villagerType as keyof typeof updatedVillagers] > 0) {
          const deaths = Math.min(remainingDeaths, updatedVillagers[villagerType as keyof typeof updatedVillagers]);
          updatedVillagers[villagerType as keyof typeof updatedVillagers] -= deaths;
          remainingDeaths -= deaths;
        }
        if (remainingDeaths === 0) break;
      }

      const message = freezingDeaths === 1 
        ? "The bitter cold claims one villager's life." 
        : `${freezingDeaths} villagers freeze to death at night. Survivors are weak and traumatized.`;

      useGameStore.setState({
        villagers: updatedVillagers,
      });

      state.addLogEntry({
        id: `freezing-${Date.now()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
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

// Export the manual save function
export async function manualSave() {
  await handleAutoSave();
}