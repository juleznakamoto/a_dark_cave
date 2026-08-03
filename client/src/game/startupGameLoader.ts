import type { StartScreenPreferences } from "@/components/game/StartScreen";
import { startGameLoop } from "./loop";
import { useGameStore } from "./state";

export async function loadStoreForStartupCheck() {
  await useGameStore.getState().loadGame();
  return useGameStore;
}

export async function prepareGameFromStartScreen(
  preferences: StartScreenPreferences,
) {
  await useGameStore.getState().loadGame();
  useGameStore.setState(preferences);
  return {
    useGameStore,
    startGameLoop,
  };
}
