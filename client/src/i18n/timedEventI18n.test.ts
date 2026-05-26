import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { gameEvents } from "@/game/rules/events";
import { gameStateSchema } from "@shared/schema";
import { getEventCatalogId } from "./eventText";
import {
  getEventI18nVars,
  resolveTimedEventCatalogId,
} from "./eventDisplay";
import { localizeEventChoices } from "./eventText";

function getTimedTabEventDefs() {
  return Object.entries(gameEvents).filter(
    ([, def]) => def.showAsTimedTab === true,
  );
}

describe("timed tab event i18n", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("localizes choice labels for every timed-tab event", () => {
    const state = gameStateSchema.parse({});
    const failures: string[] = [];

    for (const [eventId, def] of getTimedTabEventDefs()) {
      const catalogId = getEventCatalogId(def);
      const rawChoices =
        typeof def.choices === "function" ? def.choices(state) : def.choices;

      if (!Array.isArray(rawChoices) || rawChoices.length === 0) {
        continue;
      }

      const vars = getEventI18nVars(catalogId, state, eventId);
      const choices = localizeEventChoices(catalogId, rawChoices, state, vars);

      for (const choice of choices ?? []) {
        const label =
          typeof choice.label === "function" ? choice.label(state) : choice.label;
        if (!label || !label.trim()) {
          failures.push(`${eventId}.${choice.id}`);
        }
      }
    }

    expect(failures, `Missing timed-tab choice labels: ${failures.join(", ")}`).toEqual(
      [],
    );
  });

  it("resolves catalog ids for numbered timed-tab events", () => {
    expect(resolveTimedEventCatalogId("boneDevourer1")).toBe("boneDevourer");
    expect(resolveTimedEventCatalogId("woodcutter3")).toBe("woodcutter");
    expect(resolveTimedEventCatalogId("feast2")).toBe("feast");
    expect(resolveTimedEventCatalogId("merchant")).toBe("merchant");
  });
});
