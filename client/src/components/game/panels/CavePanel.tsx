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
      title: 'Explore',
      actions: [
        { id: 'lightFire', label: 'Light Fire', showWhen: !flags.fireLit },
        { id: 'gatherWood', label: 'Gather Wood' },
        { id: 'exploreCave', label: 'Explore Cave' },
        { id: 'ventureDeeper', label: 'Venture Deeper' },
        { id: 'descendFurther', label: 'Descend Further' },
        { id: 'exploreRuins', label: 'Explore Ruins' },
        { id: 'exploreTemple', label: 'Explore Temple' },
        { id: 'exploreCitadel', label: 'Explore Citadel' },
      ]
    },
    {
      title: 'Mine',
      actions: [
        { id: 'mineIron', label: 'Iron' },
        { id: 'mineCoal', label: 'Coal' },
        { id: 'mineSulfur', label: 'Sulfur' },
        { id: 'mineObsidian', label: 'Obsidian' },
        { id: 'mineAdamant', label: 'Adamant' },
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
        { id: 'craftIronLantern', label: 'Iron Lantern' },
        { id: 'craftSteelLantern', label: 'Steel Lantern' },
        { id: 'craftObsidianLantern', label: 'Obsidian Lantern' },
        { id: 'craftAdamantLantern', label: 'Adamant Lantern' },
        { id: 'craftIronSword', label: 'Iron Sword' },
        { id: 'craftSteelSword', label: 'Steel Sword' },
        { id: 'craftObsidianSword', label: 'Obsidian Sword' },
        { id: 'craftAdamantSword', label: 'Adamant Sword' },
        { id: 'craftCrudeBow', label: 'Crude Bow' },
        { id: 'craftHuntsmanBow', label: 'Huntsman Bow' },
        { id: 'craftLongBow', label: 'Long Bow' },
        { id: 'craftWarBow', label: 'War Bow' },
        { id: 'craftMasterBow', label: 'Master Bow' },
      ]
    },
    {
      title: 'Forge',
      actions: [
        { id: 'forgSteel', label: 'Steel' },
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
                variant="outline"
                className="hover:bg-transparent hover:text-foreground"
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