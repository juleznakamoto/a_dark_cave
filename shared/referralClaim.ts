import type { ReferralMergeEntry } from "./referralMerge";

export type ClaimReferralReason =
  | "invalid_referral_code"
  | "referrer_not_found"
  | "self_referral"
  | "referrer_limit_reached"
  | "already_processed"
  | "referrer_repaired"
  | "claim_error";

/** Slice returned by `claim_referral` for the signed-in user. */
export type ClaimReferralResult = {
  success: boolean;
  reason?: ClaimReferralReason | string;
  referralProcessed?: boolean;
  referralCode?: string;
  referrals?: ReferralMergeEntry[];
  referralCount?: number;
  referredUsers?: string[];
};
