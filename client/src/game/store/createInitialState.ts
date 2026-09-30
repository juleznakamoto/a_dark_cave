import { GameState, gameStateSchema } from "@shared/schema";
import { isFullGameUnlockedEdition } from "@/lib/edition";
import {
  GAMBLER_TUTORIAL_PLAYS,
  GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY,
} from "@/game/gamblerSession";

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
  // books / fellowship / blessings / tools / etc. come from generateDefaultGameState()
  // (schema SSOT) - do not override with partial objects or new keys will be missing.
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
  tradersSonGratitudeState: {
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
    duration: 0,
  },
  obsidianOrbState: {
    nextFocusGainTime: 0,
  },
  staringDeerState: {
    isActive: false,
    endTime: 0,
  },
  forestFearState: {
    isActive: false,
    endTime: 0,
  },
  brimstoneFluxState: {
    isActive: false,
    endTime: 0,
  },
  combatSkills: {
    crushingStrikeLevel: 0,
    bloodflameSphereLevel: 0,
    feralHowlLevel: 0,
  },
  // Steam/Galaxy: one-time purchase editions run in BTP mode (rebalanced economy).
  // Dark artifacts are merchant-sold on web and Steam. `full_game` on
  // activatedPurchases is an entitlement sentinel only - web no longer sells a
  // Full Game SKU (MTX shop).
  activatedPurchases: isFullGameUnlockedEdition() ? { full_game: true } : {},
  BTP: isFullGameUnlockedEdition() ? 1 : 0,
  feastActivations: {},
  cruelMode: false,
  attackWaveTimers: {},
  loopProgress: 0,
  isGameLoopActive: false,
  isPaused: false,
  musicMuted: false,
  sfxMuted: false,
  musicVolume: 1,
  sfxVolume: 1,
  authNotificationSeen: false,
  authNotificationVisible: false,
  signUpPromptEligibleForGold: false,
  lastAuthNotificationPlayTime: 0,
  lastSignUpPromptPlayTime: 0,
  socialPromptDialogOpen: false,
  lastSocialPromptPlayTime: 0,
  socialPromptMilestoneIndex: 0,
  playlightExitIntentMilestoneIndex: 0,
  socialPromptAutoPhase: 0,
  socialPromoExclusiveRewardPending: false,
  feedbackDialogOpen: false,
  feedbackPromptShown: false,
  villageHotkeyTutorialShown: false,

  // Initialize resource highlighting state (array for serialization)
  highlightedResources: [],

  // Initialize free gold claim tracking
  lastFreeGoldClaim: 0,
  lastFeedbackOpenedAt: 0,
  lastFeedbackOpenedSource: "",

  // Initialize currency detection
  detectedCurrency: null,

  // Initialize Google Ads source tracking
  googleAdsSource: null,
  utmAttribution: null,

  // Initialize cooldown management
  cooldowns: {},
  initialCooldowns: {},
  executionStartTimes: {},
  executionDurations: {},
  executionAbortEligible: {},
  executionSpendSnapshots: {},
  expeditionVillagers: {},

  // Initialize compass glow
  compassGlowButton: null,

  insightRevealing: {},

  // Initialize analytics tracking
  clickAnalytics: {},
  lastResourceSnapshotTime: 0,
  isPausedPreviously: false, // Initialize isPausedPreviously

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
  revealedAchievementTitles: [],

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
  insightPotionDialog: {
    isOpen: false,
    data: null,
  },
  villageEffectDialog: {
    isOpen: false,
    data: null,
  },
  villageMapOverrides: {},
  villageMapPathOverrides: {},
  villageMapSeenTiers: {},
});


export const defaultGameState: GameState = createInitialState();
