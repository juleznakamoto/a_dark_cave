
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processReferral } from './referral';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
};

// Mock the createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('Referral System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
    process.env.VITE_SUPABASE_URL_DEV = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY_DEV = 'test-key';
  });

  it('should prevent self-referral', async () => {
    const userId = 'user123';
    const result = await processReferral(userId, userId);

    expect(result).toEqual({
      success: false,
      reason: 'self_referral',
    });
  });

  it('should prevent duplicate referral processing', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'referrer-456';

    // Mock new user already has referral processed
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              game_state: {
                referralProcessed: true,
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

  it('should handle referrer not found', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'nonexistent-referrer';

    let callCount = 0;
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              // First call: new user check (no referral processed)
              return Promise.resolve({ data: null });
            } else {
              // Second call: referrer not found
              return Promise.resolve({ data: null, error: null });
            }
          }),
        }),
      }),
    });

    const result = await processReferral(newUserId, referralCode);

    expect(result).toEqual({
      success: false,
      reason: 'referrer_no_save',
    });
  });

  it('should enforce referral limit of 10', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'referrer-456';

    let callCount = 0;
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              // First call: new user check
              return Promise.resolve({ data: null });
            } else {
              // Second call: referrer with 10 referrals
              return Promise.resolve({
                data: {
                  game_state: {
                    referrals: Array(10).fill({ userId: 'other-user', claimed: true }),
                  },
                },
              });
            }
          }),
        }),
      }),
    });

    const result = await processReferral(newUserId, referralCode);

    expect(result).toEqual({
      success: false,
      reason: 'referrer_limit_reached',
    });
  });

  it('should prevent duplicate referral of same user', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'referrer-456';

    let callCount = 0;
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              // First call: new user check
              return Promise.resolve({ data: null });
            } else {
              // Second call: referrer already has this user
              return Promise.resolve({
                data: {
                  game_state: {
                    referrals: [
                      { userId: newUserId, claimed: false },
                    ],
                  },
                },
              });
            }
          }),
        }),
      }),
    });

    const result = await processReferral(newUserId, referralCode);

    expect(result).toEqual({
      success: false,
      reason: 'already_referred',
    });
  });

  it('should successfully process valid referral', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'referrer-456';

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            // First call: new user check (no save)
            return Promise.resolve({ data: null });
          } else {
            // Second call: referrer with valid state
            return Promise.resolve({
              data: {
                game_state: {
                  referrals: [],
                  resources: { gold: 100, wood: 50, stone: 30, food: 20 },
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

    mockSupabaseClient.from.mockImplementation((table) => {
      return {
        select: mockSelect,
        update: mockUpdate,
        upsert: mockUpsert,
      };
    });

    const result = await processReferral(newUserId, referralCode);

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalled();
  });
});
