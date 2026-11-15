import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/store/createInitialState";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import {
  resolveEventChoiceLabel,
  resolveEventChoiceReward,
  resolveEventLogMessage,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
import type { EventChoice } from "./eventTypes";
import {
  WATCHING_CHILDREN_GOLD,
  WATCHING_CHILDREN_MADNESS_GAIN,
  WATCHING_CHILDREN_MIN_MADNESS,
  WATCHING_CHILDREN_SILVER_LOSS,
  WATCHING_CHILDREN_SILVER_REQUIRED,
  madnessEvents,
} from "./eventsMadness";

const event = madnessEvents.watchingChildren;

function state(patch: Partial<GameState> = {}): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...patch,
    resources: { ...base.resources, ...patch.resources },
    stats: { ...base.stats, ...patch.stats },
    events: { ...base.events, ...patch.events },
  };
}

function ready(patch: Partial<GameState> = {}): GameState {
  return state({
    ...patch,
    resources: {
      silver: WATCHING_CHILDREN_SILVER_REQUIRED + 1,
      gold: 10,
      ...patch.resources,
    },
    stats: {
      madnessFromEvents: WATCHING_CHILDREN_MIN_MADNESS,
      ...patch.stats,
    },
    events: patch.events,
    cruelMode: patch.cruelMode,
  });
}

function choices(): EventChoice[] {
  if (!Array.isArray(event.choices)) throw new Error("expected choices array");
  return event.choices;
}

function choice(id: string): EventChoice {
  const found = choices().find((entry) => entry.id === id);
  if (!found) throw new Error(id);
  return found;
}

describe("watching children", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("waits for madness 13 and more than 100 silver, once", () => {
    expect(event.timeProbability).toBe(20);
    expect(event.repeatable).toBe(false);
    expect(event.condition(state())).toBe(false);
    expect(
      event.condition(
        ready({
          stats: { madnessFromEvents: WATCHING_CHILDREN_MIN_MADNESS - 1 },
        }),
      ),
    ).toBe(false);
    expect(
      event.condition(
        ready({
          resources: { silver: WATCHING_CHILDREN_SILVER_REQUIRED },
        }),
      ),
    ).toBe(false);
    expect(event.condition(ready())).toBe(true);
    const seen = choice("continue").effect(ready());
    expect(event.condition(ready({ events: seen.events }))).toBe(false);
  });

  it("walks on with no change except the visit being over", () => {
    const game = ready();
    const next = choice("continue").effect(game);
    expect(next.resources).toBeUndefined();
    expect(next.stats).toBeUndefined();
    expect(next.events?.watchingChildren).toBe(true);
    expect(next._logMessageKey).toBe("outcome2");
  });

  it("approaches at 20% plus 2% per luck, with the cruel penalty", () => {
    const approach = choice("approach");
    expect(approach.success_formula).toMatchObject({
      base: 0.2,
      stats: [{ type: "luck", multiplier: 0.02 }],
    });
    expect(approach.relevant_stats).toEqual(["luck"]);
    expect(approach.success_chance?.(ready())).toBeCloseTo(0.2);
    expect(approach.success_chance?.(ready({ cruelMode: true }))).toBeCloseTo(0.1);
  });

  it("finds a purse of gold when the stones miss", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const game = ready();
    const next = choice("approach").effect(game);
    expect(next.resources?.gold).toBe(10 + WATCHING_CHILDREN_GOLD);
    expect(next.resources?.silver).toBe(WATCHING_CHILDREN_SILVER_REQUIRED + 1);
    expect(next.stats).toBeUndefined();
    expect(next.events?.watchingChildren).toBe(true);
    expect(next._logMessageKey).toBe("outcome0");
  });

  it("loses the purse and gains madness when a stone hits", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const game = ready();
    const next = choice("approach").effect(game);
    expect(next.resources?.silver).toBe(
      WATCHING_CHILDREN_SILVER_REQUIRED + 1 - WATCHING_CHILDREN_SILVER_LOSS,
    );
    expect(next.resources?.gold).toBe(10);
    expect(next.stats?.madnessFromEvents).toBe(
      WATCHING_CHILDREN_MIN_MADNESS + WATCHING_CHILDREN_MADNESS_GAIN,
    );
    expect(next._logMessageKey).toBe("outcome1");
  });

  it("adds the cruel madness bonus on a hit", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const next = choice("approach").effect(ready({ cruelMode: true }));
    expect(next.stats?.madnessFromEvents).toBe(
      WATCHING_CHILDREN_MIN_MADNESS + WATCHING_CHILDREN_MADNESS_GAIN + 1,
    );
  });
});

describe("watching children english copy", () => {
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded();
  });

  it("tells the walk, the miss, and the purse", () => {
    const game = ready();
    expect(resolveEventTitle("watchingChildren", event.title, game)).toBe(
      "Staring Children",
    );
    const message = resolveEventMessage("watchingChildren", event.message, game);
    expect(message).toContain("five young children");
    expect(message).toContain("stare at you");
    expect(resolveEventChoiceLabel("watchingChildren", "continue")).toBe(
      "Continue walking",
    );
    expect(resolveEventChoiceLabel("watchingChildren", "approach")).toBe(
      "Approach them",
    );
    expect(resolveEventChoiceReward("watchingChildren", "approach")).toBeUndefined();
    expect(resolveEventLogMessage("watchingChildren", "outcome0")).toContain(
      "purse",
    );
    expect(resolveEventLogMessage("watchingChildren", "outcome1")).toContain(
      "consciousness",
    );
    expect(resolveEventLogMessage("watchingChildren", "outcome2")).toContain(
      "keep walking",
    );
  });
});
