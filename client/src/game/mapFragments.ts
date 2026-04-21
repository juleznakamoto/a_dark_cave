import type { GameState } from "@shared/schema";

export const MAP_FRAGMENT_TOTAL = 4;

export function getMapFragmentCount(state: GameState): number {
  const s = state.story?.seen ?? {};
  return (
    (s.mapFragmentCaveFound ? 1 : 0) +
    (s.mapFragmentHuntFound ? 1 : 0) +
    (s.mapFragmentMerchantWoodenBought ? 1 : 0) +
    (s.mapFragmentMerchantStoneBought ? 1 : 0)
  );
}
