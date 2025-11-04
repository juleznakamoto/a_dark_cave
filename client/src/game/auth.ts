
import { supabase } from '@/lib/supabase';
import { GameState } from '@shared/schema';

export interface AuthUser {
  id: string;
  email: string;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email || '',
  };
}

export async function saveGameToSupabase(gameState: GameState): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const sanitizedState = JSON.parse(JSON.stringify(gameState));
  
  const { error } = await supabase
    .from('game_saves')
    .upsert({
      user_id: user.id,
      game_state: sanitizedState,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) throw error;
}

export async function loadGameFromSupabase(): Promise<GameState | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('game_saves')
    .select('game_state')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No save found
    throw error;
  }

  return data?.game_state || null;
}
