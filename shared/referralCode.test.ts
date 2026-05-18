import { describe, it, expect } from "vitest";
import {
  REFERRAL_CODE_CHARS,
  REFERRAL_CODE_LENGTH,
  generateReferralCode,
  normalizeReferralCode,
  parseRefParam,
  isUuidReferralCode,
} from "./referralCode";

describe("generateReferralCode", () => {
  it("returns a code of the configured length", () => {
    const code = generateReferralCode(() => 0);
    expect(code).toHaveLength(REFERRAL_CODE_LENGTH);
  });

  it("uses only allowed characters", () => {
    const code = generateReferralCode(() => 0.99);
    for (const ch of code) {
      expect(REFERRAL_CODE_CHARS).toContain(ch);
    }
  });
});

describe("normalizeReferralCode", () => {
  it("uppercases valid codes", () => {
    expect(normalizeReferralCode("ab3k9m")).toBe("AB3K9M");
  });

  it("rejects wrong length", () => {
    expect(normalizeReferralCode("ABC")).toBeNull();
    expect(normalizeReferralCode("ABCDEFG")).toBeNull();
  });

  it("rejects ambiguous or invalid characters", () => {
    expect(normalizeReferralCode("0O1IL2")).toBeNull();
    expect(normalizeReferralCode("ABCD0F")).toBeNull();
  });
});

describe("parseRefParam", () => {
  const legacyUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("returns null for empty input", () => {
    expect(parseRefParam(null)).toBeNull();
    expect(parseRefParam("")).toBeNull();
    expect(parseRefParam("   ")).toBeNull();
  });

  it("passes through legacy UUID refs", () => {
    expect(parseRefParam(legacyUuid)).toBe(legacyUuid);
    expect(isUuidReferralCode(legacyUuid)).toBe(true);
  });

  it("normalizes short refs", () => {
    expect(parseRefParam("ab3k9m")).toBe("AB3K9M");
  });

  it("rejects invalid refs", () => {
    expect(parseRefParam("not-a-valid-code")).toBeNull();
  });
});
