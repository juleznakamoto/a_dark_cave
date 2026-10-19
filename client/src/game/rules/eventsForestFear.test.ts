import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import { forestFearEvent, getForestFearDurationMs } from "./eventsForestFear";

function fearState(btp: number): GameState {
  const initial = createInitialState() as GameState;
  return {
    ...initial,
    BTP: btp,
    villagers: { ...initial.villagers, free: 1 },
  };
}

describe("forest fear duration", () => {
  it("lasts 20 minutes, or 15 minutes on Steam", () => {
    expect(getForestFearDurationMs(0)).toBe(20 * 60 * 1000);
    expect(getForestFearDurationMs(1)).toBe(15 * 60 * 1000);

    const web = forestFearEvent.choices![0]!.effect!(fearState(0));
    const steam = forestFearEvent.choices![0]!.effect!(fearState(1));
    const now = Date.now();

    expect(web.forestFearState!.endTime).toBeGreaterThan(now + 20 * 60 * 1000 - 1000);
    expect(web.forestFearState!.endTime).toBeLessThan(now + 20 * 60 * 1000 + 1000);
    expect(steam.forestFearState!.endTime).toBeGreaterThan(now + 15 * 60 * 1000 - 1000);
    expect(steam.forestFearState!.endTime).toBeLessThan(now + 15 * 60 * 1000 + 1000);
  });
});
