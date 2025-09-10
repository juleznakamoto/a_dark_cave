import { useGameStore } from '@/game/state';
import { gameActions } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function VillagePanel() {
  const { buildings, resources, cooldowns, executeAction } = useGameStore();

  const handleBuildHut = () => {
    executeAction('buildHut');
  };

  const canBuildHut = resources.wood >= 100 && (cooldowns['buildHut'] || 0) === 0;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-medium border-b border-border pb-2">Build</h2>
        
        <div className="flex flex-wrap gap-2">
          <CooldownButton
            onClick={handleBuildHut}
            cooldownMs={(gameActions.buildHut?.cooldown || 10) * 1000}
            data-testid="button-build-wooden-hut"
            disabled={!canBuildHut}
            className="relative overflow-hidden"
            size="sm"
          >
            <span className="relative z-10">Wooden Hut (100 wood)</span>
          </CooldownButton>
        </div>
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
