import { parseRefParam } from "@shared/referralCode";
import { createServerSupabaseClient } from "./supabaseServerClient";
import type { ClaimReferralResult } from "@shared/referralClaim";

const getSupabaseAdmin = () => {
  const isDev = process.env.NODE_ENV === "development";
  const supabaseUrl = isDev
    ? process.env.VITE_SUPABASE_URL_DEV
    : process.env.VITE_SUPABASE_URL_PROD;
  const supabaseServiceKey = isDev
    ? process.env.SUPABASE_SERVICE_ROLE_KEY_DEV
    : process.env.SUPABASE_SERVICE_ROLE_KEY_PROD;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase admin config not available");
  }

  return createServerSupabaseClient(supabaseUrl, supabaseServiceKey);
};

function asClaimResult(data: unknown): ClaimReferralResult {
  if (!data || typeof data !== "object") {
    return { success: false, reason: "claim_error" };
  }
  const row = data as ClaimReferralResult;
  if (typeof row.success !== "boolean") {
    return { success: false, reason: "claim_error" };
  }
  return row;
}

/**
 * Claim or sync referrals for the signed-in user.
 * `referralCode` is optional: omit to project the ledger onto this user only.
 */
export async function processReferral(
  inviteeUserId: string,
  referralCode?: string | null,
): Promise<ClaimReferralResult> {
  const adminClient = getSupabaseAdmin();
  let code =
    typeof referralCode === "string" ? referralCode.trim() || null : null;
  if (!code) {
    const { data: authUser } = await adminClient.auth.admin.getUserById(
      inviteeUserId,
    );
    const meta =
      typeof authUser?.user?.user_metadata?.referral_code === "string"
        ? authUser.user.user_metadata.referral_code
        : null;
    code = parseRefParam(meta);
  }

  const { data, error } = await adminClient.rpc("claim_referral", {
    p_invitee_id: inviteeUserId,
    p_code: code,
  });

  if (error) {
    return { success: false, reason: "claim_error" };
  }

  return asClaimResult(data);
}
