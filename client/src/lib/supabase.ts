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

// Create initial client
let supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'a-dark-cave-auth'
  }
});

// In production, fetch the real config and reinitialize
if (!isDev) {
  fetch('/api/config')
    .then(res => res.json())
    .then(config => {
      console.log('Loaded Supabase config from server');
      // Reinitialize the client with real credentials
      supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
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
    });
}

// Export the client via a getter function to always get the current instance
export const supabase = supabaseClient;

export type User = {
  id: string;
  email: string;
};