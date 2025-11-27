
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@supabase/supabase-js');

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prevent signup without email confirmation', async () => {
    // Test that unconfirmed users cannot sign in
    const { signIn } = await import('../client/src/game/auth');
    
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

    const { createClient } = await import('@supabase/supabase-js');
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await expect(signIn('test@test.com', 'password')).rejects.toThrow('confirm your email');
  });

  it('should handle session expiry gracefully', async () => {
    // Test that expired sessions are detected and handled
    const { getCurrentUser } = await import('../client/src/game/auth');
    
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Session expired' },
        }),
      },
    };

    const { createClient } = await import('@supabase/supabase-js');
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});
