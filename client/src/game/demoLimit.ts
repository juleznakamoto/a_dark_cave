import { useGameStore } from "@/game/state";
import { isDemoEdition } from "@/lib/edition";

/** Demo ends after this many stone huts have been built. */
export const DEMO_STONE_HUT_LIMIT = 3;

/** @deprecated Use {@link DEMO_STONE_HUT_LIMIT}. */
export const GALAXY_DEMO_STONE_HUT_LIMIT = DEMO_STONE_HUT_LIMIT;

export function getDemoStoneHutCount(buildings?: {
  stoneHut?: number;
}): number {
  return buildings?.stoneHut ?? 0;
}

/** @deprecated Use {@link getDemoStoneHutCount}. */
export const getGalaxyStoneHutCount = getDemoStoneHutCount;

export function isDemoLimitReached(stoneHutCount: number): boolean {
  return isDemoEdition() && stoneHutCount >= DEMO_STONE_HUT_LIMIT;
}

/** @deprecated Use {@link isDemoLimitReached}. */
export const isGalaxyDemoLimitReached = isDemoLimitReached;

export function isDemoLimitReachedFromState(state: {
  buildings?: { stoneHut?: number };
}): boolean {
  return isDemoLimitReached(getDemoStoneHutCount(state.buildings));
}

/** @deprecated Use {@link isDemoLimitReachedFromState}. */
export const isGalaxyDemoLimitReachedFromState = isDemoLimitReachedFromState;

export function processDemoLimit(): void {
  if (!isDemoEdition()) return;
  const state = useGameStore.getState();
  if (state.galaxyTimeUpDialogOpen) return;

  if (isDemoLimitReachedFromState(state)) {
    useGameStore.setState({ galaxyTimeUpDialogOpen: true });
  }
}

/** @deprecated Use {@link processDemoLimit}. */
export const processGalaxyDemoLimit = processDemoLimit;

/** Fresh run from the demo-end dialog — new save and reset progress. */
export async function startNewDemoGame(): Promise<void> {
  if (!isDemoEdition()) return;

  const { deleteSave } = await import("@/game/save");
  const store = useGameStore.getState();

  store.setGalaxyTimeUpDialogOpen(false);
  await deleteSave();
  await store.restartGame();
}

/** @deprecated Use {@link startNewDemoGame}. */
export const startNewGalaxyDemoGame = startNewDemoGame;
