import { useGameStore } from "@/game/state";
import { gameActions } from "@/game/rules";
import { getTotalBuildingCostReduction } from "@/game/rules/effectsCalculation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";
import AttackWavesChart from "./AttackWavesChart";

// Helper to get building label based on level
const getBuildingLabel = (
  buildingType: "watchtower" | "palisades",
  level: number,
): string => {
  if (buildingType === "watchtower") {
    const labels = [
      "Watchtower",
      "Guard Tower",
      "Fortified Tower",
      "Cannon Tower",
    ];
    return labels[level - 1] || "Watchtower";
  } else if (buildingType === "palisades") {
    const labels = [
      "Wooden Palisades",
      "Fortified Palisades",
      "Stone Wall",
      "Reinforced Wall",
    ];
    return labels[level - 1] || "Wooden Palisades";
  }
  return "";
};

export default function BastionPanel() {
  const { buildings, story, resources, attackWaveTimers } = useGameStore();
  const state = useGameStore.getState();
  const mobileTooltip = useMobileTooltip();

  // Helper to format time remaining
  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Determine which wave is active
  const getActiveWave = () => {
    if (!state.flags.portalBlasted || !state.story.seen.hasBastion) return null;
    if (!state.story.seen.firstWaveVictory && attackWaveTimers.firstWave > 0) {
      return { name: 'First Wave', timer: attackWaveTimers.firstWave, id: 'firstWave' };
    }
    if (state.story.seen.firstWaveVictory && !state.story.seen.secondWaveVictory && attackWaveTimers.secondWave > 0) {
      return { name: 'Second Wave', timer: attackWaveTimers.secondWave, id: 'secondWave' };
    }
    if (state.story.seen.secondWaveVictory && !state.story.seen.thirdWaveVictory && attackWaveTimers.thirdWave > 0) {
      return { name: 'Third Wave', timer: attackWaveTimers.thirdWave, id: 'thirdWave' };
    }
    if (state.story.seen.thirdWaveVictory && !state.story.seen.fourthWaveVictory && attackWaveTimers.fourthWave > 0) {
      return { name: 'Fourth Wave', timer: attackWaveTimers.fourthWave, id: 'fourthWave' };
    }
    if (state.story.seen.fourthWaveVictory && !state.story.seen.fifthWaveVictory && attackWaveTimers.fifthWave > 0) {
      return { name: 'Fifth Wave', timer: attackWaveTimers.fifthWave, id: 'fifthWave' };
    }
    return null;
  };

  const activeWave = getActiveWave();

  const bastionDamaged = story?.seen?.bastionDamaged || false;
  const watchtowerDamaged = story?.seen?.watchtowerDamaged || false;
  const palisadesDamaged = story?.seen?.palisadesDamaged || false;

  const hasDamagedBuildings =
    bastionDamaged || watchtowerDamaged || palisadesDamaged;

  // Helper to calculate 50% repair cost from action cost
  const getRepairCost = (actionId: string, level: number = 1) => {
    const action = gameActions[actionId];
    const actionCost = action?.cost?.[level];
    if (!actionCost) return {};

    const buildingCostReduction = getTotalBuildingCostReduction(state);

    const repairCost: Record<string, number> = {};
    for (const [path, cost] of Object.entries(actionCost)) {
      if (path.startsWith("resources.")) {
        const resource = path.split(".")[1];
        // Apply building cost reduction to repair cost
        const reducedCost = Math.floor(
          cost * (0.25 + state.CM * 0.05) * (1 - buildingCostReduction),
        );
        repairCost[resource] = reducedCost;
      }
    }
    return repairCost;
  };

  const canAffordRepair = (repairCost: Record<string, number>) => {
    return Object.entries(repairCost).every(([resource, cost]) => {
      return resources[resource as keyof typeof resources] >= cost;
    });
  };

  // Helper to format repair cost for tooltip
  const getRepairCostText = (repairCost: Record<string, number>) => {
    return Object.entries(repairCost).map(([resource, cost]) => {
      const resourceName = resource
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      const currentAmount = resources[resource as keyof typeof resources] || 0;
      const satisfied = currentAmount >= cost;
      return {
        text: `-${cost} ${resourceName}`,
        satisfied,
      };
    });
  };

  const deductRepairCost = (repairCost: Record<string, number>) => {
    const newResources = { ...resources };
    for (const [resource, cost] of Object.entries(repairCost)) {
      newResources[resource as keyof typeof newResources] -= cost;
    }
    return newResources;
  };

  const repairBastion = () => {
    const repairCost = getRepairCost("buildBastion", 1);
    if (canAffordRepair(repairCost)) {
      useGameStore.setState((state) => ({
        resources: deductRepairCost(repairCost),
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            bastionDamaged: false,
          },
        },
      }));
      useGameStore.getState().updateBastionStats();
    }
  };

  const repairWatchtower = () => {
    const level = buildings.watchtower || 0;
    const repairCost = getRepairCost("buildWatchtower", level);

    if (canAffordRepair(repairCost)) {
      useGameStore.setState((state) => ({
        resources: deductRepairCost(repairCost),
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            watchtowerDamaged: false,
          },
        },
      }));
      useGameStore.getState().updateBastionStats();
    }
  };

  const repairPalisades = () => {
    const level = buildings.palisades || 0;
    const repairCost = getRepairCost("buildPalisades", level);

    if (canAffordRepair(repairCost)) {
      useGameStore.setState((state) => ({
        resources: deductRepairCost(repairCost),
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            palisadesDamaged: false,
          },
        },
      }));
      useGameStore.getState().updateBastionStats();
    }
  };

  return (
    <div className="space-y-4 mt-3 pb-4 pr-4 w-64">
      {/* Attack Waves Chart */}
      <AttackWavesChart />

      {/* Attack Wave Timer */}
      {activeWave && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">Incoming Attack</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{activeWave.name}</span>
            <span className="text-xs font-medium text-destructive">
              {formatTime(activeWave.timer)}
            </span>
          </div>
          <Button
            onClick={() => useGameStore.getState().provokeAttackWave(activeWave.id)}
            disabled={activeWave.timer <= 30000}
            variant="outline"
            size="xs"
            className="w-full hover:bg-transparent hover:text-foreground"
            button_id={`provoke-${activeWave.id}`}
          >
            Provoke
          </Button>
        </div>
      )}

      {/* Repair Section - only show if there are damaged buildings */}
      {hasDamagedBuildings && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">Repair</h3>
          <div className="flex flex-wrap gap-2">
            {bastionDamaged && buildings.bastion > 0 && (
              <TooltipProvider key="bastion">
                <Tooltip open={mobileTooltip.isTooltipOpen("repair-bastion")}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={(e) =>
                        mobileTooltip.handleTooltipClick("repair-bastion", e)
                      }
                    >
                      <Button
                        onClick={repairBastion}
                        disabled={
                          !canAffordRepair(getRepairCost("buildBastion", 1))
                        }
                        variant="outline"
                        size="xs"
                        className="hover:bg-transparent hover:text-foreground"
                        button_id="repair-bastion"
                      >
                        Bastion
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs whitespace-nowrap">
                      {getRepairCostText(getRepairCost("buildBastion", 1)).map(
                        (cost, index) => (
                          <div
                            key={index}
                            className={
                              cost.satisfied ? "" : "text-muted-foreground"
                            }
                          >
                            {cost.text}
                          </div>
                        ),
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {watchtowerDamaged && buildings.watchtower > 0 && (
              <TooltipProvider key="watchtower">
                <Tooltip
                  open={mobileTooltip.isTooltipOpen("repair-watchtower")}
                >
                  <TooltipTrigger asChild>
                    <div
                      onClick={(e) =>
                        mobileTooltip.handleTooltipClick("repair-watchtower", e)
                      }
                    >
                      <Button
                        onClick={repairWatchtower}
                        disabled={
                          !canAffordRepair(
                            getRepairCost(
                              "buildWatchtower",
                              buildings.watchtower,
                            ),
                          )
                        }
                        variant="outline"
                        size="xs"
                        className="hover:bg-transparent hover:text-foreground"
                        button_id="repair-watchtower"
                      >
                        {getBuildingLabel(
                          "watchtower",
                          buildings.watchtower || 0,
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs whitespace-nowrap">
                      {getRepairCostText(
                        getRepairCost("buildWatchtower", buildings.watchtower),
                      ).map((cost, index) => (
                        <div
                          key={index}
                          className={
                            cost.satisfied ? "" : "text-muted-foreground"
                          }
                        >
                          {cost.text}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {palisadesDamaged && buildings.palisades > 0 && (
              <TooltipProvider key="palisades">
                <Tooltip open={mobileTooltip.isTooltipOpen("repair-palisades")}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={(e) =>
                        mobileTooltip.handleTooltipClick("repair-palisades", e)
                      }
                    >
                      <Button
                        onClick={repairPalisades}
                        disabled={
                          !canAffordRepair(
                            getRepairCost(
                              "buildPalisades",
                              buildings.palisades,
                            ),
                          )
                        }
                        variant="outline"
                        size="xs"
                        className="hover:bg-transparent hover:text-foreground"
                        button_id="repair-palisades"
                      >
                        {getBuildingLabel(
                          "palisades",
                          buildings.palisades || 0,
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs whitespace-nowrap">
                      {getRepairCostText(
                        getRepairCost("buildPalisades", buildings.palisades),
                      ).map((cost, index) => (
                        <div
                          key={index}
                          className={
                            cost.satisfied ? "" : "text-muted-foreground"
                          }
                        >
                          {cost.text}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}
    </div>
  );
}