// Removed duplicate keys and ensured gameId is correctly handled.
import { create } from "zustand";
import { GameState, gameStateSchema, Referral } from "@shared/schema";
import { gameActions, shouldShowAction, canExecuteAction } from "@/game/rules";
import { EventManager, LogEntry } from "@/game/rules/events";
import { checkMilestoneLogEntries } from "@/game/rules/eventLogEntries";
import { executeGameAction } from "@/game/actions";
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
} from "@/game/types";
import {
  updateResource,
  updateFlag,
  updatePopulationCounts,
  assignVillagerToJob,
  unassignVillagerFromJob,
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
import { getMaxPopulation } from "@/game/population";
import { audioManager } from "@/lib/audio";
import { GAME_CONSTANTS } from "@/game/constants";
import {
  ACTION_TO_UPGRADE_KEY,
  incrementButtonUsage,
} from "@/game/buttonUpgrades";
import { logger } from "@/lib/logger";
import { madnessEvents } from "@/game/rules/eventsMadness";

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

  // Notification state for shop
  shopNotificationSeen: boolean;
  shopNotificationVisible: boolean;

  // Notification state for auth
  authNotificationSeen: boolean;
  authNotificationVisible: boolean;

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

  // Compass glow effect
  compassGlowButton: string | null; // Action ID of button to glow

  // Timed event tab (not part of GameState, only UI state)
  timedEventTab: {
    isActive: boolean;
    event: LogEntry | null;
    expiryTime: number;
    startTime?: number;
  };

  // Merchant trades state
  merchantTrades: {
    choices: Array<any>; // Will be MerchantTradeData from eventsMerchant.ts
    purchasedIds: string[];
  };

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
  initialize: (state: GameState) => void;
  restartGame: () => void;
  loadGame: () => Promise<void>;
  toggleDevMode: () => void;
  getMaxPopulation: () => number;
  updatePopulation: () => void;
  setCooldown: (action: string, duration: number) => void;
  tickCooldowns: () => void;
  setCompassGlow: (actionId: string | null) => void;
  addLogEntry: (entry: LogEntry) => void;
  checkEvents: () => void;
  applyEventChoice: (choiceId: string, eventId: string) => void;
  assignVillager: (job: keyof GameState["villagers"]) => void;
  unassignVillager: (job: keyof GameState["villagers"]) => void;
  setEventDialog: (isOpen: boolean, event?: LogEntry | null) => void;
  setCombatDialog: (isOpen: boolean, data?: any) => void;
  setTimedEventTab: (isActive: boolean, event?: LogEntry | null, duration?: number) => Promise<void>;
  setAuthDialogOpen: (isOpen: boolean) => void;
  setShopDialogOpen: (isOpen: boolean) => void;
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
}

// Helper function to detect rewards from state updates
export const detectRewards = (stateUpdates: Partial<GameState>, currentState: GameState, actionId: string) => {
  const rewards: {
    resources?: Partial<Record<keyof GameState["resources"], number>>;
    tools?: (keyof GameState["tools"])[];
    weapons?: (keyof GameState["weapons"])[];
    clothing?: (keyof GameState["clothing"])[];
    relics?: (keyof GameState["relics"])[];
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
    Object.entries(stateUpdates.resources).forEach(([resource, finalAmount]) => {
      if (typeof finalAmount === 'number') {
        const originalAmount = currentState.resources[resource as keyof typeof currentState.resources] || 0;
        const gained = finalAmount - originalAmount;
        if (gained > 0) {
          rewardResources[resource] = gained;
        }
      }
    });
    if (Object.keys(rewardResources).length > 0) {
      rewards.resources = rewardResources as Partial<Record<keyof GameState["resources"], number>>;
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
  CM: 0,
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

  story: {
    seen: {},
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

// Main store
export const useGameStore = create<GameStore>((set, get) => ({
  ...defaultGameState,
  activeTab: "cave",
  devMode: import.meta.env.DEV,
  boostMode: false,
  lastSaved: "Never",
  cooldowns: {},
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
    if (
      !shouldShowAction(actionId, state) ||
      !canExecuteAction(actionId, state)
    )
      return;

    const result = executeGameAction(actionId, state);

    // Track button usage and check for level up (only if book_of_ascension is owned)
    const upgradeKey = ACTION_TO_UPGRADE_KEY[actionId];
    if (upgradeKey && state.books?.book_of_ascension) {
      const upgradeResult = incrementButtonUsage(upgradeKey, state);

      // Add button upgrade state update
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

    // Enforce minimum cooldown of 1 second for all actions (both cooldowns and initialCooldowns)
    if (result.stateUpdates.cooldowns) {
      const updatedCooldowns = { ...result.stateUpdates.cooldowns };
      const initialCooldowns = (result.stateUpdates as any).initialCooldowns || {};
      const updatedInitialCooldowns = { ...initialCooldowns };

      for (const key in updatedCooldowns) {
        updatedCooldowns[key] = Math.max(1, updatedCooldowns[key]);
        if (updatedInitialCooldowns[key] !== undefined) {
          updatedInitialCooldowns[key] = Math.max(1, updatedInitialCooldowns[key]);
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
        audioManager.playSound("buildingComplete");
      });
    }

    // Play craft sound for successful crafting actions
    if (actionId.startsWith("craft")) {
      import("@/lib/audio").then(({ audioManager }) => {
        audioManager.playSound("craft");
      });
    }

    // Play mining sound for successful mine actions
    if (actionId.startsWith("mine")) {
      import("@/lib/audio").then(({ audioManager }) => {
        audioManager.playSound("mining");
      });
    }

    // Play chop wood sound for Chop Wood button (Forest panel), not for Gather Wood (Cave panel)
    if (actionId === "chopWood" && get().flags?.forestUnlocked) {
      import("@/lib/audio").then(({ audioManager }) => {
        audioManager.playSound("chopWood");
      });
    }

    // Play hunt sound for hunt action
    if (actionId === "hunt") {
      import("@/lib/audio").then(({ audioManager }) => {
        audioManager.playSound("hunt");
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
      CM: isCruelModeActive ? 1 : 0,

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

    // Preserve cruel mode status if it exists in savedState
    const cruelMode = savedState?.CM || 0;

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

      const loadedState = {
        ...savedState,
        activeTab: "cave",
        cooldowns: savedState.cooldowns || {},
        attackWaveTimers: savedState.attackWaveTimers || {},
        log: savedState.log || [],
        events: savedState.events || defaultGameState.events,
        devMode: import.meta.env.DEV,
        boostMode: savedState.boostMode,
        effects: calculateTotalEffects(savedState),
        bastion_stats: calculateBastionStats(savedState),
        cruelMode:
          savedState.cruelMode !== undefined ? savedState.cruelMode : false,
        CM: savedState.CM !== undefined ? savedState.CM : 0,
        activatedPurchases: savedState.activatedPurchases || {},
        feastPurchases: savedState.feastPurchases || {},
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
      };

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
        message: cruelMode
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
      audioManager.playSound("event", 0.1);
    }

    set((state) => ({
      log: [...state.log, entry].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES),
    }));
  },

  checkEvents: () => {
    const state = get();
    // If the game is paused, do not process events
    if (state.isPaused) return;

    // Don't check for new events if any dialog is already open
    const isAnyDialogOpen =
      state.eventDialog.isOpen || state.combatDialog.isOpen;
    if (isAnyDialogOpen) return;

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
        const soundVolume = isMerchantEvent ? 0.8 : 0.1
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
            // Apply victory state changes
            set((prevState) => ({
              ...prevState,
              ...victoryResult,
              log: victoryResult._logMessage
                ? [
                  ...prevState.log,
                  {
                    id: `combat-victory-${Date.now()}`,
                    message: victoryResult._logMessage,
                    timestamp: Date.now(),
                    type: "system",
                  },
                ].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES)
                : prevState.log,
            }));
            get().setCombatDialog(false);
          },
          onDefeat: () => {
            const defeatResult = combatData.onDefeat();
            // Apply defeat state changes
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
          0.02,
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

    // Handle RewardDialog for village attack events BEFORE applying state updates
    // This allows us to extract and remove success log messages before they're added to the event log
    const isVillageAttackEvent = rewardDialogVillageAttackEvents.has(eventId);
    let shouldShowRewardDialog = false;
    let rewardDialogData: { rewards: any; successLog?: string } | null = null;

    if (isVillageAttackEvent && !combatData) {
      const rewards = detectRewards(updatedChanges, state, eventId);
      if (rewards && Object.keys(rewards).length > 0) {
        // Extract success log message
        const successLog = logMessage || undefined;

        rewardDialogData = { rewards, successLog };
        shouldShowRewardDialog = true;

        // Clear logMessage so it doesn't show in event log
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

    // Show reward dialog for village attack events if rewards were detected
    if (shouldShowRewardDialog && rewardDialogData) {
      get().setEventDialog(false);
      setTimeout(() => {
        get().setRewardDialog(true, rewardDialogData);
      }, 200);
      return; // Don't proceed to other dialogs
    }

    // For merchant events, don't show any dialog - just apply the changes
    const isMerchantEvent = eventId === 'merchant';

    // Only create a log message dialog if there's a _logMessage but no combat and it's not a merchant event
    // Note: _logMessage is for dialog feedback only, not for the main log
    // Skip if this is a village attack event that already showed reward dialog
    if (logMessage && !combatData && !isMerchantEvent && !shouldShowRewardDialog) {
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
            ...prevState,
            ...victoryResult,
            log: victoryResult._logMessage
              ? [
                ...prevState.log,
                {
                  id: `combat-victory-${Date.now()}`,
                  message: victoryResult._logMessage,
                  timestamp: Date.now(),
                  type: "system",
                },
              ].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES)
              : prevState.log,
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
    const state = get();
    return Object.values(state.villagers).reduce(
      (sum, count) => sum + (count || 0),
      0,
    );
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
      audioManager.playSound(isMadnessEvent ? "eventMadness" : "event", 0.1);
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
      audioManager.playSound(isMadnessEvent ? "eventMadness" : "event", 0.1);
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
      // If deactivating, clear merchant trades
      logger.log('[MERCHANT TRADES] Clearing merchant trades (deactivating timed tab)');

      set({
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
      });
    } else {
      // Normal activation without merchant
      set({
        timedEventTab: {
          isActive,
          event: event || null,
          expiryTime: isActive && duration ? Date.now() + duration : 0,
          startTime: isActive ? Date.now() : undefined,
        },
      });
    }
  },

  setAuthDialogOpen: (isOpen: boolean) => {
    set({ authDialogOpen: isOpen });
  },

  setShopDialogOpen: (isOpen: boolean) => {
    set({ shopDialogOpen: isOpen });
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
}));