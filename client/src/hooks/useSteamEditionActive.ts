import { useGameStore } from "@/game/state";
import { isSteamBuild } from "@/lib/edition";

/** Reactive Steam edition flag for React components (includes dev Steam Mode toggle). */
export function useSteamEditionActive(): boolean {
  const devSteamMode = useGameStore((s) => s.devSteamMode);
  return isSteamBuild || (import.meta.env.DEV && devSteamMode);
}
