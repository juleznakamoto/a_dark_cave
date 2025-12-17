import {
  weaponEffects,
  toolEffects,
  clothingEffects,
  bookEffects,
  fellowshipEffects,
} from "./effects";
import { villageBuildActions } from "./villageBuildActions";
import { calculateBastionStats } from "../bastionStats";
import { capitalizeWords } from "@/lib/utils";
import { useGameStore } from "../state";
import type { GameState } from "@shared/schema";

export function renderItemTooltip(
  itemId: string,
  itemType: "weapon" | "tool" | "blessing" | "book" | "building" | "fellowship",
  customTooltip?: React.ReactNode,
) {
  // For buildings, generate the tooltip from villageBuildActions
  if (itemType === "building") {
    const gameState = useGameStore.getState();
    const buildings = gameState.buildings;
    const story = gameState.story;
    
    // Get the action definition
    const actionId = `build${itemId.charAt(0).toUpperCase() + itemId.slice(1)}`;
    const buildAction = villageBuildActions[actionId];
    
    if (!buildAction) return null;

    // Check if this building is damaged
    const isDamaged =
      (itemId === "bastion" && story?.seen?.bastionDamaged) ||
      (itemId === "watchtower" && story?.seen?.watchtowerDamaged) ||
      (itemId === "palisades" && story?.seen?.palisadesDamaged);

    const tooltipParts: React.ReactNode[] = [];

    // Add description if available
    if (buildAction.description) {
      tooltipParts.push(
        <div key="description" className="text-gray-400 mb-1">
          {buildAction.description}
        </div>
      );
    }

    // Check if manual tooltipEffects exist
    const tooltipEffects = buildAction.tooltipEffects;
    const effectsArray =
      typeof tooltipEffects === "function"
        ? tooltipEffects(gameState)
        : tooltipEffects;
    const hasManualTooltip = effectsArray && effectsArray.length > 0;

    if (hasManualTooltip) {
      // Use manual tooltipEffects
      tooltipParts.push(
        <div key="effects" className="mt-1">
          {effectsArray.map((effect, idx) => (
            <div key={idx}>{effect}</div>
          ))}
        </div>
      );
    } else {
      // Auto-generate effects from statsEffects and productionEffects
      const effectsList: string[] = [];

      if (buildAction.statsEffects) {
        Object.entries(buildAction.statsEffects).forEach(
          ([stat, statValue]) => {
            // Apply 50% reduction and round down if damaged
            let finalValue = isDamaged
              ? Math.floor(statValue * 0.5)
              : statValue;

            effectsList.push(
              `${finalValue > 0 ? "+" : ""}${finalValue} ${capitalizeWords(stat)}`,
            );
          }
        );
      }

      // Special handling for production effects
      if (buildAction.productionEffects) {
        Object.entries(buildAction.productionEffects).forEach(
          ([jobType, production]) => {
            Object.entries(production).forEach(([resource, amount]) => {
              effectsList.push(
                `+${amount} ${capitalizeWords(resource)} (${capitalizeWords(jobType)})`,
              );
            });
          }
        );
      }

      // Add effects section if there are any auto-generated effects
      if (effectsList.length > 0) {
        tooltipParts.push(
          <div key="effects" className="mt-1">
            {effectsList.map((effect, idx) => (
              <div key={idx}>{effect}</div>
            ))}
          </div>
        );
      }
    }

    // Combine tooltip parts
    if (tooltipParts.length > 0) {
      return (
        <div className="text-xs">
          <div className="font-bold">{buildAction.label}</div>
          {tooltipParts}
        </div>
      );
    }

    return null;
  }

  const effect =
    itemType === "weapon"
      ? weaponEffects[itemId]
      : itemType === "tool"
        ? toolEffects[itemId]
        : itemType === "book"
          ? bookEffects[itemId]
          : itemType === "fellowship"
            ? fellowshipEffects[itemId]
            : clothingEffects[itemId];

  if (!effect) return null;

  // For fellowship items, return simple name and description
  if (itemType === "fellowship") {
    return (
      <div className="text-xs">
        {effect.name && <div className="font-bold">{effect.name}</div>}
        {effect.description && (
          <div className="text-gray-400 mb-1">{effect.description}</div>
        )}
      </div>
    );
  }

  // Get cruel mode state
  const cruelMode = useGameStore.getState().cruelMode;

  // Calculate madness value with cruel mode bonus
  let madnessValue = effect.bonuses?.generalBonuses?.madness;
  if (madnessValue && cruelMode && madnessValue >= 4) {
    madnessValue += 1;
  }

  return (
    <div className="text-xs">
      {effect.name && <div className="font-bold">{effect.name}</div>}
      {effect.description && (
        <div className="text-gray-400 mb-1">{effect.description}</div>
      )}
      {effect.bonuses?.generalBonuses && (
        <div className="mt-1 space-y-0.5">
          {effect.bonuses.generalBonuses.luck && (
            <div>Luck: +{effect.bonuses.generalBonuses.luck}</div>
          )}
          {effect.bonuses.generalBonuses.strength && (
            <div>Strength: +{effect.bonuses.generalBonuses.strength}</div>
          )}
          {effect.bonuses.generalBonuses.knowledge && (
            <div>Knowledge: +{effect.bonuses.generalBonuses.knowledge}</div>
          )}
          {madnessValue && (
            <div>Madness:
              {madnessValue > 0 ? " +" : " "}
              {madnessValue}
            </div>
          )}
          {effect.bonuses.generalBonuses.craftingCostReduction && (
            <div>
              Craft Discount: -
              {Math.floor(
                effect.bonuses.generalBonuses.craftingCostReduction * 100,
              )}
              %
            </div>
          )}
          {effect.bonuses.generalBonuses.buildingCostReduction && (
            <div>
              Build Discount: -
              {Math.floor(
                effect.bonuses.generalBonuses.buildingCostReduction * 100,
              )}
              %
            </div>
          )}
          {effect.bonuses.generalBonuses.eventDeathReduction && (
            <div>
              Villager Deaths in Fights: -
              {Math.floor(
                effect.bonuses.generalBonuses.eventDeathReduction * 100,
              )}
              %
            </div>
          )}
          {effect.bonuses.generalBonuses.caveExploreMultiplier &&
            effect.bonuses.generalBonuses.caveExploreMultiplier !== 1 && (
              <div>
                Cave Explore: +
                {Math.round(
                  (effect.bonuses.generalBonuses.caveExploreMultiplier - 1) *
                    100,
                )}
                % Bonus
              </div>
            )}
          {(effect.bonuses.generalBonuses.MAX_EMBER_BOMBS ||
            effect.bonuses.generalBonuses.MAX_CINDERFLAME_BOMBS ||
            effect.bonuses.generalBonuses.MAX_VOID_BOMBS) && (
            <div>+1 Capacity for all bombs</div>
          )}
        </div>
      )}
      {effect.bonuses?.actionBonuses &&
        Object.entries(effect.bonuses.actionBonuses).map(
          ([actionId, bonus]) => (
            <div key={actionId}>
              {bonus.resourceMultiplier && bonus.resourceMultiplier !== 1 && (
                <div>
                  {capitalizeWords(actionId)}: +
                  {Math.round((bonus.resourceMultiplier - 1) * 100)}% Bonus
                </div>
              )}
              {bonus.resourceBonus &&
                Object.entries(bonus.resourceBonus).map(
                  ([resource, amount]) => (
                    <div key={resource}>
                      {capitalizeWords(actionId)}: +{amount}{" "}
                      {capitalizeWords(resource)}
                    </div>
                  ),
                )}
              {bonus.cooldownReduction && bonus.cooldownReduction !== 0 && (
                <div>
                  {capitalizeWords(actionId)}: -{bonus.cooldownReduction}s
                  Cooldown
                </div>
              )}
            </div>
          ),
        )}
    </div>
  );
}