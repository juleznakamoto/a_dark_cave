
import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { Button } from '@/components/ui/button';
import { getPopulationProductionText } from '@/game/population';

export default function VillagePanel() {
  const { villagers, buildings, story, executeAction, assignVillager, unassignVillager } = useGameStore();
  const state = useGameStore.getState();

  const handleBuildHut = () => executeAction('buildHut');
  const handleBuildLodge = () => executeAction('buildLodge');
  const handleBuildWorkshop = () => executeAction('buildWorkshop');

  const canBuildHut = canExecuteAction('buildHut', state);
  const canBuildLodge = canExecuteAction('buildLodge', state);
  const canBuildWorkshop = canExecuteAction('buildWorkshop', state);

  return (
    <div className="space-y-6">
      {/* Build Section */}
      {(shouldShowAction('buildHut', state) || shouldShowAction('buildLodge', state) || shouldShowAction('buildWorkshop', state)) && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">Build</h2>
          <div className="flex flex-wrap gap-2">
            {shouldShowAction('buildHut', state) && (
              <CooldownButton
                onClick={handleBuildHut}
                cooldownMs={gameActions.buildHut.cooldown * 1000}
                data-testid="button-build-wooden-hut"
                disabled={!canBuildHut}
                size="sm"
              >
                Wooden Hut{getCostText('buildHut', state)}
              </CooldownButton>
            )}

            {shouldShowAction('buildLodge', state) && (
              <CooldownButton
                onClick={handleBuildLodge}
                cooldownMs={gameActions.buildLodge.cooldown * 1000}
                data-testid="button-build-lodge"
                disabled={!canBuildLodge}
                size="sm"
              >
                Lodge{getCostText('buildLodge', state)}
              </CooldownButton>
            )}

            {shouldShowAction('buildWorkshop', state) && (
              <CooldownButton
                onClick={handleBuildWorkshop}
                cooldownMs={gameActions.buildWorkshop.cooldown * 1000}
                data-testid="button-build-workshop"
                disabled={!canBuildWorkshop}
                size="sm"
              >
                Workshop{getCostText('buildWorkshop', state)}
              </CooldownButton>
            )}
          </div>
        </div>
      )}

      {/* Rule Section */}
      {story.seen?.hasVillagers && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">Rule</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Gatherer ({getPopulationProductionText('gatherers')})</span>
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
                <span className="text-sm">Hunter ({getPopulationProductionText('hunters')})</span>
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
