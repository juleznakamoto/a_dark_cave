import { describe, it, expect } from "vitest";
import { extractCombatResultSummary } from "./stateHelpers";

describe("extractCombatResultSummary", () => {
  it("unwraps _combatSummary from defeat state updates", () => {
    const summary = extractCombatResultSummary({
      story: { seen: { firstWaveDefeat: true } },
      _combatSummary: {
        casualties: 2,
        madnessGain: 1,
      },
    });

    expect(summary).toEqual({
      casualties: 2,
      madnessGain: 1,
    });
  });

  it("returns a flat summary unchanged", () => {
    const flat = { casualties: 0, madnessGain: 1 };
    expect(extractCombatResultSummary(flat)).toBe(flat);
  });

  it("returns an empty object for nullish input", () => {
    expect(extractCombatResultSummary(null)).toEqual({});
    expect(extractCombatResultSummary(undefined)).toEqual({});
  });
});
