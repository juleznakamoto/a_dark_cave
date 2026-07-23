import { useGameStore } from "@/game/state";
import {
  isGalaxyEdition,
  isSteamBuild,
  isSteamDemoRuntime,
  type DevGameMode,
} from "@/lib/edition";

function isDevSteamMode(devGameMode: DevGameMode): boolean {
  return import.meta.env.DEV && !isSteamBuild && devGameMode !== "normal";
}

function isDevSteamDemoMode(devGameMode: DevGameMode): boolean {
  return import.meta.env.DEV && !isSteamBuild && devGameMode === "steamDemo";
}

/** Reactive offline-demo edition flag for React components (Steam, Galaxy, DEV Game Mode). */
export function useSteamEditionActive(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return (
    isSteamBuild ||
    isGalaxyEdition() ||
    isDevSteamMode(devGameMode)
  );
}

/**
 * Steam desktop only (full / playtest / demo build, or DEV Game Mode simulating those).
 * Excludes Galaxy — used to hide Steam store / wishlist chrome when already on Steam.
 */
export function useSteamDesktopEditionActive(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return isSteamBuild || isDevSteamMode(devGameMode);
}

/** Reactive Galaxy / Steam demo / DEV Steam Demo — wooden-hut cap + demo-end dialog. */
export function useDemoEditionActive(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return (
    isGalaxyEdition() ||
    isSteamDemoRuntime() ||
    isDevSteamDemoMode(devGameMode)
  );
}

/** Reactive Steam demo only (build/shell or DEV Game Mode = Steam Demo) — footer progress bar. */
export function useSteamDemoActive(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return isSteamDemoRuntime() || isDevSteamDemoMode(devGameMode);
}
