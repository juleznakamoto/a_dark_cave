import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventManager, gameEvents, type EventRollState } from "./events";
import { createInitialState } from "../state";
import type { GameState } from "@shared/schema";

const DIALOG_STORY_BEATS = [
  "portalDiscovered",
  "alchemistArrives",
  "wizardArrives",
  "wizardNecromancerCastle",
  "wizardDecryptsScrolls",
  "wizardFrostglassSword",
  "wizardBloodstone",
  "wizardBloodstoneStaff",
  "wizardReadyForBattle",
] as const;

describe("story dialog beats (formerly log-only)", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const id of DIALOG_STORY_BEATS) {
      if (gameEvents[id]) {
        gameEvents[id].triggered = false;
      }
    }
  });

  it("defines a Continue choice for each former log-only story beat", () => {
    for (const id of DIALOG_STORY_BEATS) {
      const event = gameEvents[id];
      expect(event, id).toBeDefined();
      const choices =
        typeof event.choices === "function" ? event.choices(createInitialState()) : event.choices;
      expect(choices?.some((c) => c.id === "continue"), id).toBe(true);
      expect(event.effect, `${id} should not use top-level effect`).toBeUndefined();
    }
  });

  it("defers portalDiscovered story flag until Continue", () => {
    const state = {
      ...createInitialState(),
      buildings: {
        ...createInitialState().buildings,
        alchemistHall: 1,
      },
      story: {
        seen: {
          ...createInitialState().story.seen,
          exploredCitadel: true,
        },
      },
      triggeredEvents: {},
    } as EventRollState;

    const { newLogEntries, stateChanges } = EventManager.checkEvents(state);
    const entry = newLogEntries.find((e) => e.id.startsWith("portalDiscovered"));
    expect(entry).toBeDefined();
    expect(entry?.choices?.length).toBeGreaterThan(0);
    expect(stateChanges.story?.seen?.portalDiscovered).toBeUndefined();

    const afterContinue = EventManager.applyEventChoice(
      state as GameState,
      "continue",
      "portalDiscovered",
    );
    expect(afterContinue.story?.seen?.portalDiscovered).toBe(true);
  });

  it("applies wizardDecryptsScrolls effects on Continue", () => {
    const state = {
      ...createInitialState(),
      buildings: {
        ...createInitialState().buildings,
        wizardTower: 1,
      },
      relics: {
        ...createInitialState().relics,
        ancient_scrolls: true,
      },
      story: { seen: { ...createInitialState().story.seen } },
    } as GameState;

    // Top-level effect is gone; only the choice applies story/relic changes.
    expect(gameEvents.wizardDecryptsScrolls.effect).toBeUndefined();

    const afterContinue = EventManager.applyEventChoice(
      state,
      "continue",
      "wizardDecryptsScrolls",
    );
    expect(afterContinue.relics?.ancient_scrolls).toBe(false);
    expect(afterContinue.story?.seen?.wizardDecryptsScrolls).toBe(true);
    expect(afterContinue.story?.seen?.wizardHillGrave).toBe(true);
  });
});
