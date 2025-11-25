import { getSupabaseClient } from '@/lib/supabase';
import { GameState } from '@shared/schema';

export interface AuthUser {
  id: string;
  email: string;
}

export async function signUp(email: string, password: string, referralCode?: string) {
  const supabase = await getSupabaseClient();

  // Store referral code in user metadata - will be processed after email confirmation
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: referralCode ? {
      data: {
        referral_code: referralCode,
      }
    } : undefined,
  });

  if (error) throw error;

  if (data.user && referralCode) {
    console.log('[REFERRAL] Stored referral code in user metadata:', {
      newUserId: data.user.id,
      referralCode: referralCode,
      message: 'Referral will be processed after email confirmation'
    });
  }

  return data;
}

export async function processReferralAfterConfirmation(): Promise<void> {
  // Don't await - process in background without blocking game load
  processReferralInBackground().catch(error => {
    console.error('[REFERRAL] Background processing failed:', error);
  });
}

async function processReferralInBackground(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    console.log('[REFERRAL] No authenticated user, skipping referral processing');
    return;
  }

  const supabase = await getSupabaseClient();

  // Get user metadata
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.user_metadata?.referral_code) {
    console.log('[REFERRAL] No referral code in user metadata');
    return; // No referral code to process
  }

  const referralCode = authUser.user_metadata.referral_code;

  // Check if referral has already been processed
  const { data: existingSave } = await supabase
    .from('game_saves')
    .select('game_state')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingSave?.game_state?.referralProcessed) {
    console.log('[REFERRAL] Referral already processed for user:', user.id);
    return; // Already processed
  }

  console.log('[REFERRAL] Starting referral processing:', {
    newUserId: user.id.substring(0, 8) + '...',
    referralCode: referralCode.substring(0, 8) + '...',
    timestamp: new Date().toISOString()
  });

  // Wait a bit for server to be fully ready (especially in dev with HMR)
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('[REFERRAL] Initial delay complete, starting API calls');

  // Add retry logic with longer delays for dev environment
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    try {
      console.log(`[REFERRAL] Attempt ${attempts + 1}: Fetching /api/referral/process...`);
      
      const response = await fetch('/api/referral/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newUserId: user.id,
          referralCode: referralCode,
        }),
      });

      console.log(`[REFERRAL] Response status: ${response.status}`);
      const contentType = response.headers.get('content-type');
      console.log(`[REFERRAL] Content-Type: ${contentType}`);

      // Check if we got HTML instead of JSON (server not ready or Vite middleware caught it)
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error(`[REFERRAL] ❌ Server returned HTML instead of JSON. This likely means:`);
        console.error(`  1. The Express route is not being matched`);
        console.error(`  2. Vite's SPA fallback is catching the request`);
        console.error(`  3. Server is still starting up (HMR)`);
        console.log(`[REFERRAL] First 200 chars of response:`, textResponse.substring(0, 200));
        throw new Error(`Server returned ${contentType || 'HTML'} instead of JSON - API route not matched`);
      }

      const result = await response.json();
      console.log(`[REFERRAL] ✓ Parsed JSON response:`, result);

      if (!response.ok) {
        console.error('[REFERRAL] Server error:', result.error);
        return;
      }

      if (result.success) {
        console.log('[REFERRAL] ✓ Referral successfully processed on server!');
        console.log('[REFERRAL] Please refresh the page to see your referral rewards (100 Gold bonus)');
      } else {
        console.warn('[REFERRAL] Processing skipped:', result.reason);
      }
      
      // Success - exit retry loop
      return;
    } catch (fetchError) {
      attempts++;
      console.error(`[REFERRAL] Attempt ${attempts} error:`, fetchError);
      if (attempts >= maxAttempts) {
        console.error('[REFERRAL] All retry attempts failed:', fetchError);
        return;
      }
      const delay = Math.min(1000 * Math.pow(2, attempts), 10000); // Exponential backoff, max 10s
      console.warn(`[REFERRAL] Attempt ${attempts} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function signIn(email: string, password: string) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Check if email is confirmed
  if (data.user && !data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
  }

  return data;
}

export async function signOut() {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    if (!user) return null;

    // Only return user if email is confirmed
    if (!user.email_confirmed_at) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (error) {
    console.warn('Failed to get current user:', error);
    return null;
  }
}

export async function resetPassword(email: string) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://a-dark-cave.com/reset-password',
  });

  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
}

export async function saveGameToSupabase(
  stateDiff: Partial<GameState>,
  playTime?: number,
  isNewGame: boolean = false,
  clickData: Record<string, number> | null = null,
  clearClicks: boolean = false
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Deep clone and sanitize the diff to remove non-serializable data
  const sanitizedDiff = JSON.parse(JSON.stringify(stateDiff));

  const supabase = await getSupabaseClient();

  // Check existing save's playtime before overwriting
  const { data: existingSave } = await supabase
    .from('game_saves')
    .select('game_state')
    .eq('user_id', user.id)
    .single();

  // Merge diff with existing state
  let finalState: any;
  if (existingSave?.game_state) {
    const existingPlayTime = existingSave.game_state.playTime || 0;

    if (!isNewGame && playTime < existingPlayTime) {
      if (import.meta.env.DEV) {
        console.log('Skipping cloud save: existing save has higher playtime', {
          existingPlayTime,
          currentPlayTime: playTime,
          isNewGame
        });
      }
      return; // Don't overwrite
    }

    // Merge diff into existing state
    finalState = { ...existingSave.game_state, ...sanitizedDiff };
  } else {
    // No existing save, use diff as complete state
    finalState = sanitizedDiff;
  }

  // Call the combined save function - single database call
  // Ensure clickAnalytics is either a valid object with data or null
  const analyticsParam = clickData && Object.keys(clickData).length > 0
    ? clickData
    : null;

  if (import.meta.env.DEV) {
    console.log('Saving to Supabase:', {
      hasClickAnalytics: !!analyticsParam,
      clickAnalyticsKeys: analyticsParam ? Object.keys(analyticsParam) : [],
      diffSize: JSON.stringify(sanitizedDiff).length,
      finalStateSize: JSON.stringify(finalState).length
    });
  }

  const { error } = await supabase.rpc('save_game_with_analytics', {
    p_user_id: user.id,
    p_game_state_diff: sanitizedDiff,
    p_click_analytics: analyticsParam,
    p_clear_clicks: clearClicks,
  });

  if (error) {
    console.error('Failed to save game to Supabase:', error);
    throw error;
  }
}

export async function loadGameFromSupabase(): Promise<GameState | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('game_saves')
    .select('game_state')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No save found
    throw error;
  }

  return data?.game_state || null;
}