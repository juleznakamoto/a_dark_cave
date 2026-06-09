import { describe, expect, it, vi } from "vitest";

vi.mock("@/game/state", () => ({
  useGameStore: {
    getState: () => ({}),
    setState: vi.fn(),
  },
}));

import { ATTACK_WAVE_IDS, TOTAL_ATTACK_WAVES } from "./attackWaveOrder";
import {
  attackWaveEvents,
  getPostCompletionWaveParams,
} from "./eventsAttackWaves";

describe("attack waves expansion", () => {
  it("exposes 10 canonical wave ids ending in tenthWave", () => {
    expect(TOTAL_ATTACK_WAVES).toBe(10);
    expect(ATTACK_WAVE_IDS).toHaveLength(10);
    expect(ATTACK_WAVE_IDS[9]).toBe("tenthWave");
  });

  it("registers 10 canonical attack wave game events plus post-completion wave", () => {
    expect(Object.keys(attackWaveEvents)).toHaveLength(11);
    for (const id of ATTACK_WAVE_IDS) {
      expect(attackWaveEvents[id]).toBeDefined();
      expect(attackWaveEvents[id]?.id).toBe(id);
    }
    expect(attackWaveEvents.postCompletionWave).toBeDefined();
  });

  it("scales post-completion waves +50 health, +10 attack, +50 gold per step", () => {
    const wave11 = getPostCompletionWaveParams(11);
    const wave12 = getPostCompletionWaveParams(12);
    const tenth = getPostCompletionWaveParams(10);

    expect(wave11.health.base).toBe(tenth.health.base + 50);
    expect(wave11.attack.options[0]).toBe(tenth.attack.options[0] + 10);
    expect(wave11.goldReward).toBe(tenth.goldReward + 50);

    expect(wave12.health.base).toBe(wave11.health.base + 50);
    expect(wave12.attack.options[0]).toBe(wave11.attack.options[0] + 10);
    expect(wave12.goldReward).toBe(wave11.goldReward + 50);
  });
});
