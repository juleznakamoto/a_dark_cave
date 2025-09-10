import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import { gameTexts, gameActions } from '@/game/rules';

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
            <Button
              variant="outline"
              className="relative overflow-hidden"
              size="sm"
              onClick={lightFire}
              disabled={(cooldowns['lightFire'] || 0) > 0}
              data-testid="action-light-fire"
            >
              <span className="relative z-10">Light Fire</span>
              {(cooldowns['lightFire'] || 0) > 0 && (
                <div 
                  className="absolute inset-0 bg-muted/50"
                  style={{
                    width: `${((cooldowns['lightFire'] || 0) / gameActions.lightFire.cooldown) * 100}%`,
                    transition: 'width 0.2s linear'
                  }}
                />
              )}
            </Button>
          )}

          {/* Gather Wood Action */}
          {flags.fireLit && (
            <Button
              variant="outline"
              className="relative overflow-hidden"
              size="sm"
              onClick={gatherWood}
              disabled={(cooldowns['gatherWood'] || 0) > 0}
              data-testid="action-gather-wood"
            >
              <span className="relative z-10">Gather Wood</span>
              {(cooldowns['gatherWood'] || 0) > 0 && (
                <div 
                  className="absolute inset-0 bg-muted/50"
                  style={{
                    width: `${((cooldowns['gatherWood'] || 0) / gameActions.gatherWood.cooldown) * 100}%`,
                    transition: 'width 0.2s linear'
                  }}
                />
              )}
            </Button>
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
