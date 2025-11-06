import { createClient } from '@supabase/supabase-js';

// In development, use Vite env vars
// In production, fetch from /api/config endpoint
const isDev = import.meta.env.DEV;

let supabaseUrl: string;
let supabaseAnonKey: string;

if (isDev) {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL_DEV;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY_DEV;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is missing in development. Please set VITE_SUPABASE_URL_DEV and VITE_SUPABASE_ANON_KEY_DEV in Replit Secrets.');
  }
} else {
  // In production, these will be set after fetching from server
  // Use placeholder values initially
  supabaseUrl = 'https://placeholder.supabase.co';
  supabaseAnonKey = 'placeholder-key';
}

console.log('Environment:', isDev ? 'Development' : 'Production');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing');

// Create a wrapper object that will hold the client
const supabaseWrapper = {
  client: createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'a-dark-cave-auth'
    }
  })
};

// In production, fetch the real config and reinitialize
if (!isDev) {
  fetch('/api/config')
    .then(res => res.json())
    .then(config => {
      console.log('Loaded Supabase config from server');
      // Reinitialize the client with real credentials
      supabaseWrapper.client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storageKey: 'a-dark-cave-auth'
        }
      });
    })
    .catch(err => {
      console.error('Failed to load Supabase config:', err);
    });
}

// Export a proxy that always uses the current client
export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    const value = supabaseWrapper.client[prop as keyof typeof supabaseWrapper.client];
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(supabaseWrapper.client);
    }
    // If it's an object (like 'auth'), wrap it in another proxy
    if (value && typeof value === 'object') {
      return new Proxy(value, {
        get(_innerTarget, innerProp) {
          const innerValue = (value as any)[innerProp];
          if (typeof innerValue === 'function') {
            return innerValue.bind(value);
          }
          return innerValue;
        }
      });
    }
    return value;
  }
});

export type User = {
  id: string;
  email: string;
};