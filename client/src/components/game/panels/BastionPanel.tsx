import type { GameState } from "@shared/schema";
import { useGameStore } from "@/game/state";
import {
  canExecuteAction,
  getActionCostBreakdown,
  getBastionRepairTooltipRows,
  getResourcesFromActionCost,
} from "@/game/rules";
import AttackWavesChart from "./AttackWavesChart";
import CooldownButton from "@/components/CooldownButton";
import { useTranslation } from "react-i18next";
import { getEffectName } from "@/i18n/resolveGameText";
import {
  getPalisadesTierLabel,
  getWatchtowerTierLabel,
} from "@/i18n/fortificationLabels";

export default function BastionPanel() {
  const { t } = useTranslation("ui");
  const { buildings, story, setHighlightedResources, executeAction } =
    useGameStore();
  const state = useGameStore.getState() as unknown as GameState;

  const bastionDamaged = story?.seen?.bastionDamaged || false;
  const watchtowerDamaged = story?.seen?.watchtowerDamaged || false;
  const palisadesDamaged = story?.seen?.palisadesDamaged || false;

  const hasDamagedBuildings =
    bastionDamaged || watchtowerDamaged || palisadesDamaged;

  const renderRepairTooltip = (repairActionId: string) => {
    const rows = getBastionRepairTooltipRows(repairActionId, state);
    if (rows.length === 0) return undefined;
    return (
      <div className="text-xs whitespace-nowrap">
        {rows.map((cost, index) => (
          <div
            key={index}
            className={cost.satisfied ? "" : "text-muted-foreground"}
          >
            {cost.text}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full space-y-4 mt-2 mb-2 pr-2">
      <AttackWavesChart />

      {(story?.seen?.restlessKnightWounded || story?.seen?.elderWizardWounded) && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-foreground">
            {t("bastion.heal")}
          </h3>
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
                {getEffectName("fellowship", "restless_knight", "Restless Knight")}
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
                {getEffectName("fellowship", "elder_wizard", "Elder Wizard")}
              </CooldownButton>
            )}
          </div>
        </div>
      )}

      {hasDamagedBuildings && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-foreground">
            {t("bastion.repair")}
          </h3>
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
                tooltip={renderRepairTooltip("repairBastion")}
                onMouseEnter={() => {
                  setHighlightedResources(
                    getResourcesFromActionCost("repairBastion", state),
                  );
                }}
                onMouseLeave={() => {
                  setHighlightedResources([]);
                }}
              >
                {t("fortifications.bastion")}
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
                tooltip={renderRepairTooltip("repairWatchtower")}
                onMouseEnter={() => {
                  setHighlightedResources(
                    getResourcesFromActionCost("repairWatchtower", state),
                  );
                }}
                onMouseLeave={() => {
                  setHighlightedResources([]);
                }}
              >
                {getWatchtowerTierLabel(buildings.watchtower || 0)}
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
                tooltip={renderRepairTooltip("repairPalisades")}
                onMouseEnter={() => {
                  setHighlightedResources(
                    getResourcesFromActionCost("repairPalisades", state),
                  );
                }}
                onMouseLeave={() => {
                  setHighlightedResources([]);
                }}
              >
                {getPalisadesTierLabel(buildings.palisades || 0)}
              </CooldownButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
