import { describe, it, expect, beforeEach, vi } from "vitest";
import { processReferral } from "./referral";

const mockRpc = vi.fn();
const mockGetUserById = vi.fn();

vi.mock("./supabaseServerClient", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: { admin: { getUserById: mockGetUserById } },
  })),
}));

describe("processReferral", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserById.mockResolvedValue({ data: { user: null }, error: null });
    process.env.NODE_ENV = "development";
    process.env.VITE_SUPABASE_URL_DEV = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY_DEV = "test-key";
  });

  it("calls claim_referral with the session user and code", async () => {
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

    const result = await processReferral("invitee-1", "AB3K9M");

    expect(mockRpc).toHaveBeenCalledWith("claim_referral", {
      p_invitee_id: "invitee-1",
      p_code: "AB3K9M",
    });
    expect(result.success).toBe(true);
    expect(result.referralProcessed).toBe(true);
  });

  it("uses signup user_metadata when the body has no code", async () => {
    mockGetUserById.mockResolvedValue({
      data: {
        user: { user_metadata: { referral_code: "ewevj9" } },
      },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: { success: true, referralProcessed: true, referralCode: "EWEVJ9" },
      error: null,
    });

    const result = await processReferral("invitee-1", null);

    expect(mockGetUserById).toHaveBeenCalledWith("invitee-1");
    expect(mockRpc).toHaveBeenCalledWith("claim_referral", {
      p_invitee_id: "invitee-1",
      p_code: "EWEVJ9",
    });
    expect(result.referralProcessed).toBe(true);
  });

  it("syncs without a code", async () => {
    mockRpc.mockResolvedValue({
      data: { success: true, referralProcessed: false, referrals: [] },
      error: null,
    });

    const result = await processReferral("user-1", "  ");

    expect(mockRpc).toHaveBeenCalledWith("claim_referral", {
      p_invitee_id: "user-1",
      p_code: null,
    });
    expect(result.success).toBe(true);
  });

  it("maps RPC errors to claim_error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "function not found" },
    });

    const result = await processReferral("user-1", "AB3K9M");

    expect(result).toEqual({ success: false, reason: "claim_error" });
  });

  it("passes through already_processed", async () => {
    mockRpc.mockResolvedValue({
      data: { success: true, reason: "already_processed", referralProcessed: true },
      error: null,
    });

    const result = await processReferral("user-1", "AB3K9M");

    expect(result).toEqual({
      success: true,
      reason: "already_processed",
      referralProcessed: true,
    });
  });
});
