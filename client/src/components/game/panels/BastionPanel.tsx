import { useGameStore } from '@/game/state';
import { gameActions } from '@/game/rules';
import { Button } from '@/components/ui/button';

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

  // Helper to format repair cost display
  const formatRepairCost = (repairCost: Record<string, number>) => {
    return Object.entries(repairCost)
      .map(([resource, cost]) => `${cost.toLocaleString()} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`)
      .join(', ');
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
          {bastionDamaged && buildings.bastion > 0 && (() => {
            const repairCost = getRepairCost('buildBastion', 1);
            return (
              <Button
                onClick={repairBastion}
                disabled={!canAffordRepair(repairCost)}
                variant="outline"
                size="xs"
                className="hover:bg-transparent hover:text-foreground"
              >
                Bastion
              </Button>
            );
          })()}

          {watchtowerDamaged && buildings.watchtower > 0 && (() => {
            const repairCost = getRepairCost('buildWatchtower', buildings.watchtower);
            return (
              <Button
                onClick={repairWatchtower}
                disabled={!canAffordRepair(repairCost)}
                variant="outline"
                size="xs"
                className="hover:bg-transparent hover:text-foreground"
              >
                Watchtower
              </Button>
            );
          })()}

          {palisadesDamaged && buildings.palisades > 0 && (() => {
            const repairCost = getRepairCost('buildPalisades', buildings.palisades);
            return (
              <Button
                onClick={repairPalisades}
                disabled={!canAffordRepair(repairCost)}
                variant="outline"
                size="xs"
                className="hover:bg-transparent hover:text-foreground"
              >
                Palisades
              </Button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}