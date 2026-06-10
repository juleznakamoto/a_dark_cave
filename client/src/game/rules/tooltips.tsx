import { GameState } from "@shared/schema";
import {
  getTotalKnowledge,
  getActionBonuses,
  getTotalCraftingCostReduction,
  getTotalBuildingCostReduction,
  getMadnessComponents,
  getTotalMadness,
  getVeinrootFindMultiplier,
  computeResourceRandomRange,
} from "./effectsCalculation";
import { isCraftUpgradeAction } from "@/game/craftUpgradeUtils";
import { getTotemSacrificeUsageFlatBonus } from "./forestSacrificeActions";
import { gameActions } from "./index";
import { getBoneTotemsCost } from "./forestSacrificeActions";
import {
  BLOODFLAME_SPHERE_UPGRADES,
  BOMB_BASE_DAMAGE_BY_ID,
  bombKnowledgeDamageBonus,
  CRUSHING_STRIKE_UPGRADES,
} from "./skillUpgrades";
import {
  getPoisonArrowsBaseDamage,
  getPoisonArrowsDamagePerTick,
  getPoisonArrowsDotFightRounds,
} from "@/game/weaponEnchantments";
import { formatNumber, formatSignedNumber } from "@/lib/utils";
import type { TooltipConfig } from "@/game/types";
import {
  formatTooltipResourceName,
  getUiTooltip,
} from "@/i18n/tooltipLabels";
import {
  getMaxBombLimit,
  getMaxVeinfireElixirLimit,
  isBombAtLimit,
  isVeinfireElixirAtLimit,
} from "@/game/resourceLimits";
const FOCUS_ELIGIBLE_ACTIONS = [
  "exploreCave",
  "ventureDeeper",
  "descendFurther",
  "exploreRuins",
  "exploreTemple",
  "exploreCitadel",
  "mineCoal",
  "mineIron",
  "mineSulfur",
  "mineObsidian",
  "mineAdamant",
  "mineMoonstone",
  "hunt",
  "chopWood",
];

// Re-export for convenience
export type { TooltipConfig } from "@/game/types";

// Helper function to calculate resource gains and costs (for tests and tooltips)
export const calculateResourceGains = (
  actionId: string,
  state: GameState,
): {
  gains: Array<{ resource: string; min: number; max: number }>;
  costs: Array<{ resource: string; amount: number; hasEnough: boolean }>;
} => {
  const action = gameActions[actionId];
  if (!action) return { gains: [], costs: [] };

  // Resolve effects if they are a function
  const effects =
    typeof action.effects === "function"
      ? action.effects(state)
      : action.effects;

  if (!effects) return { gains: [], costs: [] };

  const bonuses = getActionBonuses(actionId, state);
  const gains: Array<{ resource: string; min: number; max: number }> = [];
  const costs: Array<{ resource: string; amount: number; hasEnough: boolean }> =
    [];

  // Check if this is a craft action to apply crafting discount
  const isCraftAction = actionId.startsWith("craft");
  const craftingDiscount = isCraftAction
    ? getTotalCraftingCostReduction(state)
    : 0;

  // Handle sacrifice actions with dynamic costs and bonuses
  const isSacrificeAction =
    actionId === "boneTotems" || actionId === "leatherTotems";

  if (isSacrificeAction) {
    // Get dynamic cost (uses getBoneTotemsCost for bone totems, which respects Pale Cross)
    const usageCountKey =
      actionId === "boneTotems"
        ? "boneTotemsUsageCount"
        : "leatherTotemsUsageCount";
    const usageCount = Number(state.story?.seen?.[usageCountKey]) || 0;
    const dynamicCost =
      actionId === "boneTotems"
        ? getBoneTotemsCost(state)
        : Math.min(5 + usageCount, 25);

    const costResource =
      actionId === "boneTotems" ? "bone_totem" : "leather_totem";
    const hasEnough =
      (state.resources[costResource as keyof typeof state.resources] || 0) >=
      dynamicCost;
    costs.push({ resource: costResource, amount: dynamicCost, hasEnough });

    // Base gains from effects
    const actionEffects =
      typeof action.effects === "function"
        ? action.effects(state)
        : action.effects;
    Object.entries(actionEffects || {}).forEach(([key, value]) => {
      if (key.startsWith("resources.")) {
        const resource = key.split(".")[1];

        if (typeof value === "string" && value.startsWith("random(")) {
          const match = value.match(/random\((\d+),(\d+)\)/);
          if (match) {
            let min = parseInt(match[1]);
            let max = parseInt(match[2]);

            const usageFlat =
              actionId === "boneTotems" || actionId === "leatherTotems"
                ? getTotemSacrificeUsageFlatBonus(actionId, state)
                : 0;
            const scaled = computeResourceRandomRange(
              min,
              max,
              actionId,
              state,
              { extraFlat: usageFlat, resourceKey: resource },
            );
            min = scaled.min;
            max = scaled.max;

            gains.push({ resource, min, max });

            if (
              actionId === "boneTotems" &&
              (state.buildings?.consecratedPaleCross || 0) >= 1
            ) {
              gains.push({
                resource: "gold",
                min: 50,
                max: 100,
              });
            }
          }
        }
      }
    });
  } else {
    // Check if this is a cave exploration action
    const caveExploreActions = [
      "exploreCave",
      "ventureDeeper",
      "descendFurther",
      "exploreRuins",
      "exploreTemple",
      "exploreCitadel",
    ];
    const isCaveExploreAction = caveExploreActions.includes(actionId);

    // Parse effects for resource gains (normal actions)
    Object.entries(effects).forEach(([key, value]) => {
      if (key.startsWith("resources.")) {
        const resource = key.split(".")[1];

        if (typeof value === "string" && value.startsWith("random(")) {
          // Parse random(min,max) format
          const match = value.match(/random\((\d+),(\d+)\)/);
          if (match) {
            let min = parseInt(match[1]);
            let max = parseInt(match[2]);

            if (!isCraftUpgradeAction(actionId)) {
              const scaled = computeResourceRandomRange(
                min,
                max,
                actionId,
                state,
                { resourceKey: resource, includeCaveExplore: isCaveExploreAction },
              );
              min = scaled.min;
              max = scaled.max;

              if (
                FOCUS_ELIGIBLE_ACTIONS.includes(actionId) &&
                state.focusState?.isActive &&
                state.focusState.endTime > Date.now()
              ) {
                min = Math.floor(min * 2);
                max = Math.floor(max * 2);
              }
            }

            gains.push({ resource, min, max });
          }
        } else if (typeof value === "number") {
          // Fixed value
          let amount = value;

          if (!isCraftUpgradeAction(actionId)) {
            // Apply flat bonuses first
            const flatBonus = bonuses.resourceBonus[resource] || 0;
            amount += flatBonus;

            // Apply all multipliers (resourceMultiplier already includes button upgrades from getActionBonuses)
            let totalMultiplier = bonuses.resourceMultiplier;

            // Apply cave exploration multiplier for cave explore actions (additive, not multiplicative)
            if (isCaveExploreAction) {
              totalMultiplier += (bonuses.caveExploreMultiplier || 1) - 1;
            }

            if (totalMultiplier > 1) {
              amount = Math.floor(amount * totalMultiplier);
            }

            // Apply focus multiplier for eligible actions (exclude sacrifice actions)
            if (
              FOCUS_ELIGIBLE_ACTIONS.includes(actionId) &&
              state.focusState?.isActive &&
              state.focusState.endTime > Date.now()
            ) {
              amount = Math.floor(amount * 2);
            }
          }

          gains.push({ resource, min: amount, max: amount });
        }
      }
    });

    // Parse costs for mine and craft actions
    const resolvedCost =
      typeof action.cost === "function" ? action.cost(state) : action.cost;
    if (resolvedCost) {
      Object.entries(resolvedCost).forEach(([key, value]) => {
        if (key.startsWith("resources.")) {
          const resource = key.split(".")[1];
          if (typeof value === "number") {
            // Apply crafting discount if applicable
            const finalCost = isCraftAction
              ? Math.ceil(value * (1 - craftingDiscount))
              : value;

            const hasEnough =
              (state.resources[resource as keyof typeof state.resources] ||
                0) >= finalCost;
            costs.push({ resource, amount: finalCost, hasEnough });
          }
        } else if (key.startsWith("relics.")) {
          const relic = key.split(".")[1];
          if (typeof value === "boolean" && value === true) {
            const hasEnough =
              state.relics[relic as keyof typeof state.relics] === true;
            costs.push({ resource: relic, amount: 1, hasEnough });
          }
        }
      });
    }
  }

  return { gains, costs };
};

const BOMB_ACTIONS: Record<string, string> = {
  craftEmberBomb: "ember_bomb",
  craftAshfireBomb: "ashfire_bomb",
  craftVoidBomb: "void_bomb",
  tradeGoldForEmberBomb: "ember_bomb",
  tradeGoldForAshfireBomb: "ashfire_bomb",
  tradeGoldForVoidBomb: "void_bomb",
};

// Helper function to get resource gain range tooltip
export const getResourceGainTooltip = (
  actionId: string,
  state: GameState,
): React.ReactNode | null => {
  const { gains, costs } = calculateResourceGains(actionId, state);

  const bombResource = BOMB_ACTIONS[actionId];
  const isBombAtMax = bombResource && isBombAtLimit(bombResource, state);
  const isVeinfireElixirAtMax =
    (actionId === "craftVeinfireElixir" ||
      actionId === "tradeGoldForVeinfireElixir") &&
    isVeinfireElixirAtLimit(state);

  const veinrootPctLine =
    actionId === "chopWood" && Boolean(state.story?.seen?.veinrootDiscovered)
      ? (() => {
        const basePct = 0.5;
        const pct = basePct * getVeinrootFindMultiplier(state);
        const formatted =
          pct % 1 === 0 ? String(pct) : pct.toFixed(1).replace(/\.0$/, "");
        return getUiTooltip(
          "veinrootChanceWood",
          "{{percent}}% chance of {{amount}} Veinroot",
          { percent: formatted, amount: 100 },
        );
      })()
      : null;

  if (
    gains.length === 0 &&
    costs.length === 0 &&
    !isBombAtMax &&
    !isVeinfireElixirAtMax &&
    !veinrootPctLine
  ) {
    return null;
  }

  const formatResourceName = formatTooltipResourceName;

  const showExactGains = true;

  const headerBlockAboveVein =
    gains.length > 0 || costs.length > 0 || isBombAtMax || isVeinfireElixirAtMax;

  return (
    <div className="text-xs">
      {isBombAtMax && (
        <div className="text-muted-foreground mb-1">
          {getUiTooltip("maxBombsReached", "Max bombs reached ({{limit}} per type)", {
            limit: getMaxBombLimit(state),
          })}
        </div>
      )}
      {isVeinfireElixirAtMax && (
        <div className="text-muted-foreground mb-1">
          {getUiTooltip(
            "maxVeinfireElixirReached",
            "Max Veinfire Elixir reached ({{limit}})",
            { limit: getMaxVeinfireElixirLimit() },
          )}
        </div>
      )}
      {(isBombAtMax || isVeinfireElixirAtMax) &&
        (gains.length > 0 || costs.length > 0) && (
          <div className="border-t border-border my-1" />
        )}
      {gains.map((gain, index) => (
        <div key={`gain-${index}`}>
          {showExactGains
            ? gain.min === gain.max
              ? getUiTooltip("gainExact", "+{{amount}} {{resource}}", {
                amount: formatNumber(gain.min),
                resource: formatResourceName(gain.resource),
              })
              : getUiTooltip("gainRange", "+{{min}}-{{max}} {{resource}}", {
                min: formatNumber(gain.min),
                max: formatNumber(gain.max),
                resource: formatResourceName(gain.resource),
              })
            : getUiTooltip("gainUnknown", "+? {{resource}}", {
              resource: formatResourceName(gain.resource),
            })}
        </div>
      ))}
      {gains.length > 0 && costs.length > 0 && (
        <div className="border-t border-border my-1" />
      )}
      {costs.map((cost, index) => (
        <div
          key={`cost-${index}`}
          className={cost.hasEnough ? "" : "text-muted-foreground"}
        >
          {getUiTooltip("costLine", "-{{amount}} {{resource}}", {
            amount: formatNumber(cost.amount),
            resource: formatResourceName(cost.resource),
          })}
        </div>
      ))}
      {veinrootPctLine != null && (
        <>
          {headerBlockAboveVein && (
            <div className="border-t border-border my-1" />
          )}
          <div>{veinrootPctLine}</div>
        </>
      )}
    </div>
  );
};

// Madness tooltip
export const madnessTooltip: TooltipConfig = {
  getContent: (state) => {
    const { fromItems, fromBuildings, fromEvents } =
      getMadnessComponents(state);
    if (
      fromItems === 0 &&
      fromBuildings === 0 &&
      fromEvents === 0
    ) {
      return "";
    }
    return `${getUiTooltip("madnessFromItems", "{{value}} from Items", { value: formatSignedNumber(fromItems) })}\n${getUiTooltip("madnessFromBuildings", "{{value}} from Buildings", { value: formatSignedNumber(fromBuildings) })}\n${getUiTooltip("madnessFromEvents", "{{value}} from Events", { value: formatSignedNumber(fromEvents) })}`;
  },
};

// Madness production effect tooltip (for village panel)
export const madnessProductionTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const totalMadness = getTotalMadness(state);
    if (totalMadness < 10) return null;

    const penalty =
      totalMadness >= 50
        ? 50
        : totalMadness >= 40
          ? 40
          : totalMadness >= 30
            ? 30
            : totalMadness >= 20
              ? 20
              : 10;

    return (
      <>
        <div className="font-bold">{getUiTooltip("madnessTitle", "Madness")}</div>
        <div>
          {getUiTooltip("productionBonus", "Production Bonus: {{value}}", {
            value: `-${penalty}%`,
          })}
        </div>
        <div>
          {getUiTooltip("madnessLevel", "Madness: {{value}}", {
            value: totalMadness,
          })}
        </div>
      </>
    );
  },
};

// Feast and Curse Tooltips
export const feastTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const feastState = state.feastState;
    const greatFeastState = state.greatFeastState;
    const isGreatFeast =
      greatFeastState?.isActive && greatFeastState.endTime > Date.now();
    const isFeast = feastState?.isActive && feastState.endTime > Date.now();

    if (isGreatFeast) {
      const remainingMs = greatFeastState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">
            {getUiTooltip("greatVillageFeast", "Great Village Feast")}
          </div>
          <div>
            {getUiTooltip("productionBonus", "Production Bonus: {{value}}", {
              value: "400%",
            })}
          </div>
          <div>
            {getUiTooltip("minRemaining", "{{count}} min remaining", {
              count: remainingMinutes,
            })}
          </div>
        </>
      );
    }

    if (isFeast) {
      const remainingMs = feastState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">
            {getUiTooltip("villageFeast", "Village Feast")}
          </div>
          <div>
            {getUiTooltip("productionBonus", "Production Bonus: {{value}}", {
              value: "100%",
            })}
          </div>
          <div>
            {getUiTooltip("minRemaining", "{{count}} min remaining", {
              count: remainingMinutes,
            })}
          </div>
        </>
      );
    }

    return null;
  },
};

export const solsticeTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const solsticeState = state.solsticeState;
    const isSolstice =
      solsticeState?.isActive && solsticeState.endTime > Date.now();

    if (isSolstice) {
      const remainingMs = solsticeState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">
            {getUiTooltip("solsticeGathering", "Solstice Gathering")}
          </div>
          <div>
            {getUiTooltip("productionBonus", "Production Bonus: {{value}}", {
              value: "+10%",
            })}
          </div>
          <div>
            {getUiTooltip(
              "newVillagerChanceBonus",
              "New Villager Chance +{{percent}}%",
              { percent: 50 },
            )}
          </div>
          <div>
            {getUiTooltip("minRemaining", "{{count}} min remaining", {
              count: remainingMinutes,
            })}
          </div>
        </>
      );
    }

    return null;
  },
};

export const curseTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const curseState = state.curseState;
    const isCursed = curseState?.isActive && curseState.endTime > Date.now();

    if (isCursed) {
      const remainingMs = curseState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">
            {getUiTooltip("witchsCurse", "Witch's Curse")}
          </div>
          <div>
            {getUiTooltip("productionBonus", "Production Bonus: {{value}}", {
              value: "-50%",
            })}
          </div>
          <div>
            {getUiTooltip("minRemaining", "{{count}} min remaining", {
              count: remainingMinutes,
            })}
          </div>
        </>
      );
    }

    return null;
  },
};

export const disgustTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const disgustState = state.disgustState;
    const isDisgusted =
      disgustState?.isActive && disgustState.endTime > Date.now();

    if (isDisgusted) {
      const remainingMs = disgustState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">
            {getUiTooltip("villagerDisgust", "Villager Disgust")}
          </div>
          <div>
            {getUiTooltip("productionBonus", "Production Bonus: {{value}}", {
              value: "-25%",
            })}
          </div>
          <div>
            {getUiTooltip("minRemaining", "{{count}} min remaining", {
              count: remainingMinutes,
            })}
          </div>
        </>
      );
    }

    return null;
  },
};

export const miningBoostTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const miningBoostState = state.miningBoostState;
    const isBoosted =
      miningBoostState?.isActive && miningBoostState.endTime > Date.now();

    if (isBoosted) {
      const remainingMs = miningBoostState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">
            {getUiTooltip("miningBoost", "Mining Boost")}
          </div>
          <div>
            {getUiTooltip("miningBonus", "Mining Bonus: {{percent}}%", {
              percent: 100,
            })}
          </div>
          <div>
            {getUiTooltip("minRemaining", "{{count}} min remaining", {
              count: remainingMinutes,
            })}
          </div>
        </>
      );
    }

    return null;
  },
};

export const heartfireTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const heartfireState = state.heartfireState;
    if (!heartfireState || heartfireState.level <= 0) return null;

    const now = Date.now();
    const lastDecrease = heartfireState.lastLevelDecrease || 0;
    const levelDuration = 90000; // 1.5 minutes per level
    const remainingMs = Math.max(0, levelDuration - (now - lastDecrease));
    const remainingSecs = Math.ceil(remainingMs / 1000);
    const timeLabel =
      remainingSecs >= 60
        ? getUiTooltip("minRemaining", "{{count}} min remaining", {
          count: Math.ceil(remainingSecs / 60),
        })
        : getUiTooltip("secRemaining", "{{count}} sec remaining", {
          count: remainingSecs,
        });

    const villagerBonus = [0, 1, 2.5, 5, 7.5, 10][heartfireState.level] ?? 0;
    const prodPctPerLevel = state.blessings?.ebon_grace ? 10 : 5;
    return (
      <>
        <div className="font-bold">{getUiTooltip("heartfire", "Heartfire")}</div>
        <div>
          {getUiTooltip("productionBonus", "Production Bonus: {{value}}", {
            value: `+${heartfireState.level * prodPctPerLevel}%`,
          })}
        </div>
        <div>
          {getUiTooltip("newVillagerChance", "New Villager Chance: +{{percent}}%", {
            percent: villagerBonus,
          })}
        </div>
        <div>
          {getUiTooltip("minUntilDecrease", "{{time}} until level decrease", {
            time: timeLabel,
          })}
        </div>
      </>
    );
  },
};

export const frostfallTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const frostfallState = state.frostfallState;
    const isFrostfall =
      frostfallState?.isActive && frostfallState.endTime > Date.now();

    if (isFrostfall) {
      const remainingMs = frostfallState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">{getUiTooltip("frostfall", "Frostfall")}</div>
          <div>
            {getUiTooltip("productionBonus", "Production Bonus: {{value}}", {
              value: "-25%",
            })}
          </div>
          <div>
            {getUiTooltip("minRemaining", "{{count}} min remaining", {
              count: remainingMinutes,
            })}
          </div>
        </>
      );
    }

    return null;
  },
};

export const fogTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const fogState = state.fogState;
    const isFog = fogState?.isActive && fogState.endTime > Date.now();

    if (isFog) {
      const remainingMs = fogState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">
            {getUiTooltip("chokingFog", "Choking Fog")}
          </div>
          <div>
            {getUiTooltip("productionBonus", "Production Bonus: {{value}}", {
              value: "-50%",
            })}
          </div>
          <div>
            {getUiTooltip("minRemaining", "{{count}} min remaining", {
              count: remainingMinutes,
            })}
          </div>
        </>
      );
    }

    return null;
  },
};

export const focusTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const focusState = state.focusState;
    const isFocusActive =
      focusState?.isActive && focusState.endTime > Date.now();

    if (isFocusActive) {
      const remainingMs = focusState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">{getUiTooltip("focus", "Focus")}</div>
          <div>
            {getUiTooltip("actionBonus", "Action Bonus: {{multiplier}}x", {
              multiplier: 2,
            })}
          </div>
          <div>
            {getUiTooltip("minRemaining", "{{count}} min remaining", {
              count: remainingMinutes,
            })}
          </div>
        </>
      );
    }

    return null;
  },
};

function formatBombCombatTooltip(
  state: GameState,
  baseDamage: number,
): string {
  const knowledge = getTotalKnowledge(state) || 0;
  const knowledgeBonus = bombKnowledgeDamageBonus(knowledge);
  const total = baseDamage + knowledgeBonus;
  const lines = [
    getUiTooltip("baseDamage", "Base Damage: {{value}}", { value: baseDamage }),
    ...(knowledge >= 5
      ? [
        getUiTooltip("knowledgeBonus", "Knowledge Bonus: +{{value}}", {
          value: knowledgeBonus,
        }),
      ]
      : []),
    getUiTooltip("totalDamage", "Total Damage: {{value}}", { value: total }),
    getUiTooltip(
      "selfDamageChance",
      "5% chance to deal damage to yourself",
    ),
  ];
  return lines.join("\n");
}

// Combat item tooltips
export const combatItemTooltips: Record<string, TooltipConfig> = {
  ember_bomb: {
    getContent: (state) =>
      formatBombCombatTooltip(state, BOMB_BASE_DAMAGE_BY_ID.ember_bomb),
  },
  ashfire_bomb: {
    getContent: (state) =>
      formatBombCombatTooltip(state, BOMB_BASE_DAMAGE_BY_ID.ashfire_bomb),
  },
  void_bomb: {
    getContent: (state) =>
      formatBombCombatTooltip(state, BOMB_BASE_DAMAGE_BY_ID.void_bomb),
  },
  poison_arrows: {
    getContent: (state) => {
      const knowledge = getTotalKnowledge(state) || 0;
      const knowledgeBonus = Math.floor(knowledge / 5);
      const perHit = getPoisonArrowsDamagePerTick(state);
      const lines = [
        getUiTooltip("baseDamage", "Base Damage: {{value}}", {
          value: getPoisonArrowsBaseDamage(state),
        }),
        ...(knowledge >= 5
          ? [
            getUiTooltip("knowledgeBonus", "Knowledge Bonus: +{{value}}", {
              value: knowledgeBonus,
            }),
          ]
          : []),
        getUiTooltip(
          "totalDamageForRounds",
          "Total Damage: {{value}} for {{rounds}} rounds",
          { value: perHit, rounds: getPoisonArrowsDotFightRounds(state) },
        ),
      ];
      return lines.join("\n");
    },
  },
  veinfire_elixir: {
    getContent: () =>
      getUiTooltip("restoreIntegrity", "Restore up to {{amount}} Integrity", {
        amount: 50,
      }),
  },
  crushing_strike: {
    getContent: (state) => {
      const level = state.combatSkills.crushingStrikeLevel ?? 0;
      const config = CRUSHING_STRIKE_UPGRADES[level];
      const stunKey =
        config.stunRounds === 1 ? "stunDuration_one" : "stunDuration_other";
      return [
        getUiTooltip("damage", "Damage: {{value}}", { value: config.damage }),
        getUiTooltip(
          stunKey,
          config.stunRounds === 1
            ? "Stun Duration: {{rounds}} round"
            : "Stun Duration: {{rounds}} rounds",
          { rounds: config.stunRounds },
        ),
        getUiTooltip("successChance", "Success chance: {{percent}}%", {
          percent: config.successChance,
        }),
      ].join("\n");
    },
  },
  bloodflame_sphere: {
    getContent: (state) => {
      const level = state.combatSkills.bloodflameSphereLevel ?? 0;
      const config = BLOODFLAME_SPHERE_UPGRADES[level];
      const n = config.burnRounds;
      const burnKey = n === 1 ? "burnDamage_one" : "burnDamage_other";
      return [
        getUiTooltip(
          burnKey,
          n === 1
            ? "{{damage}} damage for {{rounds}} round"
            : "{{damage}} damage for {{rounds}} rounds",
          { damage: config.burnDamage, rounds: n },
        ),
        getUiTooltip("healthCost", "Health Cost: {{value}}", {
          value: config.healthCost,
        }),
      ].join("\n");
    },
  },
};

// Event choice cost tooltip - formats cost string with current amounts
export const eventChoiceCostTooltip = {
  getContent: (
    cost: string | Record<string, number> | undefined,
    gameState?: GameState,
  ): React.ReactNode => {
    if (!cost) return null;

    // Extract resources from cost
    const resources: Array<{ resource: string; amount: number }> = [];

    if (typeof cost === "string") {
      // Handle comma-separated costs like "1000 wood, 500 food"
      const costParts = cost.split(",").map((part) => part.trim());

      for (const part of costParts) {
        const parsed = parseResourceText(part);
        if (parsed) {
          resources.push(parsed);
        }
      }
    } else {
      // Handle object-based costs
      Object.entries(cost).forEach(([resource, amount]) => {
        resources.push({ resource, amount });
      });
    }

    const currentAmounts: React.ReactNode[] = [];
    const costLines: React.ReactNode[] = [];

    // Add current amounts if gameState is provided
    if (gameState && resources.length > 0) {
      resources.forEach(({ resource }, index) => {
        const currentAmount =
          gameState.resources[resource as keyof typeof gameState.resources] ||
          0;
        currentAmounts.push(
          <div key={`current-${index}`} className="flex justify-between gap-2">
            <span>{formatTooltipResourceName(resource)}:</span>
            <span>{formatNumber(currentAmount)}</span>
          </div>,
        );
      });
    }

    // Add cost information with individual satisfaction checks
    resources.forEach(({ resource, amount }, index) => {
      // Check if player has enough of this specific resource
      let hasEnough = true;
      if (gameState) {
        const resourceValue =
          gameState.resources[resource as keyof typeof gameState.resources] ||
          0;
        hasEnough = resourceValue >= amount;
      }

      costLines.push(
        <div
          key={`cost-${index}`}
          className={hasEnough ? "!text-foreground" : "!text-muted-foreground"}
        >
          {getUiTooltip("costLine", "-{{amount}} {{resource}}", {
            amount: formatNumber(amount),
            resource: formatTooltipResourceName(resource),
          })}
        </div>,
      );
    });

    return (
      <>
        {currentAmounts}
        {currentAmounts.length > 0 && costLines.length > 0 && (
          <div className="border-t border-border my-1" />
        )}
        {costLines}
      </>
    );
  },
};

// Helper function to extract resource name and amount from text
function parseResourceText(
  text: string,
): { resource: string; amount: number } | null {
  // Match patterns like "250 gold", "+10 Food", "-5 wood"
  const match = text.match(/[+-]?\s*([\d']+)\s+([a-zA-Z_\s]+)/);
  if (match) {
    const amount = parseInt(match[1].replace(/'/g, ""), 10);
    const resource = match[2].trim().toLowerCase().replace(/\s+/g, "_");
    return { resource, amount };
  }
  return null;
}

// Helper function to get current amount of a resource from game state
export const getCurrentResourceAmount = {
  getContent: (text: string | undefined, gameState: GameState): string => {
    if (!text) return "";

    const parsed = parseResourceText(text);
    if (!parsed) return "";

    const { resource } = parsed;
    const currentAmount =
      gameState.resources[resource as keyof typeof gameState.resources] || 0;

    return getUiTooltip("currentResource", "Current: {{amount}} {{resource}}", {
      amount: currentAmount,
      resource: formatTooltipResourceName(resource),
    });
  },
};

// Merchant-specific tooltip that only shows cost (no current amounts)
export const merchantTooltip = {
  getContent: (costText: string | undefined): React.ReactNode => {
    if (!costText) return null;

    const resources: Array<{ resource: string; amount: number }> = [];

    // Handle comma-separated costs like "1000 wood, 500 food"
    const costParts = costText.split(",").map((part) => part.trim());

    for (const part of costParts) {
      const parsed = parseResourceText(part);
      if (parsed) {
        resources.push(parsed);
      }
    }

    const costLines: React.ReactNode[] = [];

    // Add cost lines only (no current amounts)
    resources.forEach(({ resource, amount }, index) => {
      costLines.push(
        <div key={`cost-${index}`}>
          {getUiTooltip("costLine", "-{{amount}} {{resource}}", {
            amount: formatNumber(amount),
            resource: formatTooltipResourceName(resource),
          })}
        </div>,
      );
    });

    return <>{costLines}</>;
  },
};
