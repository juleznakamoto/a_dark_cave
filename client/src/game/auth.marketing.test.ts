import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  PENDING_MARKETING_OPT_IN_KEY,
  setPendingMarketingOptInFromSignup,
  flushPendingMarketingPreferences,
} from "./auth";

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

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

    const { getSupabaseClient } = await import("@/lib/supabase");
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: { access_token: "jwt-test" },
          },
        }),
      },
    } as any);

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

    const { getSupabaseClient } = await import("@/lib/supabase");
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "t" } },
        }),
      },
    } as any);

    await flushPendingMarketingPreferences();

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((init?.body as string) ?? "{}");
    expect(body.consent_source).toBe("email_signup");
    expect(body.marketing_opt_in).toBe(false);
  });

  it("flushPendingMarketingPreferences skips fetch without session", async () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(
      JSON.stringify({ optIn: true, google: false, ts: 1 }),
    );

    const { getSupabaseClient } = await import("@/lib/supabase");
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    } as any);

    await flushPendingMarketingPreferences();
    expect(fetch).not.toHaveBeenCalled();
  });
});
