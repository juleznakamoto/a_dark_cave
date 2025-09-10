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

  // Check if actions have been seen (should remain visible)
  const hasSeenBuildTorch = story.seen.actionBuildTorch || flags.fireLit && resources.wood >= 10;
  const hasSeenBuildHut = story.seen.actionBuildHut || flags.villageUnlocked && resources.wood >= 50;

  // Check if actions can currently be performed
  const canBuildTorch = flags.fireLit && resources.wood >= 10 && (cooldowns['buildTorch'] || 0) === 0;
  const canBuildHut = flags.villageUnlocked && resources.wood >= 50 && (cooldowns['buildHut'] || 0) === 0;

  return (
    <div className="space-y-6">
      {/* Events Panel */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium border-b border-border pb-2">Events</h2>
        <LogPanel />
      </div>

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
        </div>
      </div>

      {/* Build Panel */}
      {(hasSeenBuildTorch || hasSeenBuildHut) && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">Build</h2>

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
                <span className="relative z-10">Build Torch (10 wood)</span>
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