
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

      {/* Trade Section */}
      {buildings.blacksmith > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Trade</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'tradeWoodForGold', label: 'Buy 5 Gold', cost: '500 wood' },
              { id: 'tradeStoneForGold', label: 'Buy 10 Gold', cost: '500 stone' },
              { id: 'tradeSteelForGold', label: 'Buy 15 Gold', cost: '100 steel' },
              { id: 'tradeObsidianForGold', label: 'Buy 25 Gold', cost: '50 obsidian' },
              { id: 'tradeAdamantForGold', label: 'Buy 50 Gold', cost: '50 adamant' },
              { id: 'tradeTorchForGold', label: 'Buy 10 Gold', cost: '50 torch' },
              { id: 'tradeGoldForSilver', label: 'Buy 100 Silver', cost: '50 gold' },
            ].map(trade => {
              const canExecute = canExecuteAction(trade.id, state);
              const knowledge = state.stats.knowledge || 0;
              const cooldownReduction = Math.min(0.5 * knowledge, 15);
              const actualCooldown = Math.max(15, 30 - cooldownReduction);

              return (
                <HoverCard key={trade.id} openDelay={100} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div>
                      <CooldownButton
                        onClick={() => executeAction(trade.id)}
                        cooldownMs={actualCooldown * 1000}
                        data-testid={`button-${trade.id.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                        disabled={!canExecute}
                        size="sm"
                        variant="outline"
                        className="hover:bg-transparent hover:text-foreground"
                      >
                        {trade.label}
                      </CooldownButton>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-auto p-2">
                    <div className="text-xs whitespace-nowrap">
                      -{trade.cost}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
