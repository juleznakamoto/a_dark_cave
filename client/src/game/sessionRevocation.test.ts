import { describe, expect, it } from "vitest";
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";
import { refreshResultMeansSessionRevoked } from "./sessionRevocation";

const session = { access_token: "tok", refresh_token: "ref" };

describe("refreshResultMeansSessionRevoked", () => {
  it("keeps the login when the refresh failed because the network failed", () => {
    const offline = new AuthRetryableFetchError("Failed to fetch", 0);
    const gateway = new AuthRetryableFetchError("Gateway timeout", 504);
    expect(isAuthRetryableFetchError(offline)).toBe(true);
    expect(isAuthRetryableFetchError(gateway)).toBe(true);
    expect(
      refreshResultMeansSessionRevoked({ session: null, error: offline }),
    ).toBe(false);
    expect(
      refreshResultMeansSessionRevoked({ session: null, error: gateway }),
    ).toBe(false);
  });

  it("treats a rejected refresh token as signed out", () => {
    const rejected = new AuthApiError(
      "Invalid Refresh Token",
      400,
      "refresh_token_already_used",
    );
    expect(isAuthRetryableFetchError(rejected)).toBe(false);
    expect(
      refreshResultMeansSessionRevoked({ session: null, error: rejected }),
    ).toBe(true);
    expect(
      refreshResultMeansSessionRevoked({
        session: null,
        error: new AuthSessionMissingError(),
      }),
    ).toBe(true);
    expect(
      refreshResultMeansSessionRevoked({ session: null, error: null }),
    ).toBe(true);
  });

  it("keeps a session that refreshed", () => {
    expect(
      refreshResultMeansSessionRevoked({ session, error: null }),
    ).toBe(false);
  });
});
