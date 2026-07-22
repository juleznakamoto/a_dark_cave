import { useGameStore } from "@/game/state";
import { isDemoEdition } from "@/lib/edition";

/** Demo ends after this many wooden huts have been built. */
export const DEMO_WOODEN_HUT_LIMIT = 8;

/** @deprecated Use {@link DEMO_WOODEN_HUT_LIMIT}. */
export const DEMO_STONE_HUT_LIMIT = DEMO_WOODEN_HUT_LIMIT;

/** @deprecated Use {@link DEMO_WOODEN_HUT_LIMIT}. */
export const GALAXY_DEMO_STONE_HUT_LIMIT = DEMO_WOODEN_HUT_LIMIT;

/** Footer progress segments — one per wooden hut up to the demo end. */
export const DEMO_WOODEN_HUT_SEGMENTS = DEMO_WOODEN_HUT_LIMIT;

export function getDemoWoodenHutCount(buildings?: {
  woodenHut?: number;
}): number {
  return buildings?.woodenHut ?? 0;
}

/** @deprecated Use {@link getDemoWoodenHutCount}. */
export function getDemoStoneHutCount(buildings?: {
  woodenHut?: number;
  stoneHut?: number;
}): number {
  return getDemoWoodenHutCount(buildings);
}

/** @deprecated Use {@link getDemoWoodenHutCount}. */
export const getGalaxyStoneHutCount = getDemoWoodenHutCount;

/** Total footer progress segments: each wooden hut up to the demo end. */
export function getDemoProgressSegmentCount(): number {
  return DEMO_WOODEN_HUT_LIMIT;
}

/** Completed segments from built wooden huts (capped at the demo limit). */
export function getDemoProgressCompleted(buildings?: {
  woodenHut?: number;
  stoneHut?: number;
}): number {
  return Math.min(
    Math.max(0, buildings?.woodenHut ?? 0),
    DEMO_WOODEN_HUT_LIMIT,
  );
}

/** 0–100 progress for the Steam demo footer bar. */
export function getDemoProgressPercent(buildings?: {
  woodenHut?: number;
  stoneHut?: number;
}): number {
  const total = getDemoProgressSegmentCount();
  if (total <= 0) return 0;
  return (getDemoProgressCompleted(buildings) / total) * 100;
}

export function isDemoLimitReached(woodenHutCount: number): boolean {
  return isDemoEdition() && woodenHutCount >= DEMO_WOODEN_HUT_LIMIT;
}

/** @deprecated Use {@link isDemoLimitReached}. */
export const isGalaxyDemoLimitReached = isDemoLimitReached;

export function isDemoLimitReachedFromState(state: {
  buildings?: { woodenHut?: number };
}): boolean {
  return isDemoLimitReached(getDemoWoodenHutCount(state.buildings));
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
