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

export const createLoopSlice: GameStoreCreator<Partial<GameStore>> = (set, get) => ({
  trackButtonClick: (buttonId: string) => {
    set((state) => ({
      clickAnalytics: {
        ...state.clickAnalytics,
        [buttonId]: (state.clickAnalytics[buttonId] || 0) + 1,
      },
    }));
  },

  getAndResetClickAnalytics: () => {
    const state = get();
    const clicks = state.clickAnalytics;
    // Only return if there are clicks to report
    if (Object.keys(clicks).length === 0) {
      return null;
    }

    // Reset the analytics
    set({ clickAnalytics: {} });

    // Return raw click data - the database will handle bucketing based on playTime
    return clicks;
  },

  getAndResetResourceAnalytics: () => {
    const state = get();
    const currentTime = state.playTime || 0;

    // Only create snapshot if enough time has passed (at least 1 minute)
    const timeSinceLastSnapshot = currentTime - state.lastResourceSnapshotTime;
    if (timeSinceLastSnapshot < 60000) {
      return null;
    }

    // Create snapshot of current resources AND stats
    const snapshot: Record<string, number> = {};
    const resources = state.resources || {};
    const stats = state.stats || {};

    // Add ALL resources to snapshot (including zero values for complete snapshot)
    for (const [key, value] of Object.entries(resources)) {
      if (typeof value === "number") {
        snapshot[key] = value;
      }
    }

    // Add stats to snapshot (luck, strength, knowledge, madness)
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === "number") {
        snapshot[key] = value;
      }
    }

    // Update last snapshot time
    set({ lastResourceSnapshotTime: currentTime });

    // Return raw snapshot data - the database will handle bucketing based on playTime
    return snapshot;
  },

  updateEffects: () => {
    set((state) => ({
      effects: calculateTotalEffects(state),
    }));
  },

  updateBastionStats: () => {
    set((state) => ({
      bastion_stats: calculateBastionStats(state),
    }));
  },

  updateStats: () => {
    set((state) => {
      const calculatedLuck = getTotalLuck(state);
      const calculatedStrength = getTotalStrength(state);
      const calculatedKnowledge = getTotalKnowledge(state);
      const calculatedMadness = getTotalMadness(state);

      const newStats = {
        ...state.stats,
        luck: calculatedLuck,
        strength: calculatedStrength,
        knowledge: calculatedKnowledge,
        madness: calculatedMadness,
      };

      return {
        stats: newStats,
      };
    });
  },

  updateLoopProgress: (progress: number) => {
    set((state) => ({
      loopProgress: progress,
    }));
  },

  setGameLoopActive: (isActive: boolean) => {
    set((state) => ({
      isGameLoopActive: isActive,
    }));
  },

  togglePause: () => {
    set((state) => {
      const newState = {
        isPaused: !state.isPaused,
        loopProgress: 0, // Always reset loop progress when toggling pause
      };
      // Update isPausedPreviously to reflect the state *before* toggling
      // This is crucial for the game loop to know when to resume playTime updates
      newState.isPausedPreviously = state.isPaused;
      return newState;
    });
  },

  updatePlayTime: (deltaTime: number) => {
    set((state) => {
      // Only update playTime if the game is NOT paused and was NOT previously paused
      // This prevents playTime from incrementing during pauses or inactivity
      if (!state.isPaused && !state.isPausedPreviously) {
        return {
          playTime: state.playTime + deltaTime,
          lifetimePlayTimeMs: (state.lifetimePlayTimeMs || 0) + deltaTime,
        };
      }
      // Same-reference no-op so Zustand does not notify subscribers.
      return state;
    });
  },

  updateFocusState: (partial) => {
    if (isDemoPlayFrozen(get())) return;
    set((state) => ({
      focusState: {
        ...state.focusState,
        ...partial,
      },
    }));
  },

  updateResources: (updates) => {
    set((state) => {
      const cappedUpdates: Partial<GameState["resources"]> = {};

      // Soft storage cap: block gains past limit, preserve event overcap
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === "number") {
          const resourceKey = key as keyof GameState["resources"];
          const previousAmount = state.resources[resourceKey] ?? 0;
          cappedUpdates[resourceKey] = constrainResourceAmount(
            key,
            value,
            state,
            { previousAmount },
          );
        }
      }

      return {
        resources: {
          ...state.resources,
          ...cappedUpdates,
        },
      };
    });
  },
});
