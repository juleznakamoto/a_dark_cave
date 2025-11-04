
import { createClient } from '@supabase/supabase-js';

const isDev = import.meta.env.DEV;

const supabaseUrl = isDev 
  ? import.meta.env.VITE_SUPABASE_URL_DEV
  : import.meta.env.VITE_SUPABASE_URL_PROD;

const supabaseAnonKey = isDev
  ? import.meta.env.VITE_SUPABASE_ANON_KEY_DEV
  : import.meta.env.VITE_SUPABASE_ANON_KEY_PROD;

console.log('Environment:', isDev ? 'Development' : 'Production');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.error('⚠️ Supabase environment variables are not properly configured!');
  console.error('Environment:', isDev ? 'DEV' : 'PROD');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '[SET]' : '[MISSING]');
  throw new Error(
    `Supabase configuration is missing. Please set ${isDev ? 'VITE_SUPABASE_URL_DEV and VITE_SUPABASE_ANON_KEY_DEV' : 'VITE_SUPABASE_URL_PROD and VITE_SUPABASE_ANON_KEY_PROD'} in Replit Secrets.`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

export type User = {
  id: string;
  email: string;
};
