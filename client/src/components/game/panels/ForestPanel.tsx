import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import { Button } from '@/components/ui/button';
import CooldownButton from '@/components/CooldownButton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export default function ForestPanel() {
  const { executeAction } = useGameStore();
  const state = useGameStore();

  // Define forest actions
  const forestActions = [
    { id: 'hunt', label: 'Hunt' },
    { id: 'layTrap', label: 'Lay Trap' },
  ];

  // Define sacrifice actions
  const sacrificeActions = [
    { id: 'boneTotems', label: 'Bone Totems' },
  ];

  const renderActionButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action || !shouldShowAction(actionId, state)) return null;

    const canExecute = canExecuteAction(actionId, state);

    return (
      <CooldownButton
        key={actionId}
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
    );
  };

  // Filter visible actions
  const visibleActions = forestActions.filter(action => 
    shouldShowAction(action.id, state)
  );

  const visibleSacrificeActions = sacrificeActions.filter(action => 
    shouldShowAction(action.id, state)
  );

  return (
    <div className="space-y-6">
      {/* Hunt actions without header, similar to gather wood */}
      {visibleActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleActions.map(action => 
            renderActionButton(action.id, action.label)
          )}
        </div>
      )}

      {/* Sacrifice section */}
      {visibleSacrificeActions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Sacrifice</h3>
          <div className="flex flex-wrap gap-2">
            {visibleSacrificeActions.map(action => {
              if (action.id === 'boneTotems') {
                return (
                  <HoverCard key={action.id}>
                    <HoverCardTrigger asChild>
                      <div>
                        <CooldownButton
                          onClick={() => executeAction(action.id)}
                          cooldownMs={gameActions[action.id].cooldown * 1000}
                          disabled={!canExecuteAction(action.id, state)}
                          variant="outline"
                          size="sm"
                          className="hover:bg-transparent hover:text-foreground"
                        >
                          {action.label}
                        </CooldownButton>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-auto p-2">
                      <div className="text-xs whitespace-nowrap">
                        {getCostText(action.id, state)}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              }
              return renderActionButton(action.id, action.label);
            })}
          </div>
        </div>
      )}
    </div>
  );
}