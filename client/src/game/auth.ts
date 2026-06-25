import { getSupabaseClient, primeCachedAuthUser } from '@/lib/supabase';
import { apiUrl } from '@/lib/apiUrl';
import { GameState, SaveData, SIGN_UP_WELCOME_GOLD } from '@shared/schema';
import { logger } from '@/lib/logger';
import type { AuthUser } from '@/game/types';
import { parseRefParam } from '@shared/referralCode';
import type { LogEntry } from '@/game/rules/events';

function buildSignupWelcomeLogEntry(): LogEntry {
  const fallback = `You received ${SIGN_UP_WELCOME_GOLD} Gold as a welcome bonus for creating an account!`;
  return {
    id: `signup-welcome-gold-${Date.now()}`,
    timestamp: Date.now(),
    message: fallback,
    logKey: 'auth.signupWelcomeLog',
    logVars: { amount: SIGN_UP_WELCOME_GOLD },
    type: 'system',
  };
}

// Re-export AuthUser for convenience
export type { AuthUser } from '@/game/types';

/** Session key: pending marketing choice from signup (email or Google) until first authenticated session. */
export const PENDING_MARKETING_OPT_IN_KEY = 'adc_pending_marketing_opt_in';

/** Pending referrer code from `?ref=` (6-char or legacy UUID) for Google OAuth sign-up. */
export const PENDING_REFERRAL_CODE_KEY = 'adc_pending_referral_code';

/** Set when starting Google OAuth from Create Account — cleared after load (welcome gold is claimed in rewards dialog). */
export const PENDING_SIGNUP_WELCOME_KEY = 'adc_pending_signup_welcome_gold';

/** OAuth return: keep session pending only briefly (see `applySignupWelcomeBonusAfterOAuthLoad`). */
export const SIGNUP_WELCOME_NEW_ACCOUNT_MAX_MS = 15 * 60 * 1000;

/** Rewards-dialog claim window from auth `created_at` (does not rely on sessionStorage). */
export const SIGNUP_WELCOME_CLAIM_MAX_ACCOUNT_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Pending signup timestamp must align with auth `created_at` (email confirm can finish later). */
const SIGNUP_WELCOME_PENDING_MATCH_TOLERANCE_MS = 5 * 60 * 1000;

const PENDING_SIGNUP_WELCOME_STARTED_AT_KEY =
  "adc_pending_signup_welcome_started_at";

export function isAuthUserWithinSignupWelcomeWindow(
  createdAt: string | undefined | null,
  nowMs = Date.now(),
): boolean {
  if (!createdAt) return false;
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs <= SIGNUP_WELCOME_NEW_ACCOUNT_MAX_MS;
}

export function isAuthUserWithinSignupWelcomeClaimWindow(
  createdAt: string | undefined | null,
  nowMs = Date.now(),
): boolean {
  if (!createdAt) return false;
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs <= SIGNUP_WELCOME_CLAIM_MAX_ACCOUNT_AGE_MS;
}

function isSignupPendingAlignedWithAccountCreation(
  createdAt: string,
  pendingStartedAtMs: number,
): boolean {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  return (
    Math.abs(createdMs - pendingStartedAtMs) <=
    SIGNUP_WELCOME_PENDING_MATCH_TOLERANCE_MS
  );
}

/** Pure eligibility check (see {@link isSignupWelcomeGoldClaimEligible}). */
export function isAuthUserEligibleForSignupWelcomeClaim(
  createdAt: string | undefined | null,
  pendingStartedAtMs: number | null,
  nowMs = Date.now(),
): boolean {
  if (isAuthUserWithinSignupWelcomeClaimWindow(createdAt, nowMs)) return true;
  if (pendingStartedAtMs === null || !createdAt) return false;
  return isSignupPendingAlignedWithAccountCreation(
    createdAt,
    pendingStartedAtMs,
  );
}

function getPendingSignupWelcomeStartedAtMs(): number | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_WELCOME_STARTED_AT_KEY);
    if (!raw) return null;
    const ms = Number(raw);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

/** Call when the player starts account creation (email form or Google OAuth signup tab). */
export function markPendingSignupWelcomeFromSignupFlow(): void {
  try {
    const startedAt = Date.now();
    sessionStorage.setItem(PENDING_SIGNUP_WELCOME_KEY, "1");
    sessionStorage.setItem(
      PENDING_SIGNUP_WELCOME_STARTED_AT_KEY,
      String(startedAt),
    );
  } catch {
    /* ignore */
  }
}

function stashPendingSignupWelcomeForOAuth(): void {
  markPendingSignupWelcomeFromSignupFlow();
}

export function clearPendingSignupWelcome(): void {
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_WELCOME_KEY);
    sessionStorage.removeItem(PENDING_SIGNUP_WELCOME_STARTED_AT_KEY);
  } catch {
    /* ignore */
  }
}

/** Removes stale OAuth referral cookie before email/password signup so abandoned Google flows cannot attach `referral_code` wrongly. */
export function clearPendingReferralCode(): void {
  try {
    sessionStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
  } catch {
    /* ignore */
  }
}

function stashPendingReferralCodeForOAuth(referralCode: string | null | undefined): void {
  const parsed = parseRefParam(
    typeof referralCode === 'string' ? referralCode : null,
  );
  if (!parsed) return;
  try {
    sessionStorage.setItem(PENDING_REFERRAL_CODE_KEY, parsed);
  } catch {
    /* ignore */
  }
}

/**
 * Merge pending OAuth referral into Supabase `user_metadata.referral_code` before referral processing.
 * No-op if already set (email sign-up path) or user not signed in.
 */
export async function flushPendingReferralToUserMetadata(): Promise<void> {
  let pending: string | null = null;
  try {
    pending = sessionStorage.getItem(PENDING_REFERRAL_CODE_KEY);
  } catch {
    return;
  }
  const code = pending?.trim();
  if (!code) return;

  const supabase = await getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  const {
    data: { user: authUser },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !authUser?.id) return;

  const existing =
    typeof authUser.user_metadata?.referral_code === 'string'
      ? authUser.user_metadata.referral_code.trim()
      : '';
  if (existing) {
    clearPendingReferralCode();
    return;
  }

  const { error } = await supabase.auth.updateUser({
    data: { referral_code: code },
  });
  if (!error) {
    clearPendingReferralCode();
  } else {
    logger.warn('[REFERRAL] Pending referral metadata flush failed:', error);
  }
}

/** One-time welcome gold + persist (idempotent via `signupWelcomeGoldClaimed`). */
async function applySignupWelcomeGoldBonus(): Promise<boolean> {
  const { useGameStore } = await import("./state");
  const s = useGameStore.getState();
  if (s.signupWelcomeGoldClaimed) return false;

  s.updateResource("gold", SIGN_UP_WELCOME_GOLD);
  s.addLogEntry(buildSignupWelcomeLogEntry());
  useGameStore.setState({ signupWelcomeGoldClaimed: true });

  try {
    const { saveGame } = await import("./save");
    await saveGame(useGameStore.getState(), false);
  } catch (e) {
    logger.warn("[AUTH] signup welcome bonus save failed:", e);
  }

  const { syncSocialPromoExclusiveRewardPending } = await import(
    "./socialPromoExclusiveReward"
  );
  syncSocialPromoExclusiveRewardPending();
  return true;
}

/** Rewards dialog Claim — requires sign-in and a genuine new-account signup. */
export async function isSignupWelcomeGoldClaimEligible(): Promise<boolean> {
  const { useGameStore } = await import("./state");
  const s = useGameStore.getState();
  if (!s.isUserSignedIn || s.signupWelcomeGoldClaimed) return false;

  const supabase = await getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.created_at) return false;

  return isAuthUserEligibleForSignupWelcomeClaim(
    user.created_at,
    getPendingSignupWelcomeStartedAtMs(),
  );
}

/** Rewards dialog Claim — requires an active signed-in session. */
export async function claimSignupWelcomeGold(): Promise<boolean> {
  if (!(await isSignupWelcomeGoldClaimEligible())) return false;
  const granted = await applySignupWelcomeGoldBonus();
  if (granted) clearPendingSignupWelcome();
  return granted;
}

/**
 * After game state is in the store: drop stale OAuth signup pending for existing accounts.
 * New accounts keep pending so email-style delayed claims still work via timestamp alignment.
 */
export async function applySignupWelcomeBonusAfterOAuthLoad(): Promise<void> {
  try {
    if (sessionStorage.getItem(PENDING_SIGNUP_WELCOME_KEY) !== "1") return;
  } catch {
    return;
  }

  const loggedIn = await getCurrentUser();
  if (!loggedIn) return;

  const supabase = await getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.created_at) return;

  if (!isAuthUserWithinSignupWelcomeWindow(user.created_at)) {
    clearPendingSignupWelcome();
  }
}

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

  const user = await getCurrentUser();
  if (!user) return;

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

  setPendingMarketingOptInFromSignup(marketingOptIn === true, false);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Upgrade anonymous checkout user in place so purchases stay on the same user_id.
  if (session?.user?.is_anonymous === true) {
    const { data, error } = await supabase.auth.updateUser({
      email,
      password,
      data: {
        ...(referralCode ? { referral_code: referralCode } : {}),
      },
    });
    if (error) throw error;
    return { user: data.user, session: data.session };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(referralCode
        ? {
          data: {
            referral_code: referralCode,
          },
        }
        : {}),
      emailRedirectTo: window.location.origin + '/?email_confirmed=true',
    },
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

            const { syncLocalSaveFromCloud } = await import('./save');
            await syncLocalSaveFromCloud({
              gameState: freshStateData.gameState,
              timestamp: freshStateData.timestamp,
              playTime: freshStateData.playTime || 0,
            });
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

  // Prime the cached auth user synchronously: the onAuthStateChange listener updates the cache
  // asynchronously, so the loadGame() that runs right after sign-in could otherwise read a stale
  // null user and load the local/new game instead of the cloud save (broken cross-device sync).
  if (data.user) {
    primeCachedAuthUser(data.user);
  }

  await flushPendingMarketingPreferences();

  return data;
}

export async function signInWithGoogle(opts?: {
  signupFlow?: boolean;
  marketingOptIn?: boolean;
  /** Referrer user id from `?ref=` — stored until OAuth completes, then merged via {@link flushPendingReferralToUserMetadata}. */
  referralCode?: string | null;
}) {
  if (opts?.signupFlow) {
    setPendingMarketingOptInFromSignup(opts.marketingOptIn === true, true);
    stashPendingReferralCodeForOAuth(opts.referralCode);
    stashPendingSignupWelcomeForOAuth();
  }

  const supabase = await getSupabaseClient();

  const redirectTo = window.location.origin + '/?game=true';

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user?.is_anonymous === true) {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
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
    const { clearLastCloudState } = await import("./save");
    await clearLastCloudState();
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

  clearPendingReferralCode();
  clearPendingSignupWelcome();

  // PRESERVE local save - only clear lastCloudState to allow fresh sync on next login
  try {
    const { clearLastCloudState } = await import('./save');
    await clearLastCloudState();
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

/** Access token for the current session (anonymous or registered). */
export async function getSessionAccessToken(): Promise<string | null> {
  const supabase = await getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** Any signed-in Supabase user, including anonymous (no confirmed email required). */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const supabase = await getSupabaseClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.user?.id) {
      return null;
    }
    return {
      id: session.user.id,
      email: session.user.email ?? '',
    };
  } catch (error) {
    logger.warn('Failed to get session user:', error);
    return null;
  }
}

/** True when the current session is an anonymous (guest checkout) user. */
export async function isAnonymousSession(): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.is_anonymous === true;
  } catch {
    return false;
  }
}

/**
 * Ensures a Supabase session exists for shop checkout. Creates an anonymous user if needed.
 */
export async function ensureAnonymousSession(): Promise<AuthUser> {
  const existing = await getSessionUser();
  if (existing) {
    return existing;
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }
  if (!data.user?.id) {
    throw new Error('Anonymous sign-in did not return a user');
  }

  return {
    id: data.user.id,
    email: data.user.email ?? '',
  };
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