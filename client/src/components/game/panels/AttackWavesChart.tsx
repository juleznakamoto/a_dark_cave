import { useGameStore } from "@/game/state";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function AttackWavesChart() {
  const { story, attackWaveTimers, flags } = useGameStore();
  const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});

  const waves = [
    { 
      id: "firstWave", 
      name: "First Wave",
      completed: story?.seen?.firstWaveVictory || false,
      conditionMet: flags.portalBlasted && story?.seen?.hasBastion,
    },
    { 
      id: "secondWave", 
      name: "Second Wave",
      completed: story?.seen?.secondWaveVictory || false,
      conditionMet: story?.seen?.firstWaveVictory,
    },
    { 
      id: "thirdWave", 
      name: "Third Wave",
      completed: story?.seen?.thirdWaveVictory || false,
      conditionMet: story?.seen?.wizardDecryptsScrolls && story?.seen?.secondWaveVictory,
    },
    { 
      id: "fourthWave", 
      name: "Fourth Wave",
      completed: story?.seen?.fourthWaveVictory || false,
      conditionMet: useGameStore.getState().weapons?.frostglass_sword && story?.seen?.thirdWaveVictory,
    },
    { 
      id: "fifthWave", 
      name: "Fifth Wave",
      completed: story?.seen?.fifthWaveVictory || false,
      conditionMet: useGameStore.getState().weapons?.bloodstone_staff && story?.seen?.fourthWaveVictory,
    },
  ];

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTimeRemaining: Record<string, number> = {};

      Object.entries(attackWaveTimers || {}).forEach(([waveId, timer]) => {
        if (!timer.defeated && timer.startTime > 0) {
          const elapsed = now - timer.startTime;
          const remaining = Math.max(0, timer.duration - elapsed);
          newTimeRemaining[waveId] = remaining;
        }
      });

      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [attackWaveTimers]);

  const handleProvoke = async (waveId: string) => {
    const timer = attackWaveTimers?.[waveId];
    if (timer && !timer.defeated && timeRemaining[waveId] > 0 && !timer.provoked) {
      useGameStore.setState((state) => ({
        attackWaveTimers: {
          ...state.attackWaveTimers,
          [waveId]: {
            ...timer,
            startTime: Date.now() - timer.duration, // Set elapsed to duration (timer expired)
            provoked: true,
          },
        },
      }));

      // Trigger immediate save to persist provoked state
      const { manualSave } = await import('@/game/loop');
      await manualSave();
    }
  };

  const formatTime = (ms: number): string => {
    if (ms <= 0) return "soon";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Helper to calculate remaining time synchronously
  const getTimeRemaining = (waveId: string): number => {
    const timer = attackWaveTimers?.[waveId];
    if (!timer || timer.defeated || timer.startTime <= 0) return 0;

    const elapsed = Date.now() - timer.startTime;
    return Math.max(0, timer.duration - elapsed);
  };

  // Find current active wave (first incomplete wave with condition met)
  const activeWave = waves.find(wave => !wave.completed && wave.conditionMet);

  // Only show if bastion exists
  const shouldShowChart = story?.seen?.hasBastion || false;

  if (!shouldShowChart) {
    return null;
  }

  // Find current wave index for progress bar
  const currentWaveIndex = waves.findIndex((wave) => !wave.completed);
  const currentWave = currentWaveIndex === -1 ? 5 : currentWaveIndex;
  const totalWaves = 5;
  const completedWaves = currentWaveIndex === -1 ? 5 : currentWaveIndex;
  const allWavesCompleted = currentWaveIndex === -1;
  const currentWavePercentage = allWavesCompleted ? 100 : ((completedWaves) / totalWaves) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          Attack Waves
        </span>
        <span className="text-xs text-muted-foreground">
          {currentWave}/{totalWaves}
        </span>
      </div>
      <Progress
        value={currentWavePercentage}
        className="h-2"
        segments={5}
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
                : "Preparing..."}
            </span>
          </div>
          {attackWaveTimers?.[activeWave.id] && (
            <Button
              onClick={() => handleProvoke(activeWave.id)}
              variant="outline"
              size="xs"
              className="w-19 hover:bg-transparent hover:text-foreground"
              button_id="provoke-attack"
              disabled={attackWaveTimers[activeWave.id]?.provoked || getTimeRemaining(activeWave.id) <= 0}
            >
              Provoke
            </Button>
          )}
        </div>
      ) : currentWave < totalWaves && (
        <div>
          <span className="text-xs italic text-muted-foreground">
            It is calm, for now...
          </span>
        </div>
      )}
    </div>
  );
}