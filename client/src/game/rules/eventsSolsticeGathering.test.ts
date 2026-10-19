import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  getSolsticeDurationMs,
  solsticeGatheringEvent,
} from "./eventsSolsticeGathering";

function hostState(btp: number): GameState {
  const initial = createInitialState() as GameState;
  return {
    ...initial,
    BTP: btp,
    resources: { ...initial.resources, wood: 500, food: 500 },
    solsticeState: {
      isActive: false,
      endTime: 0,
      tier: 1,
      activationsCount: 0,
    },
  };
}

describe("solstice gathering duration", () => {
  it("lasts 15 minutes, or 20 minutes on Steam", () => {
    expect(getSolsticeDurationMs(0)).toBe(15 * 60 * 1000);
    expect(getSolsticeDurationMs(1)).toBe(20 * 60 * 1000);

    const web = solsticeGatheringEvent.choices![0]!.effect!(hostState(0));
    const steam = solsticeGatheringEvent.choices![0]!.effect!(hostState(1));
    const now = Date.now();

    expect(web.solsticeState!.endTime).toBeGreaterThan(now + 15 * 60 * 1000 - 1000);
    expect(web.solsticeState!.endTime).toBeLessThan(now + 15 * 60 * 1000 + 1000);
    expect(steam.solsticeState!.endTime).toBeGreaterThan(now + 20 * 60 * 1000 - 1000);
    expect(steam.solsticeState!.endTime).toBeLessThan(now + 20 * 60 * 1000 + 1000);
  });
});
