import { beforeEach, describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/store/createInitialState";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import {
  resolveEventChoiceLabel,
  resolveEventLogMessage,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
import { toolEffects } from "./effects";
import {
  calculateTotalEffects,
  getTotalStrength,
} from "./effectsCalculation";
import { gameEvents } from "./events";
import {
  CROSSING_PATHS_DISGUST_MS,
  CROSSING_PATHS_WOOD_REWARD,
  crossingPathsEvents,
} from "./eventsCrossingPaths";

function state(patch: Partial<GameState> = {}): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...patch,
    resources: { ...base.resources, ...patch.resources },
    buildings: { ...base.buildings, ...patch.buildings },
    tools: { ...base.tools, ...patch.tools },
    story: {
      ...base.story,
      ...patch.story,
      seen: { ...base.story.seen, ...patch.story?.seen },
    },
  };
}

function betrayed(huts = 10, patch: Partial<GameState> = {}): GameState {
  return state({
    ...patch,
    buildings: { woodenHut: huts, ...patch.buildings },
    story: {
      ...patch.story,
      seen: { woodcutterBetrayed: true, ...patch.story?.seen },
    } as GameState["story"],
  });
}

const event = crossingPathsEvents.crossingPathsAgain;

function choiceEffect(choiceId: string, game: GameState): Partial<GameState> {
  const choices = event.choices;
  if (!Array.isArray(choices)) throw new Error("expected choices array");
  const choice = choices.find((entry) => entry.id === choiceId);
  if (!choice?.effect) throw new Error(choiceId);
  return choice.effect(game);
}

function after(game: GameState, next: Partial<GameState>): GameState {
  return { ...game, ...next } as GameState;
}

describe("crossing paths again", () => {
  it("is a dialog after the woodcutter betrays a village of 10 huts", () => {
    expect(gameEvents.crossingPathsAgain).toBe(event);
    expect(event.showAsTimedTab).toBeUndefined();
    expect(event.timeProbability).toBe(40);
    expect(event.repeatable).toBe(false);
    expect(event.condition!(state())).toBe(false);
    expect(event.condition!(betrayed(9))).toBe(false);
    expect(
      event.condition!(
        state({
          buildings: { woodenHut: 10 },
          story: { seen: { woodcutterEnded: true } } as GameState["story"],
        }),
      ),
    ).toBe(false);
    expect(event.condition!(betrayed(10))).toBe(true);
  });

  it("helps him: axe, apology wood, and the visit ends", () => {
    const game = betrayed(10, {
      resources: { wood: 20 } as GameState["resources"],
    });
    const next = choiceEffect("helpHim", game);
    expect(next.tools?.woodcutter_axe).toBe(true);
    expect(next.resources?.wood).toBe(20 + CROSSING_PATHS_WOOD_REWARD);
    expect(next.story?.seen?.woodcutterHelped).toBe(true);
    expect(next.disgustState).toBeUndefined();
    expect(event.condition!(after(game, next))).toBe(false);
  });

  it("leaves him to die and takes the axe", () => {
    const game = betrayed(12, {
      resources: { wood: 40 } as GameState["resources"],
    });
    const next = choiceEffect("leaveHim", game);
    expect(next.tools?.woodcutter_axe).toBe(true);
    expect(next.resources).toBeUndefined();
    expect(next.story?.seen?.woodcutterLeft).toBe(true);
    expect(next.disgustState).toBeUndefined();
    expect(event.condition!(after(game, next))).toBe(false);
  });

  it("killing him takes the axe and disgusts the village for 10 minutes", () => {
    const game = betrayed(10);
    const next = choiceEffect("killHim", game);
    expect(next.tools?.woodcutter_axe).toBe(true);
    expect(next.resources).toBeUndefined();
    expect(next.story?.seen?.woodcutterKilled).toBe(true);
    expect(next.disgustState?.isActive).toBe(true);
    expect(next.disgustState?.duration).toBe(CROSSING_PATHS_DISGUST_MS);
    expect(event.condition!(after(game, next))).toBe(false);
  });

  it("stacks with the crafted axe instead of replacing it", () => {
    const effect = toolEffects.woodcutter_axe;
    expect(effect.bonuses.generalBonuses?.strength).toBe(4);
    expect(effect.bonuses.actionBonuses?.chopWood?.resourceMultiplier).toBe(2);

    const game = betrayed(10, {
      tools: { stone_axe: true, woodcutter_axe: true },
    });
    const totals = calculateTotalEffects(game);
    // Stone axe +50% and woodcutter axe +100%.
    expect(totals.resource_multiplier.chopWood).toBeCloseTo(2.5);
    expect(getTotalStrength(game)).toBe(4);
  });
});

describe("crossing paths again english copy", () => {
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded();
  });

  it("names the wounded woodcutter and the three choices", async () => {
    const game = state();
    const vars = event.i18nVars as Record<string, string>;
    expect(resolveEventTitle("crossingPathsAgain", game, vars)).toBe(
      "Crossing Paths Again",
    );
    const message = resolveEventMessage(
      "crossingPathsAgain",
      event.message,
      game,
      vars,
    );
    expect(message).toContain("woodcutter");
    expect(message).toContain("wounded");
    expect(resolveEventChoiceLabel("crossingPathsAgain", "helpHim", vars)).toBe(
      "Help him",
    );
    expect(resolveEventChoiceLabel("crossingPathsAgain", "leaveHim", vars)).toBe(
      "Leave him",
    );
    expect(resolveEventChoiceLabel("crossingPathsAgain", "killHim", vars)).toBe(
      "Kill him",
    );
    expect(resolveEventLogMessage("crossingPathsAgain", "help", vars)).toContain(
      "5'000",
    );
    expect(resolveEventLogMessage("crossingPathsAgain", "leave", vars)).toContain(
      "axe",
    );
    expect(resolveEventLogMessage("crossingPathsAgain", "kill", vars)).toContain(
      "displeased",
    );
  });
});
