import { DEMO_WOODEN_HUT_LIMIT } from "@/game/demoLimit";
import type { GameState } from "@shared/schema";

type CaptureVisibleBuildings = (state: GameState) => string[];

let captureVisibleBuildings: CaptureVisibleBuildings | null = null;

/** Registered from the rules module so this file does not import the rules barrel. */
export function registerDemoBuildingRosterCapture(
  capture: CaptureVisibleBuildings,
): void {
  captureVisibleBuildings = capture;
}

/**
 * Building buttons that were already available before the demo hut cap.
 * The probe uses 7 wooden huts so buttons that appear at 8 never join the list.
 */
export function captureDemoVisibleBuildingIds(state: GameState): string[] {
  const probe: GameState = {
    ...state,
    buildings: {
      ...state.buildings,
      woodenHut: Math.min(
        state.buildings.woodenHut ?? 0,
        DEMO_WOODEN_HUT_LIMIT - 1,
      ),
    },
  };
  return captureVisibleBuildings?.(probe) ?? [];
}
