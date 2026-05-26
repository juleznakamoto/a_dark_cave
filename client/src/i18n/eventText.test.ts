import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import {
  localizeEventChoices,
  resolveEventMessage,
  resolveEventTitle,
} from "./eventText";
import { resolveEventDisplayTitle } from "./eventDisplay";
import type { EventChoice } from "@/game/rules/events";
import type { GameState } from "@shared/schema";

describe("localizeEventChoices", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("never returns a function label when state is omitted", () => {
    const choices: EventChoice[] = [
      {
        id: "missingCatalogKey",
        label: () => "variantKey",
        effect: () => ({}),
      },
    ];

    const localized = localizeEventChoices("nonexistentEvent", choices);

    expect(localized).toHaveLength(1);
    expect(typeof localized![0].label).toBe("string");
    expect(localized![0].label).toBe("");
  });

  it("resolves function labels to variant catalog keys when state is provided", () => {
    const choices: EventChoice[] = [
      {
        id: "answerWind",
        label: () => "answerWind",
        effect: () => ({}),
      },
    ];

    const localized = localizeEventChoices(
      "whispererInTheDark",
      choices,
      {} as GameState,
    );

    expect(typeof localized![0].label).toBe("string");
    expect(localized![0].label).toBe("Wind");
  });

  it("falls back to legacy string labels when catalog key is missing", () => {
    const choices: EventChoice[] = [
      {
        id: "custom",
        label: "Legacy label",
        effect: () => ({}),
      },
    ];

    const localized = localizeEventChoices("nonexistentEvent", choices);

    expect(localized![0].label).toBe("Legacy label");
  });

  it("resolves solsticeGathering choice labels and costs from catalog", () => {
    const choices: EventChoice[] = [
      { id: "hostSolstice", effect: () => ({}) },
      { id: "refuseSolstice", effect: () => ({}) },
    ];
    const vars = { goldCost: 25, foodCost: 250 };

    const localized = localizeEventChoices(
      "solsticeGathering",
      choices,
      {} as GameState,
      vars,
    );

    expect(localized![0].label).toBe("Host gathering");
    expect(localized![0].cost).toBe("25 gold, 250 food");
    expect(localized![1].label).toBe("Refuse");
  });

  it("resolves solsticeGathering labels in German", async () => {
    await i18n.changeLanguage("de");
    const choices: EventChoice[] = [
      { id: "hostSolstice", effect: () => ({}) },
      { id: "refuseSolstice", effect: () => ({}) },
    ];
    const vars = { goldCost: 25, foodCost: 250 };

    const localized = localizeEventChoices(
      "solsticeGathering",
      choices,
      {} as GameState,
      vars,
    );

    expect(localized![0].label).toBe("Fest ausrichten");
    expect(localized![0].cost).toBe("25 Gold, 250 Nahrung");
    expect(localized![1].label).toBe("Ablehnen");
  });

  it("resolves woodcutter level title and message in German", async () => {
    await i18n.changeLanguage("de");
    const state = {} as GameState;
    const vars = { level: 1, foodCost: "25", woodReward: "200" };

    expect(
      resolveEventTitle("woodcutter", undefined, state, vars),
    ).toBe("Der Holzfäller");

    expect(
      resolveEventMessage("woodcutter", "level1", {} as GameState, vars),
    ).toContain("25");

    const choices: EventChoice[] = [
      { id: "acceptServices", effect: () => ({}) },
      { id: "denyServices", effect: () => ({}) },
    ];
    const localized = localizeEventChoices(
      "woodcutter",
      choices,
      {} as GameState,
      vars,
    );
    expect(localized![0].label).toBe("25 Nahrung zahlen");
  });

  it("ignores stored i18n object-error titles and re-resolves woodcutter level title", async () => {
    await i18n.changeLanguage("de");
    const state = {} as GameState;
    const badTitle =
      "key 'woodcutter.title (de)' returned an object instead of string.";

    expect(
      resolveEventDisplayTitle("woodcutter", badTitle, state, "woodcutter1"),
    ).toBe("Der Holzfäller");
  });

  it("resolves mysteriousWoman variant title without event title def (nested title guard)", async () => {
    await i18n.changeLanguage("de");
    const state = { g: "m" } as GameState;

    expect(
      resolveEventTitle("mysteriousWoman", undefined, state),
    ).toBeUndefined();

    expect(
      resolveEventTitle(
        "mysteriousWoman",
        (s: GameState) => (s.g === "m" ? "woman" : "man"),
        state,
      ),
    ).toBe("Die geheimnisvolle Frau");

    expect(
      resolveEventTitle(
        "mysteriousWoman",
        (s: GameState) => (s.g === "m" ? "woman" : "man"),
        { g: "f" } as GameState,
      ),
    ).toBe("Der geheimnisvolle Mann");
  });
});
