import { useGameStore } from "@/game/state";
import { isGalaxyEdition } from "@/lib/edition";

const GALAXY_DEMO_STORAGE_KEY = "adc-galaxy-demo-play-ms";

/** Total playable time on the Galaxy demo (1.5 hours). */
export const GALAXY_PLAY_TIME_LIMIT_MS = 90 * 60 * 1000;

let galaxyBankedPlayTimeMs = 0;
let galaxySessionStartPlayTimeMs = 0;

function loadBankedPlayTimeFromStorage(): number {
  try {
    const raw = localStorage.getItem(GALAXY_DEMO_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

/** Call after a galaxy save is loaded or a new game session starts. */
export function initGalaxyDemoSession(loadedPlayTimeMs: number): void {
  if (!isGalaxyEdition()) return;
  galaxyBankedPlayTimeMs = loadBankedPlayTimeFromStorage();
  galaxySessionStartPlayTimeMs = Math.floor(loadedPlayTimeMs);
}

/** Persist cumulative demo play time (survives save restarts and tab closes). */
export function persistGalaxyDemoProgress(currentPlayTimeMs: number): void {
  if (!isGalaxyEdition()) return;
  const total = getGalaxyTotalPlayTimeMs(currentPlayTimeMs);
  galaxyBankedPlayTimeMs = total;
  galaxySessionStartPlayTimeMs = Math.floor(currentPlayTimeMs);
  try {
    localStorage.setItem(GALAXY_DEMO_STORAGE_KEY, String(total));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getGalaxyTotalPlayTimeMs(currentPlayTimeMs: number): number {
  if (!isGalaxyEdition()) return 0;
  const segment = Math.max(
    0,
    Math.floor(currentPlayTimeMs) - galaxySessionStartPlayTimeMs,
  );
  return galaxyBankedPlayTimeMs + segment;
}

export function isGalaxyPlayTimeLimitReached(currentPlayTimeMs: number): boolean {
  return (
    isGalaxyEdition() &&
    getGalaxyTotalPlayTimeMs(currentPlayTimeMs) >= GALAXY_PLAY_TIME_LIMIT_MS
  );
}

export function processGalaxyPlayTimeLimit(): void {
  if (!isGalaxyEdition()) return;
  const state = useGameStore.getState();
  if (state.galaxyTimeUpDialogOpen) return;

  persistGalaxyDemoProgress(state.playTime);

  if (isGalaxyPlayTimeLimitReached(state.playTime)) {
    useGameStore.setState({ galaxyTimeUpDialogOpen: true });
  }
}

/** Test helper — resets in-memory and localStorage demo counters. */
export function resetGalaxyDemoStateForTests(): void {
  galaxyBankedPlayTimeMs = 0;
  galaxySessionStartPlayTimeMs = 0;
  try {
    localStorage.removeItem(GALAXY_DEMO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
