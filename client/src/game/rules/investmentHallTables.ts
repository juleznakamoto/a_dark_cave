import type { GameState } from "@shared/schema";

export type InvestmentTier = "A" | "B" | "C" | "D";
export type InvestmentDurationMin = 10 | 30 | 60;

const DURATION_ORDER: InvestmentDurationMin[] = [10, 30, 60];

export function durationIndex(durationMin: InvestmentDurationMin): number {
  return DURATION_ORDER.indexOf(durationMin);
}

/** Success chance % before luck; [tier][durationIndex] */
export const SUCCESS_PCT: Record<
  InvestmentTier,
  [number, number, number]
> = {
  A: [60, 65, 70],
  B: [50, 55, 60],
  C: [40, 45, 50],
  D: [30, 35, 40],
};

/** Win % min/max on success; [tier][durationIndex] */
export const WIN_PCT_RANGE: Record<
  InvestmentTier,
  [readonly [number, number], readonly [number, number], readonly [number, number]]
> = {
  A: [
    [0, 10],
    [2.5, 10],
    [5, 10],
  ],
  B: [
    [10, 20],
    [12.5, 20],
    [15, 20],
  ],
  C: [
    [20, 40],
    [22.5, 40],
    [25, 40],
  ],
  D: [
    [40, 60],
    [42.5, 60],
    [45, 60],
  ],
};

/** Loss % range on failure (not total loss); [min, max] inclusive int */
export const LOSS_PCT_RANGE: Record<InvestmentTier, readonly [number, number]> =
{
  A: [0, 5],
  B: [10, 15],
  C: [15, 25],
  D: [25, 35],
};

/** Jackpot: [chance %, multiplier on winPercentInt] */
export const JACKPOT: Record<InvestmentTier, readonly [number, number]> = {
  A: [2, 5],
  B: [3, 4],
  C: [4, 3],
  D: [5, 2],
};

/** Total loss chance % on failure */
export const TOTAL_LOSS_PCT: Record<InvestmentTier, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

export function getLuckWinChanceBonus(luck: number): number {
  if (luck >= 50) return 10;
  if (luck >= 40) return 7.5;
  if (luck >= 30) return 5;
  if (luck >= 20) return 2.5;
  if (luck >= 10) return 1;
  return 0;
}

/** Inclusive integer range from fractional min/max (at least one value). */
export function winPercentInclusiveRange(
  tier: InvestmentTier,
  durationMin: InvestmentDurationMin,
): { from: number; to: number } {
  const idx = durationIndex(durationMin);
  const [min, max] = WIN_PCT_RANGE[tier][idx];
  const from = Math.ceil(min);
  const to = Math.floor(max);
  if (from <= to) return { from, to };
  return { from: Math.round(min), to: Math.round(max) };
}

export function lossPercentInclusiveRange(
  tier: InvestmentTier,
): { from: number; to: number } {
  const [min, max] = LOSS_PCT_RANGE[tier];
  const from = Math.ceil(min);
  const to = Math.floor(max);
  if (from <= to) return { from, to };
  return { from: Math.round(min), to: Math.round(max) };
}

/** Uniform int in [from, to] inclusive; rng in [0,1) */
export function randomIntInclusive(
  from: number,
  to: number,
  rng: () => number,
): number {
  if (to < from) return from;
  const span = to - from + 1;
  return from + Math.floor(rng() * span);
}

export function clampSuccessChance(pct: number): number {
  return Math.min(95, Math.max(0, pct));
}

export function getSuccessChancePercent(
  tier: InvestmentTier,
  durationMin: InvestmentDurationMin,
  luck: number,
): number {
  const idx = durationIndex(durationMin);
  const base = SUCCESS_PCT[tier][idx];
  return clampSuccessChance(base + getLuckWinChanceBonus(luck));
}

export function getInvestmentDurationScale(): number {
  return import.meta.env.DEV ? 1 / 20 : 1;
}

export function nominalDurationToPlayTimeMs(durationMin: InvestmentDurationMin): number {
  return durationMin * 60 * 1000 * getInvestmentDurationScale();
}

export const INVESTMENT_WAVE_GAP_MS = 30 * 60 * 1000;

export type InvestmentOffer = {
  durationMin: InvestmentDurationMin;
  tier: InvestmentTier;
};

/** One random tier per duration slot (10 / 30 / 60). */
export function generateInvestmentOffers(rng: () => number): InvestmentOffer[] {
  const tiers: InvestmentTier[] = ["A", "B", "C", "D"];
  return DURATION_ORDER.map((durationMin) => ({
    durationMin,
    tier: tiers[Math.floor(rng() * 4)] as InvestmentTier,
  }));
}

export type InvestmentActive = NonNullable<
  GameState["investmentHallState"]["active"]
>;

export type CommitInvestmentInput = {
  playTime: number;
  amountGold: number;
  offer: InvestmentOffer;
  luck: number;
  rng: () => number;
};

export type CommitInvestmentResult = { ok: true; active: InvestmentActive };

export function formatInvestmentCompletionLog(active: InvestmentActive): string {
  if (active.success) {
    const jp = active.jackpotHit ? " Jackpot!" : "";
    return `Investment complete: success.${jp} Received ${active.payoutGold} gold (tier ${active.tier}, ${active.durationMin} min).`;
  }
  if (active.totalLoss) {
    return `Investment complete: failure. Total loss of ${active.amountGold} gold (tier ${active.tier}).`;
  }
  const lp = active.lossPercentInt ?? 0;
  return `Investment complete: failure. Recovered ${active.payoutGold} gold from ${active.amountGold} staked (tier ${active.tier}, ${lp}% loss).`;
}

export function getMaxInvestmentStake(state: {
  buildings: Pick<
    GameState["buildings"],
    "coinhouse" | "bank" | "treasury"
  >;
}): number {
  if (state.buildings.treasury > 0) return 1000;
  if (state.buildings.bank > 0) return 500;
  if (state.buildings.coinhouse > 0) return 100;
  return 0;
}

/**
 * Build active investment from rolls at commit. Stake already deducted by caller.
 */
export function commitInvestmentRolls(
  input: CommitInvestmentInput,
): CommitInvestmentResult {
  const { playTime, amountGold, offer, luck, rng } = input;
  const { tier, durationMin } = offer;
  const successChance = getSuccessChancePercent(tier, durationMin, luck);
  const successRoll = rng() * 100;
  const success = successRoll < successChance;

  const endPlayTime =
    playTime + nominalDurationToPlayTimeMs(durationMin);

  if (success) {
    const { from, to } = winPercentInclusiveRange(tier, durationMin);
    const winPercentInt = randomIntInclusive(from, to, rng);
    const [jpChance, jpMult] = JACKPOT[tier];
    const jackpotHit = rng() * 100 < jpChance;
    const effectiveWinPercent = jackpotHit
      ? winPercentInt * jpMult
      : winPercentInt;
    const payoutGold =
      amountGold + Math.floor((amountGold * effectiveWinPercent) / 100);

    return {
      ok: true,
      active: {
        startPlayTime: playTime,
        endPlayTime,
        amountGold,
        durationMin,
        tier,
        success: true,
        winPercentInt,
        jackpotHit,
        effectiveWinPercent,
        payoutGold,
      },
    };
  }

  const totalLossPct = TOTAL_LOSS_PCT[tier];
  const totalLossRoll = rng() * 100;
  const totalLoss = totalLossRoll < totalLossPct;

  if (totalLoss) {
    return {
      ok: true,
      active: {
        startPlayTime: playTime,
        endPlayTime,
        amountGold,
        durationMin,
        tier,
        success: false,
        totalLoss: true,
        payoutGold: 0,
      },
    };
  }

  const { from, to } = lossPercentInclusiveRange(tier);
  const lossPercentInt = randomIntInclusive(from, to, rng);
  const payoutGold = Math.floor((amountGold * (100 - lossPercentInt)) / 100);

  return {
    ok: true,
    active: {
      startPlayTime: playTime,
      endPlayTime,
      amountGold,
      durationMin,
      tier,
      success: false,
      totalLoss: false,
      lossPercentInt,
      payoutGold,
    },
  };
}
