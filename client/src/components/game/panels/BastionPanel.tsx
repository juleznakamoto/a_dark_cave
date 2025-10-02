import { useGameStore } from '@/game/state';
import { gameActions, getCostText } from '@/game/rules';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export default function BastionPanel() {
  const { buildings, story, resources } = useGameStore();

  const bastionDamaged = story?.seen?.bastionDamaged || false;
  const watchtowerDamaged = story?.seen?.watchtowerDamaged || false;
  const palisadesDamaged = story?.seen?.palisadesDamaged || false;

  const hasDamagedBuildings = bastionDamaged || watchtowerDamaged || palisadesDamaged;

  // Helper to calculate 50% repair cost from action cost
  const getRepairCost = (actionId: string, level: number = 1) => {
    const action = gameActions[actionId];
    const actionCost = action?.cost?.[level];
    if (!actionCost) return {};

    const repairCost: Record<string, number> = {};
    for (const [path, cost] of Object.entries(actionCost)) {
      if (path.startsWith('resources.')) {
        const resource = path.split('.')[1];
        repairCost[resource] = Math.floor(cost * 0.5);
      }
    }
    return repairCost;
  };

  const canAffordRepair = (repairCost: Record<string, number>) => {
    return Object.entries(repairCost).every(([resource, cost]) => {
      return resources[resource as keyof typeof resources] >= cost;
    });
  };

  const deductRepairCost = (repairCost: Record<string, number>) => {
    const newResources = { ...resources };
    for (const [resource, cost] of Object.entries(repairCost)) {
      newResources[resource as keyof typeof newResources] -= cost;
    }
    return newResources;
  };

  const repairBastion = () => {
    const repairCost = getRepairCost('buildBastion', 1);
    if (canAffordRepair(repairCost)) {
      useGameStore.setState((state) => ({
        resources: deductRepairCost(repairCost),
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            bastionDamaged: false,
          },
        },
      }));
      useGameStore.getState().updateBastionStats();
    }
  };

  const repairWatchtower = () => {
    const level = buildings.watchtower || 0;
    const repairCost = getRepairCost('buildWatchtower', level);

    if (canAffordRepair(repairCost)) {
      useGameStore.setState((state) => ({
        resources: deductRepairCost(repairCost),
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            watchtowerDamaged: false,
          },
        },
      }));
      useGameStore.getState().updateBastionStats();
    }
  };

  const repairPalisades = () => {
    const level = buildings.palisades || 0;
    const repairCost = getRepairCost('buildPalisades', level);

    if (canAffordRepair(repairCost)) {
      useGameStore.setState((state) => ({
        resources: deductRepairCost(repairCost),
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            palisadesDamaged: false,
          },
        },
      }));
      useGameStore.getState().updateBastionStats();
    }
  };

  // If no damaged buildings, show nothing
  if (!hasDamagedBuildings) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Repair Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-foreground">Repair</h3>
        <div className="flex flex-wrap gap-2">
          {bastionDamaged && buildings.bastion > 0 && (
            <HoverCard key="bastion" openDelay={100} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div>
                  <Button
                    onClick={repairBastion}
                    disabled={!canAffordRepair(getRepairCost('buildBastion', 1))}
                    variant="outline"
                    size="xs"
                    className="hover:bg-transparent hover:text-foreground"
                  >
                    Bastion
                  </Button>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-auto p-2">
                <div className="text-xs whitespace-nowrap">
                  {getCostText('buildBastion', useGameStore.getState()).replace(/\d+/g, (match) => '-' + Math.floor(parseInt(match) * 0.5).toString())}
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {watchtowerDamaged && buildings.watchtower > 0 && (
            <HoverCard key="watchtower" openDelay={100} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div>
                  <Button
                    onClick={repairWatchtower}
                    disabled={!canAffordRepair(getRepairCost('buildWatchtower', buildings.watchtower))}
                    variant="outline"
                    size="xs"
                    className="hover:bg-transparent hover:text-foreground"
                  >
                    Watchtower
                  </Button>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-auto p-2">
                <div className="text-xs whitespace-nowrap">
                  {getCostText('buildWatchtower', useGameStore.getState()).replace(/\d+/g, (match) => Math.floor(parseInt(match) * 0.5).toString())}
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {palisadesDamaged && buildings.palisades > 0 && (
            <HoverCard key="palisades" openDelay={100} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div>
                  <Button
                    onClick={repairPalisades}
                    disabled={!canAffordRepair(getRepairCost('buildPalisades', buildings.palisades))}
                    variant="outline"
                    size="xs"
                    className="hover:bg-transparent hover:text-foreground"
                  >
                    Palisades
                  </Button>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-auto p-2">
                <div className="text-xs whitespace-nowrap">
                  {getCostText('buildPalisades', useGameStore.getState()).replace(/\d+/g, (match) => '-' + Math.floor(parseInt(match) * 0.5).toString())}
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>
      </div>
    </div>
  );
}