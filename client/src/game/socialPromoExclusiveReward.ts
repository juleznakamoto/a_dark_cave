import type { GameState } from "@shared/schema";
import { MARKETING_EMAIL_REWARD_KEY } from "@/game/marketingEmailReward";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "@/game/playlightDiscoverReward";
import { SOCIAL_PLATFORMS } from "@/game/socialPlatforms";
import { isSocialRewardFulfilled } from "@/game/socialTaskRewards";
import { SOCIAL_PROMPT_REFERRAL_CAP } from "@/game/socialPromptAuto";
import { useGameStore } from "@/game/state";
import { logger } from "@/lib/logger";

/** Steps: signed in, email reward, Instagram, Reddit, Playlight discover, at least one invite (exclusive item track). */
export const SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL = 6;

export type SocialPromoExclusiveSlice = {
  social_media_rewards?: GameState["social_media_rewards"];
  referralCount?: number;
  referrals?: GameState["referrals"];
  socialPromoExclusiveRewardPending?: boolean;
  /** Account sign-up / session (first rewards task). */
  isUserSignedIn?: boolean;
  /** Welcome gold granted once after creating an account (may be true before email confirm / before UI auth sync). */
  signupWelcomeGoldClaimed?: boolean;
};

export type RewardsTasksUiSlice = SocialPromoExclusiveSlice & {
  clothing?: GameState["clothing"];
};

/** First rewards row: done when gameplay session is active or welcome bonus was already granted. */
export function isSignUpRewardsStepDone(
  state: Pick<
    SocialPromoExclusiveSlice,
    "isUserSignedIn" | "signupWelcomeGoldClaimed"
  >,
): boolean {
  return (
    state.isUserSignedIn === true || state.signupWelcomeGoldClaimed === true
  );
}

/** Signed in + email + social + Playlight discover — invite step may still be open. */
export function areInviteFriendsPrereqsDone(
  state: SocialPromoExclusiveSlice,
): boolean {
  if (!isSignUpRewardsStepDone(state)) return false;
  const rewards = state.social_media_rewards ?? {};
  if (!isSocialRewardFulfilled(rewards[MARKETING_EMAIL_REWARD_KEY])) return false;
  if (!SOCIAL_PLATFORMS.every((p) => isSocialRewardFulfilled(rewards[p.id])))
    return false;
  if (!isSocialRewardFulfilled(rewards[PLAYLIGHT_DISCOVER_REWARD_KEY]))
    return false;
  return true;
}

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
  if (isSignUpRewardsStepDone(state)) n++;
  if (isSocialRewardFulfilled(rewards[MARKETING_EMAIL_REWARD_KEY])) n++;
  for (const p of SOCIAL_PLATFORMS) {
    if (isSocialRewardFulfilled(rewards[p.id])) n++;
  }
  if (isSocialRewardFulfilled(rewards[PLAYLIGHT_DISCOVER_REWARD_KEY])) n++;
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

/** Profile ⯫ shortcut: hidden only when all tasks are done and the ring event granted `gifted_ring`. */
export function isRewardsTasksShortcutVisible(
  state: RewardsTasksUiSlice,
): boolean {
  return (
    !isSocialPromoExclusiveRewardComplete(state) ||
    state.clothing?.gifted_ring !== true
  );
}

/**
 * Floating invite CTA: signed in and under referral cap (same gate as the rewards-dialog invite row).
 */
export function isInviteFriendsFloatingButtonVisible(
  state: SocialPromoExclusiveSlice,
): boolean {
  return (
    state.isUserSignedIn === true &&
    (state.referralCount ?? 0) < SOCIAL_PROMPT_REFERRAL_CAP
  );
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
