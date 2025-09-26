import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { Button } from '@/components/ui/button';
import { getPopulationProductionText, getPopulationProduction } from '@/game/population';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export default function VillagePanel() {
  const { villagers, buildings, story, executeAction, assignVillager, unassignVillager } = useGameStore();
  const state = useGameStore.getState();

  // Define action groups with their actions
  const actionGroups = [
    {
      title: 'Build',
      actions: [
        { id: 'buildWoodenHut', label: 'Wooden Hut' },
        { id: 'buildStoneHut', label: 'Stone Hut' },
        { id: 'buildCabin', label: 'Cabin' },
        { id: 'buildBlacksmith', label: 'Blacksmith' },
        { id: 'buildShallowPit', label: 'Shallow Pit' },
        { id: 'buildDeepeningPit', label: 'Deepening Pit' },
        { id: 'buildDeepPit', label: 'Deep Pit' },
        { id: 'buildBottomlessPit', label: 'Bottomless Pit' },
        { id: 'buildFoundry', label: 'Foundry' },
        { id: 'buildAltar', label: 'Altar' },
        { id: 'buildShrine', label: 'Shrine' },
        { id: 'buildTemple', label: 'Temple' },
        { id: 'buildSanctum', label: 'Sanctum' },
        { id: 'buildGreatCabin', label: 'Great Cabin' },
        { id: 'buildTimberMill', label: 'Timber Mill' },
        { id: 'buildQuarry', label: 'Quarry' },
        { id: 'buildClerksHut', label: "Clerk's Hut" },
        { id: 'buildTannery', label: 'Tannery' },
        { id: 'buildAlchemistTower', label: "Alchemist's Tower" },
      ]
    }
  ];

  // Define population jobs
  const populationJobs = [
    { id: 'gatherer', label: 'Gatherer', alwaysShow: true },
    { id: 'hunter', label: 'Hunter', showWhen: () => buildings.cabin > 0 },
    { id: 'iron_miner', label: 'Iron Miner', showWhen: () => buildings.shallowPit >= 1 },
    { id: 'coal_miner', label: 'Coal Miner', showWhen: () => buildings.shallowPit >= 1 },
    { id: 'sulfur_miner', label: 'Sulfur Miner', showWhen: () => buildings.deepeningPit >= 1 },
    { id: 'silver_miner', label: 'Silver Miner', showWhen: () => buildings.deepeningPit >= 1 },
    { id: 'gold_miner', label: 'Gold Miner', showWhen: () => buildings.deepPit >= 1 },
    { id: 'obsidian_miner', label: 'Obsidian Miner', showWhen: () => buildings.deepPit >= 1 },
    { id: 'adamant_miner', label: 'Adamant Miner', showWhen: () => buildings.bottomlessPit >= 1 },
    { id: 'moonstone_miner', label: 'Moonstone Miner', showWhen: () => buildings.bottomlessPit >= 1 },
    { id: 'steel_forger', label: 'Steel Forger', showWhen: () => state.buildings.foundry > 0 },
    {
      id: 'tanner',
      label: 'Tanner',
      alwaysShow: false,
      showWhen: () => state.buildings.tannery > 0,
    },
  ];

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

    const canExecute = canExecuteAction(actionId, state);

    return (
      <HoverCard key={actionId} openDelay={100} closeDelay={100}>
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

    // Get total production for this job type
    const getTotalProductionText = (jobId: string, count: number): string => {
      if (count === 0) return "";

      const production = getPopulationProduction(jobId, count, state);
      const productionText = production
        .map(prod => `${prod.totalAmount > 0 ? "+" : ""}${prod.totalAmount} ${prod.resource}`)
        .join(", ");

      return productionText ? ` (${productionText})` : "";
    };

    return (
      <div key={jobId} className="flex items-center justify-between">
        <span className="text-sm">{label}{getTotalProductionText(jobId, currentCount)}</span>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => unassignVillager(jobId)}
            disabled={currentCount === 0}
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0 no-hover"
          >
            -
          </Button>
          <span className="font-mono text-sm w-8 text-center">{currentCount}</span>
          <Button
            onClick={() => assignVillager(jobId)}
            disabled={villagers.free === 0}
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0 no-hover"
          >
            +
          </Button>
        </div>
      </div>
    );
  };

  // Filter visible population jobs
  const visiblePopulationJobs = populationJobs.filter(job => {
    if (job.alwaysShow) return true;
    if (job.showWhen) return job.showWhen();
    return false;
  });

  return (
    <div className="space-y-6">
      {actionGroups.map((group, groupIndex) => {
        const visibleActions = group.actions.filter(action => 
          shouldShowAction(action.id, state)
        );

        if (visibleActions.length === 0) return null;

        return (
          <div key={groupIndex} className="space-y-4">
            {group.title && (
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
            )}
            <div className="flex flex-wrap gap-2">
              {visibleActions.map(action => renderButton(action.id, action.label))}
            </div>
          </div>
        );
      })}

      {/* Rule Section */}
      {story.seen?.hasVillagers && visiblePopulationJobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Rule</h3>
          <div className="space-y-1 leading-tight">
            {visiblePopulationJobs.map(job => 
              renderPopulationControl(job.id, job.label)
            )}
          </div>
          {/* Population Effects Summary */}
          {(() => {
            const totalEffects: Record<string, number> = {};

            visiblePopulationJobs.forEach(job => {
              const currentCount = villagers[job.id as keyof typeof villagers] || 0;
              if (currentCount > 0) {
                const production = getPopulationProduction(job.id, currentCount, state);
                production.forEach(prod => {
                  totalEffects[prod.resource] = (totalEffects[prod.resource] || 0) + prod.totalAmount;
                });
              }
            });

            const effectsText = Object.entries(totalEffects)
              .filter(([resource, amount]) => amount !== 0)
              .map(([resource, amount]) => `${amount > 0 ? "+" : ""}${amount} ${resource}`)
              .join(", ");

            return effectsText && buildings.clerksHut > 0 ? (
              <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                {effectsText} per 15s
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}