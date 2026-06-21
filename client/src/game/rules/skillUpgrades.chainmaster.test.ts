import { describe, it, expect } from "vitest";
import { chainmasterUpgradeDisgustMs } from "./skillUpgrades";

describe("chainmasterUpgradeDisgustMs", () => {
  it("returns base minutes in normal mode", () => {
    expect(chainmasterUpgradeDisgustMs(10, false)).toBe(10 * 60 * 1000);
  });

  it("adds 10 minutes in cruel mode", () => {
    expect(chainmasterUpgradeDisgustMs(10, true)).toBe(20 * 60 * 1000);
  });
});
