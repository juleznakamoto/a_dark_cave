
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { supabaseMonitor } from '@/lib/supabaseMonitor';

const isDev = import.meta.env.MODE === 'development';

let supabaseClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

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
    // In production, fetch config from server
    const response = await fetch('/api/config');
    if (!response.ok) {
      throw new Error('Failed to load Supabase config');
    }

    const config = await response.json();
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
      return client;
    });
  }

  return initPromise;
}

// Export a wrapper object that provides the same interface as SupabaseClient
// but lazily initializes on first use
export const supabase = {
  auth: {
    getUser: async () => {
      const start = performance.now();
      const client = await getSupabaseClient();
      const result = await client.auth.getUser();
      supabaseMonitor.logCall('auth.getUser', performance.now() - start, true);
      return result;
    },
    signUp: async (credentials: any) => {
      const start = performance.now();
      const client = await getSupabaseClient();
      const result = await client.auth.signUp(credentials);
      supabaseMonitor.logCall('auth.signUp', performance.now() - start);
      return result;
    },
    signInWithPassword: async (credentials: any) => {
      const start = performance.now();
      const client = await getSupabaseClient();
      const result = await client.auth.signInWithPassword(credentials);
      supabaseMonitor.logCall('auth.signInWithPassword', performance.now() - start);
      return result;
    },
    signOut: async () => {
      const start = performance.now();
      const client = await getSupabaseClient();
      const result = await client.auth.signOut();
      supabaseMonitor.logCall('auth.signOut', performance.now() - start);
      return result;
    },
    resetPasswordForEmail: async (email: string, options?: any) => {
      const start = performance.now();
      const client = await getSupabaseClient();
      const result = await client.auth.resetPasswordForEmail(email, options);
      supabaseMonitor.logCall('auth.resetPasswordForEmail', performance.now() - start);
      return result;
    },
    updateUser: async (attributes: any) => {
      const start = performance.now();
      const client = await getSupabaseClient();
      const result = await client.auth.updateUser(attributes);
      supabaseMonitor.logCall('auth.updateUser', performance.now() - start);
      return result;
    },
    getSession: async () => {
      const start = performance.now();
      const client = await getSupabaseClient();
      const result = await client.auth.getSession();
      supabaseMonitor.logCall('auth.getSession', performance.now() - start, true);
      return result;
    },
    refreshSession: async () => {
      const start = performance.now();
      const client = await getSupabaseClient();
      const result = await client.auth.refreshSession();
      supabaseMonitor.logCall('auth.refreshSession', performance.now() - start);
      return result;
    },
    verifyOtp: async (params: any) => {
      const start = performance.now();
      const client = await getSupabaseClient();
      const result = await client.auth.verifyOtp(params);
      supabaseMonitor.logCall('auth.verifyOtp', performance.now() - start);
      return result;
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

export type User = {
  id: string;
  email: string;
};
