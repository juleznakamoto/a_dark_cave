import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  JUGGLER_GREAT_FEAST_DURATION_MS,
  JUGGLER_GREAT_FEAST_PRODUCTION_MULTIPLIER,
  JUGGLER_GREAT_FEAST_STRANGER_APPROACH_BONUS,
} from "@shared/shopItems";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import {
  getEventCatalogId,
  resolveEventChoiceLabel,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
import { feastEvents } from "./eventsFeast";

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isSteamDesktopEditionActive: vi.fn(actual.isSteamDesktopEditionActive),
  };
});

import { isSteamDesktopEditionActive } from "@/lib/edition";

function baseState(overrides: Partial<GameState> = {}): GameState {
  const initial = createInitialState() as GameState;
  return {
    ...initial,
    flags: { ...initial.flags, forestUnlocked: true },
    feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 0 },
    greatFeastState: {
      isActive: false,
      endTime: 0,
      durationMs: 30 * 60 * 1000,
      productionMultiplier: 5,
      strangerApproachBonus: 0.25,
    },
    ...overrides,
  };
}

function firstChoice(eventId: "feast4" | "feast8") {
  const choices = feastEvents[eventId].choices;
  const list = typeof choices === "function" ? choices(baseState()) : choices;
  return list![0]!;
}

describe("feast ladder", () => {
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded("en");
    vi.mocked(isSteamDesktopEditionActive).mockReturnValue(false);
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

  it("uses a normal Village Feast on web for levels 4 and 8", () => {
    expect(getEventCatalogId(feastEvents.feast4)).toBe("feast");
    expect(getEventCatalogId(feastEvents.feast8)).toBe("feast");
    expect(firstChoice("feast4").id).toBe("makeFeast");
    expect(firstChoice("feast8").id).toBe("makeFeast");

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
    const result = firstChoice("feast4").effect!(state);
    expect(result.resources?.food).toBe(4_000);
    expect(result.resources?.gold).toBe(250);
    expect(result.feastState?.isActive).toBe(true);
    expect(result.greatFeastState).toBeUndefined();
  });

  it("uses the juggler Great Feast on Steam for levels 4 and 8", async () => {
    vi.mocked(isSteamDesktopEditionActive).mockReturnValue(true);

    expect(getEventCatalogId(feastEvents.feast4)).toBe("jugglerGreatFeast");
    expect(getEventCatalogId(feastEvents.feast8)).toBe("jugglerGreatFeast");
    expect(firstChoice("feast4").id).toBe("makeGreatFeast");
    expect(feastEvents.feast4.message?.(baseState())).toBe("first");
    expect(feastEvents.feast8.message?.(baseState())).toBe("return");

    const firstVars = {
      foodCost: "1'000",
      goldCost: "100",
    };
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
      resolveEventChoiceLabel("jugglerGreatFeast", "makeGreatFeast", firstVars),
    ).toBe("Hold great feast");

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
    const result = firstChoice("feast4").effect!(state);
    expect(result.resources?.food).toBe(4_000);
    expect(result.resources?.gold).toBe(150);
    expect(result.feastState?.lastAcceptedLevel).toBe(4);
    expect(result.feastState?.isActive).toBe(false);
    expect(result.greatFeastState?.isActive).toBe(true);
    expect(result.greatFeastState?.productionMultiplier).toBe(
      JUGGLER_GREAT_FEAST_PRODUCTION_MULTIPLIER,
    );
    expect(result.greatFeastState?.strangerApproachBonus).toBe(
      JUGGLER_GREAT_FEAST_STRANGER_APPROACH_BONUS,
    );
    expect(result.greatFeastState?.durationMs).toBe(
      JUGGLER_GREAT_FEAST_DURATION_MS,
    );
    expect(result.greatFeastState?.endTime).toBeGreaterThanOrEqual(
      before + JUGGLER_GREAT_FEAST_DURATION_MS,
    );
  });

  it("accepting the return juggler feast uses level-8 costs on Steam", () => {
    vi.mocked(isSteamDesktopEditionActive).mockReturnValue(true);

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
    const result = firstChoice("feast8").effect!(state);
    expect(result.resources?.food).toBe(10_000);
    expect(result.resources?.gold).toBe(1_000);
    expect(result.feastState?.lastAcceptedLevel).toBe(8);
    expect(result.greatFeastState?.productionMultiplier).toBe(3);
    expect(result.greatFeastState?.strangerApproachBonus).toBe(0.15);
  });
});
