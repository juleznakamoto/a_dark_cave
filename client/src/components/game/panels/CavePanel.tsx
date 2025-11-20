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
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";

// Placeholder for ButtonLevelIndicator component
const ButtonLevelIndicator = ({ buttonKey, actionId }: { buttonKey: string, actionId: string }) => {
  const { [buttonKey]: level, incrementActionCount, getNextLevelCost, getLevelBonus, getClicksForLevel } = useGameStore();

  const currentLevel = level || 0;
  const maxLevel = 8; // Define your max level here
  const isMaxLevel = currentLevel >= maxLevel;

  const clicksForNextLevel = getClicksForLevel(buttonKey);
  const currentClicks = useGameStore()[`${buttonKey}Clicks`] || 0;
  const bonus = getLevelBonus(buttonKey);

  const handleClick = () => {
    incrementActionCount(buttonKey);
  };

  // Tooltip content
  const tooltipContent = (
    <div className="text-xs whitespace-nowrap">
      <p>Level: {currentLevel} {isMaxLevel ? "(Max)" : ""}</p>
      <p>Bonus: {bonus.toFixed(1)}%</p>
      <p>Clicks: {currentClicks}</p>
      {!isMaxLevel && (
        <p>Next Level: {clicksForNextLevel - currentClicks} clicks needed</p>
      )}
    </div>
  );

  return (
    <div
      className="absolute top-0 right-0 -mt-2 -mr-2 cursor-pointer z-10"
      onClick={handleClick}
      {...mobileTooltip({ content: tooltipContent })}
    >
      {!isMaxLevel && currentLevel > 0 && (
        <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
          {currentLevel}
        </Badge>
      )}
      {currentLevel === 0 && !isMaxLevel && (
        <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
          1
        </Badge>
      )}
       {isMaxLevel && (
        <Badge className="h-5 w-5 flex items-center justify-center p-0 text-xs bg-green-500">
          {maxLevel}
        </Badge>
      )}
    </div>
  );
};

const getButtonLevelKey = (actionId: string): string | null => {
  // Cave Explore Actions
  if (['exploreCave', 'ventureDeeper', 'descendFurther', 'exploreRuins', 'exploreTemple', 'exploreCitadel'].includes(actionId)) {
    return 'caveLevel';
  }
  // Mine Actions
  if (actionId.startsWith('mine')) {
    return `mine${actionId.charAt(4).toUpperCase()}${actionId.slice(5)}Level`;
  }
  // Hunt Action
  if (actionId === 'hunt') { // Assuming you have a 'hunt' actionId
    return 'huntLevel';
  }
  // Chop Wood Action
  if (actionId === 'chopWood') {
    return 'chopWoodLevel';
  }
  return null;
};


export default function CavePanel() {
  const { flags, executeAction } = useGameStore();
  const state = useGameStore();
  const mobileTooltip = useMobileTooltip();
  const explosionEffect = useExplosionEffect();

  // Separate refs for each explosion button
  const blastPortalRef = useRef<HTMLButtonElement>(null);
  const testExplosionRef = useRef<HTMLButtonElement>(null);

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
      // Leveling up logic
      const buttonKey = getButtonLevelKey(actionId);
      if (buttonKey) {
        const currentLevel = state[buttonKey] || 0;
        const maxLevel = 8; // Ensure this matches ButtonLevelIndicator
        if (currentLevel < maxLevel) {
          const clicksForNextLevel = getClicksForLevel(buttonKey);
          const currentClicks = state[`${buttonKey}Clicks`] || 0;
          if (currentClicks + 1 >= clicksForNextLevel) {
            executeAction(actionId); // Execute the action first
            // Use a slight delay to ensure the UI updates before triggering level up message
            setTimeout(() => {
              useGameStore.setState(prevState => ({
                [buttonKey]: currentLevel + 1,
                [`${buttonKey}Clicks`]: 0, // Reset clicks for the next level
              }));
              // Add event log message
              const eventLog = state.eventLog || [];
              useGameStore.setState({
                eventLog: [...eventLog, `You got better at ${label}! (Level ${currentLevel + 1})`]
              });
            }, 50); // Small delay
            return;
          }
        }
      }
      // Original action execution
      if (isBlastPortal) {
        const buttonElement = blastPortalRef.current;
        if (buttonElement) {
          const rect = buttonElement.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          explosionEffect.triggerExplosion(centerX, centerY);
        }
      }
      executeAction(actionId);
       // Increment click count after action execution
      if (buttonKey) {
        const currentClicks = state[`${buttonKey}Clicks`] || 0;
        useGameStore.setState({ [`${buttonKey}Clicks`]: currentClicks + 1 });
      }
    };

    if (showCost || resourceGainTooltip) {
      let tooltipContent;

      if (resourceGainTooltip) {
        tooltipContent = resourceGainTooltip;
      } else if (showCost) {
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

      const buttonKey = getButtonLevelKey(actionId);
      return (
        <div className="relative inline-block">
          <CooldownButton
            key={actionId}
            ref={isBlastPortal ? blastPortalRef : undefined}
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
          {buttonKey && <ButtonLevelIndicator buttonKey={buttonKey} actionId={actionId} />}
        </div>
      );
    }

    const buttonKey = getButtonLevelKey(actionId);
    return (
      <div className="relative inline-block">
        <CooldownButton
          key={actionId}
          ref={isBlastPortal ? blastPortalRef : undefined}
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
        {buttonKey && <ButtonLevelIndicator buttonKey={buttonKey} actionId={actionId} />}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full w-full">
      {explosionEffect.ExplosionEffectRenderer()}
      <div className="space-y-4 pb-4">
        {actionGroups.map((group, groupIndex) => {
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

        const visibleActions = group.actions.filter((action) => {
          if (action.showWhen !== undefined) {
            return action.showWhen;
          }
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