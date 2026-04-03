import type { GameState } from "@shared/schema";

export type InvestmentTier = "A" | "B" | "C" | "D";
export type InvestmentDurationMin = 5 | 15 | 30;

const DURATION_ORDER: InvestmentDurationMin[] = [5, 15, 30];

/**
 * Index into per-duration tables. Handles legacy persisted minutes `10` / `60`
 * (and safe fallbacks) so older saves do not yield `-1` and break table lookups.
 */
export function durationIndex(durationMin: number): number {
  const i = (DURATION_ORDER as readonly number[]).indexOf(durationMin);
  if (i !== -1) return i;
  if (durationMin === 10) return 0;
  if (durationMin === 60) return 2;
  return 0;
}

/** Success chance % before luck; [tier][durationIndex] */
export const SUCCESS_PCT: Record<
  InvestmentTier,
  [number, number, number]
> = {
  A: [65, 70, 80],
  B: [55, 60, 65],
  C: [45, 50, 55],
  D: [35, 50, 45],
};

/** Win % min/max on success; [tier][durationIndex] for 5 / 15 / 30 min */
export const WIN_PCT_RANGE: Record<
  InvestmentTier,
  [readonly [number, number], readonly [number, number], readonly [number, number]]
> = {
  A: [
    [0, 10],
    [5, 15],
    [10, 20],
  ],
  B: [
    [10, 20],
    [15, 25],
    [20, 30],
  ],
  C: [
    [20, 40],
    [25, 45],
    [30, 50],
  ],
  D: [
    [40, 60],
    [45, 65],
    [50, 70],
  ],
};

/** Loss % range on failure (not total loss); [min, max] inclusive int */
export const LOSS_PCT_RANGE: Record<InvestmentTier, readonly [number, number]> =
{
  A: [0, 10],
  B: [10, 20],
  C: [20, 30],
  D: [30, 40],
};

/** On Lucky Chance hit, rolled win % is multiplied by this factor (fixed for all tiers). */
export const LUCKY_CHANCE_WIN_MULTIPLIER = 4 as const;

/** Lucky Chance: [base chance % before hall bonus, multiplier — always {@link LUCKY_CHANCE_WIN_MULTIPLIER}]. */
export const LUCKY_CHANCE: Record<InvestmentTier, readonly [number, number]> = {
  A: [2, LUCKY_CHANCE_WIN_MULTIPLIER],
  B: [3, LUCKY_CHANCE_WIN_MULTIPLIER],
  C: [4, LUCKY_CHANCE_WIN_MULTIPLIER],
  D: [5, LUCKY_CHANCE_WIN_MULTIPLIER],
};

/** Extra Lucky Chance % from investment hall: Bank +1%, Treasury +2% (overrides Bank). Coinhouse only → 0. */
export function investmentHallLuckyChanceBonusPct(buildings: {
  bank?: number;
  treasury?: number;
}): number {
  if ((buildings.treasury ?? 0) > 0) return 2;
  if ((buildings.bank ?? 0) > 0) return 1;
  return 0;
}

export function getEffectiveLuckyChancePercent(
  baseChance: number,
  luckyBonusPct: number,
): number {
  return Math.min(100, baseChance + luckyBonusPct);
}

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
  durationMin: number,
): { from: number; to: number } {
  const idx = durationIndex(durationMin);
  const row = WIN_PCT_RANGE[tier][idx] ?? WIN_PCT_RANGE[tier][0];
  const [min, max] = row;
  const from = Math.ceil(min);
  const to = Math.floor(max);
  if (from <= to) return { from, to };
  return { from: Math.round(min), to: Math.round(max) };
}

/** Max gold profit on success using highest win % roll (no lucky multiplier). */
export function maxSuccessProfitGold(
  amountGold: number,
  tier: InvestmentTier,
  durationMin: number,
): number {
  const { to } = winPercentInclusiveRange(tier, durationMin);
  return Math.floor((amountGold * to) / 100);
}

/** Max gold profit on success if highest win % roll gets the Lucky Chance multiplier. */
export function maxLuckyChanceSuccessProfitGold(
  amountGold: number,
  tier: InvestmentTier,
  durationMin: number,
): number {
  const { to } = winPercentInclusiveRange(tier, durationMin);
  return Math.floor(
    (amountGold * to * LUCKY_CHANCE_WIN_MULTIPLIER) / 100,
  );
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
  durationMin: number,
  luck: number,
): number {
  const idx = durationIndex(durationMin);
  const base = SUCCESS_PCT[tier][idx] ?? SUCCESS_PCT[tier][0];
  return clampSuccessChance(base + getLuckWinChanceBonus(luck));
}

export function getInvestmentDurationScale(): number {
  return import.meta.env.DEV ? 1 / 20 : 1;
}

/** Wall-clock length of a nominal duration; maps legacy `10`/`60` minutes to current slot lengths. */
export function nominalDurationToPlayTimeMs(durationMin: number): number {
  const m =
    durationMin === 10 ? 5 : durationMin === 60 ? 30 : durationMin;
  return m * 60 * 1000 * getInvestmentDurationScale();
}

/** Production: 30 min between waves after an investment completes. Dev: 30 s. */
export function getInvestmentWaveGapMs(): number {
  return import.meta.env.DEV ? 30 * 1000 : 30 * 60 * 1000;
}

/** Production wave gap; persisted `nextWavePlayTime` uses {@link getInvestmentWaveGapMs} at schedule time. */
export const INVESTMENT_WAVE_GAP_MS = 30 * 60 * 1000;

export type InvestmentOffer = {
  durationMin: InvestmentDurationMin;
  tier: InvestmentTier;
};

/** One random tier per duration slot (5 / 15 / 30 min). */
export function generateInvestmentOffers(rng: () => number): InvestmentOffer[] {
  const tiers: InvestmentTier[] = ["A", "B", "C", "D"];
  return DURATION_ORDER.map((durationMin) => ({
    durationMin,
    tier: tiers[Math.floor(rng() * 4)] as InvestmentTier,
  }));
}

/** Invest UI (button + dialog) may open only when not maturing, wave cooldown done, and offers exist. */
export function isInvestmentWaveReadyForUi(state: {
  playTime: number;
  investmentHallState: GameState["investmentHallState"];
}): boolean {
  const ih = state.investmentHallState;
  if (ih.active) return false;
  if (state.playTime < ih.nextWavePlayTime) return false;
  if (ih.offers.length < 3) return false;
  return true;
}

/**
 * Rewrites pre–5/15/30 saves (`10` / `30` / `60` minute slots) so offers and `active`
 * match the current schema. If any `10` or `60` appears, every `30` is treated as the old middle slot → `15`.
 */
export function normalizeInvestmentHallState(
  ih: GameState["investmentHallState"],
): GameState["investmentHallState"] {
  const durs: number[] = [
    ...ih.offers.map((o) => o.durationMin as number),
    ...(ih.active ? [ih.active.durationMin as number] : []),
  ];
  const hasLegacy = durs.some((d) => d === 10 || d === 60);
  if (!hasLegacy) return ih;

  const mapDur = (d: number): InvestmentDurationMin => {
    if (d === 10) return 5;
    if (d === 30) return 15;
    if (d === 60) return 30;
    if (d === 5 || d === 15 || d === 30) return d;
    return 5;
  };

  return {
    ...ih,
    offers: ih.offers.map((o) => ({
      ...o,
      durationMin: mapDur(o.durationMin),
    })),
    active: ih.active
      ? { ...ih.active, durationMin: mapDur(ih.active.durationMin) }
      : null,
  };
}

export type InvestmentActive = NonNullable<
  GameState["investmentHallState"]["active"]
>;

export type CommitInvestmentInput = {
  playTime: number;
  amountGold: number;
  offer: InvestmentOffer;
  luck: number;
  /** 0 coinhouse-only, 1 Bank, 2 Treasury — see `investmentHallLuckyChanceBonusPct`. */
  luckyChanceBonusPct: number;
  rng: () => number;
};

export type CommitInvestmentResult = { ok: true; active: InvestmentActive };

export function formatInvestmentCompletionLog(active: InvestmentActive): string {
  if (active.success) {
    const outcomeNote = active.luckyChanceHit ? " Lucky Chance!" : "Success.";
    return `${active.amountGold} Gold investment complete: ${outcomeNote} You gained ${active.payoutGold} Gold.`;
  }
  if (active.totalLoss) {
    return `${active.amountGold} Gold investment complete: Wipeout. You lost your full investment of ${active.amountGold} Gold.`;
  }
  const lp = active.lossPercentInt ?? 0;
  return `${active.amountGold} Gold investment complete: Failure. You lost ${active.amountGold - active.payoutGold} Gold.`;
}

/** UI outcome for the post-maturity result dialog (maps to ⇧ / ⇮ / rotated ⇮ / ⇩). */
export type InvestmentOutcomeUiKind =
  | "success"
  | "lucky_chance"
  | "partial_loss"
  | "wipeout";

export type InvestmentResultDialogPayload = {
  kind: InvestmentOutcomeUiKind;
  /** Net vs stake: profit when successful, negative when not. */
  goldDelta: number;
  briefText: string;
};

export function buildInvestmentResultDialogPayload(
  active: InvestmentActive,
): InvestmentResultDialogPayload {
  if (active.success) {
    const profit = active.payoutGold - active.amountGold;
    if (active.luckyChanceHit) {
      return {
        kind: "lucky_chance",
        goldDelta: profit,
        briefText: `Lucky Chance. The gains on your ${active.amountGold} Gold investment are multiplied by ${LUCKY_CHANCE_WIN_MULTIPLIER}.`,
      };
    }
    return {
      kind: "success",
      goldDelta: profit,
      briefText: `Your ${active.amountGold} Gold investment was successful.`,
    };
  }
  if (active.totalLoss) {
    return {
      kind: "wipeout",
      goldDelta: -active.amountGold,
      briefText: `Wipeout. You lost your full ${active.amountGold} Gold investment.`,
    };
  }
  const lost = active.amountGold - active.payoutGold;
  return {
    kind: "partial_loss",
    goldDelta: -lost,
    briefText: `Your ${active.amountGold} Gold investment failed.`,
  };
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
  const { playTime, amountGold, offer, luck, luckyChanceBonusPct, rng } = input;
  const { tier, durationMin } = offer;
  const successChance = getSuccessChancePercent(tier, durationMin, luck);
  const successRoll = rng() * 100;
  const success = successRoll < successChance;

  const endPlayTime =
    playTime + nominalDurationToPlayTimeMs(durationMin);

  if (success) {
    const { from, to } = winPercentInclusiveRange(tier, durationMin);
    const winPercentInt = randomIntInclusive(from, to, rng);
    const [lcChance] = LUCKY_CHANCE[tier];
    const effectiveLuckyChancePct = getEffectiveLuckyChancePercent(
      lcChance,
      luckyChanceBonusPct,
    );
    const luckyChanceHit = rng() * 100 < effectiveLuckyChancePct;
    const effectiveWinPercent = luckyChanceHit
      ? winPercentInt * LUCKY_CHANCE_WIN_MULTIPLIER
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
        luckyChanceHit,
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
