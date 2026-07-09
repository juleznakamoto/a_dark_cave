import { useGameStore } from "@/game/state";
import { isGalaxyEdition, isSteamBuild } from "@/lib/edition";

/** Reactive offline-demo edition flag for React components (Steam, Galaxy, dev Steam Mode). */
export function useSteamEditionActive(): boolean {
  const devSteamMode = useGameStore((s) => s.devSteamMode);
  return (
    isSteamBuild ||
    isGalaxyEdition() ||
    (import.meta.env.DEV && devSteamMode)
  );
}
