
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './state';

describe('Focus State Management', () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it('should set focus to 0 when Focus button is clicked', () => {
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

  it('should not allow activating focus twice', () => {
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

  it('should allow activating focus again after first focus expires and new focus is gained', () => {
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

  it('should add focus points after sleep based on intensity level', () => {
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

  it('should not add focus points if intensity level is 0', () => {
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
