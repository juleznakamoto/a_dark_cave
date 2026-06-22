import type { GameState } from "@shared/schema";

export type SocialRewardEntry = GameState["social_media_rewards"][string];

export function isSocialRewardClaimed(
  entry: SocialRewardEntry | undefined,
): boolean {
  return entry?.claimed === true;
}

/** Task action done (follow, subscribe, discover, etc.). Claimed entries count as fulfilled. */
export function isSocialRewardFulfilled(
  entry: SocialRewardEntry | undefined,
): boolean {
  return entry?.claimed === true || entry?.fulfilled === true;
}
