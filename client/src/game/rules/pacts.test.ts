import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/featureFlags", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/featureFlags")>();
  return { ...actual, PACTS_ENABLED: true };
});
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/store/createInitialState";
import { mergeStateUpdates } from "@/game/store/mergeStateUpdates";
import { getMadnessComponents, getTotalMadness } from "./effectsCalculation";
import {
  clampPactChoices,
  getPactMadness,
  grantPactChoiceForCompletedGame,
  readStoredChosenPacts,
  readStoredPactChoices,
  readStoredPactOfferPending,
  resolvePactChoicesFromSave,
  sanitizeChosenPacts,
  shouldOpenPactOffer,
} from "./pacts";

describe("sanitizeChosenPacts", () => {
  it("keeps known ids in offer order and drops the rest", () => {
    expect(
      sanitizeChosenPacts([
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
    expect(sanitizeChosenPacts(undefined)).toEqual([]);
  });
});

describe("pact madness", () => {
  it("adds 3 madness for each chosen pact and ignores unknown ids", () => {
    expect(getPactMadness(undefined)).toBe(0);
    expect(getPactMadness(["blazesmith", "nope", "blazesmith"])).toBe(3);
    expect(getPactMadness(["cunning_trader", "avid_apprentices"])).toBe(6);
  });

  it("counts pact madness in the madness total", () => {
    const state = {
      chosenPacts: ["blazesmith", "full_larders"],
      stats: { madnessFromEvents: 1 },
    } as GameState;
    const parts = getMadnessComponents(state, {
      statBonuses: { madness: 2 },
      madness_reduction: {},
    });
    expect(parts.fromPacts).toBe(6);
    expect(parts.total).toBe(9);
  });

  it("includes pact madness in the live madness total", () => {
    const plain = createInitialState();
    const cursed = {
      ...plain,
      chosenPacts: ["blazesmith", "full_larders"],
    };
    expect(getTotalMadness(cursed)).toBe(getTotalMadness(plain) + 6);
  });

  it("does not count pact madness while the offer is still open", () => {
    const plain = createInitialState();
    const offered = {
      ...plain,
      chosenPacts: ["blazesmith", "full_larders"],
      pactOfferPending: true,
    };
    expect(getMadnessComponents(offered).fromPacts).toBe(0);
    expect(getTotalMadness(offered)).toBe(getTotalMadness(plain));
  });
});

describe("pact choices", () => {
  it("gives older saves one choice when the count is missing", () => {
    expect(clampPactChoices(undefined)).toBe(1);
    expect(clampPactChoices("nope")).toBe(1);
  });

  it("caps the stored count at five and never spends it below one", () => {
    expect(clampPactChoices(0)).toBe(1);
    expect(clampPactChoices(3.9)).toBe(3);
    expect(clampPactChoices(9)).toBe(5);
  });

  it("adds one choice when a game is completed, up to five", () => {
    expect(grantPactChoiceForCompletedGame(1)).toBe(2);
    expect(grantPactChoiceForCompletedGame(5)).toBe(5);
    expect(grantPactChoiceForCompletedGame(undefined)).toBe(2);
    expect(grantPactChoiceForCompletedGame(1, true)).toBe(3);
    expect(grantPactChoiceForCompletedGame(4, true)).toBe(5);
    expect(grantPactChoiceForCompletedGame(5, true)).toBe(5);
  });

  it("gives one choice when no game has been finished", () => {
    expect(resolvePactChoicesFromSave(undefined, 0)).toBe(1);
    expect(resolvePactChoicesFromSave(undefined, undefined)).toBe(1);
  });

  it("counts games finished before the choice field existed", () => {
    expect(resolvePactChoicesFromSave(undefined, 1)).toBe(2);
    expect(resolvePactChoicesFromSave(undefined, 3)).toBe(4);
    expect(resolvePactChoicesFromSave(undefined, 8)).toBe(5);
  });

  it("does not lower a stored count that is already ahead of recorded wins", () => {
    expect(resolvePactChoicesFromSave(4, 1)).toBe(4);
    expect(resolvePactChoicesFromSave(5, 2)).toBe(5);
  });

  it("does not lower the allowance when a later update sends a smaller count", () => {
    const state = { ...createInitialState(), pactChoices: 4 };
    expect(mergeStateUpdates(state, { pactChoices: 1 }).pactChoices).toBe(4);
    expect(mergeStateUpdates(state, { pactChoices: 10 }).pactChoices).toBe(5);
    expect(mergeStateUpdates(state, {}).pactChoices).toBe(4);
  });

  it("reads saves that still use the old cruel field names", () => {
    expect(readStoredPactChoices({ cruelCurseChoices: 4 })).toBe(4);
    expect(
      readStoredPactChoices({ pactChoices: 2, cruelCurseChoices: 4 }),
    ).toBe(2);
    expect(readStoredChosenPacts({ chosenCurses: ["blazesmith"] })).toEqual([
      "blazesmith",
    ]);
    expect(readStoredPactChoices({ curseChoices: 3 })).toBe(3);
    expect(
      readStoredPactOfferPending({ curseOfferPending: true }),
    ).toBe(true);
    expect(readStoredChosenPacts({ chosenCruelCurses: ["firecrafter"] })).toEqual([
      "firecrafter",
    ]);
    expect(readStoredPactOfferPending({ cruelCurseOfferPending: true })).toBe(
      true,
    );
    expect(
      readStoredPactOfferPending({
        pactOfferPending: false,
        cruelCurseOfferPending: true,
      }),
    ).toBe(false);
  });
});

describe("shouldOpenPactOffer", () => {
  it("stays closed until a game has been finished", () => {
    expect(shouldOpenPactOffer(0)).toBe(false);
    expect(shouldOpenPactOffer(undefined)).toBe(false);
    expect(shouldOpenPactOffer(1)).toBe(true);
    expect(shouldOpenPactOffer(5)).toBe(true);
  });
});
