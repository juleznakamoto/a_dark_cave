import { GAME_PARTICLE_LAYER_ID } from "@/components/game/gameChrome";

/** Portal target for in-game click particles (above side panel, tabs, and log). */
export function getGameParticlePortalTarget(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(GAME_PARTICLE_LAYER_ID);
}

/** Resolve portal mount node at render time (game layer → body). */
export function resolveParticlePortalTarget(options?: {
  /** When set (including `null`), skips game-layer lookup. */
  explicitTarget?: HTMLElement | null;
  preferGameLayer?: boolean;
}): HTMLElement | null {
  if (typeof document === "undefined") return null;

  if (options?.explicitTarget !== undefined) {
    return options.explicitTarget ?? document.body;
  }

  if (options?.preferGameLayer) {
    return getGameParticlePortalTarget() ?? document.body;
  }

  return document.body;
}
