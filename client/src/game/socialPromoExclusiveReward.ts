import type { GameState } from "@shared/schema";
import { MARKETING_EMAIL_REWARD_KEY } from "@/game/marketingEmailReward";
import { SOCIAL_PLATFORMS } from "@/game/socialPlatforms";
import { useGameStore } from "@/game/state";
import { logger } from "@/lib/logger";

/** Steps: email reward, Instagram, Reddit, at least one invite (exclusive item track). */
export const SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL = 4;

export type SocialPromoExclusiveSlice = {
  social_media_rewards?: GameState["social_media_rewards"];
  referralCount?: number;
  referrals?: GameState["referrals"];
  socialPromoExclusiveRewardPending?: boolean;
};

/** At least one successful invite for the exclusive-item track (gold rewards may still go up to 10). */
export function isExclusiveInviteStepDone(
  state: SocialPromoExclusiveSlice,
): boolean {
  if ((state.referralCount ?? 0) >= 1) return true;
  const refs = state.referrals;
  return Array.isArray(refs) && refs.length >= 1;
}

export function socialPromoExclusiveStepsCompleted(
  state: SocialPromoExclusiveSlice,
): number {
  const rewards = state.social_media_rewards ?? {};
  let n = 0;
  if (!!rewards[MARKETING_EMAIL_REWARD_KEY]?.claimed) n++;
  for (const p of SOCIAL_PLATFORMS) {
    if (rewards[p.id]?.claimed) n++;
  }
  if (isExclusiveInviteStepDone(state)) n++;
  return n;
}

export function getSocialPromoExclusiveProgress(state: SocialPromoExclusiveSlice): {
  completed: number;
  total: number;
  percent: number;
} {
  const completed = socialPromoExclusiveStepsCompleted(state);
  const total = SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL;
  const percent = Math.min(100, Math.round((completed / total) * 100));
  return { completed, total, percent };
}

export function isSocialPromoExclusiveRewardComplete(
  state: SocialPromoExclusiveSlice,
): boolean {
  return socialPromoExclusiveStepsCompleted(state) >= SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL;
}

/**
 * When all exclusive-track steps are done, sets `socialPromoExclusiveRewardPending` once so a future event can grant the item.
 */
export function syncSocialPromoExclusiveRewardPending(): void {
  const s = useGameStore.getState();
  if (!isSocialPromoExclusiveRewardComplete(s)) return;
  if (s.socialPromoExclusiveRewardPending) return;

  useGameStore.setState({ socialPromoExclusiveRewardPending: true });

  void (async () => {
    try {
      const { buildGameState } = await import("@/game/stateHelpers");
      const { saveGame } = await import("@/game/save");
      const gameState = buildGameState(useGameStore.getState());
      await saveGame(gameState, false);
      useGameStore.setState({
        lastSaved: new Date().toLocaleTimeString(),
        isNewGame: false,
      });
    } catch (err) {
      logger.error("Failed to persist socialPromoExclusiveRewardPending:", err);
    }
  })();
}
