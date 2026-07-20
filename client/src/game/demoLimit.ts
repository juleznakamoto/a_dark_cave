import { useGameStore } from "@/game/state";
import { isDemoEdition } from "@/lib/edition";
import { CRUEL_MODE } from "@/game/cruelMode";

/** Demo ends after this many stone huts have been built. */
export const DEMO_STONE_HUT_LIMIT = 3;

/**
 * Wooden-hut segments for the Steam demo progress bar (normal-mode max wooden huts).
 * Total segments = this + {@link DEMO_STONE_HUT_LIMIT} (e.g. 10 + 3 = 13).
 */
export const DEMO_WOODEN_HUT_SEGMENTS = CRUEL_MODE.huts.maxWoodenHut.normal;

/** @deprecated Use {@link DEMO_STONE_HUT_LIMIT}. */
export const GALAXY_DEMO_STONE_HUT_LIMIT = DEMO_STONE_HUT_LIMIT;

export function getDemoStoneHutCount(buildings?: {
  stoneHut?: number;
}): number {
  return buildings?.stoneHut ?? 0;
}

/** @deprecated Use {@link getDemoStoneHutCount}. */
export const getGalaxyStoneHutCount = getDemoStoneHutCount;

/** Total footer progress segments: each wooden hut + each stone hut up to the demo end. */
export function getDemoProgressSegmentCount(): number {
  return DEMO_WOODEN_HUT_SEGMENTS + DEMO_STONE_HUT_LIMIT;
}

/** Completed segments from built wooden/stone huts (capped at segment totals). */
export function getDemoProgressCompleted(buildings?: {
  woodenHut?: number;
  stoneHut?: number;
}): number {
  const wooden = Math.min(
    Math.max(0, buildings?.woodenHut ?? 0),
    DEMO_WOODEN_HUT_SEGMENTS,
  );
  const stone = Math.min(
    Math.max(0, buildings?.stoneHut ?? 0),
    DEMO_STONE_HUT_LIMIT,
  );
  return wooden + stone;
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
