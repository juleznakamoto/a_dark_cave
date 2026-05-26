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
import { SUPPORTED_LOCALES } from "./locales";

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

  for (const lang of SUPPORTED_LOCALES) {
    it(`localizes choice labels for every event with choices (${lang})`, async () => {
      await i18n.changeLanguage(lang);
      const failures = collectMissingChoiceLabels(lang);
      expect(
        failures,
        `Missing choice labels: ${failures.join(", ")}`,
      ).toEqual([]);
    });
  }

  for (const lang of SUPPORTED_LOCALES) {
    it(`localizes swampSanctuaryChoice button labels (${lang})`, async () => {
      await i18n.changeLanguage(lang);
      const def = gameEvents.swampSanctuaryChoice;
      const catalogId = getEventCatalogId(def);
      const state = gameStateSchema.parse({ cruelMode: false });
      const rawChoices = getChoices(def, state);
      const choices = localizeEventChoices(catalogId, rawChoices, state);

      for (const choiceId of ["chopBlackTree", "sacrificeAtTree"]) {
        const label = choices?.find((c) => c.id === choiceId)?.label;
        expect(label, `${lang}:${choiceId}`).toBeTruthy();
        expect(String(label).trim().length, `${lang}:${choiceId}`).toBeGreaterThan(
          0,
        );
      }
    });
  }

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
