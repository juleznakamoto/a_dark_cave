import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  clampSuccessChance,
  commitInvestmentRolls,
  formatInvestmentCompletionLog,
  getLuckWinChanceBonus,
  getSuccessChancePercent,
  randomIntInclusive,
  winPercentInclusiveRange,
} from "./investmentHallTables";

describe("getLuckWinChanceBonus", () => {
  it("returns highest tier only", () => {
    expect(getLuckWinChanceBonus(0)).toBe(0);
    expect(getLuckWinChanceBonus(10)).toBe(1);
    expect(getLuckWinChanceBonus(25)).toBe(2.5);
    expect(getLuckWinChanceBonus(50)).toBe(10);
  });
});

describe("getSuccessChancePercent", () => {
  it("adds highest luck tier to base success", () => {
    const p = getSuccessChancePercent("A", 60, 50);
    expect(p).toBe(80);
  });
});

describe("clampSuccessChance", () => {
  it("caps at 95%", () => {
    expect(clampSuccessChance(120)).toBe(95);
  });
});

describe("winPercentInclusiveRange", () => {
  it("handles fractional min", () => {
    const r = winPercentInclusiveRange("A", 30);
    expect(r.from).toBe(3);
    expect(r.to).toBe(10);
  });
});

describe("randomIntInclusive", () => {
  it("returns bounds with fixed rng", () => {
    let i = 0;
    const seq = [0, 0.99];
    const rng = () => seq[Math.min(i++, seq.length - 1)];
    expect(randomIntInclusive(3, 10, rng)).toBe(3);
    expect(randomIntInclusive(3, 10, () => 0.999)).toBe(10);
  });
});

describe("commitInvestmentRolls", () => {
  it("success path uses integer win and jackpot multiplier", () => {
    let n = 0;
    // 0.3*100=30 < 60 success; win int floor(0.5*11)=5; 0.01*100=1 < 2 jackpot
    const rng = () => [0.3, 0.5, 0.01][n++] ?? 0;
    const r = commitInvestmentRolls({
      playTime: 0,
      amountGold: 100,
      offer: { durationMin: 10, tier: "A" },
      luck: 0,
      rng,
    });
    expect(r.ok).toBe(true);
    expect(r.active.success).toBe(true);
    expect(r.active.winPercentInt).toBe(5);
    expect(r.active.jackpotHit).toBe(true);
    expect(r.active.effectiveWinPercent).toBe(25);
    expect(r.active.payoutGold).toBe(125);
  });

  it("failure total loss when roll below threshold", () => {
    let n = 0;
    const rng = () => [0.99, 0][n++];
    const r = commitInvestmentRolls({
      playTime: 0,
      amountGold: 100,
      offer: { durationMin: 10, tier: "B" },
      luck: 0,
      rng,
    });
    expect(r.active.success).toBe(false);
    expect(r.active.totalLoss).toBe(true);
    expect(r.active.payoutGold).toBe(0);
  });
});

describe("gameStateSchema investment hall", () => {
  it("defaults investmentHallState and new buildings", () => {
    const s = gameStateSchema.parse({});
    expect(s.investmentHallState.offers).toEqual([]);
    expect(s.investmentHallState.active).toBeNull();
    expect(s.investmentHallState.nextWavePlayTime).toBe(0);
    expect(s.buildings.coinhouse).toBe(0);
    expect(s.buildings.bank).toBe(0);
    expect(s.buildings.treasury).toBe(0);
  });
});

describe("formatInvestmentCompletionLog", () => {
  it("includes outcome text", () => {
    const s = formatInvestmentCompletionLog({
      startPlayTime: 0,
      endPlayTime: 1,
      amountGold: 100,
      durationMin: 10,
      tier: "A",
      success: true,
      winPercentInt: 5,
      jackpotHit: false,
      effectiveWinPercent: 5,
      payoutGold: 105,
    });
    expect(s).toContain("success");
    expect(s).toContain("105");
  });
});
