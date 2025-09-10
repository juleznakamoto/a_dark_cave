import { useGameStore } from './state';
import { saveGame } from './save';
import { GameState } from '@shared/schema';

let gameLoopId: number | null = null;
let lastTick = 0;
const TICK_INTERVAL = 200; // 200ms ticks
const AUTO_SAVE_INTERVAL = 30000; // Auto-save every 30 seconds
const FIRE_CONSUMPTION_INTERVAL = 30000; // Fire consumes wood every 30 seconds

let lastAutoSave = 0;
let lastFireConsumption = 0;

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

  // Check and trigger events
  state.checkEvents();

  // Fire consumption is now handled in handleFireConsumption() every 30 seconds

  // Check for unlocks
  checkUnlocks(state);
}

function checkUnlocks(state: GameState) {
  // Unlock village when player has gathered enough wood
  if (state.resources.wood >= 20 && !state.flags.villageUnlocked) {
    useGameStore.getState().setFlag('villageUnlocked', true);
  }
}

function handleFireConsumption() {
  // Fire consumption disabled - fire stays lit indefinitely
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