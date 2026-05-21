import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { localizeEventChoices } from "./eventText";
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
});
