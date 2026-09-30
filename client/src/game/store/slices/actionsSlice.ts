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
import {
  syncTimedEventTabPauseTracking,
  getTimedEventTabEffectiveRemainingMs,
} from "../timedEventTabSync";
import { StateManager } from "../StateManager";
import { playActionStartSfx } from "../actionSfx";

export const createActionsSlice: GameStoreCreator<Partial<GameStore>> = (set, get) => ({
  executeAction: (actionId: string, meta?: { executionSource?: "player" | "prior" }) => {
    const state = get();
    if (isDemoPlayFrozen(state)) return;
    const action = gameActions[actionId];

    // If action has execution time and we're not completing one, start execution
    const executionTime = getExecutionTime(actionId, state);
    if (executionTime > 0 && (state as any)._completingExecution !== actionId) {
      if (!state.executionStartTimes?.[actionId]) {
        // Guard: don't deduct costs for an action that is no longer visible.
        // This prevents the Prior (or any caller) from draining resources for
        // an action whose show_when conditions are no longer satisfied.
        if (!shouldShowAction(actionId, state as any)) return;
        // Guard affordability/eligibility before starting (costs are deducted at
        // execution start). Callers that bypass the UI's disabled-button gate  - 
        // e.g. assigning the Disgraced Prior via togglePriorAction  -  must not be
        // able to start an unaffordable action and drive resources negative.
        if (!canExecuteAction(actionId, state as any)) return;
        get().startActionExecution(actionId, meta);
        return;
      }
    }

    // Manual handling for feedFire which doesn't use standard registry logic
    if (actionId === "feedFire") {
      const cooldown = state.cooldowns[actionId] || 0;
      if (cooldown > 0) {
        return;
      }

      const result = executeGameAction(actionId, state);

      if (result.stateUpdates && Object.keys(result.stateUpdates).length > 0) {
        set((state) => ({
          ...state,
          ...result.stateUpdates,
        }));
        // Trigger effects update
        StateManager.scheduleEffectsUpdate(get);
      }
      return;
    }

    if (!action || (state.cooldowns[actionId] || 0) > 0) return;
    // Skip shouldShowAction and canExecuteAction when completing execution
    // (costs and requirements were already validated at execution start)
    const isCompletingExecution = (state as any)._completingExecution === actionId;
    if (
      (!isCompletingExecution && !shouldShowAction(actionId, state)) ||
      (!isCompletingExecution && !canExecuteAction(actionId, state))
    )
      return;

    const result = executeGameAction(actionId, state);

    // Track button usage and check for level up (only if book_of_ascension is owned)
    const upgradeKey = ACTION_TO_UPGRADE_KEY[actionId];
    if (upgradeKey && state.books?.book_of_ascension) {
      const upgradeResult = incrementButtonUsage(upgradeKey, state);

      // Add button upgrade state update
      if (!result.stateUpdates) {
        result.stateUpdates = {};
      }
      if (!result.stateUpdates.buttonUpgrades) {
        result.stateUpdates.buttonUpgrades = {} as any;
      }
      result.stateUpdates.buttonUpgrades[upgradeKey] =
        upgradeResult.updatedUpgrade;

      // Add level up log entry if applicable
      if (upgradeResult.levelUpLog) {
        const levelUpLog: LogEntry = {
          id: `levelup_${upgradeKey}_${Date.now()}`,
          message: upgradeResult.levelUpLog.message,
          logKey: upgradeResult.levelUpLog.logKey,
          logVars: upgradeResult.levelUpLog.logVars,
          timestamp: Date.now(),
          type: "system",
        };

        if (!result.logEntries) {
          result.logEntries = [];
        }
        result.logEntries.push(levelUpLog);
      }
    }

    // Apply dev mode cooldown multiplier (0.1x) to both cooldowns and initialCooldowns
    if (state.devMode && result.stateUpdates.cooldowns) {
      const updatedCooldowns = { ...result.stateUpdates.cooldowns };
      const initialCooldowns = (result.stateUpdates as any).initialCooldowns || {};
      const updatedInitialCooldowns = { ...initialCooldowns };

      for (const key in updatedCooldowns) {
        updatedCooldowns[key] = updatedCooldowns[key] * 0.1;
        if (updatedInitialCooldowns[key] !== undefined) {
          updatedInitialCooldowns[key] = updatedInitialCooldowns[key] * 0.1;
        }
      }
      result.stateUpdates.cooldowns = updatedCooldowns;
      (result.stateUpdates as any).initialCooldowns = updatedInitialCooldowns;
    }

    // Enforce minimum cooldown of 1 second for actions that have cooldown (skip for cooldown: 0)
    if (result.stateUpdates.cooldowns) {
      const updatedCooldowns = { ...result.stateUpdates.cooldowns };
      const initialCooldowns = (result.stateUpdates as any).initialCooldowns || {};
      const updatedInitialCooldowns = { ...initialCooldowns };

      for (const key in updatedCooldowns) {
        const actionCooldown = gameActions[key]?.cooldown ?? 1;
        const minCooldown = actionCooldown === 0 ? 0 : 1;
        updatedCooldowns[key] = Math.max(minCooldown, updatedCooldowns[key]);
        if (updatedInitialCooldowns[key] !== undefined) {
          updatedInitialCooldowns[key] = Math.max(minCooldown, updatedInitialCooldowns[key]);
        }
      }
      result.stateUpdates.cooldowns = updatedCooldowns;
      (result.stateUpdates as any).initialCooldowns = updatedInitialCooldowns;
    }

    // Handle compass bonus glow effect
    if ((result.stateUpdates as any).compassBonusTriggered) {
      logger.log(
        "[COMPASS GLOW] Compass bonus triggered for action:",
        actionId,
      );
      get().setCompassGlow(actionId);
      setTimeout(() => {
        logger.log("[COMPASS GLOW] Clearing compass glow");
        get().setCompassGlow(null);
      }, 1500);
    }

    // Copy the success story into RewardDialog, but keep it in the event log.
    // The dialog is transient (reset on load); the log is the lasting record.
    // Stripping the line made a later win disappear, so a prior miss stayed on top.
    if (rewardDialogActions.has(actionId)) {
      const rewards = detectRewards(result.stateUpdates, state, actionId);
      if (rewards && rewardPayloadHasPositiveChanges(rewards)) {
        // Extract success log from either _logMessage in stateUpdates or from logEntries
        let successLog: string | undefined = (result.stateUpdates as any)._logMessage;

        // If no _logMessage, try to extract from logEntries (actions often add success messages there)
        if (!successLog && result.logEntries && result.logEntries.length > 0) {
          // Find the most recent log entry that looks like a success message
          // Usually it's the last one added for reward dialog actions
          const lastLogEntry = result.logEntries[result.logEntries.length - 1];
          if (lastLogEntry && lastLogEntry.message) {
            successLog = typeof lastLogEntry.message === 'string'
              ? lastLogEntry.message
              : JSON.stringify(lastLogEntry.message);
          }
        }

        // Remove _logMessage from stateUpdates so it doesn't get merged into state
        if ((result.stateUpdates as any)._logMessage) {
          delete (result.stateUpdates as any)._logMessage;
        }

        beginDialogHandoff(set);
        scheduleRewardDialogWhenClear(
          get,
          {
            rewards,
            successLog,
            title: getActionLabel(
              actionId,
              gameActions[actionId]?.label ?? "",
              { forestUnlocked: Boolean(state.flags?.forestUnlocked) },
            ),
          },
          500,
        ); // Initial delay preserves prior pacing; deferral avoids stacking on other modals
      }
    }

    // Insight Elixir (forest trader): blue outcome dialog announcing the Insight gained.
    if (actionId === "tradeGoldForInsightPotion") {
      const insightGain = detectRewards(result.stateUpdates, state, actionId)
        ?.resources?.insight;
      if (typeof insightGain === "number" && insightGain > 0) {
        beginDialogHandoff(set);
        scheduleInsightPotionDialogWhenClear(get, { insightGain }, 500);
      }
    }

    // Apply state updates
    set((prevState) => {
      const mergedUpdates = mergeStateUpdates(prevState, result.stateUpdates, {
        allowResourceOvercap: actionAllowsResourceOvercap(actionId),
      });
      const newStateAfterUpdates = {
        ...prevState,
        ...mergedUpdates,
      };

      // Check for milestone log entries after state updates
      const milestoneUpdates = checkMilestoneLogEntries(newStateAfterUpdates);

      // Use milestone-updated log as base, then append action log entries
      const baseLog = milestoneUpdates.log || newStateAfterUpdates.log;

      // Filter out entries marked to skip event log (they should only appear in dialogs)
      const logEntriesToAdd = result.logEntries
        ? result.logEntries.filter(
          (entry) => !entry.skipEventLog && hasLogEntryText(entry),
        )
        : [];

      return {
        ...newStateAfterUpdates,
        ...milestoneUpdates,
        log: logEntriesToAdd.length > 0
          ? [...baseLog, ...logEntriesToAdd].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES)
          : baseLog,
      };
    });

    // Action SFX only for manual clicks  -  Prior automation stays silent.
    const playActionSfx = meta?.executionSource !== "prior";
    if (playActionSfx) {
      // Instant actions (no execution bar) still play their start cue here.
      // Timed actions play it in startActionExecution on click.
      if (!isCompletingExecution) {
        playActionStartSfx(actionId, {
          forestUnlocked: Boolean(get().flags?.forestUnlocked),
          caveExploreLevel: get().buttonUpgrades?.caveExplore?.level ?? 0,
        });
      }

      // Village build + bastion repair share the same completion cue
      const isBastionRepair =
        actionId === "repairBastion" ||
        actionId === "repairWatchtower" ||
        actionId === "repairPalisades";
      if (
        (actionId.startsWith("build") && result.stateUpdates.buildings) ||
        isBastionRepair
      ) {
        audioManager.playSound(
          "buildingComplete",
          SOUND_VOLUME.buildingComplete,
        );
      }
    }

    // Schedule updates (buildings affect derived effects/stats, e.g. madness from shrines)
    if (
      result.stateUpdates.tools ||
      result.stateUpdates.weapons ||
      result.stateUpdates.clothing ||
      result.stateUpdates.relics ||
      result.stateUpdates.books ||
      result.stateUpdates.buildings
    ) {
      StateManager.scheduleEffectsUpdate(get);
    }

    // Update bastion stats when fortification buildings change
    if (result.stateUpdates.buildings) {
      const buildingChanges = result.stateUpdates.buildings;
      if (
        buildingChanges.bastion !== undefined ||
        buildingChanges.watchtower !== undefined ||
        buildingChanges.palisades !== undefined
      ) {
        setTimeout(() => get().updateBastionStats(), 0);
      }

      // Update population when housing buildings change (also clamps over-cap)
      if (
        buildingChanges.woodenHut !== undefined ||
        buildingChanges.stoneHut !== undefined ||
        buildingChanges.longhouse !== undefined ||
        buildingChanges.furTents !== undefined ||
        buildingChanges.blackEstate !== undefined
      ) {
        setTimeout(() => get().updatePopulation(), 0);
      }
    }

    if (
      actionId === "repairBastion" ||
      actionId === "repairWatchtower" ||
      actionId === "repairPalisades"
    ) {
      setTimeout(() => get().updateBastionStats(), 0);
    }

    // Handle event dialogs
    if (result.logEntries) {
      const willOpenChoiceDialog = result.logEntries.some(
        (entry) =>
          Boolean(entry.choices?.length) &&
          !getClarityElixirCaveEventId(entry) &&
          !getCaveWallMarkingsEventId(entry),
      );
      if (willOpenChoiceDialog) {
        beginDialogHandoff(set);
      }
      result.logEntries.forEach((entry) => {
        if (!entry.choices?.length) return;

        const clarityElixirEventId = getClarityElixirCaveEventId(entry);
        if (clarityElixirEventId) {
          // Same outcome UI as merchant clarity elixir  -  MadnessDialog, not EventDialog.
          setTimeout(() => {
            get().applyEventChoice("drinkElixir", clarityElixirEventId, entry);
          }, 100);
          return;
        }

        const caveWallMarkingsEventId = getCaveWallMarkingsEventId(entry);
        if (caveWallMarkingsEventId) {
          // Auto-apply like cave Clarity Elixir  -  RewardDialog shows Insight + narrative.
          setTimeout(() => {
            get().applyEventChoice("continue", caveWallMarkingsEventId, entry);
          }, 100);
          return;
        }

        setTimeout(() => get().setEventDialog(true, entry), 100);
      });
    }

    // Handle delayed effects
    StateManager.handleDelayedEffects(result.delayedEffects);
  },

  setCooldown: (action: string, duration: number) => {
    // Enforce minimum cooldown of 1 second
    const finalDuration = Math.max(1, duration);
    set((state) => ({
      cooldowns: { ...state.cooldowns, [action]: finalDuration },
      initialCooldowns: { ...state.initialCooldowns, [action]: finalDuration },
    }));
  },

  setCompassGlow: (actionId: string | null) => {
    set({ compassGlowButton: actionId });
  },

  togglePriorAction: (actionId: string) => {
    set((state) => {
      const assigned = state.priorAssignedActions ?? [];
      const level = state.disgracedPriorSkills?.level ?? 0;
      const maxActions = DISGRACED_PRIOR_UPGRADES[level]?.maxActions ?? 1;
      if (assigned.includes(actionId)) {
        return { priorAssignedActions: assigned.filter((id) => id !== actionId) };
      }
      if (!isPriorActionEligible(actionId, state)) return {};
      if (assigned.length >= maxActions) return {};
      return { priorAssignedActions: [...assigned, actionId] };
    });
    const fresh = get();
    if (
      (fresh.cooldowns[actionId] ?? 0) === 0 &&
      fresh.priorAssignedActions?.includes(actionId)
    ) {
      get().executeAction(actionId, { executionSource: "prior" });
    }
  },


  startActionExecution: (actionId: string, meta?: { executionSource?: "player" | "prior" }) => {
    const state = get();
    if (isDemoPlayFrozen(state)) return;
    const action = gameActions[actionId];
    const duration = getExecutionTime(actionId, state);
    if (duration <= 0) return;
    const now = Date.now();

    const isPlayerStarted = meta?.executionSource !== "prior";

    // Deduct costs immediately on click (resources are consumed when the action begins)
    const costUpdates = deductActionCosts(actionId, state);

    const expeditionRequired = action?.expeditionVillagersRequired
      ? action.expeditionVillagersRequired(state)
      : 0;
    const hasExpeditionRequirement = expeditionRequired > 0;
    const baseVillagers = { ...(costUpdates.villagers ?? state.villagers) };
    const baseExpeditionVillagers = {
      ...state.expeditionVillagers,
      ...(costUpdates.expeditionVillagers ?? {}),
    };

    if (
      hasExpeditionRequirement &&
      (baseVillagers.free ?? 0) < expeditionRequired
    ) {
      return;
    }

    if (hasExpeditionRequirement) {
      baseVillagers.free = (baseVillagers.free ?? 0) - expeditionRequired;
      baseExpeditionVillagers[actionId] = expeditionRequired;
    }

    const spendSnapshot = isPlayerStarted
      ? buildExecutionSpendSnapshot(
        state,
        costUpdates,
        baseVillagers,
        hasExpeditionRequirement ? expeditionRequired : 0,
      )
      : undefined;

    set({
      ...costUpdates,
      villagers: baseVillagers,
      expeditionVillagers: baseExpeditionVillagers,
      executionStartTimes: { ...state.executionStartTimes, [actionId]: now },
      executionDurations: { ...state.executionDurations, [actionId]: duration },
      executionAbortEligible: {
        ...state.executionAbortEligible,
        [actionId]: isPlayerStarted,
      },
      ...(spendSnapshot && {
        executionSpendSnapshots: {
          ...state.executionSpendSnapshots,
          [actionId]: spendSnapshot,
        },
      }),
      constructionBoostsUsed: {
        ...(state.constructionBoostsUsed ?? {}),
        [actionId]: false,
      },
    });

    if (isPlayerStarted) {
      playActionStartSfx(actionId, {
        forestUnlocked: Boolean(state.flags?.forestUnlocked),
        caveExploreLevel: state.buttonUpgrades?.caveExplore?.level ?? 0,
      });
    }
  },

  completeActionExecution: (actionId: string) => {
    const state = get();
    if (isDemoPlayFrozen(state)) return;
    const { executionStartTimes, executionDurations } = state;
    if (!executionStartTimes[actionId] || !executionDurations[actionId]) return;

    // Prior starts set abortEligible to false; preserve source for completion SFX.
    const executionSource =
      state.executionAbortEligible?.[actionId] === false ? "prior" : "player";

    const newStartTimes = { ...executionStartTimes };
    const newDurations = { ...executionDurations };
    delete newStartTimes[actionId];
    delete newDurations[actionId];
    const newAbortEligible = { ...state.executionAbortEligible };
    delete newAbortEligible[actionId];
    const newSpendSnapshots = { ...state.executionSpendSnapshots };
    delete newSpendSnapshots[actionId];
    const newConstructionBoostsUsed = { ...(state.constructionBoostsUsed ?? {}) };
    delete newConstructionBoostsUsed[actionId];
    const releasedVillagers = state.expeditionVillagers?.[actionId] ?? 0;
    const updatedExpeditionVillagers = { ...state.expeditionVillagers };
    if (releasedVillagers > 0) {
      delete updatedExpeditionVillagers[actionId];
    }

    // Cloud deep-merge ghosts can keep completed one-shots "in flight". Clearing
    // without refund/re-run prevents duplicate villagers + repeating dialogs.
    if (isCompletedOneShotExecutionGhost(actionId, state)) {
      set({
        executionStartTimes: newStartTimes,
        executionDurations: newDurations,
        executionAbortEligible: newAbortEligible,
        executionSpendSnapshots: newSpendSnapshots,
        constructionBoostsUsed: newConstructionBoostsUsed,
        expeditionVillagers: updatedExpeditionVillagers,
      });
      return;
    }

    set({
      executionStartTimes: newStartTimes,
      executionDurations: newDurations,
      executionAbortEligible: newAbortEligible,
      executionSpendSnapshots: newSpendSnapshots,
      constructionBoostsUsed: newConstructionBoostsUsed,
      villagers: {
        ...state.villagers,
        free: (state.villagers.free || 0) + releasedVillagers,
      },
      expeditionVillagers: updatedExpeditionVillagers,
      ...(actionId !== "callMerchant" && { _completingExecution: actionId }),
    });

    if (actionId === "callMerchant") {
      get().finalizeCallMerchant();
      return;
    }

    // Execute the actual action (bypasses execution-time check via _completingExecution)
    get().executeAction(actionId, { executionSource });
    set({ _completingExecution: undefined });
  },

  abortActionExecution: (actionId: string) => {
    const state = get();
    if (!state.executionStartTimes?.[actionId] || !state.executionDurations?.[actionId]) {
      return;
    }
    if (!state.executionAbortEligible?.[actionId]) {
      return;
    }
    const isFreeAbort = actionId === "callMerchant";
    if (!isFreeAbort) {
      if ((state.buildings.clerksHut ?? 0) < 1) {
        return;
      }
    }
    const snapshot = state.executionSpendSnapshots?.[actionId];
    if (!snapshot) {
      return;
    }
    if (
      !isFreeAbort &&
      (state.resources.gold ?? 0) < GAME_CONSTANTS.ACTION_ABORT_GOLD_COST
    ) {
      return;
    }

    const resourceChangeAmounts = new Map<string, number>();
    const addResourceChange = (resource: string, amount: number) => {
      resourceChangeAmounts.set(
        resource,
        (resourceChangeAmounts.get(resource) ?? 0) + amount,
      );
    };

    if (!isFreeAbort) {
      get().updateResource("gold", -GAME_CONSTANTS.ACTION_ABORT_GOLD_COST);
      addResourceChange("gold", -GAME_CONSTANTS.ACTION_ABORT_GOLD_COST);
    }
    for (const [key, amount] of Object.entries(snapshot.resourceRefund)) {
      if (amount !== 0) {
        // Refunds may restore warehouse resources above storage (same as reward overcap)
        get().updateResource(key as keyof GameState["resources"], amount, {
          allowOvercap: true,
        });
        addResourceChange(key, amount);
      }
    }

    set((s) => {
      const v = { ...s.villagers };
      for (const [k, amt] of Object.entries(snapshot.villagerRefund)) {
        if (amt === 0) continue;
        const job = k as keyof GameState["villagers"];
        v[job] = (v[job] ?? 0) + amt;
      }
      const ev = { ...s.expeditionVillagers };
      if (snapshot.expeditionLocked > 0) {
        delete ev[actionId];
      }
      const est = { ...s.executionStartTimes };
      const edur = { ...s.executionDurations };
      const eab = { ...s.executionAbortEligible };
      const esp = { ...s.executionSpendSnapshots };
      delete est[actionId];
      delete edur[actionId];
      delete eab[actionId];
      delete esp[actionId];
      return {
        villagers: v,
        expeditionVillagers: ev,
        executionStartTimes: est,
        executionDurations: edur,
        executionAbortEligible: eab,
        executionSpendSnapshots: esp,
      };
    });

    setTimeout(() => get().updatePopulation(), 0);
    resourceChangeAmounts.forEach((amount, resource) => {
      get().emitResourceChange(resource, amount);
    });
  },

  prolongTimedEventTab: () => {
    syncTimedEventTabPauseTracking();
    const state = get();
    const remaining = getTimedEventTabEffectiveRemainingMs(state);
    if (!canProlongTimedEventTab(state, remaining)) return false;

    const resourceUpdates = updateResource(
      state,
      "insight",
      -TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
    );
    set({
      ...resourceUpdates,
      timedEventTab: {
        ...state.timedEventTab,
        expiryTime:
          (state.timedEventTab.expiryTime ?? 0) + TIMED_EVENT_TAB_PROLONG_MS,
        insightProlongUsed: true,
      },
      insightRevealing: {
        ...(state.insightRevealing ?? {}),
        [TIMED_EVENT_INSIGHT_PROLONG_KEY]:
          Date.now() + INSIGHT_REVEAL_DURATION_MS,
      },
    });
    return true;
  },

  tickCooldowns: () => {
    set((state) => {
      const newCooldowns = { ...state.cooldowns };
      let newInitialCooldowns = state.initialCooldowns;
      let changed = false;

      for (const key in newCooldowns) {
        if (newCooldowns[key] > 0) {
          const newValue = newCooldowns[key] - 0.25;
          // Treat values below 0.001 as zero to avoid floating-point precision issues
          newCooldowns[key] = newValue < 0.001 ? 0 : newValue;

          if (newCooldowns[key] === 0) {
            if (newInitialCooldowns === state.initialCooldowns) {
              newInitialCooldowns = { ...state.initialCooldowns };
            }
            delete newInitialCooldowns[key];
          }
          changed = true;
        }
      }

      const now = Date.now();
      const newRevealing = { ...state.insightRevealing };
      const revealedEffects = [...(state.revealedEffects ?? [])];
      const revealedAchievementTitles = [
        ...(state.revealedAchievementTitles ?? []),
      ];
      let revealChanged = false;
      let statEffectsRevealed = state.statEffectsRevealed;
      let buildingDescriptionsRevealed = state.buildingDescriptionsRevealed;
      let craftDescriptionsRevealed = state.craftDescriptionsRevealed;
      for (const [actionId, endTime] of Object.entries(state.insightRevealing ?? {})) {
        if (now >= endTime) {
          if (actionId === STAT_INSIGHT_REVEAL_KEY) {
            statEffectsRevealed = true;
          } else if (actionId === BUILDING_DESCRIPTIONS_INSIGHT_KEY) {
            buildingDescriptionsRevealed = true;
          } else if (actionId === CRAFT_DESCRIPTIONS_INSIGHT_KEY) {
            craftDescriptionsRevealed = true;
          } else if (
            actionId === TIMED_EVENT_INSIGHT_PROLONG_KEY ||
            actionId === PRESET_UNLOCK_INSIGHT_KEY ||
            actionId === QUEUE_SLOT_UNLOCK_INSIGHT_KEY ||
            actionId.startsWith(ITEM_ABSOLVE_INSIGHT_KEY_PREFIX) ||
            actionId.startsWith(WEAPON_ENCHANT_INSIGHT_KEY_PREFIX)
          ) {
            // Animation-only keys: purchase/prolong/absolve/enchant already applied.
          } else {
            const achievementId = parseAchievementTitleInsightKey(actionId);
            if (achievementId) {
              // Prefer grant-on-purchase; keep this as a fallback for mid-animation
              // saves from before titles were written immediately.
              if (!revealedAchievementTitles.includes(achievementId)) {
                revealedAchievementTitles.push(achievementId);
              }
            } else if (!revealedEffects.includes(actionId)) {
              revealedEffects.push(actionId);
            }
          }
          delete newRevealing[actionId];
          revealChanged = true;
        }
      }

      let newHeartfireState = state.heartfireState;
      if (state.heartfireState?.level > 0) {
        const now = Date.now();
        const lastDecrease = state.heartfireState.lastLevelDecrease || 0;
        if (now - lastDecrease >= 90000) { // 1.5 minutes
          newHeartfireState = {
            level: state.heartfireState.level - 1,
            lastLevelDecrease: now,
          };
        }
      }

      // Nothing actually changed this tick (no active cooldowns, no insight reveal resolved,
      // no heartfire decay). Return the identical state reference so Zustand skips notifying
      // subscribers  -  this runs ~4x/sec and a fresh object would re-render the whole UI tree.
      if (
        !changed &&
        !revealChanged &&
        newHeartfireState === state.heartfireState
      ) {
        return state;
      }

      return {
        ...state,
        cooldowns: newCooldowns,
        initialCooldowns: newInitialCooldowns,
        heartfireState: newHeartfireState,
        ...(revealChanged
          ? {
            insightRevealing: newRevealing,
            revealedEffects,
            statEffectsRevealed,
            buildingDescriptionsRevealed,
            craftDescriptionsRevealed,
            revealedAchievementTitles,
          }
          : {}),
      };
    });
  },
});
