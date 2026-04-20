import { getSupabaseClient } from '@/lib/supabase';
import { apiUrl } from '@/lib/apiUrl';
import { GameState, SaveData } from '@shared/schema';
import { logger } from '@/lib/logger';
import type { AuthUser } from '@/game/types';

// Re-export AuthUser for convenience
export type { AuthUser } from '@/game/types';

/** Session key: pending marketing choice from signup (email or Google) until first authenticated session. */
export const PENDING_MARKETING_OPT_IN_KEY = 'adc_pending_marketing_opt_in';

export type PendingMarketingPayload = {
  optIn: boolean;
  google: boolean;
  ts: number;
};

export function setPendingMarketingOptInFromSignup(
  optIn: boolean,
  google: boolean,
): void {
  try {
    const payload: PendingMarketingPayload = {
      optIn: optIn === true,
      google,
      ts: Date.now(),
    };
    sessionStorage.setItem(PENDING_MARKETING_OPT_IN_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** After email confirmation or OAuth, persist marketing row once (same API as settings toggle). */
export async function flushPendingMarketingPreferences(): Promise<void> {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PENDING_MARKETING_OPT_IN_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let parsed: PendingMarketingPayload | null = null;
  try {
    parsed = JSON.parse(raw) as PendingMarketingPayload;
  } catch {
    return;
  }

  const supabase = await getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  const consentSource = parsed.google ? 'google_signup' : 'email_signup';

  try {
    const res = await fetch(apiUrl('/api/marketing/preferences'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        marketing_opt_in: parsed.optIn === true,
        consent_source: consentSource,
        consent_text_version: 1,
        prompt_version: 1,
      }),
    });
    if (res.ok) {
      sessionStorage.removeItem(PENDING_MARKETING_OPT_IN_KEY);
    } else {
      const errBody = await res.json().catch(() => ({}));
      logger.warn('[MARKETING] flush pending failed:', res.status, errBody);
    }
  } catch (e) {
    logger.warn('[MARKETING] flush pending failed:', e);
  }
}

export async function signUp(
  email: string,
  password: string,
  referralCode?: string,
  marketingOptIn?: boolean,
) {
  const supabase = await getSupabaseClient();

  // Store referral code in user metadata - will be processed after email confirmation
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(referralCode ? {
        data: {
          referral_code: referralCode,
        }
      } : {}),
      emailRedirectTo: window.location.origin + '/?email_confirmed=true',
    },
  });

  if (error) throw error;

  // Persisted on first confirmed session via flushPendingMarketingPreferences()
  setPendingMarketingOptInFromSignup(marketingOptIn === true, false);

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
      const response = await fetch(apiUrl('/api/referral/process'), {
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
          const freshStateData = await loadGameFromSupabase(); // This now returns SaveData | null
          if (freshStateData) {
            // Update the game state directly
            const { useGameStore } = await import('./state');
            const currentState = useGameStore.getState();

            // Merge the fresh state while preserving UI state
            useGameStore.setState({
              ...freshStateData.gameState, // Use the extracted gameState
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
              gameState: freshStateData.gameState, // Use the extracted gameState
              timestamp: freshStateData.timestamp,
              playTime: freshStateData.playTime || 0,
            }, 'mainSave');
            await db.put('lastCloudState', freshStateData.gameState, 'lastCloudState'); // Store only gameState in lastCloudState
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

  // Don't set isNewGame or allowPlayTimeOverwrite for referral processing
  // This is not a new game, just a state update
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

  await flushPendingMarketingPreferences();

  return data;
}

export async function signInWithGoogle(opts?: {
  signupFlow?: boolean;
  marketingOptIn?: boolean;
}) {
  if (opts?.signupFlow) {
    setPendingMarketingOptInFromSignup(opts.marketingOptIn === true, true);
  }

  const supabase = await getSupabaseClient();

  // Determine the correct redirect URL based on environment
  const redirectTo = window.location.origin + '/?game=true';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });

  if (error) throw error;
  return data;
}

/** Permanently deletes the Supabase user and their cloud game_saves row; clears local save and session. */
export async function deleteAccount(): Promise<void> {
  const supabase = await getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in");
  }

  const res = await fetch(apiUrl("/api/account/delete"), {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : "Account deletion failed",
    );
  }

  const { deleteSave } = await import("./save");
  await deleteSave();

  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.warn("[AUTH] signOut after account delete:", error);
  }

  try {
    const { openDB } = await import("idb");
    const db = await openDB("ADarkCaveDB", 2);
    await db.delete("lastCloudState", "lastCloudState");
  } catch {
    /* ignore */
  }

  try {
    const { stopGameLoop } = await import("./loop");
    stopGameLoop();
  } catch {
    /* ignore */
  }
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

  // PRESERVE local save - only clear lastCloudState to allow fresh sync on next login
  try {
    const { openDB } = await import('idb');
    const db = await openDB('ADarkCaveDB', 2);
    await db.delete('lastCloudState', 'lastCloudState');
    logger.log('[AUTH] 🔄 Cleared cloud sync state (local save preserved)');
  } catch (clearError) {
    logger.error('[AUTH] ⚠️ Failed to clear cloud sync state:', clearError);
  }

  // Stop the game loop
  try {
    const { stopGameLoop } = await import('./loop');
    stopGameLoop();
    logger.log('[AUTH] ⏹️ Game loop stopped');
  } catch (loopError) {
    logger.error('[AUTH] ⚠️ Failed to stop game loop:', loopError);
  }

  // Note: No reload needed - the calling component will reset game state
  logger.log('[AUTH] ✅ Sign out complete - ready for state reset');
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { getCachedAuthUser, isAuthStateReady } = await import('@/lib/supabase');

    // Wait for auth state to be initialized
    if (!isAuthStateReady()) {
      // Fallback to API call if cache not ready yet
      const supabase = await getSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user || !user.email_confirmed_at) {
        return null;
      }

      return {
        id: user.id,
        email: user.email || '',
      };
    }

    // Use cached auth state - no API call needed!
    const user = getCachedAuthUser();

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
  gameState: Partial<GameState>,
  playTime?: number,
  isNewGame: boolean = false,
  clickAnalytics: Record<string, number> | null = null,
  resourceAnalytics: Record<string, number> | null = null,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    logger.log('[SAVE CLOUD] ❌ Not authenticated');
    throw new Error('Not authenticated');
  }

  const allowOverwrite =
    gameState.allowPlayTimeOverwrite === true ||
    (gameState as Partial<GameState> & { allowPlaytimeOverwrite?: boolean })
      .allowPlaytimeOverwrite === true;

  // Debug: Log if this save includes cube completion events
  if (gameState.events) {
    const cubeEvents = Object.keys(gameState.events).filter(k => k.startsWith('cube'));
    if (cubeEvents.length > 0) {
      logger.log('[SAVE CLOUD] 🎮 Saving cube events:', cubeEvents, gameState.events);
      logger.log('[SAVE CLOUD] 📊 Game state includes:', {
        hasPlayTime: 'playTime' in gameState,
        hasStartTime: 'startTime' in gameState,
        hasGameId: 'gameId' in gameState,
        gameId: gameState.gameId,
        playTime: gameState.playTime,
        startTime: gameState.startTime,
      });
    }
  }

  logger.log('[SAVE CLOUD] 🔍 Starting cloud save (Edge save-game)...', {
    playTime,
    isNewGame,
    userId: user.id.substring(0, 8) + '...',
    diffKeys: Object.keys(gameState),
    hasPlayTime: 'playTime' in gameState,
    allowPlayTimeOverwrite: allowOverwrite
  });

  // Deep clone and sanitize the diff to remove non-serializable data
  const sanitizedDiff = JSON.parse(JSON.stringify(gameState)) as Partial<GameState>;
  if (playTime !== undefined) {
    sanitizedDiff.playTime = Math.floor(playTime);
  }

  if (
    !sanitizedDiff ||
    typeof sanitizedDiff !== 'object' ||
    Object.keys(sanitizedDiff).length === 0
  ) {
    throw new Error('saveGameToSupabase: empty gameState diff');
  }

  const supabase = await getSupabaseClient();

  const clickAnalyticsParam =
    clickAnalytics && Object.keys(clickAnalytics).length > 0
      ? clickAnalytics
      : null;

  const resourceAnalyticsParam =
    resourceAnalytics && Object.keys(resourceAnalytics).length > 0
      ? resourceAnalytics
      : null;

  logger.log('[SAVE CLOUD] 💾 Invoking save-game Edge Function...', {
    hasClickAnalytics: !!clickAnalyticsParam,
    clickAnalyticsKeys: clickAnalyticsParam ? Object.keys(clickAnalyticsParam) : [],
    hasResourceAnalytics: !!resourceAnalyticsParam,
    resourceAnalyticsKeys: resourceAnalyticsParam ? Object.keys(resourceAnalyticsParam) : [],
    diffSize: JSON.stringify(sanitizedDiff).length,
    playTime,
    isNewGame,
    allowOverwrite
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }

  const { data, error } = await supabase.functions.invoke('save-game', {
    body: {
      gameStateDiff: sanitizedDiff,
      clickAnalytics: clickAnalyticsParam,
      resourceAnalytics: resourceAnalyticsParam,
      clearAnalytics: isNewGame,
      allowPlaytimeOverwrite: allowOverwrite,
    },
  });

  if (error) {
    const msg = error.message || String(error);
    if (msg.includes('OCC violation')) {
      logger.warn('[SAVE CLOUD] ⚠️ OCC REJECTED:', msg);
      throw new Error(`OCC violation: ${msg}`);
    }
    logger.error('[SAVE CLOUD] ❌ Edge Function save failed:', error);
    throw error;
  }

  logger.log('[SAVE CLOUD] ✅ Cloud save completed (Edge)', data ? { response: data } : '');
}

export async function loadGameFromSupabase(): Promise<SaveData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('game_saves')
    .select('game_state, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.game_state) {
    logger.log('[LOAD CLOUD] 📊 No cloud save found');
    return null;
  }

  // Extract playTime from the game_state
  const playTime = data.game_state.playTime || 0;
  const timestamp = data.updated_at ? new Date(data.updated_at).getTime() : Date.now();

  logger.log('[LOAD CLOUD] 📊 Loaded from Supabase:', {
    hasData: !!data,
    hasReferrals: !!data?.game_state?.referrals,
    referralsCount: data?.game_state?.referrals?.length || 0,
    referrals: data?.game_state?.referrals,
    playTime,
    playTimeMinutes: (playTime / 1000 / 60).toFixed(2),
    timestamp,
  });

  // Return SaveData structure
  return {
    gameState: data.game_state,
    playTime,
    timestamp,
  };
}

// Helper function to save the username to Supabase
export async function saveUsernameToSupabase(username: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from('profiles') // Assuming 'profiles' table stores user profiles including username
    .upsert(
      {
        id: user.id, // Use Supabase user ID as the primary key for profiles
        username: username,
      },
      { onConflict: 'id' }
    );

  if (error) {
    logger.error('[USERNAME SAVE] ❌ Database write failed:', error);
    throw error;
  }

  logger.log('[USERNAME SAVE] ✅ Username saved successfully');
}

// Helper function to load the username from Supabase
export async function loadUsernameFromSupabase(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (error) {
    logger.error('[USERNAME LOAD] ❌ Database read failed:', error);
    throw error;
  }

  return data?.username || null;
}


// This is a placeholder and might need to be integrated with your actual SaveData structure
// if you are storing username directly within game_saves.
async function updateGameSaveWithUsername(gameState: Partial<GameState>) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const supabase = await getSupabaseClient();
  const tableName = 'game_saves'; // Assuming 'game_saves' is the table for game states

  // Check if username exists in gameState, otherwise load it
  const usernameToSave = gameState.username || await loadUsernameFromSupabase();

  // Ensure username is handled correctly, potentially masking email if username is not set
  let finalUsername = usernameToSave;
  if (!finalUsername) {
    const currentUser = await supabase.auth.getUser();
    if (currentUser.data.user?.email) {
      const email = currentUser.data.user.email;
      finalUsername = email.substring(0, 3) + '***' + email.substring(email.length - 3);
    }
  }

  // If username is still null or empty, do not save it.
  // The server-side logic should handle the masking of emails if no username is provided.
  if (!finalUsername) {
    logger.warn('[SAVE GAME] ⚠️ No username found to save in game_saves.');
    // Continue to save without username, relying on server-side email masking.
  }


  const { error } = await supabase
    .from(tableName)
    .upsert(
      {
        user_id: user.id,
        game_state: { ...gameState, username: finalUsername }, // Include username in game_state
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    logger.error('[SAVE GAME] ❌ Database write failed:', error);
    throw error;
  }

  logger.log('[SAVE GAME] ✅ Game saved successfully with username');
}