
import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { Button } from '@/components/ui/button';

export default function VillagePanel() {
  const { cooldowns, villagers, buildings, story, executeAction, assignVillager, unassignVillager } = useGameStore();
  const state = useGameStore();

  const handleBuildHut = () => {
    executeAction('buildHut');
  };

  const handleBuildLodge = () => {
    executeAction('buildLodge');
  };

  const handleBuildWorkshop = () => {
    executeAction('buildWorkshop');
  };

  // Use action-based logic instead of hardcoded requirements
  const canBuildHut = shouldShowAction('buildHut', state) && canExecuteAction('buildHut', state) && (cooldowns['buildHut'] || 0) === 0;
  const canBuildLodge = shouldShowAction('buildLodge', state) && canExecuteAction('buildLodge', state) && (cooldowns['buildLodge'] || 0) === 0;
  const canBuildWorkshop = shouldShowAction('buildWorkshop', state) && canExecuteAction('buildWorkshop', state) && (cooldowns['buildWorkshop'] || 0) === 0;

  // Get cost information from actions
  const getNextLevel = (actionId: string) => {
    if (actionId === 'buildHut') return buildings.huts + 1;
    if (actionId === 'buildLodge') return buildings.lodges + 1;
    if (actionId === 'buildWorkshop') return (buildings.workshops || 0) + 1;
    return 1;
  };

  const getCostText = (actionId: string) => {
    const action = gameActions[actionId];
    if (!action?.cost) return 'No cost';
    
    const level = getNextLevel(actionId);
    const costs = action.building ? action.cost[level] : action.cost;
    
    if (!costs) return 'No cost';
    
    return Object.entries(costs)
      .map(([resource, amount]) => {
        // Extract the clean resource name from paths like "resources.wood"
        const resourceName = resource.includes('.') ? resource.split('.').pop() : resource;
        return `${amount} ${resourceName}`;
      })
      .join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-medium border-b border-border pb-2">Build</h2>

        <div className="flex flex-wrap gap-2">
          {shouldShowAction('buildHut', state) && (
            <CooldownButton
              onClick={handleBuildHut}
              cooldownMs={(gameActions.buildHut?.cooldown || 10) * 1000}
              data-testid="button-build-wooden-hut"
              disabled={!canBuildHut}
              className="relative overflow-hidden"
              size="sm"
            >
              <span className="relative z-10">
                Wooden Hut ({getCostText('buildHut')})
              </span>
            </CooldownButton>
          )}

          {shouldShowAction('buildLodge', state) && (
            <CooldownButton
              onClick={handleBuildLodge}
              cooldownMs={(gameActions.buildLodge?.cooldown || 15) * 1000}
              data-testid="button-build-lodge"
              disabled={!canBuildLodge}
              className="relative overflow-hidden"
              size="sm"
            >
              <span className="relative z-10">
                Lodge ({getCostText('buildLodge')})
              </span>
            </CooldownButton>
          )}

          {shouldShowAction('buildWorkshop', state) && (
            <CooldownButton
              onClick={handleBuildWorkshop}
              cooldownMs={(gameActions.buildWorkshop?.cooldown || 20) * 1000}
              data-testid="button-build-workshop"
              disabled={!canBuildWorkshop}
              className="relative overflow-hidden"
              size="sm"
            >
              <span className="relative z-10">
                Workshop ({getCostText('buildWorkshop')})
              </span>
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

            {buildings.lodges > 0 && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
