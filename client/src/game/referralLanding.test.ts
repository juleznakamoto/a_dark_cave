/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import {
  LANDING_REFERRAL_CODE_KEY,
  clearLandingReferralCode,
  getLandingReferralCode,
  persistLandingReferralCode,
  readLandingReferralCode,
} from "./referralLanding";

describe("referralLanding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists the first valid ?ref= and ignores later codes", () => {
    expect(persistLandingReferralCode("?ref=ab3k9m")).toBe("AB3K9M");
    expect(persistLandingReferralCode("?ref=XY2Z4W")).toBe("AB3K9M");
    expect(localStorage.getItem(LANDING_REFERRAL_CODE_KEY)).toBe("AB3K9M");
  });

  it("ignores invalid codes", () => {
    expect(persistLandingReferralCode("?ref=!!!")).toBeNull();
    expect(readLandingReferralCode()).toBeNull();
  });

  it("reads a stored code when the URL no longer has ref", () => {
    persistLandingReferralCode("?ref=AB3K9M");
    expect(getLandingReferralCode("")).toBe("AB3K9M");
    clearLandingReferralCode();
    expect(getLandingReferralCode("")).toBeNull();
  });
});
