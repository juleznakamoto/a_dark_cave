import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { RadioGroup } from "@/components/ui/radio";

const INVEST_RADIO_INDICATOR_PX = 8;
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  getEffectiveJackpotChancePercent,
  getLuckWinChanceBonus,
  getSuccessChancePercent,
  investmentHallLuckyChanceBonusPct,
  isInvestmentWaveReadyForUi,
  JACKPOT,
  TOTAL_LOSS_PCT,
  lossPercentInclusiveRange,
  maxJackpotSuccessProfitGold,
  maxSuccessProfitGold,
  winPercentInclusiveRange,
} from "@/game/rules/investmentHallTables";
import type { InvestmentDurationMin } from "@/game/rules/investmentHallTables";
import { formatNumber, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

function termMinutesLabel(durationMin: InvestmentDurationMin): string {
  return `${durationMin} min`;
}

function formatLuckSuccessLine(luck: number): string {
  const bonus = getLuckWinChanceBonus(luck);
  const pct = Number.isInteger(bonus) ? String(bonus) : bonus.toFixed(1);
  return `+${pct} % Success Chance from Luck (included in table).`;
}

/** Matches `investmentHallLuckyChanceBonusPct`: Treasury → 2, Bank → 1; coinhouse-only → null (no line). */
function formatInvestmentHallLuckyLine(bonusPct: number): string | null {
  if (bonusPct >= 2) {
    return "+2 % Lucky Chance based on building level (included in table).";
  }
  if (bonusPct >= 1) {
    return "+1 % Lucky Chance based on building level (included in table).";
  }
  return null;
}

function formatPercentDisplay(p: number): string {
  return Number.isInteger(p) ? String(p) : p.toFixed(1);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const AMOUNT_UNLOCK_TOOLTIP = (
  <span className="text-xs">Unlocks at higher building level</span>
);

export default function InvestDialog({ open, onOpenChange }: Props) {
  const playTime = useGameStore((s) => s.playTime);
  const luck = useGameStore((s) => s.stats.luck);
  const resources = useGameStore((s) => s.resources);
  const investmentHallState = useGameStore((s) => s.investmentHallState);
  const buildings = useGameStore((s) => s.buildings);
  const startInvestment = useGameStore((s) => s.startInvestment);

  const maxStake = useMemo(() => {
    if (buildings.treasury > 0) return 1000;
    if (buildings.bank > 0) return 500;
    return 100;
  }, [buildings.treasury, buildings.bank]);

  const luckyBonusPct = useMemo(
    () =>
      investmentHallLuckyChanceBonusPct({
        bank: buildings.bank,
        treasury: buildings.treasury,
      }),
    [buildings.bank, buildings.treasury],
  );

  const amounts = [100, 500, 1000] as const;
  const [strategy, setStrategy] = useState("0");
  const [amountStr, setAmountStr] = useState("100");

  const offers = investmentHallState.offers;

  const canInvestUi = useMemo(
    () => isInvestmentWaveReadyForUi({ playTime, investmentHallState }),
    [playTime, investmentHallState],
  );

  const potentialProfitGold = useMemo(() => {
    const idx = Number(strategy);
    const offer = offers[idx];
    const stake = Number(amountStr);
    if (!offer || !Number.isFinite(stake) || stake <= 0) {
      return { normal: 0, jackpot: 0 };
    }
    return {
      normal: maxSuccessProfitGold(stake, offer.tier, offer.durationMin),
      jackpot: maxJackpotSuccessProfitGold(stake, offer.tier, offer.durationMin),
    };
  }, [offers, strategy, amountStr]);

  useEffect(() => {
    if (open && canInvestUi && maxStake >= 100) {
      const allowed = amounts.filter((a) => a <= maxStake);
      if (!allowed.includes(Number(amountStr) as 100 | 500 | 1000)) {
        setAmountStr(String(allowed[allowed.length - 1]));
      }
    }
  }, [open, canInvestUi, maxStake, amountStr]);

  useEffect(() => {
    if (open && !canInvestUi) {
      onOpenChange(false);
    }
  }, [open, canInvestUi, onOpenChange]);

  const investmentHallLuckyTooltipLine = formatInvestmentHallLuckyLine(luckyBonusPct);

  const handleCommit = () => {
    const idx = Number(strategy);
    const amt = Number(amountStr);
    const r = startInvestment(idx, amt);
    if (!r.ok) {
      toast({ title: "Cannot invest", description: r.reason, variant: "destructive" });
      return;
    }
    toast({ title: "Investment started", description: "Funds are locked until maturity." });
    onOpenChange(false);
  };

  const strategyTableInfoTooltip = (
    <div className="text-xs space-y-2 max-w-[280px]">
      <div className="space-y-1.5 border-b border-border pb-2 mb-0.5">
        <p className="font-medium text-foreground">{formatLuckSuccessLine(luck)}</p>
        {investmentHallLuckyTooltipLine ? (
          <p className="font-medium text-foreground">{investmentHallLuckyTooltipLine}</p>
        ) : null}
      </div>
      <ul className="space-y-1.5 pl-0 list-none text-muted-foreground">
        <li>
          <span className="text-foreground font-medium">Duration</span>: How long the investment runs.
        </li>
        <li>
          <span className="text-foreground font-medium">Success Chance</span>: Chance of a
          successful investment.
        </li>
        <li>
          <span className="text-foreground font-medium">Profit</span>: The profit you gain in case of success.
        </li>
        <li>
          <span className="text-foreground font-medium">Lucky Chance</span>: Chance
          to multiply your profit by the shown factor (e.g. 3x).
        </li>
        <li>
          <span className="text-foreground font-medium">Loss</span>: The portion of your investment you lose in case of failure.
        </li>
        <li>
          <span className="text-foreground font-medium">Wipeout</span>: Chance to lose your entire
          investment in case of failure.
        </li>
        <li>
          <span className="text-foreground font-medium">Potential profit</span>: Maximum profit you can gain on your investment. Second value is with the lucky multiplier applied.
        </li>
      </ul>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invest</DialogTitle>
          {import.meta.env.DEV ? (
            <p className="text-xs text-muted-foreground pt-1">
              Dev: investment duration runs 20× faster.
            </p>
          ) : null}
        </DialogHeader>

        {canInvestUi ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium leading-5">
                  Investment Strategy
                </span>
                <TooltipWrapper
                  tooltip={strategyTableInfoTooltip}
                  tooltipId="invest-strategy-table-info"
                  disabled
                  tooltipContentClassName="max-w-sm"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <button
                    type="button"
                    className="inline-flex h-full w-full items-center justify-center rounded-full border-0 bg-transparent p-0 cursor-pointer"
                    aria-label="Explain investment strategy table and potential profit"
                  >
                    <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </button>
                </TooltipWrapper>
              </div>
              <RadioGroup
                value={strategy}
                onChange={setStrategy}
                indicatorSizePx={INVEST_RADIO_INDICATOR_PX}
              >
                <div className="overflow-x-auto pl-2">
                  <table className="w-full min-w-[560px] border-collapse text-foreground">
                    <thead>
                      <tr className="text-left text-xs">
                        <th className="w-8 min-w-8 py-2 pl-0 pr-2 font-medium" aria-hidden />
                        <th className="py-2 pr-3 font-medium">Duration</th>
                        <th className="py-2 pr-3 font-medium">Success Chance</th>
                        <th className="py-2 pr-3 font-medium">Profit</th>
                        <th className="py-2 pr-3 font-medium">Lucky Chance</th>
                        <th className="py-2 pr-3 font-medium">Loss</th>
                        <th className="py-2 pr-2 font-medium">Wipeout</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] leading-snug">
                      {offers.map((offer, i) => {
                        const finalSuccess = getSuccessChancePercent(
                          offer.tier,
                          offer.durationMin,
                          luck,
                        );
                        const winR = winPercentInclusiveRange(offer.tier, offer.durationMin);
                        const [jpChance, jpMult] = JACKPOT[offer.tier];
                        const jpDisplay = getEffectiveJackpotChancePercent(
                          jpChance,
                          luckyBonusPct,
                        );
                        const lossR = lossPercentInclusiveRange(offer.tier);
                        const tl = TOTAL_LOSS_PCT[offer.tier];
                        return (
                          <tr
                            key={i}
                            className={cn(
                              "cursor-pointer hover:bg-muted/15 rounded-sm",
                              strategy === String(i) && "bg-muted/20",
                            )}
                            onClick={() => setStrategy(String(i))}
                          >
                            <td className="w-8 min-w-8 py-2 pl-0 pr-2 align-middle">
                              <RadioGroup.Item value={String(i)}>
                                <span className="sr-only">{termMinutesLabel(offer.durationMin)}</span>
                              </RadioGroup.Item>
                            </td>
                            <td className="py-2 pr-3 align-middle text-xs font-medium">
                              {termMinutesLabel(offer.durationMin)}
                            </td>
                            <td className="py-2 pr-3 align-middle tabular-nums">
                              {formatPercentDisplay(finalSuccess)} %
                            </td>
                            <td className="py-2 pr-3 align-middle tabular-nums">
                              {winR.from} % – {winR.to} %
                            </td>
                            <td className="py-2 pr-3 align-middle tabular-nums">
                              {formatPercentDisplay(jpDisplay)} % / {jpMult}x
                            </td>
                            <td className="py-2 pr-3 align-middle tabular-nums">
                              {lossR.from} % – {lossR.to} %
                            </td>
                            <td className="py-2 pr-2 align-middle tabular-nums">{tl} %</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Investment Amount</p>
              <RadioGroup
                value={amountStr}
                onChange={setAmountStr}
                indicatorSizePx={INVEST_RADIO_INDICATOR_PX}
              >
                <div className="flex flex-col gap-2">
                  {amounts.map((a) => {
                    const disabled = a > maxStake;
                    const labelClass = disabled
                      ? "text-muted-foreground"
                      : "text-foreground";
                    return (
                      <div key={a}>
                        <RadioGroup.Item
                          value={String(a)}
                          disabled={disabled}
                          disabledCursor={disabled ? "default" : "not-allowed"}
                        >
                          {disabled ? (
                            <TooltipWrapper
                              tooltip={AMOUNT_UNLOCK_TOOLTIP}
                              tooltipId={`invest-amount-${a}`}
                              disabled
                              className="inline-block w-fit"
                              tooltipTriggerClassName="inline-block w-fit max-w-full"
                              tooltipContentClassName="max-w-xs"
                            >
                              <span className={labelClass}>
                                {formatNumber(a)} Gold
                              </span>
                            </TooltipWrapper>
                          ) : (
                            <span className={labelClass}>
                              {formatNumber(a)} Gold
                            </span>
                          )}
                        </RadioGroup.Item>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            <div className="flex flex-col items-center gap-2 pt-1">
              <p className="text-center text-xs text-muted-foreground tabular-nums">
                Potential profit:{" "}
                <span className="text-foreground font-medium">
                  {formatNumber(potentialProfitGold.normal)} Gold
                </span>
                {" / "}
                <span className="text-foreground font-medium">
                  {formatNumber(potentialProfitGold.jackpot)} Gold
                </span>
              </p>
              <Button
                onClick={handleCommit}
                variant="outline"
                className="h-8 px-4 text-xs font-medium"
                disabled={
                  offers.length < 3 ||
                  (resources.gold ?? 0) < Number(amountStr) ||
                  Number(amountStr) > maxStake
                }
                button_id="invest-commit"
              >
                Start investment
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
