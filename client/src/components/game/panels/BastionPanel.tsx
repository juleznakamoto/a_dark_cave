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
  } else if (buildingType === "chitinPlating" as any) {
    return "Chitin Plating";
  }
  return "";
};

export default function BastionPanel() {
  const { buildings, story, resources, fellowship, setHighlightedResources } =
    useGameStore();
  const state = useGameStore.getState();
  const mobileTooltip = useMobileTooltip();

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
      // First, update the state with new damage flags and deducted resources
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
      
      // Then recalculate bastion stats after state has been updated
      setTimeout(() => {
        useGameStore.getState().updateBastionStats();
      }, 0);
    }
  };

  const repairWatchtower = () => {
    const level = buildings.watchtower || 0;
    const repairCost = getRepairCost("buildWatchtower", level);

    if (canAffordRepair(repairCost)) {
      // First, update the state with new damage flags and deducted resources
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
      
      // Then recalculate bastion stats after state has been updated
      setTimeout(() => {
        useGameStore.getState().updateBastionStats();
      }, 0);
    }
  };

  const repairPalisades = () => {
    const level = buildings.palisades || 0;
    const repairCost = getRepairCost("buildPalisades", level);

    if (canAffordRepair(repairCost)) {
      // First, update the state with new damage flags and deducted resources
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
      
      // Then recalculate bastion stats after state has been updated
      setTimeout(() => {
        useGameStore.getState().updateBastionStats();
      }, 0);
    }
  };

  const getResourcesFromActionCost = (actionId: string, state: any) => {
    const action = gameActions[actionId];
    const cost = action?.cost?.[1]; // Assuming level 1 cost for highlighting
    if (!cost) return [];

    const buildingCostReduction = getTotalBuildingCostReduction(state);

    const resources: string[] = [];
    for (const [path, amount] of Object.entries(cost)) {
      if (path.startsWith("resources.")) {
        const resource = path.split(".")[1];
        // Apply building cost reduction to highlight cost (as it would be paid)
        const effectiveCost = Math.floor(
          amount * (0.25 + state.CM * 0.05) * (1 - buildingCostReduction),
        );
        if (effectiveCost > 0) {
          resources.push(resource);
        }
      }
    }
    return resources;
  };

  return (
    <div className="w-80 space-y-4 mt-2 mb-2 pr-4 pl-[3px] ">
      {/* Attack Waves Chart */}
      <AttackWavesChart />

      {/* Heal Section - only show if there are wounded fellowship members */}
      {(story?.seen?.restlessKnightWounded || story?.seen?.elderWizardWounded) && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">Heal</h3>
          <div className="flex flex-wrap gap-2">
            {story?.seen?.restlessKnightWounded && fellowship?.restless_knight && (
              <TooltipProvider key="restless-knight">
                <Tooltip open={mobileTooltip.isTooltipOpen("heal-restless-knight")}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={(e) =>
                        mobileTooltip.handleTooltipClick("heal-restless-knight", e)
                      }
                      onMouseEnter={() => {
                        setHighlightedResources(['food']);
                      }}
                      onMouseLeave={() => {
                        setHighlightedResources([]);
                      }}
                    >
                      <Button
                        onClick={() => {
                          if (resources.food >= 1500) {
                            useGameStore.setState((state) => ({
                              resources: {
                                ...state.resources,
                                food: state.resources.food - 1500,
                              },
                              story: {
                                ...state.story,
                                seen: {
                                  ...state.story.seen,
                                  restlessKnightWounded: false,
                                },
                              },
                            }));
                          }
                        }}
                        disabled={resources.food < 1500}
                        variant="outline"
                        size="xs"
                        className="hover:bg-transparent hover:text-foreground"
                        button_id="heal-restless-knight"
                      >
                        Restless Knight
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs whitespace-nowrap">
                      <div className={resources.food >= 1500 ? "" : "text-muted-foreground"}>
                        -1500 Food
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {story?.seen?.elderWizardWounded && fellowship?.elder_wizard && (
              <TooltipProvider key="elder-wizard">
                <Tooltip open={mobileTooltip.isTooltipOpen("heal-elder-wizard")}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={(e) =>
                        mobileTooltip.handleTooltipClick("heal-elder-wizard", e)
                      }
                      onMouseEnter={() => {
                        setHighlightedResources(['food']);
                      }}
                      onMouseLeave={() => {
                        setHighlightedResources([]);
                      }}
                    >
                      <Button
                        onClick={() => {
                          if (resources.food >= 1500) {
                            useGameStore.setState((state) => ({
                              resources: {
                                ...state.resources,
                                food: state.resources.food - 1500,
                              },
                              story: {
                                ...state.story,
                                seen: {
                                  ...state.story.seen,
                                  elderWizardWounded: false,
                                },
                              },
                            }));
                          }
                        }}
                        disabled={resources.food < 1500}
                        variant="outline"
                        size="xs"
                        className="hover:bg-transparent hover:text-foreground"
                        button_id="heal-elder-wizard"
                      >
                        Elder Wizard
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs whitespace-nowrap">
                      <div className={resources.food >= 1500 ? "" : "text-muted-foreground"}>
                        -1500 Food
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}

      {/* Fortifications Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-foreground">Fortifications</h3>
        <div className="flex flex-wrap gap-2">
          {buildings.bastion > 0 && (
            <div className="flex items-center gap-2 p-1 border rounded text-xs">
              <span>Bastion</span>
            </div>
          )}
          {buildings.watchtower > 0 && (
            <div className="flex items-center gap-2 p-1 border rounded text-xs">
              <span>{getBuildingLabel("watchtower", buildings.watchtower)}</span>
            </div>
          )}
          {buildings.palisades > 0 && (
            <div className="flex items-center gap-2 p-1 border rounded text-xs">
              <span>{getBuildingLabel("palisades", buildings.palisades)}</span>
            </div>
          )}
          {buildings.fortifiedMoat > 0 && (
            <div className="flex items-center gap-2 p-1 border rounded text-xs">
              <span>Fortified Moat</span>
            </div>
          )}
          {buildings.chitinPlating > 0 && (
            <div className="flex items-center gap-2 p-1 border rounded text-xs">
              <span>Chitin Plating</span>
            </div>
          )}
        </div>
      </div>

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
                      onMouseEnter={() => {
                        const resources = Object.keys(getRepairCost("buildBastion", 1));
                        setHighlightedResources(resources);
                      }}
                      onMouseLeave={() => {
                        setHighlightedResources([]);
                      }}
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
                      onMouseEnter={() => {
                        const resources = Object.keys(getRepairCost("buildWatchtower", buildings.watchtower));
                        setHighlightedResources(resources);
                      }}
                      onMouseLeave={() => {
                        setHighlightedResources([]);
                      }}
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
                      onMouseEnter={() => {
                        const resources = Object.keys(getRepairCost("buildPalisades", buildings.palisades));
                        setHighlightedResources(resources);
                      }}
                      onMouseLeave={() => {
                        setHighlightedResources([]);
                      }}
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