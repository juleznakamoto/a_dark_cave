import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { Button } from '@/components/ui/button';
import { getPopulationProductionText } from '@/game/population';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import VillagerJobSection from './VillagerJobSection'; // Assuming VillagerJobSection is in the same directory

export default function VillagePanel() {
  const { villagers, buildings, story, executeAction, assignVillager, unassignVillager } = useGameStore();
  const state = useGameStore.getState();

  // Define building actions
  const buildingActions = [
    { id: 'buildHut', label: 'Wooden Hut' },
    { id: 'buildCabin', label: 'Cabin' },
    { id: 'buildBlacksmith', label: 'Blacksmith' },
    { id: 'buildPit', label: 'Build Pit' } // Placeholder, actual label handled dynamically
  ];

  // Define population jobs
  const populationJobs = [
    { id: 'gatherer', label: 'Gatherer', alwaysShow: true },
    { id: 'hunter', label: 'Hunter', showWhen: () => buildings.cabin > 0 },
    { id: 'iron_miner', label: 'Iron Miner', showWhen: () => buildings.pit >= 1 },
    { id: 'coal_miner', label: 'Coal Miner', showWhen: () => buildings.pit >= 1 },
    { id: 'sulfur_miner', label: 'Sulfur Miner', showWhen: () => buildings.pit >= 2 },
    { id: 'silver_miner', label: 'Silver Miner', showWhen: () => buildings.pit >= 2 },
    { id: 'gold_miner', label: 'Gold Miner', showWhen: () => buildings.pit >= 3 },
    { id: 'obsidian_miner', label: 'Obsidian Miner', showWhen: () => buildings.pit >= 3 },
    { id: 'adamant_miner', label: 'Adamant Miner', showWhen: () => buildings.pit >= 4 },
    { id: 'moonstone_miner', label: 'Moonstone Miner', showWhen: () => buildings.pit >= 4 },
  ];

  const renderBuildingButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

    const canExecute = canExecuteAction(actionId, state);

    return (
      <HoverCard key={actionId}>
        <HoverCardTrigger asChild>
          <div>
            <CooldownButton
              onClick={() => executeAction(actionId)}
              cooldownMs={action.cooldown * 1000}
              data-testid={`button-${actionId.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
              disabled={!canExecute}
              size="sm"
              variant="outline"
              className="hover:bg-transparent hover:text-foreground"
            >
              {label}
            </CooldownButton>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-auto p-2">
          <div className="text-xs whitespace-nowrap">
            {getCostText(actionId, state)}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  const renderPopulationControl = (jobId: string, label: string) => {
    const currentCount = villagers[jobId as keyof typeof villagers] || 0;

    return (
      <div key={jobId} className="flex items-center justify-between">
        <span className="text-sm">{label} ({getPopulationProductionText(jobId)})</span>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => unassignVillager(jobId)}
            disabled={currentCount === 0}
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0"
          >
            -
          </Button>
          <span className="font-mono text-sm w-8 text-center">{currentCount}</span>
          <Button
            onClick={() => assignVillager(jobId)}
            disabled={villagers.free === 0}
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0"
          >
            +
          </Button>
        </div>
      </div>
    );
  };

  // Filter visible building actions
  const visibleBuildingActions = buildingActions.filter(action => 
    shouldShowAction(action.id, state)
  );

  // Filter visible population jobs
  const visiblePopulationJobs = populationJobs.filter(job => {
    if (job.alwaysShow) return true;
    if (job.showWhen) return job.showWhen();
    return false;
  });

  // Calculate max hunters if cabin exists, otherwise 0
  const maxHunters = buildings.cabin > 0 ? 999 : 0; // Assuming 999 is a placeholder for unlimited or a large number
  const hunterProduction = 5; // Assuming hunter production is 5 food per 15s

  return (
    <div className="space-y-6">
      {/* Build Section */}
      {visibleBuildingActions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium">Build</h2>
          <div className="flex flex-wrap gap-2">
            {visibleBuildingActions.map(action => {
              let label = action.label;
              if (action.id === 'buildPit') {
                label = buildings.pit === 0 ? "Build Shallow Pit" :
                        buildings.pit === 1 ? "Upgrade to Deepening Pit" :
                        buildings.pit === 2 ? "Upgrade to Deep Pit" :
                        buildings.pit === 3 ? "Upgrade to Bottomless Pit" : "Build Pit"; // Fallback
              }
              return renderBuildingButton(action.id, label);
            })}
          </div>
        </div>
      )}

      {/* Rule Section */}
      {story.seen?.hasVillagers && visiblePopulationJobs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium">Rule</h2>
          <div className="space-y-3">
            {visiblePopulationJobs.map(job => 
              renderPopulationControl(job.id, job.label)
            )}

            {/* Pit Level 1 Miners */}
            {buildings.pit >= 1 && (
              <>
                <VillagerJobSection
                  jobType="iron_miner"
                  jobName="Iron Miner"
                  count={villagers.iron_miner || 0}
                  maxCount={999}
                  canAssign={villagers.free > 0}
                  onAssign={() => assignVillager('iron_miner')}
                  onUnassign={() => unassignVillager('iron_miner')}
                  description="+5 Iron, -5 Food every 15s"
                />
                <VillagerJobSection
                  jobType="coal_miner"
                  jobName="Coal Miner"
                  count={villagers.coal_miner || 0}
                  maxCount={999}
                  canAssign={villagers.free > 0}
                  onAssign={() => assignVillager('coal_miner')}
                  onUnassign={() => unassignVillager('coal_miner')}
                  description="+5 Coal, -5 Food every 15s"
                />
              </>
            )}

            {/* Pit Level 2 Miners */}
            {buildings.pit >= 2 && (
              <>
                <VillagerJobSection
                  jobType="sulfur_miner"
                  jobName="Sulfur Miner"
                  count={villagers.sulfur_miner || 0}
                  maxCount={999}
                  canAssign={villagers.free > 0}
                  onAssign={() => assignVillager('sulfur_miner')}
                  onUnassign={() => unassignVillager('sulfur_miner')}
                  description="+5 Sulfur, -10 Food every 15s"
                />
                <VillagerJobSection
                  jobType="silver_miner"
                  jobName="Silver Miner"
                  count={villagers.silver_miner || 0}
                  maxCount={999}
                  canAssign={villagers.free > 0}
                  onAssign={() => assignVillager('silver_miner')}
                  onUnassign={() => unassignVillager('silver_miner')}
                  description="+5 Silver, -20 Food every 15s"
                />
              </>
            )}

            {/* Pit Level 3 Miners */}
            {buildings.pit >= 3 && (
              <>
                <VillagerJobSection
                  jobType="gold_miner"
                  jobName="Gold Miner"
                  count={villagers.gold_miner || 0}
                  maxCount={999}
                  canAssign={villagers.free > 0}
                  onAssign={() => assignVillager('gold_miner')}
                  onUnassign={() => unassignVillager('gold_miner')}
                  description="+5 Gold, -50 Food every 15s"
                />
                <VillagerJobSection
                  jobType="obsidian_miner"
                  jobName="Obsidian Miner"
                  count={villagers.obsidian_miner || 0}
                  maxCount={999}
                  canAssign={villagers.free > 0}
                  onAssign={() => assignVillager('obsidian_miner')}
                  onUnassign={() => unassignVillager('obsidian_miner')}
                  description="+5 Obsidian, -75 Food every 15s"
                />
              </>
            )}

            {/* Pit Level 4 Miners */}
            {buildings.pit >= 4 && (
              <>
                <VillagerJobSection
                  jobType="adamant_miner"
                  jobName="Adamant Miner"
                  count={villagers.adamant_miner || 0}
                  maxCount={999}
                  canAssign={villagers.free > 0}
                  onAssign={() => assignVillager('adamant_miner')}
                  onUnassign={() => unassignVillager('adamant_miner')}
                  description="+5 Adamant, -100 Food every 15s"
                />
                <VillagerJobSection
                  jobType="moonstone_miner"
                  jobName="Moonstone Miner"
                  count={villagers.moonstone_miner || 0}
                  maxCount={999}
                  canAssign={villagers.free > 0}
                  onAssign={() => assignVillager('moonstone_miner')}
                  onUnassign={() => unassignVillager('moonstone_miner')}
                  description="+1 Moonstone, -150 Food every 15s"
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}