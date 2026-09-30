import { getDevGameModeOverride } from "@/lib/edition";
import { resolveDevMode } from "@/game/devMultipliers";
import type { GameStore } from "../types";

/** Runtime UI / dialog defaults applied on top of defaultGameState in create(). */
export const initialRuntimeState: Partial<GameStore> = {
  activeTab: "cave",
  devMode: resolveDevMode(false),
  devMultipliers: false,
  accountSteamMode: false,
  devGameMode: getDevGameModeOverride(),
  activeDevSaveId: null,
  lastSaved: "Never",
  cooldowns: {},
  executionStartTimes: {},
  executionDurations: {},
  executionAbortEligible: {},
  executionSpendSnapshots: {},
  expeditionVillagers: {},
  log: [],
  eventDialog: {
    isOpen: false,
    currentEvent: null,
    lastEndedAt: 0,
  },
  dialogHandoffPending: false,
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
  shopCruelModeHighlight: false,
  shopFilter: null,
  gamblerDiceDialogOpen: false,
  blessingOfferDialogOpen: false,
  investDialogOpen: false,
  investmentResultDialog: {
    isOpen: false,
    data: null,
  },
  leaderboardDialogOpen: false,
  shareDialogOpen: false,
  galaxyTimeUpDialogOpen: false,
  demoEndDialogDismissed: false,
  shopCheckoutItemId: null,
  musicMuted: false,
  sfxMuted: false,
  musicVolume: 1,
  sfxVolume: 1,
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
  restartGameDialogOpen: false,
  restartGamePreferCruelMode: false,
  deleteAccountDialogOpen: false,
  settingsDialogOpen: false,
  feedbackDialogOpen: false,
  feedbackPromptShown: false,
  villageHotkeyTutorialShown: false,
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
  // Initialize resource highlighting
  highlightedResources: [], // Updated to array for serialization
  resourceChangeEvents: [],

  // Initialize free gold claim tracking
  lastFreeGoldClaim: 0,
  lastFeedbackOpenedAt: 0,
  lastFeedbackOpenedSource: "",

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
  revealedAchievementTitles: [],
};
