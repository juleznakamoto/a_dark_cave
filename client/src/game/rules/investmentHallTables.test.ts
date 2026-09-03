import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  buildInvestmentResultDialogPayload,
  getInvestmentResultDialogBodyMeta,
  clampSuccessChance,
  commitInvestmentRolls,
  formatInvestmentCompletionLog,
  getLuckWinChanceBonus,
  getLuckyChancePercent,
  getSuccessChancePercent,
  investmentHallLuckyChanceBonusPct,
  isInvestmentWaveReadyForUi,
  getLossPercent,
  getWinPercent,
  luckyChanceSuccessProfitGold,
  lossGold,
  randomIntInclusive,
  successProfitGold,
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
    const p = getSuccessChancePercent("A", 15, 50);
    expect(p).toBe(90);
  });

  it("subtracts cruel mode penalty (percentage points) after luck", () => {
    expect(getSuccessChancePercent("A", 15, 50, true)).toBe(85);
    expect(getSuccessChancePercent("A", 15, 0, true)).toBe(75);
  });
});

describe("clampSuccessChance", () => {
  it("caps at 95%", () => {
    expect(clampSuccessChance(120)).toBe(95);
  });
});

describe("getWinPercent / getLossPercent", () => {
  it("returns a single percent per offer", () => {
    expect(getWinPercent("A", 10)).toBe(15);
    expect(getLossPercent("A")).toBe(5);
    expect(getLossPercent("B")).toBe(15);
  });
});

describe("successProfitGold / luckyChanceSuccessProfitGold / lossGold", () => {
  it("converts the fixed percent to gold", () => {
    expect(successProfitGold(100, "A", 10)).toBe(15);
    expect(luckyChanceSuccessProfitGold(100, "A", 10)).toBe(60);
    expect(successProfitGold(1000, "A", 15)).toBe(200);
    expect(luckyChanceSuccessProfitGold(1000, "A", 15)).toBe(800);
    expect(lossGold(100, "B")).toBe(15);
  });
});

describe("isInvestmentWaveReadyForUi", () => {
  const threeOffers = [
    { durationMin: 5 as const, tier: "A" as const },
    { durationMin: 10 as const, tier: "B" as const },
    { durationMin: 15 as const, tier: "C" as const },
  ];

  it("false when investment active", () => {
    expect(
      isInvestmentWaveReadyForUi({
        playTime: 100,
        investmentHallState: {
          offers: threeOffers,
          active: {
            startPlayTime: 0,
            endPlayTime: 500,
            amountGold: 100,
            durationMin: 5,
            tier: "A",
            success: true,
            payoutGold: 105,
          },
          nextWavePlayTime: 0,
        },
      }),
    ).toBe(false);
  });

  it("false before next wave", () => {
    expect(
      isInvestmentWaveReadyForUi({
        playTime: 100,
        investmentHallState: {
          offers: [],
          active: null,
          nextWavePlayTime: 500,
        },
      }),
    ).toBe(false);
  });

  it("false with fewer than 3 offers", () => {
    expect(
      isInvestmentWaveReadyForUi({
        playTime: 500,
        investmentHallState: {
          offers: threeOffers.slice(0, 2),
          active: null,
          nextWavePlayTime: 0,
        },
      }),
    ).toBe(false);
  });

  it("true when idle, wave ready, and 3 offers", () => {
    expect(
      isInvestmentWaveReadyForUi({
        playTime: 500,
        investmentHallState: {
          offers: threeOffers,
          active: null,
          nextWavePlayTime: 0,
        },
      }),
    ).toBe(true);
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
  it("success path uses integer win and Lucky Chance ×4", () => {
    let n = 0;
    // success: 30 < 65; A 5 min win is 10%; lucky 0.005*100 < 2% base → hit
    const rng = () => [0.3, 0.005][n++] ?? 0;
    const r = commitInvestmentRolls({
      playTime: 0,
      amountGold: 100,
      offer: { durationMin: 5, tier: "A" },
      luck: 0,
      luckyChanceBonusPct: 0,
      rng,
    });
    expect(r.ok).toBe(true);
    expect(r.active.success).toBe(true);
    expect(r.active.winPercentInt).toBe(10);
    expect(r.active.luckyChanceHit).toBe(true);
    expect(r.active.effectiveWinPercent).toBe(40);
    expect(r.active.payoutGold).toBe(140);
  });

  it("failure is always a partial loss", () => {
    let n = 0;
    // 0.99 → fail (B 5 min is 55%); B loss is 15%
    const rng = () => [0.99][n++] ?? 0;
    const r = commitInvestmentRolls({
      playTime: 0,
      amountGold: 100,
      offer: { durationMin: 5, tier: "B" },
      luck: 0,
      luckyChanceBonusPct: 0,
      rng,
    });
    expect(r.active.success).toBe(false);
    expect(r.active.totalLoss).toBeUndefined();
    expect(r.active.lossPercentInt).toBe(15);
    expect(r.active.payoutGold).toBe(85);
  });

  it("Bank lucky bonus (+2%) widens Lucky Chance roll vs coinhouse only", () => {
    const makeRng = () => {
      let n = 0;
      // Coinhouse 2%: 2.5 < 2 miss; Bank 4%: 2.5 < 4 hit
      return () => [0.3, 0.025][n++] ?? 0;
    };
    const coinhouseOnly = commitInvestmentRolls({
      playTime: 0,
      amountGold: 100,
      offer: { durationMin: 5, tier: "A" },
      luck: 0,
      luckyChanceBonusPct: 0,
      rng: makeRng(),
    });
    const withBank = commitInvestmentRolls({
      playTime: 0,
      amountGold: 100,
      offer: { durationMin: 5, tier: "A" },
      luck: 0,
      luckyChanceBonusPct: 2,
      rng: makeRng(),
    });
    expect(coinhouseOnly.active.luckyChanceHit).toBe(false);
    expect(withBank.active.luckyChanceHit).toBe(true);
  });
});

describe("getLuckyChancePercent", () => {
  it("is 2 / 4 / 6 by hall level and the same for every offer", () => {
    expect(getLuckyChancePercent({})).toBe(0);
    expect(getLuckyChancePercent({ coinhouse: 1 })).toBe(2);
    expect(getLuckyChancePercent({ coinhouse: 1, bank: 1 })).toBe(4);
    expect(getLuckyChancePercent({ coinhouse: 1, bank: 1, treasury: 1 })).toBe(
      6,
    );
    expect(investmentHallLuckyChanceBonusPct({ coinhouse: 1 })).toBe(0);
    expect(investmentHallLuckyChanceBonusPct({ coinhouse: 1, bank: 1 })).toBe(2);
    expect(
      investmentHallLuckyChanceBonusPct({
        coinhouse: 1,
        bank: 1,
        treasury: 1,
      }),
    ).toBe(4);
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

describe("buildInvestmentResultDialogPayload", () => {
  it("maps success, lucky chance, and partial loss", () => {
    expect(
      buildInvestmentResultDialogPayload({
        startPlayTime: 0,
        endPlayTime: 1,
        amountGold: 100,
        durationMin: 5,
        tier: "A",
        success: true,
        winPercentInt: 5,
        luckyChanceHit: false,
        effectiveWinPercent: 5,
        payoutGold: 105,
      }),
    ).toMatchObject({ kind: "success", goldDelta: 5 });

    expect(
      buildInvestmentResultDialogPayload({
        startPlayTime: 0,
        endPlayTime: 1,
        amountGold: 100,
        durationMin: 5,
        tier: "A",
        success: true,
        winPercentInt: 5,
        luckyChanceHit: true,
        effectiveWinPercent: 20,
        payoutGold: 120,
      }),
    ).toMatchObject({ kind: "lucky_chance", goldDelta: 20 });

    expect(
      buildInvestmentResultDialogPayload({
        startPlayTime: 0,
        endPlayTime: 1,
        amountGold: 100,
        durationMin: 5,
        tier: "A",
        success: false,
        totalLoss: false,
        lossPercentInt: 20,
        payoutGold: 80,
      }),
    ).toMatchObject({ kind: "partial_loss", goldDelta: -20 });

    expect(
      buildInvestmentResultDialogPayload({
        startPlayTime: 0,
        endPlayTime: 1,
        amountGold: 100,
        durationMin: 5,
        tier: "A",
        success: false,
        totalLoss: true,
        payoutGold: 0,
      }),
    ).toMatchObject({ kind: "partial_loss", goldDelta: -100 });
  });

  it("maps body keys for all outcome kinds", () => {
    const success = buildInvestmentResultDialogPayload({
      startPlayTime: 0,
      endPlayTime: 1,
      amountGold: 100,
      durationMin: 5,
      tier: "A",
      success: true,
      winPercentInt: 5,
      luckyChanceHit: false,
      effectiveWinPercent: 5,
      payoutGold: 105,
    });
    expect(getInvestmentResultDialogBodyMeta(success)).toEqual({
      bodyKey: "investmentResult.success",
      bodyVars: { amount: 100 },
    });

    const lucky = buildInvestmentResultDialogPayload({
      startPlayTime: 0,
      endPlayTime: 1,
      amountGold: 100,
      durationMin: 5,
      tier: "A",
      success: true,
      winPercentInt: 5,
      luckyChanceHit: true,
      effectiveWinPercent: 20,
      payoutGold: 120,
    });
    expect(getInvestmentResultDialogBodyMeta(lucky)).toEqual({
      bodyKey: "investmentResult.luckyChance",
      bodyVars: { amount: 100, multiplier: 4 },
    });
  });
});

describe("formatInvestmentCompletionLog", () => {
  it("includes outcome text", () => {
    const s = formatInvestmentCompletionLog({
      startPlayTime: 0,
      endPlayTime: 1,
      amountGold: 100,
      durationMin: 5,
      tier: "A",
      success: true,
      winPercentInt: 5,
      luckyChanceHit: false,
      effectiveWinPercent: 5,
      payoutGold: 105,
    });
    expect(s).toContain("Success");
    expect(s).toContain("105");
  });
});
