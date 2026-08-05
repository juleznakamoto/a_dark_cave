import { describe, it, expect } from "vitest";
import {
  abbreviateNumber,
  formatCompactDuration,
  formatExecutionDuration,
  formatNumber,
  formatPrice,
  formatSignedNumber,
  formatThousandsInLogText,
} from "./utils";

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

describe("abbreviateNumber", () => {
  it("abbreviates values from 1000 upward", () => {
    expect(abbreviateNumber(999)).toBe("999");
    expect(abbreviateNumber(1000)).toBe("1K");
    expect(abbreviateNumber(1500)).toBe("1'5K");
    expect(abbreviateNumber(25000)).toBe("25K");
    expect(abbreviateNumber(-3200)).toBe("-3'2K");
  });
});

describe("formatSignedNumber", () => {
  it("prefixes positive values", () => {
    expect(formatSignedNumber(83)).toBe("+83");
    expect(formatSignedNumber(-567)).toBe("-567");
  });
});

describe("formatThousandsInLogText", () => {
  it("formats bare integers of four or more digits", () => {
    expect(
      formatThousandsInLogText(
        "You gained 660 Focus from your rest. Villagers produced: Food: +5543",
      ),
    ).toBe(
      "You gained 660 Focus from your rest. Villagers produced: Food: +5'543",
    );
    expect(formatThousandsInLogText("You lost 10000 gold")).toBe(
      "You lost 10'000 gold",
    );
  });

  it("does not double-format numbers that already use apostrophes", () => {
    expect(formatThousandsInLogText("Food: +5'543")).toBe("Food: +5'543");
  });
});

describe("formatPrice", () => {
  it("uses apostrophe for large amounts", () => {
    expect(formatPrice(12345678, "EUR")).toBe("123'456.78 €");
  });
});

describe("formatCompactDuration", () => {
  it("formats as Xm Ys, or Xs when under one minute", () => {
    expect(formatCompactDuration(90)).toBe("1m 30s");
    expect(formatCompactDuration(45)).toBe("45s");
    expect(formatCompactDuration(5)).toBe("5s");
    expect(formatCompactDuration(0)).toBe("0s");
  });

  it("ceils by default and can round", () => {
    expect(formatCompactDuration(61.1)).toBe("1m 2s");
    expect(formatCompactDuration(61.1, "round")).toBe("1m 1s");
  });
});

describe("formatExecutionDuration", () => {
  it("rounds to compact Xm Ys / Xs", () => {
    expect(formatExecutionDuration(90)).toBe("1m 30s");
    expect(formatExecutionDuration(45)).toBe("45s");
    expect(formatExecutionDuration(5)).toBe("5s");
    expect(formatExecutionDuration(3.75)).toBe("4s");
    expect(formatExecutionDuration(0.5)).toBe("1s");
  });
});
