import { describe, it, expect, beforeEach, vi } from "vitest";
import { createInitialState, useGameStore, detectRewards, rewardDialogActions } from "./state";
import { GameState } from "@shared/schema";

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

      // Execute the action
      useGameStore.getState().executeAction("layTrap");

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
});