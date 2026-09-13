import type { GameState } from "@shared/schema";
import { getSocialPlatformConfig } from "@/game/socialPlatforms";

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

/** Resolve a platform reward, including deactivated-task claim aliases. */
export function getSocialPlatformRewardEntry(
  rewards: GameState["social_media_rewards"] | undefined,
  platformId: string,
): SocialRewardEntry | undefined {
  if (!rewards) return undefined;
  const primary = rewards[platformId];
  if (primary) return primary;
  const legacyKeys = getSocialPlatformConfig(platformId)?.legacyRewardKeys ?? [];
  for (const legacyId of legacyKeys) {
    const legacy = rewards[legacyId];
    if (legacy) return legacy;
  }
  return undefined;
}
