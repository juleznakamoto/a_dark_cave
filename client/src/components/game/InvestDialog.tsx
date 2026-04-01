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
  LOSS_PCT_RANGE,
  SUCCESS_PCT,
  TOTAL_LOSS_PCT,
  winPercentInclusiveRange,
} from "@/game/rules/investmentHallTables";
import type { InvestmentDurationMin } from "@/game/rules/investmentHallTables";
import { formatNumber } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

function formatRemainingMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const DURATIONS: InvestmentDurationMin[] = [10, 30, 60];

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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

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
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
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
                <p className="text-sm font-medium">Strategy</p>
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
                <div className="flex flex-col gap-3">
                  {offers.map((offer, i) => {
                    const di = DURATIONS.indexOf(offer.durationMin);
                    const baseSuccess = SUCCESS_PCT[offer.tier][di];
                    const withLuck = getSuccessChancePercent(
                      offer.tier,
                      offer.durationMin,
                      luck,
                    );
                    const winR = winPercentInclusiveRange(offer.tier, offer.durationMin);
                    const [jpChance, jpMult] = JACKPOT[offer.tier];
                    const lossR = LOSS_PCT_RANGE[offer.tier];
                    const tl = TOTAL_LOSS_PCT[offer.tier];
                    return (
                      <RadioGroup.Item key={i} value={String(i)}>
                        <div className="flex flex-col gap-0.5 text-left min-w-0">
                          <span className="font-medium">
                            {offerRowLabel(offer.durationMin)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Success {baseSuccess}% → {withLuck.toFixed(1)}% with luck · Win{" "}
                            {winR.from}–{winR.to}% (int) · Jackpot {jpChance}% ×{jpMult} · On
                            fail loss {lossR[0]}–{lossR[1]}% · Total loss {tl}%
                          </span>
                        </div>
                      </RadioGroup.Item>
                    );
                  })}
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If the investment succeeds, Jackpot is the chance to multiply your gains. If it
                fails, Total loss is the chance to lose your full stake (otherwise you recover
                part of your gold).
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Amount (gold)</p>
              <RadioGroup value={amountStr} onChange={setAmountStr}>
                <div className="flex flex-col gap-2">
                  {amounts.map((a) => {
                    const disabled = a > maxStake;
                    return (
                      <RadioGroup.Item key={a} value={String(a)} disabled={disabled}>
                        <span className={disabled ? "text-muted-foreground" : ""}>
                          {formatNumber(a)} gold
                        </span>
                      </RadioGroup.Item>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            <Button
              onClick={handleCommit}
              variant="outline"
              className="w-full flex items-center justify-center text-sm font-medium"
              disabled={
                offers.length < 3 ||
                (resources.gold ?? 0) < Number(amountStr) ||
                Number(amountStr) > maxStake
              }
              button_id="invest-commit"
            >
              Commit investment
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
