
import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export default function ForestPanel() {
  const { executeAction } = useGameStore();
  const state = useGameStore();

  // Define action groups with their actions
  const actionGroups = [
    {
      title: 'Scout',
      actions: [
        { id: 'hunt', label: 'Hunt' },
        { id: 'layTrap', label: 'Lay Trap' },
      ]
    },
    {
      title: 'Sacrifice',
      actions: [
        { id: 'boneTotems', label: 'Bone Totems' },
      ]
    },
  ];

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

    const canExecute = canExecuteAction(actionId, state);
    const showCost = action.cost && Object.keys(action.cost).length > 0;

    if (showCost) {
      return (
        <HoverCard key={actionId}>
          <HoverCardTrigger asChild>
            <div>
              <CooldownButton
                onClick={() => executeAction(actionId)}
                cooldownMs={action.cooldown * 1000}
                data-testid={`button-${actionId.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                size="sm"
                disabled={!canExecute}
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
    }

    return (
      <CooldownButton
        key={actionId}
        onClick={() => executeAction(actionId)}
        cooldownMs={action.cooldown * 1000}
        data-testid={`button-${actionId.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
        size="sm"
        disabled={!canExecute}
        variant="outline"
        className="hover:bg-transparent hover:text-foreground"
      >
        {label}
      </CooldownButton>
    );
  };

  return (
    <div className="space-y-6">
      {actionGroups.map((group, groupIndex) => {
        const visibleActions = group.actions.filter(action => 
          shouldShowAction(action.id, state)
        );

        if (visibleActions.length === 0) return null;

        // Special condition for Sacrifice section - only show if altar is built
        if (group.title === 'Sacrifice' && state.buildings.altar === 0) {
          return null;
        }

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
    </div>
  );
}
