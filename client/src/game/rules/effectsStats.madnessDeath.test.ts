import { describe, expect, it } from "vitest";
import { rollMadnessDeathCount } from "./effectsStats";

describe("rollMadnessDeathCount", () => {
  it("kills one villager in normal mode below Madness 21", () => {
    expect(rollMadnessDeathCount(20, false, () => 0.99)).toBe(1);
    expect(rollMadnessDeathCount(11, false, () => 0)).toBe(1);
  });

  it("rolls 1 to 4 deaths in normal mode at Madness 21", () => {
    expect(rollMadnessDeathCount(21, false, () => 0)).toBe(1);
    expect(rollMadnessDeathCount(21, false, () => 0.69)).toBe(1);
    expect(rollMadnessDeathCount(21, false, () => 0.7)).toBe(2);
    expect(rollMadnessDeathCount(21, false, () => 0.8)).toBe(3);
    expect(rollMadnessDeathCount(21, false, () => 0.95)).toBe(4);
  });

  it("can kill more than one in cruel mode below Madness 21", () => {
    expect(rollMadnessDeathCount(6, true, () => 0.99)).toBe(4);
    expect(rollMadnessDeathCount(20, true, () => 0)).toBe(1);
  });
});
