import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  PENDING_MARKETING_OPT_IN_KEY,
  setPendingMarketingOptInFromSignup,
  flushPendingMarketingPreferences,
} from "./auth";

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: vi.fn(),
  isAuthStateReady: vi.fn(),
  getCachedAuthUser: vi.fn(),
}));

async function mockConfirmedUser(accessToken: string | null) {
  const { getSupabaseClient, isAuthStateReady, getCachedAuthUser } =
    await import("@/lib/supabase");
  vi.mocked(isAuthStateReady).mockReturnValue(true);
  vi.mocked(getCachedAuthUser).mockReturnValue({
    id: "user-1",
    email: "player@example.com",
    email_confirmed_at: "2024-01-01T00:00:00Z",
  } as any);
  vi.mocked(getSupabaseClient).mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: accessToken ? { access_token: accessToken } : null,
        },
      }),
    },
  } as any);
}

describe("marketing signup pending + flush", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("setPendingMarketingOptInFromSignup stores JSON in sessionStorage", () => {
    const setItem = vi.mocked(sessionStorage.setItem);
    setPendingMarketingOptInFromSignup(true, false);
    expect(setItem).toHaveBeenCalledWith(
      PENDING_MARKETING_OPT_IN_KEY,
      expect.stringMatching(/"optIn":true/),
    );
    const raw = setItem.mock.calls[0][1];
    const parsed = JSON.parse(raw) as { google?: boolean };
    expect(parsed.google).toBe(false);
  });

  it("flushPendingMarketingPreferences does nothing without pending key", async () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(null);
    await flushPendingMarketingPreferences();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("flushPendingMarketingPreferences POSTs and clears storage on success", async () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(
      JSON.stringify({ optIn: true, google: true, ts: 1 }),
    );
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    await mockConfirmedUser("jwt-test");

    await flushPendingMarketingPreferences();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/marketing/preferences");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer jwt-test",
      "Content-Type": "application/json",
    });
    const body = JSON.parse((init?.body as string) ?? "{}");
    expect(body).toMatchObject({
      marketing_opt_in: true,
      consent_source: "google_signup",
      consent_text_version: 1,
      prompt_version: 1,
    });

    expect(sessionStorage.removeItem).toHaveBeenCalledWith(
      PENDING_MARKETING_OPT_IN_KEY,
    );
  });

  it("flushPendingMarketingPreferences uses email_signup when not google", async () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(
      JSON.stringify({ optIn: false, google: false, ts: 1 }),
    );
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    await mockConfirmedUser("t");

    await flushPendingMarketingPreferences();

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((init?.body as string) ?? "{}");
    expect(body.consent_source).toBe("email_signup");
    expect(body.marketing_opt_in).toBe(false);
  });

  it("flushPendingMarketingPreferences skips fetch without confirmed user", async () => {
    const { isAuthStateReady, getCachedAuthUser } = await import("@/lib/supabase");
    vi.mocked(isAuthStateReady).mockReturnValue(true);
    vi.mocked(getCachedAuthUser).mockReturnValue(null);
    vi.mocked(sessionStorage.getItem).mockReturnValue(
      JSON.stringify({ optIn: true, google: false, ts: 1 }),
    );

    await flushPendingMarketingPreferences();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("flushPendingMarketingPreferences skips fetch without session", async () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(
      JSON.stringify({ optIn: true, google: false, ts: 1 }),
    );
    await mockConfirmedUser(null);

    await flushPendingMarketingPreferences();
    expect(fetch).not.toHaveBeenCalled();
  });
});
