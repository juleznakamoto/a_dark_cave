import type { GameState } from "@shared/schema";
import { getTotalPopulationEffects } from "@/game/population";
import { isDemoPlayFrozen } from "@/game/demoLimit";
import { useGameStore } from "@/game/state";
import { saveGame } from "@/game/save";
import { logger } from "@/lib/logger";

/** Estate tab / Sleep button are available once Dark Estate is built. */
export function isEstateUnlocked(state: {
  buildings?: { darkEstate?: number } | null;
}): boolean {
  return (state.buildings?.darkEstate ?? 0) >= 1;
}

/**
 * Sleep button prerequisites: positive wood and food production
 * without temporary bonuses (feast, curse, etc. are inactive during sleep).
 */
export function canActivateSleep(state: GameState): boolean {
  const totalEffects = getTotalPopulationEffects(
    state,
    Object.keys(state.villagers ?? {}),
    { excludeTemporaryBonuses: true },
  );
  return (totalEffects.wood || 0) > 0 && (totalEffects.food || 0) > 0;
}

/** AFK timeout should start Sleep instead of the inactivity dialog. */
export function shouldAutoSleepOnInactivity(state: GameState): boolean {
  return (
    isEstateUnlocked(state) &&
    canActivateSleep(state) &&
    !isDemoPlayFrozen(state)
  );
}

/**
 * Mark a sleep session active in the store without opening the dialog.
 * Callers must gate eligibility (Estate button, AFK, or exit). Returns false
 * when demo play is frozen; true if already sleeping or newly activated.
 */
export function markSleepSessionActive(now = Date.now()): boolean {
  const before = useGameStore.getState();
  if (isDemoPlayFrozen(before)) return false;
  if (before.idleModeDialog?.isOpen || before.idleModeState?.isActive) {
    return true;
  }

  useGameStore.setState({
    idleModeState: {
      isActive: true,
      startTime: now,
      needsDisplay: true,
    },
  });
  return true;
}

/**
 * On tab close / Steam quit: start Sleep when allowed so offline progress
 * accrues. No dialog (the page is going away); the exit flush persists state.
 */
export function tryActivateSleepForExit(): boolean {
  const before = useGameStore.getState();
  if (!shouldAutoSleepOnInactivity(before)) return false;
  if (before.idleModeDialog?.isOpen || before.idleModeState?.isActive) {
    return false;
  }
  return markSleepSessionActive();
}

/**
 * Start Sleep the same way the Estate Sleep button does:
 * persist session first, then open the dialog.
 */
export async function beginSleepMode(): Promise<boolean> {
  if (!markSleepSessionActive()) return false;

  try {
    await saveGame(useGameStore.getState(), false);
  } catch (error) {
    logger.error("[SLEEP] Failed to save before opening sleep dialog:", error);
  }

  useGameStore.getState().setIdleModeDialog(true);
  return useGameStore.getState().idleModeDialog.isOpen === true;
}
