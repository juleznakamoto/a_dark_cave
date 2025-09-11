import { useGameStore } from '@/game/state';
import { gameActions, gameTexts, shouldShowAction, canExecuteAction } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function CavePanel() {
  const { resources, tools, flags, executeAction, cooldowns, story } = useGameStore();
  const state = useGameStore.getState();

  // Use data-driven visibility checks
  const showLightFire = !flags.fireLit;
  const showGatherWood = shouldShowAction('gatherWood', state);
  const showExploreCave = shouldShowAction('exploreCave', state);

  // Craft section items
  const showBuildTorch = shouldShowAction('buildTorch', state);
  const showCraftAxe = shouldShowAction('craftAxe', state);

  // Use data-driven requirement checks
  const canBuildTorch = canExecuteAction('buildTorch', state);
  const canExploreCave = canExecuteAction('exploreCave', state);
  const canCraftAxe = canExecuteAction('craftAxe', state);

  return (
    <div className="space-y-6">
      {/* Action Buttons Section (no header) */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {!flags.fireLit && (
            <CooldownButton
              onClick={() => executeAction('lightFire')}
              cooldownMs={(gameActions.lightFire?.cooldown || 1) * 1000}
              data-testid="button-light-fire"
              size="sm"
            >
              Light Fire
            </CooldownButton>
          )}

          {showGatherWood && (
            <CooldownButton
              onClick={() => executeAction('gatherWood')}
              cooldownMs={(gameActions.gatherWood?.cooldown || 3) * 1000}
              data-testid="button-gather-wood"
              size="sm"
            >
              Gather Wood
            </CooldownButton>
          )}

          {showExploreCave && (
            <CooldownButton
              onClick={() => executeAction('exploreCave')}
              cooldownMs={(gameActions.exploreCave?.cooldown || 10) * 1000}
              data-testid="button-explore-cave"
              size="sm"
              disabled={!canExploreCave}
            >
              Explore Cave (5 torch)
            </CooldownButton>
          )}
        </div>
      </div>

      {/* Craft Section */}
      {(showBuildTorch || showCraftAxe) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Craft</h3>
          <div className="flex flex-wrap gap-2">
            {showBuildTorch && (
              <CooldownButton
                onClick={() => executeAction('buildTorch')}
                cooldownMs={(gameActions.buildTorch?.cooldown || 5) * 1000}
                data-testid="button-build-torch"
                size="sm"
                disabled={!canBuildTorch}
              >
                Torch (10 wood)
              </CooldownButton>
            )}

            {showCraftAxe && (
              <CooldownButton
                onClick={() => executeAction('craftAxe')}
                cooldownMs={(gameActions.craftAxe?.cooldown || 15) * 1000}
                data-testid="button-craft-axe"
                size="sm"
                disabled={!canCraftAxe}
              >
                Axe (5 wood, 10 stone)
              </CooldownButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}