import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import { GREAT_FEAST_DURATION_MS } from "@shared/shopItems";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import {
  resolveEventChoiceLabel,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
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
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded("en");
  });

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
    expect(feastEvents.feastRecurring.cooldownPercent).toBe(0.4);
    expect(feastEvents.feast1.cooldownPercent).toBe(0.4);
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

  it("replaces levels 4 and 8 with juggler Great Feast offers", () => {
    expect(feastEvents.feast4.i18nKey).toBe("jugglerGreatFeast");
    expect(feastEvents.feast8.i18nKey).toBe("jugglerGreatFeast");
    expect(feastEvents.feast4.message?.(baseState())).toBe("first");
    expect(feastEvents.feast8.message?.(baseState())).toBe("return");
    expect(feastEvents.feast4.i18nVars).toMatchObject({
      foodCost: "1'000",
      goldCost: "100",
    });
    expect(feastEvents.feast8.i18nVars).toMatchObject({
      foodCost: "10'000",
      goldCost: "1'000",
    });
    expect(feastEvents.feast4.choices?.[0]?.id).toBe("makeGreatFeast");
    expect(feastEvents.feast8.choices?.[0]?.id).toBe("makeGreatFeast");

    const firstVars = feastEvents.feast4.i18nVars as Record<string, string>;
    const returnVars = feastEvents.feast8.i18nVars as Record<string, string>;
    expect(resolveEventTitle("jugglerGreatFeast", baseState(), firstVars)).toBe(
      "The Juggler",
    );
    expect(
      resolveEventMessage(
        "jugglerGreatFeast",
        feastEvents.feast4.message,
        baseState(),
        firstVars,
      ),
    ).toContain("plague");
    expect(
      resolveEventMessage(
        "jugglerGreatFeast",
        feastEvents.feast8.message,
        baseState(),
        returnVars,
      ),
    ).toContain("still looking for a new castle");
    expect(
      resolveEventChoiceLabel("jugglerGreatFeast", "makeGreatFeast", firstVars),
    ).toBe("Hold great feast");
  });

  it("accepting the juggler feast starts a Great Feast and advances the ladder", () => {
    const before = Date.now();
    const state = baseState({
      resources: {
        ...(createInitialState() as GameState).resources,
        food: 5_000,
        gold: 250,
      },
      buildings: {
        ...(createInitialState() as GameState).buildings,
        woodenHut: 8,
      },
      feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 3 },
    });

    expect(feastEvents.feast4.condition(state)).toBe(true);

    const effect = feastEvents.feast4.choices![0]!.effect!;
    const result = effect(state);

    expect(result.resources?.food).toBe(4_000);
    expect(result.resources?.gold).toBe(150);
    expect(result.feastState?.lastAcceptedLevel).toBe(4);
    expect(result.feastState?.isActive).toBe(false);
    expect(result.greatFeastState?.isActive).toBe(true);
    expect(result.greatFeastState?.endTime).toBeGreaterThanOrEqual(
      before + GREAT_FEAST_DURATION_MS,
    );
  });

  it("accepting the return juggler feast uses level-8 costs and return copy", () => {
    const state = baseState({
      resources: {
        ...(createInitialState() as GameState).resources,
        food: 20_000,
        gold: 2_000,
      },
      feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 7 },
      story: {
        ...createInitialState().story,
        seen: {
          ...createInitialState().story.seen,
          secondWaveVictory: true,
        },
      },
    });

    expect(feastEvents.feast8.condition(state)).toBe(true);
    expect(feastEvents.feast8.message?.(state)).toBe("return");
    expect(feastEvents.feast8.i18nVars).toMatchObject({
      foodCost: "10'000",
      goldCost: "1'000",
    });

    const effect = feastEvents.feast8.choices![0]!.effect!;
    const result = effect(state);
    expect(result.resources?.food).toBe(10_000);
    expect(result.resources?.gold).toBe(1_000);
    expect(result.feastState?.lastAcceptedLevel).toBe(8);
    expect(result.greatFeastState?.isActive).toBe(true);
  });
});

