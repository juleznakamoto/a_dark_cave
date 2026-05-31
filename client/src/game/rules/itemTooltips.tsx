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
import {
  getBuildingHierarchyChain,
  getBuildingHierarchyTooltipLevel,
} from "../buildingHierarchy";
import {
  villageBuildActions,
  getPalisadesTooltipEffectsForLevel,
  getWatchtowerTooltipEffectsForLevel,
} from "./villageBuildActions";
import type { BuildingTooltipEffect } from "./buildingTooltipEffects";
import {
  getFortificationMarginalStats,
  type FortificationBuildingKey,
} from "@/game/bastionStats";
import type { Action } from "@shared/schema";
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
import {
  formatObsidianOrbFocusCountdown,
  MAX_FOCUS_POINTS,
} from "@/game/obsidianOrb";
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

function buildingKeyToActionId(buildingKey: string): string {
  return `build${buildingKey.charAt(0).toUpperCase() + buildingKey.slice(1)}`;
}

type TooltipEffectEntry = string | BuildingTooltipEffect;

function getBuildingTooltipEffectEntries(
  buildAction: Action,
  gameState: GameState,
): TooltipEffectEntry[] {
  const tooltipEffects = buildAction.tooltipEffects;
  const effectsArray =
    typeof tooltipEffects === "function"
      ? tooltipEffects(gameState)
      : tooltipEffects;
  if (effectsArray && effectsArray.length > 0) {
    return effectsArray;
  }

  const entries: TooltipEffectEntry[] = [];

  if (buildAction.statsEffects) {
    Object.entries(buildAction.statsEffects).forEach(([stat, statValue]) => {
      entries.push({
        key: `__stat__${stat}`,
        fallback: "{{sign}}{{value}} {{stat}}",
        options: {
          sign: statValue > 0 ? "+" : "",
          value: statValue,
          stat: formatTooltipStatName(stat),
        },
      });
    });
  }

  if (buildAction.productionEffects) {
    const productionEffects =
      typeof buildAction.productionEffects === "function"
        ? buildAction.productionEffects(gameState)
        : buildAction.productionEffects;

    Object.entries(productionEffects).forEach(([jobType, production]) => {
      Object.entries(production).forEach(([resource, amount]) => {
        entries.push({
          key: `__production__${jobType}__${resource}`,
          fallback: "+{{amount}} {{resource}} ({{job}})",
          options: {
            amount,
            resource: formatTooltipResourceName(resource),
            job: capitalizeWords(jobType),
          },
        });
      });
    });
  }

  return entries;
}

function resolveTooltipEffectEntry(
  entry: TooltipEffectEntry,
  isDamaged: boolean,
): string {
  if (typeof entry === "string") return entry;

  let options = entry.options;
  if (isDamaged) {
    if (typeof options?.amount === "number") {
      options = {
        ...options,
        amount: Math.floor(options.amount * 0.5),
      };
    } else if (typeof options?.value === "number") {
      options = {
        ...options,
        value: Math.floor(options.value * 0.5),
      };
    }
  }

  if (entry.key.startsWith("__stat__")) {
    return getUiTooltip("statBonus", "{{sign}}{{value}} {{stat}}", options);
  }
  if (entry.key.startsWith("__production__")) {
    return getUiTooltip(
      "productionBonusLine",
      "+{{amount}} {{resource}} ({{job}})",
      options,
    );
  }
  return resolveBuildingTooltipEffect(
    options === entry.options ? entry : { ...entry, options },
  );
}

function tooltipEffectEntryKey(entry: TooltipEffectEntry): string {
  if (typeof entry === "string") return `str:${entry}`;
  return `fx:${entry.key}`;
}

/** Lines newly introduced or increased compared to the previous chain tier. */
function getMarginalTooltipEffectLines(
  prevEntries: TooltipEffectEntry[],
  currEntries: TooltipEffectEntry[],
  isDamaged: boolean,
): string[] {
  const prevByKey = new Map<string, TooltipEffectEntry>();
  for (const entry of prevEntries) {
    prevByKey.set(tooltipEffectEntryKey(entry), entry);
  }

  const lines: string[] = [];
  const damageMult = isDamaged ? 0.5 : 1;

  for (const curr of currEntries) {
    if (typeof curr === "string") {
      if (!prevEntries.some((prev) => typeof prev === "string" && prev === curr)) {
        lines.push(curr);
      }
      continue;
    }

    const prev = prevByKey.get(tooltipEffectEntryKey(curr));
    if (!prev || typeof prev === "string") {
      lines.push(resolveTooltipEffectEntry(curr, isDamaged));
      continue;
    }

    const currAmount = curr.options?.amount ?? curr.options?.value;
    const prevAmount = prev.options?.amount ?? prev.options?.value;
    if (typeof currAmount === "number" && typeof prevAmount === "number") {
      const diff =
        Math.floor(currAmount * damageMult) -
        Math.floor(prevAmount * damageMult);
      if (diff !== 0) {
        const amountKey =
          curr.options?.amount !== undefined ? "amount" : "value";
        lines.push(
          resolveTooltipEffectEntry(
            {
              ...curr,
              options: { ...curr.options, [amountKey]: diff },
            },
            false,
          ),
        );
      }
      continue;
    }

    const currResolved = resolveTooltipEffectEntry(curr, isDamaged);
    const prevResolved = resolveTooltipEffectEntry(prev, isDamaged);
    if (currResolved !== prevResolved) {
      lines.push(currResolved);
    }
  }

  return lines;
}

function getBuildingTooltipEffectLines(
  buildAction: Action,
  gameState: GameState,
  isDamaged: boolean,
): string[] {
  return getBuildingTooltipEffectEntries(buildAction, gameState).map((entry) =>
    resolveTooltipEffectEntry(entry, isDamaged),
  );
}

type LeveledEffectSection = {
  level: number;
  effects: string[];
};

function applyFortificationDamageToEffectLines(
  effects: BuildingTooltipEffect[],
  isDamaged: boolean,
): string[] {
  if (!isDamaged) {
    return effects.map((effect) => resolveBuildingTooltipEffect(effect));
  }
  return effects.map((effect) => {
    if (typeof effect === "string") return effect;
    const amount = effect.options?.amount;
    if (typeof amount === "number") {
      return resolveBuildingTooltipEffect({
        ...effect,
        options: { ...effect.options, amount: Math.floor(amount * 0.5) },
      });
    }
    return resolveBuildingTooltipEffect(effect);
  });
}

function getFortificationLevelEffectLines(
  itemId: "watchtower" | "palisades",
  level: number,
  isDamaged: boolean,
  marginal: boolean,
): string[] {
  const fullEffects =
    itemId === "watchtower"
      ? getWatchtowerTooltipEffectsForLevel(level)
      : getPalisadesTooltipEffectsForLevel(level);

  if (!marginal || level <= 1) {
    return applyFortificationDamageToEffectLines(fullEffects, isDamaged);
  }

  const prevEffects =
    itemId === "watchtower"
      ? getWatchtowerTooltipEffectsForLevel(level - 1)
      : getPalisadesTooltipEffectsForLevel(level - 1);
  const damageMult = isDamaged ? 0.5 : 1;
  const lines: string[] = [];

  fullEffects.forEach((effect, index) => {
    if (typeof effect === "string") {
      lines.push(effect);
      return;
    }
    const prev = prevEffects[index];
    const currAmount = effect.options?.amount;
    const prevAmount =
      typeof prev !== "string" ? prev?.options?.amount : undefined;
    if (typeof currAmount === "number" && typeof prevAmount === "number") {
      const diff =
        Math.floor(currAmount * damageMult) -
        Math.floor(prevAmount * damageMult);
      if (diff !== 0) {
        lines.push(
          resolveBuildingTooltipEffect({
            ...effect,
            options: { ...effect.options, amount: diff },
          }),
        );
      }
      return;
    }
    lines.push(resolveBuildingTooltipEffect(effect));
  });

  return lines;
}

function getFortificationLevelEffectSections(
  itemId: FortificationBuildingKey,
  currentLevel: number,
  isDamaged: boolean,
): LeveledEffectSection[] {
  if (
    currentLevel <= 1 ||
    (itemId !== "watchtower" && itemId !== "palisades")
  ) {
    return [];
  }

  const sections: LeveledEffectSection[] = [];
  for (let level = 1; level <= currentLevel; level++) {
    const effects = getFortificationLevelEffectLines(
      itemId,
      level,
      isDamaged,
      level > 1,
    );
    if (effects.length > 0) {
      sections.push({ level, effects });
    }
  }
  return sections;
}

function renderLeveledEffectsBlock(
  currentEffects: string[],
  levelSections: LeveledEffectSection[],
): React.ReactNode | null {
  const hasCurrent = currentEffects.length > 0;
  const visibleSections = levelSections.filter(
    (section) => section.effects.length > 0,
  );
  if (!hasCurrent && visibleSections.length === 0) return null;

  return (
    <div key="effects" className="mt-1">
      {hasCurrent &&
        currentEffects.map((effect, idx) => (
          <div key={`current-${idx}`}>{effect}</div>
        ))}
      {visibleSections.map((section, idx) => (
        <div key={`level-${section.level}`}>
          {(hasCurrent || idx > 0) && (
            <div className="border-t border-border my-1" />
          )}
          <div className="text-gray-300">
            {getUiTooltip("level", "Level {{level}}", {
              level: section.level,
            })}
          </div>
          {section.effects.map((effect, effectIdx) => (
            <div key={effectIdx}>{effect}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function getUpgradeChainLevelEffectSections(
  chain: string[],
  itemId: string,
  gameState: GameState,
  isDamaged: boolean,
): LeveledEffectSection[] {
  const currentIndex = chain.indexOf(itemId);
  if (currentIndex < 0) return [];

  const sections: LeveledEffectSection[] = [];
  let prevEntries: TooltipEffectEntry[] | null = null;

  for (let index = 0; index <= currentIndex; index++) {
    const buildingKey = chain[index];
    const buildAction = villageBuildActions[buildingKeyToActionId(buildingKey)];
    if (!buildAction) continue;

    const tierDamaged = isDamaged && buildingKey === itemId;
    const entries = getBuildingTooltipEffectEntries(buildAction, gameState);
    const effects =
      index === 0 || prevEntries === null
        ? entries.map((entry) => resolveTooltipEffectEntry(entry, tierDamaged))
        : getMarginalTooltipEffectLines(prevEntries, entries, tierDamaged);

    prevEntries = entries;

    if (effects.length > 0) {
      sections.push({ level: index + 1, effects });
    }
  }

  // Tier-1 chain buildings: current block already shows their effects; skip duplicate Level 1 section.
  if (sections.length <= 1) return [];

  return sections;
}

function renderUpgradeChainTooltipEffects(
  chain: string[],
  gameState: GameState,
  itemId: string,
  isDamaged: boolean,
): React.ReactNode | null {
  const buildAction = villageBuildActions[buildingKeyToActionId(itemId)];
  if (!buildAction) return null;

  const currentEffects = getBuildingTooltipEffectLines(
    buildAction,
    gameState,
    isDamaged,
  );
  const levelSections = getUpgradeChainLevelEffectSections(
    chain,
    itemId,
    gameState,
    isDamaged,
  );

  return renderLeveledEffectsBlock(currentEffects, levelSections);
}

function getFortificationUpgradeLevel(
  itemId: FortificationBuildingKey,
  gameState: GameState,
): number | null {
  if (itemId === "watchtower") {
    const level = gameState.buildings.watchtower ?? 0;
    return level > 0 ? level : null;
  }
  if (itemId === "palisades") {
    const level = gameState.buildings.palisades ?? 0;
    return level > 0 ? level : null;
  }
  return null;
}

function getFortificationTooltipEffectLines(
  itemId: FortificationBuildingKey,
  gameState: GameState,
): string[] {
  const margin = getFortificationMarginalStats(gameState, itemId);
  if (!margin) return [];

  const lines: string[] = [];
  if (margin.attack !== 0) {
    lines.push(
      getUiTooltip("attackBonus", "+{{amount}} Attack", {
        amount: margin.attack,
      }),
    );
  }
  if (margin.defense !== 0) {
    lines.push(
      getUiTooltip("defenseBonus", "+{{amount}} Defense", {
        amount: margin.defense,
      }),
    );
  }
  if (margin.integrity !== 0) {
    lines.push(
      getUiTooltip("integrityBonus", "+{{amount}} Integrity", {
        amount: margin.integrity,
      }),
    );
  }
  return lines;
}

function renderBuildingItemTooltip(
  itemId: string,
  displayLabel?: string,
): React.ReactNode | null {
  const gameState = useGameStore.getState();
  const story = gameState.story;

  const actionId = buildingKeyToActionId(itemId);
  const buildAction = villageBuildActions[actionId];

  if (!buildAction) return null;

  const isDamaged =
    (itemId === "bastion" && story?.seen?.bastionDamaged) ||
    (itemId === "watchtower" && story?.seen?.watchtowerDamaged) ||
    (itemId === "palisades" && story?.seen?.palisadesDamaged);

  const tooltipParts: React.ReactNode[] = [];

  const buildDescription = getActionDescription(
    actionId,
    buildAction.description,
  );
  if (buildDescription) {
    tooltipParts.push(
      <div key="description" className="text-gray-400 mb-0.5">
        {buildDescription}
      </div>,
    );
  }

  const hierarchyChain = getBuildingHierarchyChain(itemId);

  if (hierarchyChain) {
    const chainEffects = renderUpgradeChainTooltipEffects(
      hierarchyChain,
      gameState,
      itemId,
      isDamaged,
    );
    if (chainEffects) {
      tooltipParts.push(chainEffects);
    }
  } else {
    const effectsList = getBuildingTooltipEffectLines(
      buildAction,
      gameState,
      isDamaged,
    );
    const effectsBlock = renderLeveledEffectsBlock(effectsList, []);
    if (effectsBlock) {
      tooltipParts.push(effectsBlock);
    }
  }

  const hierarchyLevel = getBuildingHierarchyTooltipLevel(itemId);
  const titleLabel =
    displayLabel ?? getActionLabel(actionId, buildAction.label);

  return (
    <div className="text-xs">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span>
          <span className="font-bold">{titleLabel}</span>
          {hierarchyLevel != null && (
            <span className="font-normal text-gray-400">
              {" "}
              {getUiTooltip("level", "Level {{level}}", {
                level: hierarchyLevel,
              })}
            </span>
          )}
          {isDamaged && (
            <span className="font-normal text-muted-foreground">
              {" "}
              {getUiTooltip("damaged", "(damaged)")}
            </span>
          )}
        </span>
      </div>
      {tooltipParts}
    </div>
  );
}

export function renderFortificationTooltip(
  itemId: string,
  displayLabel?: string,
): React.ReactNode | null {
  const gameState = useGameStore.getState();
  const story = gameState.story;
  const fortKey = itemId as FortificationBuildingKey;

  const actionId = buildingKeyToActionId(itemId);
  const buildAction = villageBuildActions[actionId];
  if (!buildAction) return null;

  const isDamaged = Boolean(
    (itemId === "bastion" && story?.seen?.bastionDamaged) ||
    (itemId === "watchtower" && story?.seen?.watchtowerDamaged) ||
    (itemId === "palisades" && story?.seen?.palisadesDamaged),
  );

  const upgradeLevel = getFortificationUpgradeLevel(fortKey, gameState);
  const titleLabel =
    displayLabel ?? getActionLabel(actionId, buildAction.label);

  const buildDescription = getActionDescription(
    actionId,
    buildAction.description,
  );
  const currentEffects = getFortificationTooltipEffectLines(fortKey, gameState);
  const levelSections =
    upgradeLevel != null
      ? getFortificationLevelEffectSections(fortKey, upgradeLevel, isDamaged)
      : [];
  const effectsBlock = renderLeveledEffectsBlock(
    currentEffects,
    levelSections,
  );

  return (
    <div className="text-xs">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span>
          <span className="font-bold">{titleLabel}</span>
          {upgradeLevel != null && (
            <span className="font-normal text-gray-400">
              {" "}
              {getUiTooltip("level", "Level {{level}}", {
                level: upgradeLevel,
              })}
            </span>
          )}
          {isDamaged && (
            <span className="font-normal text-muted-foreground">
              {" "}
              {getUiTooltip("damaged", "(damaged)")}
            </span>
          )}
        </span>
      </div>
      {buildDescription && (
        <div className="text-gray-400 mb-0.5">{buildDescription}</div>
      )}
      {effectsBlock}
    </div>
  );
}

export function renderItemTooltip(
  itemId: string,
  itemType: "weapon" | "tool" | "blessing" | "book" | "building" | "fellowship",
  customTooltip?: React.ReactNode,
) {
  // For buildings, generate the tooltip from villageBuildActions
  if (itemType === "building") {
    return renderBuildingItemTooltip(itemId);
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
            <span className="font-bold">
              {getEffectName(effectCategory, itemId, effect.name)}
            </span>
            <span
              className={`font-noto-symbols-2 font-normal tabular-nums tracking-wide select-none ${mapFragmentCount > 0 ? "text-foreground" : "text-gray-500"
                }`}
              aria-label={getUiTooltip(
                "mapFragmentProgress",
                `${mapFragmentCount} of ${MAP_FRAGMENT_TOTAL} map fragments`,
                { count: mapFragmentCount, total: MAP_FRAGMENT_TOTAL },
              )}
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
      {itemId === "obsidian_orb" &&
        useGameStore.getState().relics?.obsidian_orb && (
          <div>
            {(() => {
              const store = useGameStore.getState();
              const now = Date.now();
              const next = store.obsidianOrbState?.nextFocusGainTime ?? 0;
              const points =
                (store.focusState as { points?: number } | undefined)?.points ?? 0;
              if (points >= MAX_FOCUS_POINTS) {
                return getUiTooltip(
                  "obsidianOrbFocusCap",
                  "Focus reserve full ({{max}})",
                  { max: MAX_FOCUS_POINTS },
                );
              }
              const remainingMs = Math.max(0, next - now);
              return getUiTooltip(
                "obsidianOrbFocusCountdown",
                "{{time}} until next Focus Point is gained",
                { time: formatObsidianOrbFocusCountdown(remainingMs) },
              );
            })()}
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