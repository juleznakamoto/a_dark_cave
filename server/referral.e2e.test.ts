
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processReferral } from './referral';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    signUp: vi.fn(),
    signIn: vi.fn(),
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('Referral E2E Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
    process.env.VITE_SUPABASE_URL_DEV = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY_DEV = 'test-key';
  });

  it('should handle complete referral flow: signup -> process -> claim', async () => {
    const referrerId = 'referrer-123';
    const newUserId = 'new-user-456';

    // Mock successful referral processing
    let selectCallCount = 0;
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve({ data: null }); // New user has no save
          } else {
            return Promise.resolve({
              data: {
                game_state: {
                  referrals: [],
                  resources: { gold: 100 },
                },
              },
            });
          }
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseClient.from.mockImplementation(() => ({
      select: mockSelect,
      update: mockUpdate,
      upsert: mockUpsert,
    }));

    // Step 1: Process referral
    const result = await processReferral(newUserId, referrerId);
    expect(result.success).toBe(true);

    // Step 2: Verify referrer got the unclaimed referral
    const referrerUpdateCall = mockUpdate.mock.calls[0];
    expect(referrerUpdateCall).toBeDefined();

    // Step 3: Verify new user got bonus gold
    const newUserUpsertCall = mockUpsert.mock.calls[0];
    expect(newUserUpsertCall).toBeDefined();
    expect(newUserUpsertCall[0].game_state.resources.gold).toBe(100);
  });

  it('should prevent referral after user has already started playing', async () => {
    const newUserId = 'existing-user-123';
    const referralCode = 'referrer-456';

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              game_state: {
                referralProcessed: true,
                playTime: 5000,
              },
            },
          }),
        }),
      }),
    });

    const result = await processReferral(newUserId, referralCode);

    expect(result).toEqual({
      success: false,
      reason: 'already_processed',
    });
  });
});
