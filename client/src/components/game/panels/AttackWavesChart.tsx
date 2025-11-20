import { useGameStore } from "@/game/state";
import { Progress } from "@/components/ui/progress";

export default function AttackWavesChart() {
  const { story } = useGameStore();

  const waves = [
    { id: "firstWave", completed: story?.seen?.firstWaveVictory || false },
    { id: "secondWave", completed: story?.seen?.secondWaveVictory || false },
    { id: "thirdWave", completed: story?.seen?.thirdWaveVictory || false },
    { id: "fourthWave", completed: story?.seen?.fourthWaveVictory || false },
    { id: "fifthWave", completed: story?.seen?.fifthWaveVictory || false },
  ];

  // Find current wave (first incomplete wave, or 5 if all complete)
  const currentWaveIndex = waves.findIndex((wave) => !wave.completed);
  const currentWave = currentWaveIndex === -1 ? 5 : currentWaveIndex ;
  const totalWaves = 5;

  // Calculate completed waves percentage (dark red)
  const completedWaves = currentWaveIndex === -1 ? 5 : currentWaveIndex;
  const completedPercentage = (completedWaves / totalWaves) * 100;

  // Calculate current wave percentage (normal red) - only if not all complete
  const currentWavePercentage =
    currentWaveIndex === -1 ? 0 : ((completedWaves ) / totalWaves) * 100;

  // Only show if bastion exists
  const shouldShowChart = story?.seen?.hasBastion || false;

  if (!shouldShowChart) {
    return null;
  }

  return (
    <div className="space-y-1">
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
    </div>
  );
}