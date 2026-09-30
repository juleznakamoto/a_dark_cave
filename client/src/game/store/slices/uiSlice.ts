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

export const createUiSlice: GameStoreCreator<Partial<GameStore>> = (set, get) => ({
  unlockAchievement: (achievementId) =>
    set((state) => ({
      unlockedAchievements: state.unlockedAchievements.includes(achievementId)
        ? state.unlockedAchievements
        : [...state.unlockedAchievements, achievementId],
    })),

  revealAchievementTitle: (achievementId, currentCount) => {
    const state = get();
    if (!canRevealAchievementTitle(state, achievementId, currentCount, state.insightRevealing)) {
      return false;
    }

    const resourceUpdates = updateResource(
      state,
      "insight",
      -getAchievementTitleInsightCost(achievementId),
    );
    const alreadyRevealed = (state.revealedAchievementTitles ?? []).includes(
      achievementId,
    );
    // Grant immediately: insightRevealing is UI-only and would lose the unlock on reload.
    // The panel keeps the redacted layout until the reveal key clears.
    set({
      ...resourceUpdates,
      revealedAchievementTitles: alreadyRevealed
        ? state.revealedAchievementTitles
        : [...(state.revealedAchievementTitles ?? []), achievementId],
      insightRevealing: {
        ...(state.insightRevealing ?? {}),
        [getAchievementTitleInsightKey(achievementId)]:
          Date.now() + INSIGHT_REVEAL_DURATION_MS,
      },
    });
    return true;
  },

  // Leaderboard
  username: undefined,
  setUsername: (username: string) => set({ username }),

  setActiveTab: (tab: GameTab) => set({ activeTab: tab }),

  setPanelSize: (key: keyof GameState["panelSizes"], px: number | null) =>
    set((state) => ({
      panelSizes: { ...state.panelSizes, [key]: px },
    })),

  setMusicMuted: (muted: boolean) => set({ musicMuted: muted }),
  setSfxMuted: (muted: boolean) => set({ sfxMuted: muted }),
  setMusicVolume: (volume: number) =>
    set({ musicVolume: Math.max(0, Math.min(1, volume)) }),
  setSfxVolume: (volume: number) =>
    set({ sfxVolume: Math.max(0, Math.min(1, volume)) }),
  setSignUpPromptEligibleForGold: (eligible: boolean) =>
    set({ signUpPromptEligibleForGold: eligible }),
  setSocialPromptDialogOpen: (isOpen: boolean) =>
    set({ socialPromptDialogOpen: isOpen }),
  setHighlightedResources: (resources: string[]) => {
    // Updated type
    set({ highlightedResources: resources });
  },
  emitResourceChange: (resource: string, amount: number) => {
    if (amount === 0) return;
    set((state) => ({
      resourceChangeEvents: [
        ...(state.resourceChangeEvents ?? []),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          resource,
          amount,
          timestamp: Date.now(),
        },
      ].slice(-50),
    }));
  },
  setIsUserSignedIn: (signedIn: boolean) => set({ isUserSignedIn: signedIn }),
  setDevMultipliers: (enabled: boolean) =>
    set({
      devMultipliers: enabled,
      devMode: resolveDevMode(enabled),
    }),
  applyAccountSteamMode: (enabled: boolean) => {
    if (isSteamBuild) {
      set({ accountSteamMode: enabled });
      return;
    }
    if (enabled) {
      setDevGameModeOverride("steamGame");
      set({
        accountSteamMode: true,
        devGameMode: "steamGame",
        shopDialogOpen: false,
        shopCheckoutItemId: null,
      });
      return;
    }
    if (import.meta.env.DEV) {
      set({ accountSteamMode: false });
      return;
    }
    set({
      accountSteamMode: false,
      devGameMode: "normal",
    });
  },
  setDetectedCurrency: (currency: "EUR" | "USD") =>
    set({ detectedCurrency: currency }),

  updateResource: (
    resource: keyof GameState["resources"],
    amount: number,
    options?: { allowOvercap?: boolean },
  ) => {
    // Soft storage constraints by default; pass allowOvercap for reward grants
    set((state) => updateResource(state, resource, amount, options));

    // If updating free villagers, update population counts immediately
    if (resource === ("free" as any)) {
      setTimeout(() => get().updatePopulation(), 0);
    }
  },

  setFlag: (flag: keyof GameState["flags"], value: boolean) => {
    logger.log(`[STATE] Set Flag: ${flag} = ${value}`);

    set((state) => updateFlag(state, flag, value));
  },

  setHoveredTooltip: (tooltipId: string, value: boolean) => {
    set((state) => ({
      hoveredTooltips: {
        ...state.hoveredTooltips,
        [tooltipId]: value,
      },
    }));
  },

  setScrollIndicatorSeen: (scrollAreaId: string) => {
    set((state) => ({
      scrollIndicatorSeen: {
        ...(state.scrollIndicatorSeen || {}),
        [scrollAreaId]: true,
      },
    }));
  },

  toggleDevMode: () => {
    // Dev mode is controlled by NODE_ENV - no-op in production
  },

  setVillageMapOverride: () => { },

  setVillageMapPathOverride: () => { },

  setVillageMapSeenTiers: (tiers: Record<string, number>) => {
    set({ villageMapSeenTiers: tiers });
  },

  setSettingsDialogOpen: (isOpen: boolean) => {
    set({ settingsDialogOpen: isOpen });
  },

  setDevGameMode: (mode: DevGameMode) => {
    if (!import.meta.env.DEV || isSteamBuild) return;
    setDevGameModeOverride(mode);
    if (mode !== "normal") {
      set({
        devGameMode: mode,
        shopDialogOpen: false,
        shopCheckoutItemId: null,
        authDialogOpen: false,
        shareDialogOpen: false,
        leaderboardDialogOpen: false,
        deleteAccountDialogOpen: false,
        socialPromptDialogOpen: false,
        galaxyTimeUpDialogOpen: mode === "demoEnd",
        demoEndDialogDismissed: false,
        ...(mode === "demoEnd" || isSteamEndScreenDevMode(mode)
          ? { settingsDialogOpen: false }
          : {}),
      });
    } else {
      set({
        devGameMode: "normal",
        galaxyTimeUpDialogOpen: false,
        demoEndDialogDismissed: false,
      });
    }
  },
});
