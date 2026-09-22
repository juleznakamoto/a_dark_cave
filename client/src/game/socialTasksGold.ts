import type { GameState } from "@shared/schema";
import { REFERRAL_REWARD_GOLD, SIGN_UP_WELCOME_GOLD } from "@shared/schema";
import {
  MARKETING_EMAIL_REWARD_KEY,
  MARKETING_SUBSCRIBE_GOLD,
} from "@/game/marketingEmailReward";
import {
  PLAYLIGHT_DISCOVER_REWARD,
  PLAYLIGHT_DISCOVER_REWARD_KEY,
} from "@/game/playlightRewards";
import { SOCIAL_PLATFORMS } from "@/game/socialPlatforms";
import {
  isSocialRewardClaimed,
  type SocialTaskResourceId,
} from "@/game/socialTaskRewards";

/** Slice needed to re-apply one-time social / rewards-task gold after a new game. */
export type PersistedSocialTasksGoldSlice = {
  social_media_rewards?: GameState["social_media_rewards"];
  signupWelcomeGoldClaimed?: boolean;
  referrals?: GameState["referrals"];
};

/**
 * Total gold the player already earned from persisted social / rewards tasks.
 * Used when starting a new game so claimed flags stay one-time but gold is not lost.
 */
export function computePersistedSocialTasksGold(
  state: PersistedSocialTasksGoldSlice,
): number {
  let total = 0;
  const rewards = state.social_media_rewards ?? {};

  if (state.signupWelcomeGoldClaimed === true) {
    total += SIGN_UP_WELCOME_GOLD;
  }

  if (rewards[MARKETING_EMAIL_REWARD_KEY]?.claimed) {
    total += MARKETING_SUBSCRIBE_GOLD;
  }

  for (const referral of state.referrals ?? []) {
    if (referral.claimed) {
      total += REFERRAL_REWARD_GOLD;
    }
  }

  return total;
}

export type PersistedSocialTaskResourceTotals = Partial<
  Record<SocialTaskResourceId, number>
>;

/**
 * Resources already earned from claimed social tasks (follows and Try 1 game).
 * Re-applied on a new game so the one-time claim flags do not drop the reward.
 */
export function computePersistedSocialTaskResources(
  state: Pick<PersistedSocialTasksGoldSlice, "social_media_rewards">,
): PersistedSocialTaskResourceTotals {
  const totals: Record<SocialTaskResourceId, number> = {
    wood: 0,
    food: 0,
    stone: 0,
    silver: 0,
  };
  const rewards = state.social_media_rewards ?? {};

  for (const platform of SOCIAL_PLATFORMS) {
    if (isSocialRewardClaimed(rewards[platform.id])) {
      totals[platform.reward.resource] += platform.reward.amount;
    }
  }

  if (rewards[PLAYLIGHT_DISCOVER_REWARD_KEY]?.claimed) {
    totals[PLAYLIGHT_DISCOVER_REWARD.resource] +=
      PLAYLIGHT_DISCOVER_REWARD.amount;
  }

  return totals;
}
