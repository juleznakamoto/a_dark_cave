import { describe, it, expect } from "vitest";
import { formatNumber, formatPrice, formatSignedNumber } from "./utils";

describe("formatNumber", () => {
  it("uses apostrophe thousands separator", () => {
    expect(formatNumber(2148028)).toBe("2'148'028");
    expect(formatNumber(50000)).toBe("50'000");
    expect(formatNumber(500)).toBe("500");
  });

  it("handles negatives and decimals", () => {
    expect(formatNumber(-1234)).toBe("-1'234");
    expect(formatNumber(1234.5)).toBe("1'234.5");
  });
});

describe("formatSignedNumber", () => {
  it("prefixes positive values", () => {
    expect(formatSignedNumber(83)).toBe("+83");
    expect(formatSignedNumber(-567)).toBe("-567");
  });
});

describe("formatPrice", () => {
  it("uses apostrophe for large amounts", () => {
    expect(formatPrice(12345678, "EUR")).toBe("123'456.78 €");
  });
});
