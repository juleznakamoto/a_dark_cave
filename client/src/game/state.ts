// Removed duplicate keys and ensured gameId is correctly handled.
import { create } from "zustand";
import { GameState, gameStateSchema, Referral } from "@shared/schema";
import { gameActions, shouldShowAction, canExecuteAction } from "@/game/rules";
import { EventManager, LogEntry } from "@/game/rules/events";
import { checkMilestoneLogEntries } from "@/game/rules/eventLogEntries";
import { executeGameAction, deductActionCosts } from "@/game/actions";
import type {
  GameTab,
  EventDialogState,
  CombatDialogState,
  IdleModeDialogState,
  IdleModeState,
  TimedEventTabState,
  InactivityReason,
  Currency,
  FocusState,
  MerchantTradesState,
  GameStats,
  ActionResult,
} from "@/game/types";
import {
  updateResource,
  updateFlag,
  updatePopulationCounts,
  assignVillagerToJob,
  unassignVillagerFromJob,
  mergeCombatVictoryState,
} from "@/game/stateHelpers";
import { capResourceToLimit } from "@/game/resourceLimits";
import {
  calculateTotalEffects,
  getTotalLuck,
  getTotalStrength,
  getTotalKnowledge,
  getTotalMadness,
} from "@/game/rules/effectsCalculation";
import { calculateBastionStats } from "@/game/bastionStats";
import { getCurrentPopulation, getMaxPopulation } from "@/game/population";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import { GAME_CONSTANTS } from "@/game/constants";
import {
  ACTION_TO_UPGRADE_KEY,
  incrementButtonUsage,
} from "@/game/buttonUpgrades";
import { getExecutionTime } from "@/game/rules";
import {
  gamblerDiceResumeOnLoad,
  getGamblerTutorialPlaysRemaining,
  GAMBLER_TUTORIAL_PLAYS,
  GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY,
} from "@/game/gamblerSession";
import { logger } from "@/lib/logger";
import { madnessEvents } from "@/game/rules/eventsMadness";
import { DISGRACED_PRIOR_UPGRADES } from "@/game/rules/skillUpgrades";
import {
  generateMerchantChoices,
  merchantEvents,
} from "@/game/rules/eventsMerchant";
import {
  buildInvestmentResultDialogPayload,
  commitInvestmentRolls,
  formatInvestmentCompletionLog,
  generateInvestmentOffers,
  getMaxInvestmentStake,
  getInvestmentWaveGapMs,
  investmentHallLuckyChanceBonusPct,
  normalizeInvestmentHallState,
} from "@/game/rules/investmentHallTables";

// Types
interface GameStore extends GameState {
  // UI state
  activeTab:
  | "cave"
  | "village"
  | "forest"
  | "bastion"
  | "estate"
  | "achievements"
  | "timedevent";
  devMode: boolean;
  boostMode: boolean;
  lastSaved: string;
  eventDialog: {
    isOpen: boolean;
    currentEvent: LogEntry | null;
  };
  combatDialog: {
    isOpen: boolean;
    enemy: any | null;
    eventTitle: string;
    eventMessage: string;
    onVictory: (() => Partial<GameState>) | null;
    onDefeat: (() => Partial<GameState>) | null;
  };
  authDialogOpen: boolean;
  shopDialogOpen: boolean;
  /** True while the obsessed gambler dice minigame UI is open (freezes production like other modal dialogs). */
  gamblerDiceDialogOpen: boolean;
  /** Village Invest modal open; game loop treats offer-picker as modal pause but keeps sim running while an investment is maturing. */
  investDialogOpen: boolean;
  investmentResultDialog: {
    isOpen: boolean;
    data: ReturnType<typeof buildInvestmentResultDialogPayload> | null;
  };
  leaderboardDialogOpen: boolean;
  fullGamePurchaseDialogOpen: boolean;
  idleModeDialog: {
    isOpen: boolean;
  };
  idleModeState: {
    isActive: boolean;
    startTime: number;
    needsDisplay: boolean; // Track if user needs to see results
  };
  inactivityDialogOpen: boolean;
  inactivityReason: "timeout" | "multitab" | null;
  versionCheckDialogOpen: boolean; // Added for version check dialog
  restartGameDialogOpen: boolean;
  playlightWelcomeDialogOpen: boolean;

  // Notification state for shop
  shopNotificationSeen: boolean;
  shopNotificationVisible: boolean;

  // Notification state for auth
  authNotificationSeen: boolean;
  authNotificationVisible: boolean;

  // Sign-up prompt dialog (after 30 min play time for guests)
  signUpPromptDialogOpen: boolean;
  signUpPromptEligibleForGold: boolean; // Set when user clicks Sign Up on prompt; cleared after signup or dialog close
  lastSignUpPromptPlayTime: number; // playTime when we last showed the dialog (for 30 min repeat)

  // Notification state for mysterious note
  mysteriousNoteShopNotificationSeen: boolean;
  mysteriousNoteDonateNotificationSeen: boolean;

  // Resource highlighting state
  highlightedResources: string[]; // Updated to array for serialization

  // Auth state
  isUserSignedIn: boolean;

  // Play time tracking
  playTime: number;
  isNewGame: boolean; // Track if this is a newly started game
  startTime: number; // Timestamp when the current game was started

  // Feast activation tracking (not purchases - those are in DB)
  feastActivations: Record<string, number>; // purchaseId -> activations remaining

  // Referral tracking
  referralCount: number;
  referredUsers: string[];
  referrals: Referral[]; // Added to store referral details

  // Free gold claim tracking
  lastFreeGoldClaim: number; // timestamp of last claim

  // Currency detection (persists across game restarts)
  detectedCurrency: Currency | null;

  // Google Ads source tracking (persists across game restarts)
  googleAdsSource: string | null;

  // Cooldown management
  cooldowns: Record<string, number>;
  initialCooldowns: Record<string, number>;

  // Execution time (reverse cooldown - action takes time to complete)
  executionStartTimes: Record<string, number>;
  executionDurations: Record<string, number>;
  _completingExecution?: string; // Internal: when set, executeAction skips execution-time check

  // Compass glow effect
  compassGlowButton: string | null; // Action ID of button to glow

  // Timed event tab (not part of GameState, only UI state)
  timedEventTab: {
    isActive: boolean;
    event: LogEntry | null;
    expiryTime: number;
    startTime?: number;
    /** Gambler only: plays left this visit; set when tab opens, decremented on resolved dismiss. Stops Accept from re-granting bone-dice quota after gamblerGame is cleared. */
    gamblerRoundsRemaining?: number;
  };

  // Merchant trades state
  merchantTrades: {
    choices: Array<any>; // Will be MerchantTradeData from eventsMerchant.ts
    purchasedIds: string[];
  };

  // Active gambler dice game (persisted; includes session for resume-on-refresh)
  gamblerGame: GameState["gamblerGame"];

  // Focus system
  focusState: FocusState;

  // Population helpers
  current_population: number;
  total_population: number;

  // Game loop state
  loopProgress: number; // 0-100 representing progress through the 15s production cycle
  isGameLoopActive: boolean;
  isPaused: boolean; // New state for pause/unpause
  musicMuted: boolean; // Background music mute state
  sfxMuted: boolean; // Sound effects mute state

  // Analytics tracking
  clickAnalytics: Record<string, number>;
  lastResourceSnapshotTime: number;
  isPausedPreviously: boolean;

  // Achievements
  unlockedAchievements: string[];
  claimedAchievements: string[];
  unlockAchievement: (achievementId: string) => void;

  // Leaderboard
  username?: string;
  setUsername: (username: string) => void;

  // Game completion tracking
  game_stats: GameStats[];
  hasWonAnyGame: boolean;

  // Reward dialog
  rewardDialog: {
    isOpen: boolean;
    data: any; // RewardDialogData will be imported from the component
  };
  madnessDialog: {
    isOpen: boolean;
    data: any;
  };

  // Actions
  getAndResetResourceAnalytics: () => Record<string, number> | null;
  executeAction: (actionId: string) => void;
  setActiveTab: (tab: GameTab) => void;
  setBoostMode: (enabled: boolean) => void;
  setMusicMuted: (muted: boolean) => void;
  setSfxMuted: (muted: boolean) => void;
  setShopNotificationSeen: (seen: boolean) => void;
  setShopNotificationVisible: (visible: boolean) => void;
  setAuthNotificationSeen: (seen: boolean) => void;
  setAuthNotificationVisible: (visible: boolean) => void;
  setSignUpPromptDialogOpen: (isOpen: boolean) => void;
  setSignUpPromptEligibleForGold: (eligible: boolean) => void;
  setLastSignUpPromptPlayTime: (playTime: number) => void;
  setMysteriousNoteShopNotificationSeen: (seen: boolean) => void;
  setMysteriousNoteDonateNotificationSeen: (seen: boolean) => void;
  setHighlightedResources: (resources: string[]) => void;
  setIsUserSignedIn: (signedIn: boolean) => void;
  setDetectedCurrency: (currency: "EUR" | "USD") => void;
  updateResource: (
    resource: keyof GameState["resources"],
    amount: number,
  ) => void;
  setFlag: (flag: keyof GameState["flags"], value: boolean) => void;
  setHoveredTooltip: (tooltipId: string, value: boolean) => void;
  setScrollIndicatorSeen: (scrollAreaId: string) => void;
  initialize: (state: GameState) => void;
  restartGame: () => void;
  loadGame: () => Promise<void>;
  toggleDevMode: () => void;
  getMaxPopulation: () => number;
  updatePopulation: () => void;
  setCooldown: (action: string, duration: number) => void;
  tickCooldowns: () => void;
  startActionExecution: (actionId: string) => void;
  completeActionExecution: (actionId: string) => void;
  togglePriorAction: (actionId: string) => void;
  setCompassGlow: (actionId: string | null) => void;
  addLogEntry: (entry: LogEntry) => void;
  checkEvents: () => void;
  applyEventChoice: (choiceId: string, eventId: string) => void;
  assignVillager: (job: keyof GameState["villagers"]) => void;
  unassignVillager: (job: keyof GameState["villagers"]) => void;
  setEventDialog: (isOpen: boolean, event?: LogEntry | null) => void;
  setCombatDialog: (isOpen: boolean, data?: any) => void;
  setTimedEventTab: (isActive: boolean, event?: LogEntry | null, duration?: number) => Promise<void>;
  callMerchant: () => void;
  startInvestment: (
    offerIndex: number,
    amountGold: number,
  ) => { ok: true } | { ok: false; reason: string };
  tickInvestmentHall: () => void;
  setAuthDialogOpen: (isOpen: boolean) => void;
  setShopDialogOpen: (isOpen: boolean) => void;
  setGamblerDiceDialogOpen: (isOpen: boolean) => void;
  setInvestDialogOpen: (isOpen: boolean) => void;
  setInvestmentResultDialog: (
    isOpen: boolean,
    data?: ReturnType<typeof buildInvestmentResultDialogPayload> | null,
  ) => void;
  setLeaderboardDialogOpen: (isOpen: boolean) => void;
  setFullGamePurchaseDialogOpen: (isOpen: boolean) => void;
  setIdleModeDialog: (isOpen: boolean) => void;
  setRestartGameDialogOpen: (isOpen: boolean) => void;
  updateEffects: () => void;
  updateBastionStats: () => void;
  updateStats: () => void;
  updateLoopProgress: (progress: number) => void;
  setGameLoopActive: (isActive: boolean) => void;
  togglePause: () => void;
  updatePlayTime: (deltaTime: number) => void;
  trackButtonClick: (buttonId: string) => void;
  setVersionCheckDialog: (isOpen: boolean) => void;
  updateFocusState: (state: Partial<FocusState> & {
    isActive: boolean;
    endTime: number;
    startTime?: number;
    duration?: number;
    points?: number;
  }) => void;
  updateResources: (updates: Partial<GameState["resources"]>) => void;
  setRewardDialog: (isOpen: boolean, data?: any) => void;
  setMadnessDialog: (isOpen: boolean, data?: any) => void;
}

// Helper function to detect rewards from state updates
export const detectRewards = (
  stateUpdates: Partial<GameState>,
  currentState: GameState,
  actionId: string,
  options?: { trackLosses?: boolean }
) => {
  const trackLosses = options?.trackLosses ?? rewardDialogVillageAttackEvents.has(actionId);
  const rewards: {
    resources?: Partial<Record<keyof GameState["resources"], number>>;
    resourceLosses?: Partial<Record<keyof GameState["resources"], number>>;
    villagersLost?: number;
    populationGained?: number;
    tools?: (keyof GameState["tools"])[];
    weapons?: (keyof GameState["weapons"])[];
    clothing?: (keyof GameState["clothing"])[];
    clothingLost?: (keyof GameState["clothing"])[];
    relics?: (keyof GameState["relics"])[];
    relicsLost?: (keyof GameState["relics"])[];
    blessings?: (keyof GameState["blessings"])[];
    books?: (keyof GameState["books"])[];
    schematics?: (keyof GameState["schematics"])[];
    fellowship?: (keyof GameState["fellowship"])[];
    stats?: Partial<GameState["stats"]>;
  } = {};

  // Check for new tools (items set to true that weren't owned before)
  if (stateUpdates.tools) {
    const newTools = Object.keys(stateUpdates.tools).filter(
      tool => stateUpdates.tools![tool as keyof typeof stateUpdates.tools] === true &&
        !currentState.tools[tool as keyof typeof currentState.tools]
    );
    if (newTools.length > 0) {
      rewards.tools = newTools as (keyof GameState["tools"])[];
    }
  }

  // Check for new weapons (items set to true that weren't owned before)
  if (stateUpdates.weapons) {
    const newWeapons = Object.keys(stateUpdates.weapons).filter(
      weapon => stateUpdates.weapons![weapon as keyof typeof stateUpdates.weapons] === true &&
        !currentState.weapons[weapon as keyof typeof currentState.weapons]
    );
    if (newWeapons.length > 0) {
      rewards.weapons = newWeapons as (keyof GameState["weapons"])[];
    }
  }

  // Check for new clothing (items set to true that weren't owned before)
  if (stateUpdates.clothing) {
    const newClothing = Object.keys(stateUpdates.clothing).filter(
      clothing => stateUpdates.clothing![clothing as keyof typeof stateUpdates.clothing] === true &&
        !currentState.clothing[clothing as keyof typeof currentState.clothing]
    );
    if (newClothing.length > 0) {
      rewards.clothing = newClothing as (keyof GameState["clothing"])[];
    }
    const lostClothing = Object.keys(stateUpdates.clothing).filter((id) => {
      if (stateUpdates.clothing![id as keyof typeof stateUpdates.clothing] !== false) {
        return false;
      }
      return Boolean(currentState.clothing[id as keyof typeof currentState.clothing]);
    });
    if (lostClothing.length > 0) {
      rewards.clothingLost = lostClothing as (keyof GameState["clothing"])[];
    }
  }

  // Check for new relics (items set to true that weren't owned before)
  if (stateUpdates.relics) {
    const newRelics = Object.keys(stateUpdates.relics).filter(
      relic => stateUpdates.relics![relic as keyof typeof stateUpdates.relics] === true &&
        !currentState.relics[relic as keyof typeof currentState.relics]
    );
    if (newRelics.length > 0) {
      rewards.relics = newRelics as (keyof GameState["relics"])[];
    }
    const lostRelics = Object.keys(stateUpdates.relics).filter((id) => {
      if (stateUpdates.relics![id as keyof typeof stateUpdates.relics] !== false) {
        return false;
      }
      return Boolean(currentState.relics[id as keyof typeof currentState.relics]);
    });
    if (lostRelics.length > 0) {
      rewards.relicsLost = lostRelics as (keyof GameState["relics"])[];
    }
  }

  // Check for new blessings (items set to true that weren't owned before)
  if (stateUpdates.blessings) {
    const newBlessings = Object.keys(stateUpdates.blessings).filter(
      blessing => stateUpdates.blessings![blessing as keyof typeof stateUpdates.blessings] === true &&
        !currentState.blessings[blessing as keyof typeof currentState.blessings]
    );
    if (newBlessings.length > 0) {
      rewards.blessings = newBlessings as (keyof GameState["blessings"])[];
    }
  }

  // Check for new books (items set to true that weren't owned before)
  if (stateUpdates.books) {
    const newBooks = Object.keys(stateUpdates.books).filter(
      book => stateUpdates.books![book as keyof typeof stateUpdates.books] === true &&
        !currentState.books[book as keyof typeof currentState.books]
    );
    if (newBooks.length > 0) {
      rewards.books = newBooks as (keyof GameState["books"])[];
    }
  }

  // Check for new schematics (items set to true that weren't owned before)
  if (stateUpdates.schematics) {
    const newSchematics = Object.keys(stateUpdates.schematics).filter(
      schematic => stateUpdates.schematics![schematic as keyof typeof stateUpdates.schematics] === true &&
        !currentState.schematics[schematic as keyof typeof currentState.schematics]
    );
    if (newSchematics.length > 0) {
      rewards.schematics = newSchematics as (keyof GameState["schematics"])[];
    }
  }

  // Check for new fellowship members (items set to true that weren't owned before)
  if (stateUpdates.fellowship) {
    const newMembers = Object.keys(stateUpdates.fellowship).filter(
      member => stateUpdates.fellowship![member as keyof typeof stateUpdates.fellowship] === true &&
        !currentState.fellowship[member as keyof typeof currentState.fellowship]
    );
    if (newMembers.length > 0) {
      rewards.fellowship = newMembers as (keyof GameState["fellowship"])[];
    }
  }

  // Check for increased resources (positive values in stateUpdates)
  if (stateUpdates.resources) {
    const rewardResources: Record<string, number> = {};
    const resourceLosses: Record<string, number> = {};
    const shouldTrackResourceLosses = trackLosses;

    Object.entries(stateUpdates.resources).forEach(([resource, finalAmount]) => {
      if (typeof finalAmount === 'number') {
        const originalAmount = currentState.resources[resource as keyof typeof currentState.resources] || 0;
        const delta = finalAmount - originalAmount;
        if (delta > 0) {
          rewardResources[resource] = delta;
        } else if (shouldTrackResourceLosses && delta < 0) {
          resourceLosses[resource] = Math.abs(delta);
        }
      }
    });

    if (Object.keys(rewardResources).length > 0) {
      rewards.resources = rewardResources as Partial<Record<keyof GameState["resources"], number>>;
    }
    if (Object.keys(resourceLosses).length > 0) {
      rewards.resourceLosses = resourceLosses as Partial<Record<keyof GameState["resources"], number>>;
    }
  }

  // Check for villager deaths (from killVillagers) when tracking losses
  if (trackLosses) {
    const villagersKilled = (stateUpdates as { villagersKilled?: number }).villagersKilled;
    if (typeof villagersKilled === "number" && villagersKilled > 0) {
      rewards.villagersLost = villagersKilled;
    }
  }

  // Check for population gain (villagers added)
  if (stateUpdates.villagers) {
    const currentTotal = Object.values(currentState.villagers || {}).reduce(
      (sum, count) => sum + (count || 0),
      0,
    );
    const mergedVillagers = { ...currentState.villagers, ...stateUpdates.villagers };
    const newTotal = Object.values(mergedVillagers).reduce(
      (sum, count) => sum + (count || 0),
      0,
    );
    const gained = newTotal - currentTotal;
    if (gained > 0) {
      rewards.populationGained = gained;
    }
  }

  // Check for increased stats (positive values in stateUpdates)
  if (stateUpdates.stats) {
    const rewardStats: Record<string, number> = {};
    Object.entries(stateUpdates.stats).forEach(([stat, finalAmount]) => {
      if (typeof finalAmount === 'number') {
        const originalAmount = currentState.stats[stat as keyof typeof currentState.stats] || 0;
        const gained = finalAmount - originalAmount;
        if (gained > 0) {
          rewardStats[stat] = gained;
        }
      }
    });
    if (Object.keys(rewardStats).length > 0) {
      rewards.stats = rewardStats as Partial<GameState["stats"]>;
    }
  }

  return rewards;
};

const detectMadnessChange = (
  stateUpdates: Partial<GameState>,
  currentState: GameState,
): number => {
  if (!stateUpdates.stats) {
    return 0;
  }

  // Prefer event-source madness tracking when available.
  if (typeof stateUpdates.stats.madnessFromEvents === "number") {
    return (
      stateUpdates.stats.madnessFromEvents -
      (currentState.stats.madnessFromEvents || 0)
    );
  }

  if (typeof stateUpdates.stats.madness === "number") {
    return stateUpdates.stats.madness - (currentState.stats.madness || 0);
  }

  return 0;
};

// Define which actions should trigger reward dialogs (whitelist)
export const rewardDialogActions = new Set([
  "layTrap",
  "castleRuins",
  "hillGrave",
  "sunkenTemple",
  "collapsedTower",
  "forestCave",
  "blackreachCanyon",
  "steelDelivery",
  "lowChamber",
  "occultistChamber",
  "hiddenLibrary",
  "exploreUndergroundLake",
]);

// Define which village attack events should trigger reward dialogs
export const rewardDialogVillageAttackEvents = new Set([
  "boneArmyAttack",
  "wolfAttack",
  "cannibalRaid",
  "bloodMoonAttack",
  "hiddenLake",
]);

// Helper functions
const mergeStateUpdates = (
  prevState: GameState,
  stateUpdates: Partial<GameState>,
): Partial<GameState> => {
  // Ensure resources never go negative when merging, and apply resource limits
  const mergedResources = { ...prevState.resources, ...stateUpdates.resources };
  Object.keys(mergedResources).forEach((key) => {
    if (
      typeof mergedResources[key as keyof typeof mergedResources] === "number"
    ) {
      let value = mergedResources[key as keyof typeof mergedResources];
      // First ensure non-negative
      if (value < 0) {
        value = 0;
      }
      // Then apply resource limit
      value = capResourceToLimit(key, value, { ...prevState, ...stateUpdates });
      mergedResources[key as keyof typeof mergedResources] = value;
    }
  });

  const merged = {
    resources: mergedResources,
    weapons: { ...prevState.weapons, ...stateUpdates.weapons },
    tools: { ...prevState.tools, ...stateUpdates.tools },
    buildings: { ...prevState.buildings, ...stateUpdates.buildings },
    flags: { ...prevState.flags, ...stateUpdates.flags },
    villagers: { ...prevState.villagers, ...stateUpdates.villagers },
    expeditionVillagers: {
      ...prevState.expeditionVillagers,
      ...stateUpdates.expeditionVillagers,
    },
    clothing: { ...prevState.clothing, ...stateUpdates.clothing },
    relics: { ...prevState.relics, ...stateUpdates.relics },
    books: { ...prevState.books, ...stateUpdates.books },
    fellowship: { ...prevState.fellowship, ...stateUpdates.fellowship },
    blessings: { ...prevState.blessings, ...stateUpdates.blessings },
    events: { ...prevState.events, ...stateUpdates.events },
    stats: { ...prevState.stats, ...stateUpdates.stats },
    cooldowns: { ...prevState.cooldowns, ...stateUpdates.cooldowns },
    initialCooldowns: { ...prevState.initialCooldowns, ...(stateUpdates as any).initialCooldowns },
    schematics: { ...prevState.schematics, ...stateUpdates.schematics },
    attackWaveTimers: {
      ...prevState.attackWaveTimers,
      ...stateUpdates.attackWaveTimers,
    },
    triggeredEvents: {
      ...prevState.triggeredEvents,
      ...stateUpdates.triggeredEvents,
    },
    feastState: stateUpdates.feastState || prevState.feastState,
    boneDevourerState:
      stateUpdates.boneDevourerState || prevState.boneDevourerState,
    greatFeastState: stateUpdates.greatFeastState || prevState.greatFeastState,
    solsticeState: stateUpdates.solsticeState || prevState.solsticeState,
    bloodMoonState: stateUpdates.bloodMoonState || prevState.bloodMoonState,
    curseState: stateUpdates.curseState || prevState.curseState,
    frostfallState: stateUpdates.frostfallState || prevState.frostfallState,
    woodcutterState: stateUpdates.woodcutterState || prevState.woodcutterState,
    tradersGratitudeState: stateUpdates.tradersGratitudeState || prevState.tradersGratitudeState,
    fogState: stateUpdates.fogState || prevState.fogState,
    disgustState: stateUpdates.disgustState || prevState.disgustState,
    sleepUpgrades: stateUpdates.sleepUpgrades || prevState.sleepUpgrades,
    combatSkills: stateUpdates.combatSkills || prevState.combatSkills,
    clickAnalytics: {
      ...prevState.clickAnalytics,
      ...stateUpdates.clickAnalytics,
    },
    madness:
      stateUpdates.madness !== undefined
        ? stateUpdates.madness
        : prevState.madness,
    heartfireState: stateUpdates.heartfireState || prevState.heartfireState,
    miningBoostState:
      stateUpdates.miningBoostState || prevState.miningBoostState,
    greatFeastActivations:
      stateUpdates.greatFeastActivations !== undefined
        ? stateUpdates.greatFeastActivations
        : prevState.greatFeastActivations,
    buttonUpgrades: stateUpdates.buttonUpgrades
      ? {
        ...prevState.buttonUpgrades,
        ...Object.fromEntries(
          Object.entries(stateUpdates.buttonUpgrades).map(([key, value]) => [
            key,
            {
              ...prevState.buttonUpgrades[
              key as keyof typeof prevState.buttonUpgrades
              ],
              ...value,
            },
          ]),
        ),
      }
      : prevState.buttonUpgrades,
    story: stateUpdates.story
      ? {
        ...prevState.story,
        seen: { ...prevState.story.seen, ...stateUpdates.story.seen },
        merchantPurchases:
          stateUpdates.story.merchantPurchases !== undefined
            ? stateUpdates.story.merchantPurchases
            : prevState.story.merchantPurchases,
      }
      : prevState.story,
    effects: stateUpdates.effects || prevState.effects,
    // Merge loop-related states if they are part of stateUpdates
    loopProgress:
      stateUpdates.loopProgress !== undefined
        ? stateUpdates.loopProgress
        : prevState.loopProgress,
    isGameLoopActive:
      stateUpdates.isGameLoopActive !== undefined
        ? stateUpdates.isGameLoopActive
        : prevState.isGameLoopActive,
    isPaused:
      stateUpdates.isPaused !== undefined
        ? stateUpdates.isPaused
        : prevState.isPaused, // Merge isPaused
    playTime:
      stateUpdates.playTime !== undefined
        ? stateUpdates.playTime
        : prevState.playTime, // Merge playTime
    referralCount:
      stateUpdates.referralCount !== undefined
        ? stateUpdates.referralCount
        : prevState.referralCount, // Merge referralCount
    referredUsers: stateUpdates.referredUsers || prevState.referredUsers, // Merge referredUsers
    referrals: stateUpdates.referrals || prevState.referrals, // Merge referrals
    social_media_rewards:
      stateUpdates.social_media_rewards || prevState.social_media_rewards, // Merge social_media_rewards
    lastResourceSnapshotTime:
      stateUpdates.lastResourceSnapshotTime !== undefined
        ? stateUpdates.lastResourceSnapshotTime
        : prevState.lastResourceSnapshotTime, // Merge lastResourceSnapshotTime
    isPausedPreviously:
      stateUpdates.isPausedPreviously !== undefined
        ? stateUpdates.isPausedPreviously
        : prevState.isPausedPreviously, // Merge isPausedPreviously
    // Achievements state
    unlockedAchievements:
      stateUpdates.unlockedAchievements || prevState.unlockedAchievements,
    claimedAchievements:
      stateUpdates.claimedAchievements || prevState.claimedAchievements,
    // Game ID
    gameId:
      stateUpdates.gameId !== undefined
        ? stateUpdates.gameId
        : prevState.gameId,
    // Game completion tracking
    game_stats: stateUpdates.game_stats || prevState.game_stats,
    hasWonAnyGame:
      stateUpdates.hasWonAnyGame !== undefined
        ? stateUpdates.hasWonAnyGame
        : prevState.hasWonAnyGame,
    // Merchant trades state
    merchantTrades: stateUpdates.merchantTrades || prevState.merchantTrades,
  };

  if (
    stateUpdates.tools ||
    stateUpdates.weapons ||
    stateUpdates.clothing ||
    stateUpdates.relics ||
    stateUpdates.books
  ) {
    const tempState = { ...prevState, ...merged };
    merged.effects = calculateTotalEffects(tempState);
  }

  return merged;
};

const extractDefaultsFromSchema = (schema: any): any => {
  if (schema._def?.typeName === "ZodObject") {
    const result: any = {};
    const shape = schema._def.shape();

    for (const [key, fieldSchema] of Object.entries(shape)) {
      result[key] = extractDefaultsFromSchema(fieldSchema);
    }
    return result;
  }

  if (schema._def?.typeName === "ZodDefault") {
    const defaultValue = schema._def.defaultValue();
    const innerSchema = schema._def.innerType;

    if (
      typeof defaultValue === "object" &&
      defaultValue !== null &&
      Object.keys(defaultValue).length === 0 &&
      innerSchema._def?.typeName === "ZodObject"
    ) {
      return extractDefaultsFromSchema(innerSchema);
    }
    return defaultValue;
  }

  if (schema._def?.typeName === "ZodNumber") return 0;
  if (schema._def?.typeName === "ZodBoolean") return false;
  if (schema._def?.typeName === "ZodString") return "";
  if (schema._def?.typeName === "ZodArray") return [];
  if (schema._def?.typeName === "ZodRecord") return {};

  return undefined;
};

const generateDefaultGameState = (): GameState => {
  return extractDefaultsFromSchema(gameStateSchema) as GameState;
};

export const createInitialState = (): GameState => ({
  gameId: `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  playTime: 0,
  startTime: Date.now(),
  ...generateDefaultGameState(),
  effects: {
    resource_bonus: {},
    resource_multiplier: {},
    probability_bonus: {},
    cooldown_reduction: {},
  },
  bastion_stats: {
    defense: 0,
    attack: 0,
    integrity: 0,
  },
  hoveredTooltips: {},
  triggeredEvents: {},
  books: {
    book_of_ascension: false,
    book_of_war: false,
    book_of_trials: false,
  },
  fellowship: {},
  feastState: {
    isActive: false,
    endTime: 0,
    lastAcceptedLevel: 0,
  },
  boneDevourerState: {
    lastAcceptedLevel: 0,
  },
  greatFeastState: {
    isActive: false,
    endTime: 0,
  },
  solsticeState: {
    isActive: false,
    endTime: 0,
    tier: 1,
    activationsCount: 0,
  },
  bloodMoonState: {
    hasWon: false,
    occurrenceCount: 0,
  },
  curseState: {
    isActive: false,
    endTime: 0,
  },
  frostfallState: {
    isActive: false,
    endTime: 0,
  },
  woodcutterState: {
    isActive: false,
    endTime: 0,
  },
  tradersGratitudeState: {
    accepted: false,
  },
  fogState: {
    isActive: false,
    endTime: 0,
    duration: 0,
  },
  disgustState: {
    isActive: false,
    endTime: 0,
  },
  combatSkills: {
    crushingStrikeLevel: 0,
    bloodflameSphereLevel: 0,
  },
  activatedPurchases: {},
  feastActivations: {},
  cruelMode: false,
  attackWaveTimers: {},
  loopProgress: 0,
  isGameLoopActive: false,
  isPaused: false,
  musicMuted: false,
  sfxMuted: false,
  // Initialize shop notification state
  shopNotificationSeen: false,
  shopNotificationVisible: false,

  // Initialize auth notification state
  authNotificationSeen: false,
  authNotificationVisible: false,

  // Sign-up prompt dialog state
  signUpPromptDialogOpen: false,
  signUpPromptEligibleForGold: false,
  lastSignUpPromptPlayTime: 0,

  // Initialize mysterious note notification state
  mysteriousNoteShopNotificationSeen: false,
  mysteriousNoteDonateNotificationSeen: false,

  // Initialize resource highlighting state (array for serialization)
  highlightedResources: [],

  // Initialize free gold claim tracking
  lastFreeGoldClaim: 0,

  // Initialize currency detection
  detectedCurrency: null,

  // Initialize Google Ads source tracking
  googleAdsSource: null,

  // Initialize cooldown management
  cooldowns: {},
  initialCooldowns: {},
  executionStartTimes: {},
  executionDurations: {},
  expeditionVillagers: {},

  // Initialize compass glow
  compassGlowButton: null,

  // Initialize analytics tracking
  clickAnalytics: {},
  lastResourceSnapshotTime: 0,
  isPausedPreviously: false, // Initialize isPausedPreviously
  versionCheckDialogOpen: false, // Initialize version check dialog state

  // Initialize merchant trades state
  merchantTrades: {
    choices: [],
    purchasedIds: [],
  },

  // Initialize gambler game state
  gamblerGame: null,

  story: {
    seen: {
      [GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY]: GAMBLER_TUTORIAL_PLAYS,
    },
    merchantPurchases: 0,
  },

  // Achievements
  unlockedAchievements: [],
  claimedAchievements: [],

  // Reward dialog
  rewardDialog: {
    isOpen: false,
    data: null,
  },
  investmentResultDialog: {
    isOpen: false,
    data: null,
  },
  madnessDialog: {
    isOpen: false,
    data: null,
  },
});

const defaultGameState: GameState = createInitialState();

// State management utilities
export class StateManager {
  private static updateTimer: NodeJS.Timeout | null = null;

  static scheduleEffectsUpdate(store: () => GameStore) {
    if (this.updateTimer) return;

    this.updateTimer = setTimeout(() => {
      const state = store();
      state.updateEffects();
      state.updateBastionStats();
      state.updateStats();
      this.updateTimer = null;
    }, 0);
  }

  static clearUpdateTimer() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  static schedulePopulationUpdate(store: () => GameStore) {
    setTimeout(() => store().updatePopulation(), 0);
  }

  static handleDelayedEffects(delayedEffects: Array<() => void> | undefined) {
    if (!delayedEffects) return;

    delayedEffects.forEach((effect) => {
      effect();
    });
  }
}

/**
 * True while any blocking modal is open — simulation should freeze (loop, attack-wave timers, etc.).
 * When adding a new blocking dialog, add its flag here only.
 */
export function isModalDialogOpen(state: GameStore): boolean {
  return (
    state.eventDialog.isOpen ||
    state.combatDialog.isOpen ||
    state.authDialogOpen ||
    state.shopDialogOpen ||
    state.gamblerDiceDialogOpen ||
    state.leaderboardDialogOpen ||
    state.fullGamePurchaseDialogOpen ||
    state.idleModeDialog.isOpen ||
    state.restartGameDialogOpen ||
    state.rewardDialog.isOpen ||
    state.investmentResultDialog.isOpen ||
    state.madnessDialog.isOpen ||
    state.signUpPromptDialogOpen ||
    state.playlightWelcomeDialogOpen ||
    state.investDialogOpen
  );
}

// Main store
export const useGameStore = create<GameStore>((set, get) => ({
  ...defaultGameState,
  activeTab: "cave",
  devMode: import.meta.env.DEV,
  boostMode: false,
  lastSaved: "Never",
  cooldowns: {},
  executionStartTimes: {},
  executionDurations: {},
  expeditionVillagers: {},
  log: [],
  eventDialog: {
    isOpen: false,
    currentEvent: null,
  },
  combatDialog: {
    isOpen: false,
    enemy: null,
    eventTitle: "",
    eventMessage: "",
    onVictory: null,
    onDefeat: null,
  },
  timedEventTab: {
    isActive: false,
    event: null,
    expiryTime: 0,
  },
  authDialogOpen: false,
  shopDialogOpen: false,
  gamblerDiceDialogOpen: false,
  investDialogOpen: false,
  investmentResultDialog: {
    isOpen: false,
    data: null,
  },
  leaderboardDialogOpen: false,
  fullGamePurchaseDialogOpen: false,
  musicMuted: false,
  sfxMuted: false,
  idleModeDialog: {
    isOpen: false,
  },
  idleModeState: {
    isActive: false,
    startTime: 0,
    needsDisplay: false,
  },
  inactivityDialogOpen: false,
  inactivityReason: null,
  versionCheckDialogOpen: false, // Initialize version check dialog state
  restartGameDialogOpen: false,
  playlightWelcomeDialogOpen: false,
  sleepUpgrades: {
    lengthLevel: 0,
    intensityLevel: 0,
  },
  focusState: {
    isActive: false,
    endTime: 0,
    points: 0,
  },
  totalFocusEarned: 0,
  // Initialize shop notification state
  shopNotificationSeen: false,
  shopNotificationVisible: false,
  // Initialize auth notification state
  authNotificationSeen: false,
  authNotificationVisible: false,
  // Sign-up prompt dialog state
  signUpPromptDialogOpen: false,
  signUpPromptEligibleForGold: false,
  lastSignUpPromptPlayTime: 0,
  // Initialize mysterious note notification state
  mysteriousNoteShopNotificationSeen: false,
  mysteriousNoteDonateNotificationSeen: false,

  // Initialize resource highlighting
  highlightedResources: [], // Updated to array for serialization

  // Initialize free gold claim tracking
  lastFreeGoldClaim: 0,

  // Merchant trades state
  merchantTrades: {
    choices: [],
    purchasedIds: [],
  },

  // Gambler game state
  gamblerGame: null,

  // Achievements
  unlockedAchievements: [],
  claimedAchievements: [],
  unlockAchievement: (achievementId) =>
    set((state) => ({
      unlockedAchievements: state.unlockedAchievements.includes(achievementId)
        ? state.unlockedAchievements
        : [...state.unlockedAchievements, achievementId],
    })),

  // Leaderboard
  username: undefined,
  setUsername: (username: string) => set({ username }),

  setActiveTab: (
    tab: "cave" | "village" | "forest" | "bastion" | "estate" | "achievements",
  ) => set({ activeTab: tab }),

  setBoostMode: (enabled: boolean) => set({ boostMode: enabled }),
  setMusicMuted: (muted: boolean) => set({ musicMuted: muted }),
  setSfxMuted: (muted: boolean) => set({ sfxMuted: muted }),
  setShopNotificationSeen: (seen: boolean) =>
    set({ shopNotificationSeen: seen }),
  setShopNotificationVisible: (visible: boolean) =>
    set({ shopNotificationVisible: visible }),
  setAuthNotificationSeen: (seen: boolean) =>
    set({ authNotificationSeen: seen }),
  setAuthNotificationVisible: (visible: boolean) =>
    set({ authNotificationVisible: visible }),
  setSignUpPromptDialogOpen: (isOpen: boolean) =>
    set({ signUpPromptDialogOpen: isOpen }),
  setSignUpPromptEligibleForGold: (eligible: boolean) =>
    set({ signUpPromptEligibleForGold: eligible }),
  setLastSignUpPromptPlayTime: (playTime: number) =>
    set({ lastSignUpPromptPlayTime: playTime }),
  setMysteriousNoteShopNotificationSeen: (seen: boolean) =>
    set({ mysteriousNoteShopNotificationSeen: seen }),
  setMysteriousNoteDonateNotificationSeen: (seen: boolean) =>
    set({ mysteriousNoteDonateNotificationSeen: seen }),
  setHighlightedResources: (resources: string[]) => {
    // Updated type
    set({ highlightedResources: resources });
  },
  setIsUserSignedIn: (signedIn: boolean) => set({ isUserSignedIn: signedIn }),
  setDetectedCurrency: (currency: "EUR" | "USD") =>
    set({ detectedCurrency: currency }),

  updateResource: (resource: keyof GameState["resources"], amount: number) => {
    // updateResource in stateHelpers automatically applies capResourceToLimit
    set((state) => updateResource(state, resource, amount));

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

  initialize: (initialState?: Partial<GameState>) => {
    const stateToSet = initialState
      ? { ...defaultGameState, ...initialState }
      : defaultGameState;

    set(stateToSet);
    StateManager.scheduleEffectsUpdate(get);
  },

  executeAction: (actionId: string) => {
    const state = get();
    const action = gameActions[actionId];

    // If action has execution time and we're not completing one, start execution
    const executionTime = getExecutionTime(actionId, state);
    if (executionTime > 0 && (state as any)._completingExecution !== actionId) {
      if (!state.executionStartTimes?.[actionId]) {
        // Guard: don't deduct costs for an action that is no longer visible.
        // This prevents the Prior (or any caller) from draining resources for
        // an action whose show_when conditions are no longer satisfied.
        if (!shouldShowAction(actionId, state as any)) return;
        get().startActionExecution(actionId);
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
      if (upgradeResult.levelUpMessage) {
        const levelUpLog: LogEntry = {
          id: `levelup_${upgradeKey}_${Date.now()}`,
          message: upgradeResult.levelUpMessage,
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
      console.log(
        "[COMPASS GLOW] Compass bonus triggered for action:",
        actionId,
      );
      get().setCompassGlow(actionId);
      setTimeout(() => {
        console.log("[COMPASS GLOW] Clearing compass glow");
        get().setCompassGlow(null);
      }, 1500);
    }

    // Handle RewardDialog for whitelisted actions BEFORE applying state updates
    // This allows us to extract and remove success log entries before they're added to the event log
    if (rewardDialogActions.has(actionId)) {
      const rewards = detectRewards(result.stateUpdates, state, actionId);
      if (rewards && Object.keys(rewards).length > 0) {
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

            // Remove this log entry so it doesn't appear in the event log
            result.logEntries = result.logEntries.filter(entry => entry.id !== lastLogEntry.id);
          }
        }

        // Remove _logMessage from stateUpdates so it doesn't get merged into state
        if ((result.stateUpdates as any)._logMessage) {
          delete (result.stateUpdates as any)._logMessage;
        }

        setTimeout(() => {
          get().setRewardDialog(true, { rewards, successLog });
        }, 500); // Small delay to let the log message appear first
      }
    }

    // Apply state updates
    set((prevState) => {
      const mergedUpdates = mergeStateUpdates(prevState, result.stateUpdates);
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
        ? result.logEntries.filter(entry => !entry.skipEventLog)
        : [];

      return {
        ...newStateAfterUpdates,
        ...milestoneUpdates,
        log: logEntriesToAdd.length > 0
          ? [...baseLog, ...logEntriesToAdd].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES)
          : baseLog,
      };
    });

    // Play building completion sound for successful build actions
    if (actionId.startsWith("build") && result.stateUpdates.buildings) {
      // Import audioManager here to avoid circular dependency
      import("@/lib/audio").then(({ audioManager }) => {
        audioManager.playSound("buildingComplete", SOUND_VOLUME.buildingComplete);
      });
    }

    // Play craft sound for successful crafting actions
    if (actionId.startsWith("craft")) {
      import("@/lib/audio").then(({ audioManager }) => {
        audioManager.playSound("craft", SOUND_VOLUME.craft);
      });
    }

    // Play mining sound for successful mine actions
    if (actionId.startsWith("mine")) {
      import("@/lib/audio").then(({ audioManager }) => {
        audioManager.playSound("mining", SOUND_VOLUME.mining);
      });
    }

    // Play chop wood sound for Chop Wood button (Forest panel), not for Gather Wood (Cave panel)
    if (actionId === "chopWood" && get().flags?.forestUnlocked) {
      import("@/lib/audio").then(({ audioManager }) => {
        audioManager.playSound("chopWood", SOUND_VOLUME.chopWood);
      });
    }

    // Play hunt sound for hunt action
    if (actionId === "hunt") {
      import("@/lib/audio").then(({ audioManager }) => {
        audioManager.playSound("hunt", SOUND_VOLUME.hunt);
      });
    }

    // Schedule updates
    if (
      result.stateUpdates.tools ||
      result.stateUpdates.weapons ||
      result.stateUpdates.clothing ||
      result.stateUpdates.relics ||
      result.stateUpdates.books
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

      // Update population when housing buildings change
      if (
        buildingChanges.woodenHut !== undefined ||
        buildingChanges.stoneHut !== undefined ||
        buildingChanges.longhouse !== undefined
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
      result.logEntries.forEach((entry) => {
        if (entry.choices && entry.choices.length > 0) {
          setTimeout(() => get().setEventDialog(true, entry), 100);
        }
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
      if (assigned.length >= maxActions) return {};
      return { priorAssignedActions: [...assigned, actionId] };
    });
    const fresh = get();
    if (
      (fresh.cooldowns[actionId] ?? 0) === 0 &&
      fresh.priorAssignedActions?.includes(actionId)
    ) {
      get().executeAction(actionId);
    }
  },


  startActionExecution: (actionId: string) => {
    const state = get();
    const action = gameActions[actionId];
    const duration = getExecutionTime(actionId, state);
    if (duration <= 0) return;
    const now = Date.now();

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

    set({
      ...costUpdates,
      villagers: baseVillagers,
      expeditionVillagers: baseExpeditionVillagers,
      executionStartTimes: { ...state.executionStartTimes, [actionId]: now },
      executionDurations: { ...state.executionDurations, [actionId]: duration },
    });
  },

  completeActionExecution: (actionId: string) => {
    const state = get();
    const { executionStartTimes, executionDurations } = state;
    if (!executionStartTimes[actionId] || !executionDurations[actionId]) return;

    const newStartTimes = { ...executionStartTimes };
    const newDurations = { ...executionDurations };
    delete newStartTimes[actionId];
    delete newDurations[actionId];
    const releasedVillagers = state.expeditionVillagers?.[actionId] ?? 0;
    const updatedExpeditionVillagers = { ...state.expeditionVillagers };
    if (releasedVillagers > 0) {
      delete updatedExpeditionVillagers[actionId];
    }

    set({
      executionStartTimes: newStartTimes,
      executionDurations: newDurations,
      villagers: {
        ...state.villagers,
        free: (state.villagers.free || 0) + releasedVillagers,
      },
      expeditionVillagers: updatedExpeditionVillagers,
      _completingExecution: actionId,
    });

    // Execute the actual action (bypasses execution-time check via _completingExecution)
    get().executeAction(actionId);
    set({ _completingExecution: undefined });
  },

  tickCooldowns: () => {
    set((state) => {
      const newCooldowns = { ...state.cooldowns };
      const newInitialCooldowns = { ...state.initialCooldowns };
      let changed = false;

      for (const key in newCooldowns) {
        if (newCooldowns[key] > 0) {
          const newValue = newCooldowns[key] - 0.25;
          // Treat values below 0.001 as zero to avoid floating-point precision issues
          newCooldowns[key] = newValue < 0.001 ? 0 : newValue;

          if (newCooldowns[key] === 0) {
            delete newInitialCooldowns[key];
          }
          changed = true;
        }
      }

      let newState = changed ? {
        ...state,
        cooldowns: newCooldowns,
        initialCooldowns: newInitialCooldowns,
      } : state;

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

      return {
        ...state,
        cooldowns: newCooldowns,
        initialCooldowns: newInitialCooldowns,
        heartfireState: newHeartfireState
      };
    });
  },

  restartGame: async () => {
    const state = get();

    // Check if cruel mode is activated (support both old and new purchase ID formats)
    const isCruelModeActive =
      Object.keys(state.activatedPurchases || {}).some(
        (key) => key === "cruel_mode" || key.startsWith("purchase-cruel_mode-"),
      ) &&
      Object.entries(state.activatedPurchases || {}).some(
        ([key, value]) =>
          (key === "cruel_mode" || key.startsWith("purchase-cruel_mode-")) &&
          value === true,
      );

    // Find the cruel mode purchase key to preserve
    const cruelModePurchaseKey = Object.keys(
      state.activatedPurchases || {},
    ).find(
      (key) => key === "cruel_mode" || key.startsWith("purchase-cruel_mode-"),
    );

    // Preserve these across game restarts
    const preserved = {
      // Purchases and boosts that persist
      boostMode: state.boostMode,
      // Only preserve cruel_mode activation, reset everything else
      activatedPurchases: cruelModePurchaseKey
        ? {
          [cruelModePurchaseKey]:
            state.activatedPurchases?.[cruelModePurchaseKey] || false,
        }
        : {},
      // Feast activations are reset (cleared) on new game
      feastActivations: {},

      // Referral system (persists forever)
      referrals: state.referrals || [],
      referralCount: state.referralCount || 0,
      referredUsers: state.referredUsers || [],

      // Social media rewards (persist forever)
      social_media_rewards: state.social_media_rewards || {},

      // Cruel mode status
      cruelMode: isCruelModeActive,

      // Preserve hasWonAnyGame across restarts
      hasWonAnyGame: state.hasWonAnyGame || false,

      // Preserve detected currency across restarts (persists forever)
      detectedCurrency: state.detectedCurrency || null,

      // Preserve Google Ads source across restarts (persists forever)
      googleAdsSource: state.googleAdsSource || null,
    };

    // Reset everything else to default
    const resetState = {
      ...defaultGameState,
      ...preserved,
      gameId: `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Generate new gameId on restart

      // UI state
      activeTab: "cave",
      devMode: import.meta.env.DEV,
      idleModeDialog: { isOpen: false }, // Explicitly ensure idle mode dialog is closed
      timedEventTab: {
        isActive: false,
        event: null,
        expiryTime: 0,
      },
      gamblerDiceDialogOpen: false,
      investDialogOpen: false,

      // Recalculate derived state
      effects: calculateTotalEffects({ ...defaultGameState, ...preserved }),
      bastion_stats: calculateBastionStats(defaultGameState),

      // Reset population counters explicitly
      current_population: 0,
      total_population: 0,

      // Mark as new game and allow overwriting cloud playTime once
      isNewGame: true,
      startTime: Date.now(),
      playTime: 0,
      allowPlaytimeOverwrite: true,
    };

    set(resetState);
    StateManager.scheduleEffectsUpdate(get);

    const initialLogEntry: LogEntry = {
      id: "initial-narrative",
      message: preserved.cruelMode
        ? "A very dark cave. The air is freezing and damp. You barely see anything around you."
        : "A dark cave. The air is cold and damp. You barely see the shapes around you.",
      timestamp: Date.now(),
      type: "system",
    };
    get().addLogEntry(initialLogEntry);

    // Reset analytics trackers
    set({
      clickAnalytics: {},
      lastResourceSnapshotTime: 0, // Reset snapshot time to start fresh
    });

    // Immediately save the new game state to cloud to prevent OCC issues
    const { saveGame } = await import("@/game/save");
    try {
      await saveGame(get(), false);
      logger.log(
        "[RESTART] ✅ New game state saved to cloud with analytics cleared",
      );
      // Clear the new game flag after successful save
      set({ isNewGame: false });
    } catch (error) {
      logger.error(
        "[RESTART] ❌ Failed to save new game state to cloud:",
        error,
      );
    }
  },

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

  loadGame: async () => {
    const { loadGame: loadFromIDB } = await import("@/game/save");
    const savedState = await loadFromIDB();

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

    // Get current boost mode before loading
    const currentBoostMode = get().boostMode;

    if (savedState) {
      const saved = savedState as typeof savedState & {
        musicMuted?: boolean;
        sfxMuted?: boolean;
      };
      // CRITICAL: Extract playTime FIRST before any processing
      const loadedPlayTime =
        savedState.playTime !== undefined ? savedState.playTime : 0;

      // Generate gameId if it doesn't exist in savedState or is undefined
      const gameId =
        savedState.gameId ??
        `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const timedEventTab =
        (savedState as { timedEventTab?: GameStore["timedEventTab"] })
          .timedEventTab ?? {
          isActive: false,
          event: null,
          expiryTime: 0,
        };
      const gamblerGameForResume =
        savedState.gamblerGame !== undefined
          ? savedState.gamblerGame
          : defaultGameState.gamblerGame;
      const { activeTab, gamblerDiceDialogOpen } = gamblerDiceResumeOnLoad({
        timedEventTab,
        gamblerGame: gamblerGameForResume,
      });

      const loadedState = {
        ...savedState,
        activeTab,
        gamblerDiceDialogOpen,
        timedEventTab,
        cooldowns: savedState.cooldowns || {},
        executionStartTimes: {},
        executionDurations: {},
        expeditionVillagers: {},
        attackWaveTimers: savedState.attackWaveTimers || {},
        log: savedState.log || [],
        events: savedState.events || defaultGameState.events,
        devMode: import.meta.env.DEV,
        boostMode: savedState.boostMode,
        effects: calculateTotalEffects(savedState),
        bastion_stats: calculateBastionStats(savedState),
        cruelMode:
          savedState.cruelMode !== undefined
            ? savedState.cruelMode
            : Boolean((savedState as { CM?: number }).CM),
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
        shopNotificationSeen:
          savedState.shopNotificationSeen !== undefined
            ? savedState.shopNotificationSeen
            : false,
        shopNotificationVisible:
          savedState.shopNotificationVisible !== undefined
            ? savedState.shopNotificationVisible
            : false,
        authNotificationSeen:
          savedState.authNotificationSeen !== undefined
            ? savedState.authNotificationSeen
            : false,
        authNotificationVisible:
          savedState.authNotificationVisible !== undefined
            ? savedState.authNotificationVisible
            : false,
        lastSignUpPromptPlayTime:
          savedState.lastSignUpPromptPlayTime !== undefined
            ? savedState.lastSignUpPromptPlayTime
            : 0,
        mysteriousNoteShopNotificationSeen:
          savedState.mysteriousNoteShopNotificationSeen !== undefined
            ? savedState.mysteriousNoteShopNotificationSeen
            : false,
        mystNoteDonateNotificationSeen:
          savedState.mystNoteDonateNotificationSeen !== undefined
            ? savedState.mystNoteDonateNotificationSeen
            : false,
        playTime: loadedPlayTime, // CRITICAL: Use the extracted playTime value
        isNewGame: false, // Clear the new game flag when loading
        startTime:
          savedState.startTime !== undefined ? savedState.startTime : 0, // Ensure startTime is loaded
        idleModeState: savedState.idleModeState || {
          isActive: false,
          startTime: 0,
          needsDisplay: false,
        }, // Load idle mode state
        referrals: savedState.referrals || [], // Load referrals list
        social_media_rewards:
          savedState.social_media_rewards ||
          defaultGameState.social_media_rewards, // Load social_media_rewards
        lastResourceSnapshotTime:
          savedState.lastResourceSnapshotTime !== undefined
            ? savedState.lastResourceSnapshotTime
            : 0, // Load lastResourceSnapshotTime
        highlightedResources: savedState.highlightedResources || [], // Load highlightedResources
        curseState: savedState.curseState || defaultGameState.curseState, // Load curseState
        frostfallState:
          savedState.frostfallState || defaultGameState.frostfallState, // Load frostfallState
        fogState: savedState.fogState || defaultGameState.fogState, // Load fogState
        disgustState: savedState.disgustState || defaultGameState.disgustState, // Load disgustState
        solsticeState: savedState.solsticeState || defaultGameState.solsticeState, // Load solsticeState
        lastFreeGoldClaim: savedState.lastFreeGoldClaim || 0, // Load lastFreeGoldClaim
        unlockedAchievements: savedState.unlockedAchievements || [], // Load unlocked achievements
        claimedAchievements: savedState.claimedAchievements || [], // Load claimed achievements
        gameId: gameId, // Load or generate gameId
        game_stats: savedState.game_stats || [], // Load game_stats
        hasWonAnyGame:
          savedState.hasWonAnyGame !== undefined
            ? savedState.hasWonAnyGame
            : false, // Load hasWonAnyGame
        merchantTrades: savedState.merchantTrades || {
          choices: [],
          purchasedIds: [],
        }, // Load merchant trades
        gamblerGame: gamblerGameForResume,
        investmentHallState: normalizeInvestmentHallState(
          savedState.investmentHallState ?? defaultGameState.investmentHallState,
        ),
      };

      const savedExpeditionVillagers = savedState.expeditionVillagers || {};
      const strandedExpeditionVillagers = Object.values(
        savedExpeditionVillagers,
      ).reduce((sum, count) => sum + (count || 0), 0);
      if (strandedExpeditionVillagers > 0) {
        loadedState.villagers = {
          ...loadedState.villagers,
          free:
            (loadedState.villagers?.free || 0) + strandedExpeditionVillagers,
        };
      }

      logger.log('[MERCHANT TRADES] Loaded merchant trades from state:', {
        hasChoices: !!savedState.merchantTrades?.choices?.length,
        choicesCount: savedState.merchantTrades?.choices?.length || 0,
        purchasedCount: savedState.merchantTrades?.purchasedIds?.length || 0,
        purchasedIds: savedState.merchantTrades?.purchasedIds || [],
      });

      set(loadedState);
      StateManager.scheduleEffectsUpdate(get);
    } else {
      const newGameState = {
        ...defaultGameState,
        activeTab: "cave",
        cooldowns: {},
        executionStartTimes: {},
        executionDurations: {},
        expeditionVillagers: {},
        log: [],
        devMode: import.meta.env.DEV,
        boostMode: currentBoostMode, // Preserve boost mode flag
        effects: calculateTotalEffects(defaultGameState),
        bastion_stats: calculateBastionStats(defaultGameState),
        startTime: Date.now(), // Set start time for new game
        isNewGame: true, // Mark as new game to start tracking
        gameId: `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Generate gameId for new game
      };

      set(newGameState);

      const initialLogEntry: LogEntry = {
        id: "initial-narrative",
        message: get().cruelMode
          ? "A very dark cave. The air is freezing and damp. You barely see anything around you."
          : "A dark cave. The air is cold and damp. You barely see the shapes around you.",
        timestamp: Date.now(),
        type: "system",
      };
      get().addLogEntry(initialLogEntry);
    }

    StateManager.scheduleEffectsUpdate(get);
  },

  addLogEntry: (entry: LogEntry) => {
    if (entry.type === "event") {
      audioManager.playSound("event", SOUND_VOLUME.eventUi);
    }

    set((state) => ({
      log: [...state.log, entry].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES),
    }));
  },

  checkEvents: () => {
    const state = get();
    // If the game is paused, do not process events
    if (state.isPaused) return;

    if (isModalDialogOpen(state)) return;

    // Don't check for new timed tab events if one is already active
    const timedTabActive = get().timedEventTab.isActive;

    const { newLogEntries, stateChanges } =
      EventManager.checkEvents({ ...state, timedEventTab: { isActive: timedTabActive } } as any);

    // Handle timed tab event if present
    if (stateChanges._timedTabEvent) {
      const timedTabEntry = stateChanges._timedTabEvent;
      delete stateChanges._timedTabEvent;

      // Play event sound for timed tab events
      if (timedTabEntry._playSound) {
        // Use merchant sound for merchant events, otherwise use generic event sound
        const isMerchantEvent = timedTabEntry.id?.startsWith("merchant");
        const soundName = isMerchantEvent ? "merchant" : "event";
        const soundVolume = isMerchantEvent
          ? SOUND_VOLUME.merchant
          : SOUND_VOLUME.eventUi;
        audioManager.playSound(soundName, soundVolume);
      }

      get().setTimedEventTab(true, timedTabEntry, timedTabEntry.timedTabDuration);
    }

    if (newLogEntries.length > 0) {
      let combatData = null;
      const updatedChanges = { ...stateChanges };

      if (updatedChanges._combatData) {
        combatData = updatedChanges._combatData;
        delete updatedChanges._combatData;
      }

      set((prevState) => ({
        ...prevState,
        ...updatedChanges,
      }));

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
            return _combatSummary || {};
          },
          onDefeat: () => {
            const defeatResult = combatData.onDefeat();
            const { _logMessage, _combatSummary, ...stateUpdates } =
              defeatResult as Record<string, unknown> & {
                _logMessage?: string;
                _combatSummary?: Record<string, unknown>;
              };
            set((prevState) => ({
              ...prevState,
              ...(stateUpdates as object),
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
            return _combatSummary || {};
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
          } else {
            // Only add to log if it's not a choice event
            set((prevState) => ({
              log: [...prevState.log, entry].slice(-10),
            }));
          }
        });
      }

      StateManager.schedulePopulationUpdate(get);

      // Play sound if new events were triggered
      if (newLogEntries && newLogEntries.length > 0) {
        const madnessEventIds = Object.keys(madnessEvents);

        const hasMadnessEvent = newLogEntries.some((entry) =>
          madnessEventIds.includes(entry.id.split("-")[0]),
        );

        audioManager.playSound(
          hasMadnessEvent ? "eventMadness" : "event",
          SOUND_VOLUME.eventCheckEvents,
        );
      }
    }
  },

  applyEventChoice: (choiceId: string, eventId: string, currentLogEntry?: LogEntry) => {
    const state = get();
    // If the game is paused, do not apply event choices
    if (state.isPaused) return;

    // Use passed currentLogEntry or fall back to eventDialog.currentEvent
    const logEntry = currentLogEntry || get().eventDialog.currentEvent;

    const logChoices = typeof logEntry?.choices === 'function'
      ? logEntry.choices(state)
      : logEntry?.choices || [];

    console.log('[STATE] applyEventChoice called:', {
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

    let combatData = null;
    let logMessage = null;
    const updatedChanges = { ...changes };

    // Extract combat data if present
    if (updatedChanges._combatData) {
      combatData = updatedChanges._combatData;
      delete updatedChanges._combatData;
    }

    // Extract _logMessage if present
    if (updatedChanges._logMessage) {
      logMessage = updatedChanges._logMessage;
      delete updatedChanges._logMessage;
    }

    // Prepare outcome dialogs BEFORE applying state updates, so success logs can be
    // displayed in dialogs without duplicating them in the event log.
    const madnessChange = detectMadnessChange(updatedChanges, state);
    let shouldShowRewardDialog = false;
    let rewardDialogData: {
      rewards: any;
      successLog?: string;
      variant: "success" | "loss";
    } | null = null;
    let shouldShowMadnessDialog = false;
    let madnessDialogData: {
      rewards?: any;
      successLog?: string;
      madnessChange: number;
    } | null = null;

    if (!combatData) {
      const rewards = detectRewards(updatedChanges, state, eventId, { trackLosses: true });
      const hasResourceLosses =
        !!rewards.resourceLosses &&
        Object.keys(rewards.resourceLosses).length > 0;
      const hasVillagersLost =
        typeof rewards.villagersLost === "number" && rewards.villagersLost > 0;
      const hasRelicsLost = (rewards.relicsLost?.length ?? 0) > 0;
      const hasClothingLost = (rewards.clothingLost?.length ?? 0) > 0;
      const hasLosses =
        hasResourceLosses ||
        hasVillagersLost ||
        hasRelicsLost ||
        hasClothingLost;
      const hasRewards = Object.entries(rewards).some(([key, value]) => {
        if (
          key === "resourceLosses" ||
          key === "villagersLost" ||
          key === "relicsLost" ||
          key === "clothingLost" ||
          !value
        ) {
          return false;
        }
        if (typeof value === "number" && value > 0) {
          return true;
        }
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return typeof value === "object" && Object.keys(value).length > 0;
      });
      const successLog = logMessage || undefined;
      const hasAnyOutcome = hasRewards || hasLosses;
      const isMerchantEvent = eventId === "merchant" || eventId?.startsWith?.("merchant-");
      const isCubeDiscoveryEvent = eventId === "cubeDiscovery";

      if (hasAnyOutcome && !isMerchantEvent && !isCubeDiscoveryEvent) {
        rewardDialogData = {
          rewards,
          successLog,
          variant: hasRewards ? "success" : "loss",
        };
        shouldShowRewardDialog = true;
      }

      if (madnessChange !== 0) {
        madnessDialogData = {
          rewards: hasRewards ? rewards : undefined,
          successLog,
          madnessChange,
        };
        shouldShowMadnessDialog = true;
      }

      // Only clear logMessage when it will be shown in reward or madness dialog.
      // For events that suppress the reward dialog (cubeDiscovery, merchant)
      // but have hasAnyOutcome, we must keep logMessage so the narrative dialog can show it.
      if (shouldShowRewardDialog || shouldShowMadnessDialog) {
        logMessage = null;
      }
    }

    // Apply state changes FIRST - this includes relics, resources, schematics, etc.
    if (Object.keys(updatedChanges).length > 0) {
      set((prevState) => {
        // Use the same mergeStateUpdates function that other actions use
        const mergedUpdates = mergeStateUpdates(prevState, updatedChanges);

        const newState = {
          ...prevState,
          ...mergedUpdates,
        };

        return newState;
      });

      StateManager.schedulePopulationUpdate(get);
    }

    // Show madness dialog first when madness changed in this outcome.
    if (shouldShowMadnessDialog && madnessDialogData) {
      get().setEventDialog(false);
      setTimeout(() => {
        get().setMadnessDialog(true, madnessDialogData);
      }, 200);
      return;
    }

    // Show reward dialog for village attack events if rewards were detected
    if (shouldShowRewardDialog && rewardDialogData) {
      get().setEventDialog(false);
      setTimeout(() => {
        get().setRewardDialog(true, rewardDialogData);
      }, 200);
      return;
    }

    // For merchant events, don't show any dialog - just apply the changes
    const isMerchantEvent = eventId === 'merchant';

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
      get().setEventDialog(false);
      setTimeout(() => {
        const messageEntry: LogEntry = {
          id: `log-message-${Date.now()}`,
          message: logMessage,
          timestamp: Date.now(),
          type: "event",
          title: logEntry?.title, // Use the merged logEntry's title
          choices: [
            {
              id: "acknowledge",
              label: "Continue",
              effect: () => ({}),
            },
          ],
          skipSound: true, // Don't play sound for log messages
        };

        get().setEventDialog(true, messageEntry);
      }, 200);
      return; // Don't proceed to combat dialog
    }

    // Handle combat dialog
    if (combatData) {
      get().setEventDialog(false);
      get().setCombatDialog(true, {
        enemy: combatData.enemy,
        eventTitle: combatData.eventTitle,
        eventMessage: logEntry?.message || "",
        onVictory: () => {
          const victoryResult = combatData.onVictory();
          set((prevState) => ({
            ...mergeCombatVictoryState(prevState, victoryResult),
            log: prevState.log,
          }));
          get().setCombatDialog(false);
        },
        onDefeat: () => {
          const defeatResult = combatData.onDefeat();
          set((prevState) => ({
            ...prevState,
            ...defeatResult,
            log: defeatResult._logMessage
              ? [
                ...prevState.log,
                {
                  id: `combat-defeat-${Date.now()}`,
                  message: defeatResult._logMessage,
                  timestamp: Date.now(),
                  type: "system",
                },
              ].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES)
              : prevState.log,
          }));
          get().setCombatDialog(false);
        },
      });
      return;
    }

    // Dialog closing is now handled in EventDialog component
  },

  toggleDevMode: () => {
    // Dev mode is controlled by NODE_ENV - no-op in production
  },

  assignVillager: (job: keyof GameState["villagers"]) => {
    set((state) => {
      const updates = assignVillagerToJob(state, job);
      if (Object.keys(updates).length > 0) {
        StateManager.schedulePopulationUpdate(get);
      }
      return updates;
    });
  },

  unassignVillager: (job: keyof GameState["villagers"]) => {
    set((state) => {
      const updates = unassignVillagerFromJob(state, job);
      if (Object.keys(updates).length > 0) {
        StateManager.schedulePopulationUpdate(get);
      }
      return updates;
    });
  },

  getMaxPopulation: () => {
    const state = get();
    return getMaxPopulation(state);
  },

  updatePopulation: () => {
    set((state) => {
      const updates = updatePopulationCounts(state);

      return {
        ...state,
        ...updates,
      };
    });
  },

  // Computed getter for current population
  get current_population() {
    return getCurrentPopulation(get());
  },

  setEventDialog: (isOpen: boolean, currentEvent?: LogEntry) => {
    set((state) => ({
      ...state,
      eventDialog: {
        isOpen,
        currentEvent: currentEvent || null,
      },
    }));

    if (isOpen && currentEvent && !currentEvent.skipSound) {
      const eventId = currentEvent.id.split("-")[0];
      const madnessEventIds = Object.keys(madnessEvents);
      const isMadnessEvent = madnessEventIds.includes(eventId);
      audioManager.playSound(
        isMadnessEvent ? "eventMadness" : "event",
        SOUND_VOLUME.eventUi,
      );
    }
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

  setTimedEventTab: async (isActive: boolean, event?: LogEntry | null, duration?: number) => {
    // Play sound if activating
    if (isActive && event) {
      const eventId = event.id.split("-")[0];
      const madnessEventIds = Object.keys(madnessEvents);
      const isMadnessEvent = madnessEventIds.includes(eventId);
      audioManager.playSound(
        isMadnessEvent ? "eventMadness" : "event",
        SOUND_VOLUME.eventUi,
      );
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

      set({
        timedEventTab: {
          isActive,
          event: event || null, // Don't store choices in event
          expiryTime: duration ? Date.now() + duration : 0,
          startTime: Date.now(),
        },
        merchantTrades: {
          choices, // SSOT: Use the choices that were already generated
          purchasedIds: [],
        },
      });
    } else if (!isActive) {
      // If deactivating, clear merchant trades and record when merchant ended (for Call Merchant button)
      logger.log('[MERCHANT TRADES] Clearing merchant trades (deactivating timed tab)');

      set((state) => {
        const currentEvent = state.timedEventTab?.event;
        const wasMerchant = currentEvent?.id?.includes?.("merchant");
        return {
          ...state,
          timedEventTab: {
            isActive: false,
            event: null,
            expiryTime: 0,
            startTime: undefined,
          },
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
        return {
          timedEventTab: {
            isActive,
            event: event || null,
            expiryTime: isActive && duration ? Date.now() + duration : 0,
            startTime: isActive ? Date.now() : undefined,
            ...(gamblerRoundsRemaining != null && { gamblerRoundsRemaining }),
          },
        };
      });
    }
  },

  callMerchant: () => {
    const state = get();
    if ((state.buildings?.tradePost ?? 0) < 1) return;

    const usageCount =
      (state.story?.seen?.callMerchantUsageCount as number) || 0;
    const price = Math.min(50 + 50 * usageCount, 250);

    if ((state.resources?.gold ?? 0) < price) return;
    if (state.timedEventTab?.isActive && state.timedEventTab?.event?.id?.includes?.("merchant")) return;

    const choices = generateMerchantChoices(state);
    const merchantEvent = merchantEvents.merchant;
    const eventData: LogEntry = {
      id: "merchant",
      message:
        typeof merchantEvent.message === "string"
          ? merchantEvent.message
          : merchantEvent.message[0] ?? "",
      timestamp: Date.now(),
      type: "event",
      title: typeof merchantEvent.title === "string" ? merchantEvent.title : merchantEvent.title?.(state) ?? "Traveling Merchant",
      choices,
    };

    set((s) => ({
      ...s,
      resources: {
        ...s.resources,
        gold: (s.resources?.gold ?? 0) - price,
      },
      story: {
        ...s.story,
        seen: {
          ...s.story.seen,
          callMerchantUsageCount: usageCount + 1,
        },
      },
    }));

    audioManager.playSound("merchant", SOUND_VOLUME.merchant);
    get().setTimedEventTab(true, eventData, 4 * 60 * 1000);
  },

  tickInvestmentHall: () => {
    let logMessage: string | null = null;
    set((state) => {
      if (!state.buildings.coinhouse) return {};
      const ih = state.investmentHallState;
      const active = ih.active;
      if (active && state.playTime >= active.endPlayTime) {
        const payout = active.payoutGold;
        logMessage = formatInvestmentCompletionLog(active);
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
      return {};
    });
    if (logMessage) {
      get().addLogEntry({
        id: `investment-${Date.now()}`,
        message: logMessage,
        timestamp: Date.now(),
        type: "system",
      });
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
    }));
    return { ok: true };
  },

  setAuthDialogOpen: (isOpen: boolean) => {
    set({ authDialogOpen: isOpen });
  },

  setShopDialogOpen: (isOpen: boolean) => {
    set({ shopDialogOpen: isOpen });
  },

  setGamblerDiceDialogOpen: (isOpen: boolean) => {
    set({ gamblerDiceDialogOpen: isOpen });
  },

  setInvestDialogOpen: (isOpen: boolean) => {
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

  setFullGamePurchaseDialogOpen: (isOpen: boolean) => {
    set({ fullGamePurchaseDialogOpen: isOpen });
  },

  setIdleModeDialog: (isOpen: boolean) => {
    set((state) => ({
      idleModeDialog: {
        isOpen,
      },
    }));
  },

  setRestartGameDialogOpen: (isOpen: boolean) => {
    set({ restartGameDialogOpen: isOpen });
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
        };
      }
      // If paused or was previously paused, return state without updating playTime
      return {};
    });
  },

  // Added action to set the version check dialog state
  setVersionCheckDialog: (isOpen: boolean) => {
    set({ versionCheckDialogOpen: isOpen });
  },

  updateFocusState: (focusState) => {
    set({ focusState });
  },

  updateResources: (updates) => {
    set((state) => {
      const cappedUpdates: Partial<GameState["resources"]> = {};

      // Apply resource limits to each updated resource
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === "number") {
          // Cap the absolute value, not the delta
          cappedUpdates[key as keyof typeof cappedUpdates] = capResourceToLimit(
            key,
            value,
            state,
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

  setRewardDialog: (isOpen, data) => {
    set((state) => ({
      rewardDialog: {
        isOpen,
        data: data || null,
      },
    }));
  },
  setMadnessDialog: (isOpen, data) => {
    set(() => ({
      madnessDialog: {
        isOpen,
        data: data || null,
      },
    }));
  },
}));
