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
  const canBuildTorch = canExecuteAction('buildTorch', state);
  const canExploreCave = canExecuteAction('exploreCave', state);
  const canCraftStoneAxe = canExecuteAction('craftStoneAxe', state);
  const canCraftStonePickaxe = canExecuteAction('craftStonePickaxe', state);
  const canMineIron = canExecuteAction('mineIron', state);

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
                StoneAxe{getCostText('craftStoneAxe')}
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
                StonePickaxe{getCostText('craftStonePickaxe')}
              </CooldownButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}