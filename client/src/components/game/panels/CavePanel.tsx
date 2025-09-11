
import { useGameStore } from '@/game/state';
import { gameActions, gameTexts } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';

export default function CavePanel() {
  const { resources, tools, flags, executeAction, cooldowns, story } = useGameStore();

  // Show gather wood button only after fire is lit
  const showGatherWood = flags.fireLit && !story.seen.hasWood;
  // Show build torch when player has enough wood (10+)
  const showBuildTorch = flags.fireLit && resources.wood >= 10 && !flags.torchBuilt;
  // Show explore cave when player has 5+ torches
  const showExploreCave = flags.fireLit && resources.torch >= 5 && !flags.caveExplored;
  // Show craft axe when player has explored cave and has resources
  const showCraftAxe = flags.caveExplored && resources.wood >= 5 && resources.stone >= 10 && !tools.axe;

  return (
    <div className="space-y-6">
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

          {showBuildTorch && (
            <CooldownButton
              onClick={() => executeAction('buildTorch')}
              cooldownMs={(gameActions.buildTorch?.cooldown || 5) * 1000}
              data-testid="button-build-torch"
              size="sm"
            >
              Build Torch (10 wood)
            </CooldownButton>
          )}

          {showExploreCave && (
            <CooldownButton
              onClick={() => executeAction('exploreCave')}
              cooldownMs={(gameActions.exploreCave?.cooldown || 10) * 1000}
              data-testid="button-explore-cave"
              size="sm"
            >
              Explore Cave (5 torch)
            </CooldownButton>
          )}

          {showCraftAxe && (
            <CooldownButton
              onClick={() => executeAction('craftAxe')}
              cooldownMs={(gameActions.craftAxe?.cooldown || 15) * 1000}
              data-testid="button-craft-axe"
              size="sm"
            >
              Craft Axe (5 wood, 10 stone)
            </CooldownButton>
          )}
        </div>
      </div>
    </div>
  );
}
