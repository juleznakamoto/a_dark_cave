
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processReferral } from './referral';
import { resolveReferrerUserId } from './referralCodes';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock('./referralCodes', () => ({
  resolveReferrerUserId: vi.fn(),
  getOrCreateReferralCode: vi.fn(),
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
    vi.mocked(resolveReferrerUserId).mockResolvedValue({ userId });
    const result = await processReferral(userId, 'AB3K9M');

    expect(result).toEqual({
      success: false,
      reason: 'self_referral',
    });
  });

  it('should reject invalid referral codes', async () => {
    vi.mocked(resolveReferrerUserId).mockResolvedValue({ error: 'invalid_code' });
    const result = await processReferral('new-user-123', '!!!');

    expect(result).toEqual({
      success: false,
      reason: 'invalid_referral_code',
    });
  });

  it('should repair referrer list when already processed but missing', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'AB3K9M';
    const referrerId = 'referrer-456';

    vi.mocked(resolveReferrerUserId).mockResolvedValue({
      userId: referrerId,
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    let selectCount = 0;
    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockImplementation(() => {
            selectCount++;
            if (selectCount === 1) {
              return Promise.resolve({
                data: {
                  game_state: {
                    referralProcessed: true,
                    referralCode,
                  },
                },
              });
            }
            // referrer save — empty referrals (clobbered)
            return Promise.resolve({
              data: {
                game_state: {
                  referrals: [],
                  referralCount: 0,
                  resources: { gold: 10 },
                },
              },
            });
          }),
        }),
      }),
      update: mockUpdate,
    }));

    const result = await processReferral(newUserId, referralCode);

    expect(result).toEqual({
      success: true,
      reason: 'referrer_repaired',
    });
    expect(mockUpdate).toHaveBeenCalled();
    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.game_state.referrals).toEqual([
      expect.objectContaining({ userId: newUserId, claimed: false }),
    ]);
  });

  it('should return already_processed when referrer already has the entry', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'AB3K9M';

    vi.mocked(resolveReferrerUserId).mockResolvedValue({
      userId: 'referrer-456',
    });

    let selectCount = 0;
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockImplementation(() => {
            selectCount++;
            if (selectCount === 1) {
              return Promise.resolve({
                data: { game_state: { referralProcessed: true } },
              });
            }
            return Promise.resolve({
              data: {
                game_state: {
                  referrals: [{ userId: newUserId, claimed: true, timestamp: 1 }],
                },
              },
            });
          }),
        }),
      }),
      update: mockUpdate,
    }));

    const result = await processReferral(newUserId, referralCode);

    expect(result).toEqual({
      success: true,
      reason: 'already_processed',
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should handle referrer not found', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'AB3K9M';

    vi.mocked(resolveReferrerUserId).mockResolvedValue({
      error: 'referrer_not_found',
    });

    const result = await processReferral(newUserId, referralCode);

    expect(result).toEqual({
      success: false,
      reason: 'referrer_no_save',
    });
  });

  it('should enforce referral limit of 10', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'AB3K9M';

    vi.mocked(resolveReferrerUserId).mockResolvedValue({
      userId: 'referrer-456',
    });

    let callCount = 0;
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({ data: null });
            }
            return Promise.resolve({
              data: {
                game_state: {
                  referrals: Array(10).fill({ userId: 'other-user', claimed: true }),
                },
              },
            });
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

  it('should still process new user when already on referrer list', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'AB3K9M';

    vi.mocked(resolveReferrerUserId).mockResolvedValue({
      userId: 'referrer-456',
    });

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve({ data: null });
          }
          return Promise.resolve({
            data: {
              game_state: {
                referrals: [{ userId: newUserId, claimed: false }],
              },
            },
          });
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

    const result = await processReferral(newUserId, referralCode);

    expect(result).toEqual({ success: true });
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('should successfully process valid referral', async () => {
    const newUserId = 'new-user-123';
    const referralCode = 'AB3K9M';

    vi.mocked(resolveReferrerUserId).mockResolvedValue({
      userId: 'referrer-456',
    });

    let selectCallCount = 0;
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve({ data: null });
          }
          return Promise.resolve({
            data: {
              game_state: {
                referrals: [],
                resources: { gold: 100, wood: 50, stone: 30, food: 20 },
              },
            },
          });
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

    const result = await processReferral(newUserId, referralCode);

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalled();
  });
});
