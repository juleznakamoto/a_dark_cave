import type { GameState } from "@shared/schema";
import { CRUEL_MODE } from "../cruelMode";

export type InvestmentTier = "A" | "B" | "C" | "D";
/** `30` is legacy (old long slot). New offers are 5 / 10 / 15. */
export type InvestmentDurationMin = 5 | 10 | 15 | 30;

const DURATION_ORDER: InvestmentDurationMin[] = [5, 10, 15];

/** Index 0..2 for duration slots `5` / `10` / `15` minutes. Legacy `30` maps to the long slot. */
export function durationIndex(durationMin: number): number {
  if (durationMin === 30) return 2;
  const i = DURATION_ORDER.indexOf(durationMin as InvestmentDurationMin);
  return i !== -1 ? i : 0;
}

/** Success chance % before luck; [tier][durationIndex] */
export const SUCCESS_PCT: Record<
  InvestmentTier,
  [number, number, number]
> = {
  A: [65, 70, 80],
  B: [55, 60, 65],
  C: [50, 55, 60],
  D: [45, 50, 55],
};

/** Win % on success (fixed, not a range); [tier][durationIndex] for 5 / 10 / 15 min */
export const WIN_PCT: Record<InvestmentTier, [number, number, number]> = {
  A: [10, 15, 20],
  B: [20, 25, 30],
  C: [35, 40, 45],
  D: [50, 55, 60],
};

/** Loss % on failure (fixed, not a range). */
export const LOSS_PCT: Record<InvestmentTier, number> = {
  A: 5,
  B: 15,
  C: 25,
  D: 35,
};

/** On Lucky Chance hit, rolled win % is multiplied by this factor (fixed for all tiers). */
export const LUCKY_CHANCE_WIN_MULTIPLIER = 4 as const;

/** Same Lucky Chance % on every offer (Coinhouse). Bank and Treasury each add {@link LUCKY_CHANCE_PER_HALL_LEVEL_PCT}. */
export const LUCKY_CHANCE_BASE_PCT = 2;

/** Extra Lucky Chance % per hall upgrade after Coinhouse (Bank → 4%, Treasury → 6%). */
export const LUCKY_CHANCE_PER_HALL_LEVEL_PCT = 2;

export function investmentHallLevel(buildings: {
  coinhouse?: number;
  bank?: number;
  treasury?: number;
}): 0 | 1 | 2 | 3 {
  if ((buildings.treasury ?? 0) > 0) return 3;
  if ((buildings.bank ?? 0) > 0) return 2;
  if ((buildings.coinhouse ?? 0) > 0) return 1;
  return 0;
}

/** Total Lucky Chance %: 2 Coinhouse / 4 Bank / 6 Treasury. Same for every offer. */
export function getLuckyChancePercent(buildings: {
  coinhouse?: number;
  bank?: number;
  treasury?: number;
}): number {
  const level = investmentHallLevel(buildings);
  if (level <= 0) return 0;
  return Math.min(
    100,
    LUCKY_CHANCE_BASE_PCT + (level - 1) * LUCKY_CHANCE_PER_HALL_LEVEL_PCT,
  );
}

/** Extra Lucky Chance % above Coinhouse base: Bank +2, Treasury +4. Coinhouse only → 0. */
export function investmentHallLuckyChanceBonusPct(buildings: {
  coinhouse?: number;
  bank?: number;
  treasury?: number;
}): number {
  const total = getLuckyChancePercent(buildings);
  return total > 0 ? total - LUCKY_CHANCE_BASE_PCT : 0;
}

export function getEffectiveLuckyChancePercent(
  baseChance: number,
  luckyBonusPct: number,
): number {
  return Math.min(100, baseChance + luckyBonusPct);
}

export function getLuckWinChanceBonus(luck: number): number {
  if (luck >= 50) return 10;
  if (luck >= 40) return 7.5;
  if (luck >= 30) return 5;
  if (luck >= 20) return 2.5;
  if (luck >= 10) return 1;
  return 0;
}

export function getWinPercent(
  tier: InvestmentTier,
  durationMin: number,
): number {
  const idx = durationIndex(durationMin);
  return WIN_PCT[tier][idx] ?? WIN_PCT[tier][0];
}

export function getLossPercent(tier: InvestmentTier): number {
  return LOSS_PCT[tier];
}

function goldFromPercent(
  amountGold: number,
  percent: number,
  multiplier = 1,
): number {
  return Math.floor((amountGold * percent * multiplier) / 100);
}

/** Gold profit on success (no lucky multiplier). */
export function successProfitGold(
  amountGold: number,
  tier: InvestmentTier,
  durationMin: number,
): number {
  return goldFromPercent(amountGold, getWinPercent(tier, durationMin));
}

/** Gold profit on success if Lucky Chance multiplies the win %. */
export function luckyChanceSuccessProfitGold(
  amountGold: number,
  tier: InvestmentTier,
  durationMin: number,
): number {
  return goldFromPercent(
    amountGold,
    getWinPercent(tier, durationMin),
    LUCKY_CHANCE_WIN_MULTIPLIER,
  );
}

/** Gold lost on failure. */
export function lossGold(amountGold: number, tier: InvestmentTier): number {
  return goldFromPercent(amountGold, getLossPercent(tier));
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
  cruelMode = false,
): number {
  const idx = durationIndex(durationMin);
  const base = SUCCESS_PCT[tier][idx] ?? SUCCESS_PCT[tier][0];
  let pct = base + getLuckWinChanceBonus(luck);
  if (cruelMode) {
    pct -= CRUEL_MODE.investmentHall.successChanceSubtractPct;
  }
  return clampSuccessChance(pct);
}

/** Dev: wall-clock investment length is nominal minutes ÷ 40 (40× faster than prod). */
export function getInvestmentDurationScale(): number {
  return import.meta.env.DEV ? 1 / 40 : 1;
}

/** Wall-clock length of a nominal duration in minutes (5 / 10 / 15). */
export function nominalDurationToPlayTimeMs(durationMin: number): number {
  return durationMin * 60 * 1000 * getInvestmentDurationScale();
}

/** Production: 20 min between waves after an investment completes. Dev: 20 s. */
export function getInvestmentWaveGapMs(): number {
  return import.meta.env.DEV ? 20 * 1000 : 20 * 60 * 1000;
}

/** Production wave gap; persisted `nextWavePlayTime` uses {@link getInvestmentWaveGapMs} at schedule time. */
export const INVESTMENT_WAVE_GAP_MS = 20 * 60 * 1000;

export type InvestmentOffer = {
  durationMin: InvestmentDurationMin;
  tier: InvestmentTier;
};

/** One random tier per duration slot (5 / 10 / 15 min). */
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

export type InvestmentActive = NonNullable<
  GameState["investmentHallState"]["active"]
>;

export type CommitInvestmentInput = {
  playTime: number;
  amountGold: number;
  offer: InvestmentOffer;
  luck: number;
  /** Extra % above {@link LUCKY_CHANCE_BASE_PCT}: 0 Coinhouse / 2 Bank / 4 Treasury. */
  luckyChanceBonusPct: number;
  rng: () => number;
  cruelMode?: boolean;
};

export type CommitInvestmentResult = { ok: true; active: InvestmentActive };

export function formatInvestmentCompletionLog(active: InvestmentActive): string {
  return getInvestmentCompletionLogMeta(active).message;
}

export function getInvestmentCompletionLogMeta(active: InvestmentActive): {
  message: string;
  logKey: string;
  logVars: Record<string, string | number>;
} {
  const { amountGold, payoutGold } = active;
  if (active.success) {
    const logKey = active.luckyChanceHit
      ? "investmentComplete.successLucky"
      : "investmentComplete.success";
    const outcomeNote = active.luckyChanceHit ? " Lucky Chance!" : "Success.";
    return {
      message: `${amountGold} Gold investment complete: ${outcomeNote} You gained ${payoutGold} Gold.`,
      logKey,
      logVars: { amount: amountGold, payout: payoutGold },
    };
  }
  const loss = amountGold - payoutGold;
  return {
    message: `${amountGold} Gold investment complete: Failure. You lost ${loss} Gold.`,
    logKey: "investmentComplete.failure",
    logVars: { amount: amountGold, loss },
  };
}

/** Post-maturity result dialog: success, lucky chance, or partial loss. */
export type InvestmentOutcomeUiKind =
  | "success"
  | "lucky_chance"
  | "partial_loss";

export type InvestmentResultDialogPayload = {
  kind: InvestmentOutcomeUiKind;
  /** Net vs stake: profit when successful, negative when not. */
  goldDelta: number;
  amountGold: number;
};

const INVESTMENT_RESULT_BODY_KEYS: Record<InvestmentOutcomeUiKind, string> = {
  success: "investmentResult.success",
  lucky_chance: "investmentResult.luckyChance",
  partial_loss: "investmentResult.partialLoss",
};

export function getInvestmentResultDialogBodyMeta(
  payload: InvestmentResultDialogPayload,
): {
  bodyKey: string;
  bodyVars: Record<string, string | number>;
} {
  const bodyVars: Record<string, string | number> = {
    amount: payload.amountGold,
  };
  if (payload.kind === "lucky_chance") {
    bodyVars.multiplier = LUCKY_CHANCE_WIN_MULTIPLIER;
  }
  return {
    bodyKey: INVESTMENT_RESULT_BODY_KEYS[payload.kind],
    bodyVars,
  };
}

export function buildInvestmentResultDialogPayload(
  active: InvestmentActive,
): InvestmentResultDialogPayload {
  const { amountGold } = active;
  if (active.success) {
    const profit = active.payoutGold - amountGold;
    if (active.luckyChanceHit) {
      return {
        kind: "lucky_chance",
        goldDelta: profit,
        amountGold,
      };
    }
    return {
      kind: "success",
      goldDelta: profit,
      amountGold,
    };
  }
  const lost = amountGold - active.payoutGold;
  return {
    kind: "partial_loss",
    goldDelta: -lost,
    amountGold,
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
  const { playTime, amountGold, offer, luck, luckyChanceBonusPct, rng, cruelMode } =
    input;
  const { tier, durationMin } = offer;
  const successChance = getSuccessChancePercent(
    tier,
    durationMin,
    luck,
    Boolean(cruelMode),
  );
  const successRoll = rng() * 100;
  const success = successRoll < successChance;

  const endPlayTime =
    playTime + nominalDurationToPlayTimeMs(durationMin);

  if (success) {
    const winPercentInt = getWinPercent(tier, durationMin);
    const effectiveLuckyChancePct = getEffectiveLuckyChancePercent(
      LUCKY_CHANCE_BASE_PCT,
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

  const lossPercentInt = getLossPercent(tier);
  const payoutGold = amountGold - goldFromPercent(amountGold, lossPercentInt);

  return {
    ok: true,
    active: {
      startPlayTime: playTime,
      endPlayTime,
      amountGold,
      durationMin,
      tier,
      success: false,
      lossPercentInt,
      payoutGold,
    },
  };
}
