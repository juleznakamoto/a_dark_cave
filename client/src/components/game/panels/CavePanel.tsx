import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export default function CavePanel() {
  const { flags, executeAction } = useGameStore();
  const state = useGameStore();

  const showGatherWood = shouldShowAction('gatherWood', state);
  const showExploreCave = shouldShowAction('exploreCave', state);
  const showBuildTorch = shouldShowAction('buildTorch', state);
  const showCraftStoneAxe = shouldShowAction('craftStoneAxe', state);
  const showCraftStonePickaxe = shouldShowAction('craftStonePickaxe', state);
  const showMineIron = shouldShowAction('mineIron', state);
  const showVentureDeeper = shouldShowAction('ventureDeeper', state);
  const canBuildTorch = canExecuteAction('buildTorch', state);
  const canExploreCave = canExecuteAction('exploreCave', state);
  const canCraftStoneAxe = canExecuteAction('craftStoneAxe', state);
  const canCraftStonePickaxe = canExecuteAction('craftStonePickaxe', state);
  const canMineIron = canExecuteAction('mineIron', state);
  const canVentureDeeper = canExecuteAction('ventureDeeper', state);

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
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <CooldownButton
                    onClick={() => executeAction('exploreCave')}
                    cooldownMs={gameActions.exploreCave.cooldown * 1000}
                    data-testid="button-explore-cave"
                    size="sm"
                    disabled={!canExploreCave}
                  >
                    Explore Cave
                  </CooldownButton>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="text-sm">
                  <div className="font-medium mb-1">Explore Cave</div>
                  <div className="text-muted-foreground">Cost: {getCostText('exploreCave').replace(/[()]/g, '')}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {showMineIron && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <CooldownButton
                    onClick={() => executeAction('mineIron')}
                    cooldownMs={gameActions.mineIron.cooldown * 1000}
                    data-testid="button-mine-iron"
                    size="sm"
                    disabled={!canMineIron}
                  >
                    Mine Iron
                  </CooldownButton>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="text-sm">
                  <div className="font-medium mb-1">Mine Iron</div>
                  <div className="text-muted-foreground">Cost: {getCostText('mineIron').replace(/[()]/g, '')}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {shouldShowAction('mineCoal', state) && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <CooldownButton
                    onClick={() => executeAction('mineCoal')}
                    cooldownMs={gameActions.mineCoal.cooldown * 1000}
                    data-testid="button-mine-coal"
                    size="sm"
                    disabled={!canExecuteAction('mineCoal', state)}
                  >
                    Mine Coal
                  </CooldownButton>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="text-sm">
                  <div className="font-medium mb-1">Mine Coal</div>
                  <div className="text-muted-foreground">Cost: {getCostText('mineCoal').replace(/[()]/g, '')}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {shouldShowAction('mineSulfur', state) && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <CooldownButton
                    onClick={() => executeAction('mineSulfur')}
                    cooldownMs={gameActions.mineSulfur.cooldown * 1000}
                    data-testid="button-mine-sulfur"
                    size="sm"
                    disabled={!canExecuteAction('mineSulfur', state)}
                  >
                    Mine Sulfur
                  </CooldownButton>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="text-sm">
                  <div className="font-medium mb-1">Mine Sulfur</div>
                  <div className="text-muted-foreground">Cost: {getCostText('mineSulfur').replace(/[()]/g, '')}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {shouldShowAction('mineAdamant', state) && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <CooldownButton
                    onClick={() => executeAction('mineAdamant')}
                    cooldownMs={gameActions.mineAdamant.cooldown * 1000}
                    data-testid="button-mine-adamant"
                    size="sm"
                    disabled={!canExecuteAction('mineAdamant', state)}
                  >
                    Mine Adamant
                  </CooldownButton>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="text-sm">
                  <div className="font-medium mb-1">Mine Adamant</div>
                  <div className="text-muted-foreground">Cost: {getCostText('mineAdamant').replace(/[()]/g, '')}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {showVentureDeeper && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <CooldownButton
                    onClick={() => executeAction('ventureDeeper')}
                    cooldownMs={gameActions.ventureDeeper.cooldown * 1000}
                    data-testid="button-venture-deeper"
                    size="sm"
                    disabled={!canVentureDeeper}
                  >
                    Venture Deeper
                  </CooldownButton>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="text-sm">
                  <div className="font-medium mb-1">Venture Deeper</div>
                  <div className="text-muted-foreground">Cost: {getCostText('ventureDeeper').replace(/[()]/g, '')}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {shouldShowAction('descendFurther', state) && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <CooldownButton
                    onClick={() => executeAction('descendFurther')}
                    cooldownMs={gameActions.descendFurther.cooldown * 1000}
                    data-testid="button-descend-further"
                    size="sm"
                    disabled={!canExecuteAction('descendFurther', state)}
                  >
                    Descend Further
                  </CooldownButton>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="text-sm">
                  <div className="font-medium mb-1">Descend Further</div>
                  <div className="text-muted-foreground">Cost: {getCostText('descendFurther').replace(/[()]/g, '')}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {shouldShowAction('exploreRuins', state) && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <CooldownButton
                    onClick={() => executeAction('exploreRuins')}
                    cooldownMs={gameActions.exploreRuins.cooldown * 1000}
                    data-testid="button-explore-ruins"
                    size="sm"
                    disabled={!canExecuteAction('exploreRuins', state)}
                  >
                    Explore Ruins
                  </CooldownButton>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="text-sm">
                  <div className="font-medium mb-1">Explore Ruins</div>
                  <div className="text-muted-foreground">Cost: {getCostText('exploreRuins').replace(/[()]/g, '')}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {shouldShowAction('exploreTemple', state) && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <CooldownButton
                    onClick={() => executeAction('exploreTemple')}
                    cooldownMs={gameActions.exploreTemple.cooldown * 1000}
                    data-testid="button-explore-temple"
                    size="sm"
                    disabled={!canExecuteAction('exploreTemple', state)}
                  >
                    Explore Temple
                  </CooldownButton>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="text-sm">
                  <div className="font-medium mb-1">Explore Temple</div>
                  <div className="text-muted-foreground">Cost: {getCostText('exploreTemple').replace(/[()]/g, '')}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}

          {shouldShowAction('exploreCitadel', state) && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div>
                  <CooldownButton
                    onClick={() => executeAction('exploreCitadel')}
                    cooldownMs={gameActions.exploreCitadel.cooldown * 1000}
                    data-testid="button-explore-citadel"
                    size="sm"
                    disabled={!canExecuteAction('exploreCitadel', state)}
                  >
                    Explore Citadel
                  </CooldownButton>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="text-sm">
                  <div className="font-medium mb-1">Explore Citadel</div>
                  <div className="text-muted-foreground">Cost: {getCostText('exploreCitadel').replace(/[()]/g, '')}</div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>
      </div>

      {/* Craft Section */}
      {(showBuildTorch || showCraftStoneAxe || showCraftStonePickaxe) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Craft</h3>
          <div className="flex flex-wrap gap-2">
            {showBuildTorch && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('buildTorch')}
                      cooldownMs={gameActions.buildTorch.cooldown * 1000}
                      data-testid="button-build-torch"
                      size="sm"
                      disabled={!canBuildTorch}
                    >
                      Torch
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Torch</div>
                    <div className="text-muted-foreground">Cost: {getCostText('buildTorch').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {showCraftStoneAxe && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('craftStoneAxe')}
                      cooldownMs={gameActions.craftStoneAxe.cooldown * 1000}
                      data-testid="button-craft-axe"
                      size="sm"
                      disabled={!canCraftStoneAxe}
                    >
                      Stone Axe
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Stone Axe</div>
                    <div className="text-muted-foreground">Cost: {getCostText('craftStoneAxe').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {showCraftStonePickaxe && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('craftStonePickaxe')}
                      cooldownMs={gameActions.craftStonePickaxe.cooldown * 1000}
                      data-testid="button-craft-stone_pickaxe"
                      size="sm"
                      disabled={!canCraftStonePickaxe}
                    >
                      Stone Pickaxe
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Stone Pickaxe</div>
                    <div className="text-muted-foreground">Cost: {getCostText('craftStonePickaxe').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {shouldShowAction('craftIronAxe', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('craftIronAxe')}
                      cooldownMs={gameActions.craftIronAxe.cooldown * 1000}
                      data-testid="button-craft-iron-axe"
                      size="sm"
                      disabled={!canExecuteAction('craftIronAxe', state)}
                    >
                      Iron Axe
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Iron Axe</div>
                    <div className="text-muted-foreground">Cost: {getCostText('craftIronAxe').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {shouldShowAction('craftIronPickaxe', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('craftIronPickaxe')}
                      cooldownMs={gameActions.craftIronPickaxe.cooldown * 1000}
                      data-testid="button-craft-iron-pickaxe"
                      size="sm"
                      disabled={!canExecuteAction('craftIronPickaxe', state)}
                    >
                      Iron Pickaxe
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Iron Pickaxe</div>
                    <div className="text-muted-foreground">Cost: {getCostText('craftIronPickaxe').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {shouldShowAction('craftSteelAxe', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('craftSteelAxe')}
                      cooldownMs={gameActions.craftSteelAxe.cooldown * 1000}
                      data-testid="button-craft-steel-axe"
                      size="sm"
                      disabled={!canExecuteAction('craftSteelAxe', state)}
                    >
                      Steel Axe
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Steel Axe</div>
                    <div className="text-muted-foreground">Cost: {getCostText('craftSteelAxe').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {shouldShowAction('craftSteelPickaxe', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('craftSteelPickaxe')}
                      cooldownMs={gameActions.craftSteelPickaxe.cooldown * 1000}
                      data-testid="button-craft-steel-pickaxe"
                      size="sm"
                      disabled={!canExecuteAction('craftSteelPickaxe', state)}
                    >
                      Steel Pickaxe
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Steel Pickaxe</div>
                    <div className="text-muted-foreground">Cost: {getCostText('craftSteelPickaxe').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {shouldShowAction('craftObsidianAxe', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('craftObsidianAxe')}
                      cooldownMs={gameActions.craftObsidianAxe.cooldown * 1000}
                      data-testid="button-craft-obsidian-axe"
                      size="sm"
                      disabled={!canExecuteAction('craftObsidianAxe', state)}
                    >
                      Obsidian Axe
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Obsidian Axe</div>
                    <div className="text-muted-foreground">Cost: {getCostText('craftObsidianAxe').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {shouldShowAction('craftObsidianPickaxe', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('craftObsidianPickaxe')}
                      cooldownMs={gameActions.craftObsidianPickaxe.cooldown * 1000}
                      data-testid="button-craft-obsidian-pickaxe"
                      size="sm"
                      disabled={!canExecuteAction('craftObsidianPickaxe', state)}
                    >
                      Obsidian Pickaxe
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Obsidian Pickaxe</div>
                    <div className="text-muted-foreground">Cost: {getCostText('craftObsidianPickaxe').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {shouldShowAction('craftAdamantAxe', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('craftAdamantAxe')}
                      cooldownMs={gameActions.craftAdamantAxe.cooldown * 1000}
                      data-testid="button-craft-adamant-axe"
                      size="sm"
                      disabled={!canExecuteAction('craftAdamantAxe', state)}
                    >
                      Adamant Axe
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Adamant Axe</div>
                    <div className="text-muted-foreground">Cost: {getCostText('craftAdamantAxe').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {shouldShowAction('craftAdamantPickaxe', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div>
                    <CooldownButton
                      onClick={() => executeAction('craftAdamantPickaxe')}
                      cooldownMs={gameActions.craftAdamantPickaxe.cooldown * 1000}
                      data-testid="button-craft-adamant-pickaxe"
                      size="sm"
                      disabled={!canExecuteAction('craftAdamantPickaxe', state)}
                    >
                      Adamant Pickaxe
                    </CooldownButton>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Adamant Pickaxe</div>
                    <div className="text-muted-foreground">Cost: {getCostText('craftAdamantPickaxe').replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}