import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { RadioGroup } from "@/components/ui/radio";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  getEffectiveLuckyChancePercent,
  getLuckWinChanceBonus,
  getSuccessChancePercent,
  investmentHallLuckyChanceBonusPct,
  isInvestmentWaveReadyForUi,
  LUCKY_CHANCE,
  TOTAL_LOSS_PCT,
  lossPercentInclusiveRange,
  maxLuckyChanceSuccessProfitGold,
  maxSuccessProfitGold,
  winPercentInclusiveRange,
} from "@/game/rules/investmentHallTables";
import type { InvestmentDurationMin } from "@/game/rules/investmentHallTables";
import { formatNumber, cn } from "@/lib/utils";

const INVEST_RADIO_INDICATOR_PX = 8;

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

/** Single trailing percent, en dash between values (e.g. `10–20 %`). */
function formatPercentRange(from: number, to: number): string {
  return `${formatPercentDisplay(from)}–${formatPercentDisplay(to)} %`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const AMOUNT_UNLOCK_TOOLTIP = (
  <span className="text-xs">Unlocks at higher building level</span>
);

/** Matches strategy grid radio column so amount radios line up vertically. */
const INVEST_RADIO_COLUMN_CLASS = "w-7 min-w-7 shrink-0";

const strategyGridCols =
  "[grid-template-columns:auto_max-content_max-content_max-content_max-content_max-content_max-content_max-content]";

const strategyHeaderCell =
  "py-2 pr-2 text-left text-xs font-medium leading-tight";

const strategyDataCell =
  "py-2 pr-2 text-[11px] leading-snug tabular-nums whitespace-nowrap";

function strategyRowBg(selected: boolean) {
  return cn(
    "group-hover/strategy-row:bg-muted/15 rounded-sm",
    selected && "bg-muted/20",
  );
}

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
      return { normal: 0, luckyChance: 0 };
    }
    return {
      normal: maxSuccessProfitGold(stake, offer.tier, offer.durationMin),
      luckyChance: maxLuckyChanceSuccessProfitGold(
        stake,
        offer.tier,
        offer.durationMin,
      ),
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
    if (!r.ok) return;
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
          <span className="text-foreground font-medium">Potential Profit</span>: Maximum profit you can gain on your investment. Second value is with the lucky multiplier applied.
        </li>
      </ul>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-max max-w-[calc(100vw-2rem)] max-h-[90dvh] overflow-y-auto min-w-0">
        <DialogHeader>
          <div className="flex items-center gap-1 pr-10">
            <DialogTitle className="m-0 leading-none">
              Invest
            </DialogTitle>
            <TooltipWrapper
              tooltip={strategyTableInfoTooltip}
              tooltipId="invest-dialog-info"
              disabled
              tooltipContentClassName="max-w-sm"
              className="-ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              tooltipTriggerClassName="flex h-full w-full items-center justify-center"
            >
              <button
                type="button"
                className="flex h-full w-full items-center justify-center rounded-full border-0 bg-transparent p-0 cursor-pointer"
                aria-label="Explain investments and the strategy table"
              >
                <Info
                  className="h-[15px] w-[15px] shrink-0 text-current"
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            </TooltipWrapper>
          </div>
        </DialogHeader>

        {canInvestUi ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Investment Strategy</p>
              <RadioGroup
                value={strategy}
                onChange={setStrategy}
                indicatorSizePx={INVEST_RADIO_INDICATOR_PX}
              >
                <div className="overflow-x-auto pl-0">
                  <div
                    role="table"
                    className={cn(
                      "inline-grid w-max text-foreground",
                      strategyGridCols,
                    )}
                  >
                    <div
                      className={cn(
                        "py-2 pr-0.5",
                        INVEST_RADIO_COLUMN_CLASS,
                      )}
                      aria-hidden
                    />
                    <div className={strategyHeaderCell}>Duration</div>
                    <div className={strategyHeaderCell}>
                      Success
                      <br />
                      Chance
                    </div>
                    <div className={strategyHeaderCell}>Profit</div>
                    <div className={strategyHeaderCell}>
                      Lucky
                      <br />
                      Chance
                    </div>
                    <div className={strategyHeaderCell}>Loss</div>
                    <div className={cn(strategyHeaderCell, "pr-0")}>Wipeout</div>
                    {offers.map((offer, i) => {
                      const finalSuccess = getSuccessChancePercent(
                        offer.tier,
                        offer.durationMin,
                        luck,
                      );
                      const winR = winPercentInclusiveRange(
                        offer.tier,
                        offer.durationMin,
                      );
                      const [lcChance, lcMult] = LUCKY_CHANCE[offer.tier];
                      const lcDisplay = getEffectiveLuckyChancePercent(
                        lcChance,
                        luckyBonusPct,
                      );
                      const lossR = lossPercentInclusiveRange(offer.tier);
                      const tl = TOTAL_LOSS_PCT[offer.tier];
                      const selected = strategy === String(i);
                      const rowBg = strategyRowBg(selected);
                      return (
                        <div
                          key={i}
                          className="contents cursor-pointer group/strategy-row"
                          onClick={() => setStrategy(String(i))}
                        >
                          <div
                            className={cn(
                              "flex items-center py-2 pr-0.5",
                              INVEST_RADIO_COLUMN_CLASS,
                              rowBg,
                            )}
                          >
                            <RadioGroup.Item value={String(i)}>
                              <span className="sr-only">
                                {termMinutesLabel(offer.durationMin)}
                              </span>
                            </RadioGroup.Item>
                          </div>
                          <div
                            className={cn(
                              strategyDataCell,
                              "text-xs font-medium",
                              rowBg,
                            )}
                          >
                            {termMinutesLabel(offer.durationMin)}
                          </div>
                          <div className={cn(strategyDataCell, rowBg)}>
                            {formatPercentDisplay(finalSuccess)} %
                          </div>
                          <div className={cn(strategyDataCell, rowBg)}>
                            {formatPercentRange(winR.from, winR.to)}
                          </div>
                          <div className={cn(strategyDataCell, rowBg)}>
                            {formatPercentDisplay(lcDisplay)} % / {lcMult}x
                          </div>
                          <div className={cn(strategyDataCell, rowBg)}>
                            {formatPercentRange(lossR.from, lossR.to)}
                          </div>
                          <div className={cn(strategyDataCell, "pr-0", rowBg)}>
                            {tl} %
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                <div className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2">
                  <div className={INVEST_RADIO_COLUMN_CLASS} aria-hidden />
                  {amounts.map((a) => {
                    const disabled = a > maxStake;
                    const labelClass = disabled
                      ? "text-muted-foreground"
                      : "text-foreground";
                    return (
                      <div key={a} className="shrink-0">
                        {disabled ? (
                          <TooltipWrapper
                            tooltip={AMOUNT_UNLOCK_TOOLTIP}
                            tooltipId={`invest-amount-${a}`}
                            disabled
                            className="inline-flex shrink-0"
                            tooltipTriggerAsChild
                            tooltipContentClassName="max-w-xs"
                          >
                            <RadioGroup.Item
                              value={String(a)}
                              disabled
                              disabledCursor="default"
                            >
                              <span className={labelClass}>
                                {formatNumber(a)} Gold
                              </span>
                            </RadioGroup.Item>
                          </TooltipWrapper>
                        ) : (
                          <RadioGroup.Item value={String(a)}>
                            <span className={labelClass}>
                              {formatNumber(a)} Gold
                            </span>
                          </RadioGroup.Item>
                        )}
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            <div className="flex flex-col items-center gap-4 pt-1">
              <p className="text-center text-xs text-muted-foreground tabular-nums">
                Potential Profit:{" "}
                <span className="text-foreground font-medium">
                  {formatNumber(potentialProfitGold.normal)} Gold
                </span>
                {" / "}
                <span className="text-foreground font-medium">
                  {formatNumber(potentialProfitGold.luckyChance)} Gold
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
                Start Investment
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
