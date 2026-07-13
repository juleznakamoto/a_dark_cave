import { useGameStore } from "@/game/state";
import { isGalaxyEdition } from "@/lib/edition";

/** Demo ends after this many stone huts have been built. */
export const GALAXY_DEMO_STONE_HUT_LIMIT = 3;

export function getGalaxyStoneHutCount(buildings?: {
  stoneHut?: number;
}): number {
  return buildings?.stoneHut ?? 0;
}

export function isGalaxyDemoLimitReached(stoneHutCount: number): boolean {
  return (
    isGalaxyEdition() && stoneHutCount >= GALAXY_DEMO_STONE_HUT_LIMIT
  );
}

export function isGalaxyDemoLimitReachedFromState(state: {
  buildings?: { stoneHut?: number };
}): boolean {
  return isGalaxyDemoLimitReached(getGalaxyStoneHutCount(state.buildings));
}

export function processGalaxyDemoLimit(): void {
  if (!isGalaxyEdition()) return;
  const state = useGameStore.getState();
  if (state.galaxyTimeUpDialogOpen) return;

  if (isGalaxyDemoLimitReachedFromState(state)) {
    useGameStore.setState({ galaxyTimeUpDialogOpen: true });
  }
}

/** Fresh run from the demo-end dialog — new save and reset progress. */
export async function startNewGalaxyDemoGame(): Promise<void> {
  if (!isGalaxyEdition()) return;

  const { deleteSave } = await import("@/game/save");
  const store = useGameStore.getState();

  store.setGalaxyTimeUpDialogOpen(false);
  await deleteSave();
  await store.restartGame();
}
