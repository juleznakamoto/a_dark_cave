import type { GameStore } from "../types";
import type { GameStoreCreator } from "./types";
import { GameState } from "@shared/schema";
import { pruneReadLogIds } from "@/game/persistedStateBoundary";
import {
  isFullGameUnlockedEdition,
  isLocalOnlyEdition,
  isSteamBuild,
  isSteamEditionActive,
  isSteamEndScreenDevMode,
  getDevGameModeOverride,
  setDevGameModeOverride,
  type DevGameMode,
} from "@/lib/edition";
import { resolveDevMode } from "@/game/devMultipliers";
import { isDemoPlayFrozen } from "@/game/demoLimit";
import { gameActions, shouldShowAction, canExecuteAction } from "@/game/rules";
import {
  EventManager,
  LogEntry,
  gameEvents,
  getEventCatalogIdByEventId,
  getEventI18nVars,
  getPendingModalEventDialogResume,
  snapshotPendingModalEvent,
} from "@/game/rules/events";
import { checkMilestoneLogEntries } from "@/game/rules/eventLogEntries";
import {
  executeGameAction,
  deductActionCosts,
  buildExecutionSpendSnapshot,
} from "@/game/actions";
import type {
  GameTab,
  FocusState,
  ActionResult,
  CombatResultSummary,
} from "@/game/types";
import {
  updateResource,
  updateFlag,
  updatePopulationCounts,
  clampVillagersToHousingCap,
  assignVillagerToJob,
  unassignVillagerFromJob,
  mergeCombatVictoryState,
  mergeCombatDefeatState,
  extractCombatResultSummary,
  applyGameStateLoadMigrations,
  getTransientDialogResetOnLoad,
  hydrateLoadedGameState,
  markSeenResources,
  isCompletedOneShotExecutionGhost,
} from "@/game/stateHelpers";
import { constrainResourceAmount } from "@/game/resourceLimits";
import { actionAllowsResourceOvercap } from "@/game/resourceOvercapGrants";
import {
  resolveVillageEffectAnnouncementTheme,
  type VillageEffectDialogData,
} from "@/game/villageEffectThemes";
import {
  computePersistedSocialTaskResources,
  computePersistedSocialTasksGold,
} from "@/game/socialTasksGold";
import { getLifetimeGamesWonFromSave } from "@/game/winAchievements";
import {
  canRevealAchievementTitle,
  getInsightAmount,
  getAchievementTitleInsightCost,
  getAchievementTitleInsightKey,
  parseAchievementTitleInsightKey,
  getItemAbsolveInsightKey,
  getWeaponEnchantInsightKey,
  ITEM_ABSOLVE_INSIGHT_KEY_PREFIX,
  WEAPON_ENCHANT_INSIGHT_KEY_PREFIX,
  INSIGHT_REVEAL_DURATION_MS,
  STAT_INSIGHT_REVEAL_KEY,
  BUILDING_DESCRIPTIONS_INSIGHT_KEY,
  CRAFT_DESCRIPTIONS_INSIGHT_KEY,
  TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
  TIMED_EVENT_TAB_PROLONG_MS,
  TIMED_EVENT_INSIGHT_PROLONG_KEY,
  PRESET_UNLOCK_INSIGHT_KEY,
  canProlongTimedEventTab,
  isInsightRevealInProgress,
} from "@/game/rules/insightReveal";
import {
  getInsightBlessingCost,
  getVisibleInsightBlessingOffers,
  isInsightBlessingId,
  purchaseInsightBlessingFromOffer,
} from "@/game/rules/insightBlessings";
import {
  calculateTotalEffects,
  getMadnessComponents,
  getTotalLuck,
  getTotalStrength,
  getTotalKnowledge,
  getTotalMadness,
} from "@/game/rules/effectsCalculation";
import { calculateBastionStats } from "@/game/bastionStats";
import { getCurrentPopulation, getMaxPopulation } from "@/game/population";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import { BLOOD_MOON_EVENT_ID } from "@/game/bloodMoonOverlay";
import { GAME_CONSTANTS, getCallMerchantGoldCost } from "@/game/constants";
import { socialPromptMilestoneFloorFromPlayTime } from "@/game/socialPromptAuto";
import {
  ACTION_TO_UPGRADE_KEY,
  incrementButtonUsage,
  isPriorActionEligible,
} from "@/game/buttonUpgrades";
import { getExecutionTime } from "@/game/rules";
import {
  gamblerDiceResumeOnLoad,
  getGamblerTutorialPlaysRemaining,
  GAMBLER_EVENT_SEEN_KEY,
} from "@/game/gamblerSession";
import { logger } from "@/lib/logger";
import { isGameTabHidden } from "@/lib/tabVisibility";
import {
  shopOpenButtonId,
  type ShopOpenSource,
} from "@/game/shopOpenSource";
import { madnessEvents } from "@/game/rules/eventsMadness";
import { resetMadnessLevelLogBaseline } from "@/game/madnessLevelLog";
import { DISGRACED_PRIOR_UPGRADES } from "@/game/rules/skillUpgrades";
import {
  canUpgradeVillagerCap,
  getNextCapUpgradeCost,
  getVillagerCapLevel,
  getVillagerCapUpgradeInsightKey,
  type VillagerCapGroupId,
} from "@/game/villagerCapUpgrades";
import {
  MAX_PRESET_SLOTS,
  LEGACY_SHOP_PRESET_SLOTS,
  applyPresetAssignments,
  canPurchasePresetSlot,
  getInsightPurchasedPresetCount,
  getNextPresetUnlockCost,
  getNextPurchasablePresetSlotIndex,
  getPresetSlot,
  getFirstUnlockedPresetSlotIndex,
  isPresetSlotUnlocked,
  snapshotAssignments,
} from "@/game/villagerJobPresets";
import {
  canBoostConstruction,
  getConstructionBoostCost,
  getConstructionBoostReductionSeconds,
  canPurchaseQueueSlot,
  getPurchasedQueueSlots,
  getNextQueueSlotUnlockCost,
  QUEUE_SLOT_UNLOCK_INSIGHT_KEY,
  LEGACY_SHOP_QUEUE_SLOTS,
} from "@/game/constructionQueueSlots";
import {
  canEnchantWeapon,
  getNextEnchantCost,
  getWeaponEnchantLevel,
} from "@/game/weaponEnchantments";
import {
  ABSOLUTION_INSIGHT_COST,
  canAbsolveItem,
} from "@/game/itemAbsolution";
import {
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
import {
  generateMerchantChoices,
  merchantEvents,
} from "@/game/rules/eventsMerchant";
import {
  isCollectorLeaveChoiceId,
  isCollectorTradeChoiceId,
} from "@/game/rules/eventsWanderingCollector";
import {
  buildInvestmentResultDialogPayload,
  commitInvestmentRolls,
  getInvestmentCompletionLogMeta,
  generateInvestmentOffers,
  getMaxInvestmentStake,
  getInvestmentWaveGapMs,
  investmentHallLuckyChanceBonusPct,
} from "@/game/rules/investmentHallTables";
import {
  getActionLabel,
  getEventLogMessageByFallback,
  getEventsCatalogText,
  resolveEventLogMessage,
  tWithFallback,
} from "@/i18n/resolveGameText";
import { hasLogEntryText } from "@/i18n/logDisplay";
import {
  detectRewards,
  rewardPayloadHasPositiveChanges,
  rewardPayloadHasOutcomeLosses,
  mergeRewardPayloads,
  rewardDialogActions,
  rewardDialogVillageAttackEvents,
  detectMadnessChange,
  resolveEventOutcomeTitle,
  getClarityElixirCaveEventId,
  getCaveWallMarkingsEventId,
} from "../rewards";
import { mergeStateUpdates } from "../mergeStateUpdates";
import { defaultGameState } from "../createInitialState";
import {
  isVisibleModalDialogOpen,
  isModalDialogOpen,
  scheduleMadnessDialogWhenClear,
  scheduleInsightPotionDialogWhenClear,
  scheduleVillageEffectDialogWhenClear,
  scheduleMadnessDialogAfterCombat,
  beginDialogHandoff,
  openEventDialogNow,
  scheduleEventDialogWhenClear,
  scheduleRewardDialogWhenClear,
} from "../dialogScheduling";
import { getTimedEventTabCleanupPatch } from "../timedEventTab";
import { StateManager } from "../StateManager";
import { playActionStartSfx } from "../actionSfx";

export const createMerchantSlice: GameStoreCreator<Partial<GameStore>> = (set, get) => ({
  setTimedEventTab: async (isActive: boolean, event?: LogEntry | null, duration?: number) => {
    const catalogId = event
      ? event.eventId || event.id.split("-")[0]
      : null;
    const isBloodMoonEvent = catalogId === BLOOD_MOON_EVENT_ID;

    // Play sound if activating
    if (isActive && event) {
      if (isBloodMoonEvent) {
        // One-shot sting when the timed tab appears (not a looping bed).
        audioManager.playSound("bloodMoon", SOUND_VOLUME.bloodMoon);
      } else {
        const madnessEventIds = Object.keys(madnessEvents);
        const isMadnessEvent = madnessEventIds.includes(catalogId!);
        audioManager.playSound(
          isMadnessEvent ? "eventMadness" : "event",
          isMadnessEvent ? SOUND_VOLUME.eventMadness : SOUND_VOLUME.eventUi,
        );
      }
    }

    // If activating merchant event, use the choices already generated and passed in the event
    if (isActive && event?.id.includes('merchant')) {
      // CRITICAL: Use the choices that were already generated in EventManager.checkEvents
      const choices = event.choices || [];

      logger.log('[MERCHANT TRADES] Setting timed event tab with merchant trades:', {
        eventId: event?.id,
        choicesCount: choices.length,
        duration,
        expiryTime: duration ? Date.now() + duration : 0,
      });

      set((state) => ({
        timedEventTab: {
          isActive,
          event: event || null, // Don't store choices in event
          expiryTime: duration ? Date.now() + duration : 0,
          startTime: Date.now(),
          lastEndedAt: state.timedEventTab?.lastEndedAt ?? 0,
          pauseAccumMs: 0,
          pauseStartedAt: 0,
          insightProlongUsed: false,
        },
        merchantTrades: {
          choices, // SSOT: Use the choices that were already generated
          purchasedIds: [],
        },
      }));
    } else if (!isActive) {
      // If deactivating, clear merchant trades and record when merchant ended (for Call Merchant button)
      logger.log('[MERCHANT TRADES] Clearing merchant trades (deactivating timed tab)');

      set((state) => {
        const currentEvent = state.timedEventTab?.event;
        const wasMerchant = currentEvent?.id?.includes?.("merchant");
        const wasActive = state.timedEventTab?.isActive;
        return {
          ...state,
          timedEventTab: {
            isActive: false,
            event: null,
            expiryTime: 0,
            startTime: undefined,
            // Enforce TIMED_TAB_MIN_GAP_MS before the next random timed-tab spawn.
            lastEndedAt: wasActive ? Date.now() : (state.timedEventTab?.lastEndedAt ?? 0),
            pauseAccumMs: 0,
            pauseStartedAt: 0,
            insightProlongUsed: false,
          },
          blessingOfferDialogOpen: false,
          merchantTrades: {
            choices: [],
            purchasedIds: [],
          },
          ...(wasMerchant && {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                callMerchantLastEndPlayTime: state.playTime ?? 0,
              },
            },
          }),
        };
      });
    } else {
      // Normal activation without merchant
      set((state) => {
        const isGambler =
          !!(isActive && event && event.id.split("-")[0] === "gambler");
        const isCollector =
          !!(isActive && event && event.id.split("-")[0] === "wandering_collector");
        const tutorialLeft = getGamblerTutorialPlaysRemaining(
          state.story?.seen,
        );
        const gamblerRoundsRemaining = isGambler
          ? tutorialLeft > 0
            ? tutorialLeft
            : state.relics?.bone_dice
              ? 2
              : 1
          : undefined;
        const eventChoices = Array.isArray(event?.choices) ? event.choices : [];
        const collectorTradeFlags = isCollector
          ? {
            collectorBuyAvailable: eventChoices.some((c) =>
              c.id.startsWith("buy_"),
            ),
            collectorSellAvailable: eventChoices.some(
              (c) => c.id.startsWith("sell_") && c.id !== "sell_nothing",
            ),
            collectorBuyDone: false,
            collectorSellDone: false,
            collectorBuyChoiceId: undefined,
            collectorSellChoiceId: undefined,
            collectorPendingRewards: undefined,
          }
          : {};
        return {
          timedEventTab: {
            isActive,
            event: event || null,
            expiryTime: isActive && duration ? Date.now() + duration : 0,
            startTime: isActive ? Date.now() : undefined,
            lastEndedAt: state.timedEventTab?.lastEndedAt ?? 0,
            pauseAccumMs: 0,
            pauseStartedAt: 0,
            insightProlongUsed: false,
            ...(gamblerRoundsRemaining != null && { gamblerRoundsRemaining }),
            ...collectorTradeFlags,
          },
          ...(isGambler && {
            story: {
              ...state.story,
              seen: {
                ...state.story?.seen,
                [GAMBLER_EVENT_SEEN_KEY]: true,
              },
            },
          }),
        };
      });
    }
  },

  callMerchant: () => {
    const state = get();
    if (isDemoPlayFrozen(state)) return;
    if ((state.buildings?.tradePost ?? 0) < 1) return;
    if (state.executionStartTimes?.callMerchant) return;

    const usageCount =
      (state.story?.seen?.callMerchantUsageCount as number) || 0;
    const price = getCallMerchantGoldCost(usageCount);

    if ((state.resources?.gold ?? 0) < price) return;
    if (
      state.timedEventTab?.isActive &&
      state.timedEventTab?.event?.id?.includes?.("merchant")
    ) {
      return;
    }
    if (
      state.timedEventTab?.isActive &&
      !state.timedEventTab?.event?.id?.includes?.("merchant")
    ) {
      return;
    }

    const now = Date.now();
    const duration = GAME_CONSTANTS.CALL_MERCHANT_EXECUTION_SECONDS;
    const resourcesAfter = {
      ...state.resources,
      gold: (state.resources?.gold ?? 0) - price,
    };
    const costUpdates = { resources: resourcesAfter };
    const spendSnapshot = buildExecutionSpendSnapshot(
      state,
      costUpdates,
      state.villagers,
      0,
    );

    set({
      resources: resourcesAfter,
      executionStartTimes: { ...state.executionStartTimes, callMerchant: now },
      executionDurations: { ...state.executionDurations, callMerchant: duration },
      executionAbortEligible: {
        ...state.executionAbortEligible,
        callMerchant: true,
      },
      executionSpendSnapshots: {
        ...state.executionSpendSnapshots,
        callMerchant: spendSnapshot,
      },
    });
  },

  finalizeCallMerchant: () => {
    const state = get();
    if ((state.buildings?.tradePost ?? 0) < 1) return;
    if (
      state.timedEventTab?.isActive &&
      state.timedEventTab?.event?.id?.includes?.("merchant")
    ) {
      return;
    }

    const usageCount =
      (state.story?.seen?.callMerchantUsageCount as number) || 0;
    const choices = generateMerchantChoices(state);
    const merchantEvent = merchantEvents.merchant;
    const eventData: LogEntry = {
      id: "merchant",
      message: resolveEventMessage("merchant", merchantEvent.message, state),
      timestamp: Date.now(),
      type: "event",
      title:
        resolveEventTitle("merchant", merchantEvent.title, state) ??
        "Traveling Merchant",
      choices,
    };

    set((s) => ({
      ...s,
      story: {
        ...s.story,
        seen: {
          ...s.story.seen,
          callMerchantUsageCount: usageCount + 1,
        },
      },
    }));

    audioManager.playSound("merchant", SOUND_VOLUME.merchant);
    get().setTimedEventTab(true, eventData, GAME_CONSTANTS.CALL_MERCHANT_VISIT_DURATION_MS);
  },

  tickInvestmentHall: () => {
    let logEntry: LogEntry | null = null;
    set((state) => {
      // Same-reference no-op: `return {}` still makes Zustand assign a new root
      // and notify every subscriber. This runs ~4x/sec from the game loop.
      if (!state.buildings.coinhouse) return state;
      const ih = state.investmentHallState;
      const active = ih.active;
      if (active && state.playTime >= active.endPlayTime) {
        const payout = active.payoutGold;
        const { message, logKey, logVars } =
          getInvestmentCompletionLogMeta(active);
        logEntry = {
          id: `investment-${Date.now()}`,
          message,
          logKey,
          logVars,
          timestamp: Date.now(),
          type: "system",
        };
        return {
          resources: {
            ...state.resources,
            gold: state.resources.gold + payout,
          },
          investmentHallState: {
            ...ih,
            active: null,
            offers: [],
            nextWavePlayTime: state.playTime + getInvestmentWaveGapMs(),
          },
          investmentResultDialog: {
            isOpen: true,
            data: buildInvestmentResultDialogPayload(active),
          },
          ...(active.success && {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                investmentSuccesses:
                  (Number(state.story?.seen?.investmentSuccesses) || 0) + 1,
              },
            },
          }),
        };
      }
      if (
        !active &&
        state.playTime >= ih.nextWavePlayTime &&
        ih.offers.length === 0
      ) {
        return {
          investmentHallState: {
            ...ih,
            offers: generateInvestmentOffers(Math.random),
          },
        };
      }
      return state;
    });
    if (logEntry) {
      get().addLogEntry(logEntry);
    }
  },

  startInvestment: (offerIndex, amountGold) => {
    const state = get();
    if (!state.buildings.coinhouse) {
      return { ok: false, reason: "Build Coinhouse first." };
    }
    const ih = state.investmentHallState;
    if (ih.active) {
      return { ok: false, reason: "An investment is already running." };
    }
    if (state.playTime < ih.nextWavePlayTime) {
      return { ok: false, reason: "Next wave is not ready yet." };
    }
    const offer = ih.offers[offerIndex];
    if (!offer) {
      return { ok: false, reason: "Invalid offer." };
    }
    const maxStake = getMaxInvestmentStake(state);
    if (![100, 500, 1000].includes(amountGold) || amountGold > maxStake) {
      return { ok: false, reason: "Invalid stake amount." };
    }
    if (state.resources.gold < amountGold) {
      return { ok: false, reason: "Not enough gold." };
    }
    const rolled = commitInvestmentRolls({
      playTime: state.playTime,
      amountGold,
      offer,
      luck: state.stats.luck,
      luckyChanceBonusPct: investmentHallLuckyChanceBonusPct(state.buildings),
      rng: Math.random,
      cruelMode: state.cruelMode,
    });
    set((s) => ({
      resources: {
        ...s.resources,
        gold: s.resources.gold - amountGold,
      },
      investmentHallState: {
        ...s.investmentHallState,
        active: rolled.active,
      },
      story: {
        ...s.story,
        seen: {
          ...s.story.seen,
          totalGoldInvested:
            (Number(s.story?.seen?.totalGoldInvested) || 0) + amountGold,
        },
      },
    }));
    return { ok: true };
  },

  chooseInsightBlessing: (blessingId: string) => {
    const state = get();
    if (state.isPaused || !state.blessingOfferDialogOpen) return false;
    if (!isInsightBlessingId(blessingId)) return false;

    const offered = getVisibleInsightBlessingOffers(state);
    if (!offered.includes(blessingId)) return false;
    if (state.blessings?.[blessingId]) return false;

    const cost = getInsightBlessingCost(state);
    if (getInsightAmount(state) < cost) return false;

    const nextOffer = purchaseInsightBlessingFromOffer(state, blessingId);
    const updatedChanges: Partial<GameState> = {
      resources: {
        ...state.resources,
        insight: (state.resources.insight ?? 0) - cost,
      },
      blessings: {
        ...state.blessings,
        [blessingId]: true,
      },
      insightBlessingOfferState: nextOffer,
    };

    const rewards = detectRewards(updatedChanges, state, "insightBlessingOffer");
    const logMessage = resolveEventLogMessage(
      "insightBlessingOffer",
      "outcomeChosen",
    );

    set((prevState) => {
      const mergedUpdates = mergeStateUpdates(prevState, updatedChanges);
      return {
        ...prevState,
        ...mergedUpdates,
        blessingOfferDialogOpen: false,
        ...getTimedEventTabCleanupPatch(prevState.activeTab),
      };
    });

    StateManager.schedulePopulationUpdate(get);
    StateManager.scheduleEffectsUpdate(get);

    if (rewardPayloadHasPositiveChanges(rewards) || logMessage) {
      const title =
        resolveEventTitle("insightBlessingOffer", undefined, state) ||
        tWithFallback("ui", "event.fallbackTitle", "Event");
      beginDialogHandoff(set);
      scheduleRewardDialogWhenClear(
        get,
        {
          rewards,
          successLog: logMessage || undefined,
          variant: "success",
          title,
        },
        200,
      );
    }

    return true;
  },

  grantAdditionalPresetSlots: () => {
    if (isSteamEditionActive()) return;
    set((state) => {
      if (
        (state.villagerPresetSlotsFromShop ?? 0) >= LEGACY_SHOP_PRESET_SLOTS
      ) {
        return {};
      }
      const nextState = {
        ...state,
        villagerPresetSlotsFromShop: LEGACY_SHOP_PRESET_SLOTS,
      };
      const currentIndex = state.activePresetSlot - 1;
      const patch: Partial<GameState> = {
        villagerPresetSlotsFromShop: LEGACY_SHOP_PRESET_SLOTS,
      };
      if (!isPresetSlotUnlocked(nextState, currentIndex)) {
        const first = getFirstUnlockedPresetSlotIndex(nextState);
        if (first !== null) {
          patch.activePresetSlot = first + 1;
        }
      }
      return patch;
    });
  },

  grantAdditionalConstructionQueueSlot: () => {
    if (isSteamEditionActive()) return;
    set((state) => {
      if (
        (state.constructionQueueSlotsFromShop ?? 0) >= LEGACY_SHOP_QUEUE_SLOTS
      ) {
        return {};
      }
      return {
        constructionQueueSlotsFromShop: LEGACY_SHOP_QUEUE_SLOTS,
      };
    });
  },
});
