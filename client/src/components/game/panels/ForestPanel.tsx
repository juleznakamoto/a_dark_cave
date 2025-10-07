import React from 'react';
import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export default function ForestPanel() {
  const { executeAction, buildings } = useGameStore();
  const state = useGameStore();

  // Define action groups with their actions
  const actionGroups = [
    {
      title: 'Scout',
      actions: [
        { id: 'hunt', label: 'Hunt' },
        { id: 'layTrap', label: 'Lay Trap' },
        { id: 'castleRuins', label: 'Castle Ruins' },
        { id: 'hillGrave', label: 'Hill Grave' },
      ]
    },
    {
      title: 'Sacrifice',
      actions: [
        { id: 'boneTotems', label: 'Bone Totems' },
      ]
    },
    {
      title: 'Trade',
      actions: [
        { id: 'tradeGoldForWood', label: 'Buy 500 Wood' },
        { id: 'tradeGoldForStone', label: 'Buy 500 Stone' },
        { id: 'tradeGoldForSteel', label: 'Buy 100 Steel' },
        { id: 'tradeGoldForObsidian', label: 'Buy 50 Obsidian' },
        { id: 'tradeGoldForAdamant', label: 'Buy 50 Adamant' },
        { id: 'tradeGoldForTorch', label: 'Buy 50 Torch' },
        { id: 'tradeSilverForGold', label: 'Buy 50 Gold' },
      ]
    },
  ];

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

    const canExecute = canExecuteAction(actionId, state);
    const showCost = action.cost && Object.keys(action.cost).length > 0;
    const isTradeButton = actionId.startsWith('trade');

    if (showCost) {
      return (
        <HoverCard key={actionId}>
          <HoverCardTrigger asChild>
            <div>
              <CooldownButton
                onClick={() => executeAction(actionId)}
                cooldownMs={action.cooldown * 1000}
                data-testid={`button-${actionId.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                size="xs"
                disabled={!canExecute}
                variant="outline"
                className={`hover:bg-transparent hover:text-foreground ${isTradeButton ? 'w-fit' : ''}`}
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
        size="xs"
        disabled={!canExecute}
        variant="outline"
        className={`hover:bg-transparent hover:text-foreground ${isTradeButton ? 'w-fit' : ''}`}
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

        return (
          <div key={groupIndex} className="space-y-2">
            {group.title && (
              <h3 className="text-xs font-bold text-foreground">{group.title}</h3>
            )}
            <div className="flex flex-wrap gap-2">
              {visibleActions.map((action, index) => (
                <React.Fragment key={action.id}>
                  {renderButton(action.id, action.label)}
                  {group.title === 'Trade' && (index + 1) % 4 === 0 && index !== visibleActions.length - 1 && (
                    <div className="basis-full h-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      })}


    </div>
  );
}