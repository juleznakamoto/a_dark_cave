
import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function BastionPanel() {
  const { executeAction, buildings, flags } = useGameStore();

  // Get all bastion-related actions
  const bastionActions = Object.entries(gameActions).filter(([actionId, action]) => {
    // Include watchtower and defensive building actions
    return actionId.includes('Watchtower') || 
           actionId.includes('Palisades') || 
           actionId.includes('Wall') ||
           (actionId.includes('build') && (
             actionId.includes('Bastion') || 
             actionId.includes('Defense') ||
             actionId.includes('Fortif')
           ));
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">The Bastion</h2>
        <p className="text-muted-foreground mb-6">
          The mighty bastion stands ready. From here you can strengthen your defenses and prepare for what comes from the depths.
        </p>
      </div>

      {/* Defensive Buildings Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Defensive Structures</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bastionActions
            .filter(([actionId]) => shouldShowAction(actionId, useGameStore.getState()))
            .map(([actionId, action]) => (
              <CooldownButton
                key={actionId}
                onClick={() => executeAction(actionId)}
                disabled={!canExecuteAction(actionId, useGameStore.getState())}
                actionId={actionId}
                className="p-4 text-left"
              >
                <div>
                  <div className="font-medium">{action.label}</div>
                  {action.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {action.description}
                    </div>
                  )}
                </div>
              </CooldownButton>
            ))}
        </div>
      </div>

      {/* Current Defenses Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Current Defenses</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {buildings.bastion > 0 && (
            <div className="bg-muted/20 p-3 rounded">
              <div className="font-medium">Bastion</div>
              <div className="text-muted-foreground">Main fortress</div>
            </div>
          )}
          {buildings.watchtower > 0 && (
            <div className="bg-muted/20 p-3 rounded">
              <div className="font-medium">Watchtower</div>
              <div className="text-muted-foreground">Early warning system</div>
            </div>
          )}
          {buildings.woodenPalisades > 0 && (
            <div className="bg-muted/20 p-3 rounded">
              <div className="font-medium">Wooden Palisades</div>
              <div className="text-muted-foreground">Basic perimeter defense</div>
            </div>
          )}
          {buildings.fortifiedPalisades > 0 && (
            <div className="bg-muted/20 p-3 rounded">
              <div className="font-medium">Fortified Palisades</div>
              <div className="text-muted-foreground">Reinforced wooden walls</div>
            </div>
          )}
          {buildings.stoneWall > 0 && (
            <div className="bg-muted/20 p-3 rounded">
              <div className="font-medium">Stone Wall</div>
              <div className="text-muted-foreground">Solid stone fortification</div>
            </div>
          )}
          {buildings.reinforcedWall > 0 && (
            <div className="bg-muted/20 p-3 rounded">
              <div className="font-medium">Reinforced Wall</div>
              <div className="text-muted-foreground">Ultimate defense</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
