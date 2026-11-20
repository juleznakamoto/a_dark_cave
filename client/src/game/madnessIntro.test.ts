import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/store/createInitialState";
import { applyGameStateLoadMigrations } from "@/game/stateHelpers";
import { EventManager } from "@/game/rules/events";
import {
  resolveEventChoiceLabel,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
import type { EventChoice } from "@/game/rules/eventTypes";
import { madnessEvents } from "@/game/rules/eventsMadness";
import {
  hasPriorMadnessWarningExposure,
  MADNESS_WARNING_MIN,
  migrateMadnessWarningSeenOnLoad,
} from "./madnessIntro";

const event = madnessEvents.madnessWarning;

function state(patch: Partial<GameState> = {}): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...patch,
    stats: { ...base.stats, ...patch.stats },
    events: { ...base.events, ...patch.events },
  };
}

function atMadness(
  amount: number,
  events?: Partial<GameState["events"]>,
): GameState {
  return state({
    stats: { madnessFromEvents: amount },
    events,
  });
}

function continueChoice(): EventChoice {
  if (!Array.isArray(event.choices)) throw new Error("expected choices");
  const found = event.choices.find((entry) => entry.id === "continue");
  if (!found) throw new Error("continue");
  return found;
}

describe("madness warning", () => {
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded();
  });

  it("opens once, the first time Madness reaches 10", () => {
    expect(event.repeatable).toBe(false);
    expect(event.timeProbability).toBe(0.5);
    expect(event.priority).toBeGreaterThan(
      madnessEvents.whisperingVoices.priority ?? 0,
    );
    expect(event.condition(atMadness(MADNESS_WARNING_MIN - 1))).toBe(false);
    expect(event.condition(atMadness(MADNESS_WARNING_MIN))).toBe(true);

    const game = atMadness(MADNESS_WARNING_MIN);
    const result = continueChoice().effect(game);
    expect(result.events?.madnessWarning).toBe(true);
    expect(result.stats).toBeUndefined();
    expect(
      event.condition(atMadness(MADNESS_WARNING_MIN, result.events)),
    ).toBe(false);
  });

  it("can open once Madness reaches 10, and stays quiet below it", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const ready = EventManager.checkEvents(atMadness(MADNESS_WARNING_MIN), [
      event,
    ]);
    random.mockReturnValue(0.99);
    const missed = EventManager.checkEvents(atMadness(MADNESS_WARNING_MIN), [
      event,
    ]);
    random.mockRestore();
    expect(ready.newLogEntries.map((entry) => entry.eventId)).toEqual([
      "madnessWarning",
    ]);
    expect(missed.newLogEntries).toEqual([]);

    const early = EventManager.checkEvents(
      atMadness(MADNESS_WARNING_MIN - 1),
      [event],
    );
    expect(early.newLogEntries).toEqual([]);

    const seen = EventManager.checkEvents(
      atMadness(MADNESS_WARNING_MIN, { madnessWarning: true }),
      [event],
    );
    expect(seen.newLogEntries).toEqual([]);
  });

  it("has the old woman murmur by the hut", () => {
    const game = atMadness(MADNESS_WARNING_MIN);
    expect(resolveEventTitle("madnessWarning", event.title, game)).toBe(
      "Whispers of Madness",
    );
    const message = resolveEventMessage(
      "madnessWarning",
      event.message,
      game,
    );
    expect(message).toContain("sitting next to a hut");
    expect(message).toContain("I see it in your eyes");
    expect(message).toContain("bad things are bound to happen");
    expect(resolveEventChoiceLabel("madnessWarning", "continue")).toBe(
      "Continue",
    );
  });

  it("does not treat a fresh save as already warned", () => {
    const fresh = createInitialState();
    expect(hasPriorMadnessWarningExposure(fresh)).toBe(false);
    expect(migrateMadnessWarningSeenOnLoad(fresh)).toBeNull();
  });

  it("skips the warning for saves already at 10 or already on the ladder", () => {
    const atTen = createInitialState();
    atTen.stats.madnessFromEvents = MADNESS_WARNING_MIN;
    expect(migrateMadnessWarningSeenOnLoad(atTen)?.events?.madnessWarning).toBe(
      true,
    );

    const heardVoices = createInitialState();
    heardVoices.events.whisperingVoices = true;
    expect(hasPriorMadnessWarningExposure(heardVoices)).toBe(true);
    expect(
      migrateMadnessWarningSeenOnLoad(heardVoices)?.events?.madnessWarning,
    ).toBe(true);

    const already = createInitialState();
    already.stats.madnessFromEvents = 20;
    already.events.madnessWarning = true;
    expect(migrateMadnessWarningSeenOnLoad(already)).toBeNull();
  });

  it("applies the skip through load migrations", () => {
    const state = createInitialState();
    state.stats.madnessFromEvents = MADNESS_WARNING_MIN;
    const migrated = applyGameStateLoadMigrations(state);
    expect(migrated.events.madnessWarning).toBe(true);
  });
});
