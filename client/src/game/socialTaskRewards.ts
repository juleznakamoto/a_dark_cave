import type { GameState } from "@shared/schema";
import { getSocialPlatformConfig } from "@/game/socialPlatforms";
import { getResourceName } from "@/i18n/resolveGameText";

export const SOCIAL_TASK_RESOURCE_IDS = [
  "wood",
  "food",
  "stone",
  "silver",
] as const;

export type SocialTaskResourceId = (typeof SOCIAL_TASK_RESOURCE_IDS)[number];

export type SocialTaskResourceReward = {
  resource: SocialTaskResourceId;
  amount: number;
};

const SOCIAL_TASK_RESOURCE_NAME_FALLBACK: Record<SocialTaskResourceId, string> =
  {
    wood: "Wood",
    food: "Food",
    stone: "Stone",
    silver: "Silver",
  };

export function getSocialTaskResourceLabel(
  resource: SocialTaskResourceId,
): string {
  return getResourceName(
    resource,
    SOCIAL_TASK_RESOURCE_NAME_FALLBACK[resource],
  );
}

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
