# Memory Leak Analysis Report

## 1. Introduction

This report details the investigation and resolution of critical memory leaks in the game that caused severe performance degradation over time, leading to the game freezing, particularly after the Bastion was unlocked.

## 2. Problem Description

The game's memory usage would continuously increase during gameplay. The issue was present even when the main game loop was disabled, and it became critically severe after the "Bastion" area was unlocked, causing the game to freeze within 2-3 minutes.

## 3. Investigation and Findings

A multi-stage investigation was conducted, which uncovered two distinct memory leaks.

### 3.1. Initial Finding: `LogPanel` Component

The first investigation focused on frequently updated components. It was discovered that the `LogPanel` component, which displays game log messages, was using `setTimeout` within a `useEffect` hook to create visual effects for new entries. However, it was missing a cleanup function. This caused an accumulation of timers every time the log updated, leading to a memory leak.

**While this was a valid leak, it was not the primary cause of the severe freezing.**

### 3.2. Second Finding: `useMobileButtonTooltip` Hook (The Root Cause)

The user provided a critical clue: the freezing began immediately after the **Bastion** was unlocked. This led to a focused investigation of the `BastionPanel` and its related components and hooks.

The root cause was found in the `useMobileButtonTooltip` hook, located in `client/src/hooks/useMobileTooltip.ts`. This hook is used by the buttons in the `BastionPanel` to handle tooltips on mobile devices.

The hook sets a `setTimeout` to detect a long press for showing a tooltip. The leak occurred because the functions `handleMouseDown` and `handleTouchStart` would set a new timer and assign it to a `ref`, but they would not clear any *previous* timer that might have been active. If a user quickly clicked or tapped multiple times, or if the component re-rendered during these actions, old timers would be orphaned, never being cleared.

Because the `BastionPanel` re-renders frequently due to game state changes, this created a rapid and massive accumulation of orphaned timers, consuming memory at a rate that would freeze the browser within minutes.

## 4. Solution

Both memory leaks were resolved.

### 4.1. `LogPanel` Fix

A cleanup function was added to the `useEffect` hook in the `LogPanel` component. This function ensures that all active timers for visual effects are cleared whenever the component re-renders or unmounts.

### 4.2. `useMobileButtonTooltip` Fix (The Critical Fix)

The `handleMouseDown` and `handleTouchStart` functions in the `useMobileButtonTooltip` hook were modified. Before setting a new `setTimeout`, the code now explicitly checks if a timer already exists in `pressTimerRef.current` and clears it. This ensures that no timer is ever orphaned.

The following code snippet shows the corrected implementation:

```typescript
const handleMouseDown = (id: string, disabled: boolean, isCoolingDown: boolean, e: React.MouseEvent) => {
  if (!isMobile || isCoolingDown) return;

  // Clear any existing timer before starting a new one
  if (pressTimerRef.current) {
    clearTimeout(pressTimerRef.current);
  }

  // ... rest of the function
};

const handleTouchStart = (id: string, disabled: boolean, isCoolingDown: boolean, e: React.TouchEvent) => {
  if (!isMobile || isCoolingDown) return;

  // Clear any existing timer before starting a new one
  if (pressTimerRef.current) {
    clearTimeout(pressTimerRef.current);
  }

  // ... rest of the function
};
```

## 5. Conclusion

The critical freezing issue was caused by a severe memory leak in the `useMobileButtonTooltip` hook, which was triggered by interacting with the `BastionPanel`. A secondary, less severe leak was also identified and fixed in the `LogPanel`. With both of these issues resolved, the game's performance is now stable, and the freezing issue has been eliminated.
