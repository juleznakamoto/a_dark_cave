
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
              { id: 'tradeGoldForWood', label: 'Buy 500 Wood', resource: 'gold', amount: 5 },
              { id: 'tradeGoldForStone', label: 'Buy 500 Stone', resource: 'gold', amount: 10 },
              { id: 'tradeGoldForSteel', label: 'Buy 100 Steel', resource: 'gold', amount: 15 },
              { id: 'tradeGoldForObsidian', label: 'Buy 50 Obsidian', resource: 'gold', amount: 25 },
              { id: 'tradeGoldForAdamant', label: 'Buy 50 Adamant', resource: 'gold', amount: 50 },
              { id: 'tradeGoldForTorch', label: 'Buy 50 Torch', resource: 'gold', amount: 10 },
              { id: 'tradeSilverForGold', label: 'Buy 50 Gold', resource: 'silver', amount: 100 },
            ].map(trade => {
              // Check if user has enough resources
              const currentAmount = state.resources[trade.resource] || 0;
              const hasEnoughResources = currentAmount >= trade.amount;
              
              // Check cooldown
              const isOnCooldown = state.cooldowns[trade.id] && state.cooldowns[trade.id] > 0;
              
              // Button should be disabled if either no resources or on cooldown
              const canExecute = hasEnoughResources && !isOnCooldown;
              
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
                      -{trade.amount} {trade.resource}
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
