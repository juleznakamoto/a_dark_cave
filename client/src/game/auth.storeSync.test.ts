import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCachedAuthUser, mockIsAuthStateReady, mockSetIsUserSignedIn, mockGetState } =
  vi.hoisted(() => ({
    mockGetCachedAuthUser: vi.fn(),
    mockIsAuthStateReady: vi.fn(() => true),
    mockSetIsUserSignedIn: vi.fn(),
    mockGetState: vi.fn(),
  }));

vi.mock("@/lib/supabase", () => ({
  AUTH_STORAGE_KEY: "a-dark-cave-auth",
  getSupabaseClient: vi.fn(),
  getCachedAuthUser: () => mockGetCachedAuthUser(),
  isAuthStateReady: () => mockIsAuthStateReady(),
  primeCachedAuthUser: vi.fn(),
}));

vi.mock("./state", () => ({
  useGameStore: {
    getState: () => mockGetState(),
  },
}));

describe("syncStoreAuthFromSession", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetCachedAuthUser.mockReset();
    mockIsAuthStateReady.mockReset();
    mockIsAuthStateReady.mockReturnValue(true);
    mockSetIsUserSignedIn.mockReset();
    mockGetState.mockReset();
    mockGetState.mockReturnValue({
      isUserSignedIn: false,
      setIsUserSignedIn: mockSetIsUserSignedIn,
    });
  });

  it("sets signed-in when a confirmed user is present", async () => {
    mockGetCachedAuthUser.mockReturnValue({
      id: "u1",
      email: "a@b.c",
      email_confirmed_at: "2026-01-01",
    });
    const { syncStoreAuthFromSession } = await import("./auth");

    await expect(syncStoreAuthFromSession()).resolves.toBe(true);
    expect(mockSetIsUserSignedIn).toHaveBeenCalledWith(true);
  });

  it("clears signed-in for anonymous sessions without confirmed email", async () => {
    mockGetState.mockReturnValue({
      isUserSignedIn: true,
      setIsUserSignedIn: mockSetIsUserSignedIn,
    });
    mockGetCachedAuthUser.mockReturnValue({
      id: "anon",
      email: undefined,
      email_confirmed_at: null,
    });
    const { syncStoreAuthFromSession } = await import("./auth");

    await expect(syncStoreAuthFromSession()).resolves.toBe(false);
    expect(mockSetIsUserSignedIn).toHaveBeenCalledWith(false);
  });

  it("is idempotent when the store already matches", async () => {
    mockGetState.mockReturnValue({
      isUserSignedIn: true,
      setIsUserSignedIn: mockSetIsUserSignedIn,
    });
    mockGetCachedAuthUser.mockReturnValue({
      id: "u1",
      email: "a@b.c",
      email_confirmed_at: "2026-01-01",
    });
    const { syncStoreAuthFromSession } = await import("./auth");

    await expect(syncStoreAuthFromSession()).resolves.toBe(true);
    expect(mockSetIsUserSignedIn).not.toHaveBeenCalled();
  });
});
