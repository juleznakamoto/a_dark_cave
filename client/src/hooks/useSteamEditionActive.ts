import { useGameStore } from "@/game/state";
import {
  isGalaxyEdition,
  isSteamBuild,
  isSteamDemoBuild,
  type DevGameMode,
} from "@/lib/edition";

function isDevSteamMode(devGameMode: DevGameMode): boolean {
  return import.meta.env.DEV && !isSteamBuild && devGameMode !== "normal";
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

/** Reactive Galaxy / Steam demo / DEV Steam Demo — stone-hut cap + demo-end dialog. */
export function useDemoEditionActive(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return (
    isGalaxyEdition() ||
    isSteamDemoBuild ||
    (import.meta.env.DEV && !isSteamBuild && devGameMode === "steamDemo")
  );
}

/** Reactive Steam demo only (build or DEV Game Mode = Steam Demo) — footer progress bar. */
export function useSteamDemoActive(): boolean {
  const devGameMode = useGameStore((s) => s.devGameMode);
  return (
    isSteamDemoBuild ||
    (import.meta.env.DEV && !isSteamBuild && devGameMode === "steamDemo")
  );
}
