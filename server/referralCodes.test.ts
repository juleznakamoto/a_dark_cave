import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveReferrerUserId,
  getOrCreateReferralCode,
} from "./referralCodes";

function mockAdminClient(handlers: {
  referralCodesSelect?: (args: { column: string; value: string }) => unknown;
  referralCodesInsert?: (row: { user_id: string; code: string }) => unknown;
}) {
  const from = vi.fn((table: string) => {
    if (table !== "referral_codes") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn((column: string, value: string) => ({
          maybeSingle: vi.fn(async () => {
            if (handlers.referralCodesSelect) {
              return handlers.referralCodesSelect({ column, value });
            }
            return { data: null, error: null };
          }),
        })),
      })),
      insert: vi.fn((row: { user_id: string; code: string }) => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => {
            if (handlers.referralCodesInsert) {
              return handlers.referralCodesInsert(row);
            }
            return { data: { code: row.code }, error: null };
          }),
        })),
      })),
    };
  });

  return { from } as unknown as SupabaseClient;
}

describe("resolveReferrerUserId", () => {
  it("resolves legacy UUID refs without a DB lookup", async () => {
    const client = mockAdminClient({});
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = await resolveReferrerUserId(client, uuid);
    expect(result).toEqual({ userId: uuid });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("looks up short codes in referral_codes", async () => {
    const client = mockAdminClient({
      referralCodesSelect: ({ column, value }) => {
        expect(column).toBe("code");
        expect(value).toBe("AB3K9M");
        return {
          data: { user_id: "referrer-uuid" },
          error: null,
        };
      },
    });
    const result = await resolveReferrerUserId(client, "ab3k9m");
    expect(result).toEqual({ userId: "referrer-uuid" });
  });

  it("returns invalid_code for malformed refs", async () => {
    const client = mockAdminClient({});
    expect(await resolveReferrerUserId(client, "bad")).toEqual({
      error: "invalid_code",
    });
  });

  it("returns referrer_not_found when code is unknown", async () => {
    const client = mockAdminClient({
      referralCodesSelect: () => ({ data: null, error: null }),
    });
    expect(await resolveReferrerUserId(client, "AB3K9M")).toEqual({
      error: "referrer_not_found",
    });
  });
});

describe("getOrCreateReferralCode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an existing code", async () => {
    const client = mockAdminClient({
      referralCodesSelect: ({ column, value }) => {
        if (column === "user_id" && value === "user-1") {
          return { data: { code: "XY2Z4W" }, error: null };
        }
        return { data: null, error: null };
      },
    });
    await expect(getOrCreateReferralCode(client, "user-1")).resolves.toBe(
      "XY2Z4W",
    );
  });

  it("inserts a new code when none exists", async () => {
    let selectCalls = 0;
    const client = mockAdminClient({
      referralCodesSelect: ({ column }) => {
        selectCalls++;
        if (column === "user_id" && selectCalls === 1) {
          return { data: null, error: null };
        }
        return { data: null, error: null };
      },
      referralCodesInsert: (row) => {
        expect(row.user_id).toBe("user-2");
        expect(row.code).toHaveLength(6);
        return { data: { code: row.code }, error: null };
      },
    });
    const code = await getOrCreateReferralCode(client, "user-2");
    expect(code).toHaveLength(6);
  });
});
