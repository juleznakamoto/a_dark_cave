/** Steam build stub — no Supabase client or network. */

export async function getSupabaseClient(): Promise<never> {
  throw new Error("Supabase is disabled in the Steam build");
}

export function getCachedAuthUser(): null {
  return null;
}

export function primeCachedAuthUser(_user: unknown): void { }

export function isAuthStateReady(): boolean {
  return true;
}

export const supabase = {
  auth: {
    getUser: async () => getSupabaseClient(),
    signUp: async () => getSupabaseClient(),
    signInWithPassword: async () => getSupabaseClient(),
    signOut: async () => getSupabaseClient(),
    resetPasswordForEmail: async () => getSupabaseClient(),
    updateUser: async () => getSupabaseClient(),
    getSession: async () => getSupabaseClient(),
    refreshSession: async () => getSupabaseClient(),
    verifyOtp: async () => getSupabaseClient(),
    signInWithOAuth: async () => getSupabaseClient(),
  },
  from: (_table: string) => ({
    select: (_columns?: string) => ({
      eq: async (_column: string, _value: unknown) => getSupabaseClient(),
    }),
    insert: async (_data: unknown) => getSupabaseClient(),
    upsert: async (_data: unknown, _options?: unknown) => getSupabaseClient(),
  }),
};
