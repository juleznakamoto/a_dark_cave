import { useGameStore } from '@/game/state';
import { Progress } from '@/components/ui/progress';

export default function AttackWavesChart() {
  const { story } = useGameStore();

  const waves = [
    { id: 'firstWave', completed: story?.seen?.firstWaveVictory || false },
    { id: 'secondWave', completed: story?.seen?.secondWaveVictory || false },
    { id: 'thirdWave', completed: story?.seen?.thirdWaveVictory || false },
    { id: 'fourthWave', completed: story?.seen?.fourthWaveVictory || false },
    { id: 'fifthWave', completed: story?.seen?.gameCompleted || false },
  ];

  // Find current wave (first incomplete wave, or 5 if all complete)
  const currentWaveIndex = waves.findIndex(wave => !wave.completed);
  const currentWave = currentWaveIndex === -1 ? 5 : currentWaveIndex + 1;
  const totalWaves = 5;

  // Calculate progress percentage
  const progressPercentage = ((currentWave ) / totalWaves) * 100;

  // Only show if bastion exists
  const shouldShowChart = story?.seen?.hasBastion || false;

  if (!shouldShowChart) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-foreground">Attack Waves</h3>
        <span className="text-xs text-muted-foreground">
          Current Wave: {currentWave} / {totalWaves}
        </span>
      </div>
      <Progress 
        value={progressPercentage} 
        className="h-3 [&>div]:bg-red-900"
      />
    </div>
  );
}