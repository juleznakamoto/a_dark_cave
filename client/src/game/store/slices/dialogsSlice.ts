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

export const createDialogsSlice: GameStoreCreator<Partial<GameStore>> = (set, get) => ({
  resumePendingModalEventDialog: () => {
    set((state) => ({
      ...state,
      ...getPendingModalEventDialogResume(state),
    }));
  },

  setEventDialog: (isOpen: boolean, currentEvent?: LogEntry) => {
    if (isOpen && currentEvent) {
      const store = get();
      const eventAlreadyShowing = Boolean(
        store.eventDialog.isOpen && store.eventDialog.currentEvent,
      );
      // Queue behind an already-open event instead of replacing it. Outcome
      // follow-ups close first, then reopen during the handoff gap.
      if (eventAlreadyShowing || isVisibleModalDialogOpen(store)) {
        scheduleEventDialogWhenClear(get, set, currentEvent, 0);
        return;
      }
      openEventDialogNow(set, currentEvent);
      return;
    }

    set((state) => ({
      ...state,
      pendingModalEvent: isOpen
        ? state.pendingModalEvent
        : null,
      eventDialog: {
        isOpen,
        currentEvent: currentEvent || null,
        // Closing starts EVENT_DIALOG_MIN_GAP_MS before the next random dialog event.
        lastEndedAt:
          !isOpen && state.eventDialog.isOpen
            ? Date.now()
            : (state.eventDialog.lastEndedAt ?? 0),
      },
    }));
  },

  setCombatDialog: (isOpen: boolean, data?: any) => {
    set((state) => ({
      ...state,
      combatDialog: {
        isOpen,
        enemy: data?.enemy || null,
        eventTitle: data?.eventTitle || "",
        eventMessage: data?.eventMessage || "",
        onVictory: data?.onVictory || null,
        onDefeat: data?.onDefeat || null,
      },
    }));
  },

  setAuthDialogOpen: (isOpen: boolean) => {
    set({ authDialogOpen: isOpen });
  },

  setShopDialogOpen: (isOpen, source) => {
    const prev = get().shopDialogOpen;
    if (isOpen && !prev) {
      // Analytics (button_clicks); traderDialogOpens stays for event gates.
      get().trackButtonClick(
        source ? shopOpenButtonId(source) : "shop-open-unknown",
      );
      set((s) => ({
        shopDialogOpen: true,
        traderDialogOpens: (s.traderDialogOpens ?? 0) + 1,
      }));
    } else {
      set({
        shopDialogOpen: isOpen,
        ...(!isOpen
          ? { shopCruelModeHighlight: false, shopFilter: null }
          : {}),
      });
    }
  },

  setShopCruelModeHighlight: (highlight: boolean) => {
    set({ shopCruelModeHighlight: highlight });
  },

  setShopFilter: (filter) => {
    set({ shopFilter: filter });
  },

  recordCompletePurchaseDialogOpen: () => {
    set((s) => ({
      completePurchaseDialogOpens: (s.completePurchaseDialogOpens ?? 0) + 1,
    }));
  },

  setGamblerDiceDialogOpen: (isOpen: boolean) => {
    set({ gamblerDiceDialogOpen: isOpen });
  },

  setBlessingOfferDialogOpen: (isOpen: boolean) => {
    set({ blessingOfferDialogOpen: isOpen });
  },

  setInvestDialogOpen: (isOpen: boolean) => {
    if (isOpen && isDemoPlayFrozen(get())) return;
    set({ investDialogOpen: isOpen });
  },

  setInvestmentResultDialog: (isOpen, data) => {
    set(() => ({
      investmentResultDialog: {
        isOpen,
        data: data ?? null,
      },
    }));
  },

  setLeaderboardDialogOpen: (isOpen: boolean) => {
    set({ leaderboardDialogOpen: isOpen });
  },

  setShareDialogOpen: (isOpen: boolean) => {
    set({ shareDialogOpen: isOpen });
  },

  setGalaxyTimeUpDialogOpen: (isOpen: boolean) => {
    set({
      galaxyTimeUpDialogOpen: isOpen,
      ...(isOpen ? { demoEndDialogDismissed: false } : {}),
    });
  },

  dismissDemoEndDialog: () => {
    set({ galaxyTimeUpDialogOpen: false, demoEndDialogDismissed: true });
  },

  setShopCheckoutItemId: (itemId: string | null) => {
    set({ shopCheckoutItemId: itemId });
  },

  setIdleModeDialog: (isOpen: boolean) => {
    if (isOpen && isDemoPlayFrozen(get())) return;
    set((state) => ({
      idleModeDialog: {
        isOpen,
      },
    }));
  },

  setRestartGameDialogOpen: (
    isOpen: boolean,
    options?: { preferCruelMode?: boolean },
  ) => {
    set({
      restartGameDialogOpen: isOpen,
      restartGamePreferCruelMode: isOpen
        ? options?.preferCruelMode === true
        : false,
    });
  },

  setDeleteAccountDialogOpen: (isOpen: boolean) => {
    set({ deleteAccountDialogOpen: isOpen });
  },

  setRewardDialog: (isOpen, data) => {
    if (isOpen && data) {
      const store = get();
      if (store.rewardDialog.isOpen) {
        scheduleRewardDialogWhenClear(get, data, 0);
        return;
      }
    }

    set(() => ({
      rewardDialog: {
        isOpen,
        data: data || null,
      },
      ...(isOpen ? { dialogHandoffPending: false } : {}),
    }));
  },
  setMadnessDialog: (isOpen, data) => {
    if (isOpen && data) {
      const store = get();
      // Any visible modal (including this dialog already open): queue like setRewardDialog.
      if (isVisibleModalDialogOpen(store)) {
        scheduleMadnessDialogWhenClear(get, data, 0);
        return;
      }
    }

    set(() => ({
      madnessDialog: {
        isOpen,
        data: data || null,
      },
      ...(isOpen ? { dialogHandoffPending: false } : {}),
    }));
  },
  setInsightPotionDialog: (isOpen, data) => {
    if (isOpen && data) {
      const store = get();
      if (isVisibleModalDialogOpen(store)) {
        scheduleInsightPotionDialogWhenClear(get, data, 0);
        return;
      }
    }

    set(() => ({
      insightPotionDialog: {
        isOpen,
        data: data || null,
      },
      ...(isOpen ? { dialogHandoffPending: false } : {}),
    }));
  },
  setVillageEffectDialog: (isOpen, data) => {
    if (isOpen && data) {
      const store = get();
      if (isVisibleModalDialogOpen(store)) {
        scheduleVillageEffectDialogWhenClear(get, data, 0);
        return;
      }
    }

    set(() => ({
      villageEffectDialog: {
        isOpen,
        data: data ?? null,
      },
      ...(isOpen ? { dialogHandoffPending: false } : {}),
    }));
  },
});
