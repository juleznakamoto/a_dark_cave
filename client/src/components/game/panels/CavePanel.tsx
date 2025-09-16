import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export default function CavePanel() {
  const { flags, executeAction } = useGameStore();
  const state = useGameStore();

  // Define action groups with their actions
  const actionGroups = [
    {
      title: null, // No header for main actions
      actions: [
        { id: 'lightFire', label: 'Light Fire', showWhen: !flags.fireLit },
        { id: 'gatherWood', label: 'Gather Wood' },
        { id: 'exploreCave', label: 'Explore Cave' },
        { id: 'mineIron', label: 'Mine Iron' },
        { id: 'mineCoal', label: 'Mine Coal' },
        { id: 'mineSulfur', label: 'Mine Sulfur' },
        { id: 'mineAdamant', label: 'Mine Adamant' },
        { id: 'ventureDeeper', label: 'Venture Deeper' },
        { id: 'descendFurther', label: 'Descend Further' },
        { id: 'exploreRuins', label: 'Explore Ruins' },
        { id: 'exploreTemple', label: 'Explore Temple' },
        { id: 'exploreCitadel', label: 'Explore Citadel' },
      ]
    },
    {
      title: 'Craft',
      actions: [
        { id: 'buildTorch', label: 'Torch' },
        { id: 'craftStoneAxe', label: 'Stone Axe' },
        { id: 'craftStonePickaxe', label: 'Stone Pickaxe' },
        { id: 'craftIronAxe', label: 'Iron Axe' },
        { id: 'craftIronPickaxe', label: 'Iron Pickaxe' },
        { id: 'craftSteelAxe', label: 'Steel Axe' },
        { id: 'craftSteelPickaxe', label: 'Steel Pickaxe' },
        { id: 'craftObsidianAxe', label: 'Obsidian Axe' },
        { id: 'craftObsidianPickaxe', label: 'Obsidian Pickaxe' },
        { id: 'craftAdamantAxe', label: 'Adamant Axe' },
        { id: 'craftAdamantPickaxe', label: 'Adamant Pickaxe' },
      ]
    }
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
              >
                {label}
              </CooldownButton>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto p-2">
            <div className="text-xs whitespace-nowrap">
              {getCostText(actionId)}
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
      >
        {label}
      </CooldownButton>
    );
  };

  return (
    <div className="space-y-6">
      {actionGroups.map((group, groupIndex) => {
        const visibleActions = group.actions.filter(action => {
          // Handle custom show conditions
          if (action.showWhen !== undefined) {
            return action.showWhen;
          }
          // Use standard shouldShowAction for others
          return shouldShowAction(action.id, state);
        });

        if (visibleActions.length === 0) return null;

        return (
          <div key={groupIndex} className="space-y-4">
            {group.title && (
              <h3 className="text-lg font-semibold text-foreground">{group.title}</h3>
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