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
import { useMobileButtonTooltip } from "@/hooks/useMobileTooltip";
import { Progress } from "@/components/ui/progress";
import AttackWavesChart from "./AttackWavesChart";

// Crushing Strike upgrade configurations
const CRUSHING_STRIKE_UPGRADES = [
  { level: 0, damage: 10, stunRounds: 1, cost: 0, currency: null },
  { level: 1, damage: 20, stunRounds: 1, cost: 250, currency: "gold" },
  { level: 2, damage: 30, stunRounds: 1, cost: 500, currency: "gold" },
  { level: 3, damage: 40, stunRounds: 2, cost: 1000, currency: "gold" },
  { level: 4, damage: 50, stunRounds: 2, cost: 1500, currency: "gold" },
  { level: 5, damage: 50, stunRounds: 3, cost: 2500, currency: "gold" },
];

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
  const { buildings, story, resources, combatSkills, fellowship } =
    useGameStore();
  const state = useGameStore.getState();
  const mobileTooltip = useMobileTooltip();
  const mobileButtonTooltip = useMobileButtonTooltip();

  const HAS_RESTLESS_KNIGHT = fellowship?.restless_knight === true;

  const bastionDamaged = story?.seen?.bastionDamaged || false;
  const watchtowerDamaged = story?.seen?.watchtowerDamaged || false;
  const palisadesDamaged = story?.seen?.palisadesDamaged || false;

  const hasDamagedBuildings =
    bastionDamaged || watchtowerDamaged || palisadesDamaged;

  const handleCrushingStrikeUpgrade = () => {
    useGameStore.setState((state) => {
      const currentLevel = state.combatSkills.crushingStrikeLevel;
      if (currentLevel >= 5) return state;

      const nextUpgrade = CRUSHING_STRIKE_UPGRADES[currentLevel + 1];
      const currency = "gold" as const;

      if (state.resources[currency] < nextUpgrade.cost) return state;

      return {
        ...state,
        combatSkills: {
          ...state.combatSkills,
          crushingStrikeLevel: currentLevel + 1,
        },
        resources: {
          ...state.resources,
          [currency]: state.resources[currency] - nextUpgrade.cost,
        },
      };
    });
  };

  const currentLevel = combatSkills.crushingStrikeLevel;
  const currentCrushingStrike = CRUSHING_STRIKE_UPGRADES[currentLevel];
  const nextCrushingStrike = CRUSHING_STRIKE_UPGRADES[currentLevel + 1];
  const canUpgradeCrushingStrike =
    currentLevel < 5 && nextCrushingStrike && resources.gold >= nextCrushingStrike.cost;

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
    <div className="space-y-4 mt-2 pr-4 w-64">
      {/* Attack Waves Chart */}
      <AttackWavesChart />

      {/* Combat Skills Section - only show if restless knight is unlocked */}
      {HAS_RESTLESS_KNIGHT && (
        <div className="w-64 space-y-3 pt-2">
          <h3 className="text-xs font-bold text-foreground">Combat Skills</h3>

          {/* Crushing Strike Upgrade */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="pb-1 text-xs font-medium text-foreground">
                Crushing Strike
              </span>
              {(crushingStrikeLevel || 0) < 5 ? (
                <TooltipProvider>
                  <Tooltip
                    open={mobileButtonTooltip.isTooltipOpen(
                      "upgrade-crushing-strike-button",
                    )}
                  >
                    <TooltipTrigger asChild>
                      <div
                        className="inline-block"
                        onClick={
                          mobileButtonTooltip.isMobile
                            ? (e) => {
                                mobileButtonTooltip.handleWrapperClick(
                                  "upgrade-crushing-strike-button",
                                  !canUpgradeCrushingStrike,
                                  false,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onTouchStart={
                          mobileButtonTooltip.isMobile
                            ? (e) => {
                                mobileButtonTooltip.handleTouchStart(
                                  "upgrade-crushing-strike-button",
                                  !canUpgradeCrushingStrike,
                                  false,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onTouchEnd={
                          mobileButtonTooltip.isMobile
                            ? (e) => {
                                mobileButtonTooltip.handleTouchEnd(
                                  "upgrade-crushing-strike-button",
                                  !canUpgradeCrushingStrike,
                                  handleCrushingStrikeUpgrade,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onMouseDown={
                          mobileButtonTooltip.isMobile
                            ? (e) => {
                                mobileButtonTooltip.handleMouseDown(
                                  "upgrade-crushing-strike-button",
                                  !canUpgradeCrushingStrike,
                                  false,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onMouseUp={
                          mobileButtonTooltip.isMobile
                            ? (e) => {
                                mobileButtonTooltip.handleMouseUp(
                                  "upgrade-crushing-strike-button",
                                  !canUpgradeCrushingStrike,
                                  handleCrushingStrikeUpgrade,
                                  e,
                                );
                              }
                            : undefined
                        }
                      >
                        <Button
                          onClick={
                            mobileButtonTooltip.isMobile &&
                            mobileButtonTooltip.isTooltipOpen(
                              "upgrade-crushing-strike-button",
                            )
                              ? (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                              : handleCrushingStrikeUpgrade
                          }
                          disabled={!canUpgradeCrushingStrike}
                          size="xs"
                          variant="outline"
                          className="hover:bg-transparent hover:text-foreground"
                          button_id="upgrade-crushing-strike"
                        >
                          Improve
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs whitespace-nowrap">
                        {nextCrushingStrike.damage >
                          currentCrushingStrike.damage && (
                          <div>
                            +
                            {nextCrushingStrike.damage -
                              currentCrushingStrike.damage}{" "}
                            damage
                          </div>
                        )}
                        {nextCrushingStrike.stunRounds >
                          currentCrushingStrike.stunRounds && (
                          <div>
                            +
                            {nextCrushingStrike.stunRounds -
                              currentCrushingStrike.stunRounds}{" "}
                            stun round
                          </div>
                        )}
                        <div className="border-t border-border my-1" />
                        <div
                          className={
                            resources.gold >= nextCrushingStrike.cost
                              ? ""
                              : "text-muted-foreground"
                          }
                        >
                          -{nextCrushingStrike.cost} Gold
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>
            <Progress
              value={(currentLevel / 5) * 100}
              className="h-2"
              segments={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {currentCrushingStrike.damage} damage,{" "}
                {currentCrushingStrike.stunRounds} round
                {currentCrushingStrike.stunRounds > 1 ? "s" : ""} stun
              </span>
            </div>
          </div>
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