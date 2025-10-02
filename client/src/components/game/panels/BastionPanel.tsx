
import { useGameStore } from '@/game/state';
import { gameActions } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { Button } from '@/components/ui/button';

export default function BastionPanel() {
  const { executeAction, buildings, story, resources } = useGameStore();

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

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Bastion</h2>
        <p className="text-muted-foreground">
          Fortify your village against the creatures from beyond the portal.
        </p>
      </div>

      {/* Build Actions */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Build</h3>
        {Object.entries(gameActions)
          .filter(([id]) => 
            id === 'buildBastion' || 
            id === 'buildWatchtower' || 
            id === 'buildPalisades'
          )
          .map(([id, action]) => (
            <CooldownButton
              key={id}
              actionId={id}
              label={action.label}
            />
          ))}
      </div>

      {/* Repair Section */}
      {hasDamagedBuildings && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-lg font-semibold text-red-500">Repair Damaged Buildings</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Damaged buildings provide only 50% of their normal bonuses until repaired.
          </p>

          {bastionDamaged && buildings.bastion > 0 && (() => {
            const repairCost = getRepairCost('buildBastion', 1);
            return (
              <div className="flex justify-between items-center p-2 bg-red-950/20 rounded">
                <div>
                  <div className="font-medium text-red-400">Bastion (Damaged)</div>
                  <div className="text-xs text-muted-foreground">Cost: {formatRepairCost(repairCost)}</div>
                </div>
                <Button
                  onClick={repairBastion}
                  disabled={!canAffordRepair(repairCost)}
                  variant="destructive"
                  size="sm"
                >
                  Repair
                </Button>
              </div>
            );
          })()}

          {watchtowerDamaged && buildings.watchtower > 0 && (() => {
            const repairCost = getRepairCost('buildWatchtower', buildings.watchtower);
            return (
              <div className="flex justify-between items-center p-2 bg-red-950/20 rounded">
                <div>
                  <div className="font-medium text-red-400">Watchtower (Damaged)</div>
                  <div className="text-xs text-muted-foreground">Cost: {formatRepairCost(repairCost)}</div>
                </div>
                <Button
                  onClick={repairWatchtower}
                  disabled={!canAffordRepair(repairCost)}
                  variant="destructive"
                  size="sm"
                >
                  Repair
                </Button>
              </div>
            );
          })()}

          {palisadesDamaged && buildings.palisades > 0 && (() => {
            const repairCost = getRepairCost('buildPalisades', buildings.palisades);
            return (
              <div className="flex justify-between items-center p-2 bg-red-950/20 rounded">
                <div>
                  <div className="font-medium text-red-400">Palisades (Damaged)</div>
                  <div className="text-xs text-muted-foreground">Cost: {formatRepairCost(repairCost)}</div>
                </div>
                <Button
                  onClick={repairPalisades}
                  disabled={!canAffordRepair(repairCost)}
                  variant="destructive"
                  size="sm"
                >
                  Repair
                </Button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
