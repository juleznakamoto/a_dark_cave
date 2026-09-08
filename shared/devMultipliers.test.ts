import { describe, expect, it } from "vitest";
import {
  accountHasDevMultipliers,
  accountHasSteamMode,
  BUILT_IN_DEV_MULTIPLIER_EMAILS,
  BUILT_IN_STEAM_MODE_EMAILS,
  hasDevMultipliersAppMetadata,
  isEmailOnAllowlist,
  parseEmailAllowlist,
} from "./devMultipliers";

describe("dev multiplier account helpers", () => {
  it("includes the live playtest account on the built-in allowlists", () => {
    expect(BUILT_IN_DEV_MULTIPLIER_EMAILS).toContain(
      "adcplay6acee6b4@uberip.com",
    );
    expect(BUILT_IN_STEAM_MODE_EMAILS).toContain(
      "adcplay6acee6b4@uberip.com",
    );
    expect(
      accountHasSteamMode({
        email: "adcplay6acee6b4@uberip.com",
        allowlist: new Set(BUILT_IN_STEAM_MODE_EMAILS),
      }),
    ).toBe(true);
  });

  it("parses a comma-separated email allowlist", () => {
    expect(
      [...parseEmailAllowlist(" A@B.com, c@d.com ,, ")].sort(),
    ).toEqual(["a@b.com", "c@d.com"]);
  });

  it("matches emails case-insensitively", () => {
    const allowlist = parseEmailAllowlist("tester@example.com");
    expect(isEmailOnAllowlist("Tester@Example.com", allowlist)).toBe(true);
    expect(isEmailOnAllowlist("other@example.com", allowlist)).toBe(false);
    expect(isEmailOnAllowlist("  ", allowlist)).toBe(false);
  });

  it("reads the app_metadata flag", () => {
    expect(hasDevMultipliersAppMetadata({ dev_multipliers: true })).toBe(true);
    expect(hasDevMultipliersAppMetadata({ dev_multipliers: false })).toBe(false);
    expect(hasDevMultipliersAppMetadata({})).toBe(false);
    expect(hasDevMultipliersAppMetadata(null)).toBe(false);
  });

  it("enables from metadata or the email allowlist", () => {
    const allowlist = parseEmailAllowlist("live@example.com");
    expect(
      accountHasDevMultipliers({
        email: "other@example.com",
        appMetadata: { dev_multipliers: true },
        allowlist,
      }),
    ).toBe(true);
    expect(
      accountHasDevMultipliers({
        email: "live@example.com",
        appMetadata: {},
        allowlist,
      }),
    ).toBe(true);
    expect(
      accountHasDevMultipliers({
        email: "other@example.com",
        appMetadata: {},
        allowlist,
      }),
    ).toBe(false);
  });
});
