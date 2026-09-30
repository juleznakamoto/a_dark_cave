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
import { getMaxPopulation } from "@/game/population";
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

/** In-flight timers for delayed villager-cap Insight upgrades (one per group). */
const villagerCapUpgradeTimers = new Map<
  VillagerCapGroupId,
  ReturnType<typeof setTimeout>
>();

export const createVillagersSlice: GameStoreCreator<Partial<GameStore>> = (set, get) => ({
  assignVillager: (job: keyof GameState["villagers"], count: number = 1) => {
    if (isDemoPlayFrozen(get())) return;
    set((state) => {
      const updates = assignVillagerToJob(state, job, count);
      if (Object.keys(updates).length > 0) {
        StateManager.schedulePopulationUpdate(get);
      }
      return updates;
    });
  },

  unassignVillager: (job: keyof GameState["villagers"], count: number = 1) => {
    if (isDemoPlayFrozen(get())) return;
    set((state) => {
      const updates = unassignVillagerFromJob(state, job, count);
      if (Object.keys(updates).length > 0) {
        StateManager.schedulePopulationUpdate(get);
      }
      return updates;
    });
  },

  setActivePresetSlot: (slot: number) => {
    if (slot < 1 || slot > MAX_PRESET_SLOTS) return;
    set({ activePresetSlot: slot });
  },

  saveVillagerJobPreset: (slot: number) => {
    const state = get();
    if (isDemoPlayFrozen(state)) return false;
    const slotIndex = slot - 1;
    if (!isPresetSlotUnlocked(state, slotIndex)) return false;

    const presets = [...(state.villagerJobPresets ?? [])];
    while (presets.length < MAX_PRESET_SLOTS) {
      presets.push(null);
    }
    presets[slotIndex] = {
      assignments: snapshotAssignments(state.villagers),
      savedAt: Date.now(),
    };

    set({ villagerJobPresets: presets, activePresetSlot: slot });
    return true;
  },

  applyVillagerJobPreset: (slot: number) => {
    const state = get();
    if (isDemoPlayFrozen(state)) return;
    const slotIndex = slot - 1;
    if (!isPresetSlotUnlocked(state, slotIndex)) return;

    set({ activePresetSlot: slot });

    const preset = getPresetSlot(state, slotIndex);
    if (!preset) return;

    const updates = applyPresetAssignments(state, preset.assignments);
    if (Object.keys(updates).length > 0) {
      set(updates);
      StateManager.schedulePopulationUpdate(get);
    }
  },

  purchaseVillagerPresetSlot: () => {
    const state = get();
    if (isDemoPlayFrozen(state)) return false;
    if (!canPurchasePresetSlot(state, state.insightRevealing)) return false;

    const slotIndex = getNextPurchasablePresetSlotIndex(state);
    const cost = getNextPresetUnlockCost(state);
    if (slotIndex === null || cost === null) return false;

    const insightBefore = getInsightPurchasedPresetCount(state);
    const nextPurchased = insightBefore + 1;
    const currentIndex = state.activePresetSlot - 1;
    const resourceUpdates = updateResource(state, "insight", -cost);

    // Grant immediately: insightRevealing is UI-only and would lose the unlock on reload.
    const update: Partial<GameState> = {
      ...resourceUpdates,
      villagerPresetsPurchased: nextPurchased,
      insightRevealing: {
        ...(state.insightRevealing ?? {}),
        [PRESET_UNLOCK_INSIGHT_KEY]: Date.now() + INSIGHT_REVEAL_DURATION_MS,
      },
    };
    if (
      !isPresetSlotUnlocked(state, currentIndex) ||
      currentIndex >= nextPurchased
    ) {
      update.activePresetSlot = slotIndex + 1;
    }

    set(update);
    return true;
  },

  purchaseConstructionQueueSlot: () => {
    const state = get();
    if (isDemoPlayFrozen(state)) return false;
    if (!canPurchaseQueueSlot(state, state.insightRevealing)) return false;

    const cost = getNextQueueSlotUnlockCost(state);
    if (cost === null) return false;

    const resourceUpdates = updateResource(state, "insight", -cost);

    // Grant immediately: insightRevealing is UI-only and would lose the unlock on reload.
    set({
      ...resourceUpdates,
      constructionQueueSlotsPurchased: getPurchasedQueueSlots(state) + 1,
      insightRevealing: {
        ...(state.insightRevealing ?? {}),
        [QUEUE_SLOT_UNLOCK_INSIGHT_KEY]: Date.now() + INSIGHT_REVEAL_DURATION_MS,
      },
    });
    return true;
  },

  boostConstruction: (actionId: string) => {
    const state = get();
    if (!canBoostConstruction(state, actionId)) return false;

    const cost = getConstructionBoostCost(state, actionId);
    const reductionSeconds = getConstructionBoostReductionSeconds(
      state,
      actionId,
    );
    const startTime = state.executionStartTimes?.[actionId];
    if (startTime == null || reductionSeconds <= 0) return false;

    const resourceUpdates = updateResource(state, "insight", -cost);

    set({
      ...resourceUpdates,
      executionStartTimes: {
        ...(state.executionStartTimes ?? {}),
        [actionId]: startTime - reductionSeconds * 1000,
      },
      constructionBoostsUsed: {
        ...(state.constructionBoostsUsed ?? {}),
        [actionId]: true,
      },
    });
    return true;
  },

  upgradeVillagerCap: (groupId: string) => {
    const state = get();
    const capGroupId = groupId as VillagerCapGroupId;
    if (!canUpgradeVillagerCap(state, capGroupId)) return false;

    const level = getVillagerCapLevel(state, capGroupId);
    const cost = getNextCapUpgradeCost(level);
    const resourceUpdates = updateResource(state, "insight", -cost);

    set({
      ...resourceUpdates,
      villagerCapUpgrades: {
        ...(state.villagerCapUpgrades ?? {}),
        [capGroupId]: level + 1,
      },
    });
    return true;
  },

  startVillagerCapUpgrade: (groupId: string) => {
    const state = get();
    const capGroupId = groupId as VillagerCapGroupId;
    const revealKey = getVillagerCapUpgradeInsightKey(capGroupId);
    if (!canUpgradeVillagerCap(state, capGroupId)) return false;
    if (isInsightRevealInProgress(revealKey, state.insightRevealing)) {
      return false;
    }

    set({
      insightRevealing: {
        ...(state.insightRevealing ?? {}),
        [revealKey]: Date.now() + INSIGHT_REVEAL_DURATION_MS,
      },
    });

    const existingTimer = villagerCapUpgradeTimers.get(capGroupId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      villagerCapUpgradeTimers.delete(capGroupId);
      get().upgradeVillagerCap(capGroupId);
      const next = { ...(get().insightRevealing ?? {}) };
      delete next[revealKey];
      set({ insightRevealing: next });
    }, INSIGHT_REVEAL_DURATION_MS);
    villagerCapUpgradeTimers.set(capGroupId, timer);
    return true;
  },

  enchantWeapon: (weaponId: string) => {
    const state = get();
    const revealKey = getWeaponEnchantInsightKey(weaponId);
    if (isInsightRevealInProgress(revealKey, state.insightRevealing)) {
      return false;
    }
    if (!canEnchantWeapon(state, weaponId)) return false;

    const cost = getNextEnchantCost(state, weaponId);
    if (cost == null) return false;
    const level = getWeaponEnchantLevel(state, weaponId);
    const resourceUpdates = updateResource(state, "insight", -cost);

    // Grant immediately: insightRevealing is UI-only and would lose the
    // enchant on reload or if the side-panel badge unmounts mid-animation.
    set({
      ...resourceUpdates,
      weaponEnchantments: {
        ...(state.weaponEnchantments ?? {}),
        [weaponId]: level + 1,
      },
      insightRevealing: {
        ...(state.insightRevealing ?? {}),
        [revealKey]: Date.now() + INSIGHT_REVEAL_DURATION_MS,
      },
    });
    StateManager.scheduleEffectsUpdate(get);
    return true;
  },

  absolveItem: (itemId: string) => {
    const state = get();
    const revealKey = getItemAbsolveInsightKey(itemId);
    if (isInsightRevealInProgress(revealKey, state.insightRevealing)) {
      return false;
    }
    if (!canAbsolveItem(state, itemId)) return false;

    const resourceUpdates = updateResource(
      state,
      "insight",
      -ABSOLUTION_INSIGHT_COST,
    );

    // Grant immediately: insightRevealing is UI-only and would lose the
    // cleanse on reload or if the side-panel badge unmounts mid-animation.
    set({
      ...resourceUpdates,
      absolvedItems: {
        ...(state.absolvedItems ?? {}),
        [itemId]: true,
      },
      insightRevealing: {
        ...(state.insightRevealing ?? {}),
        [revealKey]: Date.now() + INSIGHT_REVEAL_DURATION_MS,
      },
    });
    StateManager.scheduleEffectsUpdate(get);
    return true;
  },

  getMaxPopulation: () => {
    const state = get();
    return getMaxPopulation(state);
  },

  updatePopulation: () => {
    set((state) => {
      const clampPatch = clampVillagersToHousingCap(state);
      const next = clampPatch ? { ...state, ...clampPatch } : state;
      const updates = updatePopulationCounts(next);

      return {
        ...state,
        ...clampPatch,
        ...updates,
      };
    });
  },
});
