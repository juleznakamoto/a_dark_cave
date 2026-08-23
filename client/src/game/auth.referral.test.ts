import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCachedAuthUser, mockIsAuthStateReady, mockGetSupabaseClient } =
  vi.hoisted(() => ({
    mockGetCachedAuthUser: vi.fn(),
    mockIsAuthStateReady: vi.fn(() => true),
    mockGetSupabaseClient: vi.fn(),
  }));

vi.mock("@/lib/supabase", () => ({
  AUTH_STORAGE_KEY: "a-dark-cave-auth",
  getSupabaseClient: () => mockGetSupabaseClient(),
  getCachedAuthUser: () => mockGetCachedAuthUser(),
  isAuthStateReady: () => mockIsAuthStateReady(),
  primeCachedAuthUser: vi.fn(),
}));

vi.mock("./state", () => ({
  useGameStore: {
    getState: () => ({
      referralCount: 0,
      referredUsers: [],
      referralCode: undefined,
      referrals: [],
      playTime: 0,
    }),
    setState: vi.fn(),
  },
}));

vi.mock("./referralCloudRefresh", () => ({
  applyReferralCloudRefreshPatch: () => ({ changed: false, nextState: {} }),
}));

vi.mock("./save", () => ({
  syncLocalSaveFromCloud: vi.fn(),
}));

vi.mock("./stateHelpers", () => ({
  buildGameState: vi.fn(),
}));

const CONFIRMED_USER = {
  id: "invitee-1",
  email: "b@example.com",
  email_confirmed_at: "2026-08-23T19:08:00Z",
  created_at: "2026-08-23T19:07:00Z",
  user_metadata: { referral_code: "EWEVJ9" },
};

function mockSignedInUser(
  user: typeof CONFIRMED_USER = CONFIRMED_USER,
): void {
  mockIsAuthStateReady.mockReturnValue(true);
  mockGetCachedAuthUser.mockReturnValue(user);
  mockGetSupabaseClient.mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "jwt-test" } },
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  });
}

describe("processReferralAfterConfirmation", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetCachedAuthUser.mockReset();
    mockIsAuthStateReady.mockReset();
    mockIsAuthStateReady.mockReturnValue(true);
    mockGetSupabaseClient.mockReset();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("waits for /api/referral/process before resolving", async () => {
    mockSignedInUser();
    let resolveFetch!: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(fetchPromise);
    vi.stubGlobal("fetch", fetchMock);

    const { processReferralAfterConfirmation } = await import("./auth");

    let settled = false;
    const pending = processReferralAfterConfirmation().then(() => {
      settled = true;
    });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(settled).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/referral/process"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ referralCode: "EWEVJ9" }),
      }),
    );

    resolveFetch(
      new Response(
        JSON.stringify({
          success: true,
          referralProcessed: true,
          referralCode: "EWEVJ9",
          referrals: [],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    await pending;
    expect(settled).toBe(true);
  });

  it("syncs the inviter with an empty body when they have no invite code", async () => {
    mockSignedInUser({
      ...CONFIRMED_USER,
      id: "inviter-1",
      email: "a@example.com",
      user_metadata: {},
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          referralProcessed: false,
          referrals: [
            { userId: "invitee-1", claimed: false, timestamp: 1 },
          ],
          referralCount: 1,
          referredUsers: ["invitee-1"],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { processReferralAfterConfirmation } = await import("./auth");
    await processReferralAfterConfirmation();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/referral/process"),
      expect.objectContaining({
        method: "POST",
        body: "{}",
      }),
    );
  });
});
