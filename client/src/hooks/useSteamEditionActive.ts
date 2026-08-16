import { useGameStore } from "@/game/state";
import {
  isCrazyGamesEdition,
  isGalaxyEdition,
  isSteamBuild,
  isSteamDemoRuntime,
  shouldHideSteamStoreLink,
  type DevGameMode,
} from "@/lib/edition";

function isDevSteamMode(devGameMode: DevGameMode): boolean {
  return import.meta.env.DEV && !isSteamBuild && devGameMode !== "normal";
}

function isDevCappedDemoMode(devGameMode: DevGameMode): boolean {
  return (
    import.meta.env.DEV &&
    !isSteamBuild &&
    (devGameMode === "steamDemo" || devGameMode === "crazyGamesDemo")
  );
}

/** Reactive offline-demo edition flag for React components (Steam, Galaxy, CrazyGames, DEV Game Mode). */
export function useSteamEditionActive(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return (
    isSteamBuild ||
    isGalaxyEdition() ||
    isCrazyGamesEdition() ||
    isDevSteamMode(devGameMode)
  );
}

/**
 * Steam desktop or CrazyGames (Steam-demo chrome), or DEV Game Mode simulating
 * those. Excludes Galaxy.
 */
export function useSteamDesktopEditionActive(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return (
    isSteamBuild ||
    isCrazyGamesEdition() ||
    isDevSteamMode(devGameMode)
  );
}

/** Reactive {@link shouldHideSteamStoreLink} for game-path UI (store already loaded). */
export function useHideSteamStoreLink(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return shouldHideSteamStoreLink(devGameMode);
}

/** Reactive Galaxy / CrazyGames / Steam demo / DEV capped demo — wooden-hut cap + demo-end dialog. */
export function useDemoEditionActive(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return (
    isGalaxyEdition() ||
    isCrazyGamesEdition() ||
    isSteamDemoRuntime() ||
    isDevCappedDemoMode(devGameMode)
  );
}

/** Steam demo / CrazyGames chrome (build, path, or DEV Game Mode) — footer progress bar. */
export function useSteamDemoActive(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return (
    isSteamDemoRuntime() ||
    isCrazyGamesEdition() ||
    isDevCappedDemoMode(devGameMode)
  );
}
