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
import { useGameStore } from "@/game/state";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { gameActionOutlineButtonClassName } from "@/components/CooldownButton";
import { capitalizeWords, cn } from "@/lib/utils";
import {
  getCurrentPopulation,
  getPopulationProduction,
  getTotalPopulationEffects,
  isVillagerFoodUpkeepActive,
  isVillagerWoodUpkeepActive,
} from "@/game/population";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import { resetProductionCycle } from "@/game/loop";
import { BOMB_RESOURCES, capResourceToLimit } from "@/game/resourceLimits";
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
import { useTranslation } from "react-i18next";
import { getResourceName } from "@/i18n/resolveGameText";
import {
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
} from "@/game/sleepGainDisplay";

/** Match live play: limited resources cannot exceed storage cap during sleep simulation. */
function clampSimulatedResourcesToStorage(
  simulated: Record<string, number>,
  gameState: GameState,
): void {
  for (const key of Object.keys(simulated)) {
    const v = simulated[key];
    if (v === undefined || v === null || Number.isNaN(v)) continue;
    simulated[key] = capResourceToLimit(key, Math.max(0, v), gameState);
  }
}

// Simulate production during sleep - no temporary bonuses (feast, curse, etc.) are active
const SLEEP_PRODUCTION_OPTIONS = { excludeTemporaryBonuses: true };

// Simulate production functions from loop.ts
function simulateGathererProduction(
  state: any,
  multiplier: number,
  accumulatedResources: Record<string, number>,
) {
  const gatherer = state.villagers.gatherer;
  if (gatherer > 0) {
    const production = getPopulationProduction(
      "gatherer",
      gatherer,
      state,
      SLEEP_PRODUCTION_OPTIONS,
    );
    production.forEach((prod) => {
      const amount = prod.totalAmount * multiplier;
      accumulatedResources[prod.resource] =
        (accumulatedResources[prod.resource] || 0) + amount;
    });
  }
}

function simulateHunterProduction(
  state: any,
  multiplier: number,
  accumulatedResources: Record<string, number>,
) {
  const hunter = state.villagers.hunter;
  if (hunter > 0) {
    const production = getPopulationProduction(
      "hunter",
      hunter,
      state,
      SLEEP_PRODUCTION_OPTIONS,
    );
    production.forEach((prod) => {
      const amount = prod.totalAmount * multiplier;
      accumulatedResources[prod.resource] =
        (accumulatedResources[prod.resource] || 0) + amount;
    });
  }
}

function simulateMinerProduction(
  state: any,
  multiplier: number,
  accumulatedResources: Record<string, number>,
) {
  // Collect all production data
  const allProduction: { job: string; production: any[] }[] = [];
  Object.entries(state.villagers).forEach(([job, count]) => {
    if (
      count > 0 &&
      (job.endsWith("miner") ||
        job === "steel_forger" ||
        job === "blacksteel_forger" ||
        job === "tanner" ||
        job === "powder_maker" ||
        job === "ashfire_dust_maker")
    ) {
      const production = getPopulationProduction(
        job,
        count as number,
        state,
        SLEEP_PRODUCTION_OPTIONS,
      );
      allProduction.push({ job, production });
    }
  });

  // Track available resources after each job's production/consumption
  const availableResources = { ...accumulatedResources };

  // Process each job sequentially
  allProduction.forEach(({ job, production }) => {
    // Check if this job can produce based on currently available resources
    const canProduce = production.every((prod) => {
      if (prod.totalAmount < 0) {
        // Consumption - check if we have enough available
        const available = availableResources[prod.resource] || 0;
        const needed = Math.abs(prod.totalAmount * multiplier);
        return available >= needed;
      }
      return true; // Production is always allowed
    });

    // Only apply production if all resources are available
    if (canProduce) {
      production.forEach((prod) => {
        const amount = prod.totalAmount * multiplier;
        // Update both the tracked available resources and accumulated resources
        availableResources[prod.resource] =
          (availableResources[prod.resource] || 0) + amount;
        accumulatedResources[prod.resource] =
          (accumulatedResources[prod.resource] || 0) + amount;
      });
    }
  });
}

function simulatePassiveEffectProduction(
  state: any,
  multiplier: number,
  accumulatedResources: Record<string, number>,
) {
  const insight = getPassiveInsightPerCycle(state);
  if (insight <= 0) return;
  accumulatedResources["insight"] =
    (accumulatedResources["insight"] || 0) + insight * multiplier;
}

function simulatePopulationConsumption(
  state: any,
  multiplier: number,
  accumulatedResources: Record<string, number>,
) {
  const totalPopulation = getCurrentPopulation(state);

  if (totalPopulation > 0) {
    if (isVillagerFoodUpkeepActive(state)) {
      const foodConsumption = totalPopulation * multiplier;
      accumulatedResources["food"] =
        (accumulatedResources["food"] || 0) - foodConsumption;
    }
    if (isVillagerWoodUpkeepActive(state)) {
      const woodConsumption = totalPopulation * multiplier;
      accumulatedResources["wood"] =
        (accumulatedResources["wood"] || 0) - woodConsumption;
    }
  }
}

/**
 * Sleep production rate per 15s cycle for the dialog column.
 * Uses the same net math as the village side panel (includes consumption), with
 * temporary bonuses excluded and sleep intensity applied — not the affordability-
 * gated tick sim, which can hide negative nets when stockpiles are empty/unready.
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
    const scaled = amount * multiplier;
    if (scaled !== 0) {
      productionPerInterval[resource] = scaled;
    }
  }
  const insight = getPassiveInsightPerCycle(state);
  if (insight > 0) {
    productionPerInterval.insight =
      (productionPerInterval.insight || 0) + insight * multiplier;
  }
  return productionPerInterval;
}

export default function IdleModeDialog() {
  const { t } = useTranslation("ui");
  const {
    idleModeDialog,
    setIdleModeDialog,
    idleModeState,
    sleepUpgrades,
    gameId,
    devMode,
    buildings,
    shareDialogOpen,
  } = useGameStore();
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
  const estateBonusHours = blackEstateCount * 3;
  const estateBonusIntensityPct = blackEstateCount * 5;
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

  // Initialize idle mode when dialog opens
  useEffect(() => {
    if (idleModeDialog.isOpen && !isActive) {
      const initNow = Date.now();

      // Check if there's a persisted idle mode state
      if (idleModeState?.startTime && idleModeState.startTime > 0) {
        const initElapsed = initNow - idleModeState.startTime;
        const remaining = Math.max(0, IDLE_DURATION_MS - initElapsed);

        setStartTime(idleModeState.startTime);
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
          simulateGathererProduction(
            currentState,
            PRODUCTION_SPEED_MULTIPLIER,
            offlineResources,
          );
          simulateHunterProduction(
            currentState,
            PRODUCTION_SPEED_MULTIPLIER,
            offlineResources,
          );
          simulateMinerProduction(
            currentState,
            PRODUCTION_SPEED_MULTIPLIER,
            offlineResources,
          );
          simulatePassiveEffectProduction(
            currentState,
            PRODUCTION_SPEED_MULTIPLIER,
            offlineResources,
          );
          simulatePopulationConsumption(
            currentState,
            PRODUCTION_SPEED_MULTIPLIER,
            offlineResources,
          );
          clampSimulatedResourcesToStorage(offlineResources, currentState);
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
      } else if (!idleModeState?.isActive && idleModeState?.startTime === 0) {
        // Only start fresh idle mode if there's no active state AND no previous startTime
        // This prevents starting a new idle mode after one just finished

        // Get the CURRENT (most recent) resources state
        const currentState = useGameStore.getState();
        setIsActive(true);
        setStartTime(initNow);
        setAccumulatedResources({});
        setRemainingTime(IDLE_DURATION_MS);
        // Store the CURRENT resources as initial state
        setInitialResources({ ...currentState.resources });

        // Persist the start time
        useGameStore.setState({
          idleModeState: {
            isActive: true,
            startTime: initNow,
            needsDisplay: true,
          },
        });

        // Play sleep sound when entering sleep mode
        audioManager.playSound("sleep", SOUND_VOLUME.sleep);

        // Immediately save to Supabase so user can close tab
        (async () => {
          const { saveGame } = await import("@/game/save");
          const currentState = useGameStore.getState();
          await saveGame(currentState, currentState.playTime);
        })();
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

        // Apply production functions to the simulated state
        simulateGathererProduction(currentState, multiplier, simulatedResources);
        simulateHunterProduction(currentState, multiplier, simulatedResources);
        simulateMinerProduction(currentState, multiplier, simulatedResources);
        simulatePassiveEffectProduction(
          currentState,
          multiplier,
          simulatedResources,
        );
        simulatePopulationConsumption(
          currentState,
          multiplier,
          simulatedResources,
        );
        clampSimulatedResourcesToStorage(
          simulatedResources,
          currentState as GameState,
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

    // Apply accumulated resources to the game state
    Object.entries(accumulatedResources).forEach(([resource, amount]) => {
      useGameStore.getState().updateResource(
        resource as keyof typeof state.resources,
        Math.floor(amount),
      );
    });

    // Calculate Focus points gained (1 per almost 1 hour slept, or 1 per 5 seconds in dev mode)
    const focusIntervalMs = devMode ? 5 * 1000 : 59.99 * 60 * 1000;
    const hoursSlept = Math.floor(elapsed / focusIntervalMs);

    let focusToAdd = 0;
    if (hoursSlept > 0) {
      // Read after timer freeze so we keep shifted focus endTime/startTime.
      const afterFreeze = useGameStore.getState();
      const currentFocus = afterFreeze.focusState?.points || 0;
      const MAX_FOCUS = 30;
      focusToAdd = hoursSlept;

      // Double focus points if bell_blessing is active
      if (afterFreeze.blessings?.bell_blessing && focusToAdd > 0) {
        focusToAdd = focusToAdd * 2;
      }

      const newFocusPoints = Math.min(currentFocus + focusToAdd, MAX_FOCUS);

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
        .filter(([_, amount]) => Math.floor(amount) !== 0)
        .map(
          ([resource, amount]) =>
            `${getResourceName(resource, capitalizeWords(resource))}: ${Math.floor(amount) > 0 ? "+" : ""}${Math.floor(amount)}`,
        )
        .join(", ");

      if (resourcesList) {
        const restMsg =
          hoursSlept > 0
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
    const rate = productionPerInterval[r] ?? 0;
    const total = Math.floor(accumulatedResources[r] || 0);
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
      modal={!shareDialogOpen}
    >
      <DialogContent
        className="[--adc-dialog-max-w:28rem]"
        layerZIndex={60}
        hideClose={true}
        hideOverlay={true}
      >
        <DialogHeader>
          <DialogTitle className="pr-0">{t("idleMode.sleeping")}</DialogTitle>
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
          <div className="text-muted-foreground pb-1">
            {t("idleMode.villageProduction", {
              percent: villageProductionPercent,
            })}
          </div>
          {displayResources.map((resource) => {
            const isFocus = resource === "Focus";
            const resourceLabel = isFocus
              ? t("estate.focus")
              : getResourceName(resource, capitalizeWords(resource));
            const currentAmount = isFocus
              ? focusPoints
              : Math.floor(
                capResourceToLimit(
                  resource,
                  (initialResources[resource] || 0) +
                  (accumulatedResources[resource] || 0),
                  state as GameState,
                ),
              );
            const isAtStorageMax =
              !isFocus &&
              isSleepResourceAtStorageMax(resource, currentAmount, state);
            // Show uncapped production; yellow amount + rate when storage is full
            const productionRate = isFocus
              ? null
              : (productionPerInterval[resource] ?? 0);
            // Last column: stop counting once storage is full (no overflow gains)
            const totalSinceStart = isFocus
              ? focusPoints
              : getSleepTotalGainDisplay(
                resource,
                accumulatedResources[resource] || 0,
                initialResources[resource] || 0,
                state,
              );
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
                      {(productionRate ?? 0) > 0 ? "+" : ""}
                      {(productionRate ?? 0).toFixed(1)}
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    numberCellClass,
                    totalSinceStart > 0 && "text-green-600",
                    totalSinceStart < 0 && "text-red-600",
                    totalSinceStart === 0 && "text-gray-300",
                  )}
                >
                  <span className="font-mono tabular-nums">
                    {totalSinceStart >= 0 ? "+" : "-"}
                  </span>
                  <AnimatedCounter
                    value={Math.abs(totalSinceStart)}
                    align="end"
                    className="font-mono"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleEndIdleMode}
            variant="outline"
            className={cn(
              "text-xs h-8",
              gameActionOutlineButtonClassName(false),
            )}
          >
            {isTimeUp ? t("idleMode.getUp") : t("idleMode.wake")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
