import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup } from "@/components/ui/radio";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  TOOLTIP_MUTED_CLASS,
  TOOLTIP_RULE_COLOR_CLASS,
  TOOLTIP_STACK_CLASS,
  TOOLTIP_TITLE_CLASS,
} from "@/game/tooltipMetrics";
import {
  GAME_INFO_GLYPH_CLASS,
  GAME_INFO_TRIGGER_CLASS,
} from "@/components/game/gameChrome";
import {
  getLuckWinChanceBonus,
  getLuckyChancePercent,
  getSuccessChancePercent,
  getInvestmentStakeUnlockBuilding,
  getMaxInvestmentStake,
  INVESTMENT_STAKE_AMOUNTS,
  isInvestmentStakeAmount,
  isInvestmentWaveReadyForUi,
  MIN_INVESTMENT_STAKE_GOLD,
  LUCKY_CHANCE_WIN_MULTIPLIER,
  lossGold,
  luckyChanceSuccessProfitGold,
  successProfitGold,
} from "@/game/rules/investmentHallTables";
import type { InvestmentDurationMin } from "@/game/rules/investmentHallTables";
import { gameActionOutlineButtonClassName } from "@/components/CooldownButton";
import { getBuildingDisplayName } from "@/game/rules/buildingTooltipSections";
import { formatNumber, cn } from "@/lib/utils";
import { useUiTranslation } from "@/i18n/useUiTranslation";

type UiT = ReturnType<typeof useUiTranslation>["t"];

const INVEST_RADIO_INDICATOR_PX = 8;

function termMinutesLabel(
  durationMin: InvestmentDurationMin,
  t: UiT,
): string {
  return t("invest.minutes", { count: durationMin });
}

function formatPercentDisplay(p: number): string {
  return Number.isInteger(p) ? String(p) : p.toFixed(1);
}

function formatLuckyChanceTopLine(
  luckyChancePct: number,
  luck: number,
  t: UiT,
): string {
  return t("invest.luckyChanceTop", {
    percent: formatPercentDisplay(luckyChancePct),
    fromLuck: formatPercentDisplay(getLuckWinChanceBonus(luck)),
  });
}

function formatGoldAmount(amount: number, t: UiT): string {
  return t("common:currency.goldAmount", {
    amount: formatNumber(amount),
  });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Narrow column: disc is 8px; keeps Time column close without clipping the ring. */
const INVEST_RADIO_COLUMN_CLASS = "w-6 min-w-6 shrink-0";

/** Same horizontal inset for strategy table and amount row; pl-1 sits a bit left of pl-3 without clipping radios. */
const INVEST_SECTION_INSET = "pl-1 pr-0";

/** Horizontal rules only (no vertical lines, no table outer frame). */
const INVEST_TABLE_LINE = "border-muted-foreground/25";

export default function InvestDialog({ open, onOpenChange }: Props) {
  const { t } = useUiTranslation();
  const playTime = useGameStore((s) => s.playTime);
  const luck = useGameStore((s) => s.stats.luck);
  const cruelMode = useGameStore((s) => s.cruelMode);
  const resources = useGameStore((s) => s.resources);
  const investmentHallState = useGameStore((s) => s.investmentHallState);
  const buildings = useGameStore((s) => s.buildings);
  const startInvestment = useGameStore((s) => s.startInvestment);

  const maxStake = useMemo(
    () =>
      getMaxInvestmentStake({
        buildings: {
          coinhouse: buildings.coinhouse,
          bank: buildings.bank,
          treasury: buildings.treasury,
        },
      }),
    [buildings.coinhouse, buildings.bank, buildings.treasury],
  );

  const luckyChancePct = useMemo(
    () =>
      getLuckyChancePercent({
        coinhouse: buildings.coinhouse,
        bank: buildings.bank,
        treasury: buildings.treasury,
      }),
    [buildings.coinhouse, buildings.bank, buildings.treasury],
  );

  const amounts = INVESTMENT_STAKE_AMOUNTS;
  const [strategy, setStrategy] = useState("0");
  const [amountStr, setAmountStr] = useState(String(MIN_INVESTMENT_STAKE_GOLD));

  const offers = investmentHallState.offers;

  const canInvestUi = useMemo(
    () => isInvestmentWaveReadyForUi({ playTime, investmentHallState }),
    [playTime, investmentHallState],
  );

  const luckyProfitGold = useMemo(() => {
    const offer = offers[Number(strategy)];
    const stake = Number(amountStr);
    if (!offer || !Number.isFinite(stake) || stake <= 0) return 0;
    return luckyChanceSuccessProfitGold(stake, offer.tier, offer.durationMin);
  }, [offers, strategy, amountStr]);

  useEffect(() => {
    if (open && canInvestUi && maxStake >= MIN_INVESTMENT_STAKE_GOLD) {
      const allowed = amounts.filter((a) => a <= maxStake);
      const stake = Number(amountStr);
      if (!isInvestmentStakeAmount(stake) || !allowed.includes(stake)) {
        setAmountStr(String(allowed[allowed.length - 1]));
      }
    }
  }, [open, canInvestUi, maxStake, amountStr]);

  useEffect(() => {
    if (open && !canInvestUi) {
      onOpenChange(false);
    }
  }, [open, canInvestUi, onOpenChange]);

  const handleCommit = () => {
    const idx = Number(strategy);
    const amt = Number(amountStr);
    const r = startInvestment(idx, amt);
    if (!r.ok) return;
    onOpenChange(false);
  };

  const strategyTableInfoTooltip = (
    <div className={TOOLTIP_STACK_CLASS}>
      <div className={`${TOOLTIP_STACK_CLASS} border-b ${TOOLTIP_RULE_COLOR_CLASS} pb-2 mb-0.5`}>
        <p className={TOOLTIP_TITLE_CLASS}>
          {formatLuckyChanceTopLine(luckyChancePct, luck, t)}
        </p>
      </div>
      <ul className={`${TOOLTIP_STACK_CLASS} pl-0 list-none ${TOOLTIP_MUTED_CLASS}`}>
        <li>
          <span className={TOOLTIP_TITLE_CLASS}>
            {t("invest.headers.time")}
          </span>
          : {t("invest.tooltip.time")}
        </li>
        <li>
          <span className={TOOLTIP_TITLE_CLASS}>
            {t("invest.headers.success")}
          </span>
          : {t("invest.tooltip.success")}
        </li>
        <li>
          <span className={TOOLTIP_TITLE_CLASS}>
            {t("invest.headers.profit")}
          </span>
          : {t("invest.tooltip.profit")}
        </li>
        <li>
          <span className={TOOLTIP_TITLE_CLASS}>
            {t("invest.headers.lucky")}
          </span>
          :{" "}
          {t("invest.tooltip.lucky", {
            multiplier: LUCKY_CHANCE_WIN_MULTIPLIER,
          })}
        </li>
        <li>
          <span className={TOOLTIP_TITLE_CLASS}>
            {t("invest.headers.loss")}
          </span>
          : {t("invest.tooltip.loss")}
        </li>
      </ul>
      <p className={TOOLTIP_MUTED_CLASS}>{t("invest.tooltip.wait")}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="[--adc-dialog-max-w:22rem] min-w-0">
        <DialogHeader className="min-w-0">
          <div className="flex items-center gap-1 pr-10">
            <DialogTitle className="m-0 pr-0 leading-none">
              {t("invest.title")}
            </DialogTitle>
            <TooltipWrapper
              tooltip={strategyTableInfoTooltip}
              tooltipId="invest-dialog-info"
              disabled
              className={GAME_INFO_TRIGGER_CLASS}
            >
              <span
                className={GAME_INFO_GLYPH_CLASS}
                aria-label={t("invest.infoAriaLabel")}
              >
                🛈
              </span>
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
                    "max-w-full min-w-0 w-full",
                    INVEST_SECTION_INSET,
                  )}
                >
                  <table className="w-full table-fixed border-collapse border-0 text-left text-foreground">
                    <colgroup>
                      <col className={INVEST_RADIO_COLUMN_CLASS} />
                      <col />
                      <col />
                      <col />
                      <col />
                    </colgroup>
                    <thead>
                      <tr className="text-xs leading-tight">
                        <th
                          className={cn(
                            "border-b py-2 pl-0 pr-0 text-left align-bottom",
                            INVEST_RADIO_COLUMN_CLASS,
                            INVEST_TABLE_LINE,
                          )}
                          aria-hidden
                        />
                        <th
                          className={cn(
                            "border-b py-2 pl-0 pr-2 text-left font-medium align-bottom",
                            INVEST_TABLE_LINE,
                          )}
                        >
                          {t("invest.headers.time")}
                        </th>
                        <th
                          className={cn(
                            "border-b py-2 pl-0 pr-2 text-left font-medium align-bottom",
                            INVEST_TABLE_LINE,
                          )}
                        >
                          {t("invest.headers.success")}
                        </th>
                        <th
                          className={cn(
                            "border-b py-2 pl-0 pr-2 text-left font-medium align-bottom",
                            INVEST_TABLE_LINE,
                          )}
                        >
                          {t("invest.headers.profit")}
                        </th>
                        <th
                          className={cn(
                            "border-b py-2 pl-0 pr-0 text-left font-medium align-bottom",
                            INVEST_TABLE_LINE,
                          )}
                        >
                          {t("invest.headers.loss")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-xs leading-snug">
                      {offers.map((offer, i) => {
                        const stake = Number(amountStr);
                        const finalSuccess = getSuccessChancePercent(
                          offer.tier,
                          offer.durationMin,
                          luck,
                          cruelMode,
                        );
                        const profit = Number.isFinite(stake)
                          ? successProfitGold(
                            stake,
                            offer.tier,
                            offer.durationMin,
                          )
                          : 0;
                        const loss = Number.isFinite(stake)
                          ? lossGold(stake, offer.tier)
                          : 0;
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
                                "py-2 pl-0 pr-0 text-left align-middle",
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
                                "py-2 pl-0 pr-2 text-left align-middle font-medium whitespace-nowrap",
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              {termMinutesLabel(offer.durationMin, t)}
                            </td>
                            <td
                              className={cn(
                                "py-2 pl-0 pr-2 text-left align-middle tabular-nums whitespace-nowrap",
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              {formatPercentDisplay(finalSuccess)} %
                            </td>
                            <td
                              className={cn(
                                "py-2 pl-0 pr-2 text-left align-middle tabular-nums whitespace-nowrap",
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              {formatGoldAmount(profit, t)}
                            </td>
                            <td
                              className={cn(
                                "py-2 pl-0 pr-0 text-left align-middle tabular-nums whitespace-nowrap",
                                i > 0 && "border-t",
                                INVEST_TABLE_LINE,
                              )}
                            >
                              {formatGoldAmount(loss, t)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </RadioGroup>
              <p
                className={cn(
                  "text-xs tabular-nums text-foreground",
                  INVEST_SECTION_INSET,
                )}
              >
                {t("invest.luckyChanceLine", {
                  percent: formatPercentDisplay(luckyChancePct),
                  gold: formatGoldAmount(luckyProfitGold, t),
                })}
              </p>
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
                    "flex flex-row flex-wrap items-center justify-start gap-x-6 gap-y-4",
                    INVEST_SECTION_INSET,
                  )}
                >
                  {amounts.map((a) => {
                    const disabled = a > maxStake;
                    const unlockBuilding = getInvestmentStakeUnlockBuilding(a);
                    const labelClass = disabled
                      ? "text-muted-foreground"
                      : "text-foreground";
                    return (
                      <div key={a} className="shrink-0">
                        {disabled ? (
                          <TooltipWrapper
                            tooltip={
                              <div>
                                {t("invest.unlockTooltip", {
                                  building: unlockBuilding
                                    ? getBuildingDisplayName(unlockBuilding)
                                    : "",
                                })}
                              </div>
                            }
                            tooltipId={`invest-amount-${a}`}
                            disabled
                            className="inline-flex shrink-0"
                            tooltipTriggerClassName="inline-flex shrink-0 cursor-default"
                          >
                            <RadioGroup.Item
                              value={String(a)}
                              disabled
                              disabledCursor="default"
                            >
                              <span
                                className={cn(
                                  "text-xs tabular-nums",
                                  labelClass,
                                )}
                              >
                                {t("common:currency.goldAmount", {
                                  amount: formatNumber(a),
                                })}
                              </span>
                            </RadioGroup.Item>
                          </TooltipWrapper>
                        ) : (
                          <RadioGroup.Item value={String(a)}>
                            <span
                              className={cn("text-xs tabular-nums", labelClass)}
                            >
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

            <div className="flex justify-center pt-1">
              <Button
                onClick={handleCommit}
                variant="outline"
                size="xs"
                className={cn(
                  "adc-btn-dialog-cta text-xs font-medium",
                  gameActionOutlineButtonClassName(
                    offers.length < 3 ||
                    (resources.gold ?? 0) < Number(amountStr) ||
                    Number(amountStr) > maxStake,
                  ),
                )}
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
