import type { StartScreenPreferences } from "@/components/game/StartScreen";
import { clearPreferStartScreen } from "./startupBootSurface";
import { useGameStore } from "./state";

export interface PreparedGameHydration {
  hadPersistedSave: boolean;
}

let preparedHydration: PreparedGameHydration | null = null;
let hydrationInFlight: Promise<PreparedGameHydration> | null = null;

async function hydrateStoreOnce(): Promise<PreparedGameHydration> {
  if (preparedHydration) return preparedHydration;
  if (hydrationInFlight) return hydrationInFlight;

  hydrationInFlight = useGameStore
    .getState()
    .loadGame()
    .then((hadPersistedSave) => {
      preparedHydration = { hadPersistedSave };
      return preparedHydration;
    })
    .finally(() => {
      hydrationInFlight = null;
    });

  return hydrationInFlight;
}

export async function loadStoreForStartupCheck() {
  await hydrateStoreOnce();
  return useGameStore;
}

export async function prepareGameFromStartScreen(
  preferences: StartScreenPreferences,
) {
  await hydrateStoreOnce();
  return {
    useGameStore,
    commitMakeFireStart,
  };
}

/**
 * Apply start-screen preferences and Make Fire. executeAction can no-op if the
 * action registry is not ready; still mark the run started so GameContainer
 * does not remount the intro.
 */
export function commitMakeFireStart(
  preferences: StartScreenPreferences,
): void {
  clearPreferStartScreen();
  useGameStore.setState(preferences);
  const flags = useGameStore.getState().flags;
  if (flags.gameStarted) return;
  useGameStore.getState().trackButtonClick("make-fire");
  useGameStore.getState().executeAction("makeFire");
  const nextFlags = useGameStore.getState().flags;
  if (nextFlags.gameStarted) return;
  useGameStore.setState({
    flags: {
      ...nextFlags,
      gameStarted: true,
      villagerCapsEnabled: true,
    },
  });
}

/** Transfer ownership of a prepared store to Game without loading it again. */
export function consumePreparedGameHydration(): PreparedGameHydration | null {
  const prepared = preparedHydration;
  preparedHydration = null;
  return prepared;
}
