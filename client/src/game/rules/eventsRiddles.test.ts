import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { riddleEvents } from "./eventsRiddles";

function goldAfterCorrect(
  eventId: string,
  choiceId: string,
  btp: number,
): number {
  const event = riddleEvents[eventId];
  const choices = event.choices;
  if (!Array.isArray(choices)) {
    throw new Error(`${eventId} choices are not a list`);
  }
  const choice = choices.find((entry) => entry.id === choiceId);
  if (!choice) {
    throw new Error(`${eventId} has no choice ${choiceId}`);
  }
  const state = {
    resources: { gold: 10 },
    events: {},
    BTP: btp,
  } as GameState;
  return choice.effect(state).resources?.gold ?? 0;
}

describe("riddle gold", () => {
  it("pays 150 on web and 200 on store builds", () => {
    expect(goldAfterCorrect("whispererInTheDark", "answerWind", 0)).toBe(160);
    expect(goldAfterCorrect("whispererInTheDark_variant", "answerPearl", 1)).toBe(210);
    expect(goldAfterCorrect("riddleOfAges", "answerMan", 1)).toBe(210);
    expect(goldAfterCorrect("riddleOfDevourer", "answerTime", 1)).toBe(210);
    expect(goldAfterCorrect("riddleOfTears_variant", "answerCobweb", 1)).toBe(210);
    expect(goldAfterCorrect("riddleOfEternal", "answerDarkness", 0)).toBe(160);
    expect(goldAfterCorrect("whispererInTheDark_alt", "answerFire", 0)).toBe(160);
    expect(goldAfterCorrect("riddleOfEternal_alt", "answerShield", 1)).toBe(210);
  });

  it("treats the third riddle as the same visit", () => {
    const heard = riddleEvents.whispererInTheDark_alt.choices;
    if (!Array.isArray(heard)) throw new Error("expected choices");
    const correct = heard.find((choice) => choice.id === "answerFire");
    if (!correct) throw new Error("missing fire");
    const after = correct.effect({
      resources: { gold: 10 },
      events: {},
      BTP: 0,
    } as GameState).events;
    expect(after?.whispererInTheDark).toBe(true);
    expect(after?.whispererInTheDark_correct).toBe(true);
    expect((after as Record<string, boolean>).whispererInTheDark_variant).toBe(true);
    expect((after as Record<string, boolean>).whispererInTheDark_alt).toBe(true);

    const closed = {
      buildings: { darkEstate: 1 },
      events: { whispererInTheDark: true },
    } as GameState;
    expect(riddleEvents.whispererInTheDark.condition(closed)).toBe(false);
    expect(riddleEvents.whispererInTheDark_variant.condition(closed)).toBe(false);
    expect(riddleEvents.whispererInTheDark_alt.condition(closed)).toBe(false);
    expect(riddleEvents.riddleOfHunger).toBeUndefined();

    expect(
      riddleEvents.whisperersReward.condition({
        events: {
          whispererInTheDark_correct: true,
          riddleOfAges_correct: true,
          riddleOfDevourer_correct: true,
          riddleOfTears_correct: true,
          riddleOfEternal_correct: true,
        },
      } as GameState),
    ).toBe(true);
  });
});
