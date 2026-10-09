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
  });
});
