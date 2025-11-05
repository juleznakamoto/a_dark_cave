
import { createClient } from '@supabase/supabase-js';

// In development, use Vite env vars
// In production, fetch from /api/config endpoint
const isDev = import.meta.env.DEV;

let supabaseUrl: string;
let supabaseAnonKey: string;

if (isDev) {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL_DEV;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY_DEV;
} else {
  // In production, these will be fetched from the server
  // We'll initialize with empty strings and fetch them
  supabaseUrl = '';
  supabaseAnonKey = '';
}

console.log('Environment:', isDev ? 'Development' : 'Production');
console.log('Supabase URL:', supabaseUrl || '[Will be fetched from server]');
console.log('Supabase Key:', supabaseAnonKey ? 'Present' : '[Will be fetched from server]');

// Create a promise that will resolve with the Supabase client
let supabaseClientPromise: Promise<ReturnType<typeof createClient>>;

if (isDev) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is missing in development. Please set VITE_SUPABASE_URL_DEV and VITE_SUPABASE_ANON_KEY_DEV in Replit Secrets.');
  }
  supabaseClientPromise = Promise.resolve(createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }));
} else {
  // Fetch config from server in production
  supabaseClientPromise = fetch('/api/config')
    .then(res => res.json())
    .then(config => {
      console.log('Loaded Supabase config from server');
      return createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        }
      });
    })
    .catch(err => {
      console.error('Failed to load Supabase config:', err);
      throw new Error('Failed to load Supabase configuration from server');
    });
}

export const supabase = await supabaseClientPromise;

export type User = {
  id: string;
  email: string;
};
