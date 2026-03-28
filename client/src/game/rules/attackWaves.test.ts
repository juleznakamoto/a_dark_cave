import { describe, expect, it, vi } from "vitest";

vi.mock("@/game/state", () => ({
  useGameStore: {
    getState: () => ({}),
    setState: vi.fn(),
  },
}));

import { ATTACK_WAVE_IDS, TOTAL_ATTACK_WAVES } from "./attackWaveOrder";
import { attackWaveEvents } from "./eventsAttackWaves";

describe("attack waves expansion", () => {
  it("exposes 10 canonical wave ids ending in tenthWave", () => {
    expect(TOTAL_ATTACK_WAVES).toBe(10);
    expect(ATTACK_WAVE_IDS).toHaveLength(10);
    expect(ATTACK_WAVE_IDS[9]).toBe("tenthWave");
  });

  it("registers 10 attack wave game events", () => {
    expect(Object.keys(attackWaveEvents)).toHaveLength(10);
    for (const id of ATTACK_WAVE_IDS) {
      expect(attackWaveEvents[id]).toBeDefined();
      expect(attackWaveEvents[id]?.id).toBe(id);
    }
  });
});
