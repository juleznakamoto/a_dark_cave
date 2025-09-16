import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { Button } from '@/components/ui/button';
import { getPopulationProductionText } from '@/game/population';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export default function VillagePanel() {
  const { villagers, buildings, story, executeAction, assignVillager, unassignVillager } = useGameStore();
  const state = useGameStore.getState();

  // Define building actions
  const buildingActions = [
    { id: 'buildHut', label: 'Wooden Hut' },
    { id: 'buildLodge', label: 'Lodge' },
    { id: 'buildBlacksmith', label: 'Blacksmith' },
  ];

  // Define population jobs
  const populationJobs = [
    { id: 'gatherer', label: 'Gatherer', alwaysShow: true },
    { id: 'hunter', label: 'Hunter', showWhen: () => buildings.lodge > 0 },
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
            >
              {label}
            </CooldownButton>
          </div>
        </HoverCardTrigger>
        <HoverCardContent>
          <div className="text-sm">
            <div className="font-medium mb-1">{label}</div>
            <div className="text-muted-foreground">Cost: {getCostText(actionId, state).replace(/[()]/g, '')}</div>
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

  return (
    <div className="space-y-6">
      {/* Build Section */}
      {visibleBuildingActions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">Build</h2>
          <div className="flex flex-wrap gap-2">
            {visibleBuildingActions.map(action => 
              renderBuildingButton(action.id, action.label)
            )}
          </div>
        </div>
      )}

      {/* Rule Section */}
      {story.seen?.hasVillagers && visiblePopulationJobs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">Rule</h2>
          <div className="space-y-3">
            {visiblePopulationJobs.map(job => 
              renderPopulationControl(job.id, job.label)
            )}
          </div>
        </div>
      )}
    </div>
  );
}