import type { StartScreenPreferences } from "@/components/game/StartScreen";
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
  };
}

/** Transfer ownership of a prepared store to Game without loading it again. */
export function consumePreparedGameHydration(): PreparedGameHydration | null {
  const prepared = preparedHydration;
  preparedHydration = null;
  return prepared;
}
