import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function CavePanel() {
  const { flags, executeAction } = useGameStore();
  const state = useGameStore.getState();

  const showGatherWood = shouldShowAction('gatherWood', state);
  const showExploreCave = shouldShowAction('exploreCave', state);
  const showBuildTorch = shouldShowAction('buildTorch', state);
  const showCraftAxe = shouldShowAction('craftAxe', state);
  const showCraftPickaxe = true;
  const showMineIron = shouldShowAction('mineIron', state);
  const canBuildTorch = canExecuteAction('buildTorch', state);
  const canExploreCave = canExecuteAction('exploreCave', state);
  const canCraftAxe = canExecuteAction('craftAxe', state);
  const canCraftPickaxe = canExecuteAction('craftPickaxe', state);
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
      {(showBuildTorch || showCraftAxe || showCraftPickaxe) && (
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

            {showCraftAxe && (
              <CooldownButton
                onClick={() => executeAction('craftAxe')}
                cooldownMs={gameActions.craftAxe.cooldown * 1000}
                data-testid="button-craft-axe"
                size="sm"
                disabled={!canCraftAxe}
              >
                Axe{getCostText('craftAxe')}
              </CooldownButton>
            )}

            {showCraftPickaxe && (
              <CooldownButton
                onClick={() => executeAction('craftPickaxe')}
                cooldownMs={gameActions.craftPickaxe.cooldown * 1000}
                data-testid="button-craft-pickaxe"
                size="sm"
                disabled={!canCraftPickaxe}
              >
                Pickaxe{getCostText('craftPickaxe')}
              </CooldownButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}