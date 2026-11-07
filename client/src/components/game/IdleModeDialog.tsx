import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/ui/circular-progress";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  GAME_PANEL_HEADER_INDICATOR_CLASS,
  GAME_PANEL_HEADER_INDICATOR_INNER_CLASS,
  GAME_PANEL_HEADER_INDICATOR_SIZE_PX,
  GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS,
} from "@/components/game/gameChrome";
import { headerIndicatorIcon } from "@/game/headerIndicatorIcons";
import { useShallow } from "zustand/react/shallow";
import { useGameStore } from "@/game/state";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { gameActionOutlineButtonClassName } from "@/components/CooldownButton";
import { capitalizeWords, cn, formatNumber } from "@/lib/utils";
import { getTotalPopulationEffects } from "@/game/population";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import {
  CYCLE_RING_FRAME_MS,
  resetProductionCycle,
  resolveSleepDialogInit,
} from "@/game/loop";
import { logger } from "@/lib/logger";
import { BOMB_RESOURCES, constrainResourceAmount } from "@/game/resourceLimits";
import { gameStateSchema, type GameState } from "@shared/schema";

/** Same order as the side-panel Resources list (schema key order + precious first). */
const RESOURCE_PANEL_ORDER = Object.keys(gameStateSchema.parse({}).resources);
const PRECIOUS_RESOURCE_ORDER = ["silver", "gold", "insight"] as const;

function sortResourcesLikeSidePanel(keys: string[]): string[] {
  const keySet = new Set(keys.filter((k) => k !== "Focus"));
  const precious = PRECIOUS_RESOURCE_ORDER.filter((k) => keySet.has(k));
  const preciousSet = new Set<string>(PRECIOUS_RESOURCE_ORDER);
  const others = RESOURCE_PANEL_ORDER.filter(
    (k) => keySet.has(k) && !preciousSet.has(k),
  );
  const ordered = new Set<string>([...precious, ...others]);
  const rest = [...keySet].filter((k) => !ordered.has(k));
  return [...precious, ...others, ...rest];
}
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { resolveEventMessage, resolveEventTitle } from "@/i18n/eventText";
import {
  openEventDialogNow,
  scheduleCallbackWhenDialogClear,
  scheduleRewardDialogWhenClear,
} from "@/game/store/dialogScheduling";
import {
  buildBadDreamDialogEntry,
  rollSleepDream,
  SLEEP_DREAM_DELAY_MS,
  sleepFocusPoints,
  startBadDreams,
} from "@/game/rules/eventsSleepDream";
import { hasChosenPact } from "@/game/rules/pacts";
import { getResourceName } from "@/i18n/resolveGameText";
import {
  BLACK_ESTATE_SLEEP_HOURS,
  BLACK_ESTATE_SLEEP_INTENSITY_PERCENT,
  SLEEP_LENGTH_UPGRADES,
  SLEEP_INTENSITY_UPGRADES,
} from "@/game/rules/skillUpgrades";
import { getPassiveInsightPerCycle } from "@/game/rules/effectsCalculation";
import {
  buildSleepBonusTimerFreezePatch,
  type SleepBonusTimerState,
} from "@/game/sleepBonusTimers";
import {
  capSleepGainDeltasToStorageRoom,
  getSleepTotalGainDisplay,
  isSleepResourceAtStorageMax,
  sleepWholeUnits,
  splitSleepDecimal,
  tidySleepAmount,
} from "@/game/sleepGainDisplay";

/** Match live play: soft storage cap during sleep (preserve event overcap, no further gains). */
function clampSimulatedResourcesToStorage(
  simulated: Record<string, number>,
  gameState: GameState,
  previousAmounts?: Record<string, number>,
): void {
  for (const key of Object.keys(simulated)) {
    const v = simulated[key];
    if (v === undefined || v === null || Number.isNaN(v)) continue;
    const previous =
      previousAmounts?.[key] ??
      gameState.resources[key as keyof GameState["resources"]] ??
      0;
    simulated[key] = constrainResourceAmount(
      key,
      Math.max(0, v),
      gameState,
      { previousAmount: previous },
    );
  }
}

// Sleep production: no temporary bonuses (feast, heartfire, curse, etc.)
const SLEEP_PRODUCTION_OPTIONS = { excludeTemporaryBonuses: true };

/**
 * Exact sleep production per 15s cycle (not rounded).
 * Same net math as the village side panel, with temp bonuses excluded and sleep
 * intensity applied. Fractions bank until they reach a whole unit.
 */
function getProductionPerInterval(
  state: any,
  multiplier: number,
): Record<string, number> {
  const jobIds = Object.keys(state.villagers ?? {}).filter(
    (id) => (state.villagers[id] ?? 0) > 0,
  );
  const effects = getTotalPopulationEffects(
    state,
    jobIds,
    SLEEP_PRODUCTION_OPTIONS,
  );
  const productionPerInterval: Record<string, number> = {};
  for (const [resource, amount] of Object.entries(effects)) {
    if (amount === 0) continue;
    const rate = tidySleepAmount(amount * multiplier);
    if (rate !== 0) productionPerInterval[resource] = rate;
  }
  const insight = getPassiveInsightPerCycle(state);
  if (insight > 0) {
    const rate = tidySleepAmount(
      (productionPerInterval.insight || 0) + insight * multiplier,
    );
    if (rate !== 0) productionPerInterval.insight = rate;
    else delete productionPerInterval.insight;
  }
  return productionPerInterval;
}

/** Apply one sleep production interval onto absolute resource amounts. */
function applySleepProductionInterval(
  state: any,
  multiplier: number,
  resources: Record<string, number>,
): void {
  const rates = getProductionPerInterval(state, multiplier);
  const before: Record<string, number> = { ...resources };
  for (const [resource, rate] of Object.entries(rates)) {
    resources[resource] = tidySleepAmount((resources[resource] || 0) + rate);
  }
  clampSimulatedResourcesToStorage(resources, state as GameState, before);
}

/** Same 15s production cycle and 8 Hz clock as the village ring. */
const SLEEP_CYCLE_MS = 15_000;

function sleepCycleProgress(startTime: number, now: number, active: boolean): number {
  if (!active || startTime <= 0) return 0;
  const into = Math.max(0, now - startTime) % SLEEP_CYCLE_MS;
  return Math.min((into / SLEEP_CYCLE_MS) * 100, 100);
}

/**
 * Cycle ring for the sleep dialog. Ticks on its own so the resource table
 * stays on the once-a-second clock.
 */
function SleepCycleIndicator({
  startTime,
  active,
  percent,
}: {
  startTime: number;
  active: boolean;
  percent: number;
}) {
  const { t } = useUiTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || startTime <= 0) return;
    const id = setInterval(() => setNow(Date.now()), CYCLE_RING_FRAME_MS);
    return () => clearInterval(id);
  }, [active, startTime]);

  const progress = sleepCycleProgress(startTime, now, active);
  const secondsRemaining = active
    ? Math.max(0, Math.ceil(((100 - progress) / 100) * (SLEEP_CYCLE_MS / 1000)))
    : 0;
  const cycleIcon = headerIndicatorIcon("cycle");

  return (
    <TooltipWrapper
      tooltip={
        <div className="text-xs">
          <div className="font-semibold">{t("village.cycle")}</div>
          {active && (
            <div>
              {t("village.nextCycleIn", {
                seconds: secondsRemaining,
              })}
            </div>
          )}
          <div className="border-t border-gray-600 my-1" />
          <div>
            {t("idleMode.villageProduction", {
              percent,
              defaultValue: "Village production: {{percent}}%",
            })}
          </div>
          <div className="border-t border-gray-600 my-1" />
          <div className="text-gray-400/70">
            {t("idleMode.villageProductionTooltip", {
              defaultValue:
                "Temporary production bonuses not active while sleeping",
            })}
          </div>
        </div>
      }
      tooltipId="idle-mode-village-production"
      disabled
      side="bottom"
      tooltipContentClassName="max-w-xs"
      tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
      className={GAME_PANEL_HEADER_INDICATOR_CLASS}
    >
      <div
        className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}
        role="img"
        aria-label={t("idleMode.villageProductionInfoAriaLabel", {
          defaultValue: "Village production details",
        })}
      >
        <CircularProgress
          value={progress}
          size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
          fill
          strokeWidth={2}
          className={cycleIcon.ringClassName}
        />
        <span className={cycleIcon.glyphClassName}>{cycleIcon.symbol}</span>
      </div>
    </TooltipWrapper>
  );
}

/** Rate column. The whole number and the decimal share one color. */
function formatSleepRate(amount: number): string {
  const parts = splitSleepDecimal(amount);
  const sign = parts.negative ? "-" : "+";
  return `${sign}${formatNumber(parts.whole)}${parts.fraction}`;
}

export default function IdleModeDialog() {
  const isOpen = useGameStore((s) => s.idleModeDialog.isOpen);
  if (!isOpen) return null;
  return <IdleModeDialogOpen />;
}

function IdleModeDialogOpen() {
  const { t } = useUiTranslation();
  const {
    idleModeDialog,
    sleepUpgrades,
    gameId,
    devMode,
    buildings,
  } = useGameStore(
    useShallow((s) => ({
      idleModeDialog: s.idleModeDialog,
      sleepUpgrades: s.sleepUpgrades,
      gameId: s.gameId,
      devMode: s.devMode,
      buildings: s.buildings,
    })),
  );
  const [accumulatedResources, setAccumulatedResources] = useState<
    Record<string, number>
  >({});
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [initialResources, setInitialResources] = useState<
    Record<string, number>
  >({});
  const [displayNow, setDisplayNow] = useState<number>(Date.now());
  const initialResourcesRef = useRef(initialResources);
  initialResourcesRef.current = initialResources;

  const state = useGameStore.getState();

  // Get current sleep duration and multiplier from upgrades (+ Black Estate)
  const blackEstateCount = buildings?.blackEstate ?? 0;
  const estateBonusHours = blackEstateCount * BLACK_ESTATE_SLEEP_HOURS;
  const estateBonusIntensityPct =
    blackEstateCount * BLACK_ESTATE_SLEEP_INTENSITY_PERCENT;
  const sleepLengthConfig =
    SLEEP_LENGTH_UPGRADES[sleepUpgrades?.lengthLevel || 0];
  const sleepIntensityConfig =
    SLEEP_INTENSITY_UPGRADES[sleepUpgrades?.intensityLevel || 0];
  const IDLE_DURATION_MS =
    (sleepLengthConfig.hours + estateBonusHours) * 60 * 60 * 1000;
  const PRODUCTION_SPEED_MULTIPLIER =
    (sleepIntensityConfig.percentage + estateBonusIntensityPct) / 100;
  // Refs so sleep timer/accumulation effects do not restart when these primitives
  // are recomputed (they are stable across renders unless upgrades/buildings change).
  const idleDurationMsRef = useRef(IDLE_DURATION_MS);
  idleDurationMsRef.current = IDLE_DURATION_MS;
  const productionSpeedMultiplierRef = useRef(PRODUCTION_SPEED_MULTIPLIER);
  productionSpeedMultiplierRef.current = PRODUCTION_SPEED_MULTIPLIER;

  // Reset local state when game changes (new game started)
  useEffect(() => {
    setAccumulatedResources({});
    setRemainingTime(0);
    setIsActive(false);
    setStartTime(0);
    setInitialResources({});
    setDisplayNow(Date.now());
  }, [gameId]);

  // Initialize idle mode when dialog opens.
  // Read the live store session: the hook value can be stale because this
  // effect does not list idleModeState in its deps.
  useEffect(() => {
    if (idleModeDialog.isOpen && !isActive) {
      const initNow = Date.now();
      const session = useGameStore.getState().idleModeState;

      if (resolveSleepDialogInit(session) === "resume") {
        const sessionStart = session?.startTime ?? 0;
        const initElapsed = initNow - sessionStart;
        const remaining = Math.max(0, IDLE_DURATION_MS - initElapsed);

        setStartTime(sessionStart);
        setRemainingTime(remaining);

        // Calculate resources accumulated while offline
        const secondsElapsed = Math.min(initElapsed, IDLE_DURATION_MS) / 1000;
        const intervals = Math.floor(secondsElapsed / 15); // How many 15-second intervals have passed

        // Get CURRENT resources state (most recent)
        const currentState = useGameStore.getState();

        // Start with CURRENT game resources (most recent state)
        const offlineResources: Record<string, number> = {
          ...currentState.resources,
        };

        // Simulate each 15-second interval
        for (let i = 0; i < intervals; i++) {
          applySleepProductionInterval(
            currentState,
            PRODUCTION_SPEED_MULTIPLIER,
            offlineResources,
          );
        }

        // Calculate the delta (change) from starting resources
        const startingResources = { ...currentState.resources };
        const resourceDeltas: Record<string, number> = {};
        Object.keys(offlineResources).forEach((resource) => {
          resourceDeltas[resource] =
            offlineResources[resource] -
            (startingResources[
              resource as keyof typeof startingResources
            ] || 0);
        });

        setAccumulatedResources(
          capSleepGainDeltasToStorageRoom(
            resourceDeltas,
            startingResources,
            currentState,
          ),
        );
        // Store the CURRENT resources as initial state (most recent before simulation started)
        setInitialResources(startingResources);
        // Only set active if there's time remaining - otherwise just show results
        const stillActive = remaining > 0;
        setIsActive(stillActive);

        if (stillActive) {
          audioManager.playSound("sleep", SOUND_VOLUME.sleep);
        }
      } else {
        // Fresh sleep: Estate usually writes startTime first, but this effect
        // can still run against a stale hook snapshot (startTime 0). Starting
        // here keeps Sleep from closing itself.
        const currentState = useGameStore.getState();
        setIsActive(true);
        setStartTime(initNow);
        setAccumulatedResources({});
        setRemainingTime(IDLE_DURATION_MS);
        setInitialResources({ ...currentState.resources });

        useGameStore.setState({
          idleModeState: {
            isActive: true,
            startTime: initNow,
            needsDisplay: true,
          },
        });

        audioManager.playSound("sleep", SOUND_VOLUME.sleep);

        void import("@/game/save")
          .then(({ saveGame }) => saveGame(useGameStore.getState(), false))
          .catch((error) => {
            logger.error("[SLEEP] Failed to save after starting sleep:", error);
          });
      }
    }
  }, [idleModeDialog.isOpen, isActive]);

  // Timer update loop (every second)
  useEffect(() => {
    if (!isActive || !idleModeDialog.isOpen) return;

    const timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, idleDurationMsRef.current - elapsed);

      setRemainingTime(remaining);
      setDisplayNow(now);

      if (remaining <= 0) {
        // Time's up - stop active state and resource accumulation
        setIsActive(false);

        // DO NOT CLEAR startTime HERE - only clear when user closes dialog
        useGameStore.setState({
          idleModeState: {
            isActive: false,
            startTime: startTime, // Keep the original startTime, don't reset to 0
            needsDisplay: false,
          },
        });
      }
    }, 1000); // Update timer every second

    return () => clearInterval(timerInterval);
  }, [isActive, idleModeDialog.isOpen, startTime]);

  // Resource accumulation loop (synchronized to timer intervals)
  useEffect(() => {
    // Stop accumulation if not active or dialog closed
    if (!isActive || !idleModeDialog.isOpen) return;

    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = Math.max(0, idleDurationMsRef.current - elapsed);

    // Don't start accumulation if time is already up
    if (remaining <= 0) {
      setIsActive(false);
      return;
    }

    // Calculate how many seconds have elapsed since idle mode started
    const secondsElapsed = Math.floor(elapsed / 1000);

    // Calculate how many seconds until the next 15-second mark from start
    const secondsUntilNextMark = 15 - (secondsElapsed % 15);
    const msUntilNextInterval = secondsUntilNextMark * 1000;

    const updateResources = () => {
      // Check if still active before updating
      const state = useGameStore.getState();
      if (!state.idleModeState?.isActive) {
        return false; // Signal to stop
      }

      const currentState = useGameStore.getState();
      const multiplier = productionSpeedMultiplierRef.current;

      // Accumulate resources using the same production functions as normal mode
      setAccumulatedResources((prev) => {
        const startingResources = initialResourcesRef.current;
        // Start with current tracked resources (delta from start)
        const currentTracked = { ...prev };

        // Create a simulated resource state (initial + accumulated changes)
        const simulatedResources: Record<string, number> = {};
        Object.keys(startingResources).forEach((resource) => {
          simulatedResources[resource] =
            (startingResources[resource] || 0) + (currentTracked[resource] || 0);
        });

        applySleepProductionInterval(
          currentState,
          multiplier,
          simulatedResources,
        );

        // Calculate new deltas from initial state
        const newDeltas: Record<string, number> = {};
        Object.keys(simulatedResources).forEach((resource) => {
          newDeltas[resource] =
            (simulatedResources[resource] || 0) -
            (startingResources[resource] || 0);
        });

        return capSleepGainDeltasToStorageRoom(
          newDeltas,
          startingResources,
          currentState,
        );
      });

      return true; // Continue
    };

    let resourceInterval: NodeJS.Timeout | null = null;

    const initialTimeout = setTimeout(() => {
      if (updateResources() === false) return;

      // After first sync, continue every 15 seconds
      resourceInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, idleDurationMsRef.current - elapsed);

        if (remaining <= 0 || updateResources() === false) {
          if (resourceInterval) clearInterval(resourceInterval);
          return;
        }
      }, 15000);
    }, msUntilNextInterval);

    return () => {
      clearTimeout(initialTimeout);
      if (resourceInterval) clearInterval(resourceInterval);
    };
  }, [isActive, idleModeDialog.isOpen, startTime]);

  const handleEndIdleMode = () => {
    const now = Date.now();
    const elapsed = startTime > 0 ? Math.max(0, now - startTime) : 0;

    // Freeze wall-clock bonus/debuff timers for the whole sleep session (incl. results screen).
    // Must run before the game loop resumes and clears expired endTimes.
    const currentGameState = useGameStore.getState();
    const timerPatch = buildSleepBonusTimerFreezePatch(
      currentGameState as SleepBonusTimerState,
      elapsed,
      startTime,
    );
    if (Object.keys(timerPatch).length > 0) {
      useGameStore.setState(timerPatch as Partial<typeof currentGameState>);
    }

    // Apply whole units only. The fraction stays uncollected.
    Object.entries(accumulatedResources).forEach(([resource, amount]) => {
      const whole = sleepWholeUnits(amount);
      if (whole === 0) return;
      useGameStore.getState().updateResource(
        resource as keyof typeof state.resources,
        whole,
      );
    });

    // Calculate Focus points gained (1 per almost 1 hour slept, or 1 per 5 seconds in dev mode)
    const focusIntervalMs = devMode ? 5 * 1000 : 59.99 * 60 * 1000;
    const hoursSlept = Math.floor(elapsed / focusIntervalMs);
    const dream = hasChosenPact(currentGameState, "cunning_trader")
      ? rollSleepDream(elapsed)
      : "none";

    let focusToAdd = 0;
    let focusGained = 0;
    if (hoursSlept > 0) {
      // Read after timer freeze so we keep shifted focus endTime/startTime.
      const afterFreeze = useGameStore.getState();
      const currentFocus = afterFreeze.focusState?.points || 0;
      const MAX_FOCUS = 30;
      focusToAdd = sleepFocusPoints(hoursSlept, {
        bellBlessing: Boolean(afterFreeze.blessings?.bell_blessing),
        goodDream: dream === "good",
      });

      const newFocusPoints = Math.min(currentFocus + focusToAdd, MAX_FOCUS);
      focusGained = Math.max(0, newFocusPoints - currentFocus);

      // Update focus points in focusState (capped at 30)
      afterFreeze.updateFocusState({
        isActive: afterFreeze.focusState?.isActive || false,
        endTime: afterFreeze.focusState?.endTime || 0,
        startTime: afterFreeze.focusState?.startTime || 0,
        duration: afterFreeze.focusState?.duration || 0,
        points: newFocusPoints,
      });

      // Persist on story like merchantPurchases; keep totalFocusEarned for older saves
      useGameStore.setState((prev) => ({
        totalFocusEarned: (prev.totalFocusEarned || 0) + hoursSlept,
        story: {
          ...prev.story,
          heavySleeperHours: (prev.story?.heavySleeperHours ?? 0) + hoursSlept,
        },
      }));
    }

    // Create log message showing resources gained
    const logMessages: string[] = [];

    if (Object.keys(accumulatedResources).length > 0) {
      const resourcesList = Object.entries(accumulatedResources)
        .map(([resource, amount]) => {
          const whole = sleepWholeUnits(amount);
          return { resource, whole };
        })
        .filter(({ whole }) => whole !== 0)
        .map(
          ({ resource, whole }) =>
            `${getResourceName(resource, capitalizeWords(resource))}: ${whole > 0 ? "+" : ""}${whole}`,
        )
        .join(", ");

      if (resourcesList) {
        const restMsg =
          hoursSlept > 0 && dream !== "good"
            ? `${t("idleMode.focusGainedLog", { count: focusToAdd })} `
            : "";

        logMessages.push(
          `${restMsg}${t("idleMode.villagersProducedLog", { resources: resourcesList })}`,
        );
      }
    }

    if (logMessages.length > 0) {
      useGameStore.getState().addLogEntry({
        id: `idle-mode-end-${Date.now()}`,
        message: logMessages.join(" "),
        timestamp: Date.now(),
        type: "system",
      });
    }

    // Stop sleep sound when ending idle mode
    audioManager.stopLoopingSound("sleep", 1);

    // Reset production cycle so the next tick starts a fresh 15-second interval
    resetProductionCycle();

    // Clear persisted idle mode state completely - now reset startTime to 0
    useGameStore.setState({
      idleModeState: {
        isActive: false,
        startTime: 0, // Reset to 0 only when user closes dialog
        needsDisplay: false,
      },
      idleModeDialog: { isOpen: false },
    });

    // Persist wake so a remount / reload cannot restore the sleep dialog.
    void import("@/game/save")
      .then(({ saveGame }) => saveGame(useGameStore.getState(), false))
      .catch((error) => {
        logger.error("[SLEEP] Failed to save after wake:", error);
      });

    if (dream === "bad") {
      scheduleCallbackWhenDialogClear(
        useGameStore.getState,
        () => {
          const store = useGameStore.getState();
          useGameStore.setState({ badDreamsState: startBadDreams() });
          openEventDialogNow(
            useGameStore.setState,
            buildBadDreamDialogEntry(store),
          );
        },
        SLEEP_DREAM_DELAY_MS,
      );
    } else if (dream === "good" && focusGained > 0) {
      const store = useGameStore.getState();
      scheduleRewardDialogWhenClear(
        useGameStore.getState,
        {
          rewards: { focus: focusGained },
          successLog: resolveEventMessage("goodDreams", undefined, store),
          title:
            resolveEventTitle("goodDreams", store) || "Good Dreams",
          variant: "success",
        },
        SLEEP_DREAM_DELAY_MS,
      );
    }

    // Close dialog and reset local state
    setIsActive(false);
    setAccumulatedResources({});
    setStartTime(0);
    setInitialResources({});
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Show resources that are being produced
  const displayElapsed = displayNow - startTime;

  // Calculate Focus points (1 per almost 1 hour slept, or 1 per 5 seconds in dev mode)
  const focusIntervalMs = devMode ? 5 * 1000 : 59.99 * 60 * 1000;
  const focusPoints = Math.floor(displayElapsed / focusIntervalMs);

  // Theoretical sleep net rate (pos + neg); yellow amount when storage is full
  const productionPerInterval = getProductionPerInterval(
    state,
    PRODUCTION_SPEED_MULTIPLIER,
  );

  // Include net-negative rates and resources that only appear via accumulated drain
  // (rate can drop to 0 mid-sleep when crafting jobs stall for lack of inputs).
  const resourceKeys = Array.from(
    new Set([
      ...Object.keys(productionPerInterval),
      ...Object.keys(accumulatedResources),
    ]),
  ).filter((r) => {
    if (BOMB_RESOURCES.includes(r as (typeof BOMB_RESOURCES)[number])) {
      return false;
    }
    const rate = tidySleepAmount(productionPerInterval[r] ?? 0);
    const total = tidySleepAmount(accumulatedResources[r] || 0);
    return rate !== 0 || total !== 0;
  });
  const displayResources = [
    ...sortResourcesLikeSidePanel(resourceKeys),
    "Focus",
  ];

  const isTimeUp = remainingTime <= 0;
  const villageProductionPercent =
    sleepIntensityConfig.percentage + estateBonusIntensityPct;
  const sleepProgress = isTimeUp
    ? 100
    : IDLE_DURATION_MS > 0 && startTime > 0
      ? Math.min(100, ((displayNow - startTime) / IDLE_DURATION_MS) * 100)
      : 0;

  return (
    <Dialog
      open={idleModeDialog.isOpen}
      onOpenChange={() => { }}
      // Non-modal so header/footer chrome stay clickable. Gameplay is already
      // blocked by the sleep fog overlay; Share and other header dialogs use z-70.
      modal={false}
    >
      <DialogContent
        className="[--adc-dialog-max-w:28rem]"
        layerZIndex={60}
        hideClose={true}
        hideOverlay={true}
      >
        <DialogHeader>
          <div className="game-panel-produce-effects flex items-center gap-1.5">
            <DialogTitle className="pr-0">{t("idleMode.sleeping")}</DialogTitle>
            <SleepCycleIndicator
              startTime={startTime}
              active={isActive}
              percent={villageProductionPercent}
            />
          </div>
          <DialogDescription className="py-1 space-y-2 text-xs">
            {isTimeUp ? (
              <span className="pt-2">{t("idleMode.awake")}</span>
            ) : (
              <span>
                {t("idleMode.wakingIn", { time: formatTime(remainingTime) })}
              </span>
            )}
            <Progress
              value={sleepProgress}
              className="h-2"
              disableGlow
              hideBorder
            />
          </DialogDescription>
        </DialogHeader>

        <div className="pb-1.5 border-border text-xs space-y-0.5">
          {displayResources.map((resource) => {
            const isFocus = resource === "Focus";
            const resourceLabel = isFocus
              ? t("estate.focus")
              : getResourceName(resource, capitalizeWords(resource));
            const exactGain = isFocus
              ? focusPoints
              : getSleepTotalGainDisplay(
                resource,
                accumulatedResources[resource] || 0,
                initialResources[resource] || 0,
                state,
              );
            const settledGain = isFocus ? focusPoints : sleepWholeUnits(exactGain);
            const currentAmount = isFocus
              ? focusPoints
              : (initialResources[resource] || 0) + settledGain;
            const gainParts = isFocus ? null : splitSleepDecimal(exactGain);
            // Decimal only while the first whole unit is still banking.
            const showGainFraction =
              gainParts != null && exactGain !== 0 && Math.abs(exactGain) < 1;
            const isAtStorageMax =
              !isFocus &&
              isSleepResourceAtStorageMax(resource, currentAmount, state);
            const productionRate = isFocus
              ? null
              : tidySleepAmount(productionPerInterval[resource] ?? 0);
            // Match side-panel resource numbers: mono + tabular + text-xs
            const numberCellClass =
              "text-right font-mono tabular-nums whitespace-nowrap leading-none flex items-center justify-end min-w-0";
            return (
              <div
                key={resource}
                className={cn(
                  "grid gap-x-3 items-center py-0.5",
                  isFocus && "mt-1.5",
                )}
                style={{
                  gridTemplateColumns: "minmax(0,1fr) 4.5rem 4.5rem 4.5rem",
                }}
              >
                <div className="text-gray-400 truncate leading-tight">
                  {resourceLabel}
                </div>
                <div
                  className={cn(
                    numberCellClass,
                    isAtStorageMax ? "text-yellow-500" : "text-gray-300",
                  )}
                >
                  {currentAmount < 0 && (
                    <span className="font-mono tabular-nums">-</span>
                  )}
                  <AnimatedCounter
                    value={Math.abs(currentAmount)}
                    align="end"
                    className="font-mono"
                  />
                </div>
                <div
                  className={cn(
                    numberCellClass,
                    !isFocus &&
                    (productionRate ?? 0) > 0 &&
                    (isAtStorageMax ? "text-yellow-500" : "text-green-600"),
                    !isFocus &&
                    (productionRate ?? 0) < 0 &&
                    "text-red-600",
                    !isFocus &&
                    (productionRate ?? 0) === 0 &&
                    "text-gray-300",
                  )}
                >
                  {!isFocus && (
                    <span className="font-mono tabular-nums">
                      {formatSleepRate(productionRate ?? 0)}
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    numberCellClass,
                    exactGain > 0 && "text-green-600",
                    exactGain < 0 && "text-red-600",
                    exactGain === 0 && "text-gray-300",
                  )}
                >
                  <span className="font-mono tabular-nums">
                    {exactGain >= 0 ? "+" : "-"}
                  </span>
                  <AnimatedCounter
                    value={gainParts ? gainParts.whole : Math.abs(focusPoints)}
                    align="end"
                    className="font-mono"
                  />
                  {showGainFraction && gainParts && (
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {gainParts.fraction}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleEndIdleMode}
            variant="outline"
            size="xs"
            className={cn(
              "text-xs adc-btn-dialog-cta",
              gameActionOutlineButtonClassName(false),
            )}
            button_id="idle-wake"
          >
            {isTimeUp ? t("idleMode.getUp") : t("idleMode.wake")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
