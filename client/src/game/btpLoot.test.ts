import { describe, expect, it } from "vitest";
import { btpLootAmount } from "./btpLoot";

describe("btpLootAmount", () => {
  it("keeps the web amount when BTP is off", () => {
    expect(btpLootAmount(250, { BTP: 0 })).toBe(250);
    expect(btpLootAmount(250, {})).toBe(250);
  });

  it("doubles the amount in Steam BTP mode", () => {
    expect(btpLootAmount(250, { BTP: 1 })).toBe(500);
    expect(btpLootAmount(50, { BTP: 1 })).toBe(100);
  });
});
