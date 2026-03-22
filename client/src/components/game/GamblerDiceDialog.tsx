import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  WAGER_TIERS,
  WAGER_LUCK_THRESHOLDS,
  INITIAL_GOAL,
  GOAL_INCREMENT,
  rollDie,
  resolveRoll,
  runNpcTurn,
  resolveShowdown,
  type WagerTier,
  type RollStatus,
} from "@/game/diceFifteenGame";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"] as const;
const SPIN_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const NPC_ROLL_DELAY = 800;
const SPIN_DURATION = 400;
const SPIN_INTERVAL = 60;

type Phase = "wager" | "playerTurn" | "npcTurn" | "outcome" | "tieEscalation";

interface GamblerDiceDialogProps {
  isOpen: boolean;
  onComplete: (outcome: "win" | "lose", wager: number) => void;
  onClose: () => void;
  hasBoneDice: boolean;
  playerGold: number;
  playerLuck: number;
  onWagerSelected: (wager: number) => void;
}

function DiceFace({
  value,
  spinning,
}: {
  value: number | null;
  spinning: boolean;
}) {
  const [displayFace, setDisplayFace] = useState(0);

  useEffect(() => {
    if (!spinning) return;
    const interval = setInterval(() => {
      setDisplayFace((prev) => (prev + 1) % SPIN_FACES.length);
    }, SPIN_INTERVAL);
    return () => clearInterval(interval);
  }, [spinning]);

  if (value === null && !spinning) {
    return <span className="text-3xl opacity-30">⚀</span>;
  }

  const face = spinning ? SPIN_FACES[displayFace] : DICE_FACES[(value ?? 1) - 1];
  return <span className="text-3xl">{face}</span>;
}

function RulesInfoButton({ hasBoneDice }: { hasBoneDice: boolean }) {
  return (
    <TooltipWrapper
      tooltip={
        <div className="text-xs space-y-1 max-w-[200px]">
          <p>Roll dice to reach the <strong>current goal</strong> without going over.</p>
          <p>The goal starts at <strong>15</strong>.</p>
          <p>Exceed the goal and you lose.</p>
          <p>Hit it exactly and you win.</p>
          <p>If both players stop, the player with the higher total wins.</p>
          <p>On a tie, the goal raises by 5.</p>
          {hasBoneDice && (
            <p className="text-amber-300/80">Bone Dice: re-roll once per game.</p>
          )}
        </div>
      }
      tooltipId="gambler-rules"
    >
      <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors text-sm">
        ?
      </span>
    </TooltipWrapper>
  );
}

export default function GamblerDiceDialog({
  isOpen,
  onComplete,
  onClose,
  hasBoneDice,
  playerGold,
  playerLuck,
  onWagerSelected,
}: GamblerDiceDialogProps) {
  const [phase, setPhase] = useState<Phase>("wager");
  const [wager, setWager] = useState<number>(0);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [npcTotal, setNpcTotal] = useState(0);
  const [goal, setGoal] = useState(INITIAL_GOAL);
  const [playerLastRoll, setPlayerLastRoll] = useState<number | null>(null);
  const [npcLastRoll, setNpcLastRoll] = useState<number | null>(null);
  const [hasRolledOnce, setHasRolledOnce] = useState(false);
  const [hasReroll, setHasReroll] = useState(hasBoneDice);
  const [prevTotal, setPrevTotal] = useState(0);
  const [outcome, setOutcome] = useState<"win" | "lose" | null>(null);
  const [npcRolls, setNpcRolls] = useState<number[]>([]);
  const [npcRollIndex, setNpcRollIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [npcSpinning, setNpcSpinning] = useState(false);
  const isOpenRef = useRef(false);
  const playerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const npcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const npcResolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tieTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutRef = (timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const clearPendingTimeouts = useCallback(() => {
    clearTimeoutRef(playerTimeoutRef);
    clearTimeoutRef(npcTimeoutRef);
    clearTimeoutRef(npcResolveTimeoutRef);
    clearTimeoutRef(tieTimeoutRef);
  }, []);

  const resetGame = useCallback(() => {
    clearPendingTimeouts();
    setPhase("wager");
    setWager(0);
    setPlayerTotal(0);
    setNpcTotal(0);
    setGoal(INITIAL_GOAL);
    setPlayerLastRoll(null);
    setNpcLastRoll(null);
    setHasRolledOnce(false);
    setHasReroll(hasBoneDice);
    setPrevTotal(0);
    setOutcome(null);
    setNpcRolls([]);
    setNpcRollIndex(0);
    setSpinning(false);
    setNpcSpinning(false);
  }, [clearPendingTimeouts, hasBoneDice]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      resetGame();
    } else {
      clearPendingTimeouts();
    }
    return () => {
      isOpenRef.current = false;
      clearPendingTimeouts();
    };
  }, [clearPendingTimeouts, isOpen, resetGame]);

  const handleWager = (tier: WagerTier) => {
    setWager(tier);
    onWagerSelected(tier);
    setPhase("playerTurn");
  };

  const handlePlayerRoll = () => {
    if (spinning || phase !== "playerTurn") return;
    setSpinning(true);
    clearTimeoutRef(playerTimeoutRef);
    playerTimeoutRef.current = setTimeout(() => {
      if (!isOpenRef.current) return;
      const roll = rollDie();
      const result = resolveRoll(playerTotal, roll, goal);
      setPrevTotal(playerTotal);
      setPlayerLastRoll(roll);
      setPlayerTotal(result.newTotal);
      setHasRolledOnce(true);
      setSpinning(false);

      if (result.status === "win") {
        setOutcome("win");
        setPhase("outcome");
      } else if (result.status === "bust") {
        setOutcome("lose");
        setPhase("outcome");
      }
      playerTimeoutRef.current = null;
    }, SPIN_DURATION);
  };

  const handleReroll = () => {
    if (!hasReroll || playerLastRoll === null || spinning || phase !== "playerTurn") return;
    setHasReroll(false);
    setPlayerTotal(prevTotal);
    setPlayerLastRoll(null);

    setSpinning(true);
    clearTimeoutRef(playerTimeoutRef);
    playerTimeoutRef.current = setTimeout(() => {
      if (!isOpenRef.current) return;
      const roll = rollDie();
      const result = resolveRoll(prevTotal, roll, goal);
      setPrevTotal(prevTotal);
      setPlayerLastRoll(roll);
      setPlayerTotal(result.newTotal);
      setSpinning(false);

      if (result.status === "win") {
        setOutcome("win");
        setPhase("outcome");
      } else if (result.status === "bust") {
        setOutcome("lose");
        setPhase("outcome");
      }
      playerTimeoutRef.current = null;
    }, SPIN_DURATION);
  };

  const handleStand = () => {
    if (phase !== "playerTurn") return;
    setPhase("npcTurn");
    const turn = runNpcTurn(npcTotal, playerTotal, goal);
    setNpcRolls(turn.rolls);
    setNpcRollIndex(0);

    if (turn.rolls.length === 0) {
      resolveAfterNpc(npcTotal, turn.status);
    }
  };

  useEffect(() => {
    if (phase !== "npcTurn" || npcRolls.length === 0) return;
    if (npcRollIndex >= npcRolls.length) return;

    setNpcSpinning(true);
    clearTimeoutRef(npcTimeoutRef);
    npcTimeoutRef.current = setTimeout(() => {
      if (!isOpenRef.current) return;
      const roll = npcRolls[npcRollIndex];
      const result = resolveRoll(npcTotal, roll, goal);

      setNpcSpinning(false);
      setNpcLastRoll(roll);
      setNpcTotal(result.newTotal);

      if (result.status !== "playing" || npcRollIndex === npcRolls.length - 1) {
        const finalStatus = result.status;
        clearTimeoutRef(npcResolveTimeoutRef);
        npcResolveTimeoutRef.current = setTimeout(() => {
          if (!isOpenRef.current) return;
          resolveAfterNpc(result.newTotal, finalStatus);
          npcResolveTimeoutRef.current = null;
        }, 400);
      } else {
        setNpcRollIndex((i) => i + 1);
      }
      npcTimeoutRef.current = null;
    }, NPC_ROLL_DELAY);

    return () => {
      clearTimeoutRef(npcTimeoutRef);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, npcRollIndex, npcRolls]);

  const resolveAfterNpc = (finalNpcTotal: number, npcStatus: RollStatus) => {
    if (npcStatus === "bust") {
      setOutcome("win");
      setPhase("outcome");
      return;
    }
    if (npcStatus === "win") {
      setOutcome("lose");
      setPhase("outcome");
      return;
    }

    const showdown = resolveShowdown(playerTotal, finalNpcTotal, goal);
    if (showdown === "playerWin") {
      setOutcome("win");
      setPhase("outcome");
    } else if (showdown === "npcWin") {
      setOutcome("lose");
      setPhase("outcome");
    } else {
      setPhase("tieEscalation");
      clearTimeoutRef(tieTimeoutRef);
      tieTimeoutRef.current = setTimeout(() => {
        if (!isOpenRef.current) return;
        setGoal((g) => g + GOAL_INCREMENT);
        setPlayerLastRoll(null);
        setNpcLastRoll(null);
        setHasRolledOnce(false);
        setNpcRolls([]);
        setNpcRollIndex(0);
        setPhase("playerTurn");
        tieTimeoutRef.current = null;
      }, 1500);
    }
  };

  const handleOutcomeClose = () => {
    if (outcome) {
      onComplete(outcome, wager);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent
        className="w-[95vw] sm:max-w-sm z-[70] [&>button]:hidden border-2 border-amber-900/50 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            The Gambler
            <RulesInfoButton hasBoneDice={hasBoneDice} />
          </DialogTitle>
          <DialogDescription className="sr-only">Dice game against the gambler</DialogDescription>
        </DialogHeader>

        {phase === "wager" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Place your wager. The goal starts at {INITIAL_GOAL}, ties raise it by {GOAL_INCREMENT}, and going over loses the round.
            </p>
            <div className="flex flex-wrap gap-2">
              {WAGER_TIERS.map((tier) => {
                const requiredLuck = WAGER_LUCK_THRESHOLDS[tier];
                const isUnlocked = playerLuck >= requiredLuck;
                const canAfford = playerGold >= tier;
                const isDisabled = !isUnlocked || !canAfford;

                const button = (
                  <Button
                    key={tier}
                    variant="outline"
                    size="sm"
                    disabled={isDisabled}
                    onClick={() => handleWager(tier)}
                    className={`text-xs ${!isUnlocked ? "opacity-40" : ""}`}
                    button_id={`gambler-wager-${tier}`}
                  >
                    {tier} gold
                  </Button>
                );

                if (!isUnlocked) {
                  return (
                    <TooltipWrapper
                      key={tier}
                      tooltip={
                        <div className="text-xs">
                          Requires {requiredLuck} Luck to unlock
                        </div>
                      }
                      tooltipId={`gambler-wager-lock-${tier}`}
                      disabled={true}
                    >
                      {button}
                    </TooltipWrapper>
                  );
                }

                return button;
              })}
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-muted-foreground"
                button_id="gambler-close-wager"
              >
                Walk away
              </Button>
            </div>
          </div>
        )}

        {(phase === "playerTurn" || phase === "npcTurn" || phase === "tieEscalation") && (
          <div className="space-y-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Wager: {wager} gold</span>
              <span>Goal: {goal}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-xs text-muted-foreground">You</div>
                <div className="text-2xl font-bold">{playerTotal}</div>
                <DiceFace value={playerLastRoll} spinning={spinning} />
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-muted-foreground">Gambler</div>
                <div className="text-2xl font-bold">{npcTotal}</div>
                <DiceFace value={npcLastRoll} spinning={npcSpinning} />
              </div>
            </div>

            {phase === "tieEscalation" && (
              <div className="text-center text-xs text-amber-300/80">
                Tie! Goal raised to {goal + GOAL_INCREMENT}...
              </div>
            )}

            {phase === "playerTurn" && !spinning && (
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayerRoll}
                  className="text-xs"
                  button_id="gambler-roll"
                >
                  Roll
                </Button>
                {hasRolledOnce && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStand}
                    className="text-xs"
                    button_id="gambler-stand"
                  >
                    Stand
                  </Button>
                )}
                {hasReroll && playerLastRoll !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReroll}
                    className="text-xs text-amber-300/80 border-amber-900/50"
                    button_id="gambler-reroll"
                  >
                    Re-roll
                  </Button>
                )}
              </div>
            )}

            {phase === "npcTurn" && (
              <div className="text-center text-xs text-muted-foreground">
                The gambler rolls...
              </div>
            )}

            {hasBoneDice && (
              <div className="text-center text-xs text-muted-foreground">
                {hasReroll ? (
                  <span className="text-amber-300/60">Bone dice: 1 re-roll available</span>
                ) : (
                  <span className="text-muted-foreground/40">Bone dice: used</span>
                )}
              </div>
            )}
          </div>
        )}

        {phase === "outcome" && outcome && (
          <div className="space-y-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Wager: {wager} gold</span>
              <span>Goal: {goal}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-xs text-muted-foreground">You</div>
                <div className={`text-2xl font-bold ${playerTotal > goal ? "text-red-400" : ""}`}>
                  {playerTotal}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs text-muted-foreground">Gambler</div>
                <div className={`text-2xl font-bold ${npcTotal > goal ? "text-red-400" : ""}`}>
                  {npcTotal}
                </div>
              </div>
            </div>

            <div className="text-center space-y-1">
              {outcome === "win" ? (
                <>
                  <div className="text-sm text-amber-300">You win!</div>
                  <div className="text-xs text-muted-foreground">+{wager} gold</div>
                </>
              ) : (
                <>
                  <div className="text-sm text-red-400">You lose.</div>
                  <div className="text-xs text-muted-foreground">-{wager} gold</div>
                </>
              )}
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOutcomeClose}
                className="text-xs"
                button_id="gambler-outcome-close"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
