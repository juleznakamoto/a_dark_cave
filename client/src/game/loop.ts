import { useGameStore } from "./state";
import { saveGame } from "./save";
import { GameState } from "@shared/schema";
import { getPopulationProduction } from "./population";
import { EventManager } from "./events";

let gameLoopId: number | null = null;
let lastTick = 0;
const TICK_INTERVAL = 200; // 200ms ticks
const AUTO_SAVE_INTERVAL = 30000; // Auto-save every 30 seconds
const FIRE_CONSUMPTION_INTERVAL = 30000; // Fire consumes wood every 30 seconds
const GATHERER_PRODUCTION_INTERVAL = 30000; // gatherer produce wood every 30 seconds
const HUNTER_PRODUCTION_INTERVAL = 30000; // hunter produce food every 30 seconds

let lastAutoSave = 0;
let lastFireConsumption = 0;
let lastGathererProduction = 0;
let lastHunterProduction = 0;

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

async function handleAutoSave() {
  const state = useGameStore.getState();
  const gameState: GameState = {
    resources: state.resources,
    flags: state.flags,
    tools: state.tools,
    buildings: state.buildings,
    villagers: state.villagers,
    world: state.world,
    story: state.story,
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