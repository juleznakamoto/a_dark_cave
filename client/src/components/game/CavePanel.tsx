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
        
        <div className="grid gap-3">
          {/* Light Fire Action */}
          {!flags.fireLit && (
            <Button
              variant="outline"
              className="p-4 h-auto text-left flex-col items-start group relative"
              onClick={lightFire}
              disabled={(cooldowns['lightFire'] || 0) > 0}
              data-testid="action-light-fire"
            >
              <div className="font-medium group-hover:text-primary">
                Light Fire
                {(cooldowns['lightFire'] || 0) > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    ({Math.ceil(cooldowns['lightFire'])}s)
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                You have some dry wood and kindling. A fire would provide warmth and light.
              </div>
              {(cooldowns['lightFire'] || 0) > 0 && (
                <div 
                  className="absolute left-0 bottom-0 h-1 bg-muted-foreground/30 pointer-events-none"
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
              className="p-4 h-auto text-left flex-col items-start group relative"
              onClick={gatherWood}
              disabled={(cooldowns['gatherWood'] || 0) > 0}
              data-testid="action-gather-wood"
            >
              <div className="font-medium group-hover:text-primary">
                Gather Wood
                {(cooldowns['gatherWood'] || 0) > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    ({Math.ceil(cooldowns['gatherWood'])}s)
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Search the cave for fallen branches and dry wood to keep the fire burning.
              </div>
              {(cooldowns['gatherWood'] || 0) > 0 && (
                <div 
                  className="absolute left-0 bottom-0 h-1 bg-muted-foreground/30 pointer-events-none"
                  style={{
                    width: `${((cooldowns['gatherWood'] || 0) / gameActions.gatherWood.cooldown) * 100}%`,
                    transition: 'width 0.2s linear'
                  }}
                />
              )}
            </Button>
          )}

          {/* Build Torch Action - Coming Soon */}
          <Button
            variant="outline"
            className="p-4 h-auto text-left flex-col items-start opacity-50"
            disabled
            data-testid="action-build-torch"
          >
            <div className="font-medium">Build Torch</div>
            <div className="text-sm text-muted-foreground mt-1">
              Create a torch to explore deeper into the cave. (Requires 10 wood)
            </div>
          </Button>
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
