import type { GameState } from "@shared/schema";
import { useGameStore } from "@/game/state";
import {
  canExecuteAction,
  getActionCostBreakdown,
  getResourcesFromActionCost,
} from "@/game/rules";
import AttackWavesChart from "./AttackWavesChart";
import CooldownButton from "@/components/CooldownButton";

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
  const { buildings, story, setHighlightedResources, executeAction } =
    useGameStore();
  const state = useGameStore.getState() as unknown as GameState;

  const bastionDamaged = story?.seen?.bastionDamaged || false;
  const watchtowerDamaged = story?.seen?.watchtowerDamaged || false;
  const palisadesDamaged = story?.seen?.palisadesDamaged || false;

  const hasDamagedBuildings =
    bastionDamaged || watchtowerDamaged || palisadesDamaged;

  return (
    <div className="w-full md:max-w-96 space-y-4 mt-2 mb-2 pl-[3px] pr-[3px]">
      {/* Attack Waves Chart */}
      <AttackWavesChart />

      {/* Heal Section - only show if there are wounded fellowship members */}
      {(story?.seen?.restlessKnightWounded || story?.seen?.elderWizardWounded) && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-foreground">Heal</h3>
          <div className="flex flex-wrap gap-2">
            {story?.seen?.restlessKnightWounded && state.fellowship?.restless_knight && (
              <CooldownButton
                key="restless-knight"
                actionId="healRestlessKnight"
                button_id="heal-restless-knight"
                onClick={() => executeAction("healRestlessKnight")}
                cooldownMs={0}
                data-testid="button-heal-restless-knight"
                disabled={!canExecuteAction("healRestlessKnight", state)}
                variant="outline"
                size="xs"
                className="hover:bg-background hover:text-foreground"
                tooltip={
                  <div className="text-xs whitespace-nowrap">
                    {getActionCostBreakdown("healRestlessKnight", state).map(
                      (row, index) => (
                        <div
                          key={index}
                          className={
                            row.satisfied ? "" : "text-muted-foreground"
                          }
                        >
                          {row.text}
                        </div>
                      ),
                    )}
                  </div>
                }
                onMouseEnter={() => {
                  setHighlightedResources(
                    getResourcesFromActionCost("healRestlessKnight", state),
                  );
                }}
                onMouseLeave={() => {
                  setHighlightedResources([]);
                }}
              >
                Restless Knight
              </CooldownButton>
            )}

            {story?.seen?.elderWizardWounded && state.fellowship?.elder_wizard && (
              <CooldownButton
                key="elder-wizard"
                actionId="healElderWizard"
                button_id="heal-elder-wizard"
                onClick={() => executeAction("healElderWizard")}
                cooldownMs={0}
                data-testid="button-heal-elder-wizard"
                disabled={!canExecuteAction("healElderWizard", state)}
                variant="outline"
                size="xs"
                className="hover:bg-background hover:text-foreground"
                tooltip={
                  <div className="text-xs whitespace-nowrap">
                    {getActionCostBreakdown("healElderWizard", state).map(
                      (row, index) => (
                        <div
                          key={index}
                          className={
                            row.satisfied ? "" : "text-muted-foreground"
                          }
                        >
                          {row.text}
                        </div>
                      ),
                    )}
                  </div>
                }
                onMouseEnter={() => {
                  setHighlightedResources(
                    getResourcesFromActionCost("healElderWizard", state),
                  );
                }}
                onMouseLeave={() => {
                  setHighlightedResources([]);
                }}
              >
                Elder Wizard
              </CooldownButton>
            )}
          </div>
        </div>
      )}

      {/* Repair Section - only show if there are damaged buildings */}
      {hasDamagedBuildings && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-foreground">Repair</h3>
          <div className="flex flex-wrap gap-2">
            {bastionDamaged && buildings.bastion > 0 && (
              <CooldownButton
                key="bastion"
                actionId="repairBastion"
                button_id="repair-bastion"
                onClick={() => executeAction("repairBastion")}
                cooldownMs={0}
                data-testid="button-repair-bastion"
                disabled={!canExecuteAction("repairBastion", state)}
                variant="outline"
                size="xs"
                className="hover:bg-background hover:text-foreground"
                tooltip={
                  <div className="text-xs whitespace-nowrap">
                    {getActionCostBreakdown("repairBastion", state).map(
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
                }
                onMouseEnter={() => {
                  setHighlightedResources(
                    getResourcesFromActionCost("repairBastion", state),
                  );
                }}
                onMouseLeave={() => {
                  setHighlightedResources([]);
                }}
              >
                Bastion
              </CooldownButton>
            )}

            {watchtowerDamaged && buildings.watchtower > 0 && (
              <CooldownButton
                key="watchtower"
                actionId="repairWatchtower"
                button_id="repair-watchtower"
                onClick={() => executeAction("repairWatchtower")}
                cooldownMs={0}
                data-testid="button-repair-watchtower"
                disabled={!canExecuteAction("repairWatchtower", state)}
                variant="outline"
                size="xs"
                className="hover:bg-background hover:text-foreground"
                tooltip={
                  <div className="text-xs whitespace-nowrap">
                    {getActionCostBreakdown("repairWatchtower", state).map(
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
                }
                onMouseEnter={() => {
                  setHighlightedResources(
                    getResourcesFromActionCost("repairWatchtower", state),
                  );
                }}
                onMouseLeave={() => {
                  setHighlightedResources([]);
                }}
              >
                {getBuildingLabel(
                  "watchtower",
                  buildings.watchtower || 0,
                )}
              </CooldownButton>
            )}

            {palisadesDamaged && buildings.palisades > 0 && (
              <CooldownButton
                key="palisades"
                actionId="repairPalisades"
                button_id="repair-palisades"
                onClick={() => executeAction("repairPalisades")}
                cooldownMs={0}
                data-testid="button-repair-palisades"
                disabled={!canExecuteAction("repairPalisades", state)}
                variant="outline"
                size="xs"
                className="hover:bg-background hover:text-foreground"
                tooltip={
                  <div className="text-xs whitespace-nowrap">
                    {getActionCostBreakdown("repairPalisades", state).map(
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
                }
                onMouseEnter={() => {
                  setHighlightedResources(
                    getResourcesFromActionCost("repairPalisades", state),
                  );
                }}
                onMouseLeave={() => {
                  setHighlightedResources([]);
                }}
              >
                {getBuildingLabel(
                  "palisades",
                  buildings.palisades || 0,
                )}
              </CooldownButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
