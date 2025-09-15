import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function CavePanel() {
  const { flags, executeAction } = useGameStore();
  const state = useGameStore();

  const showGatherWood = shouldShowAction('gatherWood', state);
  const showExploreCave = shouldShowAction('exploreCave', state);
  const showBuildTorch = shouldShowAction('buildTorch', state);
  const showCraftStoneAxe = shouldShowAction('craftStoneAxe', state);
  const showCraftStonePickaxe = shouldShowAction('craftStonePickaxe', state);
  const showMineIron = shouldShowAction('mineIron', state);
  const showVentureDeeper = shouldShowAction('ventureDeeper', state);
  const canBuildTorch = canExecuteAction('buildTorch', state);
  const canExploreCave = canExecuteAction('exploreCave', state);
  const canCraftStoneAxe = canExecuteAction('craftStoneAxe', state);
  const canCraftStonePickaxe = canExecuteAction('craftStonePickaxe', state);
  const canMineIron = canExecuteAction('mineIron', state);
  const canVentureDeeper = canExecuteAction('ventureDeeper', state);

  return (
    <div className="space-y-6">
      {/* Action Buttons Section (no header) */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {!flags.fireLit && (
            <CooldownButton
              onClick={() => executeAction('lightFire')}
              cooldownMs={gameActions.lightFire.cooldown * 1000}
              data-testid="button-light-fire"
              size="sm"
            >
              Light Fire
            </CooldownButton>
          )}

          {showGatherWood && (
            <CooldownButton
              onClick={() => executeAction('gatherWood')}
              cooldownMs={gameActions.gatherWood.cooldown * 1000}
              data-testid="button-gather-wood"
              size="sm"
            >
              Gather Wood
            </CooldownButton>
          )}

          {showExploreCave && (
            <CooldownButton
              onClick={() => executeAction('exploreCave')}
              cooldownMs={gameActions.exploreCave.cooldown * 1000}
              data-testid="button-explore-cave"
              size="sm"
              disabled={!canExploreCave}
            >
              Explore Cave{getCostText('exploreCave')}
            </CooldownButton>
          )}

          {showMineIron && (
            <CooldownButton
              onClick={() => executeAction('mineIron')}
              cooldownMs={gameActions.mineIron.cooldown * 1000}
              data-testid="button-mine-iron"
              size="sm"
              disabled={!canMineIron}
            >
              Mine Iron{getCostText('mineIron')}
            </CooldownButton>
          )}

          {shouldShowAction('mineCoal', state) && (
            <CooldownButton
              onClick={() => executeAction('mineCoal')}
              cooldownMs={gameActions.mineCoal.cooldown * 1000}
              data-testid="button-mine-coal"
              size="sm"
              disabled={!canExecuteAction('mineCoal', state)}
            >
              Mine Coal{getCostText('mineCoal')}
            </CooldownButton>
          )}

          {shouldShowAction('mineSulfur', state) && (
            <CooldownButton
              onClick={() => executeAction('mineSulfur')}
              cooldownMs={gameActions.mineSulfur.cooldown * 1000}
              data-testid="button-mine-sulfur"
              size="sm"
              disabled={!canExecuteAction('mineSulfur', state)}
            >
              Mine Sulfur{getCostText('mineSulfur')}
            </CooldownButton>
          )}

          {showVentureDeeper && (
            <CooldownButton
              onClick={() => executeAction('ventureDeeper')}
              cooldownMs={gameActions.ventureDeeper.cooldown * 1000}
              data-testid="button-venture-deeper"
              size="sm"
              disabled={!canVentureDeeper}
            >
              Venture Deeper{getCostText('ventureDeeper')}
            </CooldownButton>
          )}
        </div>
      </div>

      {/* Craft Section */}
      {(showBuildTorch || showCraftStoneAxe || showCraftStonePickaxe) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Craft</h3>
          <div className="flex flex-wrap gap-2">
            {showBuildTorch && (
              <CooldownButton
                onClick={() => executeAction('buildTorch')}
                cooldownMs={gameActions.buildTorch.cooldown * 1000}
                data-testid="button-build-torch"
                size="sm"
                disabled={!canBuildTorch}
              >
                Torch{getCostText('buildTorch')}
              </CooldownButton>
            )}

            {showCraftStoneAxe && (
              <CooldownButton
                onClick={() => executeAction('craftStoneAxe')}
                cooldownMs={gameActions.craftStoneAxe.cooldown * 1000}
                data-testid="button-craft-axe"
                size="sm"
                disabled={!canCraftStoneAxe}
              >
                Stone Axe{getCostText('craftStoneAxe')}
              </CooldownButton>
            )}

            {showCraftStonePickaxe && (
              <CooldownButton
                onClick={() => executeAction('craftStonePickaxe')}
                cooldownMs={gameActions.craftStonePickaxe.cooldown * 1000}
                data-testid="button-craft-stone_pickaxe"
                size="sm"
                disabled={!canCraftStonePickaxe}
              >
                Stone Pickaxe{getCostText('craftStonePickaxe')}
              </CooldownButton>
            )}

            {shouldShowAction('craftIronAxe', state) && (
              <CooldownButton
                onClick={() => executeAction('craftIronAxe')}
                cooldownMs={gameActions.craftIronAxe.cooldown * 1000}
                data-testid="button-craft-iron-axe"
                size="sm"
                disabled={!canExecuteAction('craftIronAxe', state)}
              >
                Iron Axe{getCostText('craftIronAxe')}
              </CooldownButton>
            )}

            {shouldShowAction('craftIronPickaxe', state) && (
              <CooldownButton
                onClick={() => executeAction('craftIronPickaxe')}
                cooldownMs={gameActions.craftIronPickaxe.cooldown * 1000}
                data-testid="button-craft-iron-pickaxe"
                size="sm"
                disabled={!canExecuteAction('craftIronPickaxe', state)}
              >
                Iron Pickaxe{getCostText('craftIronPickaxe')}
              </CooldownButton>
            )}

            {shouldShowAction('craftSteelAxe', state) && (
              <CooldownButton
                onClick={() => executeAction('craftSteelAxe')}
                cooldownMs={gameActions.craftSteelAxe.cooldown * 1000}
                data-testid="button-craft-steel-axe"
                size="sm"
                disabled={!canExecuteAction('craftSteelAxe', state)}
              >
                Steel Axe{getCostText('craftSteelAxe')}
              </CooldownButton>
            )}

            {shouldShowAction('craftSteelPickaxe', state) && (
              <CooldownButton
                onClick={() => executeAction('craftSteelPickaxe')}
                cooldownMs={gameActions.craftSteelPickaxe.cooldown * 1000}
                data-testid="button-craft-steel-pickaxe"
                size="sm"
                disabled={!canExecuteAction('craftSteelPickaxe', state)}
              >
                Steel Pickaxe{getCostText('craftSteelPickaxe')}
              </CooldownButton>
            )}

            {shouldShowAction('craftObsidianAxe', state) && (
              <CooldownButton
                onClick={() => executeAction('craftObsidianAxe')}
                cooldownMs={gameActions.craftObsidianAxe.cooldown * 1000}
                data-testid="button-craft-obsidian-axe"
                size="sm"
                disabled={!canExecuteAction('craftObsidianAxe', state)}
              >
                Obsidian Axe{getCostText('craftObsidianAxe')}
              </CooldownButton>
            )}

            {shouldShowAction('craftObsidianPickaxe', state) && (
              <CooldownButton
                onClick={() => executeAction('craftObsidianPickaxe')}
                cooldownMs={gameActions.craftObsidianPickaxe.cooldown * 1000}
                data-testid="button-craft-obsidian-pickaxe"
                size="sm"
                disabled={!canExecuteAction('craftObsidianPickaxe', state)}
              >
                Obsidian Pickaxe{getCostText('craftObsidianPickaxe')}
              </CooldownButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}