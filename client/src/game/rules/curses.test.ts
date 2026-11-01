import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { getMadnessComponents } from "./effectsCalculation";
import {
  clampCurseChoices,
  getCurseMadness,
  grantCurseChoiceForCompletedGame,
  readStoredChosenCurses,
  readStoredCurseChoices,
  readStoredCurseOfferPending,
  resolveCurseChoicesFromSave,
  sanitizeChosenCurses,
  shouldOpenCurseOffer,
} from "./curses";

describe("sanitizeChosenCurses", () => {
  it("keeps known ids in offer order and drops the rest", () => {
    expect(
      sanitizeChosenCurses([
        "sturdy_hands",
        "nope",
        "blazesmith",
        "cunning_trader",
        "loud_omens",
        3,
      ]),
    ).toEqual(["blazesmith", "sturdy_hands", "cunning_trader"]);
  });

  it("returns an empty list for missing input", () => {
    expect(sanitizeChosenCurses(undefined)).toEqual([]);
  });
});

describe("curse madness", () => {
  it("adds 3 madness for each chosen curse and ignores unknown ids", () => {
    expect(getCurseMadness(undefined)).toBe(0);
    expect(getCurseMadness(["blazesmith", "nope", "firecrafter"])).toBe(3);
    expect(getCurseMadness(["cunning_trader", "avid_apprentices"])).toBe(6);
  });

  it("counts curse madness in the madness total", () => {
    const state = {
      chosenCurses: ["blazesmith", "crowded_graves"],
      stats: { madnessFromEvents: 1 },
    } as GameState;
    const parts = getMadnessComponents(state, {
      statBonuses: { madness: 2 },
      madness_reduction: {},
    });
    expect(parts.fromCurses).toBe(6);
    expect(parts.total).toBe(9);
  });
});

describe("curse choices", () => {
  it("gives older saves one choice when the count is missing", () => {
    expect(clampCurseChoices(undefined)).toBe(1);
    expect(clampCurseChoices("nope")).toBe(1);
  });

  it("caps the stored count at five and never spends it below one", () => {
    expect(clampCurseChoices(0)).toBe(1);
    expect(clampCurseChoices(3.9)).toBe(3);
    expect(clampCurseChoices(9)).toBe(5);
  });

  it("adds one choice when a game is completed, up to five", () => {
    expect(grantCurseChoiceForCompletedGame(1)).toBe(2);
    expect(grantCurseChoiceForCompletedGame(5)).toBe(5);
    expect(grantCurseChoiceForCompletedGame(undefined)).toBe(2);
  });

  it("gives one choice when no game has been finished", () => {
    expect(resolveCurseChoicesFromSave(undefined, 0)).toBe(1);
    expect(resolveCurseChoicesFromSave(undefined, undefined)).toBe(1);
  });

  it("counts games finished before the choice field existed", () => {
    expect(resolveCurseChoicesFromSave(undefined, 1)).toBe(2);
    expect(resolveCurseChoicesFromSave(undefined, 3)).toBe(4);
    expect(resolveCurseChoicesFromSave(undefined, 8)).toBe(5);
  });

  it("does not lower a stored count that is already ahead of recorded wins", () => {
    expect(resolveCurseChoicesFromSave(4, 1)).toBe(4);
    expect(resolveCurseChoicesFromSave(5, 2)).toBe(5);
  });

  it("reads saves that still use the old cruel field names", () => {
    expect(readStoredCurseChoices({ cruelCurseChoices: 4 })).toBe(4);
    expect(
      readStoredCurseChoices({ curseChoices: 2, cruelCurseChoices: 4 }),
    ).toBe(2);
    expect(readStoredChosenCurses({ chosenCruelCurses: ["firecrafter"] })).toEqual([
      "firecrafter",
    ]);
    expect(readStoredCurseOfferPending({ cruelCurseOfferPending: true })).toBe(
      true,
    );
    expect(
      readStoredCurseOfferPending({
        curseOfferPending: false,
        cruelCurseOfferPending: true,
      }),
    ).toBe(false);
  });
});

describe("shouldOpenCurseOffer", () => {
  it("stays closed until a game has been finished", () => {
    expect(shouldOpenCurseOffer(0)).toBe(false);
    expect(shouldOpenCurseOffer(undefined)).toBe(false);
    expect(shouldOpenCurseOffer(1)).toBe(true);
    expect(shouldOpenCurseOffer(5)).toBe(true);
  });
});
