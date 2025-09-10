import { useGameStore } from '@/game/state';
import { gameTexts } from '@/game/rules';

export default function VillagePanel() {
  const { buildings } = useGameStore();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="font-serif text-lg leading-relaxed">
          {gameTexts.village.initial}
        </p>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-lg font-medium border-b border-border pb-2">Buildings</h2>
        
        <div className="grid gap-3">
          <div className="p-4 border border-border rounded-sm">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Wooden Huts</div>
                <div className="text-sm text-muted-foreground">Shelter for villagers</div>
              </div>
              <span className="font-mono text-lg" data-testid="building-huts">
                {buildings.huts}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
