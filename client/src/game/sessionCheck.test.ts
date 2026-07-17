import { describe, expect, it } from "vitest";
import {
  classifySessionCheckFailure,
  isTransientSessionCheckError,
} from "./sessionCheck";

describe("isTransientSessionCheckError", () => {
  it("treats AuthRetryableFetchError as transient", () => {
    expect(
      isTransientSessionCheckError({
        name: "AuthRetryableFetchError",
        message: "fetch failed",
      }),
    ).toBe(true);
  });

  it("treats network / timeout messages as transient", () => {
    expect(isTransientSessionCheckError(new TypeError("Failed to fetch"))).toBe(
      true,
    );
    expect(
      isTransientSessionCheckError({ message: "Request timed out" }),
    ).toBe(true);
  });

  it("treats 5xx / 429 / 408 as transient", () => {
    expect(isTransientSessionCheckError({ status: 503 })).toBe(true);
    expect(isTransientSessionCheckError({ status: 429 })).toBe(true);
    expect(isTransientSessionCheckError({ status: 408 })).toBe(true);
  });

  it("treats refresh_token_already_used as transient (same-user race)", () => {
    expect(
      isTransientSessionCheckError({
        name: "AuthApiError",
        code: "refresh_token_already_used",
        status: 400,
      }),
    ).toBe(true);
  });

  it("treats session expiry / not found as non-transient", () => {
    expect(
      isTransientSessionCheckError({
        name: "AuthApiError",
        code: "session_expired",
        status: 400,
      }),
    ).toBe(false);
    expect(
      isTransientSessionCheckError({
        name: "AuthApiError",
        code: "session_not_found",
        status: 400,
      }),
    ).toBe(false);
  });
});

describe("classifySessionCheckFailure", () => {
  it("classifies transient errors as transient", () => {
    expect(
      classifySessionCheckFailure({ status: 502 }, null),
    ).toBe("transient");
  });

  it("classifies hard auth errors as reauth", () => {
    expect(
      classifySessionCheckFailure(
        { code: "session_not_found", status: 400 },
        null,
      ),
    ).toBe("reauth");
  });

  it("classifies missing session with no error as reauth (storage cleared)", () => {
    expect(classifySessionCheckFailure(null, null)).toBe("reauth");
  });
});
