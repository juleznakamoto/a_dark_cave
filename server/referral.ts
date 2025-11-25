
import { createClient } from '@supabase/supabase-js';

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

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function processReferral(newUserId: string, referralCode: string) {
  const adminClient = getSupabaseAdmin();

  console.log('[REFERRAL] Server-side processing:', { newUserId, referralCode });

  // Prevent self-referral
  if (newUserId === referralCode) {
    console.warn('[REFERRAL] Self-referral attempt blocked');
    return { success: false, reason: 'self_referral' };
  }

  // Check if referral has already been processed
  const { data: newUserSave } = await adminClient
    .from('game_saves')
    .select('game_state')
    .eq('user_id', newUserId)
    .maybeSingle();

  if (newUserSave?.game_state?.referralProcessed) {
    console.log('[REFERRAL] Already processed for this user');
    return { success: false, reason: 'already_processed' };
  }

  // Fetch referrer's game save (bypasses RLS)
  const { data: referrerSave, error: referrerError } = await adminClient
    .from('game_saves')
    .select('game_state')
    .eq('user_id', referralCode)
    .maybeSingle();

  if (referrerError) {
    console.error('[REFERRAL] Error fetching referrer:', referrerError);
    return { success: false, reason: 'referrer_fetch_error' };
  }

  if (!referrerSave || !referrerSave.game_state) {
    console.warn('[REFERRAL] Referrer has no game save yet');
    return { success: false, reason: 'referrer_no_save' };
  }

  const referrerState = referrerSave.game_state;
  const referrals = referrerState.referrals || [];
  const referralCount = referrals.length;

  if (referralCount >= 10) {
    console.warn('[REFERRAL] Referrer reached limit');
    return { success: false, reason: 'referrer_limit_reached' };
  }

  // Check if this user was already referred
  if (referrals.some(r => r.userId === newUserId)) {
    console.warn('[REFERRAL] User already referred');
    return { success: false, reason: 'already_referred' };
  }

  // Update referrer's game state - add unclaimed referral
  const updatedReferrerState = {
    ...referrerState,
    referrals: [
      ...referrals,
      {
        userId: newUserId,
        claimed: false,
        timestamp: Date.now(),
      }
    ],
  };
  
  console.log('[REFERRAL] 📦 Added unclaimed referral for referrer:', {
    referrerId: referralCode.substring(0, 8),
    totalReferrals: updatedReferrerState.referrals.length,
    unclaimedCount: updatedReferrerState.referrals.filter(r => !r.claimed).length,
  });

  console.log('[REFERRAL] 💾 Updating referrer in database...');
  const { error: referrerUpdateError } = await adminClient
    .from('game_saves')
    .update({
      game_state: updatedReferrerState,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', referralCode);

  if (referrerUpdateError) {
    console.error('[REFERRAL] ❌ Error updating referrer:', referrerUpdateError);
    return { success: false, reason: 'referrer_update_error' };
  }
  console.log('[REFERRAL] ✅ Referrer updated in database successfully');

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
  const newNewUserGold = oldNewUserGold + 100;
  console.log('[REFERRAL] 💰 NEW USER Gold Update:', {
    newUserId: newUserId.substring(0, 8),
    oldGold: oldNewUserGold,
    newGold: newNewUserGold,
    difference: 100
  });

  const updatedUserState = {
    ...initialGameState,
    resources: {
      ...initialGameState.resources,
      gold: newNewUserGold,
    },
    referralCode: referralCode,
    referralProcessed: true,
    log: [
      ...(initialGameState.log || []),
      {
        id: `referral-bonus-new-${Date.now()}`,
        message: "You were invited by someone to this world! +100 Gold",
        timestamp: Date.now(),
        type: "system",
      }
    ].slice(-100),
  };
  
  console.log('[REFERRAL] 📦 Updated new user state resources:', updatedUserState.resources);

  // Use upsert for new user since they might not have a save yet
  console.log('[REFERRAL] 💾 Upserting new user in database...');
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
    console.error('[REFERRAL] ❌ Error updating new user:', newUserUpdateError);
    return { success: false, reason: 'new_user_update_error' };
  }
  console.log('[REFERRAL] ✅ New user upserted in database successfully');

  console.log('[REFERRAL] Success!', {
    referrerId: referralCode,
    newUserId,
    totalReferrals: updatedReferrerState.referrals.length
  });

  return { success: true };
}
