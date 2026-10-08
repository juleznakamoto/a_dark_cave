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
import {
  canResolveOpenEventDuringDemoEnd,
  isDemoPlayFrozen,
} from "@/game/demoLimit";
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
import { WANDERERS_LANTERN_EVENT_ID } from "@/game/wanderersLantern";
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

export const createEventsSlice: GameStoreCreator<Partial<GameStore>> = (set, get) => ({
  addLogEntry: (entry: LogEntry) => {
    if (!hasLogEntryText(entry)) return;

    if (entry.type === "event") {
      audioManager.playSound("event", SOUND_VOLUME.eventUi);
    }

    set((state) => ({
      log: [...state.log, entry].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES),
    }));
  },

  markLogEntryRead: (entryId: string) => {
    set((state) => {
      const current = state.readLogIds ?? [];
      const next = pruneReadLogIds(state.log, current, entryId);
      if (
        next.length === current.length &&
        next.every((id, index) => id === current[index])
      ) {
        return state;
      }
      return { readLogIds: next };
    });
  },

  checkEvents: () => {
    const state = get();
    // If the game is paused, do not process events
    if (state.isPaused) return;
    if (isDemoPlayFrozen(state)) return;

    if (isModalDialogOpen(state)) return;

    const { newLogEntries, stateChanges } =
      EventManager.checkEvents(state);

    let combatData = null;
    const updatedChanges = { ...stateChanges };

    if (updatedChanges._combatData) {
      combatData = updatedChanges._combatData;
      delete updatedChanges._combatData;
    }

    const timedTabEntry = updatedChanges._timedTabEvent;
    if (timedTabEntry) {
      delete updatedChanges._timedTabEvent;
    }

    const pendingEventCooldowns = updatedChanges.eventCooldowns;
    if (pendingEventCooldowns) {
      delete updatedChanges.eventCooldowns;
    }

    const hasPersistableStateChanges = Object.keys(updatedChanges).length > 0;
    if (hasPersistableStateChanges || pendingEventCooldowns) {
      set((prevState) => ({
        ...prevState,
        ...updatedChanges,
        ...(pendingEventCooldowns && {
          eventCooldowns: {
            ...(prevState.eventCooldowns || {}),
            ...pendingEventCooldowns,
          },
        }),
      }));
    }

    // Handle timed tab event if present (never stack a second timed tab)
    if (timedTabEntry && !state.timedEventTab.isActive) {
      // Play event sound for timed tab events (blood moon bed starts in setTimedEventTab)
      if (timedTabEntry._playSound) {
        const catalogId =
          timedTabEntry.eventId || timedTabEntry.id?.split("-")[0];
        const isBloodMoonEvent = catalogId === BLOOD_MOON_EVENT_ID;
        const isMerchantEvent = timedTabEntry.id?.startsWith("merchant");
        if (!isBloodMoonEvent) {
          const soundName = isMerchantEvent ? "merchant" : "event";
          const soundVolume = isMerchantEvent
            ? SOUND_VOLUME.merchant
            : SOUND_VOLUME.eventUi;
          audioManager.playSound(soundName, soundVolume);
        }
      }

      get().setTimedEventTab(true, timedTabEntry, timedTabEntry.timedTabDuration);
    }

    if (newLogEntries.length > 0) {
      // Handle combat dialog for attack waves
      if (combatData) {
        get().setCombatDialog(true, {
          enemy: combatData.enemy,
          eventTitle: combatData.eventTitle,
          eventMessage: combatData.eventMessage,
          onVictory: () => {
            const victoryResult = combatData.onVictory();
            const { _logMessage, _combatSummary, ...forMerge } =
              victoryResult as Record<string, unknown> & {
                _logMessage?: string;
                _combatSummary?: Record<string, unknown>;
              };
            set((prevState) => ({
              ...mergeCombatVictoryState(
                prevState,
                forMerge as Parameters<typeof mergeCombatVictoryState>[1],
              ),
              log: prevState.log,
            }));
            if (_logMessage) {
              get().addLogEntry({
                id: `combat-victory-${Date.now()}`,
                message: _logMessage,
                timestamp: Date.now(),
                type: "system",
              });
            }
            return extractCombatResultSummary(
              _combatSummary
                ? { _combatSummary }
                : (victoryResult as Record<string, unknown>),
            );
          },
          onDefeat: () => {
            const prevState = get();
            const defeatResult = combatData.onDefeat();
            const { _logMessage, _combatSummary, ...stateUpdates } =
              defeatResult as Record<string, unknown> & {
                _logMessage?: string;
                _combatSummary?: Record<string, unknown>;
              };
            const madnessChange = detectMadnessChange(
              stateUpdates as Partial<GameState>,
              prevState,
            );
            set((prevState) => ({
              ...mergeCombatDefeatState(
                prevState,
                stateUpdates as Parameters<typeof mergeCombatDefeatState>[1],
              ),
              log: _logMessage
                ? [
                  ...prevState.log,
                  {
                    id: `combat-defeat-${Date.now()}`,
                    message: _logMessage,
                    timestamp: Date.now(),
                    type: "system" as const,
                  },
                ].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES)
                : prevState.log,
            }));
            const combatSummary = extractCombatResultSummary(
              _combatSummary
                ? { _combatSummary }
                : (defeatResult as Record<string, unknown>),
            );
            scheduleMadnessDialogAfterCombat(
              get,
              madnessChange,
              combatSummary,
              combatData.eventTitle,
            );
            return combatSummary;
          },
        });
      } else {
        // Handle normal event dialogs
        newLogEntries.forEach((entry) => {
          // Skip events marked to not appear in log
          if (entry.skipEventLog) {
            // Only show as dialog, don't add to log
            const logChoices = typeof entry.choices === 'function'
              ? entry.choices(state)
              : entry.choices || [];
            if (logChoices && logChoices.length > 0) {
              get().setEventDialog(true, entry);
              return;
            }
            // Wanderer's Lantern is granted on trigger. Show that text on the
            // outcome dialog instead of opening a choice dialog first.
            if (entry.eventId === WANDERERS_LANTERN_EVENT_ID) {
              const rewards = detectRewards(
                updatedChanges,
                state,
                WANDERERS_LANTERN_EVENT_ID,
                { trackLosses: true },
              );
              if (rewardPayloadHasPositiveChanges(rewards)) {
                beginDialogHandoff(set);
                scheduleRewardDialogWhenClear(
                  get,
                  {
                    rewards,
                    successLog: entry.message,
                    variant: "success",
                    title: entry.title,
                  },
                  200,
                );
              }
            }
            return;
          }

          const logChoices = typeof entry.choices === 'function'
            ? entry.choices(state)
            : entry.choices || [];
          if (logChoices && logChoices.length > 0) {
            const currentDialog = get().eventDialog;
            const isMerchantEvent = entry.id.includes("merchant");
            const hasActiveMerchantDialog =
              currentDialog.isOpen &&
              currentDialog.currentEvent?.id.includes("merchant");

            if (!hasActiveMerchantDialog || !isMerchantEvent) {
              get().setEventDialog(true, entry);
            }
          } else if (hasLogEntryText(entry)) {
            // Stamp lastEndedAt so a same-frame catch-up roll cannot also
            // spawn a choice event (no-choice beats do not open EventDialog).
            set((prevState) => ({
              log: [...prevState.log, entry].slice(
                -GAME_CONSTANTS.LOG_MAX_ENTRIES,
              ),
              eventDialog: {
                ...prevState.eventDialog,
                lastEndedAt: Date.now(),
              },
            }));
          }
        });
      }

      StateManager.schedulePopulationUpdate(get);
    } else if (hasPersistableStateChanges) {
      StateManager.schedulePopulationUpdate(get);
    }
  },

  applyEventChoice: (choiceId: string, eventId: string, currentLogEntry?: LogEntry) => {
    const state = get();
    // If the game is paused, do not apply event choices
    if (state.isPaused) return false;
    if (!canResolveOpenEventDuringDemoEnd(state)) return false;

    // Use passed currentLogEntry or fall back to eventDialog.currentEvent
    const logEntry = currentLogEntry || get().eventDialog.currentEvent;

    const logChoices = typeof logEntry?.choices === 'function'
      ? logEntry.choices(state)
      : logEntry?.choices || [];

    logger.log('[STATE] applyEventChoice called:', {
      choiceId,
      eventId,
      hasCurrentLogEntry: !!logEntry,
      currentLogEntryChoices: Array.isArray(logChoices) ? logChoices.map((c: any) => ({
        id: c.id,
        hasEffect: typeof c.effect === 'function',
        effectType: typeof c.effect
      })) : [],
      merchantTradesInState: state.merchantTrades,
      timedEventTabData: state.timedEventTab,
    });

    const changes = EventManager.applyEventChoice(
      state,
      choiceId,
      eventId,
      logEntry || undefined,
    );

    logger.log('[STATE] EventManager.applyEventChoice returned:', {
      choiceId,
      eventId,
      changes,
      hasResources: !!changes.resources,
      resourceKeys: changes.resources ? Object.keys(changes.resources) : [],
    });

    if (changes._choiceRejected) {
      return false;
    }

    let combatData = null;
    let logMessage = null;
    const updatedChanges = { ...changes };

    // Extract combat data if present
    if (updatedChanges._combatData) {
      combatData = updatedChanges._combatData;
      delete updatedChanges._combatData;
    }

    // Extract narrative log message if present
    const catalogId = getEventCatalogIdByEventId(eventId);
    const eventDef = gameEvents[eventId];
    const i18nVars = getEventI18nVars(eventId, state);
    const logMessageVars = updatedChanges._logMessageVars as
      | Record<string, string | number>
      | undefined;
    if (updatedChanges._logMessageKey) {
      logMessage = resolveEventLogMessage(
        catalogId,
        updatedChanges._logMessageKey as string,
        { ...i18nVars, ...logMessageVars },
      );
      delete updatedChanges._logMessageKey;
      delete updatedChanges._logMessageVars;
    } else if (updatedChanges._logMessageI18nKey) {
      logMessage = getEventsCatalogText(
        updatedChanges._logMessageI18nKey as string,
        { ...i18nVars, ...logMessageVars },
      );
      delete updatedChanges._logMessageI18nKey;
    } else if (updatedChanges._logMessage) {
      // Legacy English fallback for events not yet migrated to _logMessageKey.
      logMessage = getEventLogMessageByFallback(
        eventId,
        updatedChanges._logMessage as string,
      );
      delete updatedChanges._logMessage;
    }

    const outcomeTitle = resolveEventOutcomeTitle(
      catalogId,
      eventDef,
      state,
      { ...i18nVars, ...logMessageVars },
      logEntry,
    );

    const madnessChange = detectMadnessChange(updatedChanges, state);
    let shouldShowRewardDialog = false;
    let rewardDialogData: {
      rewards: any;
      successLog?: string;
      variant: "success";
      title?: string;
    } | null = null;
    let shouldShowMadnessDialog = false;
    let madnessDialogData: {
      rewards?: any;
      successLog?: string;
      madnessChange: number;
      title?: string;
    } | null = null;

    // Log ids are `merchant-<timestamp>`. Both the reward gate and the
    // follow-up narrative dialog must treat those as merchant events.
    const isMerchantEvent =
      eventId === "merchant" || eventId.startsWith("merchant-");

    if (!combatData) {
      const rewards = detectRewards(updatedChanges, state, eventId, { trackLosses: true });
      // Losses alone open the outcome dialog only when there is narrative (`_logMessage` → logMessage),
      // so silent resource updates do not suddenly pop the reward modal.
      const hasRewards =
        rewardPayloadHasPositiveChanges(rewards) ||
        (rewardPayloadHasOutcomeLosses(rewards) && Boolean(logMessage));
      const successLog = logMessage || undefined;
      const isCubeDiscoveryEvent = eventId === "cubeDiscovery";
      // Feast, solstice, curse, etc. announce via VillageEffectDialog. Hosting
      // costs would otherwise trip the loss+log RewardDialog path (wrong icon).
      const villageTheme = resolveVillageEffectAnnouncementTheme(
        eventId,
        updatedChanges,
        state,
      );
      const isCollectorEvent =
        eventId === "wandering_collector" ||
        eventId?.startsWith?.("wandering_collector-");
      const isCollectorTrade =
        isCollectorEvent && isCollectorTradeChoiceId(choiceId);
      const isCollectorLeave =
        isCollectorEvent && isCollectorLeaveChoiceId(choiceId);

      // Mid-visit collector trades: bank rewards for the leave dialog (no popup yet).
      if (isCollectorTrade) {
        const pending = mergeRewardPayloads(
          state.timedEventTab?.collectorPendingRewards as
          | ReturnType<typeof detectRewards>
          | undefined,
          rewards,
        );
        // Stash on timed tab via the apply set() below (not GameState schema).
        (updatedChanges as any)._collectorPendingRewards = pending;
      } else if (
        isCollectorLeave &&
        (rewardPayloadHasPositiveChanges(
          (state.timedEventTab?.collectorPendingRewards ||
            {}) as ReturnType<typeof detectRewards>,
        ) ||
          rewardPayloadHasOutcomeLosses(
            (state.timedEventTab?.collectorPendingRewards ||
              {}) as ReturnType<typeof detectRewards>,
          ) ||
          hasRewards)
      ) {
        const mergedRewards = mergeRewardPayloads(
          state.timedEventTab?.collectorPendingRewards as
          | ReturnType<typeof detectRewards>
          | undefined,
          rewards,
        );
        rewardDialogData = {
          rewards: mergedRewards,
          successLog,
          variant: "success",
          title: outcomeTitle,
          ...(madnessChange !== 0 ? { madnessChange } : {}),
        };
        shouldShowRewardDialog = true;
        (updatedChanges as any)._clearCollectorPendingRewards = true;
      } else if (
        hasRewards &&
        !isMerchantEvent &&
        !isCubeDiscoveryEvent &&
        !villageTheme &&
        !isCollectorTrade
      ) {
        rewardDialogData = {
          rewards,
          successLog,
          variant: "success",
          title: outcomeTitle,
          ...(madnessChange !== 0 ? { madnessChange } : {}),
        };
        shouldShowRewardDialog = true;
      }

      // Madness-only popup when there is no reward/outcome dialog to host the line.
      if (madnessChange !== 0 && !shouldShowRewardDialog) {
        madnessDialogData = {
          rewards: hasRewards ? rewards : undefined,
          successLog,
          madnessChange,
          title: outcomeTitle,
        };
        shouldShowMadnessDialog = true;
      }

      // Only clear logMessage when it will be shown in reward or madness dialog.
      // For events that suppress the reward dialog (cubeDiscovery, merchant,
      // village-effect announcements) but have outcomes, keep logMessage so
      // VillageEffectDialog / the narrative dialog can show it.
      if (shouldShowRewardDialog || shouldShowMadnessDialog) {
        logMessage = null;
      }
    }

    // Apply state changes FIRST - this includes relics, resources, schematics, etc.
    const collectorPendingRewards = (updatedChanges as any)
      ._collectorPendingRewards as
      | ReturnType<typeof detectRewards>
      | undefined;
    const clearCollectorPendingRewards = Boolean(
      (updatedChanges as any)._clearCollectorPendingRewards,
    );
    delete (updatedChanges as any)._collectorPendingRewards;
    delete (updatedChanges as any)._clearCollectorPendingRewards;

    if (
      Object.keys(updatedChanges).length > 0 ||
      collectorPendingRewards ||
      clearCollectorPendingRewards
    ) {
      set((prevState) => {
        // Use the same mergeStateUpdates function that other actions use.
        // Event rewards may exceed warehouse storage (kept until spent).
        const mergedUpdates = mergeStateUpdates(prevState, updatedChanges, {
          allowResourceOvercap: true,
        });

        const timedEventTab =
          collectorPendingRewards || clearCollectorPendingRewards
            ? {
              ...prevState.timedEventTab,
              ...(collectorPendingRewards
                ? {
                  collectorPendingRewards:
                    collectorPendingRewards as Record<string, unknown>,
                }
                : {}),
              ...(clearCollectorPendingRewards
                ? { collectorPendingRewards: undefined }
                : {}),
            }
            : prevState.timedEventTab;

        const newState = {
          ...prevState,
          ...mergedUpdates,
          timedEventTab,
        };

        return newState;
      });

      StateManager.schedulePopulationUpdate(get);
      StateManager.scheduleEffectsUpdate(get);
    }

    // Show reward/outcome dialog before madness-only popup so narrative + gains are visible.
    if (shouldShowRewardDialog && rewardDialogData) {
      beginDialogHandoff(set);
      get().setEventDialog(false);
      scheduleRewardDialogWhenClear(get, rewardDialogData, 200);
      return true;
    }

    if (shouldShowMadnessDialog && madnessDialogData) {
      beginDialogHandoff(set);
      get().setEventDialog(false);
      scheduleMadnessDialogWhenClear(get, madnessDialogData, 200);
      return true;
    }

    // Merchant events apply their changes without a follow-up dialog.
    // Only create a log message dialog if there's a _logMessage but no combat and it's not a merchant event
    // Note: _logMessage is for dialog feedback only, not for the main log
    // Skip if this is a village attack event that already showed reward dialog
    if (
      logMessage &&
      !combatData &&
      !isMerchantEvent &&
      !shouldShowRewardDialog &&
      !shouldShowMadnessDialog
    ) {
      beginDialogHandoff(set);
      get().setEventDialog(false);
      const villageTheme = resolveVillageEffectAnnouncementTheme(
        eventId,
        updatedChanges,
        state,
      );

      if (villageTheme) {
        scheduleVillageEffectDialogWhenClear(
          get,
          {
            themeId: villageTheme,
            title: outcomeTitle,
            message: logMessage,
          },
          200,
        );
        return true;
      }

      setTimeout(() => {
        const messageEntry: LogEntry = {
          id: `log-message-${Date.now()}`,
          eventId,
          message: logMessage,
          timestamp: Date.now(),
          type: "event",
          title: outcomeTitle,
          choices: [
            {
              id: "acknowledge",
              label: tWithFallback("common", "buttons.continue", "Continue"),
              effect: () => ({}),
            },
          ],
          skipSound: true, // Don't play sound for log messages
        };

        get().setEventDialog(true, messageEntry);
      }, 200);
      return true; // Don't proceed to combat dialog
    }

    // Handle combat dialog
    if (combatData) {
      get().setEventDialog(false);
      get().setCombatDialog(true, {
        enemy: combatData.enemy,
        eventTitle:
          combatData.eventTitle ||
          logEntry?.title ||
          "",
        eventMessage:
          combatData.eventMessage ||
          logEntry?.message ||
          "",
        onVictory: () => {
          const victoryResult = combatData.onVictory();
          set((prevState) => ({
            ...mergeCombatVictoryState(prevState, victoryResult),
            log: prevState.log,
          }));
          get().setCombatDialog(false);
        },
        onDefeat: () => {
          const prevState = get();
          const defeatResult = combatData.onDefeat();
          const { _logMessage, _combatSummary, ...stateUpdates } =
            defeatResult as Record<string, unknown> & {
              _logMessage?: string;
              _combatSummary?: Record<string, unknown>;
            };
          const madnessChange = detectMadnessChange(
            stateUpdates as Partial<GameState>,
            prevState,
          );
          set((prevState) => ({
            ...mergeCombatDefeatState(
              prevState,
              stateUpdates as Parameters<typeof mergeCombatDefeatState>[1],
            ),
            log: _logMessage
              ? [
                ...prevState.log,
                {
                  id: `combat-defeat-${Date.now()}`,
                  message: _logMessage,
                  timestamp: Date.now(),
                  type: "system",
                },
              ].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES)
              : prevState.log,
          }));
          const combatSummary = extractCombatResultSummary(
            _combatSummary
              ? { _combatSummary }
              : (defeatResult as Record<string, unknown>),
          );
          scheduleMadnessDialogAfterCombat(
            get,
            madnessChange,
            combatSummary,
            combatData.eventTitle,
          );
          return combatSummary;
        },
      });
      return true;
    }

    // Dialog closing is now handled in EventDialog component
    return true;
  },
});
