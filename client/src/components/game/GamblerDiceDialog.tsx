import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
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
  TIED_STOP_MAX_GOAL_DISTANCE,
  isStopBlockedTiedFarUnderGoal,
  canPlayerChooseNoRoll,
  rollDie,
  resolveRoll,
  npcRollOrStand,
  resolveShowdown,
  type WagerTier,
} from "@/game/diceFifteenGame";
import { useGameStore } from "@/game/state";
import {
  resolveGamblerSessionForHydrate,
  type GamblerDiceSession,
} from "@/game/gamblerSession";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"] as const;
const SPIN_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const ROLL_SPIN_MS_MIN = 600;
const ROLL_SPIN_MS_MAX = 1200;
const SPIN_INTERVAL = 60;
/** Pause after the player's die settles before the gambler acts (not applied after No Roll). */
const PAUSE_MS_AFTER_PLAYER_ROLL = 500;

function randomRollSpinDurationMs(): number {
  return (
    ROLL_SPIN_MS_MIN +
    Math.floor(Math.random() * (ROLL_SPIN_MS_MAX - ROLL_SPIN_MS_MIN + 1))
  );
}

/** Persist gambler + game state after each roll (and other session writes); `setTimeout(0)` runs after React commits. */
function schedulePersistGamblerDiceState() {
  setTimeout(() => {
    void (async () => {
      try {
        const { saveGame } = await import("@/game/save");
        const { useGameStore } = await import("@/game/state");
        const { buildGameState } = await import("@/game/stateHelpers");
        await saveGame(buildGameState(useGameStore.getState()), false);
      } catch {
        /* best-effort */
      }
    })();
  }, 0);
}

type Phase = "wager" | "playerTurn" | "npcTurn" | "outcome" | "tieEscalation";

interface GamblerDiceDialogProps {
  isOpen: boolean;
  /** Apply payouts and store updates as soon as the round ends (before the player dismisses). */
  onOutcomeResolved: (
    outcome: "win" | "lose",
    wager: number,
    snapshot: { playerTotal: number; npcTotal: number; goal: number },
  ) => void;
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

  const face = spinning
    ? SPIN_FACES[displayFace]
    : DICE_FACES[(value ?? 1) - 1];
  return <span className="text-3xl">{face}</span>;
}

function RulesInfoButton({ hasBoneDice }: { hasBoneDice: boolean }) {
  return (
    <TooltipWrapper
      tooltip={
        <div className="text-xs space-y-1 max-w-[200px]">
          <p>You and the gambler take turns rolling a dice.</p>
          <p>The points of each player's rolls are added up.</p>
          <p>The first player to exceed the goal loses.</p>
          <p>
            The goal starts at <strong>15</strong>.
          </p>
          <p>In case of a tie the goal is raised by 10.</p>
          <p>
            If you have more points than the gambler you can decide to not role
            in this round.
          </p>
          {hasBoneDice && (
            <p className="text-amber-300/80">
              Bone Dice: re-roll once per game.
            </p>
          )}
        </div>
      }
      tooltipId="gambler-rules"
      disabled
      tooltipContentClassName="max-w-xs border border-amber-600"
      className="inline-flex items-center justify-center w-4 h-4 shrink-0 rounded-full text-muted-foreground text-sm font-bold hover:text-foreground cursor-pointer"
    >
      <span className="leading-none" aria-label="Dice game rules">
        ⓘ
      </span>
    </TooltipWrapper>
  );
}

export default function GamblerDiceDialog({
  isOpen,
  onOutcomeResolved,
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
  const [hasReroll, setHasReroll] = useState(hasBoneDice);
  const [prevTotal, setPrevTotal] = useState(0);
  const [outcome, setOutcome] = useState<"win" | "lose" | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [npcSpinning, setNpcSpinning] = useState(false);
  /** True after the player has rolled at least once this round (No Roll / showdown require this). */
  const [hasRolledThisRound, setHasRolledThisRound] = useState(false);
  /** Bumps while phase stays `npcTurn` so the NPC can roll again when the player is locked on the goal. */
  const [npcTurnChain, setNpcTurnChain] = useState(0);
  /** Incremented when tie escalation raises the goal so the Points Goal value replays the blink animation. */
  const [goalRaisedBlinkKey, setGoalRaisedBlinkKey] = useState(0);
  /** Snapshot of dialog size from the wager screen; game phases keep this box. */
  const [lockedDialogSize, setLockedDialogSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const isOpenRef = useRef(false);
  const outcomeReportedRef = useRef(false);
  const tieResumeRequestedRef = useRef(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const playerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const npcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tieTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalsRef = useRef({ playerTotal: 0, npcTotal: 0, goal: INITIAL_GOAL });
  const npcTurnNonceRef = useRef(0);
  const pauseAfterPlayerRollRef = useRef(false);
  /** True only after the player chooses No Roll; showdown / tie escalation run only then. */
  const playerStoppedRef = useRef(false);

  const clearTimeoutRef = (
    timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const clearPendingTimeouts = useCallback(() => {
    clearTimeoutRef(playerTimeoutRef);
    clearTimeoutRef(npcTimeoutRef);
    clearTimeoutRef(tieTimeoutRef);
  }, []);

  const runAfterTieDelay = useCallback(() => {
    setGoal((prev) => prev + GOAL_INCREMENT);
    setGoalRaisedBlinkKey((k) => k + 1);
    setPlayerLastRoll(null);
    setNpcLastRoll(null);
    setHasRolledThisRound(false);
    playerStoppedRef.current = false;
    setNpcTurnChain(0);
    setPhase("playerTurn");
    tieTimeoutRef.current = null;
  }, []);

  /** Tie under goal, or both roll to the current goal — raise goal and continue. */
  const scheduleGoalRaiseAfterTie = useCallback(() => {
    tieResumeRequestedRef.current = false;
    setPhase("tieEscalation");
    clearTimeoutRef(tieTimeoutRef);
    tieTimeoutRef.current = setTimeout(() => {
      if (!isOpenRef.current) return;
      runAfterTieDelay();
    }, 1500);
  }, [runAfterTieDelay]);

  /** After refresh during `tieEscalation`, replay only the delay (phase already set). */
  const resumeTieEscalationCountdown = useCallback(() => {
    clearTimeoutRef(tieTimeoutRef);
    tieTimeoutRef.current = setTimeout(() => {
      if (!isOpenRef.current) return;
      runAfterTieDelay();
    }, 1500);
  }, [runAfterTieDelay]);

  const resetGame = useCallback(() => {
    clearPendingTimeouts();
    setPhase("wager");
    setWager(0);
    setPlayerTotal(0);
    setNpcTotal(0);
    setGoal(INITIAL_GOAL);
    setPlayerLastRoll(null);
    setNpcLastRoll(null);
    setHasReroll(hasBoneDice);
    setPrevTotal(0);
    setOutcome(null);
    setSpinning(false);
    setNpcSpinning(false);
    setHasRolledThisRound(false);
    setNpcTurnChain(0);
    setGoalRaisedBlinkKey(0);
    outcomeReportedRef.current = false;
    setLockedDialogSize(null);
    pauseAfterPlayerRollRef.current = false;
    playerStoppedRef.current = false;
  }, [clearPendingTimeouts, hasBoneDice]);

  useLayoutEffect(() => {
    if (!isOpen) {
      isOpenRef.current = false;
      clearPendingTimeouts();
      setLockedDialogSize(null);
      tieResumeRequestedRef.current = false;
      return;
    }

    isOpenRef.current = true;
    const gg = useGameStore.getState().gamblerGame;

    if (gg?.outcome) {
      setWager(gg.wager);
      setOutcome(gg.outcome);
      setPhase("outcome");
      const snap = gg.outcomeSnapshot;
      setPlayerTotal(snap?.playerTotal ?? 0);
      setNpcTotal(snap?.npcTotal ?? 0);
      setGoal(snap?.goal ?? INITIAL_GOAL);
      setPlayerLastRoll(null);
      setNpcLastRoll(null);
      setSpinning(false);
      setNpcSpinning(false);
      setLockedDialogSize(null);
      outcomeReportedRef.current = true;
      tieResumeRequestedRef.current = false;
      return;
    }

    const canResume =
      gg && !gg.outcome && (gg.session != null || gg.wager > 0);

    if (canResume && gg) {
      const s = resolveGamblerSessionForHydrate(gg, hasBoneDice);
      setWager(gg.wager);
      setPhase(s.phase);
      setPlayerTotal(s.playerTotal);
      setNpcTotal(s.npcTotal);
      setGoal(s.goal);
      setPlayerLastRoll(s.playerLastRoll);
      setNpcLastRoll(s.npcLastRoll);
      setHasReroll(s.hasReroll);
      setHasRolledThisRound(s.hasRolledThisRound);
      setNpcTurnChain(s.npcTurnChain);
      setGoalRaisedBlinkKey(s.goalRaisedBlinkKey);
      playerStoppedRef.current = s.playerStopped;
      pauseAfterPlayerRollRef.current = s.pauseAfterNextPlayerRoll;
      setOutcome(null);
      setSpinning(false);
      setNpcSpinning(false);
      // Total before the current player roll (reroll reverts to this, then applies a new die).
      setPrevTotal(
        Math.max(0, s.playerTotal - (s.playerLastRoll ?? 0)),
      );
      outcomeReportedRef.current = false;
      tieResumeRequestedRef.current = s.phase === "tieEscalation";
      // Do not use a synthetic min height here. Normal play locks size from the wager layout's
      // measured offsetHeight in handleWager; a fixed ~520px minHeight after refresh stretched
      // flex-1 content and left a tall empty band. Resume with unlocked sizing (content height).
      setLockedDialogSize(null);
      return;
    }

    resetGame();
    tieResumeRequestedRef.current = false;
  }, [isOpen, hasBoneDice, resetGame]);

  // Do not list `phase` in deps: the hydrate effect batches setPhase("tieEscalation") with
  // tieResumeRequestedRef; a follow-up render would re-run this effect, whose cleanup would
  // clear tieTimeoutRef before tieResumeRequestedRef is true again — locking tieEscalation.
  useLayoutEffect(() => {
    if (!isOpen || !tieResumeRequestedRef.current) return;
    tieResumeRequestedRef.current = false;
    resumeTieEscalationCountdown();
    return () => clearTimeoutRef(tieTimeoutRef);
  }, [isOpen, resumeTieEscalationCountdown]);

  useEffect(() => {
    if (!isOpen) return;
    if (phase === "outcome") return;
    const gg = useGameStore.getState().gamblerGame;
    if (!gg || gg.outcome != null) return;

    const session: GamblerDiceSession = {
      phase,
      playerTotal,
      npcTotal,
      goal,
      playerLastRoll,
      npcLastRoll,
      hasReroll,
      hasRolledThisRound,
      npcTurnChain,
      goalRaisedBlinkKey,
      playerStopped: playerStoppedRef.current,
      pauseAfterNextPlayerRoll: pauseAfterPlayerRollRef.current,
    };

    const cur = gg;
    const prev = cur.session;
    const unchanged =
      prev &&
      prev.phase === session.phase &&
      prev.playerTotal === session.playerTotal &&
      prev.npcTotal === session.npcTotal &&
      prev.goal === session.goal &&
      prev.playerLastRoll === session.playerLastRoll &&
      prev.npcLastRoll === session.npcLastRoll &&
      prev.hasReroll === session.hasReroll &&
      prev.hasRolledThisRound === session.hasRolledThisRound &&
      prev.npcTurnChain === session.npcTurnChain &&
      prev.goalRaisedBlinkKey === session.goalRaisedBlinkKey &&
      prev.playerStopped === session.playerStopped &&
      prev.pauseAfterNextPlayerRoll === session.pauseAfterNextPlayerRoll;
    if (unchanged) return;

    useGameStore.setState({ gamblerGame: { ...cur, session } });
    schedulePersistGamblerDiceState();
  }, [
    isOpen,
    phase,
    playerTotal,
    npcTotal,
    goal,
    playerLastRoll,
    npcLastRoll,
    hasReroll,
    hasRolledThisRound,
    npcTurnChain,
    goalRaisedBlinkKey,
  ]);

  useEffect(() => {
    if (!isOpen || phase !== "outcome" || !outcome) return;
    if (outcomeReportedRef.current) return;
    outcomeReportedRef.current = true;
    onOutcomeResolved(outcome, wager, {
      playerTotal,
      npcTotal,
      goal,
    });
    schedulePersistGamblerDiceState();
  }, [
    isOpen,
    phase,
    outcome,
    wager,
    playerTotal,
    npcTotal,
    goal,
    onOutcomeResolved,
  ]);

  totalsRef.current = { playerTotal, npcTotal, goal };

  const handleWager = (tier: WagerTier) => {
    const el = dialogContentRef.current;
    if (el && typeof window !== "undefined") {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const maxW = Math.floor(window.innerWidth * 0.95);
      const maxH = Math.floor(window.innerHeight * 0.85);
      if (w > 0 && h > 0) {
        setLockedDialogSize({
          width: Math.min(w, maxW),
          height: Math.min(h, maxH),
        });
      }
    }
    setWager(tier);
    onWagerSelected(tier);
    setPhase("playerTurn");
  };

  const handlePlayerRoll = () => {
    if (spinning || phase !== "playerTurn") return;
    setSpinning(true);
    clearTimeoutRef(playerTimeoutRef);
    const spinMs = randomRollSpinDurationMs();
    playerTimeoutRef.current = setTimeout(() => {
      if (!isOpenRef.current) return;
      const roll = rollDie();
      const result = resolveRoll(playerTotal, roll, goal);
      setPrevTotal(playerTotal);
      setPlayerLastRoll(roll);
      setPlayerTotal(result.newTotal);
      setSpinning(false);
      setHasRolledThisRound(true);

      if (result.status === "bust") {
        setOutcome("lose");
        setPhase("outcome");
      } else {
        playerStoppedRef.current = false;
        pauseAfterPlayerRollRef.current = true;
        setNpcTurnChain(0);
        setPhase("npcTurn");
      }
      playerTimeoutRef.current = null;
    }, spinMs);
  };

  const handleReroll = () => {
    if (
      !hasReroll ||
      playerLastRoll === null ||
      spinning ||
      phase !== "playerTurn"
    )
      return;
    setHasReroll(false);
    setPlayerTotal(prevTotal);
    setPlayerLastRoll(null);

    setSpinning(true);
    clearTimeoutRef(playerTimeoutRef);
    const spinMs = randomRollSpinDurationMs();
    playerTimeoutRef.current = setTimeout(() => {
      if (!isOpenRef.current) return;
      const roll = rollDie();
      const result = resolveRoll(prevTotal, roll, goal);
      setPrevTotal(prevTotal);
      setPlayerLastRoll(roll);
      setPlayerTotal(result.newTotal);
      setSpinning(false);
      setHasRolledThisRound(true);

      if (result.status === "bust") {
        setOutcome("lose");
        setPhase("outcome");
      } else {
        playerStoppedRef.current = false;
        pauseAfterPlayerRollRef.current = true;
        setNpcTurnChain(0);
        setPhase("npcTurn");
      }
      playerTimeoutRef.current = null;
    }, spinMs);
  };

  const handleStand = () => {
    if (phase !== "playerTurn" || !hasRolledThisRound) return;
    if (!canPlayerChooseNoRoll(playerTotal, npcTotal)) return;
    if (isStopBlockedTiedFarUnderGoal(playerTotal, npcTotal, goal)) return;
    playerStoppedRef.current = true;
    pauseAfterPlayerRollRef.current = false;
    setNpcTurnChain(0);
    setPhase("npcTurn");
  };

  useEffect(() => {
    if (phase !== "npcTurn") return;

    const myNonce = ++npcTurnNonceRef.current;
    let cancelled = false;
    const delayMs = pauseAfterPlayerRollRef.current
      ? PAUSE_MS_AFTER_PLAYER_ROLL
      : 0;
    pauseAfterPlayerRollRef.current = false;

    const t = setTimeout(() => {
      if (
        cancelled ||
        !isOpenRef.current ||
        myNonce !== npcTurnNonceRef.current
      )
        return;

      const { playerTotal: p, npcTotal: n, goal: g } = totalsRef.current;
      const step = npcRollOrStand(n, p, g);

      if (step.kind === "stand") {
        const playerLocked = playerStoppedRef.current || p === g;
        if (!playerLocked) {
          setNpcTurnChain(0);
          setPhase("playerTurn");
          return;
        }
        const showdown = resolveShowdown(p, n, g);
        if (showdown === "playerWin") {
          setOutcome("win");
          setPhase("outcome");
        } else if (showdown === "npcWin") {
          setOutcome("lose");
          setPhase("outcome");
        } else {
          // Tie (same total): raise goal whether both are under the cap or both sit exactly on it.
          scheduleGoalRaiseAfterTie();
        }
        return;
      }

      setNpcSpinning(true);
      clearTimeoutRef(npcTimeoutRef);
      const spinMs = randomRollSpinDurationMs();
      npcTimeoutRef.current = setTimeout(() => {
        if (
          cancelled ||
          !isOpenRef.current ||
          myNonce !== npcTurnNonceRef.current
        )
          return;
        setNpcSpinning(false);
        setNpcLastRoll(step.roll);
        setNpcTotal(step.newTotal);

        if (step.status === "bust") {
          setOutcome("win");
          setPhase("outcome");
        } else if (p === g && step.newTotal === g) {
          scheduleGoalRaiseAfterTie();
        } else if (p === g) {
          setNpcTurnChain((c) => c + 1);
        } else {
          setNpcTurnChain(0);
          setPhase("playerTurn");
        }
        npcTimeoutRef.current = null;
      }, spinMs);
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(t);
      clearTimeoutRef(npcTimeoutRef);
    };
  }, [phase, npcTurnChain, scheduleGoalRaiseAfterTie]);

  const handleOutcomeClose = () => {
    onClose();
  };

  const dialogLocked = lockedDialogSize != null;

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent
        ref={dialogContentRef}
        className={
          dialogLocked
            ? "z-[70] flex max-h-[85vh] flex-col gap-0 overflow-hidden border-2 border-amber-900/50 shadow-2xl [&>button]:hidden max-w-[min(24rem,95vw)] duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
            : "z-[70] flex w-full max-w-[min(24rem,95vw)] flex-col gap-0 overflow-hidden border-2 border-amber-900/50 shadow-2xl [&>button]:hidden max-h-[85vh] duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
        }
        style={
          dialogLocked
            ? {
              width: lockedDialogSize.width,
              minHeight: lockedDialogSize.height,
            }
            : undefined
        }
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 space-y-2 pb-3.5 mb-0.5">
          <DialogTitle className="text-sm flex items-center gap-2 leading-snug">
            The Obsessed Gambler
            <RulesInfoButton hasBoneDice={hasBoneDice} />
          </DialogTitle>
          <DialogDescription className="sr-only">
            Dice game against the obsessed gambler
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
          {phase === "wager" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Place your bet.</p>
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
                      size="xs"
                      disabled={isDisabled}
                      onClick={() => handleWager(tier)}
                      className={`text-xs ${!isUnlocked ? "opacity-40" : ""}`}
                      button_id={`gambler-wager-${tier}`}
                    >
                      {tier} Gold
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
                  variant="outline"
                  size="xs"
                  onClick={onClose}
                  className="text-xs font-medium text-foreground border-amber-900/50 hover:bg-amber-950/30 hover:text-foreground"
                  button_id="gambler-close-wager"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {(phase === "playerTurn" ||
            phase === "npcTurn" ||
            phase === "tieEscalation") && (
              <div className="space-y-3 flex flex-col flex-1 min-h-0">
                <div className="flex flex-col gap-1 text-xs text-muted-foreground shrink-0">
                  <span>
                    Bet:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {wager} Gold
                    </span>
                  </span>
                  <span>
                    Points Goal:{" "}
                    <span
                      key={goalRaisedBlinkKey}
                      className={`font-semibold text-foreground tabular-nums ${goalRaisedBlinkKey > 0 ? "gambler-goal-blink-3" : ""}`}
                    >
                      {goal}
                    </span>
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-4 content-start">
                    <div className="text-center space-y-1">
                      <div
                        className={`text-xs ${phase === "playerTurn" ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                      >
                        You
                      </div>
                      <div
                        className="text-2xl font-bold tabular-nums"
                        data-testid="player-running-total"
                      >
                        {playerTotal}
                      </div>
                      <div className="h-10 flex items-center justify-center">
                        <DiceFace value={playerLastRoll} spinning={spinning} />
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <div
                        className={`text-xs ${phase === "npcTurn" ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                      >
                        Gambler
                      </div>
                      <div
                        className="text-2xl font-bold tabular-nums"
                        data-testid="gambler-running-total"
                      >
                        {npcTotal}
                      </div>
                      <div className="h-10 flex items-center justify-center">
                        <DiceFace value={npcLastRoll} spinning={npcSpinning} />
                      </div>
                    </div>
                  </div>

                  {(phase === "playerTurn" ||
                    phase === "npcTurn" ||
                    phase === "tieEscalation") && (
                      <div className="flex gap-2 justify-center min-h-[1.75rem] items-center">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={handlePlayerRoll}
                          disabled={
                            phase !== "playerTurn" ||
                            spinning ||
                            playerTotal >= goal
                          }
                          className="text-xs"
                          button_id="gambler-roll"
                        >
                          Roll
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={handleStand}
                          disabled={
                            phase !== "playerTurn" ||
                            !hasRolledThisRound ||
                            spinning ||
                            !canPlayerChooseNoRoll(playerTotal, npcTotal) ||
                            isStopBlockedTiedFarUnderGoal(
                              playerTotal,
                              npcTotal,
                              goal,
                            )
                          }
                          className="text-xs"
                          button_id="gambler-stand"
                        >
                          No Roll
                        </Button>
                        {playerTotal < goal &&
                          hasReroll &&
                          playerLastRoll !== null && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={handleReroll}
                              disabled={phase !== "playerTurn" || spinning}
                              className="text-xs text-amber-300/80 border-amber-900/50"
                              button_id="gambler-reroll"
                            >
                              Re-roll
                            </Button>
                          )}
                      </div>
                    )}
                </div>

                {hasBoneDice && (
                  <div className="text-center text-xs text-muted-foreground">
                    {hasReroll ? (
                      <span className="text-amber-300/60">
                        Bone dice: 1 re-roll available
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">
                        Bone dice: used
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

          {phase === "outcome" && outcome && (
            <div className="space-y-4 flex flex-col flex-1 min-h-0">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>
                  Bet:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {wager} Gold
                  </span>
                </span>
                <span>
                  Points Goal:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {goal}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center space-y-1">
                  <div className="text-xs text-muted-foreground">You</div>
                  <div
                    className={`text-2xl font-bold ${playerTotal > goal ? "text-red-400" : ""}`}
                  >
                    {playerTotal}
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-xs text-muted-foreground">Gambler</div>
                  <div
                    className={`text-2xl font-bold ${npcTotal > goal ? "text-red-400" : ""}`}
                  >
                    {npcTotal}
                  </div>
                </div>
              </div>

              <div className="text-center">
                {outcome === "win" ? (
                  <div className="text-sm font-semibold text-green-800 dark:text-green-400">
                    You win
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-red-900 dark:text-red-400">
                    You lose
                  </div>
                )}
              </div>

              <div className="shrink-0">
                <div className="h-px w-full bg-white/10" />
                <div className="text-center text-xs text-foreground pt-4">
                  {outcome === "win" ? `+${wager} Gold` : `-${wager} Gold`}
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleOutcomeClose}
                  className="text-xs"
                  button_id="gambler-outcome-close"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
