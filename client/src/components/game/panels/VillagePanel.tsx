
import { useGameStore } from '@/game/state';
import { gameActions, buildingRequirements } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function VillagePanel() {
  const { resources, buildings, flags, executeAction, villagers, assignVillager, unassignVillager } = useGameStore();

  // Building availability logic
  const canBuildHut = flags.villageUnlocked && resources.wood >= (buildingRequirements.hut[buildings.huts + 1]?.wood || 100);
  const canBuildLodge = buildings.huts >= 1 && resources.wood >= (buildingRequirements.lodge[buildings.lodges + 1]?.wood || 250);
  const canBuildWorkshop = buildings.lodges >= 1 && 
    resources.wood >= (buildingRequirements.workshop[buildings.workshops + 1]?.wood || 100) && 
    resources.stone >= (buildingRequirements.workshop[buildings.workshops + 1]?.stone || 20);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="font-serif text-lg leading-relaxed">
          Outside the cave, a small clearing opens up. This could be the foundation of something greater.
        </p>

        {/* Building Actions */}
        <div className="flex flex-wrap gap-2">
          {canBuildHut && (
            <CooldownButton
              onClick={() => executeAction('buildHut')}
              cooldownMs={(gameActions.buildHut?.cooldown || 10) * 1000}
              data-testid="button-build-hut"
              size="sm"
            >
              Build Hut ({buildingRequirements.hut[buildings.huts + 1]?.wood || 100} wood)
            </CooldownButton>
          )}

          {canBuildLodge && (
            <CooldownButton
              onClick={() => executeAction('buildLodge')}
              cooldownMs={(gameActions.buildLodge?.cooldown || 15) * 1000}
              data-testid="button-build-lodge"
              size="sm"
            >
              Build Lodge ({buildingRequirements.lodge[buildings.lodges + 1]?.wood || 250} wood)
            </CooldownButton>
          )}

          {canBuildWorkshop && (
            <CooldownButton
              onClick={() => executeAction('buildWorkshop')}
              cooldownMs={(gameActions.buildWorkshop?.cooldown || 20) * 1000}
              data-testid="button-build-workshop"
              size="sm"
            >
              Build Workshop ({buildingRequirements.workshop[buildings.workshops + 1]?.wood || 100} wood, {buildingRequirements.workshop[buildings.workshops + 1]?.stone || 20} stone)
            </CooldownButton>
          )}
        </div>

        {/* Villager Management */}
        {villagers.free > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Assign Villagers</h3>
            <div className="flex flex-wrap gap-2">
              <CooldownButton
                onClick={() => assignVillager('gatherers')}
                cooldownMs={0}
                data-testid="button-assign-gatherer"
                size="sm"
              >
                Assign Gatherer
              </CooldownButton>
              <CooldownButton
                onClick={() => assignVillager('hunters')}
                cooldownMs={0}
                data-testid="button-assign-hunter"
                size="sm"
              >
                Assign Hunter
              </CooldownButton>
            </div>
          </div>
        )}

        {(villagers.gatherers > 0 || villagers.hunters > 0) && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Unassign Villagers</h3>
            <div className="flex flex-wrap gap-2">
              {villagers.gatherers > 0 && (
                <CooldownButton
                  onClick={() => unassignVillager('gatherers')}
                  cooldownMs={0}
                  data-testid="button-unassign-gatherer"
                  size="sm"
                >
                  Unassign Gatherer
                </CooldownButton>
              )}
              {villagers.hunters > 0 && (
                <CooldownButton
                  onClick={() => unassignVillager('hunters')}
                  cooldownMs={0}
                  data-testid="button-unassign-hunter"
                  size="sm"
                >
                  Unassign Hunter
                </CooldownButton>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
