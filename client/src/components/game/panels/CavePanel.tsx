import { useGameStore } from "@/game/state";
import {
  gameActions,
  shouldShowAction,
  canExecuteAction,
  getActionCostBreakdown,
} from "@/game/rules";
import { getResourceGainTooltip } from "@/game/rules/tooltips";
import CooldownButton from "@/components/CooldownButton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";
import { useExplosionEffect } from "@/components/ui/explosion-effect";

export default function CavePanel() {
  const { flags, executeAction } = useGameStore();
  const state = useGameStore();
  const mobileTooltip = useMobileTooltip();
  const { buttonRef: explosionButtonRef, triggerExplosion, ExplosionEffectRenderer } = useExplosionEffect();

  // Define action groups with their actions
  const actionGroups = [
    {
      title: "",
      subGroups: [
        {
          actions: [
            { id: "chopWood", label: "Gather Wood", showWhen: !state.flags.forestUnlocked },
            { id: "exploreCave", label: "Explore Cave" },
            { id: "ventureDeeper", label: "Venture Deeper" },
            { id: "descendFurther", label: "Descend Further" },
            { id: "exploreRuins", label: "Explore Ruins" },
            { id: "exploreTemple", label: "Explore Temple" },
            { id: "exploreCitadel", label: "Explore Citadel" },
          ],
        },
        {
          actions: [
            { id: "lowChamber", label: "Low Chamber" },
            { id: "occultistChamber", label: "Occultist Chamber" },
            { id: "blastPortal", label: "Blast Portal" },
            { id: "encounterBeyondPortal", label: "Venture Beyond Portal" }
          ],
        },
      ],
    },
    {
      title: "Mine",
      actions: [
        { id: "mineStone", label: "Stone" },
        { id: "mineIron", label: "Iron" },
        { id: "mineCoal", label: "Coal" },
        { id: "mineSulfur", label: "Sulfur" },
        { id: "mineObsidian", label: "Obsidian" },
        { id: "mineAdamant", label: "Adamant" },
      ],
    },
    {
      title: "Craft",
      subGroups: [
        {
          actions: [
            { id: "craftTorch", label: "Torch" },
            { id: "craftTorches", label: "2 Torches" },
            { id: "craftTorches3", label: "3 Torches" },
            { id: "craftTorches4", label: "4 Torches" },
            { id: "craftTorches5", label: "5 Torches" },
            { id: "craftTorches10", label: "10 Torches" },
            { id: "craftBoneTotem", label: "Bone Totem" },
            { id: "craftBoneTotems2", label: "2 Bone Totems" },
            { id: "craftBoneTotems3", label: "3 Bone Totems" },
            { id: "craftBoneTotems5", label: "5 Bone Totems" },
            { id: "craftLeatherTotem", label: "Leather Totem" },
            { id: "craftLeatherTotems5", label: "5 Leather Totems" },
            { id: "craftEmberBomb", label: "Ember Bomb" },
            { id: "craftAshfireBomb", label: "Ashfire Bomb" },
            { id: "craftIronLantern", label: "Iron Lantern" },
            { id: "craftSteelLantern", label: "Steel Lantern" },
            { id: "craftObsidianLantern", label: "Obsidian Lantern" },
            { id: "craftAdamantLantern", label: "Adamant Lantern" },
          ],
        },
        {
          actions: [
            { id: "craftExplorerPack", label: "Explorer's Pack" },
            { id: "craftHunterCloak", label: "Hunter Cloak" },
            { id: "craftLoggersGloves", label: "Logger's Gloves" },
            { id: "craftGrenadierBag", label: "Grenadier's Bag" },
            { id: "craftHighpriestRobe", label: "Highpriest Robe" },
          ]
        },
        {
          actions: [
            { id: "craftStoneAxe", label: "Stone Axe" },
            { id: "craftIronAxe", label: "Iron Axe" },
            { id: "craftSteelAxe", label: "Steel Axe" },
            { id: "craftObsidianAxe", label: "Obsidian Axe" },
            { id: "craftAdamantAxe", label: "Adamant Axe" },
            { id: "craftStonePickaxe", label: "Stone Pickaxe" },
            { id: "craftIronPickaxe", label: "Iron Pickaxe" },
            { id: "craftSteelPickaxe", label: "Steel Pickaxe" },
            { id: "craftObsidianPickaxe", label: "Obsidian Pickaxe" },
            { id: "craftAdamantPickaxe", label: "Adamant Pickaxe" },
          ],
        },
        {
          actions: [
            { id: "craftIronSword", label: "Iron Sword" },
            { id: "craftSteelSword", label: "Steel Sword" },
            { id: "craftObsidianSword", label: "Obsidian Sword" },
            { id: "craftAdamantSword", label: "Adamant Sword" },
            { id: "craftFrostglassSword", label: "Frostglass Sword" },
            { id: "craftCrudeBow", label: "Crude Bow" },
            { id: "craftHuntsmanBow", label: "Huntsman Bow" },
            { id: "craftLongBow", label: "Long Bow" },
            { id: "craftWarBow", label: "War Bow" },
            { id: "craftMasterBow", label: "Master Bow" },
            { id: "craftArbalest", label: "Arbalest" },
            { id: "craftNightshadeBow", label: "Nightshade Bow" },
            { id: "craftBloodstoneStaff", label: "Bloodstone Staff" },
          ],
        },
      ],
    },
  ];

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

    const canExecute = canExecuteAction(actionId, state);
    const showCost = action.cost && Object.keys(action.cost).length > 0;

    // Check if this is a mine action or cave exploration action
    const isMineAction = actionId.startsWith("mine");
    const caveExploreActions = [
      'exploreCave',
      'ventureDeeper', 
      'descendFurther',
      'exploreRuins',
      'exploreTemple',
      'exploreCitadel'
    ];
    const isCaveExploreAction = caveExploreActions.includes(actionId);
    const resourceGainTooltip = (isMineAction || isCaveExploreAction) ? getResourceGainTooltip(actionId, state) : null;

    // Special handling for blastPortal button
    const isBlastPortal = actionId === 'blastPortal';
    const handleClick = () => {
      if (isBlastPortal) {
        triggerExplosion();
      }
      executeAction(actionId);
    };

    if (showCost || resourceGainTooltip) {
      let tooltipContent;

      if (resourceGainTooltip) {
        // Mine actions: show gains and costs (getResourceGainTooltip handles both)
        tooltipContent = resourceGainTooltip;
      } else if (showCost) {
        // Other actions with costs
        const costBreakdown = getActionCostBreakdown(actionId, state);
        tooltipContent = (
          <div className="text-xs whitespace-nowrap">
            {costBreakdown.map((costItem, index) => (
              <div key={index} className={costItem.satisfied ? "" : "text-muted-foreground"}>
                {costItem.text}
              </div>
            ))}
          </div>
        );
      }

      return (
        <CooldownButton
          key={actionId}
          ref={isBlastPortal ? explosionButtonRef : null}
          onClick={handleClick}
          cooldownMs={action.cooldown * 1000}
          data-testid={`button-${actionId.replace(/([A-Z])/g, "-$1").toLowerCase()}`}
          size="xs"
          disabled={!canExecute}
          variant="outline"
          className="hover:bg-transparent hover:text-foreground"
          tooltip={tooltipContent}
        >
          {label}
        </CooldownButton>
      );
    }

    return (
      <CooldownButton
        key={actionId}
        ref={isBlastPortal ? explosionButtonRef : null}
        onClick={handleClick}
        cooldownMs={action.cooldown * 1000}
        data-testid={`button-${actionId.replace(/([A-Z])/g, "-$1").toLowerCase()}`}
        size="xs"
        disabled={!canExecute}
        variant="outline"
        className="hover:bg-transparent hover:text-foreground"
      >
        {label}
      </CooldownButton>
    );
  };

  return (
    <ScrollArea className="h-full w-full">
      <ExplosionEffectRenderer />
      <div className="space-y-4 pb-4">
        {actionGroups.map((group, groupIndex) => {
        // Handle groups with subGroups (like Craft)
        if (group.subGroups) {
          const hasAnyVisibleActions = group.subGroups.some((subGroup) =>
            subGroup.actions.some((action) => {
              if (action.showWhen !== undefined) {
                return action.showWhen;
              }
              return shouldShowAction(action.id, state);
            }),
          );

          if (!hasAnyVisibleActions) return null;

          return (
            <div key={groupIndex} className="space-y-2">
              {group.title && (
                <h3 className="text-xs font-bold text-foreground">
                  {group.title}
                </h3>
              )}
              {group.subGroups.map((subGroup, subGroupIndex) => {
                const visibleActions = subGroup.actions.filter((action) => {
                  if (action.showWhen !== undefined) {
                    return action.showWhen;
                  }
                  return shouldShowAction(action.id, state);
                });

                if (visibleActions.length === 0) return null;

                return (
                  <div key={subGroupIndex} className="flex flex-wrap gap-2">
                    {visibleActions.map((action) =>
                      renderButton(action.id, action.label),
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        // Handle regular groups (like Explore, Mine)
        const visibleActions = group.actions.filter((action) => {
          // Handle custom show conditions
          if (action.showWhen !== undefined) {
            return action.showWhen;
          }
          // Use standard shouldShowAction for others
          return shouldShowAction(action.id, state);
        });

        if (visibleActions.length === 0) return null;

        return (
          <div key={groupIndex} className="space-y-2">
            {group.title && (
              <h3 className="text-xs font-bold text-foreground">
                {group.title}
              </h3>
            )}
            <div className="flex flex-wrap gap-2">
              {visibleActions.map((action) =>
                renderButton(action.id, action.label),
              )}
            </div>
          </div>
        );
      })}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}