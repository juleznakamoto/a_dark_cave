import { useGameStore } from '@/game/state';
import { gameActions } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function VillagePanel() {
  const { resources, cooldowns, executeAction } = useGameStore();

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
    </div>
  );
}
