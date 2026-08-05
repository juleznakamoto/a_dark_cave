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
  FINAL_ATTACK_WAVE_ID,
  POST_COMPLETION_ATTACK_WAVE_ID,
  TOTAL_ATTACK_WAVES,
} from "./attackWaveOrder";
import {
  attackWaveEvents,
  getAttackWaveGoldReward,
  getPostCompletionWaveParams,
  isPostCompletionAttackWavesActive,
} from "./eventsAttackWaves";
import {
  canProvokeAttackWave,
  getProvokeAttackWaveFoodCost,
} from "./bastionActions";

describe("attack waves expansion", () => {
  it("exposes 12 canonical wave ids ending in secondBossWave", () => {
    expect(TOTAL_ATTACK_WAVES).toBe(12);
    expect(ATTACK_WAVE_IDS).toHaveLength(12);
    expect(ATTACK_WAVE_IDS[5]).toBe("firstBossWave");
    expect(ATTACK_WAVE_IDS[11]).toBe("secondBossWave");
    expect(FINAL_ATTACK_WAVE_ID).toBe("secondBossWave");
  });

  it("registers 12 canonical attack wave game events plus post-completion wave", () => {
    expect(Object.keys(attackWaveEvents)).toHaveLength(13);
    for (const id of ATTACK_WAVE_IDS) {
      expect(attackWaveEvents[id]).toBeDefined();
      expect(attackWaveEvents[id]?.id).toBe(id);
    }
    expect(attackWaveEvents.postCompletionWave).toBeDefined();
  });

  it("unlocks sixth wave after first boss victory", () => {
    const sixth = attackWaveEvents.sixthWave!;
    const noBoss = {
      story: { seen: { fifthWaveVictory: true }, merchantPurchases: 0 },
      attackWaveTimers: {
        sixthWave: {
          startTime: Date.now(),
          duration: 1000,
          defeated: false,
          provoked: true,
          elapsedTime: 1000,
        },
      },
    } as GameState;
    const withBoss = {
      story: {
        seen: { firstBossWaveVictory: true },
        merchantPurchases: 0,
      },
      attackWaveTimers: {
        sixthWave: {
          startTime: Date.now(),
          duration: 1000,
          defeated: false,
          provoked: true,
          elapsedTime: 1000,
        },
      },
    } as GameState;
    expect(sixth.condition!(noBoss)).toBe(false);
    expect(sixth.condition!(withBoss)).toBe(true);
  });

  it("exposes claimable gold rewards for each chart wave", () => {
    expect(getAttackWaveGoldReward("firstWave")).toBe(50);
    expect(getAttackWaveGoldReward("firstBossWave")).toBe(300);
    expect(getAttackWaveGoldReward("tenthWave")).toBe(500);
    expect(getAttackWaveGoldReward("secondBossWave")).toBe(500);
  });

  it("scales post-completion waves from second boss +50 health, +10 attack, +50 gold", () => {
    const wave13 = getPostCompletionWaveParams(13);
    const wave14 = getPostCompletionWaveParams(14);
    const chartFinal = getPostCompletionWaveParams(12);

    expect(wave13.health.base).toBe(chartFinal.health.base + 50);
    expect(wave13.attack.options[0]).toBe(chartFinal.attack.options[0] + 10);
    expect(wave13.goldReward).toBe(chartFinal.goldReward + 50);

    expect(wave14.health.base).toBe(wave13.health.base + 50);
    expect(wave14.attack.options[0]).toBe(wave13.attack.options[0] + 10);
    expect(wave14.goldReward).toBe(wave13.goldReward + 50);
  });

  it("builds post-completion combat data for wave 14", async () => {
    await i18n.changeLanguage("en");
    const state = { postCompletionAttackWaveCount: 1 } as GameState;
    const result = attackWaveEvents.postCompletionWave.effect!(state);

    expect(result._combatData?.enemy?.waveNumber).toBe(14);
    expect(result._combatData?.enemy?.name).toBe("Pale Creatures");
    // Title/message come from i18n at dialog open; assert shape is wired.
    expect(typeof result._combatData?.eventTitle).toBe("string");
    expect(typeof result._combatData?.eventMessage).toBe("string");
  });

  it("charges 5000 food to provoke post-completion waves", () => {
    const state = {
      events: { cube15a: true },
      story: { seen: { secondBossWaveVictory: true }, merchantPurchases: 0 },
      buildings: { bastion: 1 },
      weapons: {},
      postCompletionAttackWaveCount: 0,
      attackWaveTimers: {
        [POST_COMPLETION_ATTACK_WAVE_ID]: {
          startTime: Date.now(),
          duration: 60 * 60 * 1000,
          defeated: false,
          provoked: false,
          elapsedTime: 0,
        },
      },
    } as GameState;

    expect(getProvokeAttackWaveFoodCost(state)).toBe(5000);
  });

  it("allows provoking post-completion waves even when elapsed equals duration", () => {
    const state = {
      events: { cube15a: true },
      story: { seen: { secondBossWaveVictory: true }, merchantPurchases: 0 },
      buildings: { bastion: 1 },
      weapons: {},
      postCompletionAttackWaveCount: 0,
      attackWaveTimers: {
        [POST_COMPLETION_ATTACK_WAVE_ID]: {
          startTime: Date.now(),
          duration: 60 * 60 * 1000,
          defeated: false,
          provoked: false,
          elapsedTime: 60 * 60 * 1000,
        },
      },
    } as GameState;

    expect(isPostCompletionAttackWavesActive(state)).toBe(true);
    expect(canProvokeAttackWave(state)).toBe(true);
  });

  it("post-completion waves only trigger when provoked", () => {
    const baseTimer = {
      startTime: Date.now(),
      duration: 60 * 60 * 1000,
      defeated: false,
      provoked: false,
      elapsedTime: 60 * 60 * 1000,
    };
    const state = {
      events: { cube15a: true },
      story: { seen: { secondBossWaveVictory: true }, merchantPurchases: 0 },
      postCompletionAttackWaveCount: 0,
      attackWaveTimers: {
        [POST_COMPLETION_ATTACK_WAVE_ID]: baseTimer,
      },
    } as GameState;

    const condition = attackWaveEvents.postCompletionWave.condition!;
    expect(condition(state)).toBe(false);

    expect(
      condition({
        ...state,
        attackWaveTimers: {
          [POST_COMPLETION_ATTACK_WAVE_ID]: { ...baseTimer, provoked: true },
        },
      } as GameState),
    ).toBe(true);
  });

  it("exposes i18nVars with waveNumber for log and dialog resolution", () => {
    const state = { postCompletionAttackWaveCount: 1 } as GameState;
    const i18nVars = attackWaveEvents.postCompletionWave.i18nVars;

    expect(typeof i18nVars).toBe("function");
    expect((i18nVars as (s: GameState) => { waveNumber: number })(state)).toEqual({
      waveNumber: 14,
    });
  });

  it("boss wave combat data includes heal/stun and victory madness", () => {
    const state = {
      story: { seen: { fifthWaveVictory: true }, merchantPurchases: 0 },
      stats: { madnessFromEvents: 5 },
      resources: { gold: 0 },
      attackWaveTimers: {
        firstBossWave: {
          startTime: Date.now(),
          duration: 1000,
          defeated: false,
          provoked: true,
          elapsedTime: 0,
        },
      },
    } as unknown as GameState;

    const result = attackWaveEvents.firstBossWave.effect!(state);
    const enemy = result._combatData?.enemy;
    expect(enemy?.isBoss).toBe(true);
    expect(enemy?.name).toBe("Pale Beasts");
    expect(enemy?.healChancePercent).toBe(15);
    expect(enemy?.stunChancePercent).toBe(10);

    const victory = result._combatData?.onVictory?.() as {
      stats?: { madnessFromEvents?: number };
      _combatSummary?: { madnessGain?: number };
    };
    expect(victory.stats?.madnessFromEvents).toBe(3);
    expect(victory._combatSummary?.madnessGain).toBe(-2);
  });
});
