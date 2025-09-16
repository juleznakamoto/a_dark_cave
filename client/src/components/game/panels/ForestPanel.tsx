
import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function ForestPanel() {
  const { executeAction } = useGameStore();
  const state = useGameStore();

  // Define forest actions
  const forestActions = [
    { id: 'hunt', label: 'Hunt' },
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
    </div>
  );
}
