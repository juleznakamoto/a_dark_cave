import type { GameState } from "@shared/schema";

/**
 * New Steam runs store this flag and use web foundry/tannery rates.
 * Saves created before the flag keep the BTP bonus.
 */
export const WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY =
  "webFoundryTanneryProduction";

export function usesWebFoundryTanneryProduction(
  state: Pick<GameState, "story">,
): boolean {
  return (
    state.story?.seen?.[WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY] === true
  );
}

/** New Steam games record the flag. Every other new game leaves it unset. */
export function webFoundryTanneryProductionForNewGame(
  steamBuild: boolean,
): true | undefined {
  return steamBuild ? true : undefined;
}

/** Web rate, plus the legacy BTP bonus when the save does not opt into web rates. */
export function foundryTanneryAmount(
  state: Pick<GameState, "story" | "BTP">,
  webAmount: number,
): number {
  if (usesWebFoundryTanneryProduction(state)) return webAmount;
  return webAmount + (state.BTP ?? 0);
}
