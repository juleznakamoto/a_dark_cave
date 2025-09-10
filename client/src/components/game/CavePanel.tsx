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
    lightFire,
    gatherWood,
    updateResource,
    setFlag,
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
      {/* Narrative Text */}
      <div className="space-y-4">
        <p className="font-serif text-lg leading-relaxed">
          {gameTexts.cave.initial}
        </p>

        {flags.fireLit && (
          <p className="font-serif leading-relaxed text-muted-foreground italic">
            {gameTexts.cave.fireLit}
          </p>
        )}
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

          {/* Build Torch Action */}
          {hasSeenBuildTorch && (
            <CooldownButton
              onClick={handleBuildTorch}
              cooldownMs={(gameActions.buildTorch?.cooldown || 5) * 1000}
              variant="secondary"
              data-testid="button-build-torch"
              disabled={!canBuildTorch}
              className={`w-full ${
                canBuildTorch
                  ? 'bg-amber-800 border-amber-600 text-amber-100 hover:bg-amber-700 hover:text-amber-50'
                  : 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Build Torch (10 wood)
            </CooldownButton>
          )}

          {/* Build Hut Action (Village unlocked) */}
          {hasSeenBuildHut && (
            <CooldownButton
              onClick={handleBuildHut}
              cooldownMs={(gameActions.buildHut?.cooldown || 10) * 1000}
              variant="secondary"
              data-testid="button-build-hut"
              disabled={!canBuildHut}
              className={`w-full ${
                canBuildHut
                  ? 'bg-green-800 border-green-600 text-green-100 hover:bg-green-700 hover:text-green-50'
                  : 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Build Hut (50 wood)
            </CooldownButton>
          )}
        </div>
      </div>

      {/* Progress Hints */}
      <div className="space-y-2 text-sm text-muted-foreground">
        {flags.fireLit && resources.wood < 5 && (
          <p data-testid="hint-need-fuel">{gameTexts.hints.needFuel}</p>
        )}
        {resources.wood >= 10 && (
          <p data-testid="hint-enough-wood">{gameTexts.hints.enoughWood}</p>
        )}
      </div>

      {/* Event Log */}
      {flags.fireLit && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">Events</h2>
          <LogPanel />
        </div>
      )}
    </div>
  );
}