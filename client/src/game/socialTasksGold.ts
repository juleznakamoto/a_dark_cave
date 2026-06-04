import type { GameState } from "@shared/schema";
import { REFERRAL_REWARD_GOLD, SIGN_UP_WELCOME_GOLD } from "@shared/schema";
import {
  MARKETING_EMAIL_REWARD_KEY,
  MARKETING_SUBSCRIBE_GOLD,
} from "@/game/marketingEmailReward";
import {
  PLAYLIGHT_DISCOVER_REWARD_GOLD,
  PLAYLIGHT_DISCOVER_REWARD_KEY,
} from "@/game/playlightRewards";
import { SOCIAL_PLATFORMS } from "@/game/socialPlatforms";

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

  for (const platform of SOCIAL_PLATFORMS) {
    if (rewards[platform.id]?.claimed) {
      total += platform.reward;
    }
  }

  if (rewards[PLAYLIGHT_DISCOVER_REWARD_KEY]?.claimed) {
    total += PLAYLIGHT_DISCOVER_REWARD_GOLD;
  }

  for (const referral of state.referrals ?? []) {
    if (referral.claimed) {
      total += REFERRAL_REWARD_GOLD;
    }
  }

  return total;
}
