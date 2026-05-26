import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { gameEvents, type GameEvent } from "@/game/rules/events";
import { gameStateSchema } from "@shared/schema";
import {
  getEventCatalogId,
  localizeEventChoices,
  localizeFallbackChoice,
} from "./eventText";
import { getEventI18nVars } from "./eventDisplay";

function getChoices(
  def: GameEvent,
  state: ReturnType<typeof gameStateSchema.parse>,
) {
  return typeof def.choices === "function" ? def.choices(state) : def.choices;
}

function collectMissingChoiceLabels(
  lang: string,
): string[] {
  const state = gameStateSchema.parse({ cruelMode: false });
  const cruelState = gameStateSchema.parse({ cruelMode: true });
  const failures: string[] = [];

  for (const [eventId, def] of Object.entries(gameEvents)) {
    const catalogId = getEventCatalogId(def);
    const rawChoices = getChoices(def, state);
    if (!Array.isArray(rawChoices) || rawChoices.length === 0) {
      continue;
    }

    for (const testState of [state, cruelState]) {
      const vars = getEventI18nVars(catalogId, testState, eventId);
      const choices = localizeEventChoices(catalogId, rawChoices, testState, vars);

      for (const choice of choices ?? []) {
        const label =
          typeof choice.label === "function"
            ? choice.label(testState)
            : choice.label;
        if (!label || !String(label).trim()) {
          failures.push(`${lang}:${eventId}.${choice.id}`);
        }
      }
    }

    if (def.fallbackChoice) {
      const vars = getEventI18nVars(catalogId, state, eventId);
      const fallback = localizeFallbackChoice(
        catalogId,
        def.fallbackChoice,
        state,
        vars,
      );
      const label =
        typeof fallback?.label === "function"
          ? fallback.label(state)
          : fallback?.label;
      if (!label || !String(label).trim()) {
        failures.push(`${lang}:${eventId}.fallback(${def.fallbackChoice.id})`);
      }
    }
  }

  return [...new Set(failures)];
}

describe("event choice i18n", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("localizes choice labels for every event with choices (en)", () => {
    const failures = collectMissingChoiceLabels("en");
    expect(
      failures,
      `Missing choice labels: ${failures.join(", ")}`,
    ).toEqual([]);
  });

  it("localizes choice labels for every event with choices (de)", async () => {
    await i18n.changeLanguage("de");
    const failures = collectMissingChoiceLabels("de");
    expect(
      failures,
      `Missing choice labels: ${failures.join(", ")}`,
    ).toEqual([]);
  });

  it("resolves offerToTheForestGods sacrifice and refuse labels", async () => {
    const def = gameEvents.offerToTheForestGods;
    const catalogId = getEventCatalogId(def);
    const rawChoices = getChoices(def, gameStateSchema.parse({ cruelMode: false }));

    const enChoices = localizeEventChoices(
      catalogId,
      rawChoices,
      gameStateSchema.parse({ cruelMode: false }),
    );
    expect(enChoices?.find((c) => c.id === "sacrifice")?.label).toBe(
      "Sacrifice 4 villagers",
    );
    expect(enChoices?.find((c) => c.id === "refuse")?.label).toBe(
      "Make no sacrifices",
    );

    const enCruelChoices = localizeEventChoices(
      catalogId,
      rawChoices,
      gameStateSchema.parse({ cruelMode: true }),
    );
    expect(enCruelChoices?.find((c) => c.id === "sacrifice")?.label).toBe(
      "Sacrifice 8 villagers",
    );

    await i18n.changeLanguage("de");
    const deChoices = localizeEventChoices(
      catalogId,
      rawChoices,
      gameStateSchema.parse({ cruelMode: false }),
    );
    expect(deChoices?.find((c) => c.id === "sacrifice")?.label).toBe(
      "4 Dorfbewohner opfern",
    );
    expect(deChoices?.find((c) => c.id === "refuse")?.label).toBe(
      "Keine Opfer bringen",
    );
  });
});
