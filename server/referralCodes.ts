import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateReferralCode,
  isUuidReferralCode,
  normalizeReferralCode,
} from "@shared/referralCode";

export type ResolveReferrerResult =
  | { userId: string }
  | { error: "invalid_code" | "referrer_not_found" | "referrer_fetch_error" };

export async function resolveReferrerUserId(
  adminClient: SupabaseClient,
  referralCode: string,
): Promise<ResolveReferrerResult> {
  const trimmed = referralCode.trim();
  if (!trimmed) {
    return { error: "invalid_code" };
  }

  if (isUuidReferralCode(trimmed)) {
    return { userId: trimmed };
  }

  const normalized = normalizeReferralCode(trimmed);
  if (!normalized) {
    return { error: "invalid_code" };
  }

  const { data, error } = await adminClient
    .from("referral_codes")
    .select("user_id")
    .eq("code", normalized)
    .maybeSingle();

  if (error) {
    return { error: "referrer_fetch_error" };
  }

  if (!data?.user_id) {
    return { error: "referrer_not_found" };
  }

  return { userId: data.user_id as string };
}

const UNIQUE_VIOLATION = "23505";

export async function getOrCreateReferralCode(
  adminClient: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: existing, error: fetchError } = await adminClient
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing?.code) {
    return existing.code as string;
  }

  const maxAttempts = 25;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateReferralCode();
    const { data, error } = await adminClient
      .from("referral_codes")
      .insert({ user_id: userId, code })
      .select("code")
      .maybeSingle();

    if (!error && data?.code) {
      return data.code as string;
    }

    if (error?.code === UNIQUE_VIOLATION) {
      const { data: raced } = await adminClient
        .from("referral_codes")
        .select("code")
        .eq("user_id", userId)
        .maybeSingle();
      if (raced?.code) {
        return raced.code as string;
      }
      continue;
    }

    if (error) {
      throw error;
    }
  }

  throw new Error("Failed to allocate referral code");
}
