import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hashMarketingToken,
  generateMarketingRawToken,
  CLIENT_ALLOWED_MARKETING_SOURCES,
  getPublicSiteOrigin,
  getMarketingAdminEnv,
  upsertMarketingPreferences,
  createMarketingUnsubscribeUrl,
  type MarketingConsentSource,
} from "./marketing";

describe("hashMarketingToken", () => {
  it("returns stable hex sha256 for the same input", () => {
    const a = hashMarketingToken("same-token");
    const b = hashMarketingToken("same-token");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("differs for different inputs", () => {
    expect(hashMarketingToken("a")).not.toBe(hashMarketingToken("b"));
  });
});

describe("generateMarketingRawToken", () => {
  it("returns 64 hex chars (32 bytes)", () => {
    const t = generateMarketingRawToken();
    expect(t).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("CLIENT_ALLOWED_MARKETING_SOURCES", () => {
  it("allows client signup/settings sources only", () => {
    expect(CLIENT_ALLOWED_MARKETING_SOURCES.has("email_signup")).toBe(true);
    expect(CLIENT_ALLOWED_MARKETING_SOURCES.has("google_signup")).toBe(true);
    expect(CLIENT_ALLOWED_MARKETING_SOURCES.has("settings_toggle")).toBe(true);
    expect(CLIENT_ALLOWED_MARKETING_SOURCES.has("unsubscribe_link")).toBe(
      false,
    );
  });
});

describe("getPublicSiteOrigin", () => {
  afterEach(() => {
    delete process.env.PUBLIC_SITE_URL;
    delete process.env.VITE_SITE_URL;
  });

  it("defaults to production domain when env unset", () => {
    expect(getPublicSiteOrigin()).toBe("https://a-dark-cave.com");
  });

  it("prefers PUBLIC_SITE_URL over VITE_SITE_URL", () => {
    process.env.VITE_SITE_URL = "https://wrong.example";
    process.env.PUBLIC_SITE_URL = "https://right.example/";
    expect(getPublicSiteOrigin()).toBe("https://right.example");
  });

  it("strips trailing slash", () => {
    process.env.PUBLIC_SITE_URL = "https://app.example.com/";
    expect(getPublicSiteOrigin()).toBe("https://app.example.com");
  });
});

describe("getMarketingAdminEnv", () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it("returns dev when NODE_ENV is development", () => {
    process.env.NODE_ENV = "development";
    expect(getMarketingAdminEnv()).toBe("dev");
  });

  it("returns prod otherwise", () => {
    process.env.NODE_ENV = "production";
    expect(getMarketingAdminEnv()).toBe("prod");
    process.env.NODE_ENV = "test";
    expect(getMarketingAdminEnv()).toBe("prod");
  });
});

function mockAdminClient(overrides?: {
  upsertError?: { message: string } | null;
  insertError?: { message: string } | null;
}): {
  client: SupabaseClient;
  upsert: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
} {
  const upsert = vi.fn().mockResolvedValue({ error: overrides?.upsertError ?? null });
  const insert = vi.fn().mockResolvedValue({ error: overrides?.insertError ?? null });

  const client = {
    from: vi.fn(() => ({
      upsert,
      insert,
    })),
  } as unknown as SupabaseClient;

  return { client, upsert, insert };
}

describe("upsertMarketingPreferences", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("upserts opt-in with consented_at and clears revoked_at", async () => {
    const { client, upsert } = mockAdminClient();
    await upsertMarketingPreferences(
      client,
      "user-1",
      "u@example.com",
      true,
      "settings_toggle" as MarketingConsentSource,
      1,
      1,
    );

    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, options] = upsert.mock.calls[0];
    expect(options).toEqual({ onConflict: "user_id" });
    expect(row).toMatchObject({
      user_id: "user-1",
      email: "u@example.com",
      marketing_opt_in: true,
      consent_source: "settings_toggle",
      consent_text_version: 1,
      prompt_version: 1,
      revoked_at: null,
    });
    expect(row.consented_at).toBe("2026-01-15T12:00:00.000Z");
    expect(row.updated_at).toBe("2026-01-15T12:00:00.000Z");
  });

  it("upserts opt-out with revoked_at and clears consented_at", async () => {
    const { client, upsert } = mockAdminClient();
    await upsertMarketingPreferences(
      client,
      "user-2",
      null,
      false,
      "unsubscribe_link",
      1,
      1,
    );

    const [row] = upsert.mock.calls[0];
    expect(row).toMatchObject({
      user_id: "user-2",
      email: null,
      marketing_opt_in: false,
      consent_source: "unsubscribe_link",
      consented_at: null,
    });
    expect(row.revoked_at).toBe("2026-01-15T12:00:00.000Z");
  });

  it("throws when Supabase returns error", async () => {
    const { client } = mockAdminClient({
      upsertError: { message: "rls violation" },
    });
    await expect(
      upsertMarketingPreferences(
        client,
        "u",
        null,
        true,
        "email_signup",
        1,
        1,
      ),
    ).rejects.toEqual({ message: "rls violation" });
  });
});

describe("createMarketingUnsubscribeUrl", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"));
    delete process.env.PUBLIC_SITE_URL;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("inserts hashed token and returns URL with raw token query", async () => {
    const { client, insert } = mockAdminClient();
    process.env.PUBLIC_SITE_URL = "https://test.example";

    const url = await createMarketingUnsubscribeUrl(client, "user-xyz");

    expect(insert).toHaveBeenCalledTimes(1);
    const insertArg = insert.mock.calls[0][0];
    expect(insertArg.user_id).toBe("user-xyz");
    expect(insertArg.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(insertArg.expires_at).toBeTruthy();

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://test.example/unsubscribe");
    const token = parsed.searchParams.get("token");
    expect(token).toBeTruthy();
    expect(hashMarketingToken(token!)).toBe(insertArg.token_hash);
  });

  it("throws when insert fails", async () => {
    const { client } = mockAdminClient({
      insertError: { message: "duplicate" },
    });
    await expect(
      createMarketingUnsubscribeUrl(client, "user-1"),
    ).rejects.toEqual({ message: "duplicate" });
  });
});
