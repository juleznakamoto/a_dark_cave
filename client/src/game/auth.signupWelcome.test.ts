import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  PENDING_SIGNUP_WELCOME_KEY,
  SIGNUP_WELCOME_CLAIM_MAX_ACCOUNT_AGE_MS,
  SIGNUP_WELCOME_NEW_ACCOUNT_MAX_MS,
  applySignupWelcomeBonusAfterOAuthLoad,
  claimSignupWelcomeGold,
  isAuthUserEligibleForSignupWelcomeClaim,
  isAuthUserWithinSignupWelcomeClaimWindow,
  isAuthUserWithinSignupWelcomeWindow,
  isSignupWelcomeGoldClaimEligible,
  markPendingSignupWelcomeFromSignupFlow,
} from "./auth";

const NOW = Date.parse("2024-06-01T12:00:00.000Z");

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: vi.fn(),
  isAuthStateReady: vi.fn(),
  getCachedAuthUser: vi.fn(),
  primeCachedAuthUser: vi.fn(),
}));

vi.mock("./state", () => ({
  useGameStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

vi.mock("./save", () => ({
  saveGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./socialPromoExclusiveReward", () => ({
  syncSocialPromoExclusiveRewardPending: vi.fn(),
}));

function mockSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
  });
  return store;
}

describe("signup welcome gold eligibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockSessionStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("treats accounts created within 15 minutes as new", () => {
    const createdAt = new Date(NOW - 10 * 60 * 1000).toISOString();
    expect(isAuthUserWithinSignupWelcomeWindow(createdAt, NOW)).toBe(true);
  });

  it("allows claim hours after signup without session pending", () => {
    const createdAt = new Date(NOW - 8 * 60 * 60 * 1000).toISOString();
    expect(
      isAuthUserEligibleForSignupWelcomeClaim(createdAt, null, NOW),
    ).toBe(true);
    expect(isAuthUserWithinSignupWelcomeClaimWindow(createdAt, NOW)).toBe(true);
  });

  it("rejects accounts older than the claim window without pending signup", () => {
    const createdAt = new Date(
      NOW - SIGNUP_WELCOME_CLAIM_MAX_ACCOUNT_AGE_MS - 1,
    ).toISOString();
    expect(
      isAuthUserEligibleForSignupWelcomeClaim(createdAt, null, NOW),
    ).toBe(false);
  });

  it("allows delayed email confirm when pending timestamp matches account creation", () => {
    const createdAt = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString();
    const pendingStartedAt = Date.parse(createdAt);
    expect(
      isAuthUserEligibleForSignupWelcomeClaim(
        createdAt,
        pendingStartedAt,
        NOW,
      ),
    ).toBe(true);
  });

  it("rejects existing Google accounts that only set pending during signup flow", () => {
    const createdAt = new Date(
      NOW - SIGNUP_WELCOME_CLAIM_MAX_ACCOUNT_AGE_MS - 1,
    ).toISOString();
    expect(
      isAuthUserEligibleForSignupWelcomeClaim(createdAt, NOW - 1000, NOW),
    ).toBe(false);
  });

  it("markPendingSignupWelcomeFromSignupFlow stores pending keys", () => {
    markPendingSignupWelcomeFromSignupFlow();
    expect(sessionStorage.getItem(PENDING_SIGNUP_WELCOME_KEY)).toBe("1");
    expect(sessionStorage.getItem("adc_pending_signup_welcome_started_at")).toBe(
      String(NOW),
    );
  });

  it("applySignupWelcomeBonusAfterOAuthLoad clears pending for existing accounts", async () => {
    markPendingSignupWelcomeFromSignupFlow();
    const { getSupabaseClient, getCachedAuthUser, isAuthStateReady } =
      await import("@/lib/supabase");
    vi.mocked(isAuthStateReady).mockReturnValue(true);
    vi.mocked(getCachedAuthUser).mockReturnValue({
      id: "user-old",
      email: "old@example.com",
      email_confirmed_at: "2024-01-01T00:00:00Z",
    } as any);
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-old",
              created_at: new Date(
                NOW - SIGNUP_WELCOME_CLAIM_MAX_ACCOUNT_AGE_MS - 1,
              ).toISOString(),
            },
          },
          error: null,
        }),
      },
    } as any);

    await applySignupWelcomeBonusAfterOAuthLoad();

    expect(sessionStorage.getItem(PENDING_SIGNUP_WELCOME_KEY)).toBeNull();
  });

  it("claimSignupWelcomeGold rejects ineligible existing accounts", async () => {
    const { useGameStore } = await import("./state");
    vi.mocked(useGameStore.getState).mockReturnValue({
      isUserSignedIn: true,
      signupWelcomeGoldClaimed: false,
      updateResource: vi.fn(),
      addLogEntry: vi.fn(),
    } as any);

    markPendingSignupWelcomeFromSignupFlow();

    const { getSupabaseClient } = await import("@/lib/supabase");
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-old",
              created_at: new Date(
                NOW - SIGNUP_WELCOME_CLAIM_MAX_ACCOUNT_AGE_MS - 1,
              ).toISOString(),
            },
          },
          error: null,
        }),
      },
    } as any);

    await expect(isSignupWelcomeGoldClaimEligible()).resolves.toBe(false);
    await expect(claimSignupWelcomeGold()).resolves.toBe(false);
    expect(useGameStore.getState().updateResource).not.toHaveBeenCalled();
  });

  it("claimSignupWelcomeGold grants gold for new accounts", async () => {
    const updateResource = vi.fn();
    const addLogEntry = vi.fn();
    const { useGameStore } = await import("./state");
    vi.mocked(useGameStore.getState).mockReturnValue({
      isUserSignedIn: true,
      signupWelcomeGoldClaimed: false,
      updateResource,
      addLogEntry,
    } as any);

    markPendingSignupWelcomeFromSignupFlow();

    const createdAt = new Date(NOW - 60 * 1000).toISOString();
    const { getSupabaseClient } = await import("@/lib/supabase");
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-new",
              created_at: createdAt,
            },
          },
          error: null,
        }),
      },
    } as any);

    await expect(isSignupWelcomeGoldClaimEligible()).resolves.toBe(true);
    await expect(claimSignupWelcomeGold()).resolves.toBe(true);
    expect(updateResource).toHaveBeenCalledWith("gold", expect.any(Number));
    expect(sessionStorage.getItem(PENDING_SIGNUP_WELCOME_KEY)).toBeNull();
  });
});
