
import { useGameStore } from '@/game/state';
import { gameActions, canExecuteAction } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { Button } from '@/components/ui/button';

export default function BastionPanel() {
  const { executeAction, buildings, story, resources } = useGameStore();

  const bastionDamaged = story?.seen?.bastionDamaged || false;
  const watchtowerDamaged = story?.seen?.watchtowerDamaged || false;
  const palisadesDamaged = story?.seen?.palisadesDamaged || false;

  const hasDamagedBuildings = bastionDamaged || watchtowerDamaged || palisadesDamaged;

  const repairBastion = () => {
    // Cost is 50% of original: 2500 stone, 250 steel
    if (resources.stone >= 2500 && resources.steel >= 250) {
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          stone: state.resources.stone - 2500,
          steel: state.resources.steel - 250,
        },
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
    // Cost varies by level, 50% of original
    const level = buildings.watchtower || 0;
    const costs = [
      { stone: 0, steel: 0, wood: 0 },
      { wood: 2500, stone: 1250, steel: 250 },
      { wood: 3750, stone: 2500, steel: 500, iron: 1250 },
      { wood: 5000, stone: 3750, steel: 1000, obsidian: 250 },
      { wood: 7500, stone: 5000, steel: 1500, obsidian: 500, adamant: 250 },
    ];

    const cost = costs[level];
    const canAfford = 
      resources.wood >= (cost.wood || 0) &&
      resources.stone >= (cost.stone || 0) &&
      resources.steel >= (cost.steel || 0) &&
      resources.iron >= (cost.iron || 0) &&
      resources.obsidian >= (cost.obsidian || 0) &&
      resources.adamant >= (cost.adamant || 0);

    if (canAfford) {
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          wood: state.resources.wood - (cost.wood || 0),
          stone: state.resources.stone - (cost.stone || 0),
          steel: state.resources.steel - (cost.steel || 0),
          iron: state.resources.iron - (cost.iron || 0),
          obsidian: state.resources.obsidian - (cost.obsidian || 0),
          adamant: state.resources.adamant - (cost.adamant || 0),
        },
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
    // Cost varies by level, 50% of original
    const level = buildings.palisades || 0;
    const costs = [
      { wood: 0, stone: 0 },
      { wood: 1250, stone: 750 },
      { wood: 2500, stone: 1250, steel: 250 },
      { wood: 5000, stone: 2500, steel: 500 },
      { wood: 7500, stone: 5000, steel: 1000, obsidian: 250 },
    ];

    const cost = costs[level];
    const canAfford = 
      resources.wood >= (cost.wood || 0) &&
      resources.stone >= (cost.stone || 0) &&
      resources.steel >= (cost.steel || 0) &&
      resources.obsidian >= (cost.obsidian || 0);

    if (canAfford) {
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          wood: state.resources.wood - (cost.wood || 0),
          stone: state.resources.stone - (cost.stone || 0),
          steel: state.resources.steel - (cost.steel || 0),
          obsidian: state.resources.obsidian - (cost.obsidian || 0),
        },
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

          {bastionDamaged && buildings.bastion > 0 && (
            <div className="flex justify-between items-center p-2 bg-red-950/20 rounded">
              <div>
                <div className="font-medium text-red-400">Bastion (Damaged)</div>
                <div className="text-xs text-muted-foreground">Cost: 2,500 Stone, 250 Steel</div>
              </div>
              <Button
                onClick={repairBastion}
                disabled={resources.stone < 2500 || resources.steel < 250}
                variant="destructive"
                size="sm"
              >
                Repair
              </Button>
            </div>
          )}

          {watchtowerDamaged && buildings.watchtower > 0 && (
            <div className="flex justify-between items-center p-2 bg-red-950/20 rounded">
              <div>
                <div className="font-medium text-red-400">Watchtower (Damaged)</div>
                <div className="text-xs text-muted-foreground">
                  Cost: {buildings.watchtower === 1 && "2,500 Wood, 1,250 Stone, 250 Steel"}
                  {buildings.watchtower === 2 && "3,750 Wood, 2,500 Stone, 500 Steel, 1,250 Iron"}
                  {buildings.watchtower === 3 && "5,000 Wood, 3,750 Stone, 1,000 Steel, 250 Obsidian"}
                  {buildings.watchtower === 4 && "7,500 Wood, 5,000 Stone, 1,500 Steel, 500 Obsidian, 250 Adamant"}
                </div>
              </div>
              <Button
                onClick={repairWatchtower}
                disabled={!canAfford(buildings.watchtower)}
                variant="destructive"
                size="sm"
              >
                Repair
              </Button>
            </div>
          )}

          {palisadesDamaged && buildings.palisades > 0 && (
            <div className="flex justify-between items-center p-2 bg-red-950/20 rounded">
              <div>
                <div className="font-medium text-red-400">Palisades (Damaged)</div>
                <div className="text-xs text-muted-foreground">
                  Cost: {buildings.palisades === 1 && "1,250 Wood, 750 Stone"}
                  {buildings.palisades === 2 && "2,500 Wood, 1,250 Stone, 250 Steel"}
                  {buildings.palisades === 3 && "5,000 Wood, 2,500 Stone, 500 Steel"}
                  {buildings.palisades === 4 && "7,500 Wood, 5,000 Stone, 1,000 Steel, 250 Obsidian"}
                </div>
              </div>
              <Button
                onClick={repairPalisades}
                disabled={!canAfford(buildings.palisades)}
                variant="destructive"
                size="sm"
              >
                Repair
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  function canAfford(level: number): boolean {
    if (watchtowerDamaged) {
      const costs = [
        { stone: 0, steel: 0, wood: 0 },
        { wood: 2500, stone: 1250, steel: 250 },
        { wood: 3750, stone: 2500, steel: 500, iron: 1250 },
        { wood: 5000, stone: 3750, steel: 1000, obsidian: 250 },
        { wood: 7500, stone: 5000, steel: 1500, obsidian: 500, adamant: 250 },
      ];
      const cost = costs[level];
      return resources.wood >= (cost.wood || 0) &&
        resources.stone >= (cost.stone || 0) &&
        resources.steel >= (cost.steel || 0) &&
        resources.iron >= (cost.iron || 0) &&
        resources.obsidian >= (cost.obsidian || 0) &&
        resources.adamant >= (cost.adamant || 0);
    }
    return false;
  }
}
