import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import { gameTexts, gameActions } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import LogPanel from './LogPanel';

export default function CavePanel() {
  const {
    resources,
    flags,
    tools,
    buildings,
    cooldowns,
    story,
    executeAction
  } = useGameStore();

  const handleBuildTorch = () => {
    executeAction('buildTorch');
  };

  const handleBuildHut = () => {
    executeAction('buildHut');
  };

  const handleExploreCave = () => {
    executeAction('exploreCave');
  };

  const handleCraftAxe = () => {
    executeAction('craftAxe');
  };

  // Check if actions have been seen (should remain visible)
  const hasSeenBuildTorch = story.seen.actionBuildTorch || (flags.fireLit && resources.wood >= 10);
  const hasSeenBuildHut = story.seen.actionBuildHut || (flags.villageUnlocked && resources.wood >= 50);
  const hasSeenExploreCave = story.seen.actionExploreCave || flags.torchBuilt;
  const hasSeenCraftAxe = story.seen.actionCraftAxe || story.seen.hasStone;

  // Check if actions can currently be performed
  const canBuildTorch = flags.fireLit && resources.wood >= 10 && (cooldowns['buildTorch'] || 0) === 0;
  const canBuildHut = flags.villageUnlocked && resources.wood >= 50 && (cooldowns['buildHut'] || 0) === 0;
  const canExploreCave = flags.fireLit && resources.torch >= 5 && (cooldowns['exploreCave'] || 0) === 0;
  const canCraftAxe = flags.fireLit && resources.wood >= 5 && resources.stone >= 10 && !tools.axe && (cooldowns['craftAxe'] || 0) === 0;

  return (
    <div className="space-y-6">
      {/* Actions Panel */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium border-b border-border pb-2">Actions</h2>

        <div className="flex flex-wrap gap-2">
          {/* Light Fire Action */}
          {!flags.fireLit && (
            <CooldownButton
              onClick={() => executeAction('lightFire')}
              cooldownMs={gameActions.lightFire.cooldown * 1000}
              data-testid="action-light-fire"
              className="relative overflow-hidden"
              size="sm"
            >
              <span className="relative z-10">Light Fire</span>
            </CooldownButton>
          )}

          {/* Gather Wood Action */}
          {flags.fireLit && (
            <CooldownButton
              onClick={() => executeAction('gatherWood')}
              cooldownMs={gameActions.gatherWood.cooldown * 1000}
              data-testid="action-gather-wood"
              className="relative overflow-hidden"
              size="sm"
            >
              <span className="relative z-10">Gather Wood</span>
            </CooldownButton>
          )}

          {/* Explore Cave */}
          {hasSeenExploreCave && (
            <CooldownButton
              onClick={handleExploreCave}
              cooldownMs={(gameActions.exploreCave?.cooldown || 15) * 1000}
              data-testid="button-explore-cave"
              disabled={!canExploreCave}
              className="relative overflow-hidden"
              size="sm"
            >
              <span className="relative z-10">Explore Cave (5 torches)</span>
            </CooldownButton>
          )}
        </div>
      </div>

      {/* Craft Panel */}
      {(hasSeenBuildTorch || hasSeenBuildHut) && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">Craft</h2>

          <div className="flex flex-wrap gap-2">
            {/* Build Torch */}
            {hasSeenBuildTorch && (
              <CooldownButton
                onClick={handleBuildTorch}
                cooldownMs={(gameActions.buildTorch?.cooldown || 5) * 1000}
                data-testid="button-build-torch"
                disabled={!canBuildTorch}
                className="relative overflow-hidden"
                size="sm"
              >
                <span className="relative z-10">Torch (10 wood)</span>
              </CooldownButton>
            )}

            {/* Build Hut (Village unlocked) */}
            {hasSeenBuildHut && (
              <CooldownButton
                onClick={handleBuildHut}
                cooldownMs={(gameActions.buildHut?.cooldown || 10) * 1000}
                data-testid="button-build-hut"
                disabled={!canBuildHut}
                className="relative overflow-hidden"
                size="sm"
              >
                <span className="relative z-10">Build Hut (50 wood)</span>
              </CooldownButton>
            )}

            {/* Craft Axe */}
            {hasSeenCraftAxe && (
              <CooldownButton
                onClick={handleCraftAxe}
                cooldownMs={(gameActions.craftAxe?.cooldown || 20) * 1000}
                data-testid="button-craft-axe"
                disabled={!canCraftAxe}
                className="relative overflow-hidden"
                size="sm"
              >
                <span className="relative z-10">Axe (5 wood, 10 stone)</span>
              </CooldownButton>
            )}
          </div>
        </div>
      )}

      {/* Progress Hints */}
      <div className="space-y-2 text-sm text-muted-foreground">
        {flags.fireLit && resources.wood < 5 && (
          <p data-testid="hint-need-fuel">{gameTexts.hints.needFuel}</p>
        )}
        {resources.wood >= 10 && (
          <p data-testid="hint-enough-wood">{gameTexts.hints.enoughWood}</p>
        )}
      </div>
    </div>
  );
}