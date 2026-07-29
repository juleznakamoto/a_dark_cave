import { createServerSupabaseClient } from './supabaseServerClient';
import { REFERRAL_REWARD_GOLD } from '@shared/schema';
import { resolveReferrerUserId } from './referralCodes';
import type { SupabaseClient } from '@supabase/supabase-js';

type ReferralEntry = { userId: string; claimed?: boolean; timestamp?: number };

const getSupabaseAdmin = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const supabaseUrl = isDev
    ? process.env.VITE_SUPABASE_URL_DEV
    : process.env.VITE_SUPABASE_URL_PROD;
  const supabaseServiceKey = isDev
    ? process.env.SUPABASE_SERVICE_ROLE_KEY_DEV
    : process.env.SUPABASE_SERVICE_ROLE_KEY_PROD;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin config not available');
  }

  return createServerSupabaseClient(supabaseUrl, supabaseServiceKey);
};

/**
 * Ensure the referrer’s referrals[] contains newUserId.
 * Does not grant gold. Used for first-time process and clobber repair.
 */
export async function ensureReferrerHasReferral(
  adminClient: SupabaseClient,
  referrerUserId: string,
  newUserId: string,
  opts?: { enforceLimit?: boolean; timestamp?: number },
): Promise<
  | { ok: true; alreadyPresent: boolean }
  | {
      ok: false;
      reason:
        | 'referrer_fetch_error'
        | 'referrer_no_save'
        | 'referrer_limit_reached'
        | 'referrer_update_error';
    }
> {
  const { data: referrerSave, error: referrerError } = await adminClient
    .from('game_saves')
    .select('game_state')
    .eq('user_id', referrerUserId)
    .maybeSingle();

  if (referrerError) {
    return { ok: false, reason: 'referrer_fetch_error' };
  }

  if (!referrerSave || !referrerSave.game_state) {
    return { ok: false, reason: 'referrer_no_save' };
  }

  const referrerState = referrerSave.game_state;
  const referrals: ReferralEntry[] = Array.isArray(referrerState.referrals)
    ? referrerState.referrals
    : [];

  if (referrals.some((r) => r.userId === newUserId)) {
    return { ok: true, alreadyPresent: true };
  }

  if (opts?.enforceLimit !== false && referrals.length >= 10) {
    return { ok: false, reason: 'referrer_limit_reached' };
  }

  const updatedReferrerState = {
    ...referrerState,
    referrals: [
      ...referrals,
      {
        userId: newUserId,
        claimed: false,
        timestamp: opts?.timestamp ?? Date.now(),
      },
    ],
    referralCount: Math.max(
      typeof referrerState.referralCount === 'number'
        ? referrerState.referralCount
        : 0,
      referrals.length + 1,
    ),
  };

  const { error: referrerUpdateError } = await adminClient
    .from('game_saves')
    .update({
      game_state: updatedReferrerState,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', referrerUserId);

  if (referrerUpdateError) {
    return { ok: false, reason: 'referrer_update_error' };
  }

  return { ok: true, alreadyPresent: false };
}

export async function processReferral(newUserId: string, referralCode: string) {
  const adminClient = getSupabaseAdmin();

  const resolved = await resolveReferrerUserId(adminClient, referralCode);
  if ('error' in resolved) {
    if (resolved.error === 'invalid_code') {
      return { success: false, reason: 'invalid_referral_code' };
    }
    if (resolved.error === 'referrer_not_found') {
      return { success: false, reason: 'referrer_no_save' };
    }
    return { success: false, reason: 'referrer_fetch_error' };
  }

  const referrerUserId = resolved.userId;
  const storedReferralCode = referralCode.trim();

  // Prevent self-referral
  if (newUserId === referrerUserId) {
    return { success: false, reason: 'self_referral' };
  }

  // Check if referral has already been processed on the new user
  const { data: newUserSave } = await adminClient
    .from('game_saves')
    .select('game_state')
    .eq('user_id', newUserId)
    .maybeSingle();

  if (newUserSave?.game_state?.referralProcessed) {
    // New user already got invite gold; still repair referrer list if a later
    // full-replace wiped the entry (do not enforce the 10-cap on repair).
    const repair = await ensureReferrerHasReferral(
      adminClient,
      referrerUserId,
      newUserId,
      { enforceLimit: false },
    );
    if (!repair.ok) {
      return { success: false, reason: repair.reason };
    }
    return {
      success: true,
      reason: repair.alreadyPresent ? 'already_processed' : 'referrer_repaired',
    };
  }

  const ensure = await ensureReferrerHasReferral(
    adminClient,
    referrerUserId,
    newUserId,
    { enforceLimit: true },
  );
  if (!ensure.ok) {
    return { success: false, reason: ensure.reason };
  }
  if (ensure.alreadyPresent) {
    // Referrer already has them; still mark new user processed + grant gold below
    // only if not already processed (handled above). Fall through.
  }

  // Update new user's game state
  const initialGameState = newUserSave?.game_state || {
    resources: { gold: 0, wood: 0, stone: 0, food: 0 },
    flags: {},
    stats: {},
    buildings: {},
    villagers: {},
    tools: {},
    weapons: {},
    clothing: {},
    relics: {},
    blessings: {},
    schematics: {},
    books: {},
    story: { seen: {} },
    events: {},
    current_population: 0,
    total_population: 0,
    playTime: 0,
    isNewGame: true,
    startTime: Date.now(),
  };

  const oldNewUserGold = initialGameState.resources?.gold || 0;
  const newNewUserGold = oldNewUserGold + REFERRAL_REWARD_GOLD;

  const updatedUserState = {
    ...initialGameState,
    resources: {
      ...initialGameState.resources,
      gold: newNewUserGold,
    },
    referralCode: storedReferralCode,
    referralProcessed: true,
    log: [
      ...(initialGameState.log || []),
      {
        id: `referral-bonus-new-${Date.now()}`,
        message: `You were invited by someone to this world! +${REFERRAL_REWARD_GOLD} Gold`,
        timestamp: Date.now(),
        type: "system",
      }
    ].slice(-100),
  };

  // Use upsert for new user since they might not have a save yet
  const { error: newUserUpdateError } = await adminClient
    .from('game_saves')
    .upsert({
      user_id: newUserId,
      game_state: updatedUserState,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (newUserUpdateError) {
    return { success: false, reason: 'new_user_update_error' };
  }

  return { success: true };
}
