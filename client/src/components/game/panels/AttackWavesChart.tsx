
import { useGameStore } from '@/game/state';
import { Progress } from '@/components/ui/progress';

export default function AttackWavesChart() {
  const { story } = useGameStore();

  const waves = [
    { id: 'firstWave', label: 'Wave 1', completed: story?.seen?.firstWaveVictory || false },
    { id: 'secondWave', label: 'Wave 2', completed: story?.seen?.secondWaveVictory || false },
    { id: 'thirdWave', label: 'Wave 3', completed: story?.seen?.thirdWaveVictory || false },
    { id: 'fourthWave', label: 'Wave 4', completed: story?.seen?.fourthWaveVictory || false },
    { id: 'fifthWave', label: 'Wave 5', completed: story?.seen?.gameCompleted || false },
  ];

  // Find current wave (first incomplete wave)
  const currentWaveIndex = waves.findIndex(wave => !wave.completed);
  const hasStarted = story?.seen?.firstWave || false;
  
  if (!hasStarted) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-foreground">Attack Waves</h3>
      <div className="space-y-2">
        {waves.map((wave, index) => {
          const isCurrent = index === currentWaveIndex;
          const isPast = index < currentWaveIndex;
          
          return (
            <div key={wave.id} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className={isCurrent ? 'font-bold text-foreground' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/60'}>
                  {wave.label}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {wave.completed ? '✓ Complete' : isCurrent ? 'Current' : ''}
                </span>
              </div>
              <Progress 
                value={wave.completed ? 100 : isCurrent ? 50 : 0} 
                className={`h-2 ${
                  wave.completed 
                    ? '[&>div]:bg-green-700' 
                    : isCurrent 
                    ? '[&>div]:bg-yellow-700' 
                    : '[&>div]:bg-muted'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
