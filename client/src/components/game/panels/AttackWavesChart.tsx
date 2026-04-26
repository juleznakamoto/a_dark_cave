import type { GameState } from "@shared/schema";
import { useGameStore } from "@/game/state";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { getAttackWavesChartRows } from "@/game/rules/eventsAttackWaves";
import { TOTAL_ATTACK_WAVES } from "@/game/rules/attackWaveOrder";
import {
  canExecuteAction,
  getActionCostBreakdown,
  getResourcesFromActionCost,
} from "@/game/rules";
import CooldownButton from "@/components/CooldownButton";

const PROVOKE_ACTION_ID = "provokeAttackWave" as const;

export default function AttackWavesChart() {
  // Subscribe to slices that drive chart rows and timers; timer label ticks once per second.
  const story = useGameStore((s) => s.story);
  const buildings = useGameStore((s) => s.buildings);
  const weapons = useGameStore((s) => s.weapons);
  const attackWaveTimers = useGameStore((s) => s.attackWaveTimers);
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);
  const executeAction = useGameStore((s) => s.executeAction);
  const [, setTimerTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const waves = getAttackWavesChartRows({ story, buildings, weapons });

  const state = useGameStore.getState() as unknown as GameState;

  const formatTime = (ms: number): string => {
    if (ms <= 0) return "soon";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getTimeRemaining = (waveId: string): number => {
    const timer = attackWaveTimers?.[waveId];
    if (!timer || timer.defeated || timer.startTime <= 0) return 0;

    const elapsed = timer.elapsedTime || 0;
    return Math.max(0, timer.duration - elapsed);
  };

  const activeWave = waves.find((wave) => !wave.completed && wave.conditionMet);

  const shouldShowChart = buildings.bastion || false;

  if (!shouldShowChart) {
    return null;
  }

  const currentWaveIndex = waves.findIndex((wave) => !wave.completed);
  const totalWaves = TOTAL_ATTACK_WAVES;
  const completedWaves =
    currentWaveIndex === -1 ? TOTAL_ATTACK_WAVES : currentWaveIndex;
  const allWavesCompleted = currentWaveIndex === -1;
  const currentWavePercentage = allWavesCompleted
    ? 100
    : (completedWaves / totalWaves) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-foreground">
          Attack Waves
        </span>
        <span className="text-xs text-muted-foreground">
          {completedWaves}/{totalWaves}
        </span>
      </div>
      <Progress
        value={currentWavePercentage}
        className="h-2"
        segments={TOTAL_ATTACK_WAVES}
        indicatorClassName="bg-orange-950"
      />

      {activeWave ? (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-foreground">
              {activeWave.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {attackWaveTimers?.[activeWave.id]
                ? formatTime(getTimeRemaining(activeWave.id))
                : "It is calm, for now..."}
            </span>
          </div>
          {attackWaveTimers?.[activeWave.id] && (
            <CooldownButton
              actionId={PROVOKE_ACTION_ID}
              onClick={async () => {
                executeAction(PROVOKE_ACTION_ID);
                const { manualSave } = await import("@/game/loop");
                await manualSave();
              }}
              cooldownMs={0}
              variant="outline"
              size="xs"
              className="w-19 hover:bg-background hover:text-foreground"
              button_id="provoke-attack"
              data-testid="button-provoke-attack"
              disabled={!canExecuteAction(PROVOKE_ACTION_ID, state)}
              tooltip={
                <div className="text-xs whitespace-nowrap">
                  {getActionCostBreakdown(PROVOKE_ACTION_ID, state).map(
                    (row, index) => (
                      <div
                        key={index}
                        className={
                          row.satisfied ? "" : "text-muted-foreground"
                        }
                      >
                        {row.text}
                      </div>
                    ),
                  )}
                </div>
              }
              onMouseEnter={() => {
                setHighlightedResources(
                  getResourcesFromActionCost(PROVOKE_ACTION_ID, state),
                );
              }}
              onMouseLeave={() => {
                setHighlightedResources([]);
              }}
            >
              Provoke
            </CooldownButton>
          )}
        </div>
      ) : (
        !allWavesCompleted && (
          <div>
            <span className="text-xs italic text-muted-foreground">
              It is calm, for now...
            </span>
          </div>
        )
      )}
    </div>
  );
}
