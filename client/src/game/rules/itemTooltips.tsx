import {
  weaponEffects,
  toolEffects,
  clothingEffects,
  bookEffects,
} from "./effects";
import { capitalizeWords } from "@/lib/utils";
import { useGameStore } from "../state";

export function renderItemTooltip(
  itemId: string,
  itemType: "weapon" | "tool" | "blessing" | "book" | "building",
  customTooltip?: React.ReactNode,
) {
  // For buildings, render the effects in the standard format
  if (itemType === "building") {
    return (
      <div className="text-xs">
        {customTooltip}
      </div>
    );
  }

  const effect =
    itemType === "weapon"
      ? weaponEffects[itemId]
      : itemType === "tool"
        ? toolEffects[itemId]
        : itemType === "book"
          ? bookEffects[itemId]
          : clothingEffects[itemId];

  if (!effect) return null;

  // Get cruel mode state
  const cruelMode = useGameStore.getState().cruelMode;

  // Calculate madness value with cruel mode bonus
  let madnessValue = effect.bonuses?.generalBonuses?.madness;
  if (madnessValue && cruelMode && madnessValue >= 4) {
    madnessValue += 1;
  }

  return (
    <div className="text-xs">
      {effect.name && <div className="font-bold mb-1">{effect.name}</div>}
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