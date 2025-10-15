
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

  // Calculate completed waves percentage (dark red)
  const completedWaves = currentWaveIndex === -1 ? 5 : currentWaveIndex;
  const completedPercentage = (completedWaves / totalWaves) * 100;
  
  // Calculate current wave percentage (normal red) - only if not all complete
  const currentWavePercentage = currentWaveIndex === -1 ? 0 : ((completedWaves + 1) / totalWaves) * 100;

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
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
        {/* Completed waves - normal red */}
        <div 
          className="absolute h-full bg-red-900 transition-all duration-300"
          style={{ width: `${completedPercentage}%` }}
        />
        {/* Current wave - dark red */}
        {currentWaveIndex !== -1 && (
          <div 
            className="absolute h-full bg-red-950 transition-all duration-300"
            style={{ 
              left: `${completedPercentage}%`,
              width: `${currentWavePercentage - completedPercentage}%` 
            }}
          />
        )}
      </div>
    </div>
  );
}
