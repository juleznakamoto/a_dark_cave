import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
    console.log('Loaded Supabase config from server');

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

// For backward compatibility - get the client synchronously (will throw if not initialized)
export function getSupabaseClientSync(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call getSupabaseClient() first.');
  }
  return supabaseClient;
}

export type User = {
  id: string;
  email: string;
};