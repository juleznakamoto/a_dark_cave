import { describe, it, expect } from "vitest";
import { GameState } from "@shared/schema";
import {
  applyAttackWaveDefeatMadness,
  attackWaveDefeatSeenFlag,
  isAttackWaveDefeatMadnessEligible,
} from "./eventsAttackWaves";
import { POST_COMPLETION_ATTACK_WAVE_ID } from "./attackWaveOrder";

function baseState(): GameState {
  return {
    story: { seen: {}, merchantPurchases: 0 },
    stats: { madnessFromEvents: 0 },
  } as GameState;
}

const defeatResult = {
  story: {
    seen: { bastionDamaged: true },
    merchantPurchases: 0,
  },
  stats: {
    villagerDeathsLifetime: 52,
  },
  _combatSummary: {
    casualties: 2,
    damagedBuildings: ["bastion"],
    woundedFellows: [],
  },
};

describe("applyAttackWaveDefeatMadness", () => {
  it("grants +1 madness on first defeat for a wave", () => {
    const state = baseState();
    const result = applyAttackWaveDefeatMadness(
      state,
      "firstWave",
      defeatResult,
    );

    expect(result.stats?.madnessFromEvents).toBe(1);
    expect(result.story.seen[attackWaveDefeatSeenFlag("firstWave")]).toBe(true);
    expect(result._combatSummary.madnessGain).toBe(1);
  });

  it("does not grant madness on repeat defeat for the same wave", () => {
    const state = {
      ...baseState(),
      story: {
        seen: { [attackWaveDefeatSeenFlag("thirdWave")]: true },
        merchantPurchases: 0,
      },
      stats: { madnessFromEvents: 3 },
    } as GameState;

    const result = applyAttackWaveDefeatMadness(
      state,
      "thirdWave",
      defeatResult,
    );

    expect(result.stats?.villagerDeathsLifetime).toBe(52);
    expect(result.stats?.madnessFromEvents).toBeUndefined();
    expect(result._combatSummary.madnessGain).toBeUndefined();
  });

  it("preserves defeat stats such as villagerDeathsLifetime when granting madness", () => {
    const state = {
      ...baseState(),
      stats: { madnessFromEvents: 0, villagerDeathsLifetime: 50 },
    } as GameState;

    const result = applyAttackWaveDefeatMadness(
      state,
      "firstWave",
      defeatResult,
    );

    expect(result.stats?.villagerDeathsLifetime).toBe(52);
    expect(result.stats?.madnessFromEvents).toBe(1);
  });

  it("does not grant madness for endless post-completion waves", () => {
    const state = baseState();
    const result = applyAttackWaveDefeatMadness(
      state,
      POST_COMPLETION_ATTACK_WAVE_ID,
      defeatResult,
    );

    expect(isAttackWaveDefeatMadnessEligible(POST_COMPLETION_ATTACK_WAVE_ID)).toBe(
      false,
    );
    expect(result.stats?.madnessFromEvents).toBeUndefined();
    expect(result._combatSummary.madnessGain).toBeUndefined();
  });

  it("grants separate madness for each wave's first defeat", () => {
    const state = {
      ...baseState(),
      story: {
        seen: { [attackWaveDefeatSeenFlag("firstWave")]: true },
        merchantPurchases: 0,
      },
      stats: { madnessFromEvents: 1 },
    } as GameState;

    const result = applyAttackWaveDefeatMadness(
      state,
      "secondWave",
      defeatResult,
    );

    expect(result.stats?.madnessFromEvents).toBe(2);
    expect(result.story.seen[attackWaveDefeatSeenFlag("secondWave")]).toBe(true);
  });
});
