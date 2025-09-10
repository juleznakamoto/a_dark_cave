import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import { gameTexts, gameActions } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function CavePanel() {
  const { flags, resources, lightFire, gatherWood, cooldowns } = useGameStore();

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
              onClick={lightFire}
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
              onClick={gatherWood}
              cooldownMs={gameActions.gatherWood.cooldown * 1000}
              data-testid="action-gather-wood"
              className="relative overflow-hidden"
              size="sm"
            >
              <span className="relative z-10">Gather Wood</span>
            </CooldownButton>
          )}

          {/* Build Torch Action */}
          {flags.fireLit && resources.wood >= 10 && (
            <Button
              variant="outline"
              className="relative overflow-hidden"
              size="sm"
              onClick={() => {}}
              disabled={true}
              data-testid="action-build-torch"
            >
              <span className="relative z-10">Build Torch</span>
            </Button>
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
    </div>
  );
}