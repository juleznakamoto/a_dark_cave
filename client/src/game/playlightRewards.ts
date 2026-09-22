import type { SocialTaskResourceReward } from "@/game/socialTaskRewards";

/** Gold granted when lighting fire as a Playlight referral member. */
export const PLAYLIGHT_WELCOME_GOLD = 100;

/** Silver for completing the Try 1 game social task. */
export const PLAYLIGHT_DISCOVER_REWARD: SocialTaskResourceReward = {
  resource: "silver",
  amount: 100,
};

/** Persisted key under `social_media_rewards`. */
export const PLAYLIGHT_DISCOVER_REWARD_KEY = "playlight_discover";

/** After click: Discovery opens, then this delay before gold + task completion. */
export const PLAYLIGHT_DISCOVER_REWARD_COMPLETE_DELAY_MS = 10_000;
