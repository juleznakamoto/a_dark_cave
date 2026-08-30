import type { GameState } from "@shared/schema";
import { useGameStoreWithoutTickClock } from "@/game/useGameStoreWithoutTickClock";
import {
  canExecuteAction,
  getActionCostBreakdown,
  getBastionRepairTooltipRows,
  getResourcesFromActionCost,
} from "@/game/rules";
import { getActionDurationLine } from "@/game/rules/tooltips";
import {
  isDemoEndBastionHealRevealed,
  isDemoEndBastionRepairRevealed,
} from "@/game/demoEndCatalog";
import AttackWavesChart from "./AttackWavesChart";
import CooldownButton, { gameActionButtonGridClassName } from "@/components/CooldownButton";
import { RedactedLockedHint } from "@/components/game/RedactedHint";
import { useDemoEndCatalogActive } from "@/hooks/useSteamEditionActive";
import { useTranslation } from "react-i18next";
import { getEffectName } from "@/i18n/resolveGameText";
import {
  getPalisadesTierLabel,
  getWatchtowerTierLabel,
} from "@/i18n/fortificationLabels";

export default function BastionPanel() {
  const { t } = useTranslation("ui");
  const catalogActive = useDemoEndCatalogActive();
  const store = useGameStoreWithoutTickClock();
  const { buildings, setHighlightedResources, executeAction } = store;
  const state = store as unknown as GameState;

  const showHealKnight = isDemoEndBastionHealRevealed(
    state,
    "healRestlessKnight",
  );
  const showHealWizard = isDemoEndBastionHealRevealed(state, "healElderWizard");
  const anyHealVisible = showHealKnight || showHealWizard;
  const showHealSection = anyHealVisible || catalogActive;
  const redactHealHeader = catalogActive && !anyHealVisible;

  const showRepairBastion = isDemoEndBastionRepairRevealed(
    state,
    "repairBastion",
  );
  const showRepairWatchtower = isDemoEndBastionRepairRevealed(
    state,
    "repairWatchtower",
  );
  const showRepairPalisades = isDemoEndBastionRepairRevealed(
    state,
    "repairPalisades",
  );
  const anyRepairVisible =
    showRepairBastion || showRepairWatchtower || showRepairPalisades;
  const showRepairSection = anyRepairVisible || catalogActive;
  const redactRepairHeader = catalogActive && !anyRepairVisible;

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
        {getActionDurationLine(repairActionId, state)}
      </div>
    );
  };

  return (
    <div className="w-full space-y-4 pt-2 md:pt-0 mt-0 md:mt-2 mb-2 pl-2 pr-2">
      <AttackWavesChart />

      {showHealSection && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-foreground">
            {redactHealHeader ? (
              <RedactedLockedHint
                label={t("bastion.heal")}
                tooltipId="bastion-heal-header-redacted"
              />
            ) : (
              t("bastion.heal")
            )}
          </h3>
          <div className={gameActionButtonGridClassName()}>
            {showHealKnight ? (
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
                className=""
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
                    {getActionDurationLine("healRestlessKnight", state)}
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
            ) : (
              catalogActive && (
                <RedactedLockedHint
                  label={getEffectName(
                    "fellowship",
                    "restless_knight",
                    "Restless Knight",
                  )}
                  tooltipId="button-heal-restless-knight-redacted"
                />
              )
            )}

            {showHealWizard ? (
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
                className=""
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
                    {getActionDurationLine("healElderWizard", state)}
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
            ) : (
              catalogActive && (
                <RedactedLockedHint
                  label={getEffectName(
                    "fellowship",
                    "elder_wizard",
                    "Elder Wizard",
                  )}
                  tooltipId="button-heal-elder-wizard-redacted"
                />
              )
            )}
          </div>
        </div>
      )}

      {showRepairSection && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-foreground">
            {redactRepairHeader ? (
              <RedactedLockedHint
                label={t("bastion.repair")}
                tooltipId="bastion-repair-header-redacted"
              />
            ) : (
              t("bastion.repair")
            )}
          </h3>
          <div className={gameActionButtonGridClassName()}>
            {showRepairBastion ? (
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
                className=""
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
            ) : (
              catalogActive && (
                <RedactedLockedHint
                  label={t("fortifications.bastion")}
                  tooltipId="button-repair-bastion-redacted"
                />
              )
            )}

            {showRepairWatchtower ? (
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
                className=""
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
            ) : (
              catalogActive && (
                <RedactedLockedHint
                  label={getWatchtowerTierLabel(0)}
                  tooltipId="button-repair-watchtower-redacted"
                />
              )
            )}

            {showRepairPalisades ? (
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
                className=""
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
            ) : (
              catalogActive && (
                <RedactedLockedHint
                  label={getPalisadesTierLabel(0)}
                  tooltipId="button-repair-palisades-redacted"
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
