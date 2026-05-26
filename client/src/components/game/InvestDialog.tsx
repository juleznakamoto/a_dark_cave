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
  LUCKY_CHANCE_WIN_MULTIPLIER,
  TOTAL_LOSS_PCT,
  lossPercentInclusiveRange,
  maxLuckyChanceSuccessProfitGold,
  maxSuccessProfitGold,
  winPercentInclusiveRange,
} from "@/game/rules/investmentHallTables";
import type { InvestmentDurationMin } from "@/game/rules/investmentHallTables";
import { formatNumber, cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

const INVEST_RADIO_INDICATOR_PX = 8;

function termMinutesLabel(
  durationMin: InvestmentDurationMin,
  t: TFunction<"ui">,
): string {
  return t("invest.minutes", { count: durationMin });
}

function formatLuckSuccessLine(luck: number, t: TFunction<"ui">): string {
  const bonus = getLuckWinChanceBonus(luck);
  const pct = Number.isInteger(bonus) ? String(bonus) : bonus.toFixed(1);
  return t("invest.luckBonus", { pct });
}

/** Matches `investmentHallLuckyChanceBonusPct`: Treasury → 2, Bank → 1; coinhouse-only → null (no line). */
function formatInvestmentHallLuckyLine(
  bonusPct: number,
  t: TFunction<"ui">,
): string | null {
  if (bonusPct >= 2) {
    return t("invest.buildingLuckyBonus2");
  }
  if (bonusPct >= 1) {
    return t("invest.buildingLuckyBonus1");
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

/** Narrow column: disc is 8px; keeps Time column close without clipping the ring. */
const INVEST_RADIO_COLUMN_CLASS = "w-6 min-w-6 shrink-0";

/** Same horizontal inset for strategy scroller and amount row; pl-2 limits clip while sitting a bit left of pl-3. */
const INVEST_SECTION_INSET = "pl-1 pr-0";

/** Horizontal rules only (no vertical lines, no table outer frame). */
const INVEST_TABLE_LINE = "border-muted-foreground/25";

export default function InvestDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation(["ui", "common"]);
  const playTime = useGameStore((s) => s.playTime);
  const luck = useGameStore((s) => s.stats.luck);
  const cruelMode = useGameStore((s) => s.cruelMode);
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

  const investmentHallLuckyTooltipLine = formatInvestmentHallLuckyLine(
    luckyBonusPct,
    t,
  );

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
        <p className="font-medium text-foreground">
          {formatLuckSuccessLine(luck, t)}
        </p>
        {investmentHallLuckyTooltipLine ? (
          <p className="font-medium text-foreground">{investmentHallLuckyTooltipLine}</p>
        ) : null}
      </div>
      <ul className="space-y-1.5 pl-0 list-none text-muted-foreground">
        <li>
          <span className="text-foreground font-medium">
            {t("invest.headers.time")}
          </span>
          : {t("invest.tooltip.time")}
        </li>
        <li>
          <span className="text-foreground font-medium">
            {t("invest.headers.success")}
          </span>
          : {t("invest.tooltip.success")}
        </li>
        <li>
          <span className="text-foreground font-medium">
            {t("invest.headers.profit")}
          </span>
          : {t("invest.tooltip.profit")}
        </li>
        <li>
          <span className="text-foreground font-medium">
            {t("invest.headers.lucky")}
          </span>
          :{" "}
          {t("invest.tooltip.lucky", {
            multiplier: LUCKY_CHANCE_WIN_MULTIPLIER,
          })}
        </li>
        <li>
          <span className="text-foreground font-medium">
            {t("invest.headers.loss")}
          </span>
          : {t("invest.tooltip.loss")}
        </li>
        <li>
          <span className="text-foreground font-medium">
            {t("invest.headers.wipeout")}
          </span>
          : {t("invest.tooltip.wipeout")}
        </li>
        <li>
          <span className="text-foreground font-medium">
            {t("invest.potentialProfit")}
          </span>{" "}
          {t("invest.tooltip.potentialProfit", {
            multiplier: LUCKY_CHANCE_WIN_MULTIPLIER,
          })}
        </li>
      </ul>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        skipViewportWidthClamp
        className="w-max max-w-[calc(100vw-2rem)] max-h-[90dvh] overflow-y-auto min-w-0"
      >
        <DialogHeader className="min-w-0">
          <div className="flex items-center gap-1 pr-10">
            <DialogTitle className="m-0 leading-none">
              {t("invest.title")}
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
                aria-label={t("invest.infoAriaLabel")}
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
          <div className="min-w-0 w-full max-w-full space-y-4">
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium">{t("invest.strategy")}</p>
              <RadioGroup
                value={strategy}
                onChange={setStrategy}
                indicatorSizePx={INVEST_RADIO_INDICATOR_PX}
              >
                <div
                  className={cn(
                    "max-w-full min-w-0 w-full overflow-x-auto overflow-y-visible overscroll-x-contain",
                    INVEST_SECTION_INSET,
                  )}
                >
                  <table className="w-max border-collapse border-0 text-foreground">
                    <thead>
                      <tr className="text-left text-xs leading-tight">
                        <th
                          className={cn(
                            "border-b py-2 pr-0 align-bottom",
                            INVEST_RADIO_COLUMN_CLASS,
                            INVEST_TABLE_LINE,
                          )}
                          aria-hidden
                        />
                        <th
                          className={cn(
                            "border-b py-2 pl-0 pr-2 font-medium align-bottom",
                            INVEST_TABLE_LINE,
                          )}
                        >
                          {t("invest.headers.time")}
                        </th>
                        <th
                          className={cn(
                            "border-b py-2 pr-2 font-medium align-bottom",
                            INVEST_TABLE_LINE,
                          )}
                        >
                          {t("invest.headers.success")}
                        </th>
                        <th
                          className={cn(
                            "border-b py-2 pr-2 font-medium align-bottom",
                            INVEST_TABLE_LINE,
                          )}
                        >
                          {t("invest.headers.profit")}
                        </th>
                        <th
                          className={cn(
                            "border-b py-2 pr-2 font-medium align-bottom",
                            INVEST_TABLE_LINE,
                          )}
                        >
                          {t("invest.headers.lucky")}
                        </th>
                        <th
                          className={cn(
                            "border-b py-2 pr-2 font-medium align-bottom",
                            INVEST_TABLE_LINE,
                          )}
                        >
                          {t("invest.headers.loss")}
                        </th>
                        <th
                          className={cn(
                            "border-b py-2 pr-0 font-medium align-bottom",
                            INVEST_TABLE_LINE,
                          )}
                        >
                          {t("invest.headers.wipeout")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] leading-snug">
                      {offers.map((offer, i) => {
                        const finalSuccess = getSuccessChancePercent(
                          offer.tier,
                          offer.durationMin,
                          luck,
                          cruelMode,
                        );
                        const winR = winPercentInclusiveRange(
                          offer.tier,
                          offer.durationMin,
                        );
                        const [lcChance] = LUCKY_CHANCE[offer.tier];
                        const lcDisplay = getEffectiveLuckyChancePercent(
                          lcChance,
                          luckyBonusPct,
                        );
                        const lossR = lossPercentInclusiveRange(offer.tier);
                        const tl = TOTAL_LOSS_PCT[offer.tier];
                        const selected = strategy === String(i);
                        return (
                          <tr
                            key={i}
                            className={cn(
                              "cursor-pointer rounded-sm hover:bg-muted/15",
                              selected && "bg-muted/20",
                            )}
                            onClick={() => setStrategy(String(i))}
                          >
                            <td
                              className={cn(
                                "py-2 pr-0 align-middle",
                                INVEST_RADIO_COLUMN_CLASS,
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              <RadioGroup.Item value={String(i)}>
                                <span className="sr-only">
                                  {termMinutesLabel(offer.durationMin, t)}
                                </span>
                              </RadioGroup.Item>
                            </td>
                            <td
                              className={cn(
                                "py-2 pl-0 pr-2 align-middle text-xs font-medium whitespace-nowrap",
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              {termMinutesLabel(offer.durationMin, t)}
                            </td>
                            <td
                              className={cn(
                                "py-2 pr-2 align-middle tabular-nums whitespace-nowrap",
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              {formatPercentDisplay(finalSuccess)} %
                            </td>
                            <td
                              className={cn(
                                "py-2 pr-2 align-middle tabular-nums whitespace-nowrap",
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              {formatPercentRange(winR.from, winR.to)}
                            </td>
                            <td
                              className={cn(
                                "py-2 pr-2 align-middle tabular-nums whitespace-nowrap",
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              {formatPercentDisplay(lcDisplay)} %
                            </td>
                            <td
                              className={cn(
                                "py-2 pr-2 align-middle tabular-nums whitespace-nowrap",
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              {formatPercentRange(lossR.from, lossR.to)}
                            </td>
                            <td
                              className={cn(
                                "py-2 pr-0 align-middle tabular-nums whitespace-nowrap",
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              {tl} %
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("invest.amount")}</p>
              <RadioGroup
                value={amountStr}
                onChange={setAmountStr}
                indicatorSizePx={INVEST_RADIO_INDICATOR_PX}
              >
                <div
                  className={cn(
                    "flex flex-row flex-wrap items-center justify-start gap-x-6 gap-y-2",
                    INVEST_SECTION_INSET,
                  )}
                >
                  {amounts.map((a) => {
                    const disabled = a > maxStake;
                    const labelClass = disabled
                      ? "text-muted-foreground"
                      : "text-foreground";
                    return (
                      <div key={a} className="shrink-0">
                        {disabled ? (
                          <TooltipWrapper
                            tooltip={
                              <div className="text-xs">
                                {t("invest.unlockTooltip")}
                              </div>
                            }
                            tooltipId={`invest-amount-${a}`}
                            disabled
                            className="inline-flex shrink-0"
                            tooltipTriggerClassName="inline-flex shrink-0 cursor-default"
                            tooltipContentClassName="max-w-xs"
                          >
                            <RadioGroup.Item
                              value={String(a)}
                              disabled
                              disabledCursor="default"
                            >
                              <span className={labelClass}>
                                {t("common:currency.goldAmount", {
                                  amount: formatNumber(a),
                                })}
                              </span>
                            </RadioGroup.Item>
                          </TooltipWrapper>
                        ) : (
                          <RadioGroup.Item value={String(a)}>
                            <span className={labelClass}>
                              {t("common:currency.goldAmount", {
                                amount: formatNumber(a),
                              })}
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
                {t("invest.potentialProfit")}{" "}
                <span className="text-foreground font-medium">
                  {t("common:currency.goldAmount", {
                    amount: formatNumber(potentialProfitGold.normal),
                  })}
                </span>
                {" / "}
                <span className="text-foreground font-medium">
                  {t("common:currency.goldAmount", {
                    amount: formatNumber(potentialProfitGold.luckyChance),
                  })}
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
                {t("invest.startInvestment")}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
