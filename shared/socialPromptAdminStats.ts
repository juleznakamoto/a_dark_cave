/**
 * Admin aggregates for the social prompt dialog (plan A + B only).
 * Step logic mirrors `client/src/game/socialPromoExclusiveReward.ts` (pure, no store).
 */

export const MARKETING_EMAIL_REWARD_KEY = "marketing_email";
export const PLAYLIGHT_DISCOVER_REWARD_KEY = "playlight_discover";

export const SOCIAL_PROMO_PLATFORM_IDS = ["instagram", "reddit"] as const;
export const SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL = 6;

export type LooseGameState = Record<string, unknown>;

function isTruthyClaimed(rewards: unknown, key: string): boolean {
  if (!rewards || typeof rewards !== "object") return false;
  const row = (rewards as Record<string, { claimed?: boolean }>)[key];
  return row?.claimed === true;
}

export function isSignUpRewardsStepDoneFromSave(gs: LooseGameState): boolean {
  return gs.isUserSignedIn === true || gs.signupWelcomeGoldClaimed === true;
}

export function isExclusiveInviteStepDoneFromSave(gs: LooseGameState): boolean {
  const rc = typeof gs.referralCount === "number" ? gs.referralCount : 0;
  if (rc >= 1) return true;
  const refs = gs.referrals;
  return Array.isArray(refs) && refs.length >= 1;
}

export function socialPromoExclusiveStepsCompletedFromSave(
  gs: LooseGameState,
): number {
  const rewards = gs.social_media_rewards;
  let n = 0;
  if (isSignUpRewardsStepDoneFromSave(gs)) n++;
  if (isTruthyClaimed(rewards, MARKETING_EMAIL_REWARD_KEY)) n++;
  for (const id of SOCIAL_PROMO_PLATFORM_IDS) {
    if (isTruthyClaimed(rewards, id)) n++;
  }
  if (isTruthyClaimed(rewards, PLAYLIGHT_DISCOVER_REWARD_KEY)) n++;
  if (isExclusiveInviteStepDoneFromSave(gs)) n++;
  return n;
}

function isSocialPromoExclusiveCompleteFromSave(gs: LooseGameState): boolean {
  return (
    socialPromoExclusiveStepsCompletedFromSave(gs) >=
    SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL
  );
}

function clothingGiftedRing(clothing: unknown): boolean {
  if (!clothing || typeof clothing !== "object") return false;
  return (clothing as Record<string, unknown>).gifted_ring === true;
}

export type SocialPromptAdminAggregate = {
  cohortCloudSaves: number;
  cohortNote: string;
  taskCounts: {
    signUp: number;
    emailClaimed: number;
    instagram: number;
    reddit: number;
    bothSocial: number;
    eitherSocial: number;
    playlightDiscover: number;
    atLeastOneInvite: number;
    inviteCap10: number;
  };
  taskPct: Record<
    | "signUp"
    | "emailClaimed"
    | "instagram"
    | "reddit"
    | "bothSocial"
    | "eitherSocial"
    | "playlightDiscover"
    | "atLeastOneInvite"
    | "inviteCap10",
    number
  >;
  exclusive: {
    pending: number;
    giftedRing: number;
    completeLogical: number;
    stepHistogram: Record<number, number>;
  };
};

function pct(count: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.round((count / denom) * 10000) / 100;
}

const COHORT_NOTE =
  "Based on cloud saves returned by the admin API (recent activity window and row cap). Not full census.";

export function aggregateSocialPromptFromSaves(
  saves: ReadonlyArray<{
    user_id: string | null | undefined;
    game_state?: LooseGameState | null;
  }>,
): SocialPromptAdminAggregate {
  const cloud = saves.filter(
    (s) => s.user_id != null && String(s.user_id).length > 0,
  );
  const n = cloud.length;

  const taskCounts = {
    signUp: 0,
    emailClaimed: 0,
    instagram: 0,
    reddit: 0,
    bothSocial: 0,
    eitherSocial: 0,
    playlightDiscover: 0,
    atLeastOneInvite: 0,
    inviteCap10: 0,
  };

  const stepHistogram: Record<number, number> = {};
  for (let i = 0; i <= SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL; i++) {
    stepHistogram[i] = 0;
  }

  let pending = 0;
  let giftedRing = 0;
  let completeLogical = 0;

  for (const row of cloud) {
    const gs = row.game_state ?? {};
    if (isSignUpRewardsStepDoneFromSave(gs)) taskCounts.signUp++;
    if (isTruthyClaimed(gs.social_media_rewards, MARKETING_EMAIL_REWARD_KEY)) {
      taskCounts.emailClaimed++;
    }
    const ig = isTruthyClaimed(gs.social_media_rewards, "instagram");
    const rd = isTruthyClaimed(gs.social_media_rewards, "reddit");
    if (ig) taskCounts.instagram++;
    if (rd) taskCounts.reddit++;
    if (ig && rd) taskCounts.bothSocial++;
    if (ig || rd) taskCounts.eitherSocial++;
    if (
      isTruthyClaimed(gs.social_media_rewards, PLAYLIGHT_DISCOVER_REWARD_KEY)
    ) {
      taskCounts.playlightDiscover++;
    }
    if (isExclusiveInviteStepDoneFromSave(gs)) taskCounts.atLeastOneInvite++;
    const rc =
      typeof gs.referralCount === "number" && Number.isFinite(gs.referralCount)
        ? Math.max(0, Math.floor(gs.referralCount))
        : 0;
    if (rc >= 10) taskCounts.inviteCap10++;

    if (gs.socialPromoExclusiveRewardPending === true) pending++;
    if (clothingGiftedRing(gs.clothing)) giftedRing++;
    if (isSocialPromoExclusiveCompleteFromSave(gs)) completeLogical++;

    const steps = socialPromoExclusiveStepsCompletedFromSave(gs);
    const sk = Math.min(
      SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL,
      Math.max(0, steps),
    );
    stepHistogram[sk] = (stepHistogram[sk] ?? 0) + 1;
  }

  const taskPct = {
    signUp: pct(taskCounts.signUp, n),
    emailClaimed: pct(taskCounts.emailClaimed, n),
    instagram: pct(taskCounts.instagram, n),
    reddit: pct(taskCounts.reddit, n),
    bothSocial: pct(taskCounts.bothSocial, n),
    eitherSocial: pct(taskCounts.eitherSocial, n),
    playlightDiscover: pct(taskCounts.playlightDiscover, n),
    atLeastOneInvite: pct(taskCounts.atLeastOneInvite, n),
    inviteCap10: pct(taskCounts.inviteCap10, n),
  };

  return {
    cohortCloudSaves: n,
    cohortNote: COHORT_NOTE,
    taskCounts,
    taskPct,
    exclusive: {
      pending,
      giftedRing,
      completeLogical,
      stepHistogram,
    },
  };
}
