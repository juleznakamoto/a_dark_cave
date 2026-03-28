import { useGameStore } from "@/game/state";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getAttackWavesChartRows } from "@/game/rules/eventsAttackWaves";
import { TOTAL_ATTACK_WAVES } from "@/game/rules/attackWaveOrder";

export default function AttackWavesChart() {
  // Subscribe to slices that drive chart rows and timers; timer label ticks once per second.
  const story = useGameStore((s) => s.story);
  const buildings = useGameStore((s) => s.buildings);
  const weapons = useGameStore((s) => s.weapons);
  const attackWaveTimers = useGameStore((s) => s.attackWaveTimers);
  const [, setTimerTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const waves = getAttackWavesChartRows({ story, buildings, weapons });

  const handleProvoke = async (waveId: string) => {
    const timer = attackWaveTimers?.[waveId];
    const elapsed = timer?.elapsedTime || 0;
    const remaining = timer ? Math.max(0, timer.duration - elapsed) : 0;

    if (timer && !timer.defeated && remaining > 0 && !timer.provoked) {
      useGameStore.setState((state) => ({
        attackWaveTimers: {
          ...state.attackWaveTimers,
          [waveId]: {
            ...timer,
            elapsedTime: timer.duration,
            provoked: true,
          },
        },
      }));

      const { manualSave } = await import("@/game/loop");
      await manualSave();
    }
  };

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
  const displayCurrentWave = allWavesCompleted
    ? totalWaves
    : currentWaveIndex + 1;
  const currentWavePercentage = allWavesCompleted
    ? 100
    : (completedWaves / totalWaves) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          Attack Waves
        </span>
        <span className="text-xs text-muted-foreground">
          {displayCurrentWave}/{totalWaves}
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
          <div className="flex items-center justify-between">
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
            <Button
              onClick={() => handleProvoke(activeWave.id)}
              variant="outline"
              size="xs"
              className="w-19 hover:bg-background hover:text-foreground"
              button_id="provoke-attack"
              disabled={
                attackWaveTimers[activeWave.id]?.provoked ||
                getTimeRemaining(activeWave.id) <= 0
              }
            >
              Provoke
            </Button>
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
