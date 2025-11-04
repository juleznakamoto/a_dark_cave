
import { weaponEffects, toolEffects, clothingEffects } from "./effects";
import { capitalizeWords } from "@/lib/utils";

export function renderItemTooltip(
  itemId: string,
  itemType: "weapon" | "tool" | "blessing"
) {
  const effect =
    itemType === "weapon"
      ? weaponEffects[itemId]
      : itemType === "tool"
        ? toolEffects[itemId]
        : clothingEffects[itemId];

  if (!effect) return null;

  return (
    <div className="text-xs whitespace-pre-line">
      {effect.name && <div className="font-bold mb-1">{effect.name}</div>}
      {effect.description && (
        <div className="text-gray-400 mb-1 max-w-xs whitespace-normal text-wrap">
          {effect.description}
        </div>
      )}
      {effect.bonuses?.generalBonuses && (
        <div className="mt-1 space-y-0.5">
          {effect.bonuses.generalBonuses.luck && (
            <div>+{effect.bonuses.generalBonuses.luck} Luck</div>
          )}
          {effect.bonuses.generalBonuses.strength && (
            <div>+{effect.bonuses.generalBonuses.strength} Strength</div>
          )}
          {effect.bonuses.generalBonuses.gatheringSpeed && (
            <div>
              +
              {Math.round(
                (effect.bonuses.generalBonuses.gatheringSpeed - 1) * 100
              )}
              % Gathering Speed
            </div>
          )}
          {effect.bonuses.generalBonuses.craftingSpeed && (
            <div>
              +
              {Math.round(
                (effect.bonuses.generalBonuses.craftingSpeed - 1) * 100
              )}
              % Crafting Speed
            </div>
          )}
          {effect.bonuses.generalBonuses.explorationBonus && (
            <div>
              +{effect.bonuses.generalBonuses.explorationBonus} Exploration
              Bonus
            </div>
          )}
          {effect.bonuses.generalBonuses.knowledge && (
            <div>+{effect.bonuses.generalBonuses.knowledge} Knowledge</div>
          )}
          {effect.bonuses.generalBonuses.madness && (
            <div>
              {effect.bonuses.generalBonuses.madness > 0 ? "+" : ""}
              {effect.bonuses.generalBonuses.madness} Madness
            </div>
          )}
          {effect.bonuses.generalBonuses.madnessReduction && (
            <div>
              -{effect.bonuses.generalBonuses.madnessReduction} Madness
            </div>
          )}
          {effect.bonuses.generalBonuses.craftingCostReduction && (
            <div>
              {Math.floor(
                effect.bonuses.generalBonuses.craftingCostReduction * 100
              )}
              % Craft Discount
            </div>
          )}
          {effect.bonuses.generalBonuses.buildingCostReduction && (
            <div>
              {Math.floor(
                effect.bonuses.generalBonuses.buildingCostReduction * 100
              )}
              % Build Discount
            </div>
          )}
          {effect.bonuses.generalBonuses.caveExploreMultiplier &&
            effect.bonuses.generalBonuses.caveExploreMultiplier !== 1 && (
              <div>
                +
                {Math.round(
                  (effect.bonuses.generalBonuses.caveExploreMultiplier - 1) *
                    100
                )}
                % Cave Explore Bonus
              </div>
            )}
        </div>
      )}
      {effect.bonuses?.actionBonuses &&
        Object.entries(effect.bonuses.actionBonuses).map(
          ([actionId, bonus]) => (
            <div key={actionId}>
              {bonus.resourceMultiplier && bonus.resourceMultiplier !== 1 && (
                <div>
                  +{Math.round((bonus.resourceMultiplier - 1) * 100)}%{" "}
                  {capitalizeWords(actionId)} Bonus
                </div>
              )}
              {bonus.resourceBonus &&
                Object.entries(bonus.resourceBonus).map(
                  ([resource, amount]) => (
                    <div key={resource}>
                      {capitalizeWords(actionId)}: +{amount}{" "}
                      {capitalizeWords(resource)}
                    </div>
                  )
                )}
            </div>
          )
        )}
    </div>
  );
}
