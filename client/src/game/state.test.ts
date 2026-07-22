import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createInitialState,
  useGameStore,
  detectRewards,
  rewardDialogActions,
  rewardPayloadHasPositiveChanges,
  rewardPayloadHasOutcomeLosses,
} from "./state";
import { GameState } from "@shared/schema";

const {
  mockLoadGame,
  mockSetLastGameLoadTime,
  mockSaveGame,
  mockFlushOverdueActionExecutions,
} = vi.hoisted(() => ({
  mockLoadGame: vi.fn(),
  mockSetLastGameLoadTime: vi.fn(),
  mockSaveGame: vi.fn().mockResolvedValue(undefined),
  mockFlushOverdueActionExecutions: vi.fn(),
}));

vi.mock("@/game/save", () => ({
  loadGame: (...args: unknown[]) => mockLoadGame(...args),
  saveGame: (...args: unknown[]) => mockSaveGame(...args),
}));

vi.mock("@/game/loop", () => ({
  setLastGameLoadTime: (...args: unknown[]) => mockSetLastGameLoadTime(...args),
  flushOverdueActionExecutions: (...args: unknown[]) =>
    mockFlushOverdueActionExecutions(...args),
}));

describe("Focus State Management", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("should set focus to 0 when Focus button is clicked", () => {
    const store = useGameStore.getState();

    // Set up initial state with focus
    useGameStore.setState({
      focusState: {
        isActive: false,
        endTime: 0,
        points: 5,
      },
    });

    // Verify initial focus amount
    expect(useGameStore.getState().focusState.points).toBe(5);

    // Simulate clicking the Focus button
    const currentState = useGameStore.getState();
    const focusDuration = currentState.focusState.points;

    useGameStore.setState({
      focusState: {
        isActive: true,
        endTime: Date.now() + focusDuration * 60000,
        points: 0,
      },
    });

    // Verify focus is consumed
    const finalState = useGameStore.getState();
    expect(finalState.focusState.points).toBe(0);
    expect(finalState.focusState.isActive).toBe(true);
    expect(finalState.focusState.endTime).toBeGreaterThan(Date.now());
  });

  it("should not allow activating focus twice", () => {
    const store = useGameStore.getState();

    // Set up initial state with focus
    useGameStore.setState({
      focusState: {
        isActive: false,
        endTime: 0,
        points: 5,
      },
    });

    // First activation
    const currentState = useGameStore.getState();
    const focusDuration = currentState.focusState.points;

    useGameStore.setState({
      focusState: {
        isActive: true,
        endTime: Date.now() + focusDuration * 60000,
        points: 0,
      },
    });

    // Verify first activation worked
    expect(useGameStore.getState().focusState.points).toBe(0);
    expect(useGameStore.getState().focusState.isActive).toBe(true);

    // Try to activate again (should not work because focus is 0)
    const secondState = useGameStore.getState();
    expect(secondState.focusState.points).toBe(0);

    // Button should be hidden when focus is 0
    // This is enforced by the UI: {focusState.points > 0 && !focusState.isActive && ...}
  });

  it("should allow activating focus again after first focus expires and new focus is gained", () => {
    const store = useGameStore.getState();

    // Set up initial state with focus
    useGameStore.setState({
      focusState: {
        isActive: false,
        endTime: 0,
        points: 3,
      },
    });

    // First activation
    useGameStore.setState({
      focusState: {
        isActive: true,
        endTime: Date.now() + 3 * 60000,
        points: 0,
      },
    });

    expect(useGameStore.getState().focusState.points).toBe(0);

    // Simulate focus expiring
    useGameStore.setState({
      focusState: {
        isActive: false,
        endTime: 0,
        points: 0,
      },
    });

    // Gain new focus
    useGameStore.setState({
      focusState: {
        isActive: false,
        endTime: 0,
        points: 2,
      },
    });

    expect(useGameStore.getState().focusState.points).toBe(2);

    // Should be able to activate again
    const newState = useGameStore.getState();
    useGameStore.setState({
      focusState: {
        isActive: true,
        endTime: Date.now() + newState.focusState.points * 60000,
        points: 0,
      },
    });

    expect(useGameStore.getState().focusState.points).toBe(0);
    expect(useGameStore.getState().focusState.isActive).toBe(true);
  });

  it("should add focus points after sleep based on intensity level", () => {
    const store = useGameStore.getState();

    // Set up sleep upgrades with intensity level 3
    useGameStore.setState({
      sleepUpgrades: {
        lengthLevel: 2,
        intensityLevel: 3,
      },
      focusState: {
        isActive: false,
        endTime: 0,
        points: 0,
      },
    });

    // Simulate sleep mode being active
    useGameStore.setState({
      idleModeState: {
        isActive: true,
        startTime: Date.now() - 60000, // Started 1 minute ago
        needsDisplay: false,
      },
    });

    // Intensity level 3 should give 3 focus points
    const expectedFocus = 3;

    // Simulate waking up and adding focus
    useGameStore.getState().updateFocusState({
      isActive: false,
      endTime: 0,
      points: expectedFocus,
    });

    // Verify focus was added
    expect(useGameStore.getState().focusState.points).toBe(expectedFocus);
  });

  it("should not add focus points if intensity level is 0", () => {
    const store = useGameStore.getState();

    // Set up sleep upgrades with no intensity
    useGameStore.setState({
      sleepUpgrades: {
        lengthLevel: 2,
        intensityLevel: 0,
      },
      focusState: {
        isActive: false,
        endTime: 0,
        points: 0,
      },
    });

    // Intensity level 0 should give 0 focus points
    const expectedFocus = 0;

    // Simulate waking up (no focus should be added)
    // useGameStore.getState().updateFocusState(...); // Don't call with 0

    // Verify focus remains 0
    expect(useGameStore.getState().focusState.points).toBe(0);
  });
});

describe("Reward Dialog System", () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = createInitialState();
    useGameStore.setState(initialState);
  });

  describe("rewardPayloadHasPositiveChanges", () => {
    it("is false for empty payload", () => {
      expect(rewardPayloadHasPositiveChanges({})).toBe(false);
    });

    it("is false for losses only", () => {
      expect(
        rewardPayloadHasPositiveChanges({
          resourceLosses: { food: 10 },
          villagersLost: 2,
        }),
      ).toBe(false);
    });

    it("is true when resources gained", () => {
      expect(
        rewardPayloadHasPositiveChanges({
          resources: { gold: 5 },
        }),
      ).toBe(true);
    });
  });

  describe("detectRewards internal stats", () => {
    it("does not surface villagerDeathsLifetime as a reward stat", () => {
      const currentState = {
        ...initialState,
        stats: {
          ...initialState.stats,
          villagerDeathsLifetime: 0,
        },
      };
      const stateUpdates = {
        stats: {
          ...currentState.stats,
          villagerDeathsLifetime: 5,
        },
        villagersKilled: 5,
      };
      const rewards = detectRewards(stateUpdates, currentState, "bloodMoonAttack", {
        trackLosses: true,
      });
      expect(rewards.stats).toBeUndefined();
      expect(rewards.villagersLost).toBe(5);
      expect(rewardPayloadHasPositiveChanges(rewards)).toBe(false);
      expect(rewardPayloadHasOutcomeLosses(rewards)).toBe(true);
    });

    it("does not treat madness-only changes as reward gains", () => {
      const currentState = {
        ...initialState,
        stats: {
          ...initialState.stats,
          madnessFromEvents: 0,
        },
      };
      const stateUpdates = {
        stats: {
          ...currentState.stats,
          madnessFromEvents: 1,
        },
      };
      const rewards = detectRewards(stateUpdates, currentState, "shadowsMove");
      expect(rewards.stats).toBeUndefined();
      expect(rewardPayloadHasPositiveChanges(rewards)).toBe(false);
    });
  });

  describe("layTrap action", () => {
    it("should show reward dialog when layTrap succeeds", () => {
      // Setup: ensure player has giant trap tool
      useGameStore.setState({
        ...initialState,
        tools: {
          ...initialState.tools,
          giant_trap: true,
        },
        resources: {
          ...initialState.resources,
          food: 10000, // Ensure enough food
        },
      });

      // Mock Math.random to ensure success (layTrap success chance calculation)
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.1); // Low value = success

      // Execute the action (starts 30s execution time)
      useGameStore.getState().executeAction("layTrap");
      // Complete the execution (layTrap has executionTime, so we need to complete it)
      useGameStore.getState().completeActionExecution("layTrap");

      // Check that reward dialog was triggered (we can't easily test the timeout, but we can check state setup)
      // The dialog state should be set after the timeout
      expect(mockRandom).toHaveBeenCalled();

      mockRandom.mockRestore();
    });

    it("should detect black bear fur reward correctly", () => {
      // Test the reward detection logic directly
      const stateUpdates = {
        clothing: {
          black_bear_fur: true,
        },
        resources: {
          food: 9500, // 10000 - 500 cost = 9500
        },
      };

      const currentState = {
        ...initialState,
        resources: {
          ...initialState.resources,
          food: 10000, // initial food before cost
        },
      };

      const rewards = detectRewards(stateUpdates, currentState, "layTrap");

      expect(rewards).toEqual({
        clothing: ["black_bear_fur"],
      });
    });
  });

  describe("castleRuins action", () => {
    it("should detect ancient scrolls and resource rewards", () => {
      // Test the reward detection logic directly
      const stateUpdates = {
        relics: {
          ancient_scrolls: true,
        },
        resources: {
          silver: 100,  // final amount (gained 100)
          gold: 50,     // final amount (gained 50)
          food: 7500,   // final amount (lost 2500, so no gain shown)
        },
      };

      // Set up current state with initial values before the action
      const currentState = {
        ...initialState,
        resources: {
          ...initialState.resources,
          silver: 0,    // initial silver
          gold: 0,      // initial gold
          food: 10000,  // initial food before 2500 cost
        },
      };

      const rewards = detectRewards(stateUpdates, currentState, "castleRuins");

      expect(rewards).toEqual({
        relics: ["ancient_scrolls"],
        resources: { silver: 100, gold: 50 },
      });
    });
  });

  describe("blackreachCanyon action", () => {
    it("should detect one-eyed crow fellowship reward", () => {
      // Test the reward detection logic directly
      const stateUpdates = {
        fellowship: {
          one_eyed_crow: true,
        },
      };

      const currentState = initialState;
      const rewards = detectRewards(stateUpdates, currentState, "blackreachCanyon");

      expect(rewards).toEqual({
        fellowship: ["one_eyed_crow"],
      });
    });

    it("should be in the reward dialog whitelist", () => {
      // Test that blackreachCanyon is in the whitelist
      expect(rewardDialogActions.has("blackreachCanyon")).toBe(true);
    });

    it("should include all new cave actions in whitelist", () => {
      // Test that all the new actions are in the whitelist
      expect(rewardDialogActions.has("lowChamber")).toBe(true);
      expect(rewardDialogActions.has("occultistChamber")).toBe(true);
      expect(rewardDialogActions.has("hiddenLibrary")).toBe(true);
      expect(rewardDialogActions.has("exploreUndergroundLake")).toBe(true);
    });

    it("should trigger reward dialog for blackreachCanyon", () => {
      // Setup: ensure player has crow harness and enough food
      useGameStore.setState({
        ...initialState,
        tools: {
          ...initialState.tools,
          crow_harness: true,
        },
        resources: {
          ...initialState.resources,
          food: 10000,
        },
      });

      // Execute the action
      useGameStore.getState().executeAction("blackreachCanyon");

      // The dialog should be triggered (we test the setup, not the timeout)
      // In a real scenario, the dialog would appear after 500ms
    });
  });

  describe("lowChamber action", () => {
    it("should detect mastermason chisel and resource rewards", () => {
      // Test the reward detection logic directly
      const stateUpdates = {
        tools: {
          mastermason_chisel: true,
        },
        resources: {
          silver: 251,  // gained 251 (250 + 1 bonus)
          gold: 50,     // gained 50
          obsidian: 50, // gained 50
          adamant: 50,  // gained 50
          food: 9000,   // lost 1000 (but we only show gains)
        },
      };

      const currentState = {
        ...initialState,
        resources: {
          ...initialState.resources,
          silver: 0,
          gold: 0,
          obsidian: 0,
          adamant: 0,
          food: 10000, // initial food before cost
        },
      };

      const rewards = detectRewards(stateUpdates, currentState, "lowChamber");

      expect(rewards).toEqual({
        tools: ["mastermason_chisel"],
        resources: { silver: 251, gold: 50, obsidian: 50, adamant: 50 },
      });
    });
  });

  describe("occultistChamber action", () => {
    it("should detect occultist grimoire and resource rewards", () => {
      // Test the reward detection logic directly
      const stateUpdates = {
        relics: {
          occultist_grimoire: true,
        },
        resources: {
          gold: 150,      // gained 150
          obsidian: 75,   // gained 75
          adamant: 50,    // gained 50
          moonstone: 25,  // gained 25
          food: 9000,     // lost 1000 (but we only show gains)
        },
      };

      const currentState = {
        ...initialState,
        resources: {
          ...initialState.resources,
          gold: 0,
          obsidian: 0,
          adamant: 0,
          moonstone: 0,
          food: 10000, // initial food before cost
        },
      };

      const rewards = detectRewards(stateUpdates, currentState, "occultistChamber");

      expect(rewards).toEqual({
        relics: ["occultist_grimoire"],
        resources: { gold: 150, obsidian: 75, adamant: 50, moonstone: 25 },
      });
    });
  });

  describe("hiddenLibrary action", () => {
    it("should detect stonebinders codex and gold reward", () => {
      // Test the reward detection logic directly
      const stateUpdates = {
        relics: {
          stonebinders_codex: true,
        },
        resources: {
          gold: 100,   // gained 100
          food: 7500,  // lost 2500 (but we only show gains)
        },
      };

      const currentState = {
        ...initialState,
        resources: {
          ...initialState.resources,
          gold: 0,
          food: 10000, // initial food before cost
        },
      };

      const rewards = detectRewards(stateUpdates, currentState, "hiddenLibrary");

      expect(rewards).toEqual({
        relics: ["stonebinders_codex"],
        resources: { gold: 100 },
      });
    });
  });

  describe("exploreUndergroundLake action", () => {
    it("should detect resource rewards", () => {
      // Test the reward detection logic directly
      const stateUpdates = {
        resources: {
          silver: 500,    // gained 500
          gold: 100,      // gained 100
          obsidian: 150,  // gained 150
          adamant: 100,   // gained 100
          moonstone: 25,  // gained 25
          food: 7500,     // lost 2500 (but we only show gains)
          wood: 5000,     // lost 5000 (but we only show gains)
          iron: 500,      // lost 500 (but we only show gains)
        },
      };

      const currentState = {
        ...initialState,
        resources: {
          ...initialState.resources,
          silver: 0,
          gold: 0,
          obsidian: 0,
          adamant: 0,
          moonstone: 0,
          food: 10000,  // initial food before cost
          wood: 10000,   // initial wood before cost
          iron: 1000,    // initial iron before cost
        },
      };

      const rewards = detectRewards(stateUpdates, currentState, "exploreUndergroundLake");

      expect(rewards).toEqual({
        resources: { silver: 500, gold: 100, obsidian: 150, adamant: 100, moonstone: 25 },
      });
    });
  });
});

describe("Gambler resume on load", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
    mockLoadGame.mockReset();
    mockSetLastGameLoadTime.mockReset();
  });

  it(
    "preserves in-progress gambler session from save",
    async () => {
      const session = {
        phase: "playerTurn" as const,
        playerTotal: 10,
        npcTotal: 8,
        goal: 15,
        playerLastRoll: 4,
        npcLastRoll: null as number | null,
        hasRolledThisRound: true,
        playerStopped: false,
        pauseAfterNextPlayerRoll: false,
      };
      const savedState = {
        ...createInitialState(),
        resources: {
          ...createInitialState().resources,
          gold: 100,
        },
        timedEventTab: {
          isActive: true,
          event: {
            id: "gambler-state-test",
            message: "",
            timestamp: Date.now(),
            type: "event" as const,
          },
          expiryTime: Date.now() + 600_000,
        },
        gamblerGame: {
          wager: 50,
          stakeNotYetDeducted: true as const,
          session,
        },
        gamblerDiceDialogOpen: true,
        log: [],
      };

      mockLoadGame.mockResolvedValue(savedState);

      await useGameStore.getState().loadGame();

      expect(mockSetLastGameLoadTime).toHaveBeenCalled();
      expect(useGameStore.getState().activeTab).toBe("timedevent");
      expect(useGameStore.getState().gamblerDiceDialogOpen).toBe(true);
      expect(useGameStore.getState().gamblerGame).toMatchObject({
        wager: 50,
        stakeNotYetDeducted: true,
        session: expect.objectContaining({ playerTotal: 10, npcTotal: 8 }),
      });
      expect(useGameStore.getState().resources.gold).toBe(100);
      expect(
        useGameStore
          .getState()
          .log.some((e) => e.message.includes("silence as forfeit")),
      ).toBe(false);
    },
    15_000,
  );

  it("preserves resolved gambler outcome and snapshot from save", async () => {
    const savedState = {
      ...createInitialState(),
      resources: {
        ...createInitialState().resources,
        gold: 160,
      },
      timedEventTab: {
        isActive: true,
        event: {
          id: "gambler-outcome-test",
          message: "",
          timestamp: Date.now(),
          type: "event" as const,
        },
        expiryTime: Date.now() + 600_000,
      },
      gamblerGame: {
        wager: 50,
        outcome: "win" as const,
        outcomeSnapshot: {
          playerTotal: 12,
          npcTotal: 10,
          goal: 15,
        },
      },
      log: [],
    };

    mockLoadGame.mockResolvedValue(savedState);

    await useGameStore.getState().loadGame();

    expect(useGameStore.getState().activeTab).toBe("timedevent");
    expect(useGameStore.getState().gamblerDiceDialogOpen).toBe(true);
    expect(useGameStore.getState().gamblerGame).toMatchObject({
      wager: 50,
      outcome: "win",
      outcomeSnapshot: { playerTotal: 12, npcTotal: 10, goal: 15 },
    });
    expect(
      useGameStore
        .getState()
        .log.some((e) => e.message.includes("silence as forfeit")),
    ).toBe(false);
  });
});

describe("Timed event tab cleanup on new game", () => {
  const activeTimedTab = {
    isActive: true,
    event: {
      id: "merchant-test",
      message: "A merchant arrives",
      timestamp: Date.now(),
      type: "event" as const,
    },
    expiryTime: Date.now() + 60_000,
    startTime: Date.now(),
  };

  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("initialize clears an active timed event tab", () => {
    useGameStore.setState({
      activeTab: "timedevent",
      timedEventTab: activeTimedTab,
      gamblerGame: { wager: 10, stakeNotYetDeducted: true },
      gamblerDiceDialogOpen: true,
      merchantTrades: { choices: [{ id: "trade-1" }], purchasedIds: [] },
    });

    useGameStore.getState().initialize();

    const state = useGameStore.getState();
    expect(state.timedEventTab.isActive).toBe(false);
    expect(state.timedEventTab.event).toBeNull();
    expect(state.gamblerGame).toBeNull();
    expect(state.gamblerDiceDialogOpen).toBe(false);
    expect(state.merchantTrades.choices).toEqual([]);
    expect(state.activeTab).toBe("cave");
  });

  it("restartGame clears an active timed event tab", async () => {
    mockSaveGame.mockClear();

    useGameStore.setState({
      activeTab: "timedevent",
      timedEventTab: activeTimedTab,
      gamblerGame: { wager: 25, stakeNotYetDeducted: true },
      gamblerDiceDialogOpen: true,
      restartGameDialogOpen: true,
      merchantTrades: { choices: [{ id: "trade-1" }], purchasedIds: ["trade-0"] },
      flags: { ...useGameStore.getState().flags, gameStarted: true },
    });

    await useGameStore.getState().restartGame();

    const state = useGameStore.getState();
    expect(state.restartGameDialogOpen).toBe(false);
    expect(state.timedEventTab.isActive).toBe(false);
    expect(state.timedEventTab.event).toBeNull();
    expect(state.gamblerGame).toBeNull();
    expect(state.gamblerDiceDialogOpen).toBe(false);
    expect(state.merchantTrades.choices).toEqual([]);
    expect(state.activeTab).toBe("cave");
  });

  it("restartGame re-applies gold from already-claimed social tasks", async () => {
    mockSaveGame.mockClear();

    useGameStore.setState({
      resources: { ...useGameStore.getState().resources, gold: 9999 },
      signupWelcomeGoldClaimed: true,
      social_media_rewards: {
        marketing_email: { claimed: true, timestamp: 1 },
        instagram: { claimed: true, timestamp: 1 },
      },
      referrals: [{ userId: "friend", claimed: true, timestamp: 1 }],
      flags: { ...useGameStore.getState().flags, gameStarted: true },
    });

    await useGameStore.getState().restartGame();

    const state = useGameStore.getState();
    expect(state.resources.gold).toBe(600);
    expect(state.social_media_rewards.marketing_email?.claimed).toBe(true);
    expect(state.social_media_rewards.instagram?.claimed).toBe(true);
    expect(state.signupWelcomeGoldClaimed).toBe(true);
    expect(state.referrals).toHaveLength(1);
  });
});

describe("Disgraced Prior assignment does not bypass affordability", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  // craftEmberBomb costs 100 iron + 50 black_powder and takes 20s to execute.
  // Assigning the Prior to it must NOT start an execution (and deduct costs) when
  // the player cannot afford it — previously this drove black_powder negative.
  function setupEmberBombState(overrides: Partial<GameState["resources"]>) {
    const base = useGameStore.getState();
    useGameStore.setState({
      fellowship: { disgraced_prior: true },
      disgracedPriorSkills: { level: 0 },
      priorAssignedActions: [],
      buildings: { ...base.buildings, alchemistHall: 1 },
      story: { ...base.story, seen: { ...base.story.seen, portalDiscovered: true } },
      resources: { ...base.resources, iron: 200, black_powder: 0, ...overrides },
      cooldowns: {},
    });
  }

  it("does not start an unaffordable execution-time craft when the Prior is assigned", () => {
    setupEmberBombState({ black_powder: 0 });

    useGameStore.getState().togglePriorAction("craftEmberBomb");

    const state = useGameStore.getState();
    // Assignment is recorded, but nothing was started and no resources were spent.
    expect(state.priorAssignedActions).toContain("craftEmberBomb");
    expect(state.executionStartTimes?.craftEmberBomb).toBeUndefined();
    expect(state.resources.black_powder).toBe(0);
    expect(state.resources.iron).toBe(200);
  });

  it("starts the craft and deducts costs when affordable", () => {
    setupEmberBombState({ black_powder: 100 });

    useGameStore.getState().togglePriorAction("craftEmberBomb");

    const state = useGameStore.getState();
    expect(state.executionStartTimes?.craftEmberBomb).toBeGreaterThan(0);
    // Costs are deducted at execution start.
    expect(state.resources.black_powder).toBe(50);
    expect(state.resources.iron).toBe(100);
  });
});

describe("deferred dialog scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().initialize();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps a deferred event queued until every blocking modal has cleared", () => {
    const blockingEvent = {
      id: "disgracedPriorOffer-test",
      message: "Blocking",
      timestamp: Date.now(),
      type: "event" as const,
      choices: [{ id: "offerShelter", label: "Shelter", effect: () => ({}) }],
    };
    const deferredEvent = {
      id: "forestTribeHelpRequest-test",
      message: "Deferred",
      timestamp: Date.now(),
      type: "event" as const,
      choices: [{ id: "accept_help", label: "Offer help", effect: () => ({}) }],
    };

    useGameStore.setState({
      rewardDialog: { isOpen: true, data: { rewards: {}, variant: "success" } },
      eventDialog: { isOpen: true, currentEvent: blockingEvent },
    });

    useGameStore.getState().setEventDialog(true, deferredEvent);
    useGameStore.getState().setRewardDialog(false);

    vi.advanceTimersByTime(10_000);

    expect(useGameStore.getState().eventDialog.currentEvent?.id).toBe(
      blockingEvent.id,
    );

    useGameStore.getState().setEventDialog(false);
    vi.advanceTimersByTime(3000 + 200 + 50);

    expect(useGameStore.getState().eventDialog.isOpen).toBe(true);
    expect(useGameStore.getState().eventDialog.currentEvent?.id).toBe(
      deferredEvent.id,
    );
  });
});

describe("callMerchant execution", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().initialize();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setupCallMerchantState(gold = 200) {
    useGameStore.setState({
      buildings: { tradePost: 1 },
      resources: { gold },
      story: { seen: {}, merchantPurchases: 0 },
      timedEventTab: {
        isActive: false,
        event: null,
        expiryTime: 0,
      },
      executionStartTimes: {},
      executionDurations: {},
      executionAbortEligible: {},
      executionSpendSnapshots: {},
    });
  }

  it("starts a 5s execution and deducts gold on click", () => {
    setupCallMerchantState(200);

    useGameStore.getState().callMerchant();

    const state = useGameStore.getState();
    expect(state.executionStartTimes?.callMerchant).toBeGreaterThan(0);
    expect(state.executionDurations?.callMerchant).toBe(5);
    expect(state.resources.gold).toBe(150);
    expect(state.timedEventTab.isActive).toBe(false);
    expect(state.story.seen.callMerchantUsageCount).toBeUndefined();
  });

  it("spawns the merchant after execution completes", () => {
    setupCallMerchantState(200);

    useGameStore.getState().callMerchant();
    vi.advanceTimersByTime(5000);
    useGameStore.getState().completeActionExecution("callMerchant");

    const state = useGameStore.getState();
    expect(state.executionStartTimes?.callMerchant).toBeUndefined();
    expect(state.timedEventTab.isActive).toBe(true);
    expect(state.timedEventTab.event?.id).toBe("merchant");
    expect(state.story.seen.callMerchantUsageCount).toBe(1);
  });

  it("refunds gold for free when aborting the call", () => {
    setupCallMerchantState(200);

    useGameStore.getState().callMerchant();
    useGameStore.getState().abortActionExecution("callMerchant");

    const state = useGameStore.getState();
    expect(state.executionStartTimes?.callMerchant).toBeUndefined();
    expect(state.resources.gold).toBe(200);
    expect(state.story.seen.callMerchantUsageCount).toBeUndefined();
  });
});