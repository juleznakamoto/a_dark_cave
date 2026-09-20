import { getBoundGameStore } from "@/game/gameStoreHolder";
import { isDemoEdition, isDemoEndDevMode } from "@/lib/edition";

/** Demo ends after this many wooden huts have been built. */
export const DEMO_WOODEN_HUT_LIMIT = 8;

/** Full-game Dark Estate wood/stone cost. Demo uses {@link DEMO_DARK_ESTATE_RESOURCE_COST}. */
export const FULL_DARK_ESTATE_RESOURCE_COST = 500;

/** Steam / Galaxy / CrazyGames demo Dark Estate wood/stone cost. */
export const DEMO_DARK_ESTATE_RESOURCE_COST = 250;

/** Full-game Prior offer: 6 wooden huts, or 5 in Cruel Mode. */
export const FULL_DISGRACED_PRIOR_MIN_WOODEN_HUTS = 6;
export const CRUEL_DISGRACED_PRIOR_MIN_WOODEN_HUTS = 5;

/** Demo Prior offer: 4 wooden huts (regardless of Cruel Mode). */
export const DEMO_DISGRACED_PRIOR_MIN_WOODEN_HUTS = 4;

export function getDarkEstateResourceCost(): number {
  return isDemoEdition()
    ? DEMO_DARK_ESTATE_RESOURCE_COST
    : FULL_DARK_ESTATE_RESOURCE_COST;
}

export function getDisgracedPriorMinWoodenHuts(cruelMode = false): number {
  if (isDemoEdition()) return DEMO_DISGRACED_PRIOR_MIN_WOODEN_HUTS;
  return cruelMode
    ? CRUEL_DISGRACED_PRIOR_MIN_WOODEN_HUTS
    : FULL_DISGRACED_PRIOR_MIN_WOODEN_HUTS;
}

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

/**
 * Demo play is over: DEV Demo End, or a capped demo at the wooden-hut limit.
 * The sim stays frozen after the end dialog is dismissed; only a new run unfreezes.
 */
export function isDemoPlayFrozen(state: {
  buildings?: { woodenHut?: number };
}): boolean {
  if (isDemoEndDevMode()) return true;
  return isDemoLimitReachedFromState(state);
}

/** Reread / demo-end event dialogs close without applying choice effects. */
export function shouldDismissEventWithoutApplying(
  state: Parameters<typeof isDemoPlayFrozen>[0],
  event?: { viewOnly?: boolean } | null,
): boolean {
  return Boolean(event?.viewOnly) || isDemoPlayFrozen(state);
}

export function processDemoLimit(): void {
  if (!isDemoEdition()) return;
  const store = getBoundGameStore();
  const state = store.getState() as {
    galaxyTimeUpDialogOpen?: boolean;
    demoEndDialogDismissed?: boolean;
    buildings?: { woodenHut?: number };
  };
  if (state.galaxyTimeUpDialogOpen || state.demoEndDialogDismissed) return;

  if (isDemoLimitReachedFromState(state)) {
    store.setState({ galaxyTimeUpDialogOpen: true });
  }
}

/** @deprecated Use {@link processDemoLimit}. */
export const processGalaxyDemoLimit = processDemoLimit;

/** Fresh run from the demo-end dialog — new save and reset progress. */
export async function startNewDemoGame(): Promise<void> {
  if (!isDemoEdition()) return;

  const { deleteSave } = await import("@/game/save");
  const { useGameStore } = await import("@/game/state");
  const store = useGameStore.getState();

  store.setGalaxyTimeUpDialogOpen(false);
  await deleteSave();
  await store.restartGame();
}

/** @deprecated Use {@link startNewDemoGame}. */
export const startNewGalaxyDemoGame = startNewDemoGame;
