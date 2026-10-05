import type { GameStore } from "../types";
import type { GameStoreCreator } from "./types";
import { GameState } from "@shared/schema";
import { sanitizeActionUnlockOrder } from "@/game/actionUnlockOrder";
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

export const createLifecycleSlice: GameStoreCreator<Partial<GameStore>> = (set, get) => ({
  initialize: (initialState?: Partial<GameState>) => {
    const stateToSet = initialState
      ? { ...defaultGameState, ...initialState }
      : defaultGameState;

    set((state) => ({
      ...stateToSet,
      activeDevSaveId: null,
      accountSteamMode: false,
      devMultipliers: false,
      devMode: resolveDevMode(false),
      devGameMode: "normal",
      ...getTransientDialogResetOnLoad(),
      ...getTimedEventTabCleanupPatch(state.activeTab),
    }));
    StateManager.scheduleEffectsUpdate(get);
  },

  restartGame: async (options?: { cruelMode?: boolean }) => {
    const state = get();

    // In-place restart returns to StartScreen (gameStarted false) without a full
    // page reload  -  stop gameplay audio/loop so BGM / combat / fire SFX cannot leak.
    audioManager.stopAllSounds();
    try {
      const { stopGameLoop } = await import("@/game/loop");
      stopGameLoop();
    } catch (error) {
      logger.warn("[RESTART] Failed to stop game loop:", error);
    }

    // Check if cruel mode is activated (support both old and new purchase ID formats)
    const explicitCruelMode = options?.cruelMode;
    const isCruelModePurchaseActive = Object.entries(
      state.activatedPurchases || {},
    ).some(
      ([key, value]) =>
        (key === "cruel_mode" || key.startsWith("purchase-cruel_mode-")) &&
        value === true,
    );
    const isCruelModeActive =
      explicitCruelMode !== undefined
        ? explicitCruelMode
        : isCruelModePurchaseActive;

    // Find the cruel mode purchase key to preserve
    const cruelModePurchaseKey = Object.keys(
      state.activatedPurchases || {},
    ).find(
      (key) => key === "cruel_mode" || key.startsWith("purchase-cruel_mode-"),
    );

    // Preserve these across game restarts
    const preserved = {
      // Purchases that persist
      // Steam/Galaxy: keep the `full_game` entitlement sentinel across restarts.
      activatedPurchases: {
        ...(isFullGameUnlockedEdition() ? { full_game: true } : {}),
        ...(isCruelModeActive
          ? { [cruelModePurchaseKey ?? "cruel_mode"]: true }
          : explicitCruelMode === undefined && cruelModePurchaseKey
            ? {
              [cruelModePurchaseKey]:
                state.activatedPurchases?.[cruelModePurchaseKey] || false,
            }
            : {}),
      },
      // Feast activations are reset (cleared) on new game
      feastActivations: {},

      // Referral system (persists forever)
      referrals: state.referrals || [],
      referralCount: state.referralCount || 0,
      referredUsers: state.referredUsers || [],
      referralProcessed: state.referralProcessed === true,
      referralCode: state.referralCode,
      signupWelcomeGoldClaimed: state.signupWelcomeGoldClaimed === true,

      // Social media rewards (persist forever)
      social_media_rewards: state.social_media_rewards || {},

      // Extra villager job preset slots bought in the shop (persist across all games)
      villagerPresetSlotsFromShop: state.villagerPresetSlotsFromShop ?? 0,

      // Extra construction queue slot bought in the shop (persist across all games)
      constructionQueueSlotsFromShop: state.constructionQueueSlotsFromShop ?? 0,

      // Cruel mode status
      cruelMode: isCruelModeActive,

      // Dev Settings → Game Mode (session preference; not persisted to save)
      devGameMode: state.devGameMode,
      activeDevSaveId: null,

      // Preserve meta win flags / lifetime stats across restarts
      hasWonAnyGame: state.hasWonAnyGame || false,
      hasWonNormalGame: state.hasWonNormalGame || false,
      hasWonCruelGame: state.hasWonCruelGame || false,
      hasSpeedrunWin: state.hasSpeedrunWin || false,
      lifetimeGamesWon: state.lifetimeGamesWon || 0,
      villageMapOverrides: state.villageMapOverrides ?? {},
      villageMapPathOverrides: state.villageMapPathOverrides ?? {},
      lifetimePlayTimeMs: state.lifetimePlayTimeMs || 0,
      lifetimeStorageMaxHits: state.lifetimeStorageMaxHits || [],
      lifetimeEstateUpgradeMaxHits: state.lifetimeEstateUpgradeMaxHits || [],
      hasAchievementMaxer: state.hasAchievementMaxer || false,
      originatedFromSteamDemo: state.originatedFromSteamDemo === true,
      steamDemoContinueResolved: state.steamDemoContinueResolved === true,

      // Preserve detected currency across restarts (persists forever)
      detectedCurrency: state.detectedCurrency || null,

      // Preserve Google Ads source across restarts (persists forever)
      googleAdsSource: state.googleAdsSource || null,
      // Preserve first-touch UTM attribution across restarts
      utmAttribution: state.utmAttribution || null,

      // Last hosted feedback-form open (so admin can match a Google Form timestamp)
      lastFeedbackOpenedAt: state.lastFeedbackOpenedAt || 0,
      lastFeedbackOpenedSource: state.lastFeedbackOpenedSource || "",
    };

    // Reset everything else to default
    const resetState = {
      ...defaultGameState,
      ...preserved,
      gameId: `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Generate new gameId on restart

      // UI state
      activeTab: "cave",
      devMultipliers: get().devMultipliers,
      accountSteamMode: get().accountSteamMode,
      devMode: resolveDevMode(get().devMultipliers),
      idleModeDialog: { isOpen: false }, // Explicitly ensure idle mode dialog is closed
      ...getTimedEventTabCleanupPatch(get().activeTab),
      investDialogOpen: false,
      restartGameDialogOpen: false,
      restartGamePreferCruelMode: false,
      deleteAccountDialogOpen: false,
      settingsDialogOpen: false,
      resourceChangeEvents: [],

      // Recalculate derived state
      effects: calculateTotalEffects({ ...defaultGameState, ...preserved }),
      bastion_stats: calculateBastionStats(defaultGameState),

      // Reset population counters explicitly
      current_population: 0,
      total_population: 0,

      // Mark as new game and allow overwriting cloud playTime until cloud accepts
      isNewGame: true,
      startTime: Date.now(),
      playTime: 0,
      allowPlayTimeOverwrite: true,
    };

    const socialTasksGold = computePersistedSocialTasksGold({
      social_media_rewards: preserved.social_media_rewards,
      signupWelcomeGoldClaimed: preserved.signupWelcomeGoldClaimed,
      referrals: preserved.referrals,
    });
    const socialTaskResources = computePersistedSocialTaskResources({
      social_media_rewards: preserved.social_media_rewards,
    });
    const hasSocialTaskResources = Object.values(socialTaskResources).some(
      (amount) => (amount ?? 0) > 0,
    );
    if (socialTasksGold > 0 || hasSocialTaskResources) {
      const resources = { ...resetState.resources };
      if (socialTasksGold > 0) {
        resources.gold = (resources.gold ?? 0) + socialTasksGold;
      }
      for (const resource of ["wood", "food", "stone", "silver"] as const) {
        const amount = socialTaskResources[resource] ?? 0;
        if (amount > 0) {
          resources[resource] = (resources[resource] ?? 0) + amount;
        }
      }
      resetState.resources = resources;
    }

    resetMadnessLevelLogBaseline();
    set(resetState);
    StateManager.scheduleEffectsUpdate(get);

    // Reset analytics trackers
    set({
      clickAnalytics: {},
      lastResourceSnapshotTime: 0, // Reset snapshot time to start fresh
    });

    // Immediately save the new game state to cloud to prevent OCC issues.
    // saveGame clears allowPlayTimeOverwrite only after cloud accepts
    // (or when cloud is intentionally skipped for guests / local-only).
    // isNewGame clears after the first successful persist and must not zero playTime.
    const { saveGame } = await import("@/game/save");
    try {
      const result = await saveGame(get(), false);
      if (result.cloudSaved) {
        logger.log(
          "[RESTART] ✅ New game state saved to cloud with analytics cleared",
        );
      } else if (result.cloudSkipped) {
        logger.log("[RESTART] ✅ New game state saved locally (no cloud)");
      } else {
        logger.error(
          "[RESTART] ⚠️ Local new game saved, but cloud sync failed  -  overwrite flags kept for retry",
        );
      }
    } catch (error) {
      logger.error(
        "[RESTART] ❌ Failed to save new game state:",
        error,
      );
    }
  },

  loadGame: async (options) => {
    const { loadGame: loadFromIDB } = await import("@/game/save");
    const savedState = await loadFromIDB(options);

    logger.log("[STATE] 📊 loadGame received state from save.ts:", {
      exists: !!savedState,
      playTime: savedState?.playTime,
      hasPlayTime: savedState ? "playTime" in savedState : false,
      allTimeKeys: savedState
        ? Object.keys(savedState).filter(
          (k) => k.includes("play") || k.includes("time"),
        )
        : [],
    });

    // Notify game loop that we just loaded to skip auto-save for 30 seconds
    const { setLastGameLoadTime } = await import("@/game/loop");
    setLastGameLoadTime(performance.now());

    if (savedState) {
      const saved = savedState as typeof savedState & {
        musicMuted?: boolean;
        sfxMuted?: boolean;
        musicVolume?: number;
        sfxVolume?: number;
      };
      // CRITICAL: Extract playTime FIRST before any processing
      const loadedPlayTime =
        savedState.playTime !== undefined ? savedState.playTime : 0;

      const {
        playlightThirtyMinSidebarOpened: _legacyPlaylightSidebarOpened,
        ...savedForHydration
      } = savedState as typeof savedState & {
        playlightThirtyMinSidebarOpened?: boolean;
      };
      void _legacyPlaylightSidebarOpened;

      // Generate gameId if it doesn't exist in savedState or is undefined
      const gameId =
        savedState.gameId ??
        `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const rawTimedEventTab =
        (savedState as { timedEventTab?: GameStore["timedEventTab"] })
          .timedEventTab ?? {
          isActive: false,
          event: null,
          expiryTime: 0,
        };
      const timedEventTab = {
        ...rawTimedEventTab,
        pauseAccumMs: 0,
        pauseStartedAt: 0,
        insightProlongUsed: false,
      };
      const gamblerGameForResume =
        savedState.gamblerGame !== undefined
          ? savedState.gamblerGame
          : defaultGameState.gamblerGame;
      const gamblerResume = gamblerDiceResumeOnLoad({
        timedEventTab,
        gamblerGame: gamblerGameForResume,
      });
      const activeTab =
        gamblerResume.activeTab === "timedevent" || timedEventTab.isActive
          ? ("timedevent" as const)
          : ("cave" as const);
      const { gamblerDiceDialogOpen } = gamblerResume;

      const legacyObsidianOrbInClothing = Boolean(
        (savedState.clothing as { obsidian_orb?: boolean } | undefined)
          ?.obsidian_orb,
      );

      const hydratedPermanent = hydrateLoadedGameState(savedForHydration);
      const cruelMode =
        savedState.cruelMode !== undefined
          ? savedState.cruelMode
          : Boolean((savedState as { CM?: number }).CM);
      const absolvedItems = {
        ...defaultGameState.absolvedItems,
        ...hydratedPermanent.absolvedItems,
      };
      const stateForDerived = {
        ...savedState,
        ...hydratedPermanent,
        cruelMode,
        absolvedItems,
      };

      const loadedState = {
        ...hydratedPermanent,
        // Explicit merge so a missing `flags` key cannot leave createInitialState
        // unlocks stuck false (hydrateLoadedGameState also repairs from evidence).
        flags: {
          ...defaultGameState.flags,
          ...hydratedPermanent.flags,
        },
        resources: {
          ...defaultGameState.resources,
          ...savedState.resources,
        },
        villagers: {
          ...defaultGameState.villagers,
          ...savedState.villagers,
        },
        blessings: {
          ...defaultGameState.blessings,
          ...savedState.blessings,
        },
        schematics: {
          ...defaultGameState.schematics,
          ...savedState.schematics,
        },
        fellowship: {
          ...defaultGameState.fellowship,
          ...savedState.fellowship,
        },
        revealedEffects: savedState.revealedEffects ?? [],
        actionUnlockOrder: sanitizeActionUnlockOrder(savedState.actionUnlockOrder),
        buildingDescriptionsRevealed:
          savedState.buildingDescriptionsRevealed ?? false,
        craftDescriptionsRevealed: savedState.craftDescriptionsRevealed ?? false,
        statEffectsRevealed: savedState.statEffectsRevealed ?? false,
        revealedAchievementTitles: savedState.revealedAchievementTitles ?? [],
        relics: {
          ...defaultGameState.relics,
          ...savedState.relics,
          obsidian_orb:
            savedState.relics?.obsidian_orb === true ||
            legacyObsidianOrbInClothing,
        },
        clothing: {
          ...defaultGameState.clothing,
          ...savedState.clothing,
          obsidian_orb: false,
        },
        timedEventTab,
        cooldowns: savedState.cooldowns || {},
        attackWaveTimers: savedState.attackWaveTimers || {},
        log: savedState.log || [],
        readLogIds: pruneReadLogIds(savedState.log, savedState.readLogIds),
        events: savedState.events || defaultGameState.events,
        devMultipliers: get().devMultipliers,
        accountSteamMode: get().accountSteamMode,
        devMode: resolveDevMode(get().devMultipliers),
        // Keep session Game Mode; do not restore from save (UI-only).
        devGameMode: get().devGameMode,
        activeDevSaveId: null,
        boostApplied: savedState.boostApplied === true,
        effects: calculateTotalEffects(stateForDerived),
        bastion_stats: calculateBastionStats(stateForDerived),
        cruelMode,
        absolvedItems,
        activatedPurchases: savedState.activatedPurchases || {},
        feastActivations: savedState.feastActivations || {},
        // Ensure loop state is loaded correctly
        loopProgress:
          savedState.loopProgress !== undefined ? savedState.loopProgress : 0,
        isGameLoopActive:
          savedState.isGameLoopActive !== undefined
            ? savedState.isGameLoopActive
            : false,
        isPaused:
          savedState.isPaused !== undefined ? savedState.isPaused : false, // Ensure isPaused is loaded
        musicMuted: saved.musicMuted ?? false,
        sfxMuted: saved.sfxMuted ?? false,
        musicVolume:
          typeof saved.musicVolume === "number" ? saved.musicVolume : 1,
        sfxVolume: typeof saved.sfxVolume === "number" ? saved.sfxVolume : 1,
        authNotificationSeen:
          savedState.authNotificationSeen !== undefined
            ? savedState.authNotificationSeen
            : false,
        authNotificationVisible:
          savedState.authNotificationVisible !== undefined
            ? savedState.authNotificationVisible
            : false,
        lastAuthNotificationPlayTime: Math.max(
          (savedState as { lastAuthNotificationPlayTime?: number })
            .lastAuthNotificationPlayTime ?? 0,
          savedState.lastSignUpPromptPlayTime !== undefined
            ? savedState.lastSignUpPromptPlayTime
            : 0,
        ),
        lastSignUpPromptPlayTime:
          savedState.lastSignUpPromptPlayTime !== undefined
            ? savedState.lastSignUpPromptPlayTime
            : 0,
        socialPromptMilestoneIndex: Math.max(
          (savedState as { socialPromptMilestoneIndex?: number })
            .socialPromptMilestoneIndex ?? 0,
          socialPromptMilestoneFloorFromPlayTime(loadedPlayTime),
        ),
        playlightExitIntentMilestoneIndex:
          (savedState as { playlightExitIntentMilestoneIndex?: number })
            .playlightExitIntentMilestoneIndex ?? 0,
        feedbackPromptShown:
          (savedState as { feedbackPromptShown?: boolean }).feedbackPromptShown ===
          true,
        villageHotkeyTutorialShown:
          (savedState as { villageHotkeyTutorialShown?: boolean })
            .villageHotkeyTutorialShown === true,
        playTime: loadedPlayTime, // CRITICAL: Use the extracted playTime value
        isNewGame: false, // Clear the new game flag when loading
        startTime:
          savedState.startTime !== undefined ? savedState.startTime : 0, // Ensure startTime is loaded
        signupWelcomeGoldClaimed:
          savedState.signupWelcomeGoldClaimed === true,
        idleModeState: savedState.idleModeState || {
          isActive: false,
          startTime: 0,
          needsDisplay: false,
        }, // Load idle mode state
        panelSizes: {
          ...defaultGameState.panelSizes,
          ...savedState.panelSizes,
        }, // Load persisted desktop/mobile panel sizes (back-compat: defaults are null)
        referrals: Array.isArray(savedState.referrals)
          ? savedState.referrals
          : [],
        referralCount: Math.max(
          typeof savedState.referralCount === "number"
            ? savedState.referralCount
            : 0,
          Array.isArray(savedState.referrals) ? savedState.referrals.length : 0,
        ),
        referralProcessed: savedState.referralProcessed === true,
        referralCode:
          typeof savedState.referralCode === "string"
            ? savedState.referralCode
            : defaultGameState.referralCode,
        social_media_rewards:
          savedState.social_media_rewards ||
          defaultGameState.social_media_rewards, // Load social_media_rewards
        lastResourceSnapshotTime:
          savedState.lastResourceSnapshotTime !== undefined
            ? savedState.lastResourceSnapshotTime
            : 0, // Load lastResourceSnapshotTime
        highlightedResources: savedState.highlightedResources || [], // Load highlightedResources
        seenResources: markSeenResources(
          savedState.seenResources,
          savedState.resources,
        ),
        resourceChangeEvents: [],
        curseState: savedState.curseState || defaultGameState.curseState, // Load curseState
        frostfallState:
          savedState.frostfallState || defaultGameState.frostfallState, // Load frostfallState
        fogState: savedState.fogState || defaultGameState.fogState, // Load fogState
        tradersSonGratitudeState:
          savedState.tradersSonGratitudeState ??
          defaultGameState.tradersSonGratitudeState,
        disgustState: savedState.disgustState || defaultGameState.disgustState, // Load disgustState
        obsidianOrbState:
          savedState.obsidianOrbState || defaultGameState.obsidianOrbState,
        solsticeState: savedState.solsticeState || defaultGameState.solsticeState, // Load solsticeState
        staringDeerState:
          savedState.staringDeerState || defaultGameState.staringDeerState,
        forestFearState:
          savedState.forestFearState || defaultGameState.forestFearState,
        brimstoneFluxState:
          savedState.brimstoneFluxState || defaultGameState.brimstoneFluxState,
        lastFreeGoldClaim: savedState.lastFreeGoldClaim || 0, // Load lastFreeGoldClaim
        lastFeedbackOpenedAt:
          typeof (savedState as { lastFeedbackOpenedAt?: number })
            .lastFeedbackOpenedAt === "number"
            ? (savedState as { lastFeedbackOpenedAt: number })
              .lastFeedbackOpenedAt
            : 0,
        lastFeedbackOpenedSource:
          typeof (savedState as { lastFeedbackOpenedSource?: string })
            .lastFeedbackOpenedSource === "string"
            ? (savedState as { lastFeedbackOpenedSource: string })
              .lastFeedbackOpenedSource
            : "",
        traderDialogOpens: savedState.traderDialogOpens ?? 0,
        completePurchaseDialogOpens:
          savedState.completePurchaseDialogOpens ?? 0,
        unlockedAchievements: savedState.unlockedAchievements || [], // Load unlocked achievements
        claimedAchievements: savedState.claimedAchievements || [], // Load claimed achievements
        gameId: gameId, // Load or generate gameId
        game_stats: savedState.game_stats || [], // Load game_stats
        hasWonAnyGame:
          savedState.hasWonAnyGame !== undefined
            ? savedState.hasWonAnyGame
            : false,
        hasWonNormalGame:
          (savedState as { hasWonNormalGame?: boolean }).hasWonNormalGame ===
          true ||
          // Legacy: older saves only tracked hasWonAnyGame
          (savedState.hasWonAnyGame === true &&
            (savedState as { hasWonCruelGame?: boolean }).hasWonCruelGame !==
            true &&
            (savedState as { hasWonNormalGame?: boolean }).hasWonNormalGame !==
            true),
        hasWonCruelGame:
          (savedState as { hasWonCruelGame?: boolean }).hasWonCruelGame ===
          true,
        hasSpeedrunWin:
          (savedState as { hasSpeedrunWin?: boolean }).hasSpeedrunWin === true,
        lifetimeGamesWon: getLifetimeGamesWonFromSave({
          lifetimeGamesWon: (savedState as { lifetimeGamesWon?: number })
            .lifetimeGamesWon,
          game_stats: savedState.game_stats,
          hasWonAnyGame: savedState.hasWonAnyGame,
          hasWonNormalGame: (savedState as { hasWonNormalGame?: boolean })
            .hasWonNormalGame,
          hasWonCruelGame: (savedState as { hasWonCruelGame?: boolean })
            .hasWonCruelGame,
        }),
        // Seed lifetime from current-run playTime for older saves that lack the field
        lifetimePlayTimeMs: Math.max(
          (savedState as { lifetimePlayTimeMs?: number }).lifetimePlayTimeMs ??
          0,
          loadedPlayTime || 0,
        ),
        lifetimeStorageMaxHits: Array.isArray(
          (savedState as { lifetimeStorageMaxHits?: string[] })
            .lifetimeStorageMaxHits,
        )
          ? [
            ...new Set(
              (savedState as { lifetimeStorageMaxHits: string[] })
                .lifetimeStorageMaxHits,
            ),
          ]
          : [],
        lifetimeEstateUpgradeMaxHits: Array.isArray(
          (savedState as { lifetimeEstateUpgradeMaxHits?: string[] })
            .lifetimeEstateUpgradeMaxHits,
        )
          ? [
            ...new Set(
              (savedState as { lifetimeEstateUpgradeMaxHits: string[] })
                .lifetimeEstateUpgradeMaxHits,
            ),
          ]
          : [],
        hasAchievementMaxer:
          (savedState as { hasAchievementMaxer?: boolean })
            .hasAchievementMaxer === true,
        merchantTrades: savedState.merchantTrades || {
          choices: [],
          purchasedIds: [],
        }, // Load merchant trades
        gamblerGame: gamblerGameForResume,
        investmentHallState:
          savedState.investmentHallState ??
          defaultGameState.investmentHallState,
        // Session flag is not authoritative from disk/cloud.
        isUserSignedIn: get().isUserSignedIn,
        // Never restore transient dialog UI from older saves that persisted these fields.
        ...getTransientDialogResetOnLoad(),
        // Resume after the reset so a live gambler round can reopen the table.
        activeTab,
        gamblerDiceDialogOpen,
      };

      const migrated = applyGameStateLoadMigrations(loadedState);
      resetMadnessLevelLogBaseline();
      set({
        ...migrated,
        ...getPendingModalEventDialogResume(migrated),
      });
      const {
        flushOverdueActionExecutions,
        scheduleSleepDialogRestore,
        clearExpiredTimedEventTab,
      } = await import("@/game/loop");
      flushOverdueActionExecutions();
      scheduleSleepDialogRestore();
      // Loop may already be running (cloud reconcile). Re-run visit expiry
      // here; startGameLoop() no-ops and would otherwise skip this clear.
      clearExpiredTimedEventTab();
      StateManager.scheduleEffectsUpdate(get);
    } else {
      // Make Fire starts the run in memory before a save exists. A second
      // loadGame (Game remount, missed hydration handoff) must not wipe that.
      if (get().flags.gameStarted) {
        logger.log(
          "[STATE] loadGame found no save; keeping in-memory Make Fire start",
        );
        return false;
      }

      const newGameState = {
        ...defaultGameState,
        activeTab: "cave",
        cooldowns: {},
        executionStartTimes: {},
        executionDurations: {},
        expeditionVillagers: {},
        log: [],
        readLogIds: [],
        devMultipliers: get().devMultipliers,
        accountSteamMode: get().accountSteamMode,
        devMode: resolveDevMode(get().devMultipliers),
        // Keep session Game Mode; do not reset to Normal on new game.
        devGameMode: get().devGameMode,
        activeDevSaveId: null,
        effects: calculateTotalEffects(defaultGameState),
        bastion_stats: calculateBastionStats(defaultGameState),
        startTime: Date.now(), // Set start time for new game
        isNewGame: true, // Mark as new game to start tracking
        gameId: `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Generate gameId for new game
        isUserSignedIn: get().isUserSignedIn,
        ...getTimedEventTabCleanupPatch(get().activeTab),
      };

      resetMadnessLevelLogBaseline();
      set(newGameState);
    }

    // Re-sync from live session so a persisted false cannot stick after load.
    if (!isLocalOnlyEdition()) {
      try {
        const { syncStoreAuthFromSession } = await import("@/game/auth");
        await syncStoreAuthFromSession();
      } catch {
        /* keep prior store value */
      }
    }

    const { applySignupWelcomeBonusAfterOAuthLoad } = await import("@/game/auth");
    await applySignupWelcomeBonusAfterOAuthLoad();

    StateManager.scheduleEffectsUpdate(get);
    return Boolean(savedState);
  },
});
