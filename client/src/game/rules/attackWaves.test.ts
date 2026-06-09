import { describe, expect, it, vi, beforeEach } from "vitest";
import i18n from "@/i18n/index";
import { GameState } from "@shared/schema";

vi.mock("@/game/state", () => ({
  useGameStore: {
    getState: () => ({}),
    setState: vi.fn(),
  },
  isModalDialogOpen: () => false,
}));

import {
  ATTACK_WAVE_IDS,
  POST_COMPLETION_ATTACK_WAVE_ID,
  TOTAL_ATTACK_WAVES,
} from "./attackWaveOrder";
import {
  attackWaveEvents,
  getPostCompletionWaveParams,
  isAttackWaveTimerUserPaused,
  togglePostCompletionAttackWaveTimerPause,
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

  it("includes title and message for wave 12 in post-completion _combatData", async () => {
    await i18n.changeLanguage("en");
    const state = { postCompletionAttackWaveCount: 1 } as GameState;
    const result = attackWaveEvents.postCompletionWave.effect!(state);

    expect(result._combatData?.eventTitle).toBe("Wave 12");
    expect(result._combatData?.eventMessage).toContain("mindless pale creatures");
  });

  it("toggles pause on the post-completion attack wave timer", () => {
    const originalStartTime = 1_700_000_000_000;
    const baseState = {
      events: { cube15a: true },
      story: { seen: { tenthWaveVictory: true }, merchantPurchases: 0 },
      postCompletionAttackWaveCount: 0,
      attackWaveTimers: {
        [POST_COMPLETION_ATTACK_WAVE_ID]: {
          startTime: originalStartTime,
          duration: 60 * 60 * 1000,
          defeated: false,
          provoked: false,
          elapsedTime: 1000,
        },
      },
    } as GameState;

    const paused = togglePostCompletionAttackWaveTimerPause(baseState);
    const pausedTimer =
      paused?.attackWaveTimers?.[POST_COMPLETION_ATTACK_WAVE_ID];
    expect(pausedTimer && isAttackWaveTimerUserPaused(pausedTimer)).toBe(true);
    expect(pausedTimer?.startTime).toBe(originalStartTime);
    expect(pausedTimer?.elapsedTime).toBe(1000);

    const resumed = togglePostCompletionAttackWaveTimerPause({
      ...baseState,
      ...paused,
    } as GameState);
    const resumedTimer =
      resumed?.attackWaveTimers?.[POST_COMPLETION_ATTACK_WAVE_ID];
    expect(resumedTimer?.pausedAt).toBeUndefined();
    expect(resumedTimer?.startTime).toBe(originalStartTime);
    expect(resumedTimer?.elapsedTime).toBe(1000);
  });

  it("exposes i18nVars with waveNumber for log and dialog resolution", () => {
    const state = { postCompletionAttackWaveCount: 1 } as GameState;
    const i18nVars = attackWaveEvents.postCompletionWave.i18nVars;

    expect(typeof i18nVars).toBe("function");
    expect((i18nVars as (s: GameState) => { waveNumber: number })(state)).toEqual({
      waveNumber: 12,
    });
  });
});
