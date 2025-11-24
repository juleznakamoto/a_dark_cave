import { getSupabaseClient } from '@/lib/supabase';
import { GameState } from '@shared/schema';

export interface AuthUser {
  id: string;
  email: string;
}

export async function signUp(email: string, password: string, referralCode?: string) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  // If signup successful and referral code provided, process referral
  if (data.user && referralCode) {
    try {
      // Verify referrer exists and hasn't exceeded limit
      const { data: referrerData, error: referrerError } = await supabase
        .from('game_saves')
        .select('game_state')
        .eq('user_id', referralCode)
        .single();

      if (!referrerError && referrerData) {
        const referralCount = referrerData.game_state?.referralCount || 0;

        if (referralCount < 10) {
          // Add 100 gold to referrer's game state
          const referrerState = referrerData.game_state;
          const updatedReferrerState = {
            ...referrerState,
            resources: {
              ...referrerState.resources,
              gold: (referrerState.resources?.gold || 0) + 100,
            },
            referralCount: referralCount + 1,
            log: [
              ...(referrerState.log || []),
              {
                id: `referral-bonus-${Date.now()}`,
                message: "A friend joined using your invite link! You received 100 Gold as a reward.",
                timestamp: Date.now(),
                type: "system",
              }
            ].slice(-100), // Keep last 100 log entries
          };

          await supabase.from('game_saves').upsert({
            user_id: referralCode,
            game_state: updatedReferrerState,
            updated_at: new Date().toISOString(),
          });

          // Add 100 gold to new user's game state (or create initial state)
          const { data: newUserData } = await supabase
            .from('game_saves')
            .select('game_state')
            .eq('user_id', data.user.id)
            .single();

          const newUserState = newUserData?.game_state || {};
          const updatedNewUserState = {
            ...newUserState,
            resources: {
              ...(newUserState.resources || {}),
              gold: ((newUserState.resources?.gold || 0) + 100),
            },
            referralCode: referralCode,
            log: [
              ...(newUserState.log || []),
              {
                id: `referral-bonus-new-${Date.now()}`,
                message: "Welcome! You received 100 Gold as a referral bonus for joining through an invite link.",
                timestamp: Date.now(),
                type: "system",
              }
            ].slice(-100), // Keep last 100 log entries
          };

          await supabase.from('game_saves').upsert({
            user_id: data.user.id,
            game_state: updatedNewUserState,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (referralError) {
      console.error('Error processing referral:', referralError);
      // Don't fail signup if referral processing fails
    }
  }

  return data;
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