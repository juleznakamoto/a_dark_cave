import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import { feastEvents } from "./eventsFeast";

function baseState(overrides: Partial<GameState> = {}): GameState {
  const initial = createInitialState() as GameState;
  return {
    ...initial,
    flags: { ...initial.flags, forestUnlocked: true },
    feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 0 },
    greatFeastState: { isActive: false, endTime: 0 },
    ...overrides,
  };
}

describe("feast ladder", () => {
  it("keeps levels 1–8 unlocks and updates 9–11 costs/gates", () => {
    expect(feastEvents.feast9).toBeDefined();
    expect(feastEvents.feast10).toBeDefined();
    expect(feastEvents.feast11).toBeDefined();
    expect(feastEvents.feastRecurring).toBeDefined();

    const at8 = baseState({
      feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 8 },
      story: {
        ...createInitialState().story,
        seen: {
          ...createInitialState().story.seen,
          fourthWaveVictory: true,
        },
      },
    });
    expect(feastEvents.feast9.condition(at8)).toBe(true);
    expect(feastEvents.feast9.i18nVars).toMatchObject({ foodCost: "12'500" });

    const at9 = {
      ...at8,
      feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 9 },
      story: {
        ...at8.story,
        seen: { ...at8.story.seen, sixthWaveVictory: true },
      },
    };
    expect(feastEvents.feast10.condition(at9)).toBe(true);

    const at10 = {
      ...at9,
      feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 10 },
      story: {
        ...at9.story,
        seen: { ...at9.story.seen, eighthWaveVictory: true },
      },
    };
    expect(feastEvents.feast11.condition(at10)).toBe(true);
  });

  it("offers recurring feast only after level 11 is accepted", () => {
    const before = baseState({
      feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 10 },
    });
    expect(feastEvents.feastRecurring.condition(before)).toBe(false);

    const after = baseState({
      feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 11 },
    });
    expect(feastEvents.feastRecurring.condition(after)).toBe(true);
    expect(feastEvents.feastRecurring.timeProbability).toBe(90);
  });

  it("accepting recurring feast does not block future offers", () => {
    const state = baseState({
      resources: {
        ...(createInitialState() as GameState).resources,
        food: 50_000,
      },
      feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 11 },
    });

    const effect = feastEvents.feastRecurring.choices![0]!.effect!;
    const result = effect(state);
    expect(result.feastState?.lastAcceptedLevel).toBe(11);
    expect(result.feastState?.isActive).toBe(true);
    expect(result.resources?.food).toBe(30_000);

    const afterExpire = baseState({
      feastState: {
        isActive: false,
        endTime: 0,
        lastAcceptedLevel: result.feastState!.lastAcceptedLevel,
      },
    });
    expect(feastEvents.feastRecurring.condition(afterExpire)).toBe(true);
  });
});
