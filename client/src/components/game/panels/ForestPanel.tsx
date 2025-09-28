import { useGameStore } from "@/game/state";
import { forestTradeActions } from "@/game/rules/forestTradeActions";
import { forestSacrificeActions } from "@/game/rules/forestSacrificeActions";
import { forestScoutActions } from "@/game/rules/forestScoutActions";
import { shouldShowAction, canExecuteAction } from "@/game/rules";
import CooldownButton from "@/components/CooldownButton";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export default function ForestPanel() {
  const { executeAction, buildings, cooldowns, ...gameState } = useGameStore(); // Destructure gameState and cooldowns

  // Define action groups with their actions
  const actionGroups = [
    {
      title: 'Scout',
      actions: Object.values(forestScoutActions),
    },
    {
      title: 'Sacrifice',
      actions: Object.values(forestSacrificeActions),
    },
  ];

  const renderButton = (actionId: string, label: string) => {
    const action = forestScoutActions[actionId] || forestSacrificeActions[actionId] || forestTradeActions[actionId]; // Get action details
    if (!action) return null;

    const canExecute = canExecuteAction(actionId, gameState);
    const showCost = action.cost && Object.keys(action.cost).length > 0;
    const isOnCooldown = (cooldowns[actionId] || 0) > 0;

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
                disabled={isOnCooldown || !canExecute}
                variant="outline"
                className="hover:bg-transparent hover:text-foreground"
              >
                {label}
              </CooldownButton>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto p-2">
            <div className="text-xs whitespace-nowrap">
              Cost: {Object.entries(action.cost)
                .map(([resource, amount]) => `${amount} ${resource.replace('resources.', '')}`)
                .join(', ')}
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
        disabled={isOnCooldown || !canExecute}
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
        // Filter actions that should be shown
        const visibleActions = group.actions.filter(action =>
          shouldShowAction(action.id, gameState)
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
            {Object.entries(forestTradeActions).map(([actionId, action]) => {
                const isOnCooldown = (cooldowns[actionId] || 0) > 0;
                const shouldShow = shouldShowAction(actionId, gameState);

                if (!shouldShow) return null;

                // Check if player can afford the trade
                const canAfford = canExecuteAction(actionId, gameState);

                return (
                  <CooldownButton
                    key={actionId}
                    onClick={() => executeAction(actionId)}
                    disabled={isOnCooldown || !canAfford}
                    cooldownMs={action.cooldown * 1000}
                    data-testid={`button-${actionId.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                    size="sm"
                    variant="outline"
                    className="hover:bg-transparent hover:text-foreground"
                  >
                    <div className="flex flex-col items-start w-full">
                      <span className="font-medium text-sm leading-tight">
                        {action.label}
                      </span>
                      {action.cost?.[1] && (
                        <span className="text-xs text-muted-foreground mt-1">
                          Cost: {Object.entries(action.cost[1])
                            .map(([resource, amount]) =>
                              `${amount} ${resource.replace('resources.', '')}`
                            )
                            .join(', ')}
                        </span>
                      )}
                    </div>
                  </CooldownButton>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}