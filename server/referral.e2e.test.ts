import { describe, it, expect, beforeEach, vi } from "vitest";
import { processReferral } from "./referral";

const mockRpc = vi.fn();

vi.mock("./supabaseServerClient", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe("Referral claim flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    process.env.VITE_SUPABASE_URL_DEV = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY_DEV = "test-key";
  });

  it("returns the ledger slice after a successful claim", async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        referralProcessed: true,
        referralCode: "AB3K9M",
        referrals: [],
        referralCount: 0,
        referredUsers: [],
      },
      error: null,
    });

    const result = await processReferral("new-user-456", "AB3K9M");

    expect(result.success).toBe(true);
    expect(result.referralProcessed).toBe(true);
    expect(result.referralCode).toBe("AB3K9M");
  });

  it("repairs a missing referrer projection", async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        reason: "referrer_repaired",
        referralProcessed: true,
      },
      error: null,
    });

    const result = await processReferral("existing-user-123", "XY2Z4W");

    expect(result).toEqual({
      success: true,
      reason: "referrer_repaired",
      referralProcessed: true,
    });
  });
});
