
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@supabase/supabase-js');
vi.mock('../client/src/lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}));

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prevent signup without email confirmation', async () => {
    // Test that unconfirmed users cannot sign in
    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@test.com',
              email_confirmed_at: null, // Not confirmed
            },
          },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    const { getSupabaseClient } = await import('../client/src/lib/supabase');
    vi.mocked(getSupabaseClient).mockResolvedValue(mockSupabase as any);

    const { signIn } = await import('../client/src/game/auth');
    await expect(signIn('test@test.com', 'password')).rejects.toThrow('confirm your email');
  });

  it('should handle session expiry gracefully', async () => {
    // Test that expired sessions are detected and handled
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Session expired' },
        }),
      },
    };

    const { getSupabaseClient } = await import('../client/src/lib/supabase');
    vi.mocked(getSupabaseClient).mockResolvedValue(mockSupabase as any);

    const { getCurrentUser } = await import('../client/src/game/auth');
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});
