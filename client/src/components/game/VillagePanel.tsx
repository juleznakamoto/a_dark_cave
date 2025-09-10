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

      {(villagers.free > 0 || villagers.gatherers > 0 || villagers.hunters > 0) && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">
            Population ({villagers.free + villagers.gatherers + villagers.hunters})
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Free Villagers: {villagers.free}</span>
            </div>

            {buildings.lodges >= 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Gatherers: {villagers.gatherers}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => assignVillager('gatherers')}
                      disabled={villagers.free === 0}
                    >
                      +
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unassignVillager('gatherers')}
                      disabled={villagers.gatherers === 0}
                    >
                      -
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Hunters: {villagers.hunters}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => assignVillager('hunters')}
                      disabled={villagers.free === 0}
                    >
                      +
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unassignVillager('hunters')}
                      disabled={villagers.hunters === 0}
                    >
                      -
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}