
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const isDev = import.meta.env.MODE === 'development';

// In production, we need to wait for config before creating the client
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
function getSupabaseClient(): Promise<SupabaseClient> {
  if (supabaseClient) {
    return Promise.resolve(supabaseClient);
  }

  if (!initPromise) {
    initPromise = initializeSupabase().then(client => {
      supabaseClient = client;
      return client;
    });
  }

  return initPromise;
}

// Export a proxy that waits for initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // Return a function that waits for the client to be ready
    return function(...args: any[]) {
      return getSupabaseClient().then(client => {
        const value = (client as any)[prop];
        if (typeof value === 'function') {
          return value.apply(client, args);
        }
        // For nested objects like 'auth', return another proxy
        if (value && typeof value === 'object') {
          return new Proxy(value, {
            get(_innerTarget, innerProp) {
              const innerValue = value[innerProp];
              if (typeof innerValue === 'function') {
                return innerValue.bind(value);
              }
              return innerValue;
            }
          });
        }
        return value;
      });
    };
  }
});

export type User = {
  id: string;
  email: string;
};
