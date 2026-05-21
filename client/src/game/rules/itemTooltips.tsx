import {
  weaponEffects,
  toolEffects,
  clothingEffects,
  bookEffects,
  fellowshipEffects,
} from "./effects";
import { combatItemTooltips } from "./tooltips";
import {
  BOMB_RESOURCES,
  COMBAT_ITEM_RESOURCES,
  type CombatItemResourceKey,
  getMaxBombLimit,
  getMaxVeinfireElixirLimit,
} from "@/game/resourceLimits";
import { getBuildingHierarchyTooltipLevel } from "../buildingHierarchy";
import { villageBuildActions } from "./villageBuildActions";
import { capitalizeWords } from "@/lib/utils";
import {
  getActionDescription,
  getActionLabel,
  getEffectDescription,
  getEffectName,
} from "@/i18n/resolveGameText";
import {
  formatTooltipResourceName,
  formatTooltipStatName,
  getUiTooltip,
  resolveBuildingTooltipEffect,
} from "@/i18n/tooltipLabels";
import { useGameStore } from "../state";
import { CRUEL_MODE } from "../cruelMode";
import { getMapFragmentCount, MAP_FRAGMENT_TOTAL } from "../mapFragments";
import type { GameState } from "@shared/schema";

/** Moon phase for n fragments: 1→◔, 2→◑, 3→◕, 4→● (index = n − 1). */
const MAP_FRAGMENT_MOON_GLYPHS = ["◔", "◑", "◕", "●"] as const;

function mapFragmentMoonGlyphIndex(fragmentCount: number): number {
  if (fragmentCount <= 0) return 0;
  return Math.min(fragmentCount - 1, MAP_FRAGMENT_MOON_GLYPHS.length - 1);
}

/** Format unit probability (0–1) as a % label; keeps one decimal when needed so 2.5% does not round to 3%. */
function formatProbabilityPercent(probability: number): string {
  const pct = probability * 100;
  const roundedTenth = Math.round(pct * 10) / 10;
  return Math.abs(roundedTenth - Math.round(roundedTenth)) < 1e-6
    ? `${Math.round(roundedTenth)}`
    : roundedTenth.toFixed(1);
}

export function renderItemTooltip(
  itemId: string,
  itemType: "weapon" | "tool" | "blessing" | "book" | "building" | "fellowship",
  customTooltip?: React.ReactNode,
) {
  // For buildings, generate the tooltip from villageBuildActions
  if (itemType === "building") {
    const gameState = useGameStore.getState();
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
    const buildDescription = getActionDescription(
      actionId,
      buildAction.description,
    );
    if (buildDescription) {
      tooltipParts.push(
        <div key="description" className="text-gray-400 mb-0.5">
          {buildDescription}
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
            <div key={idx}>{resolveBuildingTooltipEffect(effect)}</div>
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
              getUiTooltip("statBonus", "{{sign}}{{value}} {{stat}}", {
                sign: finalValue > 0 ? "+" : "",
                value: finalValue,
                stat: formatTooltipStatName(stat),
              }),
            );
          }
        );
      }

      // Special handling for production effects
      if (buildAction.productionEffects) {
        // Resolve productionEffects (can be object or function)
        const productionEffects = typeof buildAction.productionEffects === 'function'
          ? buildAction.productionEffects(gameState)
          : buildAction.productionEffects;

        Object.entries(productionEffects).forEach(
          ([jobType, production]) => {
            Object.entries(production).forEach(([resource, amount]) => {
              effectsList.push(
                getUiTooltip(
                  "productionBonusLine",
                  "+{{amount}} {{resource}} ({{job}})",
                  {
                    amount,
                    resource: formatTooltipResourceName(resource),
                    job: capitalizeWords(jobType),
                  },
                ),
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

    // Side panel Buildings: always show title row (name + optional chain tier); body may be empty.
    const hierarchyLevel = getBuildingHierarchyTooltipLevel(itemId);
    return (
      <div className="text-xs">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <span>
            <span className="font-bold">
              {getActionLabel(actionId, buildAction.label)}
            </span>
            {isDamaged && (
              <span className="font-normal text-muted-foreground">
                {" "}
                {getUiTooltip("damaged", "(damaged)")}
              </span>
            )}
          </span>
          {hierarchyLevel != null && (
            <span className="font-normal text-gray-400">
              {getUiTooltip("level", "Level {{level}}", {
                level: hierarchyLevel,
              })}
            </span>
          )}
        </div>
        {tooltipParts}
      </div>
    );
  }

  // Side panel Combat Items (+ combat dialog): bombs, Veinfire Elixir — merged combat line + weapon effect name/description
  if (
    itemType === "weapon" &&
    COMBAT_ITEM_RESOURCES.includes(itemId as CombatItemResourceKey)
  ) {
    const tooltipConfig =
      combatItemTooltips[itemId as keyof typeof combatItemTooltips];
    const effect = weaponEffects[itemId];
    if (tooltipConfig?.getContent) {
      const gameState = useGameStore.getState();
      const content = tooltipConfig.getContent(gameState as GameState);
      const maxHeld = BOMB_RESOURCES.includes(
        itemId as (typeof BOMB_RESOURCES)[number],
      )
        ? getMaxBombLimit(gameState)
        : getMaxVeinfireElixirLimit();
      return (
        <div className="text-xs">
          <div className="font-bold">
            {getEffectName("weapons", itemId, effect?.name ?? itemId)}
          </div>
          {effect?.description && (
            <div className="text-gray-400 mb-1">
              {getEffectDescription("weapons", itemId, effect.description)}
            </div>
          )}
          <pre className="whitespace-pre-wrap font-sans text-xs text-foreground">
            {content}
          </pre>
          <div className="text-gray-400 mt-1">
            {getUiTooltip("maxHeld", "Max: {{value}}", { value: maxHeld })}
          </div>
        </div>
      );
    }
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

  const effectCategory =
    itemType === "weapon"
      ? "weapons"
      : itemType === "tool"
        ? "tools"
        : itemType === "book"
          ? "books"
          : itemType === "fellowship"
            ? "fellowship"
            : "clothing";

  // For fellowship items, return simple name and description
  if (itemType === "fellowship") {
    return (
      <div className="text-xs">
        {effect.name && (
          <div className="font-bold">
            {getEffectName(effectCategory, itemId, effect.name)}
          </div>
        )}
        {effect.description && (
          <div className="text-gray-400">
            {getEffectDescription(effectCategory, itemId, effect.description)}
          </div>
        )}
      </div>
    );
  }

  // Get cruel mode state
  const cruelMode = useGameStore.getState().cruelMode;

  // Calculate madness value with cruel mode bonus
  let madnessValue = effect.bonuses?.generalBonuses?.madness;
  if (
    madnessValue &&
    cruelMode &&
    madnessValue >= CRUEL_MODE.itemMadness.highMadnessThreshold
  ) {
    madnessValue += CRUEL_MODE.itemMadness.highMadnessExtra;
  }

  const mapFragmentCount =
    itemId === "map_fragment"
      ? getMapFragmentCount(useGameStore.getState() as unknown as GameState)
      : 0;

  const mapFragmentMoonGlyph =
    itemId === "map_fragment"
      ? MAP_FRAGMENT_MOON_GLYPHS[mapFragmentMoonGlyphIndex(mapFragmentCount)]
      : null;

  return (
    <div className="text-xs">
      {effect.name &&
        (itemId === "map_fragment" ? (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="font-bold">{effect.name}</span>
            <span
              className={`font-noto-symbols-2 font-normal tabular-nums tracking-wide select-none ${mapFragmentCount > 0 ? "text-foreground" : "text-gray-500"
                }`}
              aria-label={`${mapFragmentCount} of ${MAP_FRAGMENT_TOTAL} map fragments`}
            >
              {mapFragmentMoonGlyph}
            </span>
          </div>
        ) : (
          <div className="font-bold">
            {getEffectName(effectCategory, itemId, effect.name)}
          </div>
        ))}
      {effect.description && (
        <div className="text-gray-400 mb-1">
          {getEffectDescription(effectCategory, itemId, effect.description)}
        </div>
      )}
      {effect.bonuses?.generalBonuses && (
        <div>
          {effect.bonuses.generalBonuses.actionBonusChance != null &&
            effect.bonuses.generalBonuses.actionBonusChance > 0 && (
              <div>
                {getUiTooltip(
                  "doubleActionChance",
                  "{{percent}}% chance to double action gains",
                  {
                    percent: formatProbabilityPercent(
                      effect.bonuses.generalBonuses.actionBonusChance,
                    ),
                  },
                )}
              </div>
            )}
          {effect.bonuses.generalBonuses.luck && (
            <div>
              {getUiTooltip("luck", "Luck: +{{value}}", {
                value: effect.bonuses.generalBonuses.luck,
              })}
            </div>
          )}
          {effect.bonuses.generalBonuses.strength && (
            <div>
              {getUiTooltip("strength", "Strength: +{{value}}", {
                value: effect.bonuses.generalBonuses.strength,
              })}
            </div>
          )}
          {effect.bonuses.generalBonuses.knowledge && (
            <div>
              {getUiTooltip("knowledge", "Knowledge: +{{value}}", {
                value: effect.bonuses.generalBonuses.knowledge,
              })}
            </div>
          )}
          {madnessValue && (
            <div>
              {getUiTooltip("madnessStat", "Madness:{{sign}}{{value}}", {
                sign: madnessValue > 0 ? " +" : " ",
                value: madnessValue,
              })}
            </div>
          )}
          {effect.bonuses.generalBonuses.craftingCostReduction && (
            <div>
              {getUiTooltip("craftDiscount", "Craft Discount: -{{percent}}%", {
                percent: Math.floor(
                  effect.bonuses.generalBonuses.craftingCostReduction * 100,
                ),
              })}
            </div>
          )}
          {effect.bonuses.generalBonuses.buildingCostReduction && (
            <div>
              {getUiTooltip("buildDiscount", "Build Discount: -{{percent}}%", {
                percent: Math.floor(
                  effect.bonuses.generalBonuses.buildingCostReduction * 100,
                ),
              })}
            </div>
          )}
          {effect.bonuses.generalBonuses.merchantDiscount && (
            <div>
              {getUiTooltip(
                "merchantDiscount",
                "Merchant Discount: +{{percent}}%",
                {
                  percent: Math.floor(
                    effect.bonuses.generalBonuses.merchantDiscount * 100,
                  ),
                },
              )}
            </div>
          )}
          {effect.bonuses.generalBonuses.strangerApproachBonus != null &&
            effect.bonuses.generalBonuses.strangerApproachBonus > 0 && (
              <div>
                {getUiTooltip(
                  "newVillagerChanceStat",
                  "New Villager Chance: +{{percent}}%",
                  {
                    percent: Math.round(
                      effect.bonuses.generalBonuses.strangerApproachBonus * 100,
                    ),
                  },
                )}
              </div>
            )}
          {effect.bonuses.generalBonuses.criticalChance && (
            <div>
              {getUiTooltip(
                "criticalStrike",
                "Critical Strike Chance: +{{percent}}%",
                {
                  percent: effect.bonuses.generalBonuses.criticalChance,
                },
              )}
            </div>
          )}
          {effect.bonuses.generalBonuses.eventDeathReduction && (
            <div>
              {getUiTooltip(
                "villagerDeathReduction",
                "Villager Deaths in Fights: -{{percent}}%",
                {
                  percent: Math.floor(
                    effect.bonuses.generalBonuses.eventDeathReduction * 100,
                  ),
                },
              )}
            </div>
          )}
          {effect.bonuses.generalBonuses.caveExploreMultiplier &&
            effect.bonuses.generalBonuses.caveExploreMultiplier !== 1 && (
              <div>
                {getUiTooltip(
                  "caveExploreBonus",
                  "Cave Explore: +{{percent}}% Bonus",
                  {
                    percent: Math.round(
                      (effect.bonuses.generalBonuses.caveExploreMultiplier -
                        1) *
                        100,
                    ),
                  },
                )}
              </div>
            )}
          {(effect.bonuses.generalBonuses.MAX_EMBER_BOMBS ||
            effect.bonuses.generalBonuses.MAX_CINDERFLAME_BOMBS ||
            effect.bonuses.generalBonuses.MAX_VOID_BOMBS) && (
              <div>
                {getUiTooltip(
                  "bombCapacityCombat",
                  "+1 Capacity for all bombs (combat)",
                )}
              </div>
            )}
          {effect.bonuses.generalBonuses.MAX_BOMB_STORAGE && (
            <div>
              {getUiTooltip("maxBombsPerType", "Max {{count}} bombs per type", {
                count: 10 + effect.bonuses.generalBonuses.MAX_BOMB_STORAGE,
              })}
            </div>
          )}
        </div>
      )}
      {itemId === "bone_dice" && (
        <div>
          {getUiTooltip(
            "boneDiceGambler",
            "Play two rounds against the gambler per visit",
          )}
        </div>
      )}
      {effect.bonuses?.actionBonuses &&
        Object.entries(effect.bonuses.actionBonuses).map(
          ([actionId, bonus]) => {
            const actionLabel = getActionLabel(
              actionId,
              capitalizeWords(actionId),
            );
            return (
            <div key={actionId}>
              {bonus.resourceMultiplier && bonus.resourceMultiplier !== 1 && (
                <div>
                  {getUiTooltip(
                    "actionBonusPercent",
                    "{{action}}: +{{percent}}% Bonus",
                    {
                      action: actionLabel,
                      percent: Math.round(
                        (bonus.resourceMultiplier - 1) * 100,
                      ),
                    },
                  )}
                </div>
              )}
              {bonus.resourceBonus &&
                Object.entries(bonus.resourceBonus).map(
                  ([resource, amount]) => (
                    <div key={resource}>
                      {getUiTooltip(
                        "actionResourceBonus",
                        "{{action}}: +{{amount}} {{resource}}",
                        {
                          action: actionLabel,
                          amount,
                          resource: formatTooltipResourceName(resource),
                        },
                      )}
                    </div>
                  ),
                )}
              {bonus.probabilityBonus &&
                Object.entries(bonus.probabilityBonus).map(
                  ([resource, probability]) => (
                    <div key={resource}>
                      {getUiTooltip(
                        "actionProbabilityBonus",
                        "{{action}}: {{percent}}% chance for +50 {{resource}}",
                        {
                          action: actionLabel,
                          percent: formatProbabilityPercent(probability),
                          resource: formatTooltipResourceName(resource),
                        },
                      )}
                    </div>
                  ),
                )}
              {bonus.cooldownReduction && bonus.cooldownReduction !== 0 && (
                <div>
                  {getUiTooltip(
                    "cooldownReduction",
                    "{{action}}: -{{seconds}}s Cooldown",
                    {
                      action: actionLabel,
                      seconds: bonus.cooldownReduction,
                    },
                  )}
                </div>
              )}
              {bonus.executionTimeReduction && bonus.executionTimeReduction !== 0 && (
                <div>
                  {getUiTooltip(
                    "durationReduction",
                    "{{action}}: -{{seconds}}s Duration",
                    {
                      action: actionLabel,
                      seconds: bonus.executionTimeReduction,
                    },
                  )}
                </div>
              )}
            </div>
          );
          },
        )}
      {itemType === "weapon" && itemId === "nightshade_bow" && (
        <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-foreground">
          {`${combatItemTooltips.poison_arrows.getContent(useGameStore.getState() as unknown as GameState)}\n${getUiTooltip("poisonArrowsAvailable", "Available: 1/1 per combat")}`}
        </pre>
      )}
    </div>
  );
}