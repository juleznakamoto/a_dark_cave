import type { GameState } from "@shared/schema";
import type { UtmAttribution } from "@shared/utmAttribution";
import type { DevGameMode } from "@/lib/edition";
import type { DevSaveId } from "@/game/devSaveIds";
import type { ExecutionSpendSnapshot } from "@/game/actions";
import type {
  GameTab,
  Currency,
  FocusState,
  GameStats,
} from "@/game/types";
import type { VillageEffectDialogData } from "@/game/villageEffectThemes";
import type { LogEntry } from "@/game/rules/events";
import type { ShopOpenSource } from "@/game/shopOpenSource";
import type { buildInvestmentResultDialogPayload } from "@/game/rules/investmentHallTables";

export type ResourceChangeEvent = {
  id: string;
  resource: string;
  amount: number;
  timestamp: number;
};

/**
 * Runtime store shape. Omits schema fields that diverge at runtime:
 * - `focusState` adds `points`
 * - `merchantTrades` is `{ choices, purchasedIds }` (schema still types an array)
 */
export interface GameStore extends Omit<GameState, "focusState" | "merchantTrades"> {
  // UI state
  activeTab:
  | "cave"
  | "village"
  | "forest"
  | "bastion"
  | "estate"
  | "map"
  | "achievements"
  | "timedevent";
  devMode: boolean;
  /**
   * Live-env account entitlement for the same multipliers as local DEV.
   * Runtime-only; never persisted. `devMode` is `import.meta.env.DEV || this`.
   */
  devMultipliers: boolean;
  /**
   * Live-env account entitlement for Steam Game UI on the web client.
   * Runtime-only; never persisted. Sets `devGameMode` to `steamGame`.
   */
  accountSteamMode: boolean;
  /**
   * Simulate Normal / Steam Game / Steam Playtest / Steam Demo /
   * Demo End / Steam End (Cruel On/Off) / CrazyGames Demo without a Steam build
   * (Settings → Game Mode in DEV, or a live account with `accountSteamMode`).
   */
  devGameMode: DevGameMode;
  /**
   * Dev-only: named milestone fixture currently loaded (`?devSave=` / Settings).
   * Runtime-only; never persisted. While set, local and cloud saves are skipped.
   */
  activeDevSaveId: DevSaveId | null;
  lastSaved: string;
  eventDialog: {
    isOpen: boolean;
    currentEvent: LogEntry | null;
    /**
     * Wall-clock ms when the last EventDialog closed. Used to enforce
     * `EVENT_DIALOG_MIN_GAP_MS` before the next random dialog event.
     * Not persisted; cleared on new game / restart / load reset.
     */
    lastEndedAt?: number;
  };
  /**
   * True while a follow-up modal (reward, outcome, etc.) is scheduled after
   * closing another dialog. Freezes sim so a second event cannot spawn in the gap.
   * Runtime-only; not persisted.
   */
  dialogHandoffPending: boolean;
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
  /** Transient: pulse Cruel Mode shop card (e.g. after end-screen "Cruel Mode" → open shop). Cleared when shop closes. */
  shopCruelModeHighlight: boolean;
  /** Transient: open shop on a specific filter tab (e.g. gold packs). Cleared when shop closes. */
  shopFilter: "gold" | "boosts" | "bundles" | null;
  /** True while the obsessed gambler dice minigame UI is open (freezes production like other modal dialogs). */
  gamblerDiceDialogOpen: boolean;
  /** True while the Insight blessing card-picker overlay is open (blocking). */
  blessingOfferDialogOpen: boolean;
  /** Village Invest modal open; game loop treats offer-picker as modal pause but keeps sim running while an investment is maturing. */
  investDialogOpen: boolean;
  investmentResultDialog: {
    isOpen: boolean;
    data: ReturnType<typeof buildInvestmentResultDialogPayload> | null;
  };
  leaderboardDialogOpen: boolean;
  shareDialogOpen: boolean;
  /** Demo edition (Galaxy / Steam demo): blocking dialog when the wooden hut limit is reached. */
  galaxyTimeUpDialogOpen: boolean;
  /** Player closed the demo-end dialog; do not auto-reopen this session. */
  demoEndDialogDismissed: boolean;
  /**
   * Transient: when set, the shop dialog opens straight into checkout for this
   * item id (used for items hidden from the shop grid, e.g. additional preset
   * slots). Cleared when the shop/checkout closes.
   */
  shopCheckoutItemId: string | null;
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
  restartGameDialogOpen: boolean;
  /**
   * Transient: pre-check Cruel Mode on the new-game dialog (end-screen CTA).
   * Cleared when the dialog closes. Runtime-only.
   */
  restartGamePreferCruelMode: boolean;
  deleteAccountDialogOpen: boolean;
  settingsDialogOpen: boolean;
  feedbackDialogOpen: boolean;
  /** Persisted: one-time feedback dialog at 135m play time has been shown or skipped. */
  feedbackPromptShown: boolean;
  /** Persisted: village tab hotkey tutorial (boxed overlay) was dismissed or timed out. */
  villageHotkeyTutorialShown: boolean;

  /** Legacy; guest Profile sign-in dot schedule removed. */
  authNotificationSeen: boolean;
  /** Legacy; unused (see authNotificationSeen). */
  authNotificationVisible: boolean;

  /** Open AuthDialog in signup mode (rewards, shop secure-purchase / free gift); cleared after signup or dialog close. */
  signUpPromptEligibleForGold: boolean;
  /** Legacy; unused (see authNotificationSeen). */
  lastAuthNotificationPlayTime: number;
  /** Legacy alias of lastAuthNotificationPlayTime; retained for save compatibility. */
  lastSignUpPromptPlayTime: number;

  /** Social / email / invite / sign-up rewards prompt (guest + signed-in schedules in game loop). */
  socialPromptDialogOpen: boolean;

  // Resource highlighting state
  highlightedResources: string[]; // Updated to array for serialization
  /** Transient events used by the side panel when value diffing cannot observe a change. */
  resourceChangeEvents: ResourceChangeEvent[];

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
  referrals: GameState["referrals"]; // Added to store referral details

  // Free gold claim tracking
  lastFreeGoldClaim: number; // timestamp of last claim
  /** Wall-clock ms of last hosted feedback-form open (0 = never). */
  lastFeedbackOpenedAt: number;
  lastFeedbackOpenedSource: string;

  // Currency detection (persists across game restarts)
  detectedCurrency: Currency | null;

  // Google Ads source tracking (persists across game restarts)
  googleAdsSource: string | null;
  /** First-touch UTM / legacy `?c=` attribution (persists across restarts). */
  utmAttribution: UtmAttribution | null;

  // Cooldown management
  cooldowns: Record<string, number>;
  initialCooldowns: Record<string, number>;

  // Execution time (reverse cooldown - action takes time to complete)
  executionStartTimes: Record<string, number>;
  executionDurations: Record<string, number>;
  /** True when the player started this execution (eligible for paid abort). Prior-started executions are false/absent. */
  executionAbortEligible: Record<string, boolean>;
  /** Spend deltas captured at execution start for abort refunds (player-started only). */
  executionSpendSnapshots: Record<string, ExecutionSpendSnapshot>;
  _completingExecution?: string; // Internal: when set, executeAction skips execution-time check

  // Compass glow effect
  compassGlowButton: string | null; // Action ID of button to glow

  // Timed event tab (not part of GameState, only UI state)
  timedEventTab: {
    isActive: boolean;
    event: LogEntry | null;
    expiryTime: number;
    startTime?: number;
    /**
     * Wall-clock ms when the last timed-tab visit ended. Used to enforce
     * `TIMED_TAB_MIN_GAP_MS` before the next random timed-tab spawn.
     * Not persisted; cleared on new game / restart.
     */
    lastEndedAt?: number;
    /** Gambler only: plays left this visit; set when tab opens, decremented on resolved dismiss. Stops Accept from re-granting bone-dice quota after gamblerGame is cleared. */
    gamblerRoundsRemaining?: number;
    /**
     * Countdown pause tracking (game pause + blocking modals). Matches TimedEventPanel / loop expiry:
     * remaining = expiryTime + pauseAccumMs - (pauseStartedAt || now).
     * Not persisted; reset on load and when activating a new timed tab.
     */
    pauseAccumMs?: number;
    /** Wall time when the current pause segment started; 0 while the countdown is running. */
    pauseStartedAt?: number;
    /** Insight +2 min prolong already bought this timed-tab visit; badge hidden after use. */
    insightProlongUsed?: boolean;
    /** Wandering collector: whether buy_/sell_ offers existed when the visit opened. */
    collectorBuyAvailable?: boolean;
    collectorSellAvailable?: boolean;
    // Wandering collector: one buy and one sell allowed per visit.
    collectorBuyDone?: boolean;
    collectorSellDone?: boolean;
    /** Choice id that got the Buy-section checkmark this visit. */
    collectorBuyChoiceId?: string;
    /** Choice id that got the Sell-section checkmark this visit. */
    collectorSellChoiceId?: string;
    /**
     * Rewards from mid-visit buy/sell trades, shown in RewardDialog only when
     * the collector leaves (say goodbye, timeout, or max trades).
     */
    collectorPendingRewards?: Record<string, unknown>;
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
  musicVolume: number; // Background music master volume (0–1)
  sfxVolume: number; // Sound effects master volume (0–1)

  // Analytics tracking
  clickAnalytics: Record<string, number>;
  lastResourceSnapshotTime: number;
  isPausedPreviously: boolean;

  // Achievements
  unlockedAchievements: string[];
  claimedAchievements: string[];
  unlockAchievement: (achievementId: string) => void;
  revealAchievementTitle: (achievementId: string, currentCount: number) => boolean;

  // Leaderboard
  username?: string;
  setUsername: (username: string) => void;

  // Game completion tracking
  game_stats: GameStats[];
  hasWonAnyGame: boolean;
  hasWonNormalGame: boolean;
  hasWonCruelGame: boolean;
  hasSpeedrunWin: boolean;
  lifetimeGamesWon: number;
  lifetimePlayTimeMs: number;
  lifetimeStorageMaxHits: string[];
  lifetimeEstateUpgradeMaxHits: string[];
  hasAchievementMaxer: boolean;

  // Reward dialog
  rewardDialog: {
    isOpen: boolean;
    data: any; // RewardDialogData will be imported from the component
  };
  madnessDialog: {
    isOpen: boolean;
    data: any;
  };
  insightPotionDialog: {
    isOpen: boolean;
    data: any;
  };
  villageEffectDialog: {
    isOpen: boolean;
    data: VillageEffectDialogData | null;
  };

  // Actions
  getAndResetClickAnalytics: () => Record<string, number> | null;
  getAndResetResourceAnalytics: () => Record<string, number> | null;
  executeAction: (
    actionId: string,
    meta?: { executionSource?: "player" | "prior" },
  ) => void;
  setActiveTab: (tab: GameTab) => void;
  /** Persist a resizable-panel size (px), or `null` to reset to the responsive default. */
  setPanelSize: (
    key: keyof GameState["panelSizes"],
    px: number | null,
  ) => void;
  setMusicMuted: (muted: boolean) => void;
  setSfxMuted: (muted: boolean) => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setSignUpPromptEligibleForGold: (eligible: boolean) => void;
  setSocialPromptDialogOpen: (isOpen: boolean) => void;
  setHighlightedResources: (resources: string[]) => void;
  emitResourceChange: (resource: string, amount: number) => void;
  setIsUserSignedIn: (signedIn: boolean) => void;
  setDevMultipliers: (enabled: boolean) => void;
  applyAccountSteamMode: (enabled: boolean) => void;
  setDetectedCurrency: (currency: "EUR" | "USD") => void;
  updateResource: (
    resource: keyof GameState["resources"],
    amount: number,
    options?: { allowOvercap?: boolean },
  ) => void;
  setFlag: (flag: keyof GameState["flags"], value: boolean) => void;
  setHoveredTooltip: (tooltipId: string, value: boolean) => void;
  setScrollIndicatorSeen: (scrollAreaId: string) => void;
  initialize: (state: GameState) => void;
  restartGame: (options?: { cruelMode?: boolean }) => void;
  /** Hydrate the store once; returns true when a persisted save was loaded. */
  loadGame: (options?: { cloud?: boolean }) => Promise<boolean>;
  toggleDevMode: () => void;
  getMaxPopulation: () => number;
  updatePopulation: () => void;
  setCooldown: (action: string, duration: number) => void;
  tickCooldowns: () => void;
  startActionExecution: (
    actionId: string,
    meta?: { executionSource?: "player" | "prior" },
  ) => void;
  completeActionExecution: (actionId: string) => void;
  abortActionExecution: (actionId: string) => void;
  togglePriorAction: (actionId: string) => void;
  setCompassGlow: (actionId: string | null) => void;
  addLogEntry: (entry: LogEntry) => void;
  /** Remember an event-log line as read so a refresh does not mark it new again. */
  markLogEntryRead: (entryId: string) => void;
  checkEvents: () => void;
  applyEventChoice: (
    choiceId: string,
    eventId: string,
    currentLogEntry?: LogEntry,
  ) => boolean;
  assignVillager: (job: keyof GameState["villagers"], count?: number) => void;
  unassignVillager: (job: keyof GameState["villagers"], count?: number) => void;
  /** Apply a villager-cap upgrade immediately (spend Insight + increment level). */
  upgradeVillagerCap: (groupId: string) => boolean;
  /**
   * Start the shared group Insight animation, then apply the upgrade when it
   * finishes. All badges for the group read `insightRevealing` and stay locked.
   */
  startVillagerCapUpgrade: (groupId: string) => boolean;
  /** Set the active preset slot (1-based) that the save button writes to. */
  setActivePresetSlot: (slot: number) => void;
  /** Save the current villager job assignments into a preset slot (1-based). */
  saveVillagerJobPreset: (slot: number) => boolean;
  /** Apply a saved preset (1-based slot); selects the slot and redistributes villagers if saved. */
  applyVillagerJobPreset: (slot: number) => void;
  /** Buy the next preset slot with Insight (one at a time). Returns true on success. */
  purchaseVillagerPresetSlot: () => boolean;
  /** Buy the next construction queue slot with Insight. Returns true on success. */
  purchaseConstructionQueueSlot: () => boolean;
  /** Spend Insight to skip 50% of an in-progress building's construction time (once). */
  boostConstruction: (actionId: string) => boolean;
  enchantWeapon: (weaponId: string) => boolean;
  /** Spend Insight to reduce an item's madness by 1 (Book of Absolution, once per item). */
  absolveItem: (itemId: string) => boolean;
  setEventDialog: (isOpen: boolean, event?: LogEntry | null) => void;
  /** Re-open EventDialog from `pendingModalEvent` after a load-time dialog reset. */
  resumePendingModalEventDialog: () => void;
  setCombatDialog: (isOpen: boolean, data?: any) => void;
  setTimedEventTab: (isActive: boolean, event?: LogEntry | null, duration?: number) => Promise<void>;
  callMerchant: () => void;
  finalizeCallMerchant: () => void;
  startInvestment: (
    offerIndex: number,
    amountGold: number,
  ) => { ok: true } | { ok: false; reason: string };
  tickInvestmentHall: () => void;
  setAuthDialogOpen: (isOpen: boolean) => void;
  setShopDialogOpen: (isOpen: boolean, source?: ShopOpenSource) => void;
  setShopCruelModeHighlight: (highlight: boolean) => void;
  setShopFilter: (
    filter: "gold" | "boosts" | "bundles" | null,
  ) => void;
  recordCompletePurchaseDialogOpen: () => void;
  setGamblerDiceDialogOpen: (isOpen: boolean) => void;
  setBlessingOfferDialogOpen: (isOpen: boolean) => void;
  /** Spend Insight and grant a blessing from the active Insight blessing offer. */
  chooseInsightBlessing: (blessingId: string) => boolean;
  setInvestDialogOpen: (isOpen: boolean) => void;
  setInvestmentResultDialog: (
    isOpen: boolean,
    data?: ReturnType<typeof buildInvestmentResultDialogPayload> | null,
  ) => void;
  setLeaderboardDialogOpen: (isOpen: boolean) => void;
  setShareDialogOpen: (isOpen: boolean) => void;
  setGalaxyTimeUpDialogOpen: (isOpen: boolean) => void;
  dismissDemoEndDialog: () => void;
  setShopCheckoutItemId: (itemId: string | null) => void;
  /** Grandfather legacy `additional_preset_slots` shop purchases. */
  grantAdditionalPresetSlots: () => void;
  /** Grandfather legacy `additional_construction_queue_slot` shop purchases. */
  grantAdditionalConstructionQueueSlot: () => void;
  setIdleModeDialog: (isOpen: boolean) => void;
  setRestartGameDialogOpen: (
    isOpen: boolean,
    options?: { preferCruelMode?: boolean },
  ) => void;
  setSettingsDialogOpen: (isOpen: boolean) => void;
  setDevGameMode: (mode: DevGameMode) => void;
  setDeleteAccountDialogOpen: (isOpen: boolean) => void;
  setVillageMapOverride: (id: string, point: { x: number; y: number } | null) => void;
  setVillageMapPathOverride: (id: string, point: { x: number; y: number } | null) => void;
  setVillageMapSeenTiers: (tiers: Record<string, number>) => void;
  updateEffects: () => void;
  updateBastionStats: () => void;
  updateStats: () => void;
  updateLoopProgress: (progress: number) => void;
  setGameLoopActive: (isActive: boolean) => void;
  togglePause: () => void;
  updatePlayTime: (deltaTime: number) => void;
  trackButtonClick: (buttonId: string) => void;
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
  setInsightPotionDialog: (isOpen: boolean, data?: any) => void;
  setVillageEffectDialog: (
    isOpen: boolean,
    data?: VillageEffectDialogData | null,
  ) => void;
  /** Session-only: actionId → reveal animation end timestamp (ms). */
  insightRevealing: Record<string, number>;
  prolongTimedEventTab: () => boolean;
}
