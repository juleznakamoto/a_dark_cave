import { GameState, REFERRAL_REWARD_GOLD } from "@shared/schema";
import { mergeReferralLists } from "@shared/referralMerge";
import { withInviteeReferralGold } from "@shared/referralReward";

/** Fields server referral processing may write onto a cloud save. */
export type ReferralOwnedCloudSlice = Pick<
  GameState,
  | "referrals"
  | "referralCount"
  | "referredUsers"
  | "referralProcessed"
  | "referralCode"
> & {
  resources?: Pick<GameState["resources"], "gold">;
  log?: GameState["log"];
};

export interface ReferralCloudRefreshPatch {
  changed: boolean;
  nextState: GameState;
}

function mergeReferralListsIntoLive(
  liveState: GameState,
  cloudState: Pick<GameState, "referrals" | "referralCount" | "referredUsers">,
): GameState {
  const localRefs = Array.isArray(liveState.referrals) ? liveState.referrals : [];
  const cloudRefs = Array.isArray(cloudState.referrals) ? cloudState.referrals : [];
  const { referrals, referralCount, referredUsers } = mergeReferralLists(
    localRefs,
    cloudRefs,
    {
      localReferralCount: liveState.referralCount ?? 0,
      cloudReferralCount: cloudState.referralCount ?? 0,
    },
  );

  const unchanged =
    referrals.length === localRefs.length &&
    (liveState.referralCount ?? 0) === referralCount &&
    localRefs.every(
      (entry, index) =>
        entry.userId === referrals[index]?.userId &&
        entry.claimed === referrals[index]?.claimed &&
        entry.timestamp === referrals[index]?.timestamp,
    );

  if (unchanged) return liveState;

  return {
    ...liveState,
    referrals,
    referralCount,
    referredUsers,
  };
}

/**
 * Merge referral-owned cloud fields into live state without replacing gameplay.
 * - Referrer: union-merge referral lists and claim unclaimed rows once
 * - Invitee: set referralProcessed/referralCode; grant REFERRAL_REWARD_GOLD once
 */
export function applyReferralCloudRefreshPatch(
  liveState: GameState,
  cloudState: ReferralOwnedCloudSlice,
): ReferralCloudRefreshPatch {
  let next = mergeReferralListsIntoLive(liveState, cloudState);
  let changed = next !== liveState;

  const cloudProcessed = cloudState.referralProcessed === true;
  const localProcessed = liveState.referralProcessed === true;

  if (cloudProcessed && !localProcessed) {
    next = withInviteeReferralGold(
      next,
      cloudState.referralCode ?? next.referralCode,
    );
    changed = true;
  } else if (
    cloudProcessed &&
    localProcessed &&
    cloudState.referralCode &&
    cloudState.referralCode !== next.referralCode
  ) {
    next = { ...next, referralCode: cloudState.referralCode };
    changed = true;
  }

  const referrals = Array.isArray(next.referrals) ? next.referrals : [];
  let goldGained = 0;
  const logEntries: GameState["log"] = [];
  const updatedReferrals = referrals.map((referral) => {
    if (referral.claimed) return referral;
    goldGained += REFERRAL_REWARD_GOLD;
    logEntries.push({
      id: `referral-claimed-${referral.userId}-${Date.now()}`,
      timestamp: Date.now(),
      message: `You invited someone new to this world! +${REFERRAL_REWARD_GOLD} Gold`,
      type: "system",
    });
    return { ...referral, claimed: true };
  });

  if (goldGained > 0) {
    next = {
      ...next,
      referrals: updatedReferrals,
      resources: {
        ...next.resources,
        gold: (next.resources?.gold ?? 0) + goldGained,
      },
      log: [...(next.log ?? []), ...logEntries].slice(-100),
    };
    changed = true;
  }

  return { changed, nextState: next };
}
