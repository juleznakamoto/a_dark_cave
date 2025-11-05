

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// In development, use Vite env vars
// In production, fetch from /api/config endpoint
const isDev = import.meta.env.DEV;

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

async function initializeSupabase(): Promise<SupabaseClient> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    let supabaseUrl: string;
    let supabaseAnonKey: string;

    if (isDev) {
      supabaseUrl = import.meta.env.VITE_SUPABASE_URL_DEV;
      supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY_DEV;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration is missing in development. Please set VITE_SUPABASE_URL_DEV and VITE_SUPABASE_ANON_KEY_DEV in Replit Secrets.');
      }

      console.log('Environment: Development');
      console.log('Supabase URL:', supabaseUrl);
      console.log('Supabase Key: Present');
    } else {
      // Fetch config from server in production
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.statusText}`);
        }
        const config = await response.json();
        supabaseUrl = config.supabaseUrl;
        supabaseAnonKey = config.supabaseAnonKey;

        console.log('Environment: Production');
        console.log('Loaded Supabase config from server');
      } catch (err) {
        console.error('Failed to load Supabase config:', err);
        throw new Error('Failed to load Supabase configuration from server');
      }
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });

    return supabaseInstance;
  })();

  return initPromise;
}

// Export a function that returns the initialized client
export async function getSupabase(): Promise<SupabaseClient> {
  return initializeSupabase();
}

// For backwards compatibility, export a promise
export const supabase = initializeSupabase();

export type User = {
  id: string;
  email: string;
};
