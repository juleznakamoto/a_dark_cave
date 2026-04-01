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
  getLuckWinChanceBonus,
  getSuccessChancePercent,
  JACKPOT,
  TOTAL_LOSS_PCT,
  winPercentInclusiveRange,
} from "@/game/rules/investmentHallTables";
import type { InvestmentDurationMin } from "@/game/rules/investmentHallTables";
import { formatNumber, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

function formatRemainingMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function offerRowLabel(durationMin: InvestmentDurationMin): string {
  if (durationMin === 10) return "Short (10 min)";
  if (durationMin === 30) return "Medium (30 min)";
  return "Long (60 min)";
}

function formatLuckSuccessBonusPct(luck: number): string {
  const bonus = getLuckWinChanceBonus(luck);
  if (bonus === 0) return "No extra success chance from Luck yet.";
  const pct = Number.isInteger(bonus) ? String(bonus) : bonus.toFixed(1);
  return `+${pct}% success chance due to Luck`;
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

  const amounts = [100, 500, 1000] as const;
  const [strategy, setStrategy] = useState("0");
  const [amountStr, setAmountStr] = useState("100");

  const active = investmentHallState.active;
  const offers = investmentHallState.offers;
  const nextWave = investmentHallState.nextWavePlayTime;

  const waveReady = playTime >= nextWave && !active;

  useEffect(() => {
    if (open && waveReady && maxStake >= 100) {
      const allowed = amounts.filter((a) => a <= maxStake);
      if (!allowed.includes(Number(amountStr) as 100 | 500 | 1000)) {
        setAmountStr(String(allowed[allowed.length - 1]));
      }
    }
  }, [open, waveReady, maxStake, amountStr]);

  const handleCommit = () => {
    const idx = Number(strategy);
    const amt = Number(amountStr);
    const r = startInvestment(idx, amt);
    if (!r.ok) {
      toast({ title: "Cannot invest", description: r.reason, variant: "destructive" });
      return;
    }
    toast({ title: "Investment started", description: "Funds are locked until maturity." });
  };

  const devSpeedHint =
    import.meta.env.DEV && active ? (
      <p className="text-xs text-muted-foreground">Dev: investments run 20× faster.</p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invest</DialogTitle>
        </DialogHeader>

        {active ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              An investment is maturing. New options will appear after it completes and the
              waiting period.
            </p>
            <p className="text-lg font-medium">
              Completes in{" "}
              {formatRemainingMs(active.endPlayTime - playTime)}
            </p>
            {devSpeedHint}
          </div>
        ) : playTime < nextWave ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Next investment wave in:</p>
            <p className="text-lg font-medium">
              {formatRemainingMs(nextWave - playTime)}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Investment Strategy</p>
                <TooltipWrapper
                  tooltip={
                    <div className="text-xs max-w-[220px]">
                      {formatLuckSuccessBonusPct(luck)}
                    </div>
                  }
                  tooltipId="invest-luck-success"
                  tooltipContentClassName="max-w-xs"
                >
                  <span
                    className="text-green-300/80 cursor-pointer hover:text-green-300 transition-colors inline-block text-base leading-none"
                    aria-label="Luck effect on investment success"
                  >
                    ☆
                  </span>
                </TooltipWrapper>
              </div>
              <RadioGroup value={strategy} onChange={setStrategy}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-foreground">
                    <thead>
                      <tr className="text-left text-xs">
                        <th className="w-10 py-2 pl-2 pr-1 font-medium" aria-hidden />
                        <th className="py-2 pr-3 font-medium">Term</th>
                        <th className="py-2 pr-3 font-medium">Success chance</th>
                        <th className="py-2 pr-3 font-medium">Profit</th>
                        <th className="py-2 pr-3 font-medium">
                          Lucky Chance / Multiplier
                        </th>
                        <th className="py-2 pr-2 font-medium">Total Loss Chance</th>
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
                            <td className="py-2 pl-2 pr-1 align-middle">
                              <RadioGroup.Item value={String(i)}>
                                <span className="sr-only">{offerRowLabel(offer.durationMin)}</span>
                              </RadioGroup.Item>
                            </td>
                            <td className="py-2 pr-3 align-middle text-xs font-medium">
                              {offerRowLabel(offer.durationMin)}
                            </td>
                            <td className="py-2 pr-3 align-middle tabular-nums">
                              {formatPercentDisplay(finalSuccess)} %
                            </td>
                            <td className="py-2 pr-3 align-middle tabular-nums">
                              {winR.from} % – {winR.to} %
                            </td>
                            <td className="py-2 pr-3 align-middle tabular-nums">
                              {jpChance} % / {jpMult}x
                            </td>
                            <td className="py-2 pr-2 align-middle tabular-nums">{tl} %</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground leading-relaxed">
                On success, profit is paid as a percentage of your stake. Lucky chance is the
                odds of applying the multiplier to that profit (e.g. 3x). On failure, Total Loss
                Chance is the odds of losing your full stake; otherwise you keep part of your
                Gold.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Investment Amount</p>
              <RadioGroup value={amountStr} onChange={setAmountStr}>
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

            <div className="flex justify-center pt-1">
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
        )}
      </DialogContent>
    </Dialog>
  );
}
