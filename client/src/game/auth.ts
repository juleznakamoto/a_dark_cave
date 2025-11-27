import { getSupabaseClient } from '@/lib/supabase';
import { GameState } from '@shared/schema';
import { logger } from '@/lib/logger';

const isDev = import.meta.env.DEV;

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

  return data;
}

export async function processReferralAfterConfirmation(): Promise<void> {
  // Don't await - process in background without blocking game load
  processReferralInBackground().catch(error => {
    logger.error('[REFERRAL] Background processing failed:', error);
  });
}

async function processReferralInBackground(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  const supabase = await getSupabaseClient();

  // Get user metadata
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.user_metadata?.referral_code) {
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
    return; // Already processed
  }

  // Wait a bit for server to be fully ready (especially in dev with HMR)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Add retry logic with longer delays for dev environment
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
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

      const contentType = response.headers.get('content-type');

      // Check if we got HTML instead of JSON (server not ready or Vite middleware caught it)
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned ${contentType || 'HTML'} instead of JSON - API route not matched`);
      }

      const result = await response.json();

      if (!response.ok) {
        return;
      }

      // Stop retrying if already processed or successful
      if (result.success || result.reason === 'already_processed') {
        // Load fresh state from Supabase and update game state directly
        try {
          const freshState = await loadGameFromSupabase();
          if (freshState) {
            // Update the game state directly
            const { useGameStore } = await import('./state');
            const currentState = useGameStore.getState();

            // Merge the fresh state while preserving UI state
            useGameStore.setState({
              ...freshState,
              // Preserve UI-only state
              activeTab: currentState.activeTab,
              hoveredTooltips: currentState.hoveredTooltips,
              isGameLoopActive: currentState.isGameLoopActive,
              isPaused: currentState.isPaused,
              loopProgress: currentState.loopProgress,
            });

            // Also update local IndexedDB
            const { openDB } = await import('idb');
            const db = await openDB('ADarkCaveDB', 2);
            await db.put('saves', {
              gameState: freshState,
              timestamp: Date.now(),
              playTime: freshState.playTime || 0,
            }, 'mainSave');
            await db.put('lastCloudState', freshState, 'lastCloudState');
          }
        } catch (error) {
          logger.error('Failed to update game state:', error);
        }
        return; // Stop retrying after success or already_processed
      }

      // If we got here, retry with exponential backoff
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
      }
    } catch (error) {
      logger.error('Failed to process referral after confirmation:', error);
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
      }
    }
  }

  const isNewGame = gameState.isNewGame || false;
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
  logger.log('[AUTH] 🚪 Signing out user...');
  
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.error('[AUTH] ❌ Sign out failed:', error);
    throw error;
  }

  logger.log('[AUTH] ✅ User signed out from Supabase');

  // Delete local save from IndexedDB
  try {
    const { deleteSave } = await import('./save');
    await deleteSave();
    logger.log('[AUTH] 🗑️ Local save deleted from IndexedDB');
  } catch (deleteError) {
    logger.error('[AUTH] ⚠️ Failed to delete local save:', deleteError);
  }

  // Stop the game loop
  try {
    const { stopGameLoop } = await import('./loop');
    stopGameLoop();
    logger.log('[AUTH] ⏹️ Game loop stopped');
  } catch (loopError) {
    logger.error('[AUTH] ⚠️ Failed to stop game loop:', loopError);
  }

  // Reload to start screen
  logger.log('[AUTH] 🔄 Reloading to start screen...');
  window.location.href = '/';
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
    logger.warn('Failed to get current user:', error);
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
  if (!user) {
    logger.log('[SAVE CLOUD] ❌ Not authenticated');
    throw new Error('Not authenticated');
  }

  logger.log('[SAVE CLOUD] 🔍 Starting cloud save with OCC...', {
    playTime,
    isNewGame,
    userId: user.id.substring(0, 8) + '...',
    diffKeys: Object.keys(stateDiff),
    hasPlayTime: 'playTime' in stateDiff
  });

  // Deep clone and sanitize the diff to remove non-serializable data
  const sanitizedDiff = JSON.parse(JSON.stringify(stateDiff));

  const supabase = await getSupabaseClient();

  // Ensure clickAnalytics is either a valid object with data or null
  const analyticsParam = clickData && Object.keys(clickData).length > 0
    ? clickData
    : null;

  logger.log('[SAVE CLOUD] 💾 Calling database RPC with OCC validation...', {
    hasClickAnalytics: !!analyticsParam,
    clickAnalyticsKeys: analyticsParam ? Object.keys(analyticsParam) : [],
    diffSize: JSON.stringify(sanitizedDiff).length,
    playTime,
    isNewGame,
    clearClicks
  });

  // OCC: Single atomic database call - the RPC function handles:
  // 1. Reading current state
  // 2. Validating playTime is strictly greater
  // 3. Merging diff with existing state
  // 4. Writing merged state
  // All in one transaction - prevents race conditions
  const { error } = await supabase.rpc('save_game_with_analytics', {
    p_user_id: user.id,
    p_game_state_diff: sanitizedDiff,
    p_click_analytics: analyticsParam,
    p_clear_clicks: clearClicks,
  });

  if (error) {
    // Check if it's an OCC violation
    if (error.message && error.message.includes('OCC violation')) {
      logger.warn('[SAVE CLOUD] ⚠️ OCC REJECTED by database:', error.message);
      throw new Error(`OCC violation: ${error.message}`);
    }
    
    logger.error('[SAVE CLOUD] ❌ Database write failed:', error);
    throw error;
  }

  logger.log('[SAVE CLOUD] ✅ Cloud save completed successfully - OCC check passed in database');
}

export async function loadGameFromSupabase(): Promise<GameState | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('game_saves')
    .select('game_state')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  logger.log('[LOAD CLOUD] 📊 Loaded from Supabase:', {
    hasData: !!data,
    hasReferrals: !!data?.game_state?.referrals,
    referralsCount: data?.game_state?.referrals?.length || 0,
    referrals: data?.game_state?.referrals,
  });

  return data?.game_state || null;
}