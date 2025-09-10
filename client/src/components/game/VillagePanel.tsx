import { useGameStore } from '@/game/state';
import { gameActions } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { Button } from '@/components/ui/button';

export default function VillagePanel() {
  const { resources, cooldowns, villagers, buildings, story, executeAction, assignVillager, unassignVillager } = useGameStore();

  const handleBuildHut = () => {
    executeAction('buildHut');
  };

  const handleBuildLodge = () => {
    executeAction('buildLodge');
  };

  const canBuildHut = resources.wood >= 100 && (cooldowns['buildHut'] || 0) === 0;
  const canBuildLodge = buildings.huts >= 1 && villagers.free >= 1 && resources.wood >= 250 && (cooldowns['buildLodge'] || 0) === 0;

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

          {buildings.huts >= 1 && villagers.free > 0 && (
            <CooldownButton
              onClick={handleBuildLodge}
              cooldownMs={(gameActions.buildLodge?.cooldown || 15) * 1000}
              data-testid="button-build-lodge"
              disabled={!canBuildLodge}
              className="relative overflow-hidden"
              size="sm"
            >
              <span className="relative z-10">Lodge (250 wood)</span>
            </CooldownButton>
          )}
        </div>
      </div>

      {story.seen?.hasVillagers && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">Rule</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Gatherer</span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => unassignVillager('gatherers')}
                  disabled={villagers.gatherers === 0}
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  -
                </Button>
                <span className="font-mono text-sm w-8 text-center">{villagers.gatherers}</span>
                <Button
                  onClick={() => assignVillager('gatherers')}
                  disabled={villagers.free === 0}
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  +
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Hunter</span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => unassignVillager('hunters')}
                  disabled={villagers.hunters === 0}
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  -
                </Button>
                <span className="font-mono text-sm w-8 text-center">{villagers.hunters}</span>
                <Button
                  onClick={() => assignVillager('hunters')}
                  disabled={villagers.free === 0}
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
