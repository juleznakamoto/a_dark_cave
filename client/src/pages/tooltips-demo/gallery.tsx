import type { ReactNode } from "react";
import type { GameState } from "@shared/schema";
import { SHOP_ITEMS } from "@shared/shopItems";
import { TRADERS_GRATITUDE_DISCOUNT_PERCENT } from "@shared/shopCheckoutPrice";
import { CruelModeEffectsList } from "@/components/game/CruelModeEffectsList";
import JobProductionTooltip from "@/components/game/JobProductionTooltip";
import ResourceFlowTooltip from "@/components/game/ResourceFlowTooltip";
import StatEffectsTooltip from "@/components/game/StatEffectsTooltip";
import BonusCompositionTooltip from "@/components/game/BonusCompositionTooltip";
import { InviteFriendsTooltip } from "@/components/game/InviteFriendsMenuItem";
import {
  EventChoiceSuccessTooltipContent,
  SuccessChanceTooltipContent,
} from "@/components/game/EventChoiceSuccessTooltip";
import { useTooltipFrame } from "@/components/ui/tooltip";
import { getButtonUpgradeInfo } from "@/game/buttonUpgrades";
import {
  getConstructionBoostCost,
  getConstructionBoostReductionSeconds,
} from "@/game/constructionQueueSlots";
import { ABSOLUTION_INSIGHT_COST } from "@/game/itemAbsolution";
import { useGameStore } from "@/game/state";
import { isBuildingUpgrade } from "@/game/buildingHierarchy";
import {
  getAchievementTitleInsightCost,
  TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
  TIMED_EVENT_TAB_PROLONG_MS,
} from "@/game/rules/insightReveal";
import {
  gameActions,
  getActionCostBreakdown,
  getBastionRepairTooltipRows,
  getEventChoiceCostBreakdown,
} from "@/game/rules";
import {
  ActionTooltipSeparator,
  composeActionTooltip,
} from "@/game/rules/actionTooltipLayout";
import {
  TOOLTIP_ACCENT_SHOP_CLASS,
  TOOLTIP_MUTED_CLASS,
  TOOLTIP_RULE_COLOR_CLASS,
  TOOLTIP_STACK_CLASS,
  TOOLTIP_TITLE_CLASS,
} from "@/game/tooltipMetrics";
import {
  ActionTooltipResourceRows,
  TooltipCostLines,
  actionTooltipHasResourceSection,
  costBenefitTooltip,
  getResourceGainTooltip,
  heartfireTooltip,
} from "@/game/rules/tooltips";
import {
  getStrangerApproachProbability,
  getTotalKnowledge,
} from "@/game/rules/effectsCalculation";
import {
  calculateKnowledgeTimeBonus,
  calculateMerchantDiscount,
  getTotalMerchantDiscount,
  isKnowledgeBonusMaxed,
} from "@/game/rules/effectsStats";
import { hasChosenPact } from "@/game/rules/pacts";
import { getFocusTooltipHeaderTrailing } from "@/game/rules/focusTooltipIndicator";
import { getRevealedEffectsForActionTooltip } from "@/game/rules/insightRevealTooltip";
import { BuildingUpgradeTooltipIcon } from "@/game/rules/buildingUpgradeTooltipIndicator";
import {
  renderFortificationTooltip,
  renderItemTooltip,
  SIDE_PANEL_ITEM_TOOLTIP_DISPLAY,
} from "@/game/rules/itemTooltips";
import { composeMerchantSpecialItemTooltip } from "@/game/rules/eventsMerchantTooltip";
import { composeCollectorItemTooltip } from "@/game/rules/eventsWanderingCollectorTooltip";
import {
  blackRotEvents,
  blackRotSpoiledFood,
} from "@/game/rules/eventsBlackRot";
import {
  getLuckyChancePercent,
  getLuckWinChanceBonus,
  LUCKY_CHANCE_WIN_MULTIPLIER,
} from "@/game/rules/investmentHallTables";
import {
  getNextCapUpgradeCost,
  getVillagerCapLevel,
} from "@/game/villagerCapUpgrades";
import { getActionDescription } from "@/i18n/resolveGameText";
import { resolveEventChoiceReward } from "@/i18n/eventText";
import { resolveShopItemDescription } from "@/i18n/shopLabels";
import {
  formatTooltipCostLine,
  getUiTooltip,
  resolveActionTooltipEffects,
} from "@/i18n/tooltipLabels";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { formatCompactDuration, formatNumber } from "@/lib/utils";

function TooltipSample({
  id,
  title,
  className,
  children,
}: {
  id: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const frame = useTooltipFrame(className);
  if (children == null || children === false) return null;
  return (
    <figure
      className="flex min-w-0 flex-col items-start gap-2"
      data-specimen={id}
    >
      <figcaption className="text-[11px] uppercase tracking-wide text-stone-500">
        {title}
      </figcaption>
      <div
        role="tooltip"
        data-specimen-tip={id}
        className={frame.className}
        style={frame.style}
      >
        {children}
      </div>
    </figure>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-sm font-medium text-stone-300 sm:col-span-2 xl:col-span-3">
      {children}
    </h2>
  );
}

function CaveGatherTip({ state }: { state: GameState }) {
  const action = gameActions.chopWood;
  if (!action) return null;
  const description = getActionDescription("chopWood", action.description, {
    forestUnlocked: !!state.flags?.forestUnlocked,
  });
  const revealed = getRevealedEffectsForActionTooltip("chopWood", state);
  return composeActionTooltip({
    header: getResourceGainTooltip(
      "chopWood",
      state,
      getFocusTooltipHeaderTrailing("chopWood", state) ?? undefined,
    ),
    description,
    effects: revealed,
  });
}

function VillageBuildTip({ state }: { state: GameState }) {
  const actionId = "buildStoneHut";
  const action = gameActions[actionId];
  if (!action) return null;
  const description = getActionDescription(actionId, action.description);
  const revealed = getRevealedEffectsForActionTooltip(actionId, state);
  return composeActionTooltip({
    header: (
      <div className="min-w-0 flex-1">
        <ActionTooltipResourceRows
          actionId={actionId}
          state={state}
          costs={getActionCostBreakdown(actionId, state)}
        />
      </div>
    ),
    headerTrailing: isBuildingUpgrade("stoneHut") ? (
      <BuildingUpgradeTooltipIcon />
    ) : undefined,
    description,
    effects: revealed,
  });
}

function ForestExpeditionTip({ state }: { state: GameState }) {
  const actionId = "castleRuins";
  const action = gameActions[actionId];
  if (!action) return null;
  const costs = getActionCostBreakdown(actionId, state);
  const hasResourceSection = actionTooltipHasResourceSection(
    actionId,
    state,
    costs.length,
  );
  const showSuccess = (action.relevant_stats?.length ?? 0) > 0;
  const description = getActionDescription(actionId, action.description);
  return composeActionTooltip({
    header: (
      <div>
        <ActionTooltipResourceRows
          actionId={actionId}
          state={state}
          costs={costs}
        />
        {showSuccess && (
          <>
            {hasResourceSection && <ActionTooltipSeparator />}
            <SuccessChanceTooltipContent
              gameState={state}
              successChance={action.success_chance}
              relevantStats={action.relevant_stats}
              successFormula={action.success_formula}
            />
          </>
        )}
      </div>
    ),
    description,
  });
}

function FinanceExpeditionTip({ state }: { state: GameState }) {
  const actionId = "financeExpedition";
  const action = gameActions[actionId];
  if (!action?.tooltipEffects) return null;
  const costs = getActionCostBreakdown(actionId, state);
  const effectLines = resolveActionTooltipEffects(action.tooltipEffects, state);
  const hasResourceSection = actionTooltipHasResourceSection(
    actionId,
    state,
    costs.length,
  );
  const description = getActionDescription(actionId, action.description);
  return composeActionTooltip({
    header: (
      <div>
        <ActionTooltipResourceRows
          actionId={actionId}
          state={state}
          costs={costs}
        />
        {hasResourceSection && effectLines.length > 0 && (
          <ActionTooltipSeparator />
        )}
        {effectLines.map((effect, index) => (
          <div key={`effect-${index}`}>{effect}</div>
        ))}
      </div>
    ),
    description,
  });
}

function NowrapCostTip({
  actionId,
  state,
}: {
  actionId: string;
  state: GameState;
}) {
  const costs =
    actionId === "repairBastion"
      ? getBastionRepairTooltipRows(actionId, state)
      : getActionCostBreakdown(actionId, state);
  if (costs.length === 0 && actionId !== "feedFire") return null;
  return (
    <div className={TOOLTIP_STACK_CLASS}>
      <ActionTooltipResourceRows
        actionId={actionId}
        state={state}
        costs={costs}
      />
    </div>
  );
}

function FeedFireTip({ state }: { state: GameState }) {
  const level = state.heartfireState?.level || 0;
  const woodCost = 50 * (level + 1);
  return (
    <div className={TOOLTIP_STACK_CLASS}>
      <TooltipCostLines
        costs={[
          {
            text: formatTooltipCostLine(woodCost, "wood", {
              available: state.resources.wood ?? 0,
            }),
            satisfied: (state.resources.wood ?? 0) >= woodCost,
          },
        ]}
      />
    </div>
  );
}

function BlackRotTip({ state }: { state: GameState }) {
  const choice = blackRotEvents.blackRot.choices.find(
    (entry) => entry.id === "keepFood",
  );
  if (!choice) return null;
  const vars = { foodCost: formatNumber(blackRotSpoiledFood(state)) };
  const rewardText = resolveEventChoiceReward("blackRot", "keepFood", vars);
  const costs = getEventChoiceCostBreakdown(choice.cost, state, {
    catalogId: "blackRot",
    choiceId: "keepFood",
    vars,
  });
  const costHeader =
    costs.length > 0 ? <TooltipCostLines costs={costs} /> : undefined;
  return (
    <div className={TOOLTIP_STACK_CLASS}>
      {costHeader}
      {rewardText && <div>{rewardText}</div>}
      <ActionTooltipSeparator />
      <EventChoiceSuccessTooltipContent choice={choice} gameState={state} />
    </div>
  );
}

function KnowledgeTimeTip({ state }: { state: GameState }) {
  const { t } = useUiTranslation();
  const knowledge = getTotalKnowledge(state);
  return (
    <div className={TOOLTIP_STACK_CLASS}>
      {t("event.knowledgeTimeBonus", {
        seconds: calculateKnowledgeTimeBonus(knowledge),
        maxSuffix: isKnowledgeBonusMaxed(knowledge)
          ? t("event.knowledgeTimeBonusMax")
          : "",
      })}
    </div>
  );
}

function MerchantDiscountTip({ state }: { state: GameState }) {
  const { t } = useUiTranslation();
  const knowledge = state.stats?.knowledge || 0;
  const totalDiscount = getTotalMerchantDiscount(state);
  const knowledgeDiscount = calculateMerchantDiscount(knowledge);
  const hasRing = state.clothing?.ring_of_obedience ?? false;
  const hasCunningTrader = hasChosenPact(state, "cunning_trader");
  return (
    <div className={TOOLTIP_STACK_CLASS}>
      {t("timedEvent.discount", {
        percent: Math.round(totalDiscount * 100),
      })}
      {(knowledgeDiscount > 0 || hasRing || hasCunningTrader) && (
        <>
          <br />
          {knowledgeDiscount > 0 && (
            <span className={TOOLTIP_MUTED_CLASS}>
              {t("timedEvent.discountFromKnowledge", {
                percent: Math.round(knowledgeDiscount * 100),
                max: isKnowledgeBonusMaxed(knowledge)
                  ? t("timedEvent.knowledgeMax")
                  : "",
              })}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function MerchantItemTip({ state }: { state: GameState }) {
  const gold = 1000;
  return composeMerchantSpecialItemTooltip(
    { buyItem: "compound_bow", buyResource: "weapon" },
    <TooltipCostLines
      costs={[
        {
          text: formatTooltipCostLine(gold, "gold", {
            available: state.resources.gold ?? 0,
          }),
          satisfied: (state.resources.gold ?? 0) >= gold,
        },
      ]}
    />,
  );
}

function CostBenefitSamples({ state }: { state: GameState }) {
  const { t } = useUiTranslation();
  const insight = state.resources.insight ?? 0;
  const achievementId = "basic-0-woodGatherer";
  const achievementCost = getAchievementTitleInsightCost(achievementId);
  const capLevel = getVillagerCapLevel(state, "hunter");
  const capCost = getNextCapUpgradeCost(capLevel);
  const reductionSeconds = getConstructionBoostReductionSeconds(
    state,
    "buildWatchtower",
  );
  const boostCost = getConstructionBoostCost(state, "buildWatchtower");
  const savedTime = formatCompactDuration(reductionSeconds, "round");
  const unlock = costBenefitTooltip({
    amount: achievementCost,
    available: insight,
    satisfied: insight >= achievementCost,
    benefit: t("achievements.unlockTitleForInsight", {
      defaultValue: "Unlock title and description",
    }),
  });
  const absolve = costBenefitTooltip({
    amount: ABSOLUTION_INSIGHT_COST,
    available: insight,
    satisfied: insight >= ABSOLUTION_INSIGHT_COST,
    benefit: getUiTooltip("absolveMadnessForInsight", "Reduce Madness by 1"),
  });
  const cap = costBenefitTooltip({
    amount: capCost,
    available: insight,
    satisfied: insight >= capCost,
    benefit: getUiTooltip("unlockMoreJobsForInsight", "Increase limit"),
  });
  const boost = costBenefitTooltip({
    amount: boostCost,
    available: insight,
    satisfied: insight >= boostCost,
    benefit: t("village.constructionBoost", {
      defaultValue: "Speed up construction by {{time}}",
      time: savedTime,
    }),
  });
  const prolongMinutes = TIMED_EVENT_TAB_PROLONG_MS / 60_000;
  const prolong = costBenefitTooltip({
    amount: TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
    available: insight,
    satisfied: insight >= TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
    benefit: t("timedEvent.prolongForInsight", {
      defaultValue: "Extend time by {{minutes}} min",
      minutes: prolongMinutes,
    }),
  });
  return (
    <>
      <TooltipSample id="cost-unlock-title" title="Insight: unlock achievement">
        {unlock.tooltip}
      </TooltipSample>
      <TooltipSample id="cost-absolve" title="Insight: absolve item">
        {absolve.tooltip}
      </TooltipSample>
      <TooltipSample id="cost-job-cap" title="Insight: job cap">
        {cap.tooltip}
      </TooltipSample>
      <TooltipSample id="cost-build-boost" title="Insight: construction boost">
        {boost.tooltip}
      </TooltipSample>
      <TooltipSample id="cost-prolong" title="Insight: extend timed event">
        {prolong.tooltip}
      </TooltipSample>
    </>
  );
}

function LevelBadgeTip() {
  const { t } = useUiTranslation();
  const upgrade = useGameStore(
    (s) => s.buttonUpgrades.chopWood ?? { clicks: 0, level: 0 },
  );
  const info = getButtonUpgradeInfo("chopWood", upgrade);
  return (
    <div className={TOOLTIP_STACK_CLASS}>
      {info.nextLevel ? (
        <>
          <div>
            {t("badges.bonus")}{" "}
            <span className={TOOLTIP_TITLE_CLASS}>
              {t("badges.bonusPercent", { percent: info.bonus })}
            </span>
          </div>
          <div>
            {t("badges.nextBonus")}{" "}
            <span className={TOOLTIP_TITLE_CLASS}>
              {t("badges.bonusPercent", { percent: info.nextLevel.bonus })}
            </span>
          </div>
        </>
      ) : (
        <div>
          {t("badges.bonus")} {t("badges.bonusPercent", { percent: info.bonus })}
        </div>
      )}
      {info.isMaxLevel && (
        <>
          <div className={TOOLTIP_MUTED_CLASS}>
            {t("badges.executionTimeReduction")}
          </div>
          <ActionTooltipSeparator />
          <div>{t("badges.maxLevel")}</div>
        </>
      )}
    </div>
  );
}

function ProductionCycleTip({ state }: { state: GameState }) {
  const { t } = useUiTranslation();
  const {
    rawChance,
    lowPopulationBonus,
    fromBuildings,
    fromBlessings,
    fromEvents,
    fromGreatFeast,
    fromHeartfire,
    fromAchievements,
  } = getStrangerApproachProbability(state);
  const chancePct = Math.round(rawChance * 100);
  return (
    <div className={TOOLTIP_STACK_CLASS}>
      <div className={TOOLTIP_TITLE_CLASS}>{t("village.cycle")}</div>
      <div>{t("village.nextCycleIn", { seconds: 8 })}</div>
      <ActionTooltipSeparator />
      <div>{t("village.newVillagerChance", { percent: chancePct })}</div>
      {lowPopulationBonus > 0 && (
        <div className={TOOLTIP_MUTED_CLASS}>
          {t("village.lowPopulationBonus", {
            percent: Math.round(lowPopulationBonus * 100),
          })}
        </div>
      )}
      {fromBuildings > 0 && (
        <div className={TOOLTIP_MUTED_CLASS}>
          {t("village.fromBuildings", {
            percent: Math.round(fromBuildings * 100),
          })}
        </div>
      )}
      {fromBlessings > 0 && (
        <div className={TOOLTIP_MUTED_CLASS}>
          {t("village.fromBlessings", {
            percent: Math.round(fromBlessings * 100),
          })}
        </div>
      )}
      {fromEvents > 0 && (
        <div className={TOOLTIP_MUTED_CLASS}>
          {t("village.fromEvents", {
            percent: Math.round(fromEvents * 100),
          })}
        </div>
      )}
      {fromGreatFeast > 0 && (
        <div className={TOOLTIP_MUTED_CLASS}>
          {t("village.fromGreatFeast", {
            percent: Math.round(fromGreatFeast * 100),
          })}
        </div>
      )}
      {fromHeartfire > 0 && (
        <div className={TOOLTIP_MUTED_CLASS}>
          {t("village.fromHeartfire", {
            percent: Math.round(fromHeartfire * 100),
          })}
        </div>
      )}
      {fromAchievements > 0 && (
        <div className={TOOLTIP_MUTED_CLASS}>
          {t("village.fromAchievements", {
            percent: Math.round(fromAchievements * 100),
            defaultValue: "{{percent}}% from Achievements",
          })}
        </div>
      )}
      <ActionTooltipSeparator />
      <div className={TOOLTIP_MUTED_CLASS}>{t("village.cycleDescription")}</div>
    </div>
  );
}

function StatTip({
  statKey,
  flavorKey,
}: {
  statKey: "luck" | "strength" | "knowledge" | "madness";
  flavorKey: string;
}) {
  const { t } = useUiTranslation();
  return (
    <>
      <StatEffectsTooltip statKey={statKey} />
      <ActionTooltipSeparator />
      <div className={TOOLTIP_MUTED_CLASS}>{t(flavorKey)}</div>
    </>
  );
}

function InvestTip() {
  const { t } = useUiTranslation();
  const luck = useGameStore((s) => s.stats.luck);
  const buildings = useGameStore((s) => s.buildings);
  const luckyChancePct = getLuckyChancePercent({
    coinhouse: buildings.coinhouse,
    bank: buildings.bank,
    treasury: buildings.treasury,
  });
  const formatPercent = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);
  return (
    <div className={TOOLTIP_STACK_CLASS}>
      <div className={`mb-0.5 ${TOOLTIP_STACK_CLASS} border-b ${TOOLTIP_RULE_COLOR_CLASS} pb-2`}>
        <p className={TOOLTIP_TITLE_CLASS}>
          {t("invest.luckyChanceTop", {
            percent: formatPercent(luckyChancePct),
            fromLuck: formatPercent(getLuckWinChanceBonus(luck)),
          })}
        </p>
      </div>
      <ul className={`list-none ${TOOLTIP_STACK_CLASS} pl-0 ${TOOLTIP_MUTED_CLASS}`}>
        <li>
          <span className={TOOLTIP_TITLE_CLASS}>
            {t("invest.headers.time")}
          </span>
          : {t("invest.tooltip.time")}
        </li>
        <li>
          <span className={TOOLTIP_TITLE_CLASS}>
            {t("invest.headers.success")}
          </span>
          : {t("invest.tooltip.success")}
        </li>
        <li>
          <span className={TOOLTIP_TITLE_CLASS}>
            {t("invest.headers.profit")}
          </span>
          : {t("invest.tooltip.profit")}
        </li>
        <li>
          <span className={TOOLTIP_TITLE_CLASS}>
            {t("invest.headers.lucky")}
          </span>
          :{" "}
          {t("invest.tooltip.lucky", {
            multiplier: LUCKY_CHANCE_WIN_MULTIPLIER,
          })}
        </li>
        <li>
          <span className={TOOLTIP_TITLE_CLASS}>
            {t("invest.headers.loss")}
          </span>
          : {t("invest.tooltip.loss")}
        </li>
      </ul>
      <p className={TOOLTIP_MUTED_CLASS}>{t("invest.tooltip.wait")}</p>
    </div>
  );
}

function ShopDiscountTips() {
  const { t } = useUiTranslation();
  return (
    <>
      <TooltipSample
        id="shop-gratitude"
        title="Shop: trader gratitude"
        className={TOOLTIP_ACCENT_SHOP_CLASS}
      >
        <div>
          {t("shop.tradersGratitudeDiscount", {
            percent: TRADERS_GRATITUDE_DISCOUNT_PERCENT,
          })}
        </div>
      </TooltipSample>
      <TooltipSample
        id="shop-journey"
        title="Shop: journey complete"
        className={TOOLTIP_ACCENT_SHOP_CLASS}
      >
        <div>{t("shop.journeyCompleteDiscount")}</div>
      </TooltipSample>
    </>
  );
}

/** Every tooltip layout the game paints, with copy from the live builders. */
export function TooltipDemoGallery({ state }: { state: GameState }) {
  const { t } = useUiTranslation();
  const heartfire = heartfireTooltip.getContent(state);
  return (
    <div className="grid items-start gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
      <SectionTitle>Action tips</SectionTitle>
      <TooltipSample id="action-gather" title="Cave gather (gain)">
        <CaveGatherTip state={state} />
      </TooltipSample>
      <TooltipSample id="action-build" title="Village build">
        <VillageBuildTip state={state} />
      </TooltipSample>
      <TooltipSample id="action-expedition" title="Forest expedition">
        <ForestExpeditionTip state={state} />
      </TooltipSample>
      <TooltipSample id="action-finance" title="Finance expedition (nowrap effects)">
        <FinanceExpeditionTip state={state} />
      </TooltipSample>
      <TooltipSample id="action-feed-fire" title="Feed Fire (cost only)">
        <FeedFireTip state={state} />
      </TooltipSample>
      <TooltipSample id="action-heal" title="Bastion heal (cost only)">
        <NowrapCostTip actionId="healRestlessKnight" state={state} />
      </TooltipSample>
      <TooltipSample id="action-repair" title="Bastion repair (cost only)">
        <NowrapCostTip actionId="repairBastion" state={state} />
      </TooltipSample>
      <TooltipSample id="action-provoke" title="Provoke attack (cost only)">
        <NowrapCostTip actionId="provokeAttackWave" state={state} />
      </TooltipSample>

      <SectionTitle>Events and trades</SectionTitle>
      <TooltipSample id="event-choice" title="Event choice (nowrap + success)">
        <BlackRotTip state={state} />
      </TooltipSample>
      <TooltipSample id="event-time-bonus" title="Event: knowledge time">
        <KnowledgeTimeTip state={state} />
      </TooltipSample>
      <TooltipSample id="merchant-discount" title="Merchant discount">
        <MerchantDiscountTip state={state} />
      </TooltipSample>
      <TooltipSample id="merchant-item" title="Merchant item (cost, effects, text)">
        <MerchantItemTip state={state} />
      </TooltipSample>
      <TooltipSample id="collector-item" title="Wandering collector item">
        {composeCollectorItemTooltip("buy_fang_charm")}
      </TooltipSample>

      <SectionTitle>Insight purchases</SectionTitle>
      <CostBenefitSamples state={state} />

      <SectionTitle>Items, buildings, combat</SectionTitle>
      <TooltipSample id="item-weapon" title="Weapon (title, effects, text)">
        {renderItemTooltip("iron_sword", "weapon")}
      </TooltipSample>
      <TooltipSample id="item-weapon-side" title="Weapon, side list (no title)">
        {renderItemTooltip(
          "nightshade_bow",
          "weapon",
          undefined,
          SIDE_PANEL_ITEM_TOOLTIP_DISPLAY,
        )}
      </TooltipSample>
      <TooltipSample id="item-tool" title="Tool unlock">
        {renderItemTooltip(
          "stone_axe",
          "tool",
          undefined,
          SIDE_PANEL_ITEM_TOOLTIP_DISPLAY,
        )}
      </TooltipSample>
      <TooltipSample id="item-book" title="Book">
        {renderItemTooltip(
          "book_of_ascension",
          "book",
          undefined,
          SIDE_PANEL_ITEM_TOOLTIP_DISPLAY,
        )}
      </TooltipSample>
      <TooltipSample id="item-fellowship" title="Fellowship">
        {renderItemTooltip("grey_one", "fellowship")}
      </TooltipSample>
      <TooltipSample id="item-building" title="Building">
        {renderItemTooltip(
          "woodenHut",
          "building",
          undefined,
          SIDE_PANEL_ITEM_TOOLTIP_DISPLAY,
        )}
      </TooltipSample>
      <TooltipSample id="item-fort" title="Fortification">
        {renderFortificationTooltip(
          "bastion",
          undefined,
          SIDE_PANEL_ITEM_TOOLTIP_DISPLAY,
        )}
      </TooltipSample>
      <TooltipSample id="item-bomb" title="Combat item">
        {renderItemTooltip(
          "ember_bomb",
          "weapon",
          undefined,
          SIDE_PANEL_ITEM_TOOLTIP_DISPLAY,
        )}
      </TooltipSample>

      <SectionTitle>Side list</SectionTitle>
      <TooltipSample id="job-gatherer" title="Job production">
        <JobProductionTooltip jobId="gatherer" />
      </TooltipSample>
      <TooltipSample id="job-scholar" title="Job production (scholar)">
        <JobProductionTooltip jobId="scholar" />
      </TooltipSample>
      <TooltipSample id="flow-food" title="Resource flow">
        <ResourceFlowTooltip resourceId="food" />
      </TooltipSample>
      <TooltipSample id="flow-wood" title="Resource flow (wood)">
        <ResourceFlowTooltip resourceId="wood" />
      </TooltipSample>
      <TooltipSample id="stat-luck" title="Stat: luck">
        <StatTip statKey="luck" flavorKey="sidePanel.statLuckTooltip" />
      </TooltipSample>
      <TooltipSample id="stat-strength" title="Stat: strength">
        <StatTip statKey="strength" flavorKey="sidePanel.statStrengthTooltip" />
      </TooltipSample>
      <TooltipSample id="stat-knowledge" title="Stat: knowledge">
        <StatTip
          statKey="knowledge"
          flavorKey="sidePanel.statKnowledgeTooltip"
        />
      </TooltipSample>
      <TooltipSample id="stat-madness" title="Stat: madness">
        <StatTip statKey="madness" flavorKey="sidePanel.statMadnessTooltip" />
      </TooltipSample>
      <TooltipSample id="bonus-production" title="Bonus composition">
        <BonusCompositionTooltip bonusId="villagerProductionBonus" />
      </TooltipSample>
      <TooltipSample id="bonus-craft" title="Bonus composition (craft)">
        <BonusCompositionTooltip bonusId="craftingCostReduction" />
      </TooltipSample>

      <SectionTitle>Header, badges, shop, menu</SectionTitle>
      <TooltipSample id="header-cycle" title="Header: production cycle">
        <ProductionCycleTip state={state} />
      </TooltipSample>
      <TooltipSample id="header-heartfire" title="Header: heartfire">
        {heartfire}
      </TooltipSample>
      <TooltipSample
        id="badge-level"
        title="Level badge"
      >
        <LevelBadgeTip />
      </TooltipSample>
      <TooltipSample
        id="badge-prior"
        title="Prior badge"
      >
        {t("badges.priorUpgradeRequired")}
      </TooltipSample>
      <TooltipSample
        id="badge-prior-assign"
        title="Prior badge (assign)"
      >
        {t("badges.priorAssign")}
      </TooltipSample>
      <TooltipSample id="achievement-locked" title="Achievement tab locked">
        {t("achievements.notUnlocked")}
      </TooltipSample>
      <TooltipSample id="menu-invite" title="Menu: invite friends">
        <InviteFriendsTooltip count={2} />
      </TooltipSample>
      <TooltipSample id="invest-info" title="Invest info">
        <InvestTip />
      </TooltipSample>
      <TooltipSample
        id="shop-cruel"
        title="Shop: Cruel Mode"
        className={TOOLTIP_ACCENT_SHOP_CLASS}
      >
        <CruelModeEffectsList />
      </TooltipSample>
      <TooltipSample
        id="shop-compass"
        title="Shop: narrow artifact"
        className={TOOLTIP_ACCENT_SHOP_CLASS}
      >
        <div>
          {resolveShopItemDescription(SHOP_ITEMS.tarnished_compass)}
        </div>
      </TooltipSample>
      <ShopDiscountTips />
    </div>
  );
}
