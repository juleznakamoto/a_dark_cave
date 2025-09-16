import { useGameStore } from '@/game/state';
import { gameActions, shouldShowAction, canExecuteAction, getCostText } from '@/game/rules';
import CooldownButton from '@/components/CooldownButton';
import { Button } from '@/components/ui/button';
import { getPopulationProductionText } from '@/game/population';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export default function VillagePanel() {
  const { villagers, buildings, story, executeAction, assignVillager, unassignVillager } = useGameStore();
  const state = useGameStore.getState();

  const handleBuildHut = () => executeAction('buildHut');
  const handleBuildLodge = () => executeAction('buildLodge');
  const handleBuildBlacksmith = () => executeAction('buildBlacksmith');

  const canBuildHut = canExecuteAction('buildHut', state);
  const canBuildLodge = canExecuteAction('buildLodge', state);
  const canBuildBlacksmith = canExecuteAction('buildBlacksmith', state);

  return (
    <div className="space-y-6">
      {/* Build Section */}
      {(shouldShowAction('buildHut', state) || shouldShowAction('buildLodge', state) || shouldShowAction('buildBlacksmith', state)) && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">Build</h2>
          <div className="flex flex-wrap gap-2">
            {shouldShowAction('buildHut', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <CooldownButton
                    onClick={handleBuildHut}
                    cooldownMs={gameActions.buildHut.cooldown * 1000}
                    data-testid="button-build-wooden-hut"
                    disabled={!canBuildHut}
                    size="sm"
                  >
                    Wooden Hut
                  </CooldownButton>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Wooden Hut</div>
                    <div className="text-muted-foreground">Cost: {getCostText('buildHut', state).replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {shouldShowAction('buildLodge', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <CooldownButton
                    onClick={handleBuildLodge}
                    cooldownMs={gameActions.buildLodge.cooldown * 1000}
                    data-testid="button-build-lodge"
                    disabled={!canBuildLodge}
                    size="sm"
                  >
                    Lodge
                  </CooldownButton>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Lodge</div>
                    <div className="text-muted-foreground">Cost: {getCostText('buildLodge', state).replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            {shouldShowAction('buildBlacksmith', state) && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <CooldownButton
                    onClick={handleBuildBlacksmith}
                    cooldownMs={gameActions.buildBlacksmith.cooldown * 1000}
                    data-testid="button-build-blacksmith"
                    disabled={!canBuildBlacksmith}
                    size="sm"
                  >
                    Blacksmith
                  </CooldownButton>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Blacksmith</div>
                    <div className="text-muted-foreground">Cost: {getCostText('buildBlacksmith', state).replace(/[()]/g, '')}</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        </div>
      )}

      {/* Rule Section */}
      {story.seen?.hasVillagers && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border pb-2">Rule</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Gatherer ({getPopulationProductionText('gatherer')})</span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => unassignVillager('gatherer')}
                  disabled={villagers.gatherer === 0}
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  -
                </Button>
                <span className="font-mono text-sm w-8 text-center">{villagers.gatherer}</span>
                <Button
                  onClick={() => assignVillager('gatherer')}
                  disabled={villagers.free === 0}
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  +
                </Button>
              </div>
            </div>

            {buildings.lodge > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Hunter ({getPopulationProductionText('hunter')})</span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => unassignVillager('hunter')}
                    disabled={villagers.hunter === 0}
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    -
                  </Button>
                  <span className="font-mono text-sm w-8 text-center">{villagers.hunter}</span>
                  <Button
                    onClick={() => assignVillager('hunter')}
                    disabled={villagers.free === 0}
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}