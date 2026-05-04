
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const isDev = import.meta.env.MODE === 'development';

let supabaseClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;
let authStateListenerSetup = false;

// Cached auth state
let cachedAuthUser: any | null = null;
let authStateInitialized = false;

// Function to initialize Supabase
async function initializeSupabase(): Promise<SupabaseClient> {
  if (isDev) {
    // In development, use environment variables directly
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL_DEV;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY_DEV;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing in development.');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'a-dark-cave-auth'
      }
    });
  } else {
    // In production, fetch config from server (retry transient 5xx / network blips)
    const maxAttempts = 4;
    let lastStatus = 0;
    let config: { supabaseUrl?: string; supabaseAnonKey?: string } | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch("/api/config");
        lastStatus = response.status;
        if (response.ok) {
          config = await response.json();
          break;
        }
        const retryable =
          response.status >= 500 ||
          response.status === 429 ||
          response.status === 408;
        if (retryable && attempt < maxAttempts - 1) {
          await new Promise((r) =>
            setTimeout(r, 250 * Math.pow(2, attempt)),
          );
          continue;
        }
        throw new Error(`Failed to load Supabase config (${response.status})`);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Failed to load")) {
          throw e;
        }
        // Transient network / CORS-ish failures often surface as TypeError (message text varies by browser).
        if (attempt < maxAttempts - 1 && e instanceof TypeError) {
          await new Promise((r) =>
            setTimeout(r, 250 * Math.pow(2, attempt)),
          );
          continue;
        }
        throw new Error(
          lastStatus
            ? `Failed to load Supabase config (${lastStatus})`
            : "Failed to load Supabase config",
        );
      }
    }

    if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
      throw new Error(
        lastStatus
          ? `Failed to load Supabase config (${lastStatus})`
          : "Failed to load Supabase config",
      );
    }

    logger.log('Loaded Supabase config from server');

    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'a-dark-cave-auth'
      }
    });
  }
}

// Get or create the client
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!initPromise) {
    initPromise = initializeSupabase().then(client => {
      supabaseClient = client;

      // Setup auth state listener once
      if (!authStateListenerSetup) {
        authStateListenerSetup = true;

        // Listen to auth state changes with minimal overhead
        client.auth.onAuthStateChange((_event, session) => {
          const nextUser = session?.user ?? null;
          cachedAuthUser = nextUser;
          authStateInitialized = true;

          void import("@/game/state").then(({ useGameStore }) => {
            const gameplaySignedIn = !!nextUser?.email_confirmed_at;
            useGameStore.getState().setIsUserSignedIn(gameplaySignedIn);
          });
        });

        // Initialize current session
        client.auth.getSession().then(({ data: { session } }) => {
          cachedAuthUser = session?.user || null;
          authStateInitialized = true;
          void import("@/game/state").then(({ useGameStore }) => {
            useGameStore
              .getState()
              .setIsUserSignedIn(!!session?.user?.email_confirmed_at);
          });
        });
      }

      return client;
    });
  }

  return initPromise;
}

// Get cached auth user without making API call
export function getCachedAuthUser(): any | null {
  return cachedAuthUser;
}

// Check if auth state is initialized
export function isAuthStateReady(): boolean {
  return authStateInitialized;
}

// Export a wrapper object that provides the same interface as SupabaseClient
// but lazily initializes on first use
export const supabase = {
  auth: {
    getUser: async () => {
      const client = await getSupabaseClient();
      return client.auth.getUser();
    },
    signUp: async (credentials: any) => {
      const client = await getSupabaseClient();
      return client.auth.signUp(credentials);
    },
    signInWithPassword: async (credentials: any) => {
      const client = await getSupabaseClient();
      return client.auth.signInWithPassword(credentials);
    },
    signOut: async () => {
      const client = await getSupabaseClient();
      return client.auth.signOut();
    },
    resetPasswordForEmail: async (email: string, options?: any) => {
      const client = await getSupabaseClient();
      return client.auth.resetPasswordForEmail(email, options);
    },
    updateUser: async (attributes: any) => {
      const client = await getSupabaseClient();
      return client.auth.updateUser(attributes);
    },
    getSession: async () => {
      const client = await getSupabaseClient();
      return client.auth.getSession();
    },
    refreshSession: async () => {
      const client = await getSupabaseClient();
      return client.auth.refreshSession();
    },
    verifyOtp: async (params: any) => {
      const client = await getSupabaseClient();
      return client.auth.verifyOtp(params);
    },
    signInWithOAuth: async (options: { provider: 'google' }) => {
      const client = await getSupabaseClient();
      return client.auth.signInWithOAuth(options);
    }
  },
  from: (table: string) => {
    return {
      select: (columns?: string) => {
        return {
          eq: async (column: string, value: any) => {
            const client = await getSupabaseClient();
            return client.from(table).select(columns).eq(column, value);
          }
        };
      },
      insert: async (data: any) => {
        const client = await getSupabaseClient();
        return client.from(table).insert(data);
      },
      upsert: async (data: any, options?: any) => {
        const client = await getSupabaseClient();
        return client.from(table).upsert(data, options);
      }
    };
  }
};
